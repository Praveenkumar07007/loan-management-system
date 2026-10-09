import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';

describe('Auth API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new borrower successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            fullName: 'John Doe',
            email: 'john@example.com',
            role: UserRole.Borrower,
          },
          token: expect.any(String),
        },
        timestamp: expect.any(String),
      });
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
      };

      await request(app).post('/api/auth/register').send(userData);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Jane Doe',
          email: 'john@example.com',
          password: 'AnotherPass123',
        });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Email already registered',
        },
      });
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'invalid-email',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
            }),
          ]),
        },
      });
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'password',
            }),
          ]),
        },
      });
    });

    it('should reject role escalation attempt (Admin)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: UserRole.Admin,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Public registration is only allowed for Borrower role',
        },
      });
    });

    it('should reject role escalation attempt (Sales)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: UserRole.Sales,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Public registration is only allowed for Borrower role',
        },
      });
    });

    it('should reject role escalation attempt (Sanction)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: UserRole.Sanction,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Public registration is only allowed for Borrower role',
        },
      });
    });

    it('should reject role escalation attempt (Disbursement)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: UserRole.Disbursement,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Public registration is only allowed for Borrower role',
        },
      });
    });

    it('should reject role escalation attempt (Collection)', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: UserRole.Collection,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Public registration is only allowed for Borrower role',
        },
      });
    });

    it('should accept valid Borrower role explicitly', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123',
          role: UserRole.Borrower,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.user.role).toBe(UserRole.Borrower);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Borrower,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          user: {
            fullName: 'John Doe',
            email: 'john@example.com',
            role: UserRole.Borrower,
          },
          token: expect.any(String),
        },
      });
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    });

    it('should reject login with non-existent email (same error as invalid password)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid credentials',
        },
      });
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'JOHN@EXAMPLE.COM',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('john@example.com');
    });
  });

  describe('Security: No account enumeration', () => {
    it('should return same error for non-existent email and wrong password', async () => {
      await User.create({
        fullName: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: UserRole.Borrower,
      });

      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword',
        });

      const nonExistentEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword',
        });

      expect(wrongPasswordResponse.status).toBe(401);
      expect(nonExistentEmailResponse.status).toBe(401);
      expect(wrongPasswordResponse.body.error.message).toBe(nonExistentEmailResponse.body.error.message);
    });
  });
});
