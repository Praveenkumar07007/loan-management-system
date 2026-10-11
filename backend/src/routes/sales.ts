import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';
import { borrowerListQuerySchema } from '../schemas/sales';
import User from '../models/User';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';

const router = Router();

/**
 * GET /api/sales/borrowers
 * List registered borrowers (with and without loan applications)
 * - Role authorization: Sales only
 * - Search by name or email
 * - Filter by registration date range
 * - Sort by name, email, or registration date
 * - Server-side pagination
 */
router.get(
  '/borrowers',
  authenticate,
  authorize(UserRole.Sales),
  validate(borrowerListQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        limit,
        search,
        registeredAfter,
        registeredBefore,
        sortBy,
        sortOrder,
      } = req.query as any;

      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build base query for borrowers only
      const baseQuery: any = {
        role: UserRole.Borrower,
      };

      // Add search filter (name or email)
      if (search) {
        baseQuery.$or = [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      // Add date range filters
      if (registeredAfter || registeredBefore) {
        baseQuery.createdAt = {};
        if (registeredAfter) {
          baseQuery.createdAt.$gte = registeredAfter;
        }
        if (registeredBefore) {
          baseQuery.createdAt.$lte = registeredBefore;
        }
      }

      // Execute query with pagination and sorting
      const [borrowers, total] = await Promise.all([
        User.find(baseQuery)
          .select('fullName email role createdAt phoneNumber address city state pinCode')
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(baseQuery),
      ]);

      // Add application count to each borrower
      const borrowersWithApplicationCount = await Promise.all(
        borrowers.map(async (borrower: any) => {
          const applicationCount = await LoanApplication.countDocuments({
            borrowerId: borrower._id,
          });
          return {
            ...borrower,
            applicationCount,
          };
        })
      );

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      res.json(
        successResponse({
          borrowers: borrowersWithApplicationCount,
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
 * GET /api/sales/statistics
 * Get sales dashboard statistics
 * - Role authorization: Sales only
 */
router.get(
  '/statistics',
  authenticate,
  authorize(UserRole.Sales),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalApplications,
        pendingApplications,
        approvedThisMonth,
        approvedTotal,
        rejectedThisMonth,
        rejectedTotal,
      ] = await Promise.all([
        LoanApplication.countDocuments({}),
        LoanApplication.countDocuments({ status: LoanStatus.Pending }),
        LoanApplication.countDocuments({
          status: LoanStatus.Approved,
          approvedAt: { $gte: startOfMonth },
        }),
        LoanApplication.countDocuments({ status: LoanStatus.Approved }),
        LoanApplication.countDocuments({
          status: LoanStatus.Rejected,
          reviewedAt: { $gte: startOfMonth },
        }),
        LoanApplication.countDocuments({ status: LoanStatus.Rejected }),
      ]);

      res.json(
        successResponse({
          totalApplications,
          pendingApplications,
          approvedThisMonth,
          approvedTotal,
          rejectedThisMonth,
          rejectedTotal,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sales/borrowers/:id
 * Get details of a specific borrower (Sales view)
 */
router.get(
  '/borrowers/:id',
  authenticate,
  authorize(UserRole.Sales),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const borrower = await User.findOne({
        _id: req.params.id,
        role: UserRole.Borrower,
      }).select('fullName email role createdAt phoneNumber address city state pinCode');

      if (!borrower) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Borrower not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get borrower's loan applications
      const loanApplications = await LoanApplication.find({
        borrowerId: req.params.id,
      })
        .select('status requestedPrincipal tenureDays annualInterestRate createdAt personalDetails')
        .sort({ createdAt: -1 })
        .lean();

      res.json(successResponse({ borrower, loanApplications }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sales/recent-activity
 * Get recent sales activities
 * - Role authorization: Sales only
 */
router.get(
  '/recent-activity',
  authenticate,
  authorize(UserRole.Sales),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentApplications = await LoanApplication.find({
        createdAt: { $gte: sevenDaysAgo },
      })
        .populate('borrowerId', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const activities = recentApplications.map((app: any) => {
        const hoursAgo = Math.floor((now.getTime() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60));
        const timeAgo = hoursAgo < 1 ? 'Just now' : hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;

        return {
          icon: 'primary',
          text: `New application from ${app.borrowerId?.fullName || 'Unknown'} for ₹${app.requestedPrincipal?.toLocaleString('en-IN') || '0'}`,
          time: timeAgo,
        };
      });

      res.json(successResponse({ activities }));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
