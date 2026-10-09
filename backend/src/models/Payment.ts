import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IPayment extends Document {
  applicationId: mongoose.Types.ObjectId;
  utr: string;
  amount: number;
  paymentDate: Date;
  recordedBy: mongoose.Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'LoanApplication',
      required: [true, 'Loan application reference is required'],
      immutable: true,
    },
    utr: {
      type: String,
      required: [true, 'UTR is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9]{12,50}$/, 'UTR must be 12-50 alphanumeric characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be at least 0.01'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      validate: {
        validator: (value: Date) => {
          // Payment date cannot be in the future
          return value <= new Date();
        },
        message: 'Payment date cannot be in the future',
      },
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recorder reference is required'],
      immutable: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying payments by application
PaymentSchema.index({ applicationId: 1 });

// Compound index for UTR uniqueness is already handled by unique: true
PaymentSchema.index({ utr: 1 }, { unique: true });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;
