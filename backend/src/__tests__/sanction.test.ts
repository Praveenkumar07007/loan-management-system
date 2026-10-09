import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import { EmploymentMode } from '../models/LoanApplication';

describe('Sanction API Integration Tests', () => {
  let sanctionToken: string;
  let adminToken: string;
  let borrowerToken: string;
  let sanctionId: string;
  let adminId: string;
  let borrowerId: string;
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
      LoanStatus.Pending,
      LoanStatus.UnderReview,
      LoanStatus.Approved,
      LoanStatus.Rejected,
      LoanStatus.Disbursed,
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
      });
      applicationIds.push(application._id.toString());
    }
  });

  describe('GET /api/sanction/applications - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/sanction/applications');

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
        .get('/api/sanction/applications')
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
        .get('/api/sanction/applications')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should accept request from Sanction role', async () => {
      const response = await request(app)
        .get('/api/sanction/applications')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should accept request from Admin role', async () => {
      const response = await request(app)
        .get('/api/sanction/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/sanction/applications - Filtering', () => {
    it('should return only pending and under-review applications by default', async () => {
      const response = await request(app)
        .get('/api/sanction/applications')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      // Created 6 applications: 2 Pending, 1 UnderReview, 1 Approved, 1 Rejected, 1 Disbursed
      // Should return 3 (Pending + UnderReview)
      expect(response.body.data.pagination.total).toBe(3);

      response.body.data.applications.forEach((app: any) => {
        expect([LoanStatus.Pending, LoanStatus.UnderReview]).toContain(app.status);
      });
    });

    it('should filter by status Pending', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?status=Pending')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(2);

      response.body.data.applications.forEach((app: any) => {
        expect(app.status).toBe(LoanStatus.Pending);
      });
    });

    it('should filter by status UnderReview', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?status=UnderReview')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(1);

      response.body.data.applications.forEach((app: any) => {
        expect(app.status).toBe(LoanStatus.UnderReview);
      });
    });

    it('should search by borrower name', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?search=Test')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?search=NonExistent')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/sanction/applications - Pagination', () => {
    it('should return default page size (10)', async () => {
      const response = await request(app)
        .get('/api/sanction/applications')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications.length).toBeLessThanOrEqual(10);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should respect custom limit', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?limit=2')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should calculate pagination metadata correctly', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?limit=2')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(3);
      expect(response.body.data.pagination.totalPages).toBe(2); // 3 total / 2 per page = 2 pages
    });
  });

  describe('GET /api/sanction/applications - Sorting', () => {
    it('should sort by createdAt descending (default)', async () => {
      const response = await request(app)
        .get('/api/sanction/applications')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.sortBy).toBe('createdAt');
      expect(response.body.data.pagination.sortOrder).toBe('desc');
    });

    it('should sort by requestedPrincipal ascending', async () => {
      const response = await request(app)
        .get('/api/sanction/applications?sortBy=requestedPrincipal&sortOrder=asc')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.applications.length > 1) {
        const principals = response.body.data.applications.map((app: any) => app.requestedPrincipal);
        const sortedPrincipals = [...principals].sort((a, b) => a - b);
        expect(principals).toEqual(sortedPrincipals);
      }
    });
  });

  describe('POST /api/sanction/applications/:id/approve - Valid Transitions', () => {
    it('should approve a Pending application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/approve`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application.status).toBe(LoanStatus.Approved);
      expect(response.body.data.application.approvedBy).toBe(sanctionId);
      expect(response.body.data.application.approvedAt).toBeDefined();
    });

    it('should approve an UnderReview application', async () => {
      // First, move application to UnderReview status
      await LoanApplication.findByIdAndUpdate(applicationIds[1], {
        status: LoanStatus.UnderReview,
      });

      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[1]}/approve`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.application.status).toBe(LoanStatus.Approved);
    });

    it('should allow Admin to approve application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.application.status).toBe(LoanStatus.Approved);
    });
  });

  describe('POST /api/sanction/applications/:id/approve - Invalid Transitions', () => {
    it('should reject approval of Already Approved application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[3]}/approve`) // Already Approved
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot approve application with status'),
        },
      });
    });

    it('should reject approval of Rejected application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[4]}/approve`) // Rejected
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot approve application with status'),
        },
      });
    });

    it('should reject approval of Disbursed application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[5]}/approve`) // Disbursed
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot approve application with status'),
        },
      });
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/sanction/applications/${fakeId}/approve`)
        .set('Authorization', `Bearer ${sanctionToken}`);

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
        .post(`/api/sanction/applications/${applicationIds[0]}/approve`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/sanction/applications/:id/approve - Race Condition Prevention', () => {
    it('should prevent double approval of same application', async () => {
      // First approval
      const firstResponse = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/approve`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(firstResponse.status).toBe(200);

      // Second approval attempt
      const secondResponse = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/approve`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot approve application with status'),
        },
      });
    });
  });

  describe('POST /api/sanction/applications/:id/reject - Valid Transitions', () => {
    it('should reject a Pending application with reason', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'Insufficient credit score',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.application.status).toBe(LoanStatus.Rejected);
      expect(response.body.data.application.rejectionReason).toBe('Insufficient credit score');
      expect(response.body.data.application.reviewedBy).toBe(sanctionId);
      expect(response.body.data.application.reviewedAt).toBeDefined();
    });

    it('should reject an UnderReview application with reason', async () => {
      // First, move application to UnderReview status
      await LoanApplication.findByIdAndUpdate(applicationIds[1], {
        status: LoanStatus.UnderReview,
      });

      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[1]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'Documentation incomplete',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.application.status).toBe(LoanStatus.Rejected);
      expect(response.body.data.application.rejectionReason).toBe('Documentation incomplete');
    });

    it('should allow Admin to reject application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Policy violation',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.application.status).toBe(LoanStatus.Rejected);
    });
  });

  describe('POST /api/sanction/applications/:id/reject - Validation', () => {
    it('should require rejection reason', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require rejection reason to be at least 10 characters', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'Short',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should require rejection reason to not exceed 500 characters', async () => {
      const longReason = 'x'.repeat(501);

      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: longReason,
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

  describe('POST /api/sanction/applications/:id/reject - Invalid Transitions', () => {
    it('should reject rejection of Already Approved application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[3]}/reject`) // Already Approved
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'This should not work',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot reject application with status'),
        },
      });
    });

    it('should reject rejection of Already Rejected application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[4]}/reject`) // Already Rejected
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'This should not work',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot reject application with status'),
        },
      });
    });

    it('should reject rejection of Disbursed application', async () => {
      const response = await request(app)
        .post(`/api/sanction/applications/${applicationIds[5]}/reject`) // Disbursed
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'This should not work',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot reject application with status'),
        },
      });
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post(`/api/sanction/applications/${fakeId}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'Test reason',
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
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          rejectionReason: 'Test reason',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/sanction/applications/:id/reject - Race Condition Prevention', () => {
    it('should prevent double rejection of same application', async () => {
      // First rejection
      const firstResponse = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'First rejection',
        });

      expect(firstResponse.status).toBe(200);

      // Second rejection attempt
      const secondResponse = await request(app)
        .post(`/api/sanction/applications/${applicationIds[0]}/reject`)
        .set('Authorization', `Bearer ${sanctionToken}`)
        .send({
          rejectionReason: 'Second rejection',
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Cannot reject application with status'),
        },
      });
    });
  });

  describe('GET /api/sanction/applications/:id - Get Single Application', () => {
    it('should return application details', async () => {
      const response = await request(app)
        .get(`/api/sanction/applications/${applicationIds[0]}`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.application._id).toBe(applicationIds[0]);
      expect(response.body.data.application.borrowerId).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/sanction/applications/${fakeId}`)
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Loan application not found',
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/sanction/applications/${applicationIds[0]}`);

      expect(response.status).toBe(401);
    });

    it('should require Sanction or Admin role', async () => {
      const response = await request(app)
        .get(`/api/sanction/applications/${applicationIds[0]}`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });
});
