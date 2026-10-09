import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';
import {
  pendingApplicationsQuerySchema,
  approveApplicationSchema,
  rejectApplicationSchema,
} from '../schemas/sanction';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import User from '../models/User';
import { ValidationError, NotFoundError, StatusTransitionError } from '../errors/AppError';

const router = Router();

/**
 * GET /api/sanction/applications
 * List pending and under-review loan applications
 * - Role authorization: Sanction and Admin only
 * - Search by borrower name
 * - Filter by status
 * - Sort by date, principal, or repayment amount
 * - Server-side pagination
 */
router.get(
  '/applications',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  validate(pendingApplicationsQuerySchema, 'query'),
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

      // Build base query for pending/under-review applications
      const baseQuery: any = {
        status: status || { $in: [LoanStatus.Pending, LoanStatus.UnderReview] },
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
 * POST /api/sanction/applications/:id/approve
 * Approve a loan application
 * - Role authorization: Sanction and Admin only
 * - Validates current status before transition
 * - Uses atomic update to prevent race conditions
 * - Only allows: Pending -> Approved, UnderReview -> Approved
 */
router.post(
  '/applications/:id/approve',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.id;
      const sanctionId = req.userId!;

      const validFromStatuses = [LoanStatus.Pending, LoanStatus.UnderReview];

      const application = await LoanApplication.findOneAndUpdate(
        {
          _id: applicationId,
          status: { $in: validFromStatuses },
        },
        {
          $set: {
            status: LoanStatus.Approved,
            approvedBy: sanctionId,
            approvedAt: new Date(),
          },
        },
        { new: true }
      ).populate('borrowerId', 'fullName email');

      if (!application) {
        // Check if application exists
        const existingApp = await LoanApplication.findById(applicationId);
        if (!existingApp) {
          throw new NotFoundError('Loan application not found');
        }

        // Application exists but status is not valid for approval
        throw new StatusTransitionError(
          `Cannot approve application with status '${existingApp.status}'. Only Pending or UnderReview applications can be approved.`
        );
      }

      res.json(
        successResponse({
          application,
          message: 'Loan application approved successfully',
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/sanction/applications/:id/reject
 * Reject a loan application
 * - Role authorization: Sanction and Admin only
 * - Requires rejection reason
 * - Validates current status before transition
 * - Uses atomic update to prevent race conditions
 * - Only allows: Pending -> Rejected, UnderReview -> Rejected
 */
router.post(
  '/applications/:id/reject',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  validate(rejectApplicationSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.id;
      const { rejectionReason } = req.body;
      const sanctionId = req.userId!;

      // Define valid status transitions for rejection
      const validFromStatuses = [LoanStatus.Pending, LoanStatus.UnderReview];

      // Atomic update using findOneAndUpdate with status condition
      const application = await LoanApplication.findOneAndUpdate(
        {
          _id: applicationId,
          status: { $in: validFromStatuses },
        },
        {
          $set: {
            status: LoanStatus.Rejected,
            rejectionReason,
            reviewedBy: sanctionId,
            reviewedAt: new Date(),
          },
        },
        { new: true }
      ).populate('borrowerId', 'fullName email');

      if (!application) {
        // Check if application exists
        const existingApp = await LoanApplication.findById(applicationId);
        if (!existingApp) {
          throw new NotFoundError('Loan application not found');
        }

        // Application exists but status is not valid for rejection
        throw new StatusTransitionError(
          `Cannot reject application with status '${existingApp.status}'. Only Pending or UnderReview applications can be rejected.`
        );
      }

      res.json(
        successResponse({
          application,
          message: 'Loan application rejected successfully',
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sanction/applications/:id
 * Get details of a specific loan application
 * - Role authorization: Sanction and Admin only
 */
router.get(
  '/applications/:id',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await LoanApplication.findById(req.params.id).populate(
        'borrowerId',
        'fullName email'
      );

      if (!application) {
        throw new NotFoundError('Loan application not found');
      }

      res.json(successResponse({ application }));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
