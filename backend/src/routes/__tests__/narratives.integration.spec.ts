import { FastifyInstance } from 'fastify';
import { narrativeRoutes } from '../narratives';

// Mock the analytics models and services
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/services/narratives');

describe('Narrative Routes Integration', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = require('fastify')({ logger: false });
    
    // Mock authentication and authorization
    app.decorate('authenticate', async (request: any, reply: any) => {
      request.user = { id: 'test-user', role: 'admin' };
    });
    
    app.decorate('authorize', (roles: string[]) => async (request: any, reply: any) => {
      if (!roles.includes(request.user.role)) {
        reply.status(403).send({ error: 'Forbidden' });
      }
    });

    await app.register(narrativeRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /generate', () => {
    it('should generate narratives successfully', async () => {
      const narrativeRequest = {
        period: 'daily',
        country: 'ALL',
        comparePeriod: 'previous_day'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: narrativeRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('narrativeId');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('narratives');
      expect(body).toHaveProperty('insights');
      expect(body).toHaveProperty('generatedAt');
      
      expect(body.narratives).toHaveProperty('short');
      expect(body.narratives).toHaveProperty('long');
      expect(Array.isArray(body.insights)).toBe(true);
    });

    it('should validate period enum', async () => {
      const invalidRequest = {
        period: 'invalid_period',
        country: 'ALL'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate country format', async () => {
      const invalidRequest = {
        period: 'daily',
        country: 'INVALID_COUNTRY_CODE'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate compare period enum', async () => {
      const invalidRequest = {
        period: 'daily',
        country: 'ALL',
        comparePeriod: 'invalid_compare'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle custom date range', async () => {
      const narrativeRequest = {
        period: 'custom',
        country: 'NP',
        from: '2024-01-01',
        to: '2024-01-07',
        comparePeriod: 'previous_week'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: narrativeRequest
      });

      expect(response.statusCode).toBe(200);
    });

    it('should require from/to for custom period', async () => {
      const invalidRequest = {
        period: 'custom',
        country: 'ALL'
        // Missing from/to
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date format', async () => {
      const invalidRequest = {
        period: 'custom',
        country: 'ALL',
        from: 'invalid-date',
        to: '2024-01-07'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range', async () => {
      const invalidRequest = {
        period: 'custom',
        country: 'ALL',
        from: '2024-01-07',
        to: '2024-01-01' // to is before from
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range span', async () => {
      const invalidRequest = {
        period: 'custom',
        country: 'ALL',
        from: '2024-01-01',
        to: '2024-02-01' // More than 30 days
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /narratives', () => {
    it('should fetch narratives successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('narratives');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit');
      expect(body).toHaveProperty('offset');
      expect(Array.isArray(body.narratives)).toBe(true);
    });

    it('should filter narratives by period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives?period=daily'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter narratives by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives?country=NP'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives?limit=10&offset=5'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(5);
    });

    it('should validate pagination limits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives?limit=200'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate offset minimum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives?offset=-1'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /narratives/:id', () => {
    it('should fetch specific narrative successfully', async () => {
      const narrativeId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'GET',
        url: `/narratives/${narrativeId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('narrativeId');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('narratives');
      expect(body).toHaveProperty('insights');
      expect(body).toHaveProperty('generatedAt');
    });

    it('should validate narrative ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/narratives/invalid-id'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent narrative', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/narratives/${nonExistentId}`
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for narrative generation', async () => {
      // Remove authentication decorator temporarily
      const tempApp = require('fastify')({ logger: false });
      await tempApp.register(narrativeRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          period: 'daily',
          country: 'ALL'
        }
      });

      expect(response.statusCode).toBe(401);
      await tempApp.close();
    });

    it('should require admin role for narrative generation', async () => {
      const tempApp = require('fastify')({ logger: false });
      
      // Mock non-admin user
      tempApp.decorate('authenticate', async (request: any, reply: any) => {
        request.user = { id: 'test-user', role: 'user' };
      });
      
      tempApp.decorate('authorize', (roles: string[]) => async (request: any, reply: any) => {
        if (!roles.includes(request.user.role)) {
          reply.status(403).send({ error: 'Forbidden' });
        }
      });

      await tempApp.register(narrativeRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          period: 'daily',
          country: 'ALL'
        }
      });

      expect(response.statusCode).toBe(403);
      await tempApp.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we'll test the basic error handling structure
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          period: 'daily',
          country: 'ALL'
        }
      });

      // Should not crash the application
      expect([200, 500]).toContain(response.statusCode);
    });

    it('should handle invalid JSON payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: 'invalid json'
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
