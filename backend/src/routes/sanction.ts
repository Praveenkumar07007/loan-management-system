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
        mySanctions,
      } = req.query as any;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build base query for pending/under-review/approved applications
      let baseQuery: any = {
        status: status || { $in: [LoanStatus.Pending, LoanStatus.UnderReview] },
      };

      // Add filter for my sanctions only - show approved loans by me
      if (mySanctions === 'true' && req.userId) {
        baseQuery = {
          approvedBy: req.userId,
          status: LoanStatus.Approved,
        };
      }

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
          .select('_id borrowerId personalDetails employmentMode monthlySalary requestedPrincipal tenureDays annualInterestRate calculatedInterest totalRepayment status approvalReason rejectionReason approvedBy approvedAt createdAt')
          .populate('borrowerId', 'fullName email')
          .populate('approvedBy', 'fullName')
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
 * - Optionally accepts approval reason
 */
router.post(
  '/applications/:id/approve',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  validate(approveApplicationSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = req.params.id;
      const { approvalReason } = req.body;
      const sanctionId = req.userId!;

      const validFromStatuses = [LoanStatus.Pending, LoanStatus.UnderReview];

      const updateDoc: any = {
        status: LoanStatus.Approved,
        approvedBy: sanctionId,
        approvedAt: new Date(),
      };

      if (approvalReason) {
        updateDoc.approvalReason = approvalReason;
      }

      const application = await LoanApplication.findOneAndUpdate(
        {
          _id: applicationId,
          status: { $in: validFromStatuses },
        },
        {
          $set: updateDoc,
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

/**
 * GET /api/sanction/statistics
 * Get sanction dashboard statistics
 * - Role authorization: Sanction and Admin only
 */
router.get(
  '/statistics',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // Set start of month to midnight UTC to ensure proper comparison
      startOfMonth.setUTCHours(0, 0, 0, 0);

      const [
        pendingCount,
        underReviewCount,
        approvedThisMonth,
        approvedTotal,
        rejectedThisMonth,
        totalSanctionedAmount,
      ] = await Promise.all([
        LoanApplication.countDocuments({ status: LoanStatus.Pending }),
        LoanApplication.countDocuments({ status: LoanStatus.UnderReview }),
        LoanApplication.countDocuments({
          status: LoanStatus.Approved,
          approvedAt: { $gte: startOfMonth },
        }),
        LoanApplication.countDocuments({ status: LoanStatus.Approved }),
        LoanApplication.countDocuments({
          status: LoanStatus.Rejected,
          reviewedAt: { $gte: startOfMonth },
        }),
        LoanApplication.aggregate([
          { $match: { status: LoanStatus.Approved } },
          { $group: { _id: null, total: { $sum: '$requestedPrincipal' } } },
        ]),
      ]);

      const sanctionedAmount = totalSanctionedAmount[0]?.total || 0;

      res.json(
        successResponse({
          pendingApplications: pendingCount + underReviewCount,
          pending: pendingCount,
          underReview: underReviewCount,
          approvedThisMonth,
          approvedTotal,
          rejectedThisMonth,
          totalSanctionedAmount: sanctionedAmount,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sanction/recent-activity
 * Get recent sanction activities
 * - Role authorization: Sanction and Admin only
 */
router.get(
  '/recent-activity',
  authenticate,
  authorize(UserRole.Sanction, UserRole.Admin),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentApplications = await LoanApplication.find({
        updatedAt: { $gte: sevenDaysAgo },
      })
        .populate('borrowerId', 'fullName email')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

      const activities = recentApplications.map((app: any) => {
        const hoursAgo = Math.floor((now.getTime() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60));
        const timeAgo = hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;

        // Use personalDetails.fullName as primary source, fallback to borrowerId.fullName
        const borrowerName = app.personalDetails?.fullName || app.borrowerId?.fullName || 'Unknown';

        let icon: string;
        let text: string;

        switch (app.status) {
          case LoanStatus.Pending:
            icon = 'yellow';
            text = `New application from ${borrowerName} for ₹${app.requestedPrincipal?.toLocaleString('en-IN') || '0'}`;
            break;
          case LoanStatus.UnderReview:
            icon = 'blue';
            text = `Loan under review for ${borrowerName}`;
            break;
          case LoanStatus.Approved:
            icon = 'green';
            text = `Loan sanctioned for ${borrowerName} - ₹${app.requestedPrincipal?.toLocaleString('en-IN') || '0'}`;
            break;
          case LoanStatus.Rejected:
            icon = 'purple';
            text = `Loan rejected for ${borrowerName}`;
            break;
          case LoanStatus.Disbursed:
            icon = 'green';
            text = `Loan disbursed to ${borrowerName}`;
            break;
          case LoanStatus.Active:
            icon = 'green';
            text = `Loan active for ${borrowerName}`;
            break;
          case LoanStatus.Closed:
            icon = 'green';
            text = `Loan closed for ${borrowerName}`;
            break;
          case LoanStatus.Defaulted:
            icon = 'red';
            text = `Loan defaulted for ${borrowerName}`;
            break;
          default:
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
