import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { isDatabaseConnected } from './config/database';
import { AppError, NotFoundError } from './errors/AppError';
import { errorResponse } from './utils/apiResponse';
import authRoutes from './routes/auth';

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

app.use('/api/auth', authRoutes);

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
