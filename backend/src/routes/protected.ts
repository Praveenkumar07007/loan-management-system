import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.use(authenticate);

router.get('/sales', authorize(UserRole.Sales), (req: Request, res: Response) => {
  res.json(successResponse({ message: 'Sales module accessed', user: req.userId }));
});

router.get('/sanction', authorize(UserRole.Sanction), (req: Request, res: Response) => {
  res.json(successResponse({ message: 'Sanction module accessed', user: req.userId }));
});

router.get('/disbursement', authorize(UserRole.Disbursement), (req: Request, res: Response) => {
  res.json(successResponse({ message: 'Disbursement module accessed', user: req.userId }));
});

router.get('/collection', authorize(UserRole.Collection), (req: Request, res: Response) => {
  res.json(successResponse({ message: 'Collection module accessed', user: req.userId }));
});

router.get('/admin-only', authorize(UserRole.Admin), (req: Request, res: Response) => {
  res.json(successResponse({ message: 'Admin-only endpoint accessed', user: req.userId }));
});

router.get('/profile', (req: Request, res: Response) => {
  res.json(successResponse({
    message: 'User profile accessed',
    user: {
      id: req.userId,
      role: req.userRole,
    },
  }));
});

export default router;
