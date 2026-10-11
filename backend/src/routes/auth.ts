import { Router, Request, Response, NextFunction } from 'express';
import { register, login, googleAuth } from '../services/authService';
import { registerSchema, loginSchema } from '../schemas/auth';
import { validate } from '../middleware/validation';
import { successResponse } from '../utils/apiResponse';

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await register(req.body);
      res.status(201).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await login(req.body);
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/google',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, googleId } = req.body;
      const result = await googleAuth({ email, name, googleId });
      res.status(200).json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
