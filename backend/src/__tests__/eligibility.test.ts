import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import { EmploymentMode } from '../models/LoanApplication';

describe('Eligibility API Integration Tests', () => {
  let borrowerToken: string;
  let borrowerId: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    // Create a borrower user for testing
    const borrower = await User.create({
      fullName: 'Test Borrower',
      email: 'borrower@example.com',
      password: 'SecurePass123',
      role: UserRole.Borrower,
    });

    borrowerId = borrower._id.toString();

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'borrower@example.com',
        password: 'SecurePass123',
      });

    borrowerToken = loginResponse.body.data.token;
  });

  describe('POST /api/eligibility/validate - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid or expired token',
        },
      });
    });

    it('should allow Admin to access endpoint (admin bypass)', async () => {
      // Create admin user
      await User.create({
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: 'AdminPass123',
        role: UserRole.Admin,
      });

      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPass123',
        });

      const adminToken = adminLoginResponse.body.data.token;

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      // Admin users have access to all endpoints
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject request from Sales role', async () => {
      // Create sales user
      await User.create({
        fullName: 'Sales User',
        email: 'sales@example.com',
        password: 'SalesPass123',
        role: UserRole.Sales,
      });

      const salesLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'sales@example.com',
          password: 'SalesPass123',
        });

      const salesToken = salesLoginResponse.body.data.token;

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should accept request from authenticated borrower', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/eligibility/validate - Validation', () => {
    it('should reject request with missing dateOfBirth', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'dateOfBirth',
            }),
          ]),
        },
      });
    });

    it('should reject request with invalid date format', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: 'invalid-date',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'dateOfBirth',
            }),
          ]),
        },
      });
    });

    it('should reject request with missing monthlySalary', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'monthlySalary',
            }),
          ]),
        },
      });
    });

    it('should reject request with negative salary', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: -1000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'monthlySalary',
            }),
          ]),
        },
      });
    });

    it('should reject request with missing employmentMode', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'employmentMode',
            }),
          ]),
        },
      });
    });
  });

  describe('POST /api/eligibility/validate - Accepted Cases', () => {
    it('should accept eligible borrower with all criteria met', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 50000,
          panNumber: 'ABCDE1234F',
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          borrowerId: borrowerId,
          eligible: true,
          rejectionReasons: [],
        },
        timestamp: expect.any(String),
      });
    });

    it('should accept borrower at minimum age (23)', async () => {
      const today = new Date();
      const dateOfBirth = new Date(today.getFullYear() - 23, today.getMonth(), today.getDate());

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: dateOfBirth.toISOString().split('T')[0],
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });

    it('should accept borrower at maximum age (50)', async () => {
      const today = new Date();
      const dateOfBirth = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate());

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: dateOfBirth.toISOString().split('T')[0],
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });

    it('should accept borrower at minimum salary (25000)', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 25000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });

    it('should accept borrower with SelfEmployed mode', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.SelfEmployed,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });

    it('should accept borrower with Business mode', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Business,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });

    it('should accept borrower without PAN (optional field)', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });

    it('should accept borrower with valid lowercase PAN', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          panNumber: 'abcde1234f',
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(true);
      expect(response.body.data.rejectionReasons).toHaveLength(0);
    });
  });

  describe('POST /api/eligibility/validate - Rejected Cases', () => {
    it('should reject borrower below minimum age (22)', async () => {
      const today = new Date();
      const dateOfBirth = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate() + 1);

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: dateOfBirth.toISOString().split('T')[0],
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.rejectionReasons).toContainEqual({
        field: 'age',
        message: 'Applicant is below minimum age requirement',
        currentValue: expect.any(Number),
        requirement: 'Minimum age: 23 years',
      });
    });

    it('should reject borrower above maximum age (51)', async () => {
      const today = new Date();
      const dateOfBirth = new Date(today.getFullYear() - 51, today.getMonth(), today.getDate() - 1);

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: dateOfBirth.toISOString().split('T')[0],
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.rejectionReasons).toContainEqual({
        field: 'age',
        message: 'Applicant is above maximum age requirement',
        currentValue: expect.any(Number),
        requirement: 'Maximum age: 50 years',
      });
    });

    it('should reject borrower with salary below minimum (24999)', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 24999,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.rejectionReasons).toContainEqual({
        field: 'monthlySalary',
        message: 'Monthly salary is below minimum requirement',
        currentValue: 24999,
        requirement: 'Minimum monthly salary: ₹25,000',
      });
    });

    it('should reject borrower with invalid PAN format', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          panNumber: 'INVALID_PAN',
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.rejectionReasons).toContainEqual({
        field: 'panNumber',
        message: 'PAN number format is invalid',
        currentValue: 'INVALID_PAN',
        requirement: 'Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)',
      });
    });

    it('should reject borrower with Other employment mode', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Other,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.rejectionReasons).toContainEqual({
        field: 'employmentMode',
        message: 'Employment mode is not acceptable',
        currentValue: EmploymentMode.Other,
        requirement: 'Must be Salaried, SelfEmployed, or Business (Other/Unemployed not allowed)',
      });
    });

    it('should return multiple rejection reasons when multiple criteria fail', async () => {
      const today = new Date();
      const dateOfBirth = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: dateOfBirth.toISOString().split('T')[0],
          monthlySalary: 10000,
          panNumber: 'INVALID',
          employmentMode: EmploymentMode.Other,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);
      expect(response.body.data.rejectionReasons.length).toBeGreaterThan(1);
      expect(response.body.data.rejectionReasons.some((r: any) => r.field === 'age')).toBe(true);
      expect(response.body.data.rejectionReasons.some((r: any) => r.field === 'monthlySalary')).toBe(true);
      expect(response.body.data.rejectionReasons.some((r: any) => r.field === 'panNumber')).toBe(true);
      expect(response.body.data.rejectionReasons.some((r: any) => r.field === 'employmentMode')).toBe(true);
    });
  });

  describe('POST /api/eligibility/validate - Security', () => {
    it('should ignore borrowerId from request body and use authenticated user', async () => {
      // Create another borrower
      const otherBorrower = await User.create({
        fullName: 'Other Borrower',
        email: 'other@example.com',
        password: 'OtherPass123',
        role: UserRole.Borrower,
      });

      const otherBorrowerId = otherBorrower._id.toString();

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
          borrowerId: otherBorrowerId, // Attempt to use another borrower's ID
        });

      expect(response.status).toBe(200);
      // The response should contain the authenticated user's ID, not the one from request body
      expect(response.body.data.borrowerId).toBe(borrowerId);
      expect(response.body.data.borrowerId).not.toBe(otherBorrowerId);
    });

    it('should derive borrower identity from authenticated session', async () => {
      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          monthlySalary: 30000,
          employmentMode: EmploymentMode.Salaried,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.borrowerId).toBe(borrowerId);
      expect(response.body.data.borrowerId).toBeDefined();
    });

    it('should not create loan application when eligibility fails', async () => {
      const LoanApplication = mongoose.model('LoanApplication');

      const response = await request(app)
        .post('/api/eligibility/validate')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          dateOfBirth: '2010-01-01',
          monthlySalary: 10000,
          employmentMode: EmploymentMode.Other,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.eligible).toBe(false);

      // Verify no loan application was created
      const applications = await LoanApplication.find({ borrowerId: borrowerId });
      expect(applications).toHaveLength(0);
    });
  });
});
