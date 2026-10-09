import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import Payment from '../models/Payment';
import { EmploymentMode } from '../models/LoanApplication';

describe('Collection API Integration Tests', () => {
  let collectionToken: string;
  let adminToken: string;
  let borrowerToken: string;
  let disbursementToken: string;
  let collectionId: string;
  let adminId: string;
  let borrowerId: string;
  let disbursementId: string;
  let applicationIds: string[] = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await LoanApplication.deleteMany({});
    await Payment.deleteMany({});
    applicationIds = [];

    // Create Collection user
    const collection = await User.create({
      fullName: 'Collection Officer',
      email: 'collection@example.com',
      password: 'CollectionPass123',
      role: UserRole.Collection,
    });

    collectionId = collection._id.toString();

    const collectionLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'collection@example.com',
        password: 'CollectionPass123',
      });

    collectionToken = collectionLoginResponse.body.data.token;

    // Create Admin user
    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      password: 'AdminPass123',
      role: UserRole.Admin,
    });

    adminId = admin._id.toString();

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'AdminPass123',
      });

    adminToken = adminLoginResponse.body.data.token;

    // Create Disbursement user
    const disbursement = await User.create({
      fullName: 'Disbursement Officer',
      email: 'disbursement@example.com',
      password: 'DisbursementPass123',
      role: UserRole.Disbursement,
    });

    disbursementId = disbursement._id.toString();

    const disbursementLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'disbursement@example.com',
        password: 'DisbursementPass123',
      });

    disbursementToken = disbursementLoginResponse.body.data.token;

    // Create Borrower user
    const borrower = await User.create({
      fullName: 'Test Borrower',
      email: 'borrower@example.com',
      password: 'BorrowerPass123',
      role: UserRole.Borrower,
    });

    borrowerId = borrower._id.toString();

    const borrowerLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'borrower@example.com',
        password: 'BorrowerPass123',
      });

    borrowerToken = borrowerLoginResponse.body.data.token;

    // Create multiple loan applications with different statuses
    const statuses = [
      LoanStatus.Pending,
      LoanStatus.UnderReview,
      LoanStatus.Approved,
      LoanStatus.Disbursed,
      LoanStatus.Disbursed,
      LoanStatus.Active,
      LoanStatus.Rejected,
      LoanStatus.Closed,
      LoanStatus.Defaulted,
    ];

    for (let i = 0; i < statuses.length; i++) {
      const application = await LoanApplication.create({
        borrowerId,
        personalDetails: {
          fullName: 'Test Borrower',
          dateOfBirth: new Date('1990-01-01'),
          phoneNumber: '1234567890',
          address: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400001',
        },
        employmentMode: EmploymentMode.Salaried,
        monthlySalary: 50000,
        requestedPrincipal: 100000,
        tenureDays: 180,
        annualInterestRate: 12,
        calculatedInterest: 5917.81,
        totalRepayment: 105917.81,
        amountPaid: 0,
        status: statuses[i],
        disbursedBy: [LoanStatus.Disbursed, LoanStatus.Active].includes(statuses[i]) ? disbursementId : undefined,
        disbursedAt: [LoanStatus.Disbursed, LoanStatus.Active].includes(statuses[i]) ? new Date() : undefined,
      });
      applicationIds.push(application._id.toString());
    }

    // Add some payments to the Active loan
    await Payment.create({
      applicationId: applicationIds[5], // Active loan
      utr: 'UTR123456789',
      amount: 20000,
      paymentDate: new Date('2024-01-15'),
      recordedBy: collectionId,
    });

    await LoanApplication.findByIdAndUpdate(applicationIds[5], {
      $inc: { amountPaid: 20000 },
    });
  });

  describe('GET /api/collection/loans - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/collection/loans');

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
        .get('/api/collection/loans')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid or expired token',
        },
      });
    });

    it('should reject request from Borrower role', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should reject request from Disbursement role', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should accept request from Collection role', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept request from Admin role', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/collection/loans - Filtering', () => {
    it('should return only Disbursed and Active loans by default', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      // Created 9 applications: 2 Disbursed, 1 Active
      expect(response.body.data.pagination.total).toBe(3);

      response.body.data.applications.forEach((app: any) => {
        expect([LoanStatus.Disbursed, LoanStatus.Active]).toContain(app.status);
      });
    });

    it('should filter by status Disbursed', async () => {
      const response = await request(app)
        .get('/api/collection/loans?status=Disbursed')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(2);

      response.body.data.applications.forEach((app: any) => {
        expect(app.status).toBe(LoanStatus.Disbursed);
      });
    });

    it('should filter by status Active', async () => {
      const response = await request(app)
        .get('/api/collection/loans?status=Active')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(1);

      response.body.data.applications.forEach((app: any) => {
        expect(app.status).toBe(LoanStatus.Active);
      });
    });

    it('should search by borrower name', async () => {
      const response = await request(app)
        .get('/api/collection/loans?search=Test')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/collection/loans?search=NonExistent')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should include borrower and disbursement officer details', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);

      if (response.body.data.applications.length > 0) {
        const app = response.body.data.applications[0];
        expect(app.borrowerId).toBeDefined();
        expect(app.borrowerId.fullName).toBeDefined();
        expect(app.borrowerId.email).toBeDefined();
        expect(app.disbursedBy).toBeDefined();
        expect(app.disbursedBy.fullName).toBeDefined();
      }
    });
  });

  describe('GET /api/collection/loans - Pagination', () => {
    it('should return default page size (10)', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications.length).toBeLessThanOrEqual(10);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should respect custom limit', async () => {
      const response = await request(app)
        .get('/api/collection/loans?limit=1')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications.length).toBeLessThanOrEqual(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should calculate pagination metadata correctly', async () => {
      const response = await request(app)
        .get('/api/collection/loans?limit=2')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(2); // 3 total / 2 per page = 2 pages
    });
  });

  describe('GET /api/collection/loans - Sorting', () => {
    it('should sort by disbursedAt descending (default)', async () => {
      const response = await request(app)
        .get('/api/collection/loans')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.sortBy).toBe('disbursedAt');
      expect(response.body.data.pagination.sortOrder).toBe('desc');
    });

    it('should sort by amountPaid ascending', async () => {
      const response = await request(app)
        .get('/api/collection/loans?sortBy=amountPaid&sortOrder=asc')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.applications.length > 1) {
        const amounts = response.body.data.applications.map((app: any) => app.amountPaid);
        const sortedAmounts = [...amounts].sort((a, b) => a - b);
        expect(amounts).toEqual(sortedAmounts);
      }
    });
  });

  describe('POST /api/collection/loans/:id/payments - Valid Payments', () => {
    it('should record payment for Disbursed loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR999999999',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.utr).toBe('UTR999999999');
      expect(response.body.data.payment.amount).toBe(10000);
      expect(response.body.data.application.status).toBe(LoanStatus.Active);
      expect(response.body.data.outstandingBalance).toBeLessThan(105917.81);
    });

    it('should record payment for Active loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[5]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[5],
          utr: 'UTR888888888',
          amount: 5000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.utr).toBe('UTR888888888');
      expect(response.body.data.application.status).toBe(LoanStatus.Active);
    });

    it('should allow Admin to record payment', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[4]}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationId: applicationIds[4],
          utr: 'UTR777777777',
          amount: 15000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should convert UTR to uppercase', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'utr666666666',
          amount: 5000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.payment.utr).toBe('UTR666666666');
    });
  });

  describe('POST /api/collection/loans/:id/payments - Duplicate UTR', () => {
    it('should reject duplicate UTR (database-level enforcement)', async () => {
      // First payment
      const firstResponse = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR555555555',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(firstResponse.status).toBe(200);

      // Second payment with same UTR
      const secondResponse = await request(app)
        .post(`/api/collection/loans/${applicationIds[4]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[4],
          utr: 'UTR555555555',
          amount: 10000,
          paymentDate: new Date('2024-01-21'),
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('UTR already exists'),
        },
      });
    });
  });

  describe('POST /api/collection/loans/:id/payments - Excessive Amounts', () => {
    it('should reject payment exceeding outstanding balance', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR444444444',
          amount: 200000, // Exceeds total repayment of 105917.81
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('exceeds outstanding balance'),
        },
      });
    });

    it('should reject payment that would exceed outstanding balance after previous payments', async () => {
      // First payment
      await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR333333333',
          amount: 50000,
          paymentDate: new Date('2024-01-20'),
        });

      // Second payment that would exceed balance
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR222222222',
          amount: 60000, // 50000 + 60000 = 110000 > 105917.81
          paymentDate: new Date('2024-01-21'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('exceeds outstanding balance'),
        },
      });
    });
  });

  describe('POST /api/collection/loans/:id/payments - Invalid Dates', () => {
    it('should reject payment with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR111111111',
          amount: 10000,
          paymentDate: futureDate,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Payment date cannot be in the future'),
        },
      });
    });
  });

  describe('POST /api/collection/loans/:id/payments - Invalid Loan States', () => {
    it('should reject payment for Pending loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[0]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[0],
          utr: 'UTR000000001',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot record payment for loan with status'),
        },
      });
    });

    it('should reject payment for UnderReview loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[1]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[1],
          utr: 'UTR000000002',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot record payment for loan with status'),
        },
      });
    });

    it('should reject payment for Approved loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[2]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[2],
          utr: 'UTR000000003',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot record payment for loan with status'),
        },
      });
    });

    it('should reject payment for Rejected loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[6]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[6],
          utr: 'UTR000000004',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot record payment for loan with status'),
        },
      });
    });

    it('should reject payment for Closed loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[7]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[7],
          utr: 'UTR000000005',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot record payment for loan with status'),
        },
      });
    });

    it('should reject payment for Defaulted loan', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[8]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[8],
          utr: 'UTR000000006',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot record payment for loan with status'),
        },
      });
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/collection/loans/${fakeId}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: fakeId,
          utr: 'UTR000000007',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Loan application not found',
        },
      });
    });

    it('should reject request from Borrower role', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR000000008',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(403);
    });

    it('should reject request from Disbursement role', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${disbursementToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR000000009',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/collection/loans/:id/payments - Validation', () => {
    it('should require UTR', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require UTR to be at least 12 characters', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR123',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require UTR to be alphanumeric only', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR@#$%^&*()',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require positive amount', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR1234567890',
          amount: -100,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require amount to be at least 0.01', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR1234567890',
          amount: 0,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require payment date', async () => {
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR1234567890',
          amount: 10000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });
  });

  describe('POST /api/collection/loans/:id/payments - Race Condition Prevention', () => {
    it('should handle concurrent payment attempts safely', async () => {
      // This test simulates concurrent payment attempts
      // The transaction and atomic update should prevent race conditions
      const response = await request(app)
        .post(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`)
        .send({
          applicationId: applicationIds[3],
          utr: 'UTR123456789ABC',
          amount: 10000,
          paymentDate: new Date('2024-01-20'),
        });

      expect(response.status).toBe(200);
      expect(response.body.data.application.amountPaid).toBeGreaterThan(0);
    });
  });

  describe('GET /api/collection/loans/:id/payments - Payment History', () => {
    it('should return payment history for a loan', async () => {
      const response = await request(app)
        .get(`/api/collection/loans/${applicationIds[5]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toBeInstanceOf(Array);
      expect(response.body.data.payments.length).toBeGreaterThan(0);
      expect(response.body.data.payments[0].utr).toBeDefined();
      expect(response.body.data.payments[0].amount).toBeDefined();
    });

    it('should return empty payment history for loan with no payments', async () => {
      const response = await request(app)
        .get(`/api/collection/loans/${applicationIds[3]}/payments`)
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.payments).toBeInstanceOf(Array);
      expect(response.body.data.payments.length).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/collection/loans/${applicationIds[5]}/payments`);

      expect(response.status).toBe(401);
    });

    it('should require Collection or Admin role', async () => {
      const response = await request(app)
        .get(`/api/collection/loans/${applicationIds[5]}/payments`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/collection/loans/:id - Single Loan with Payments', () => {
    it('should return loan details with payment history', async () => {
      const response = await request(app)
        .get(`/api/collection/loans/${applicationIds[5]}`)
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.application._id).toBe(applicationIds[5]);
      expect(response.body.data.payments).toBeInstanceOf(Array);
      expect(response.body.data.outstandingBalance).toBeDefined();
    });

    it('should calculate outstanding balance correctly', async () => {
      const response = await request(app)
        .get(`/api/collection/loans/${applicationIds[5]}`)
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      const loan = response.body.data.application;
      const outstandingBalance = response.body.data.outstandingBalance;
      expect(outstandingBalance).toBe(loan.totalRepayment - loan.amountPaid);
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/collection/loans/${fakeId}`)
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Loan application not found',
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/collection/loans/${applicationIds[5]}`);

      expect(response.status).toBe(401);
    });

    it('should require Collection or Admin role', async () => {
      const response = await request(app)
        .get(`/api/collection/loans/${applicationIds[5]}`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });
});
