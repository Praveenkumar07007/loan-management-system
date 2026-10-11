import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';
import {
  approvedLoansQuerySchema,
  disburseLoanSchema,
} from '../schemas/disbursement';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import User from '../models/User';
import { ValidationError, NotFoundError, StatusTransitionError } from '../errors/AppError';

const router = Router();

/**
 * GET /api/disbursement/loans
 * List loans (disbursed by default, or approved if status=Approved)
 * - Role authorization: Disbursement and Admin only
 * - Search by borrower name
 * - Filter by status (Disbursed by default)
 * - Sort by date, principal, repayment amount, or disbursement date
 * - Server-side pagination
 */
router.get(
  '/loans',
  authenticate,
  authorize(UserRole.Disbursement, UserRole.Admin),
  validate(approvedLoansQuerySchema, 'query'),
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

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      // Build base query - default to Disbursed and Active loans
      const baseQuery: any = {
        status: status ? status : { $in: [LoanStatus.Disbursed, LoanStatus.Active] },
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
          .select('_id borrowerId personalDetails employmentMode monthlySalary requestedPrincipal tenureDays annualInterestRate calculatedInterest totalRepayment status approvedBy approvedAt approvedReason disbursedBy disbursedAt createdAt')
          .populate('borrowerId', 'fullName email')
          .populate('approvedBy', 'fullName')
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
 * POST /api/disbursement/loans/:id/disburse
 * Disburse an approved loan
 * - Role authorization: Disbursement and Admin only
 * - Validates current status before transition
 * - Uses atomic update to prevent race conditions
 * - Only allows: Approved -> Disbursed
 * - Rejects: Pending, UnderReview, Rejected, Already Disbursed, Active, Closed, Defaulted
 */
router.post(
  '/loans/:id/disburse',
  authenticate,
  authorize(UserRole.Disbursement, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.id;
      const disbursementId = req.userId!;

      // Define valid status transitions for disbursement
      const validFromStatuses = [LoanStatus.Approved];

      // Atomic update using findOneAndUpdate with status condition
      const application = await LoanApplication.findOneAndUpdate(
        {
          _id: applicationId,
          status: { $in: validFromStatuses },
        },
        {
          $set: {
            status: LoanStatus.Disbursed,
            disbursedBy: disbursementId,
            disbursedAt: new Date(),
          },
        },
        { new: true }
      ).populate('borrowerId', 'fullName email')
       .populate('approvedBy', 'fullName');

      if (!application) {
        // Check if application exists
        const existingApp = await LoanApplication.findById(applicationId);
        if (!existingApp) {
          throw new NotFoundError('Loan application not found');
        }

        // Application exists but status is not valid for disbursement
        const invalidStatuses = [
          LoanStatus.Pending,
          LoanStatus.UnderReview,
          LoanStatus.Rejected,
          LoanStatus.Disbursed,
          LoanStatus.Active,
          LoanStatus.Closed,
          LoanStatus.Defaulted,
        ];

        if (invalidStatuses.includes(existingApp.status)) {
          throw new StatusTransitionError(
            `Cannot disburse loan with status '${existingApp.status}'. Only Approved loans can be disbursed.`
          );
        }
      }

      res.json(
        successResponse({
          application,
          message: 'Loan disbursed successfully',
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/disbursement/loans/:id
 * Get details of a specific approved loan
 * - Role authorization: Disbursement and Admin only
 */
router.get(
  '/loans/:id',
  authenticate,
  authorize(UserRole.Disbursement, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await LoanApplication.findById(req.params.id)
        .populate('borrowerId', 'fullName email')
        .populate('approvedBy', 'fullName');

      if (!application) {
        throw new NotFoundError('Loan application not found');
      }

      res.json(successResponse({ application }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/disbursement/statistics
 * Get disbursement dashboard statistics
 * - Role authorization: Disbursement and Admin only
 */
router.get(
  '/statistics',
  authenticate,
  authorize(UserRole.Disbursement, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      // Use UTC to ensure consistent timezone handling
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

      const [
        pendingDisbursements,
        disbursedThisMonth,
        totalDisbursed,
        totalDisbursedAmount,
      ] = await Promise.all([
        LoanApplication.countDocuments({ status: LoanStatus.Approved }),
        // Use updatedAt as fallback since disbursedAt may not be set
        LoanApplication.countDocuments({
          status: LoanStatus.Disbursed,
          updatedAt: { $gte: startOfMonth },
        }),
        LoanApplication.countDocuments({ status: LoanStatus.Disbursed }),
        LoanApplication.aggregate([
          { $match: { status: LoanStatus.Disbursed } },
          { $group: { _id: null, total: { $sum: '$requestedPrincipal' } } },
        ]),
      ]);

      const disbursedAmount = totalDisbursedAmount[0]?.total || 0;

      res.json(
        successResponse({
          pendingDisbursements,
          disbursedThisMonth,
          totalDisbursed,
          totalDisbursedAmount: disbursedAmount,
        })
      );
    } catch (error) {
      console.error('Error fetching statistics:', error);
      next(error);
    }
  }
);

/**
 * GET /api/disbursement/recent-activity
 * Get recent disbursement activities
 * - Role authorization: Disbursement and Admin only
 */
router.get(
  '/recent-activity',
  authenticate,
  authorize(UserRole.Disbursement, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let recentApplications = await LoanApplication.find({
        $or: [
          { status: LoanStatus.Disbursed, disbursedAt: { $gte: thirtyDaysAgo } },
          { status: LoanStatus.Approved, approvedAt: { $gte: thirtyDaysAgo } },
        ],
      })
        .populate('borrowerId', 'fullName email')
        .populate('disbursedBy', 'fullName')
        .sort({ disbursedAt: -1, approvedAt: -1, createdAt: -1 })
        .limit(10)
        .lean();

      // If no recent applications, get the most recent ones regardless of date
      if (recentApplications.length === 0) {
        recentApplications = await LoanApplication.find({
          $or: [
            { status: LoanStatus.Disbursed },
            { status: LoanStatus.Approved },
          ],
        })
          .populate('borrowerId', 'fullName email')
          .populate('disbursedBy', 'fullName')
          .sort({ disbursedAt: -1, approvedAt: -1, createdAt: -1 })
          .limit(10)
          .lean();
      }

      const activities = recentApplications.map((app: any) => {
        // Use the relevant timestamp based on status, with updatedAt as fallback
        let timestamp: Date;
        if (app.status === LoanStatus.Disbursed) {
          timestamp = app.disbursedAt ? new Date(app.disbursedAt) : new Date(app.updatedAt);
        } else if (app.status === LoanStatus.Approved) {
          timestamp = app.approvedAt ? new Date(app.approvedAt) : new Date(app.updatedAt);
        } else {
          timestamp = new Date(app.updatedAt);
        }

        // Check if timestamp is valid
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date(app.createdAt);
        }

        const hoursAgo = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
        const timeAgo = hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;

        const borrowerName = app.personalDetails?.fullName || app.borrowerId?.fullName || 'Unknown';

        let icon: string;
        let text: string;

        if (app.status === LoanStatus.Disbursed) {
          icon = 'green';
          text = `Loan disbursed to ${borrowerName} - ₹${app.requestedPrincipal?.toLocaleString('en-IN') || '0'}`;
        } else if (app.status === LoanStatus.Approved) {
          icon = 'blue';
          text = `Loan approved for ${borrowerName} - ₹${app.requestedPrincipal?.toLocaleString('en-IN') || '0'}`;
        } else {
          icon = 'primary';
          text = `Application updated for ${borrowerName}`;
        }

        return { icon, text, time: timeAgo };
      });

      res.json(successResponse({ activities }));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
