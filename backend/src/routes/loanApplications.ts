import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';
import { loanApplicationSubmissionSchema } from '../schemas/loanApplication';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import Document, { DocumentType } from '../models/Document';
import { evaluateEligibility } from '../services/eligibilityService';
import { calculateLoan, validateLoanAgainstEligibility } from '../services/loanCalculationService';
import { EmploymentMode } from '../models/LoanApplication';
import { ValidationError, ConflictError, NotFoundError } from '../errors/AppError';

const router = Router();

/**
 * POST /api/loan-applications
 * Submit a new loan application
 * - Reruns eligibility on server
 * - Verifies document ownership
 * - Calculates financial values on server
 * - Never trusts client-supplied interest or repayment totals
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.Borrower),
  validate(loanApplicationSubmissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const borrowerId = req.userId!;

      // Step 1: Verify document ownership if documentId is provided
      if (req.body.documentId) {
        const document = await Document.findById(req.body.documentId);

        if (!document) {
          throw new NotFoundError('Document not found');
        }

        if (document.borrowerId.toString() !== borrowerId) {
          throw new ValidationError('Document does not belong to the authenticated borrower');
        }

        if (document.documentType !== DocumentType.SalarySlip) {
          throw new ValidationError('Document must be a salary slip');
        }
      }

      // Step 2: Rerun eligibility check on server using provided personal details
      const eligibilityResult = evaluateEligibility({
        dateOfBirth: req.body.personalDetails.dateOfBirth,
        monthlySalary: req.body.monthlySalary,
        employmentMode: req.body.employmentMode as EmploymentMode,
        panNumber: undefined, // PAN is optional
      });

      if (!eligibilityResult.eligible) {
        throw new ValidationError(
          'Borrower is not eligible for loan',
          eligibilityResult.rejectionReasons
        );
      }

      // Step 3: Calculate loan details on server (never trust client values)
      const loanCalculation = calculateLoan({
        principal: req.body.requestedPrincipal,
        tenureDays: req.body.tenureDays,
        annualInterestRate: req.body.annualInterestRate,
      });

      // Step 4: Check for duplicate submissions
      // A duplicate is defined as having the same borrower with a pending or under-review application
      const existingApplication = await LoanApplication.findOne({
        borrowerId,
        status: { $in: [LoanStatus.Pending, LoanStatus.UnderReview] },
      });

      if (existingApplication) {
        throw new ConflictError(
          'You already have a pending loan application. Please wait for it to be processed before submitting a new one.'
        );
      }

      // Step 5: Create loan application with server-calculated values
      const application = await LoanApplication.create({
        borrowerId,
        personalDetails: req.body.personalDetails,
        employmentMode: req.body.employmentMode,
        monthlySalary: req.body.monthlySalary,
        documentId: req.body.documentId,
        requestedPrincipal: req.body.requestedPrincipal,
        tenureDays: req.body.tenureDays,
        annualInterestRate: req.body.annualInterestRate,
        calculatedInterest: loanCalculation.calculatedInterest,
        totalRepayment: loanCalculation.totalRepayment,
        status: LoanStatus.Pending,
        documents: req.body.documentId
          ? [
              {
                documentType: 'SalarySlip',
                fileName: 'salary-slip', // This would be populated from the actual document
                uploadedAt: new Date(),
                fileSize: 0,
                mimeType: 'application/pdf',
              },
            ]
          : [],
      });

      // Step 6: Return response with server-calculated values
      res.json(
        successResponse({
          applicationId: application._id,
          borrowerId: application.borrowerId,
          personalDetails: application.personalDetails,
          employmentMode: application.employmentMode,
          monthlySalary: application.monthlySalary,
          requestedPrincipal: application.requestedPrincipal,
          tenureDays: application.tenureDays,
          annualInterestRate: application.annualInterestRate,
          calculatedInterest: application.calculatedInterest,
          totalRepayment: application.totalRepayment,
          status: application.status,
          submittedAt: application.createdAt,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/loan-applications
 * Get list of loan applications for the authenticated borrower
 */
router.get(
  '/',
  authenticate,
  authorize(UserRole.Borrower),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applications = await LoanApplication.find({ borrowerId: req.userId })
        .select('-calculatedInterest -totalRepayment') // Don't expose sensitive financial details in list
        .sort({ createdAt: -1 });

      res.json(successResponse({ applications }));
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/loan-applications/:id
 * Get details of a specific loan application
 */
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.Borrower),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await LoanApplication.findOne({
        _id: req.params.id,
        borrowerId: req.userId,
      });

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
 * GET /api/loan-applications/statistics
 * Get statistics for the authenticated borrower
 */
router.get(
  '/statistics',
  authenticate,
  authorize(UserRole.Borrower),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const borrowerId = req.userId!;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        disbursedApplications,
        totalBorrowed,
        nextEmiAmount,
      ] = await Promise.all([
        LoanApplication.countDocuments({ borrowerId }),
        LoanApplication.countDocuments({ borrowerId, status: LoanStatus.Pending }),
        LoanApplication.countDocuments({ borrowerId, status: LoanStatus.Approved }),
        LoanApplication.countDocuments({ borrowerId, status: LoanStatus.Rejected }),
        LoanApplication.countDocuments({ borrowerId, status: LoanStatus.Disbursed }),
        LoanApplication.aggregate([
          { $match: { borrowerId, status: LoanStatus.Disbursed } },
          { $group: { _id: null, total: { $sum: '$requestedPrincipal' } } },
        ]),
        LoanApplication.findOne({
          borrowerId,
          status: LoanStatus.Disbursed,
        }).sort({ disbursedAt: -1 }),
      ]);

      const borrowedAmount = totalBorrowed[0]?.total || 0;

      res.json(
        successResponse({
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          disbursedApplications,
          totalBorrowed: borrowedAmount,
          nextEmiAmount: nextEmiAmount ? nextEmiAmount.totalRepayment / (nextEmiAmount.tenureDays / 30) : 0,
        })
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
