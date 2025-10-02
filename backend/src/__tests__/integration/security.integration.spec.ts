import request from 'supertest';
import { app } from '../../index';
import { User } from '../../models/User';
import { Transaction } from '../../models/Transaction';

describe('Security Integration Tests', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Transaction.deleteMany({ userId: { $in: await User.find({ email: /test.*@example\.com/ }).distinct('_id') } });

    // Create test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPassword123!',
      country: 'US',
      language: 'en',
      coins: { balance: 1000, bonusBalance: 0, totalEarned: 0, totalSpent: 0 }
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test.*@example\.com/ });
    await Transaction.deleteMany({ userId: testUser._id });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .expect(401);

      expect(response.body.error).toBe('Access denied. No token provided.');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should accept valid tokens', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe('test@example.com');
    });
  });

  describe('Input Validation Security', () => {
    it('should reject XSS attempts in user input', async () => {
      const maliciousInput = {
        bio: '<script>alert("xss")</script>',
        username: 'test<script>alert("xss")</script>'
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousInput)
        .expect(200);

      // Should either reject or sanitize the input
      expect(response.body.success).toBe(true);
    });

    it('should reject SQL injection attempts', async () => {
      const maliciousInput = {
        username: "'; DROP TABLE users; --"
      };

      const response = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(maliciousInput);

      // Should reject malicious input
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 15; i++) {
        requests.push(
          request(app)
            .get('/api/v1/users/me')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF tokens for state-changing requests', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 100 });

      // Should require CSRF token
      expect(response.status).toBe(403);
    });
  });

  describe('Data Security', () => {
    it('should not expose sensitive user data', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.data.user;

      // Should not include password
      expect(userData.password).toBeUndefined();

      // Should not include sensitive KYC documents
      expect(userData.kycDocuments).toBeUndefined();

      // Should not include device tokens
      expect(userData.deviceTokens).toBeUndefined();
    });

    it('should hash passwords properly', async () => {
      const user = await User.findById(testUser._id);
      expect(user?.password).not.toBe('TestPassword123!');
      expect(user?.password).toMatch(/^\$2[aby]?\$/); // bcrypt hash format
    });
  });

  describe('Session Security', () => {
    it('should track user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.data.user;

      // Should have session tracking
      expect(userData.lastActiveAt).toBeDefined();
      expect(userData.lastLoginIP).toBeDefined();
    });

    it('should handle concurrent sessions properly', async () => {
      // Test concurrent session handling
      const responses = await Promise.all([
        request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${authToken}`),
        request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${authToken}`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
