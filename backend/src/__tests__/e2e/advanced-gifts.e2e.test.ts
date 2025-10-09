import request from 'supertest';
import { app } from '../../index';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';

describe('Advanced Gifts API - E2E Tests', () => {
  let userToken: string;
  let recipientId: string;
  let giftId: string;

  beforeAll(async () => {
    // Setup test database and Redis
    await getMongoDB();
    await getRedisClient();

    // Get token for authenticated requests
    userToken = process.env.TEST_USER_TOKEN || 'test-user-token';
    recipientId = 'test-recipient-123';
    giftId = 'gift-001';
  });

  describe('GET /api/v1/advanced-gifts/packages', () => {
    it('should get available gift packages', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/packages')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const firstPackage = response.body.data[0];
        expect(firstPackage).toHaveProperty('giftId');
        expect(firstPackage).toHaveProperty('name');
        expect(firstPackage).toHaveProperty('basePrice');
      }
    });

    it('should return packages with personalized pricing', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/packages')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        const pkg = response.body.data[0];
        expect(pkg).toHaveProperty('finalPrice');
        expect(pkg).toHaveProperty('discount');
      }
    });
  });

  describe('POST /api/v1/advanced-gifts/send', () => {
    it('should send an advanced gift', async () => {
      const giftData = {
        recipientId,
        giftId,
        multiplier: 1,
        message: 'Great stream!'
      };

      const response = await request(app)
        .post('/api/v1/advanced-gifts/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send(giftData)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('totalValue');
    });

    it('should reject gift without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/advanced-gifts/send')
        .send({
          recipientId,
          giftId,
          multiplier: 1
        });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('GET /api/v1/advanced-gifts/history', () => {
    it('should get gift history without filters', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/history')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('gifts');
      expect(Array.isArray(response.body.data.gifts)).toBe(true);
    });

    it('should get sent gifts history', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/history')
        .query({ type: 'sent', limit: 10 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('totalValue');
    });

    it('should get received gifts history', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/history')
        .query({ type: 'received', limit: 10 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/advanced-gifts/analytics', () => {
    it('should get gift analytics for user', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/analytics')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalSent');
      expect(response.body.data).toHaveProperty('totalReceived');
      expect(response.body.data).toHaveProperty('topRecipients');
      expect(response.body.data).toHaveProperty('topSenders');
    });
  });

  describe('GET /api/v1/advanced-gifts/trending', () => {
    it('should get trending gifts', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/trending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const trendingGift = response.body.data[0];
        expect(trendingGift).toHaveProperty('giftId');
        expect(trendingGift).toHaveProperty('count');
        expect(trendingGift).toHaveProperty('trend');
      }
    });
  });

  describe('POST /api/v1/advanced-gifts/calculate', () => {
    it('should calculate gift value with multipliers', async () => {
      const response = await request(app)
        .post('/api/v1/advanced-gifts/calculate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          giftId,
          multiplier: 5,
          recipientId,
          senderId: 'test-user-456'
        })
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('baseValue');
      expect(response.body.data).toHaveProperty('multiplier');
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('bonuses');
    });
  });

  describe('GET /api/v1/advanced-gifts/leaderboard', () => {
    it('should get weekly sent gifts leaderboard', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/leaderboard')
        .query({ timeframe: 'weekly', category: 'sent' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get monthly received gifts leaderboard', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/leaderboard')
        .query({ timeframe: 'monthly', category: 'received' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });

    it('should get all-time leaderboard', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/leaderboard')
        .query({ timeframe: 'alltime' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/advanced-gifts/combo', () => {
    it('should process gift combo', async () => {
      const response = await request(app)
        .post('/api/v1/advanced-gifts/combo')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          recipientId,
          gifts: [giftId, giftId, giftId]
        })
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comboName');
      expect(response.body.data).toHaveProperty('bonusMultiplier');
      expect(response.body.data).toHaveProperty('totalValue');
    });
  });

  describe('GET /api/v1/advanced-gifts/recommendations', () => {
    it('should get gift recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/recommendations')
        .query({ recipientId })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get recommendations with budget constraint', async () => {
      const response = await request(app)
        .get('/api/v1/advanced-gifts/recommendations')
        .query({
          recipientId,
          budget: 5000,
          occasion: 'birthday'
        })
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        const recommendation = response.body.data[0];
        expect(recommendation).toHaveProperty('gift');
        expect(recommendation).toHaveProperty('reason');
        expect(recommendation).toHaveProperty('score');
      }
    });
  });

  // Integration test: Full gifting workflow
  describe('Full Gifting Workflow', () => {
    it('should complete full gifting lifecycle', async () => {
      // 1. Get available packages
      const packagesResponse = await request(app)
        .get('/api/v1/advanced-gifts/packages')
        .set('Authorization', `Bearer ${userToken}`);

      expect(packagesResponse.body.success).toBe(true);

      // 2. Calculate gift value
      const calculateResponse = await request(app)
        .post('/api/v1/advanced-gifts/calculate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          giftId,
          multiplier: 3,
          recipientId,
          senderId: 'workflow-user'
        });

      expect(calculateResponse.body.success).toBe(true);

      // 3. Send gift
      const sendResponse = await request(app)
        .post('/api/v1/advanced-gifts/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          recipientId,
          giftId,
          multiplier: 3,
          message: 'Workflow test gift'
        });

      expect(sendResponse.body.success).toBe(true);

      // 4. Check history
      const historyResponse = await request(app)
        .get('/api/v1/advanced-gifts/history')
        .query({ type: 'sent', limit: 1 })
        .set('Authorization', `Bearer ${userToken}`);

      expect(historyResponse.body.success).toBe(true);

      // 5. View analytics
      const analyticsResponse = await request(app)
        .get('/api/v1/advanced-gifts/analytics')
        .set('Authorization', `Bearer ${userToken}`);

      expect(analyticsResponse.body.success).toBe(true);
    });
  });
});
