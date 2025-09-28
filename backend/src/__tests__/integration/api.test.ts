import request from 'supertest';
import { app } from '../../index';
import { connectDB, disconnectDB } from '../../config/database';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';

describe('API Integration Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: 'test@example.com' });
  });

  describe('Authentication', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('new@example.com');
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Profile', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
    });

    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Global Payments', () => {
    it('should get supported currencies', async () => {
      const response = await request(app)
        .get('/api/global-payments/currencies')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should convert currency', async () => {
      const response = await request(app)
        .post('/api/global-payments/convert')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'EUR'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.convertedAmount).toBeDefined();
    });

    it('should validate payment data', async () => {
      const response = await request(app)
        .post('/api/global-payments/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          currency: 'USD',
          paymentMethod: 'stripe'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.supported).toBe(true);
    });
  });

  describe('Localization', () => {
    it('should get supported locales', async () => {
      const response = await request(app)
        .get('/api/localization/locales')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should translate text', async () => {
      const response = await request(app)
        .post('/api/localization/translate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          key: 'welcome',
          locale: 'ne'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.translation).toBeDefined();
    });

    it('should format currency', async () => {
      const response = await request(app)
        .post('/api/localization/format-currency')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.50,
          locale: 'en'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.formatted).toBeDefined();
    });
  });

  describe('GDPR Compliance', () => {
    it('should record consent', async () => {
      const response = await request(app)
        .post('/api/gdpr/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'marketing',
          granted: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.consentId).toBeDefined();
    });

    it('should check consent status', async () => {
      // First record consent
      await request(app)
        .post('/api/gdpr/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          consentType: 'analytics',
          granted: true
        });

      // Then check consent
      const response = await request(app)
        .get('/api/gdpr/consent/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.granted).toBe(true);
    });

    it('should request data export', async () => {
      const response = await request(app)
        .post('/api/gdpr/export')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dataTypes: ['profile', 'transactions']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBeDefined();
    });
  });

  describe('AI Games', () => {
    it('should get available AI games', async () => {
      const response = await request(app)
        .get('/api/ai-games/games')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should get AI game statistics', async () => {
      const response = await request(app)
        .get('/api/ai-games/statistics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/api/invalid-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
    });
  });
});
