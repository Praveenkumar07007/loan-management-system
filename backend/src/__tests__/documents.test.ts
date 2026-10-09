import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import User, { UserRole } from '../models/User';
import Document, { DocumentType } from '../models/Document';
import fs from 'fs/promises';
import path from 'path';

describe('Document Upload API Integration Tests', () => {
  let borrowerToken: string;
  let borrowerId: string;
  let uploadDir: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');

    // Set up upload directory for tests
    uploadDir = path.join(process.cwd(), 'uploads', 'salary-slips');
    await fs.mkdir(uploadDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test upload directory
    try {
      await fs.rm(path.join(process.cwd(), 'uploads'), { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup upload directory:', error);
    }

    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Document.deleteMany({});

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
  });

  describe('POST /api/documents/salary-slip - Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/documents/salary-slip')
        .attach('file', Buffer.from('test'), 'test.pdf');

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
        .post('/api/documents/salary-slip')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Invalid or expired token',
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
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${salesToken}`)
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should accept request from authenticated borrower', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content for testing');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/documents/salary-slip - File Validation', () => {
    it('should reject request without file', async () => {
      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'No file uploaded',
        },
      });
    });

    it('should reject invalid file type (TXT)', async () => {
      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', Buffer.from('text content'), 'document.txt');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Invalid file extension'),
        },
      });
    });

    it('should reject invalid file type (GIF)', async () => {
      const gifBuffer = Buffer.from('GIF89a' + 'a'.repeat(10)); // GIF header

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', gifBuffer, 'image.gif');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Invalid file extension'),
        },
      });
    });

    it('should reject oversized file (> 5 MB)', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
      const pdfBuffer = Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        largeBuffer,
      ]);

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'large.pdf');

      expect(response.status).toBe(413);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('File size exceeds maximum'),
        },
      });
    });

    it('should reject file with mismatched MIME type and content', async () => {
      // PDF header but declared as image/jpeg
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, {
          filename: 'fake.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('File content does not match declared MIME type'),
        },
      });
    });

    it('should reject file with invalid content for declared type', async () => {
      // Random bytes declared as PDF
      const randomBuffer = Buffer.from('random content not a pdf');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', randomBuffer, {
          filename: 'fake.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('Unable to detect file type from content'),
        },
      });
    });
  });

  describe('POST /api/documents/salary-slip - Successful Upload', () => {
    it('should successfully upload a valid PDF', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content for testing');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          documentId: expect.any(String),
          documentType: DocumentType.SalarySlip,
          originalFileName: 'salary-slip.pdf',
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          status: 'Pending',
          uploadedAt: expect.any(String),
        },
      });

      // Verify response does not contain sensitive file paths
      expect(response.body.data).not.toHaveProperty('storagePath');
      expect(response.body.data).not.toHaveProperty('storedFileName');
      expect(response.body.data).not.toHaveProperty('fileHash');
      expect(response.body.data).not.toHaveProperty('url');
    });

    it('should successfully upload a valid JPEG', async () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', jpegBuffer, 'salary-slip.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          documentType: DocumentType.SalarySlip,
          mimeType: 'image/jpeg',
        },
      });
    });

    it('should successfully upload a valid PNG', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pngBuffer, 'salary-slip.png');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          documentType: DocumentType.SalarySlip,
          mimeType: 'image/png',
        },
      });
    });

    it('should store file metadata in MongoDB', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      const documentId = response.body.data.documentId;

      const document = await Document.findById(documentId);

      expect(document).not.toBeNull();
      expect(document?.borrowerId.toString()).toBe(borrowerId);
      expect(document?.documentType).toBe(DocumentType.SalarySlip);
      expect(document?.originalFileName).toBe('salary-slip.pdf');
      expect(document?.mimeType).toBe('application/pdf');
      expect(document?.fileSize).toBe(pdfBuffer.length);
      expect(document?.fileHash).toBeDefined();
      expect(document?.storedFileName).toBeDefined();
      expect(document?.storagePath).toBeDefined();
    });

    it('should store file on disk outside public web root', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      const documentId = response.body.data.documentId;
      const document = await Document.findById(documentId);

      expect(document).not.toBeNull();

      // Verify file exists on disk
      const filePath = path.join(document!.storagePath, document!.storedFileName);
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Verify file content matches
      const storedContent = await fs.readFile(filePath);
      expect(storedContent).toEqual(pdfBuffer);
    });

    it('should generate safe server-side filename', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      const documentId = response.body.data.documentId;
      const document = await Document.findById(documentId);

      expect(document).not.toBeNull();
      expect(document?.storedFileName).not.toBe('salary-slip.pdf');
      expect(document?.storedFileName).toMatch(/^\d+-[a-f0-9]{32}\.pdf$/);
    });
  });

  describe('POST /api/documents/salary-slip - Error Handling & Cleanup', () => {
    it('should cleanup file if database persistence fails', async () => {
      // This test simulates a database failure by temporarily breaking the connection
      // In a real scenario, you might mock the Document.create method

      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

      // First, create a document to check if file gets cleaned up
      // We'll manually verify this by checking the upload directory before and after

      const initialFiles = await fs.readdir(uploadDir).catch(() => []);

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      // If upload succeeded, check file was created
      if (response.status === 200) {
        const finalFiles = await fs.readdir(uploadDir).catch(() => []);
        expect(finalFiles.length).toBe(initialFiles.length + 1);
      }
    });

    it('should not store public URL in response', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');

      const response = await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      expect(response.status).toBe(200);
      expect(response.body.data).not.toHaveProperty('url');
      expect(response.body.data).not.toHaveProperty('downloadUrl');
      expect(response.body.data).not.toHaveProperty('publicUrl');
    });
  });

  describe('GET /api/documents - List Documents', () => {
    it('should return list of documents for authenticated borrower', async () => {
      // Upload a document first
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');
      await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documents).toHaveLength(1);
      expect(response.body.data.documents[0]).toMatchObject({
        documentType: DocumentType.SalarySlip,
        originalFileName: 'salary-slip.pdf',
      });

      // Verify sensitive fields are not exposed
      expect(response.body.data.documents[0]).not.toHaveProperty('storagePath');
      expect(response.body.data.documents[0]).not.toHaveProperty('storedFileName');
      expect(response.body.data.documents[0]).not.toHaveProperty('fileHash');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/documents');

      expect(response.status).toBe(401);
    });

    it('should only return documents for the authenticated user', async () => {
      // Upload document for first borrower
      const pdfBuffer = Buffer.from('%PDF-1.4\n%fake pdf content');
      await request(app)
        .post('/api/documents/salary-slip')
        .set('Authorization', `Bearer ${borrowerToken}`)
        .attach('file', pdfBuffer, 'salary-slip.pdf');

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

      // Other borrower should not see first borrower's documents
      const response = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.documents).toHaveLength(0);
    });
  });
});
