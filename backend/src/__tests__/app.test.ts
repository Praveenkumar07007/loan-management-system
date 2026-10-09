import request from 'supertest';
import app from '../app';

describe('API Error Handling', () => {
  describe('Validation Error', () => {
    it('should return 400 with validation details for invalid input', async () => {
      const response = await request(app)
        .post('/api/test/validation')
        .send({
          name: 'ab',
          email: 'invalid-email',
          age: 150,
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: expect.any(String),
              message: expect.any(String),
            }),
          ]),
        },
        timestamp: expect.any(String),
      });
    });

    it('should accept valid input', async () => {
      const response = await request(app)
        .post('/api/test/validation')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
      });
    });
  });

  describe('Not Found Error', () => {
    it('should return 404 for unknown route', async () => {
      const response = await request(app).get('/api/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('not found'),
        },
        timestamp: expect.any(String),
      });
    });

    it('should return 404 for test not-found endpoint', async () => {
      const response = await request(app).get('/api/test/not-found');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Test resource not found',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('Server Error', () => {
    it('should return 500 for unexpected errors', async () => {
      const response = await request(app).get('/api/test/server-error');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: 'Internal Server Error',
        },
        timestamp: expect.any(String),
      });
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: expect.any(String),
        database: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });
});
