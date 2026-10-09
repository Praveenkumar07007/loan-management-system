import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error('MONGODB_URI is not defined in environment variables');
}

const jwtSecret = process.env.JWT_SECRET || 'our-jwt-key';

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri,
  jwtSecret,
  uploadDir,
};
