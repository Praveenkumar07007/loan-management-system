import { FileValidationError, FileSizeError, FileTypeError } from '../errors/AppError';
import crypto from 'crypto';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
}

export const DEFAULT_FILE_VALIDATION: FileValidationOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5 MB
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
};

// Magic numbers for file type validation
const FILE_SIGNATURES: { [key: string]: { signature: Buffer; offset: number } } = {
  'application/pdf': { signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0 },
  'image/jpeg': { signature: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0 },
  'image/png': { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), offset: 0 },
};

/**
 * Validate file extension
 */
export const validateFileExtension = (fileName: string, allowedExtensions: string[]): boolean => {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return allowedExtensions.includes(ext);
};

/**
 * Validate MIME type
 */
export const validateMimeType = (mimeType: string, allowedMimeTypes: string[]): boolean => {
  return allowedMimeTypes.includes(mimeType);
};

/**
 * Validate file size
 */
export const validateFileSize = (size: number, maxSizeBytes: number): boolean => {
  return size <= maxSizeBytes;
};

/**
 * Validate actual file content using magic numbers
 */
export const validateFileContent = (buffer: Buffer, expectedMimeType: string): boolean => {
  const signature = FILE_SIGNATURES[expectedMimeType];
  if (!signature) {
    return false;
  }

  if (buffer.length < signature.offset + signature.signature.length) {
    return false;
  }

  const fileSignature = buffer.subarray(signature.offset, signature.offset + signature.signature.length);
  return fileSignature.equals(signature.signature);
};

/**
 * Detect MIME type from file content
 */
export const detectMimeTypeFromContent = (buffer: Buffer): string | null => {
  for (const [mimeType, signature] of Object.entries(FILE_SIGNATURES)) {
    if (buffer.length >= signature.offset + signature.signature.length) {
      const fileSignature = buffer.subarray(signature.offset, signature.offset + signature.signature.length);
      if (fileSignature.equals(signature.signature)) {
        return mimeType;
      }
    }
  }
  return null;
};

/**
 * Generate a safe, unique filename
 */
export const generateSafeFileName = (originalName: string): string => {
  const ext = originalName.substring(originalName.lastIndexOf('.'));
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  return `${timestamp}-${randomString}${ext}`;
};

/**
 * Generate SHA-256 hash of file content
 */
export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Comprehensive file validation
 */
export const validateFile = (
  file: Express.Multer.File,
  options: FileValidationOptions = DEFAULT_FILE_VALIDATION
): FileMetadata => {
  const {
    maxSizeBytes = DEFAULT_FILE_VALIDATION.maxSizeBytes!,
    allowedMimeTypes = DEFAULT_FILE_VALIDATION.allowedMimeTypes!,
    allowedExtensions = DEFAULT_FILE_VALIDATION.allowedExtensions!,
  } = options;

  // Validate file size
  if (!validateFileSize(file.size, maxSizeBytes)) {
    throw new FileSizeError(
      `File size exceeds maximum allowed size of ${maxSizeBytes / (1024 * 1024)} MB`
    );
  }

  // Validate file extension
  if (!validateFileExtension(file.originalname, allowedExtensions)) {
    throw new FileTypeError(
      `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
    );
  }

  // Validate MIME type
  if (!validateMimeType(file.mimetype, allowedMimeTypes)) {
    throw new FileTypeError(
      `Invalid MIME type. Allowed types: ${allowedMimeTypes.join(', ')}`
    );
  }

  // Validate actual file content
  const detectedMimeType = detectMimeTypeFromContent(file.buffer);
  if (!detectedMimeType) {
    throw new FileValidationError('Unable to detect file type from content');
  }

  if (detectedMimeType !== file.mimetype) {
    throw new FileValidationError(
      `File content does not match declared MIME type. Declared: ${file.mimetype}, Detected: ${detectedMimeType}`
    );
  }

  if (!allowedMimeTypes.includes(detectedMimeType)) {
    throw new FileTypeError(
      `File content type not allowed. Detected: ${detectedMimeType}`
    );
  }

  // Generate file hash
  const hash = generateFileHash(file.buffer);

  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    hash,
  };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
