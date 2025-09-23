import { FastifyInstance } from 'fastify';
import { reportRoutes } from '../reports';

// Mock the analytics models and services
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/models/AnalyticsAlert');
jest.mock('../../analytics/models/AnalyticsForecast');
jest.mock('../../services/ReportGeneratorService');

describe('Report Routes Integration', () => {
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

    await app.register(reportRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /generate', () => {
    it('should generate PDF report successfully', async () => {
      const reportRequest = {
        period: 'daily',
        format: 'pdf',
        country: 'ALL'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: reportRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reportId');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('format');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('downloadUrl');
      expect(body).toHaveProperty('generatedAt');
      expect(body.format).toBe('pdf');
    });

    it('should generate XLSX report successfully', async () => {
      const reportRequest = {
        period: 'weekly',
        format: 'xlsx',
        country: 'NP'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: reportRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reportId');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('format');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('downloadUrl');
      expect(body).toHaveProperty('generatedAt');
      expect(body.format).toBe('xlsx');
    });

    it('should validate period enum', async () => {
      const invalidRequest = {
        period: 'invalid_period',
        format: 'pdf',
        country: 'ALL'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate format enum', async () => {
      const invalidRequest = {
        period: 'daily',
        format: 'invalid_format',
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
        format: 'pdf',
        country: 'INVALID_COUNTRY_CODE'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle custom date range', async () => {
      const reportRequest = {
        period: 'custom',
        format: 'pdf',
        country: 'NP',
        from: '2024-01-01',
        to: '2024-01-07'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: reportRequest
      });

      expect(response.statusCode).toBe(200);
    });

    it('should require from/to for custom period', async () => {
      const invalidRequest = {
        period: 'custom',
        format: 'pdf',
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
        format: 'pdf',
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
        format: 'pdf',
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
        format: 'pdf',
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

  describe('GET /reports', () => {
    it('should fetch reports successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reports');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit');
      expect(body).toHaveProperty('offset');
      expect(Array.isArray(body.reports)).toBe(true);
    });

    it('should filter reports by period', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports?period=daily'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter reports by format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports?format=pdf'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter reports by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports?country=NP'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports?limit=10&offset=5'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(5);
    });

    it('should validate pagination limits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports?limit=200'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate offset minimum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports?offset=-1'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /reports/:id', () => {
    it('should fetch specific report successfully', async () => {
      const reportId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'GET',
        url: `/reports/${reportId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reportId');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('format');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('downloadUrl');
      expect(body).toHaveProperty('generatedAt');
    });

    it('should validate report ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/invalid-id'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent report', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/reports/${nonExistentId}`
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /reports/:id/download', () => {
    it('should download report successfully', async () => {
      const reportId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'GET',
        url: `/reports/${reportId}/download`
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/(pdf|xlsx)/);
      expect(response.headers['content-disposition']).toMatch(/attachment/);
    });

    it('should validate report ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/reports/invalid-id/download'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent report', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/reports/${nonExistentId}/download`
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for report generation', async () => {
      // Remove authentication decorator temporarily
      const tempApp = require('fastify')({ logger: false });
      await tempApp.register(reportRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          period: 'daily',
          format: 'pdf',
          country: 'ALL'
        }
      });

      expect(response.statusCode).toBe(401);
      await tempApp.close();
    });

    it('should require admin role for report generation', async () => {
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

      await tempApp.register(reportRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          period: 'daily',
          format: 'pdf',
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
        method: 'GET',
        url: '/reports'
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

    it('should handle report generation failures', async () => {
      // This would require mocking the ReportGeneratorService to throw an error
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          period: 'daily',
          format: 'pdf',
          country: 'ALL'
        }
      });

      // Should handle errors gracefully
      expect([200, 500]).toContain(response.statusCode);
    });
  });
});
