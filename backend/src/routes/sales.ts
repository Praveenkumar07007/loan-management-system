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
 * List registered borrowers who have not applied for a loan
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

      // Get IDs of borrowers who have applied for a loan
      const borrowersWithApplications = await LoanApplication.distinct('borrowerId', {
        status: { $in: [LoanStatus.Pending, LoanStatus.UnderReview, LoanStatus.Approved, LoanStatus.Disbursed, LoanStatus.Active] },
      });

      // Exclude borrowers who have applied
      if (borrowersWithApplications.length > 0) {
        baseQuery._id = { $nin: borrowersWithApplications };
      }

      // Execute query with pagination and sorting
      const [borrowers, total] = await Promise.all([
        User.find(baseQuery)
          .select('fullName email role createdAt') // Only return fields Sales needs
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(baseQuery),
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      res.json(
        successResponse({
          borrowers,
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
      }).select('fullName email role createdAt');

      if (!borrower) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Borrower not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      res.json(successResponse({ borrower }));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
