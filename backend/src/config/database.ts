import mongoose from 'mongoose';
import { config } from './env';

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected) {
    console.log('Database already connected');
    return;
  }

  try {
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(config.mongodbUri);
    isConnected = true;
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Database disconnection failed:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

export const isDatabaseConnected = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log('Database disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('Database connection error:', error.message);
});
