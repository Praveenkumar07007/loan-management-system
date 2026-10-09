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
 * - Recalculates balance from persisted payment records (not in-memory field)
 * - Ensures payment doesn't exceed outstanding balance
 * - Only allows payments against Disbursed or Active loans
 * - Prevents payments on Closed loans
 * - Automatically closes loan when fully paid
 * - Uses atomic transactions to prevent race conditions
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

      // Start a session for transaction
      const session = await LoanApplication.startSession();

      try {
        const result = await session.withTransaction(async () => {
          // Get the loan application within transaction
          const application = await LoanApplication.findById(applicationId).session(session);

          if (!application) {
            throw new NotFoundError('Loan application not found');
          }

          // Check if loan is in eligible state for payment
          const eligibleStatuses = [LoanStatus.Disbursed, LoanStatus.Active];
          if (!eligibleStatuses.includes(application.status)) {
            if (application.status === LoanStatus.Closed) {
              throw new StatusTransitionError(
                `Cannot record payment for loan with status '${application.status}'. Loan is already closed.`
              );
            }
            throw new StatusTransitionError(
              `Cannot record payment for loan with status '${application.status}'. Only Disbursed and Active loans can accept payments.`
            );
          }

          // Recalculate total paid from persisted payment records
          const payments = await Payment.find({ applicationId }).session(session);
          const totalPaidFromRecords = payments.reduce((sum, p) => sum + p.amount, 0);

          // Calculate outstanding balance from persisted records
          const outstandingBalance = application.totalRepayment - totalPaidFromRecords;

          // Check if payment exceeds outstanding balance
          if (amount > outstandingBalance) {
            throw new ValidationError(
              `Payment amount (₹${amount.toFixed(2)}) exceeds outstanding balance (₹${outstandingBalance.toFixed(2)}). Total repayment is ₹${application.totalRepayment.toFixed(2)}.`
            );
          }

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

          // Recalculate total paid after new payment
          const newTotalPaid = totalPaidFromRecords + amount;

          // Determine if loan should be closed
          const shouldClose = newTotalPaid >= application.totalRepayment;

          // Prepare update document
          const updateDoc: any = {
            $inc: { amountPaid: amount },
          };

          // Update status based on payment and closure
          if (application.status === LoanStatus.Disbursed) {
            updateDoc.$set = { status: LoanStatus.Active };
          }

          if (shouldClose) {
            updateDoc.$set = {
              ...updateDoc.$set,
              status: LoanStatus.Closed,
              closedAt: new Date(),
            };
          }

          // Atomically update loan
          const updatedApplication = await LoanApplication.findByIdAndUpdate(
            applicationId,
            updateDoc,
            { new: true, session }
          );

          if (!updatedApplication) {
            throw new Error('Failed to update loan application');
          }

          return {
            payment: payment[0],
            application: updatedApplication,
            totalPaid: newTotalPaid,
            outstandingBalance: application.totalRepayment - newTotalPaid,
            isClosed: shouldClose,
          };
        });

        // Fetch updated application with populated fields
        const updatedApplication = await LoanApplication.findById(applicationId)
          .populate('borrowerId', 'fullName email')
          .populate('disbursedBy', 'fullName');

        res.json(
          successResponse({
            payment: {
              utr: result.payment.utr,
              amount: result.payment.amount,
              paymentDate: result.payment.paymentDate,
            },
            application: updatedApplication,
            outstandingBalance: result.outstandingBalance,
            isClosed: result.isClosed,
            message: result.isClosed 
              ? 'Payment recorded successfully. Loan has been closed.' 
              : 'Payment recorded successfully',
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
