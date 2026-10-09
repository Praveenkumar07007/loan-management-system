import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { isDatabaseConnected } from './config/database';

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

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
