import dotenv from 'dotenv';

dotenv.config();

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri,
  jwtSecret,
};
