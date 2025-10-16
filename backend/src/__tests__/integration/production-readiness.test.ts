import request from 'supertest';
import { app } from '../../index';
import { User } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import { LiveStream } from '../../models/LiveStream';
import { connectDB, disconnectDB } from '../../config/database';
import { logger } from '../../config/logger';

describe('Production Readiness Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('Health Checks', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
    });

    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('streams');
      expect(response.body).toHaveProperty('transactions');
    });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD || 'TestPassword123!',
        username: 'testuser',
        country: 'Nepal'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', userData.email);
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD || 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Payment System', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: process.env.TEST_PASSWORD || 'TestPassword123!'
        });

      authToken = loginResponse.body.token;
      userId = loginResponse.body.user.id;
    });

    it('should process coin purchase', async () => {
      const paymentData = {
        amount: 100,
        currency: 'coins',
        paymentMethod: 'esewa',
        description: 'Test coin purchase'
      };

      const response = await request(app)
        .post('/api/v1/coins/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transaction');
      expect(response.body.transaction).toHaveProperty('id');
      expect(response.body.transaction).toHaveProperty('status', 'pending');
    });

    it('should validate payment data', async () => {
      const invalidPaymentData = {
        amount: -100, // Invalid amount
        currency: 'invalid',
        paymentMethod: 'invalid'
      };

      const response = await request(app)
        .post('/api/v1/coins/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPaymentData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Live Streaming', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: process.env.TEST_PASSWORD || 'TestPassword123!'
        });

      authToken = loginResponse.body.token;
      userId = loginResponse.body.user.id;
    });

    it('should create a live stream', async () => {
      const streamData = {
        title: 'Test Stream',
        description: 'Test stream description',
        category: 'gaming',
        isPublic: true
      };

      const response = await request(app)
        .post('/api/v1/streams/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(streamData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stream');
      expect(response.body.stream).toHaveProperty('id');
      expect(response.body.stream).toHaveProperty('agoraChannel');
      expect(response.body.stream).toHaveProperty('streamKey');
    });

    it('should get Agora token for streaming', async () => {
      const response = await request(app)
        .post('/api/v1/agora/token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channelName: 'test-channel',
          role: 'publisher'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('uid');
      expect(response.body).toHaveProperty('expiresAt');
    });
  });

  describe('GDPR Compliance', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: process.env.TEST_PASSWORD || 'TestPassword123!'
        });

      authToken = loginResponse.body.token;
      userId = loginResponse.body.user.id;
    });

    it('should export user data', async () => {
      const response = await request(app)
        .get('/api/v1/gdpr/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('personalData');
      expect(response.body.data).toHaveProperty('transactions');
      expect(response.body.data).toHaveProperty('streams');
    });

    it('should update user consent', async () => {
      const consentData = {
        consentType: 'marketing',
        granted: true
      };

      const response = await request(app)
        .post('/api/v1/gdpr/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should get privacy policy', async () => {
      const response = await request(app)
        .get('/api/v1/gdpr/privacy-policy')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('policy');
    });
  });

  describe('Security', () => {
    it('should rate limit requests', async () => {
      const promises = [];
      for (let i = 0; i < 110; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should sanitize input data', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: process.env.TEST_PASSWORD || 'TestPassword123!',
        username: '<script>alert("xss")</script>',
        country: 'Nepal'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousData)
        .expect(201);

      expect(response.body.user.username).not.toContain('<script>');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/v1/health')
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(50);
    });

    it('should have reasonable response times', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Database Integrity', () => {
    it('should maintain transaction integrity', async () => {
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();

      const transactions = await Transaction.find({ userId: user!._id });
      expect(Array.isArray(transactions)).toBe(true);
    });

    it('should have proper indexes', async () => {
      const userIndexes = await User.collection.indexes();
      const transactionIndexes = await Transaction.collection.indexes();
      
      expect(userIndexes.length).toBeGreaterThan(1);
      expect(transactionIndexes.length).toBeGreaterThan(1);
    });
  });

  describe('Cleanup', () => {
    it('should clean up test data', async () => {
      await User.deleteOne({ email: 'test@example.com' });
      await Transaction.deleteMany({ description: 'Test coin purchase' });
      await LiveStream.deleteMany({ title: 'Test Stream' });
    });
  });
});
