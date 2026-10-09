import mongoose from 'mongoose';
import LoanApplication, { LoanStatus, EmploymentMode } from '../models/LoanApplication';
import User, { UserRole } from '../models/User';

describe('LoanApplication Model', () => {
  let borrowerId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await LoanApplication.deleteMany({});
    await User.deleteMany({});

    const borrower = await User.create({
      fullName: 'Test Borrower',
      email: 'borrower@test.com',
      password: 'TestPass123',
      role: UserRole.Borrower,
    });
    borrowerId = borrower._id;
  });

  describe('Schema Validation', () => {
    const validApplicationData = {
      borrowerId,
      personalDetails: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        pinCode: '10001',
      },
      employmentMode: EmploymentMode.Salaried,
      monthlySalary: 50000,
      documents: [
        {
          documentType: 'AadharCard',
          fileName: 'aadhar.pdf',
          uploadedAt: new Date(),
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      ],
      requestedPrincipal: 100000,
      tenure: 24,
      annualInterestRate: 12,
    };

    it('should create a valid loan application', async () => {
      const application = await LoanApplication.create(validApplicationData);

      expect(application).toBeDefined();
      expect(application.borrowerId).toEqual(borrowerId);
      expect(application.status).toBe(LoanStatus.Pending);
      expect(application.calculatedInterest).toBeGreaterThan(0);
      expect(application.totalRepayment).toBeGreaterThan(application.requestedPrincipal);
    });

    it('should fail validation for missing borrowerId', async () => {
      const data = { ...validApplicationData, borrowerId: undefined };
      await expect(LoanApplication.create(data)).rejects.toThrow('Borrower reference is required');
    });

    it('should fail validation for missing personal details', async () => {
      const data = { ...validApplicationData, personalDetails: undefined };
      await expect(LoanApplication.create(data)).rejects.toThrow();
    });

    it('should fail validation for short full name', async () => {
      const data = {
        ...validApplicationData,
        personalDetails: { ...validApplicationData.personalDetails, fullName: 'J' },
      };
      await expect(LoanApplication.create(data)).rejects.toThrow('at least 2 characters');
    });

    it('should fail validation for borrower under 18', async () => {
      const data = {
        ...validApplicationData,
        personalDetails: { ...validApplicationData.personalDetails, dateOfBirth: new Date('2010-01-01') },
      };
      await expect(LoanApplication.create(data)).rejects.toThrow('between 18 and 70 years old');
    });

    it('should fail validation for borrower over 70', async () => {
      const data = {
        ...validApplicationData,
        personalDetails: { ...validApplicationData.personalDetails, dateOfBirth: new Date('1940-01-01') },
      };
      await expect(LoanApplication.create(data)).rejects.toThrow('between 18 and 70 years old');
    });

    it('should fail validation for invalid phone number', async () => {
      const data = {
        ...validApplicationData,
        personalDetails: { ...validApplicationData.personalDetails, phoneNumber: '123' },
      };
      await expect(LoanApplication.create(data)).rejects.toThrow('10 digits');
    });

    it('should fail validation for invalid pin code', async () => {
      const data = {
        ...validApplicationData,
        personalDetails: { ...validApplicationData.personalDetails, pinCode: '123' },
      };
      await expect(LoanApplication.create(data)).rejects.toThrow('6 digits');
    });

    it('should fail validation for missing employment mode', async () => {
      const data = { ...validApplicationData, employmentMode: undefined };
      await expect(LoanApplication.create(data)).rejects.toThrow('Employment mode is required');
    });

    it('should fail validation for invalid employment mode', async () => {
      const data = { ...validApplicationData, employmentMode: 'InvalidMode' as any };
      await expect(LoanApplication.create(data)).rejects.toThrow('not a valid employment mode');
    });

    it('should fail validation for negative monthly salary', async () => {
      const data = { ...validApplicationData, monthlySalary: -1000 };
      await expect(LoanApplication.create(data)).rejects.toThrow('cannot be negative');
    });

    it('should fail validation for requested principal below minimum', async () => {
      const data = { ...validApplicationData, requestedPrincipal: 500 };
      await expect(LoanApplication.create(data)).rejects.toThrow('at least 1000');
    });

    it('should fail validation for requested principal above maximum', async () => {
      const data = { ...validApplicationData, requestedPrincipal: 20000000 };
      await expect(LoanApplication.create(data)).rejects.toThrow('cannot exceed 10,000,000');
    });

    it('should fail validation for tenure below minimum', async () => {
      const data = { ...validApplicationData, tenure: 0 };
      await expect(LoanApplication.create(data)).rejects.toThrow('at least 1 month');
    });

    it('should fail validation for tenure above maximum', async () => {
      const data = { ...validApplicationData, tenure: 400 };
      await expect(LoanApplication.create(data)).rejects.toThrow('cannot exceed 360 months');
    });

    it('should fail validation for negative interest rate', async () => {
      const data = { ...validApplicationData, annualInterestRate: -5 };
      await expect(LoanApplication.create(data)).rejects.toThrow('cannot be negative');
    });

    it('should fail validation for interest rate above maximum', async () => {
      const data = { ...validApplicationData, annualInterestRate: 35 };
      await expect(LoanApplication.create(data)).rejects.toThrow('cannot exceed 30%');
    });

    it('should fail validation for invalid status', async () => {
      const data = { ...validApplicationData, status: 'InvalidStatus' as any };
      await expect(LoanApplication.create(data)).rejects.toThrow('not a valid loan status');
    });

    it('should require rejection reason when status is Rejected', async () => {
      const application = await LoanApplication.create(validApplicationData);
      application.status = LoanStatus.Rejected;
      await expect(application.save()).rejects.toThrow('Rejection reason is required');
    });

    it('should allow rejection reason when status is Rejected', async () => {
      const application = await LoanApplication.create(validApplicationData);
      application.status = LoanStatus.Rejected;
      application.rejectionReason = 'Insufficient income';
      await application.save();
      expect(application.rejectionReason).toBe('Insufficient income');
    });

    it('should not require rejection reason when status is not Rejected', async () => {
      const application = await LoanApplication.create(validApplicationData);
      application.status = LoanStatus.Approved;
      await application.save();
      expect(application.status).toBe(LoanStatus.Approved);
    });
  });

  describe('Calculated Fields', () => {
    const validApplicationData = {
      borrowerId,
      personalDetails: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        pinCode: '10001',
      },
      employmentMode: EmploymentMode.Salaried,
      monthlySalary: 50000,
      documents: [],
      requestedPrincipal: 100000,
      tenure: 24,
      annualInterestRate: 12,
    };

    it('should calculate interest correctly on creation', async () => {
      const application = await LoanApplication.create(validApplicationData);

      const principal = 100000;
      const annualRate = 0.12;
      const tenureInYears = 2;
      const expectedInterest = principal * annualRate * tenureInYears;

      expect(application.calculatedInterest).toBe(expectedInterest);
    });

    it('should calculate total repayment correctly on creation', async () => {
      const application = await LoanApplication.create(validApplicationData);

      const expectedTotal = application.requestedPrincipal + application.calculatedInterest;

      expect(application.totalRepayment).toBe(expectedTotal);
    });

    it('should not recalculate on update', async () => {
      const application = await LoanApplication.create(validApplicationData);
      const originalInterest = application.calculatedInterest;
      const originalTotal = application.totalRepayment;

      application.personalDetails.fullName = 'Updated Name';
      await application.save();

      expect(application.calculatedInterest).toBe(originalInterest);
      expect(application.totalRepayment).toBe(originalTotal);
    });

    it('should protect calculatedInterest from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      application.calculatedInterest = 999999;

      const saved = await application.save();
      expect(saved.calculatedInterest).not.toBe(999999);
    });

    it('should protect totalRepayment from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      application.totalRepayment = 999999;

      const saved = await application.save();
      expect(saved.totalRepayment).not.toBe(999999);
    });
  });

  describe('Field Protections', () => {
    const validApplicationData = {
      borrowerId,
      personalDetails: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        pinCode: '10001',
      },
      employmentMode: EmploymentMode.Salaried,
      monthlySalary: 50000,
      documents: [],
      requestedPrincipal: 100000,
      tenure: 24,
      annualInterestRate: 12,
    };

    it('should protect borrowerId from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      const newBorrowerId = new mongoose.Types.ObjectId();
      application.borrowerId = newBorrowerId;

      const saved = await application.save();
      expect(saved.borrowerId).not.toBe(newBorrowerId);
    });

    it('should protect reviewedBy from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      const reviewerId = new mongoose.Types.ObjectId();
      application.reviewedBy = reviewerId;

      const saved = await application.save();
      expect(saved.reviewedBy).not.toBe(reviewerId);
    });

    it('should protect approvedBy from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      const approverId = new mongoose.Types.ObjectId();
      application.approvedBy = approverId;

      const saved = await application.save();
      expect(saved.approvedBy).not.toBe(approverId);
    });

    it('should protect disbursedBy from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      const disburserId = new mongoose.Types.ObjectId();
      application.disbursedBy = disburserId;

      const saved = await application.save();
      expect(saved.disbursedBy).not.toBe(disburserId);
    });

    it('should protect timestamp fields from modification', async () => {
      const application = await LoanApplication.create(validApplicationData);
      const futureDate = new Date('2030-01-01');
      application.reviewedAt = futureDate;
      application.approvedAt = futureDate;
      application.disbursedAt = futureDate;
      application.closedAt = futureDate;

      const saved = await application.save();
      expect(saved.reviewedAt).not.toBe(futureDate);
      expect(saved.approvedAt).not.toBe(futureDate);
      expect(saved.disbursedAt).not.toBe(futureDate);
      expect(saved.closedAt).not.toBe(futureDate);
    });
  });

  describe('Document Metadata', () => {
    const validApplicationData = {
      borrowerId,
      personalDetails: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        pinCode: '10001',
      },
      employmentMode: EmploymentMode.Salaried,
      monthlySalary: 50000,
      documents: [
        {
          documentType: 'AadharCard',
          fileName: 'aadhar.pdf',
          uploadedAt: new Date(),
          fileSize: 1024,
          mimeType: 'application/pdf',
        },
      ],
      requestedPrincipal: 100000,
      tenure: 24,
      annualInterestRate: 12,
    };

    it('should accept valid document metadata', async () => {
      const application = await LoanApplication.create(validApplicationData);
      expect(application.documents).toHaveLength(1);
      expect(application.documents[0].documentType).toBe('AadharCard');
    });

    it('should accept multiple documents', async () => {
      const data = {
        ...validApplicationData,
        documents: [
          {
            documentType: 'AadharCard',
            fileName: 'aadhar.pdf',
            uploadedAt: new Date(),
            fileSize: 1024,
            mimeType: 'application/pdf',
          },
          {
            documentType: 'PANCard',
            fileName: 'pan.pdf',
            uploadedAt: new Date(),
            fileSize: 2048,
            mimeType: 'application/pdf',
          },
        ],
      };
      const application = await LoanApplication.create(data);
      expect(application.documents).toHaveLength(2);
    });

    it('should accept empty documents array', async () => {
      const data = { ...validApplicationData, documents: [] };
      const application = await LoanApplication.create(data);
      expect(application.documents).toHaveLength(0);
    });

    it('should fail validation for negative file size', async () => {
      const data = {
        ...validApplicationData,
        documents: [
          {
            documentType: 'AadharCard',
            fileName: 'aadhar.pdf',
            uploadedAt: new Date(),
            fileSize: -100,
            mimeType: 'application/pdf',
          },
        ],
      };
      await expect(LoanApplication.create(data)).rejects.toThrow('cannot be negative');
    });
  });

  describe('Lifecycle States', () => {
    const validApplicationData = {
      borrowerId,
      personalDetails: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        pinCode: '10001',
      },
      employmentMode: EmploymentMode.Salaried,
      monthlySalary: 50000,
      documents: [],
      requestedPrincipal: 100000,
      tenure: 24,
      annualInterestRate: 12,
    };

    it('should default to Pending status', async () => {
      const application = await LoanApplication.create(validApplicationData);
      expect(application.status).toBe(LoanStatus.Pending);
    });

    it('should accept all valid lifecycle states', async () => {
      const validStates = Object.values(LoanStatus);

      for (const status of validStates) {
        const application = await LoanApplication.create({ ...validApplicationData, status });
        expect(application.status).toBe(status);
        await LoanApplication.deleteMany({});
      }
    });
  });

  describe('Indexes', () => {
    const validApplicationData = {
      borrowerId,
      personalDetails: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '1234567890',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        pinCode: '10001',
      },
      employmentMode: EmploymentMode.Salaried,
      monthlySalary: 50000,
      documents: [],
      requestedPrincipal: 100000,
      tenure: 24,
      annualInterestRate: 12,
    };

    it('should have index on borrowerId', async () => {
      const indexes = await LoanApplication.collection.getIndexes();
      expect(indexes).toHaveProperty('borrowerId_1');
    });

    it('should have index on status', async () => {
      const indexes = await LoanApplication.collection.getIndexes();
      expect(indexes).toHaveProperty('status_1');
    });

    it('should have index on createdAt', async () => {
      const indexes = await LoanApplication.collection.getIndexes();
      expect(indexes).toHaveProperty('createdAt_-1');
    });
  });
});
