import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { isDatabaseConnected } from './config/database';
import { AppError, NotFoundError } from './errors/AppError';
import { errorResponse } from './utils/apiResponse';
import authRoutes from './routes/auth';
import protectedRoutes from './routes/protected';
import eligibilityRoutes from './routes/eligibility';
import documentRoutes from './routes/documents';
import loanApplicationRoutes from './routes/loanApplications';

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
app.use('/api/protected', protectedRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/loan-applications', loanApplicationRoutes);

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
