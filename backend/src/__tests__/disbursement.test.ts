import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import { EmploymentMode } from '../models/LoanApplication';

describe('Disbursement API Integration Tests', () => {
  let disbursementToken: string;
  let adminToken: string;
  let borrowerToken: string;
  let sanctionToken: string;
  let disbursementId: string;
  let adminId: string;
  let borrowerId: string;
  let sanctionId: string;
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
    applicationIds = [];

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

    // Create Sanction user
    const sanction = await User.create({
      fullName: 'Sanction Officer',
      email: 'sanction@example.com',
      password: 'SanctionPass123',
      role: UserRole.Sanction,
    });

    sanctionId = sanction._id.toString();

    const sanctionLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sanction@example.com',
        password: 'SanctionPass123',
      });

    sanctionToken = sanctionLoginResponse.body.data.token;

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
      LoanStatus.Approved,
      LoanStatus.Rejected,
      LoanStatus.Disbursed,
      LoanStatus.Active,
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
        requestedPrincipal: 100000 + i * 10000,
        tenureDays: 180,
        annualInterestRate: 12,
        calculatedInterest: 5917.81,
        totalRepayment: 105917.81,
        status: statuses[i],
        approvedBy: statuses[i] === LoanStatus.Approved ? sanctionId : undefined,
        approvedAt: statuses[i] === LoanStatus.Approved ? new Date() : undefined,
      });
      applicationIds.push(application._id.toString());
    }
  });

  describe('GET /api/disbursement/loans - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/disbursement/loans');

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
        .get('/api/disbursement/loans')
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
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should reject request from Sanction role', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should accept request from Disbursement role', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept request from Admin role', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/disbursement/loans - Filtering', () => {
    it('should return only Approved applications by default', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      // Created 9 applications: 2 Approved
      expect(response.body.data.pagination.total).toBe(2);

      response.body.data.applications.forEach((app: any) => {
        expect(app.status).toBe(LoanStatus.Approved);
      });
    });

    it('should filter by status Approved', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?status=Approved')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(2);

      response.body.data.applications.forEach((app: any) => {
        expect(app.status).toBe(LoanStatus.Approved);
      });
    });

    it('should search by borrower name', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?search=Test')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?search=NonExistent')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should include borrower and approver details', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);

      if (response.body.data.applications.length > 0) {
        const app = response.body.data.applications[0];
        expect(app.borrowerId).toBeDefined();
        expect(app.borrowerId.fullName).toBeDefined();
        expect(app.borrowerId.email).toBeDefined();
        expect(app.approvedBy).toBeDefined();
        expect(app.approvedBy.fullName).toBeDefined();
      }
    });
  });

  describe('GET /api/disbursement/loans - Pagination', () => {
    it('should return default page size (10)', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications.length).toBeLessThanOrEqual(10);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should respect custom limit', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?limit=1')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications.length).toBeLessThanOrEqual(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should calculate pagination metadata correctly', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?limit=1')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(2);
      expect(response.body.data.pagination.totalPages).toBe(2); // 2 total / 1 per page = 2 pages
    });
  });

  describe('GET /api/disbursement/loans - Sorting', () => {
    it('should sort by approvedAt descending (default)', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.sortBy).toBe('approvedAt');
      expect(response.body.data.pagination.sortOrder).toBe('desc');
    });

    it('should sort by requestedPrincipal ascending', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?sortBy=requestedPrincipal&sortOrder=asc')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.applications.length > 1) {
        const principals = response.body.data.applications.map((app: any) => app.requestedPrincipal);
        const sortedPrincipals = [...principals].sort((a, b) => a - b);
        expect(principals).toEqual(sortedPrincipals);
      }
    });

    it('should sort by totalRepayment descending', async () => {
      const response = await request(app)
        .get('/api/disbursement/loans?sortBy=totalRepayment&sortOrder=desc')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.applications.length > 1) {
        const repayments = response.body.data.applications.map((app: any) => app.totalRepayment);
        const sortedRepayments = [...repayments].sort((a, b) => b - a);
        expect(repayments).toEqual(sortedRepayments);
      }
    });
  });

  describe('POST /api/disbursement/loans/:id/disburse - Valid Transitions', () => {
    it('should disburse an Approved loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[2]}/disburse`)
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application.status).toBe(LoanStatus.Disbursed);
      expect(response.body.data.application.disbursedBy).toBe(disbursementId);
      expect(response.body.data.application.disbursedAt).toBeDefined();
    });

    it('should allow Admin to disburse loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[3]}/disburse`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.application.status).toBe(LoanStatus.Disbursed);
      expect(response.body.data.application.disbursedBy).toBe(adminId);
    });
  });

  describe('POST /api/disbursement/loans/:id/disburse - Invalid Transitions', () => {
    it('should reject disbursement of Pending loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[0]}/disburse`) // Pending
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should reject disbursement of UnderReview loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[1]}/disburse`) // UnderReview
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should reject disbursement of Rejected loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[4]}/disburse`) // Rejected
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should reject disbursement of Already Disbursed loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[5]}/disburse`) // Already Disbursed
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should reject disbursement of Active loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[6]}/disburse`) // Active
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should reject disbursement of Closed loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[7]}/disburse`) // Closed
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should reject disbursement of Defaulted loan', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[8]}/disburse`) // Defaulted
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/disbursement/loans/${fakeId}/disburse`)
        .set('Authorization', `Bearer ${disbursementToken}`);

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
        .post(`/api/disbursement/loans/${applicationIds[2]}/disburse`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });

    it('should reject request from Sanction role', async () => {
      const response = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[2]}/disburse`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/disbursement/loans/:id/disburse - Race Condition Prevention', () => {
    it('should prevent double disbursement of same loan', async () => {
      // First disbursement
      const firstResponse = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[2]}/disburse`)
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(firstResponse.status).toBe(200);

      // Second disbursement attempt
      const secondResponse = await request(app)
        .post(`/api/disbursement/loans/${applicationIds[2]}/disburse`)
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot disburse loan with status'),
        },
      });
    });
  });

  describe('GET /api/disbursement/loans/:id - Get Single Loan', () => {
    it('should return loan details', async () => {
      const response = await request(app)
        .get(`/api/disbursement/loans/${applicationIds[2]}`)
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.application._id).toBe(applicationIds[2]);
      expect(response.body.data.application.borrowerId).toBeDefined();
      expect(response.body.data.application.approvedBy).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/disbursement/loans/${fakeId}`)
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Loan application not found',
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/disbursement/loans/${applicationIds[2]}`);

      expect(response.status).toBe(401);
    });

    it('should require Disbursement or Admin role', async () => {
      const response = await request(app)
        .get(`/api/disbursement/loans/${applicationIds[2]}`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });
});
