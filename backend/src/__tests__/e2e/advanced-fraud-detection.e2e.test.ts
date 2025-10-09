import request from 'supertest';
import { app } from '../../index';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';

describe('Advanced Fraud Detection API - E2E Tests', () => {
  let adminToken: string;
  let userToken: string;
  let createdPatternId: string;
  let createdAlertId: string;

  beforeAll(async () => {
    // Setup test database and Redis
    await getMongoDB();
    await getRedisClient();

    // Get tokens for authenticated requests
    // This would typically use a test user setup
    // For now, using mock tokens
    adminToken = process.env.TEST_ADMIN_TOKEN || 'test-admin-token';
    userToken = process.env.TEST_USER_TOKEN || 'test-user-token';
  });

  describe('POST /api/v1/fraud-detection/patterns', () => {
    it('should create a fraud pattern as admin', async () => {
      const patternData = {
        name: 'Suspicious Transaction Pattern',
        description: 'Detects unusual transaction patterns',
        type: 'transactional',
        severity: 'high',
        conditions: [
          {
            field: 'transaction_amount',
            operator: 'greater_than',
            value: 10000,
            weight: 0.5
          }
        ],
        threshold: 0.8,
        isActive: true
      };

      const response = await request(app)
        .post('/api/v1/fraud-detection/patterns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(patternData)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('patternId');
      expect(response.body.data.name).toBe(patternData.name);

      createdPatternId = response.body.data.patternId;
    });

    it('should reject pattern creation from non-admin users', async () => {
      const response = await request(app)
        .post('/api/v1/fraud-detection/patterns')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Pattern',
          type: 'behavioral'
        });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('GET /api/v1/fraud-detection/patterns', () => {
    it('should get all fraud patterns as admin', async () => {
      const response = await request(app)
        .get('/api/v1/fraud-detection/patterns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PUT /api/v1/fraud-detection/patterns/:patternId', () => {
    it('should update a fraud pattern as admin', async () => {
      const updates = {
        severity: 'critical',
        threshold: 0.9
      };

      const response = await request(app)
        .put(`/api/v1/fraud-detection/patterns/${createdPatternId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data.severity).toBe('critical');
    });
  });

  describe('GET /api/v1/fraud-detection/alerts', () => {
    it('should get fraud alerts with filters', async () => {
      const response = await request(app)
        .get('/api/v1/fraud-detection/alerts')
        .query({
          status: 'new',
          severity: 'high',
          limit: 10
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
    });
  });

  describe('POST /api/v1/fraud-detection/risk-score', () => {
    it('should calculate risk score for a user', async () => {
      const response = await request(app)
        .post('/api/v1/fraud-detection/risk-score')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'test-user-123'
        })
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalScore');
      expect(response.body.data).toHaveProperty('riskLevel');
    });
  });

  describe('POST /api/v1/fraud-detection/analyze', () => {
    it('should analyze user for fraud patterns', async () => {
      const response = await request(app)
        .post('/api/v1/fraud-detection/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'test-user-123'
        })
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('analysis');
    });
  });

  describe('GET /api/v1/fraud-detection/analytics', () => {
    it('should get fraud analytics dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/fraud-detection/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
    });
  });

  describe('POST /api/v1/fraud-detection/whitelist', () => {
    it('should add user to whitelist', async () => {
      const response = await request(app)
        .post('/api/v1/fraud-detection/whitelist')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 'test-user-123',
          reason: 'Verified VIP user'
        })
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/fraud-detection/whitelist/:userId', () => {
    it('should remove user from whitelist', async () => {
      const response = await request(app)
        .delete('/api/v1/fraud-detection/whitelist/test-user-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/fraud-detection/patterns/:patternId', () => {
    it('should delete a fraud pattern as admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/fraud-detection/patterns/${createdPatternId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });
  });

  // Integration test: Full fraud detection workflow
  describe('Full Fraud Detection Workflow', () => {
    it('should complete full fraud detection lifecycle', async () => {
      // 1. Create pattern
      const createResponse = await request(app)
        .post('/api/v1/fraud-detection/patterns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Workflow Test Pattern',
          description: 'Test pattern for workflow',
          type: 'behavioral',
          severity: 'medium',
          conditions: [],
          threshold: 0.7,
          isActive: true
        });

      expect(createResponse.body.success).toBe(true);
      const patternId = createResponse.body.data.patternId;

      // 2. Get all patterns
      const getPatternsResponse = await request(app)
        .get('/api/v1/fraud-detection/patterns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getPatternsResponse.body.success).toBe(true);
      expect(getPatternsResponse.body.data.length).toBeGreaterThan(0);

      // 3. Test pattern
      const testResponse = await request(app)
        .get(`/api/v1/fraud-detection/patterns/${patternId}/test`)
        .query({ testData: JSON.stringify({ test: true }) })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(testResponse.body.success).toBe(true);

      // 4. Calculate risk score
      const riskResponse = await request(app)
        .post('/api/v1/fraud-detection/risk-score')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 'test-user-workflow' });

      expect(riskResponse.body.success).toBe(true);

      // 5. Delete pattern
      const deleteResponse = await request(app)
        .delete(`/api/v1/fraud-detection/patterns/${patternId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.body.success).toBe(true);
    });
  });
});
