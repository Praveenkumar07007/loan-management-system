import mongoose, { Schema, Model, Document } from 'mongoose';

export enum LoanStatus {
  Pending = 'Pending',
  UnderReview = 'UnderReview',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Disbursed = 'Disbursed',
  Active = 'Active',
  Closed = 'Closed',
  Defaulted = 'Defaulted',
}

export enum EmploymentMode {
  Salaried = 'Salaried',
  SelfEmployed = 'SelfEmployed',
  Business = 'Business',
  Other = 'Other',
}

export interface IDocumentMetadata {
  documentType: string;
  fileName: string;
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
}

export interface ILoanApplication extends Document {
  borrowerId: mongoose.Types.ObjectId;
  personalDetails: {
    fullName: string;
    dateOfBirth: Date;
    phoneNumber: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
  employmentMode: EmploymentMode;
  monthlySalary: number;
  documents: IDocumentMetadata[];
  documentId?: mongoose.Types.ObjectId; // Reference to uploaded salary slip document
  requestedPrincipal: number;
  tenureDays: number; // Changed from tenure (months) to tenureDays
  annualInterestRate: number;
  calculatedInterest: number;
  totalRepayment: number;
  amountPaid: number; // Track total amount paid so far
  status: LoanStatus;
  rejectionReason?: string;
  approvalReason?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  disbursedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedAt?: Date;
  disbursedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LoanApplicationSchema = new Schema<ILoanApplication>(
  {
    borrowerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Borrower reference is required'],
      immutable: true,
    },
    personalDetails: {
      fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [2, 'Full name must be at least 2 characters'],
        maxlength: [100, 'Full name cannot exceed 100 characters'],
      },
      dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required'],
        validate: {
          validator: (value: Date) => {
            const minAge = 18;
            const maxAge = 70;
            const age = new Date().getFullYear() - value.getFullYear();
            return age >= minAge && age <= maxAge;
          },
          message: 'Borrower must be between 18 and 70 years old',
        },
      },
      phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'],
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
        minlength: [10, 'Address must be at least 10 characters'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required'],
        trim: true,
      },
      pinCode: {
        type: String,
        required: [true, 'Pin code is required'],
        match: [/^[0-9]{6}$/, 'Pin code must be 6 digits'],
      },
    },
    employmentMode: {
      type: String,
      enum: {
        values: Object.values(EmploymentMode),
        message: '{VALUE} is not a valid employment mode',
      },
      required: [true, 'Employment mode is required'],
    },
    monthlySalary: {
      type: Number,
      required: [true, 'Monthly salary is required'],
      min: [0, 'Monthly salary cannot be negative'],
    },
    documents: [
      {
        documentType: {
          type: String,
          required: true,
          trim: true,
        },
        fileName: {
          type: String,
          required: true,
          trim: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        fileSize: {
          type: Number,
          required: true,
          min: [0, 'File size cannot be negative'],
        },
        mimeType: {
          type: String,
          required: true,
          trim: true,
        },
      },
    ],
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
    },
    requestedPrincipal: {
      type: Number,
      required: [true, 'Requested principal is required'],
      min: [50000, 'Requested principal must be at least 50,000'],
      max: [500000, 'Requested principal cannot exceed 500,000'],
    },
    tenureDays: {
      type: Number,
      required: [true, 'Tenure days is required'],
      min: [30, 'Tenure must be at least 30 days'],
      max: [365, 'Tenure cannot exceed 365 days'],
    },
    annualInterestRate: {
      type: Number,
      required: [true, 'Annual interest rate is required'],
      min: [0, 'Annual interest rate cannot be negative'],
      max: [30, 'Annual interest rate cannot exceed 30%'],
    },
    calculatedInterest: {
      type: Number,
      required: true,
      min: [0, 'Calculated interest cannot be negative'],
      immutable: true,
    },
    totalRepayment: {
      type: Number,
      required: true,
      min: [0, 'Total repayment cannot be negative'],
      immutable: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Amount paid cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: Object.values(LoanStatus),
        message: '{VALUE} is not a valid loan status',
      },
      required: [true, 'Status is required'],
      default: LoanStatus.Pending,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      validate: {
        validator: function (value: string) {
          return this.status === LoanStatus.Rejected ? !!value : true;
        },
        message: 'Rejection reason is required when status is Rejected',
      },
    },
    approvalReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Approval reason cannot exceed 500 characters'],
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      immutable: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      immutable: true,
    },
    disbursedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      immutable: true,
    },
    reviewedAt: {
      type: Date,
      immutable: true,
    },
    approvedAt: {
      type: Date,
      immutable: true,
    },
    disbursedAt: {
      type: Date,
      immutable: true,
    },
    closedAt: {
      type: Date,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);


const LoanApplication: Model<ILoanApplication> =
  mongoose.models.LoanApplication ||
  mongoose.model<ILoanApplication>('LoanApplication', LoanApplicationSchema);

export default LoanApplication;
