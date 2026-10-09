import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';
import {
  activeLoansQuerySchema,
  recordPaymentSchema,
} from '../schemas/collection';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import Payment from '../models/Payment';
import User from '../models/User';
import { ValidationError, NotFoundError, StatusTransitionError } from '../errors/AppError';

const router = Router();

/**
 * GET /api/collection/loans
 * List active loans (Disbursed and Active) for payment collection
 * - Role authorization: Collection and Admin only
 * - Search by borrower name
 * - Filter by status (Disbursed, Active)
 * - Sort by date, principal, repayment amount, disbursement date, or amount paid
 * - Server-side pagination
 */
router.get(
  '/loans',
  authenticate,
  authorize(UserRole.Collection, UserRole.Admin),
  validate(activeLoansQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      } = req.query as any;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build base query for active loans (Disbursed and Active)
      const baseQuery: any = {
        status: status || { $in: [LoanStatus.Disbursed, LoanStatus.Active] },
      };

      // Add search filter (by borrower's full name from personalDetails)
      if (search) {
        baseQuery['personalDetails.fullName'] = {
          $regex: search,
          $options: 'i',
        };
      }

      // Execute query with pagination and sorting
      const [applications, total] = await Promise.all([
        LoanApplication.find(baseQuery)
          .populate('borrowerId', 'fullName email')
          .populate('disbursedBy', 'fullName')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        LoanApplication.countDocuments(baseQuery),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      res.json(
        successResponse({
          applications,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPreviousPage,
            sortBy,
            sortOrder,
          },
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/collection/loans/:id/payments
 * Record a payment against a loan
 * - Role authorization: Collection and Admin only
 * - Requires unique UTR (enforced by database index)
 * - Validates payment amount and date
 * - Ensures payment doesn't exceed outstanding balance
 * - Only allows payments against Disbursed or Active loans
 * - Uses atomic update to prevent race conditions
 */
router.post(
  '/loans/:id/payments',
  authenticate,
  authorize(UserRole.Collection, UserRole.Admin),
  validate(recordPaymentSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.id;
      const { utr, amount, paymentDate } = req.body;
      const collectionId = req.userId!;

      // Get the loan application
      const application = await LoanApplication.findById(applicationId);

      if (!application) {
        throw new NotFoundError('Loan application not found');
      }

      // Check if loan is in eligible state for payment
      const eligibleStatuses = [LoanStatus.Disbursed, LoanStatus.Active];
      if (!eligibleStatuses.includes(application.status)) {
        throw new StatusTransitionError(
          `Cannot record payment for loan with status '${application.status}'. Only Disbursed and Active loans can accept payments.`
        );
      }

      // Calculate outstanding balance
      const outstandingBalance = application.totalRepayment - application.amountPaid;

      // Check if payment exceeds outstanding balance
      if (amount > outstandingBalance) {
        throw new ValidationError(
          `Payment amount (₹${amount.toFixed(2)}) exceeds outstanding balance (₹${outstandingBalance.toFixed(2)})`
        );
      }

      // Start a session for transaction
      const session = await LoanApplication.startSession();

      try {
        await session.withTransaction(async () => {
          // Create payment record
          const payment = await Payment.create(
            [
              {
                applicationId,
                utr: utr.toUpperCase(),
                amount,
                paymentDate,
                recordedBy: collectionId,
              },
            ],
            { session }
          );

          // Atomically update loan's amountPaid
          const updatedApplication = await LoanApplication.findByIdAndUpdate(
            applicationId,
            {
              $inc: { amountPaid: amount },
              $set: {
                status: LoanStatus.Active, // Move to Active if first payment
              },
            },
            { new: true, session }
          );

          if (!updatedApplication) {
            throw new Error('Failed to update loan application');
          }

          // Check if loan is fully paid
          if (updatedApplication.amountPaid >= updatedApplication.totalRepayment) {
            await LoanApplication.findByIdAndUpdate(
              applicationId,
              {
                $set: {
                  status: LoanStatus.Closed,
                  closedAt: new Date(),
                },
              },
              { session }
            );
          }

          return payment[0];
        });

        // Fetch updated application with populated fields
        const updatedApplication = await LoanApplication.findById(applicationId)
          .populate('borrowerId', 'fullName email')
          .populate('disbursedBy', 'fullName');

        // Calculate new outstanding balance
        const newOutstandingBalance = updatedApplication!.totalRepayment - updatedApplication!.amountPaid;

        res.json(
          successResponse({
            payment: {
              utr: utr.toUpperCase(),
              amount,
              paymentDate,
            },
            application: updatedApplication,
            outstandingBalance: newOutstandingBalance,
            message: 'Payment recorded successfully',
          })
        );
      } catch (error) {
        // Handle duplicate UTR error from database
        if (error instanceof Error && error.message.includes('duplicate key')) {
          throw new ValidationError(
            'UTR already exists. Each payment must have a unique UTR number.'
          );
        }
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/collection/loans/:id/payments
 * List all payments for a specific loan
 * - Role authorization: Collection and Admin only
 */
router.get(
  '/loans/:id/payments',
  authenticate,
  authorize(UserRole.Collection, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await LoanApplication.findById(req.params.id);

      if (!application) {
        throw new NotFoundError('Loan application not found');
      }

      const payments = await Payment.find({ applicationId: req.params.id })
        .populate('recordedBy', 'fullName')
        .sort({ paymentDate: -1, createdAt: -1 });

      res.json(successResponse({ payments }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/collection/loans/:id
 * Get details of a specific loan with payment history
 * - Role authorization: Collection and Admin only
 */
router.get(
  '/loans/:id',
  authenticate,
  authorize(UserRole.Collection, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await LoanApplication.findById(req.params.id)
        .populate('borrowerId', 'fullName email')
        .populate('disbursedBy', 'fullName');

      if (!application) {
        throw new NotFoundError('Loan application not found');
      }

      // Get payment history
      const payments = await Payment.find({ applicationId: req.params.id })
        .populate('recordedBy', 'fullName')
        .sort({ paymentDate: -1, createdAt: -1 });

      // Calculate outstanding balance
      const outstandingBalance = application.totalRepayment - application.amountPaid;

      res.json(
        successResponse({
          application,
          payments,
          outstandingBalance,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
