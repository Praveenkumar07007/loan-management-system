import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import Document, { DocumentType } from '../models/Document';
import LoanApplication, { LoanStatus } from '../models/LoanApplication';
import { EmploymentMode } from '../models/LoanApplication';

describe('Loan Application API Integration Tests', () => {
  let borrowerToken: string;
  let borrowerId: string;
  let documentId: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Document.deleteMany({});
    await LoanApplication.deleteMany({});

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

    // Upload a salary slip document
    const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');
    const docResponse = await request(app)
      .post('/api/documents/salary-slip')
      .set('Authorization', `Bearer ${borrowerToken}`)
      .attach('file', pdfBuffer, 'salary-slip.pdf');

    documentId = docResponse.body.data.documentId;
  });

  describe('POST /api/loan-applications - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    });

    it('should reject request from non-borrower role', async () => {
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
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });
  });

  describe('POST /api/loan-applications - Validation', () => {
    it('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
        },
      });
    });

    it('should reject invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '123', // Invalid
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'personalDetails.phoneNumber',
        })
      );
    });

    it('should reject invalid pin code format', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '12345', // Invalid
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({
          field: 'personalDetails.pinCode',
        })
      );
    });
  });

  describe('POST /api/loan-applications - Eligibility Revalidation', () => {
    it('should reject ineligible borrower (below minimum age)', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '2010-01-01', // 14 years old
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Borrower is not eligible for loan',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'age',
            }),
          ]),
        },
      });
    });

    it('should reject ineligible borrower (below minimum salary)', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 20000, // Below minimum 25000
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Borrower is not eligible for loan',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'monthlySalary',
            }),
          ]),
        },
      });
    });

    it('should reject ineligible borrower (invalid employment mode)', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Other, // Invalid
          monthlySalary: 50000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Borrower is not eligible for loan',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'employmentMode',
            }),
          ]),
        },
      });
    });
  });

  describe('POST /api/loan-applications - Document Ownership Verification', () => {
    it('should reject document that does not belong to borrower', async () => {
      // Create another borrower
      const otherBorrower = await User.create({
        fullName: 'Other Borrower',
        email: 'other@example.com',
        password: 'OtherPass123',
        role: UserRole.Borrower,
      });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'other@example.com',
          password: 'OtherPass123',
        });

      const otherToken = otherLoginResponse.body.data.token;

      // Upload document for other borrower
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');
      const docResponse = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('file', pdfBuffer, 'other-salary-slip.pdf');

      const otherDocumentId = docResponse.body.data.documentId;

      // Try to submit application with other borrower's document
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId: otherDocumentId,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Document does not belong to the authenticated borrower',
        },
      });
    });

    it('should reject non-existent document', async () => {
      const fakeDocumentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId: fakeDocumentId,
        });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Document not found',
        },
      });
    });
  });

  describe('POST /api/loan-applications - Server-Side Calculation', () => {
    it('should ignore client-supplied interest and calculate on server', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 365,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.calculatedInterest).toBe(12000); // Server-calculated
      expect(response.body.data.totalRepayment).toBe(112000); // Server-calculated
    });

    it('should validate loan parameters on server (principal below minimum)', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 40000, // Below minimum 50000
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Loan calculation input validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'principal',
            }),
          ]),
        },
      });
    });

    it('should validate loan parameters on server (tenure below minimum)', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 20, // Below minimum 30
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Loan calculation input validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'tenureDays',
            }),
          ]),
        },
      });
    });
  });

  describe('POST /api/loan-applications - Duplicate Submission Prevention', () => {
    it('should prevent duplicate submission when pending application exists', async () => {
      // Submit first application
      await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      // Try to submit second application
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 150000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('already have a pending loan application'),
        },
      });
    });

    it('should allow submission after previous application is approved', async () => {
      // Submit first application
      const firstResponse = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      const applicationId = firstResponse.body.data.applicationId;

      // Approve the application
      await LoanApplication.findByIdAndUpdate(applicationId, {
        status: LoanStatus.Approved,
      });

      // Try to submit second application
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 150000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/loan-applications - Successful Submission', () => {
    it('should successfully submit a valid loan application', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          applicationId: expect.any(String),
          borrowerId: borrowerId,
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          calculatedInterest: expect.any(Number),
          totalRepayment: expect.any(Number),
          status: LoanStatus.Pending,
          submittedAt: expect.any(String),
        },
      });
    });

    it('should create application with server-calculated financial values', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 365,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      const applicationId = response.body.data.applicationId;
      const application = await LoanApplication.findById(applicationId);

      expect(application).not.toBeNull();
      expect(application?.calculatedInterest).toBe(12000);
      expect(application?.totalRepayment).toBe(112000);
    });

    it('should store application in MongoDB with pending status', async () => {
      const response = await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      const applicationId = response.body.data.applicationId;
      const application = await LoanApplication.findById(applicationId);

      expect(application).not.toBeNull();
      expect(application?.status).toBe(LoanStatus.Pending);
      expect(application?.borrowerId.toString()).toBe(borrowerId);
    });
  });

  describe('GET /api/loan-applications - List Applications', () => {
    it('should return list of applications for authenticated borrower', async () => {
      // Submit an application
      await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      const response = await request(app)
        .get('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.applications).toHaveLength(1);
    });

    it('should not expose sensitive financial details in list', async () => {
      await request(app)
        .post('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .send({
          requestedPrincipal: 100000,
          tenureDays: 180,
          annualInterestRate: 12,
          personalDetails: {
            fullName: 'John Doe',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            address: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
          },
          employmentMode: EmploymentMode.Salaried,
          monthlySalary: 50000,
          documentId,
        });

      const response = await request(app)
        .get('/api/loan-applications')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.body.data.applications[0]).not.toHaveProperty('calculatedInterest');
      expect(response.body.data.applications[0]).not.toHaveProperty('totalRepayment');
    });
  });
});
