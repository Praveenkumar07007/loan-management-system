import mongoose, { Schema, Model, Document } from 'mongoose';

export enum DocumentType {
  SalarySlip = 'SalarySlip',
  IdProof = 'IdProof',
  AddressProof = 'AddressProof',
  BankStatement = 'BankStatement',
  Other = 'Other',
}

export enum DocumentStatus {
  Pending = 'Pending',
  Verified = 'Verified',
  Rejected = 'Rejected',
}

export interface IDocument extends Document {
  borrowerId: mongoose.Types.ObjectId;
  documentType: DocumentType;
  originalFileName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  status: DocumentStatus;
  uploadedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  metadata?: {
    [key: string]: any;
  };
}

const DocumentSchema = new Schema<IDocument>(
  {
    borrowerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Borrower reference is required'],
      immutable: true,
    },
    documentType: {
      type: String,
      enum: {
        values: Object.values(DocumentType),
        message: '{VALUE} is not a valid document type',
      },
      required: [true, 'Document type is required'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'Original file name cannot exceed 255 characters'],
    },
    storedFileName: {
      type: String,
      required: [true, 'Stored file name is required'],
      trim: true,
      unique: true,
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size cannot be negative'],
    },
    fileHash: {
      type: String,
      required: [true, 'File hash is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(DocumentStatus),
        message: '{VALUE} is not a valid document status',
      },
      required: [true, 'Status is required'],
      default: DocumentStatus.Pending,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    verifiedAt: {
      type: Date,
      immutable: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      immutable: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
      validate: {
        validator: function (value: string) {
          return this.status === DocumentStatus.Rejected ? !!value : true;
        },
        message: 'Rejection reason is required when status is Rejected',
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ fileHash: 1 });

const DocumentModel: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);

export { DocumentModel as Document };
export default DocumentModel;
