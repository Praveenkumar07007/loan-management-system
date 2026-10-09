import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../app';
import User, { UserRole } from '../models/User';
import { config } from '../config/env';

describe('Authorization Tests', () => {
  let adminToken: string;
  let salesToken: string;
  let sanctionToken: string;
  let disbursementToken: string;
  let collectionToken: string;
  let borrowerToken: string;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});

    const admin = await User.create({
      fullName: 'Admin User',
      email: 'admin@lms.dev',
      password: 'AdminPass123',
      role: UserRole.Admin,
    });

    const sales = await User.create({
      fullName: 'Sales User',
      email: 'sales@lms.dev',
      password: 'SalesPass123',
      role: UserRole.Sales,
    });

    const sanction = await User.create({
      fullName: 'Sanction User',
      email: 'sanction@lms.dev',
      password: 'SanctionPass123',
      role: UserRole.Sanction,
    });

    const disbursement = await User.create({
      fullName: 'Disbursement User',
      email: 'disbursement@lms.dev',
      password: 'DisbursementPass123',
      role: UserRole.Disbursement,
    });

    const collection = await User.create({
      fullName: 'Collection User',
      email: 'collection@lms.dev',
      password: 'CollectionPass123',
      role: UserRole.Collection,
    });

    const borrower = await User.create({
      fullName: 'Borrower User',
      email: 'borrower@lms.dev',
      password: 'BorrowerPass123',
      role: UserRole.Borrower,
    });

    adminToken = jwt.sign({ userId: admin._id.toString(), role: UserRole.Admin }, config.jwtSecret, { expiresIn: '24h' });
    salesToken = jwt.sign({ userId: sales._id.toString(), role: UserRole.Sales }, config.jwtSecret, { expiresIn: '24h' });
    sanctionToken = jwt.sign({ userId: sanction._id.toString(), role: UserRole.Sanction }, config.jwtSecret, { expiresIn: '24h' });
    disbursementToken = jwt.sign({ userId: disbursement._id.toString(), role: UserRole.Disbursement }, config.jwtSecret, { expiresIn: '24h' });
    collectionToken = jwt.sign({ userId: collection._id.toString(), role: UserRole.Collection }, config.jwtSecret, { expiresIn: '24h' });
    borrowerToken = jwt.sign({ userId: borrower._id.toString(), role: UserRole.Borrower }, config.jwtSecret, { expiresIn: '24h' });
  });

  describe('Unauthenticated Access', () => {
    it('should return 401 for accessing protected routes without token', async () => {
      const response = await request(app).get('/api/protected/sales');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Authentication required',
        },
      });
    });

    it('should return 401 for accessing profile without token', async () => {
      const response = await request(app).get('/api/protected/profile');
      expect(response.status).toBe(401);
    });
  });

  describe('Admin Access (All Modules)', () => {
    it('should allow Admin to access Sales module', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Sales module accessed',
        },
      });
    });

    it('should allow Admin to access Sanction module', async () => {
      const response = await request(app)
        .get('/api/protected/sanction')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Sanction module accessed',
        },
      });
    });

    it('should allow Admin to access Disbursement module', async () => {
      const response = await request(app)
        .get('/api/protected/disbursement')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Disbursement module accessed',
        },
      });
    });

    it('should allow Admin to access Collection module', async () => {
      const response = await request(app)
        .get('/api/protected/collection')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Collection module accessed',
        },
      });
    });

    it('should allow Admin to access admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/protected/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'Admin-only endpoint accessed',
        },
      });
    });
  });

  describe('Sales Role Access', () => {
    it('should allow Sales to access Sales module', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny Sales access to Sanction module', async () => {
      const response = await request(app)
        .get('/api/protected/sanction')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Insufficient permissions',
        },
      });
    });

    it('should deny Sales access to Disbursement module', async () => {
      const response = await request(app)
        .get('/api/protected/disbursement')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Sales access to Collection module', async () => {
      const response = await request(app)
        .get('/api/protected/collection')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Sales access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/protected/admin-only')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Sanction Role Access', () => {
    it('should allow Sanction to access Sanction module', async () => {
      const response = await request(app)
        .get('/api/protected/sanction')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny Sanction access to Sales module', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Sanction access to Disbursement module', async () => {
      const response = await request(app)
        .get('/api/protected/disbursement')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Sanction access to Collection module', async () => {
      const response = await request(app)
        .get('/api/protected/collection')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Sanction access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/protected/admin-only')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Disbursement Role Access', () => {
    it('should allow Disbursement to access Disbursement module', async () => {
      const response = await request(app)
        .get('/api/protected/disbursement')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny Disbursement access to Sales module', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Disbursement access to Sanction module', async () => {
      const response = await request(app)
        .get('/api/protected/sanction')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Disbursement access to Collection module', async () => {
      const response = await request(app)
        .get('/api/protected/collection')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Disbursement access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/protected/admin-only')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Collection Role Access', () => {
    it('should allow Collection to access Collection module', async () => {
      const response = await request(app)
        .get('/api/protected/collection')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny Collection access to Sales module', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Collection access to Sanction module', async () => {
      const response = await request(app)
        .get('/api/protected/sanction')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Collection access to Disbursement module', async () => {
      const response = await request(app)
        .get('/api/protected/disbursement')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Collection access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/protected/admin-only')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Borrower Role Access', () => {
    it('should allow Borrower to access profile', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          message: 'User profile accessed',
          user: {
            role: UserRole.Borrower,
          },
        },
      });
    });

    it('should deny Borrower access to Sales module', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Borrower access to Sanction module', async () => {
      const response = await request(app)
        .get('/api/protected/sanction')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Borrower access to Disbursement module', async () => {
      const response = await request(app)
        .get('/api/protected/disbursement')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Borrower access to Collection module', async () => {
      const response = await request(app)
        .get('/api/protected/collection')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });

    it('should deny Borrower access to admin-only endpoint', async () => {
      const response = await request(app)
        .get('/api/protected/admin-only')
        .set('Authorization', `Bearer ${borrowerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Invalid Token', () => {
    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', role: UserRole.Admin },
        config.jwtSecret,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/protected/sales')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Profile Endpoint (All Authenticated Users)', () => {
    it('should allow Admin to access profile', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(UserRole.Admin);
    });

    it('should allow Sales to access profile', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${salesToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(UserRole.Sales);
    });

    it('should allow Sanction to access profile', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${sanctionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(UserRole.Sanction);
    });

    it('should allow Disbursement to access profile', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${disbursementToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(UserRole.Disbursement);
    });

    it('should allow Collection to access profile', async () => {
      const response = await request(app)
        .get('/api/protected/profile')
        .set('Authorization', `Bearer ${collectionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.role).toBe(UserRole.Collection);
    });
  });
});
