import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { eligibilityValidationSchema } from '../schemas/eligibility';
import { evaluateEligibility } from '../services/eligibilityService';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.post(
  '/validate',
  authenticate,
  authorize(UserRole.Borrower),
  validate(eligibilityValidationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const eligibilityResult = evaluateEligibility(req.body);

      res.json(successResponse({
        borrowerId: req.userId,
        eligible: eligibilityResult.eligible,
        rejectionReasons: eligibilityResult.rejectionReasons,
      }));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
