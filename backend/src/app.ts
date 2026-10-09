import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { isDatabaseConnected } from './config/database';
import { AppError, NotFoundError } from './errors/AppError';
import { errorResponse } from './utils/apiResponse';
import { validate } from './middleware/validation';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  const dbConnected = isDatabaseConnected();
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

const testSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  age: z.number().min(0).max(120).optional(),
});

app.post('/api/test/validation', validate(testSchema), (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

app.get('/api/test/not-found', (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError('Test resource not found'));
});

app.get('/api/test/server-error', (req: Request, res: Response, next: NextFunction) => {
  next(new Error('Unexpected server error'));
});

app.use((req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      errorResponse(err.message, err.statusCode, err.details)
    );
  } else {
    res.status(500).json(
      errorResponse('Internal Server Error', 500)
    );
  }
});

export default app;
