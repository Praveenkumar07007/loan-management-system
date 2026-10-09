import app from './app';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await disconnectDatabase();
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await disconnectDatabase();
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
};

startServer();
