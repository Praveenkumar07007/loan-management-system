import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import { UnauthorizedError, ConflictError, ForbiddenError } from '../errors/AppError';
import { config } from '../config/env';
import type { RegisterInput, LoginInput } from '../schemas/auth';

export const register = async (data: RegisterInput) => {
  const { fullName, email, password, role } = data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const userRole = role || UserRole.Borrower;

  if (userRole !== UserRole.Borrower) {
    throw new ForbiddenError('Public registration is only allowed for Borrower role');
  }

  const user = await User.create({
    fullName,
    email,
    password,
    role: userRole,
  });

  const token = generateToken(user._id.toString(), user.role);

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

export const login = async (data: LoginInput) => {
  const { email, password } = data;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = generateToken(user._id.toString(), user.role);

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

export const googleAuth = async (data: { email: string; name: string; googleId: string }) => {
  const { email, name, googleId } = data;

  let user = await User.findOne({ email });

  if (user) {
    // User exists, update googleId if not set
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    // Create new user
    user = await User.create({
      fullName: name,
      email,
      googleId,
      role: UserRole.Borrower,
      password: Math.random().toString(36).slice(-8), // Random password for Google users
    });
  }

  const token = generateToken(user._id.toString(), user.role);

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

const generateToken = (userId: string, role: UserRole): string => {
  return jwt.sign(
    { userId, role },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: string; role: UserRole };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};
