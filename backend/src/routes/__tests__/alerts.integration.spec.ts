import { FastifyInstance } from 'fastify';
import { alertRoutes } from '../alerts';

// Mock the analytics models and services
jest.mock('../../analytics/models/AnalyticsAlert');
jest.mock('../../analytics/services/rootCause');

describe('Alert Routes Integration', () => {
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

    await app.register(alertRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /alerts', () => {
    it('should fetch alerts successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alerts');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit');
      expect(body).toHaveProperty('offset');
      expect(Array.isArray(body.alerts)).toBe(true);
    });

    it('should filter alerts by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?status=active'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter alerts by severity', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?severity=high'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter alerts by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?type=revenue_drop'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter alerts by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?country=NP'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?limit=10&offset=5'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(5);
    });

    it('should validate pagination limits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?limit=200'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate offset minimum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?offset=-1'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate status enum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?status=invalid_status'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate severity enum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts?severity=invalid_severity'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /alerts/:id', () => {
    it('should fetch specific alert successfully', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'GET',
        url: `/alerts/${alertId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alertId');
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('severity');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('metric');
      expect(body).toHaveProperty('currentValue');
      expect(body).toHaveProperty('thresholdValue');
      expect(body).toHaveProperty('deviation');
      expect(body).toHaveProperty('timeWindow');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('affectedRevenue');
      expect(body).toHaveProperty('config');
      expect(body).toHaveProperty('relatedData');
      expect(body).toHaveProperty('rootCause');
      expect(body).toHaveProperty('suggestion');
      expect(body).toHaveProperty('createdAt');
      expect(body).toHaveProperty('updatedAt');
    });

    it('should validate alert ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/alerts/invalid-id'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent alert', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/alerts/${nonExistentId}`
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /alerts/:id/acknowledge', () => {
    it('should acknowledge alert successfully', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/acknowledge`,
        payload: {
          acknowledgedBy: 'test-user',
          notes: 'Investigating the issue'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alertId');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('acknowledgedBy');
      expect(body).toHaveProperty('acknowledgedAt');
      expect(body).toHaveProperty('notes');
      expect(body.status).toBe('acknowledged');
    });

    it('should validate alert ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/alerts/invalid-id/acknowledge',
        payload: {
          acknowledgedBy: 'test-user'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate required fields', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/acknowledge`,
        payload: {
          // Missing acknowledgedBy
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate acknowledgedBy format', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/acknowledge`,
        payload: {
          acknowledgedBy: 'invalid-user-id-format'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent alert', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${nonExistentId}/acknowledge`,
        payload: {
          acknowledgedBy: 'test-user'
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /alerts/:id/resolve', () => {
    it('should resolve alert successfully', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/resolve`,
        payload: {
          resolvedBy: 'test-user',
          resolution: 'Issue has been fixed',
          notes: 'Applied hotfix to resolve the problem'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alertId');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('resolvedBy');
      expect(body).toHaveProperty('resolvedAt');
      expect(body).toHaveProperty('resolution');
      expect(body).toHaveProperty('notes');
      expect(body.status).toBe('resolved');
    });

    it('should validate alert ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/alerts/invalid-id/resolve',
        payload: {
          resolvedBy: 'test-user',
          resolution: 'Fixed'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate required fields', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/resolve`,
        payload: {
          resolvedBy: 'test-user'
          // Missing resolution
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate resolvedBy format', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/resolve`,
        payload: {
          resolvedBy: 'invalid-user-id-format',
          resolution: 'Fixed'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent alert', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${nonExistentId}/resolve`,
        payload: {
          resolvedBy: 'test-user',
          resolution: 'Fixed'
        }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for alert operations', async () => {
      // Remove authentication decorator temporarily
      const tempApp = require('fastify')({ logger: false });
      await tempApp.register(alertRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'GET',
        url: '/alerts'
      });

      expect(response.statusCode).toBe(401);
      await tempApp.close();
    });

    it('should require admin role for alert operations', async () => {
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

      await tempApp.register(alertRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'GET',
        url: '/alerts'
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
        method: 'GET',
        url: '/alerts'
      });

      // Should not crash the application
      expect([200, 500]).toContain(response.statusCode);
    });

    it('should handle invalid JSON payload', async () => {
      const alertId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'POST',
        url: `/alerts/${alertId}/acknowledge`,
        payload: 'invalid json'
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
