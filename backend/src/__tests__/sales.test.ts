import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import { EmploymentMode } from '../models/LoanApplication';

describe('Sales API Integration Tests', () => {
  let salesToken: string;
  let salesId: string;
  let borrowerIds: string[] = [];

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await LoanApplication.deleteMany({});
    borrowerIds = [];

    // Create Sales user
    const sales = await User.create({
      fullName: 'Sales Agent',
      email: 'sales@example.com',
      password: 'SalesPass123',
      role: UserRole.Sales,
    });

    salesId = sales._id.toString();

    const salesLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sales@example.com',
        password: 'SalesPass123',
      });

    salesToken = salesLoginResponse.body.data.token;

    // Create multiple borrowers
    for (let i = 1; i <= 15; i++) {
      const borrower = await User.create({
        fullName: `Borrower ${i}`,
        email: `borrower${i}@example.com`,
        password: 'BorrowerPass123',
        role: UserRole.Borrower,
      });
      borrowerIds.push(borrower._id.toString());
    }

    // Create loan applications for some borrowers (so they won't appear in the list)
    await LoanApplication.create({
      borrowerId: borrowerIds[0],
      personalDetails: {
        fullName: 'Borrower 1',
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
      status: LoanStatus.Pending,
    });

    await LoanApplication.create({
      borrowerId: borrowerIds[1],
      personalDetails: {
        fullName: 'Borrower 2',
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
      status: LoanStatus.Approved,
    });
  });

  describe('GET /api/sales/borrowers - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/sales/borrowers');

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
        .get('/api/sales/borrowers')
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
      const borrower = await User.create({
        fullName: 'Test Borrower',
        email: 'testborrower@example.com',
        password: 'TestPass123',
        role: UserRole.Borrower,
      });

      const borrowerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testborrower@example.com',
          password: 'TestPass123',
        });

      const borrowerToken = borrowerLoginResponse.body.data.token;

      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should accept request from Sales role', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow Admin to access (admin bypass)', async () => {
      const admin = await User.create({
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
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/sales/borrowers - Filtering (No Applications)', () => {
    it('should exclude borrowers who have applied for a loan', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      // Created 15 borrowers, 2 have applications, so should return 13
      expect(response.body.data.borrowers.length).toBe(10); // Default limit is 10
      expect(response.body.data.pagination.total).toBe(13);

      // Verify borrowers with applications are not in the list
      const borrowerIdsInResponse = response.body.data.borrowers.map((b: any) => b._id.toString());
      expect(borrowerIdsInResponse).not.toContain(borrowerIds[0]);
      expect(borrowerIdsInResponse).not.toContain(borrowerIds[1]);
    });

    it('should only return borrowers (not other roles)', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);

      response.body.data.borrowers.forEach((borrower: any) => {
        expect(borrower.role).toBe(UserRole.Borrower);
      });
    });

    it('should return only fields Sales needs', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);

      if (response.body.data.borrowers.length > 0) {
        const borrower = response.body.data.borrowers[0];
        expect(borrower).toHaveProperty('fullName');
        expect(borrower).toHaveProperty('email');
        expect(borrower).toHaveProperty('role');
        expect(borrower).toHaveProperty('createdAt');
        expect(borrower).not.toHaveProperty('password');
        expect(borrower).not.toHaveProperty('borrowerId');
      }
    });
  });

  describe('GET /api/sales/borrowers - Pagination', () => {
    it('should return default page size (10)', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.borrowers.length).toBeLessThanOrEqual(10);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.page).toBe(1);
    });

    it('should respect custom limit', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.borrowers.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should respect page parameter', async () => {
      const firstPage = await request(app)
        .get('/api/sales/borrowers?page=1&limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      const secondPage = await request(app)
        .get('/api/sales/borrowers?page=2&limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(firstPage.status).toBe(200);
      expect(secondPage.status).toBe(200);

      const firstPageIds = firstPage.body.data.borrowers.map((b: any) => b._id);
      const secondPageIds = secondPage.body.data.borrowers.map((b: any) => b._id);

      // Ensure different results on different pages
      expect(firstPageIds).not.toEqual(secondPageIds);
    });

    it('should calculate total pages correctly', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBe(13);
      expect(response.body.data.pagination.totalPages).toBe(3); // 13 total / 5 per page = 3 pages
    });

    it('should indicate next page availability', async () => {
      const firstPage = await request(app)
        .get('/api/sales/borrowers?page=1&limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      const lastPage = await request(app)
        .get('/api/sales/borrowers?page=3&limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(firstPage.body.data.pagination.hasNextPage).toBe(true);
      expect(lastPage.body.data.pagination.hasNextPage).toBe(false);
    });

    it('should indicate previous page availability', async () => {
      const firstPage = await request(app)
        .get('/api/sales/borrowers?page=1&limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      const secondPage = await request(app)
        .get('/api/sales/borrowers?page=2&limit=5')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(firstPage.body.data.pagination.hasPreviousPage).toBe(false);
      expect(secondPage.body.data.pagination.hasPreviousPage).toBe(true);
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?limit=200')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(100);
    });
  });

  describe('GET /api/sales/borrowers - Search', () => {
    it('should search by full name', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?search=Borrower 3')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.borrowers.length).toBeGreaterThan(0);
      expect(response.body.data.borrowers[0].fullName).toContain('Borrower 3');
    });

    it('should search by email', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?search=borrower5@example.com')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.borrowers.length).toBeGreaterThan(0);
      expect(response.body.data.borrowers[0].email).toContain('borrower5');
    });

    it('should be case-insensitive search', async () => {
      const response1 = await request(app)
        .get('/api/sales/borrowers?search=BORROWER 3')
        .set('Authorization', `Bearer ${salesToken}`);

      const response2 = await request(app)
        .get('/api/sales/borrowers?search=borrower 3')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.borrowers.length).toBe(response2.body.data.borrowers.length);
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?search=NonExistent')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.borrowers).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /api/sales/borrowers - Date Filters', () => {
    it('should filter by registeredAfter date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .get(`/api/sales/borrowers?registeredAfter=${yesterday.toISOString()}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      // All borrowers created in test should be after yesterday
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should filter by registeredBefore date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get(`/api/sales/borrowers?registeredBefore=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      // All borrowers created in test should be before tomorrow
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get(
          `/api/sales/borrowers?registeredAfter=${yesterday.toISOString()}&registeredBefore=${tomorrow.toISOString()}`
        )
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.total).toBeGreaterThan(0);
    });
  });

  describe('GET /api/sales/borrowers - Sorting', () => {
    it('should sort by fullName ascending', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?sortBy=fullName&sortOrder=asc')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.borrowers.length > 1) {
        const names = response.body.data.borrowers.map((b: any) => b.fullName);
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      }
    });

    it('should sort by fullName descending', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?sortBy=fullName&sortOrder=desc')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.borrowers.length > 1) {
        const names = response.body.data.borrowers.map((b: any) => b.fullName);
        const sortedNames = [...names].sort().reverse();
        expect(names).toEqual(sortedNames);
      }
    });

    it('should sort by email ascending', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?sortBy=email&sortOrder=asc')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.borrowers.length > 1) {
        const emails = response.body.data.borrowers.map((b: any) => b.email);
        const sortedEmails = [...emails].sort();
        expect(emails).toEqual(sortedEmails);
      }
    });

    it('should sort by createdAt descending (default)', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.sortBy).toBe('createdAt');
      expect(response.body.data.pagination.sortOrder).toBe('desc');
    });

    it('should sort by createdAt ascending', async () => {
      const response = await request(app)
        .get('/api/sales/borrowers?sortBy=createdAt&sortOrder=asc')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.borrowers.length > 1) {
        const dates = response.body.data.borrowers.map((b: any) => new Date(b.createdAt));
        const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
        expect(dates).toEqual(sortedDates);
      }
    });
  });

  describe('GET /api/sales/borrowers/:id - Get Single Borrower', () => {
    it('should return borrower details', async () => {
      const response = await request(app)
        .get(`/api/sales/borrowers/${borrowerIds[2]}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.borrower).toMatchObject({
        _id: borrowerIds[2],
        role: UserRole.Borrower,
      });
    });

    it('should return 404 for non-existent borrower', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .get(`/api/sales/borrowers/${fakeId}`)
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Borrower not found',
        },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get(`/api/sales/borrowers/${borrowerIds[2]}`);

      expect(response.status).toBe(401);
    });

    it('should require Sales or Admin role', async () => {
      const borrower = await User.create({
        fullName: 'Test Borrower',
        email: 'testborrower2@example.com',
        password: 'TestPass123',
        role: UserRole.Borrower,
      });

      const borrowerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testborrower2@example.com',
          password: 'TestPass123',
        });

      const borrowerToken = borrowerLoginResponse.body.data.token;

      const response = await request(app)
        .get(`/api/sales/borrowers/${borrowerIds[2]}`)
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });
});
