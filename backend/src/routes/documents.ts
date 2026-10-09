import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../models/User';
import Document, { DocumentType } from '../models/Document';
import { successResponse } from '../utils/apiResponse';
import { config } from '../config/env';
import {
  validateFile,
  generateSafeFileName,
  DEFAULT_FILE_VALIDATION,
} from '../utils/fileValidation';
import { AppError } from '../errors/AppError';

const router = Router();

// Configure multer to store files in memory for validation
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: DEFAULT_FILE_VALIDATION.maxSizeBytes,
  },
  fileFilter: (req, file, cb) => {
    // Basic check - detailed validation happens in the handler
    const allowedExtensions = DEFAULT_FILE_VALIDATION.allowedExtensions!;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

// Multer error handler middleware
const handleMulterError = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          message: `File size exceeds maximum allowed size of ${DEFAULT_FILE_VALIDATION.maxSizeBytes! / (1024 * 1024)} MB`,
        },
        timestamp: new Date().toISOString(),
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Unexpected file field',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (err.message.includes('Invalid file extension')) {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
      },
      timestamp: new Date().toISOString(),
    });
  }

  next(err);
};

/**
 * Ensure upload directory exists
 */
const ensureUploadDir = async () => {
  const salarySlipDir = path.join(config.uploadDir, 'salary-slips');
  try {
    await fs.access(salarySlipDir);
  } catch {
    await fs.mkdir(salarySlipDir, { recursive: true });
  }
  return salarySlipDir;
};

/**
 * POST /api/documents/salary-slip
 * Upload a salary slip document
 */
router.post(
  '/salary-slip',
  authenticate,
  authorize(UserRole.Borrower),
  upload.single('file'),
  handleMulterError,
  async (req: Request, res: Response, next: NextFunction) => {
    let storedFilePath: string | null = null;

    try {
      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      // Validate file comprehensively (type, size, content)
      const fileMetadata = validateFile(req.file, DEFAULT_FILE_VALIDATION);

      // Ensure upload directory exists
      const uploadDir = await ensureUploadDir();

      // Generate safe server-side filename
      const storedFileName = generateSafeFileName(fileMetadata.originalName);
      storedFilePath = path.join(uploadDir, storedFileName);

      // Write file to disk (outside public web root)
      await fs.writeFile(storedFilePath, req.file.buffer);

      // Create document metadata in MongoDB
      const document = await Document.create({
        borrowerId: req.userId,
        documentType: DocumentType.SalarySlip,
        originalFileName: fileMetadata.originalName,
        storedFileName,
        storagePath: uploadDir,
        mimeType: fileMetadata.mimeType,
        fileSize: fileMetadata.size,
        fileHash: fileMetadata.hash,
        status: 'Pending' as any,
      });

      // Return only metadata, not file path or URL
      res.json(successResponse({
        documentId: document._id,
        documentType: document.documentType,
        originalFileName: document.originalFileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt,
        status: document.status,
      }));

    } catch (error) {
      // Cleanup: Delete file if database persistence failed
      if (storedFilePath) {
        try {
          await fs.unlink(storedFilePath);
        } catch (cleanupError) {
          console.error('Failed to cleanup file after error:', cleanupError);
        }
      }
      next(error);
    }
  }
);

/**
 * GET /api/documents
 * Get list of documents for the authenticated borrower
 */
router.get(
  '/',
  authenticate,
  authorize(UserRole.Borrower),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documents = await Document.find({ borrowerId: req.userId })
        .select('-storagePath -storedFileName -fileHash')
        .sort({ uploadedAt: -1 });

      res.json(successResponse({ documents }));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
