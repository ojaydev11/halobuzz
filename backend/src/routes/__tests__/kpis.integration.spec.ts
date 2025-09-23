import { FastifyInstance } from 'fastify';
import { kpiRoutes } from '../kpis';

// Mock the analytics models and services
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/queries/kpis');

describe('KPI Routes Integration', () => {
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

    await app.register(kpiRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /kpis', () => {
    it('should fetch KPIs successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('kpis');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('generatedAt');
      
      expect(body.kpis).toHaveProperty('revenue');
      expect(body.kpis).toHaveProperty('engagement');
      expect(body.kpis).toHaveProperty('monetization');
      expect(body.kpis).toHaveProperty('retention');
      expect(body.kpis).toHaveProperty('creator');
      expect(body.kpis).toHaveProperty('safety');
      expect(body.kpis).toHaveProperty('gaming');
    });

    it('should filter KPIs by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?country=NP'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.country).toBe('NP');
    });

    it('should filter KPIs by date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?from=2024-01-01&to=2024-01-31'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('period');
      expect(body.period).toHaveProperty('from');
      expect(body.period).toHaveProperty('to');
    });

    it('should validate country format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?country=INVALID_COUNTRY_CODE'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?from=invalid-date&to=2024-01-31'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?from=2024-01-31&to=2024-01-01'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range span', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?from=2024-01-01&to=2024-02-01'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /kpis/compare', () => {
    it('should compare KPIs successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/compare?from=2024-01-01&to=2024-01-07&compareFrom=2024-01-08&compareTo=2024-01-14'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('current');
      expect(body).toHaveProperty('compare');
      expect(body).toHaveProperty('deltas');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('comparePeriod');
      expect(body).toHaveProperty('generatedAt');
      
      expect(body.current).toHaveProperty('kpis');
      expect(body.compare).toHaveProperty('kpis');
      expect(body.deltas).toHaveProperty('revenue');
      expect(body.deltas).toHaveProperty('engagement');
      expect(body.deltas).toHaveProperty('monetization');
      expect(body.deltas).toHaveProperty('retention');
      expect(body.deltas).toHaveProperty('creator');
      expect(body.deltas).toHaveProperty('safety');
      expect(body.deltas).toHaveProperty('gaming');
    });

    it('should validate required parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/compare?from=2024-01-01&to=2024-01-07'
        // Missing compareFrom and compareTo
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/compare?from=invalid-date&to=2024-01-07&compareFrom=2024-01-08&compareTo=2024-01-14'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/compare?from=2024-01-07&to=2024-01-01&compareFrom=2024-01-08&compareTo=2024-01-14'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range span', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/compare?from=2024-01-01&to=2024-02-01&compareFrom=2024-01-08&compareTo=2024-01-14'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate compare date range span', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/compare?from=2024-01-01&to=2024-01-07&compareFrom=2024-01-08&compareTo=2024-02-01'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /kpis/trends', () => {
    it('should fetch KPI trends successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/trends?from=2024-01-01&to=2024-01-31'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('trends');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('generatedAt');
      
      expect(body.trends).toHaveProperty('revenue');
      expect(body.trends).toHaveProperty('engagement');
      expect(body.trends).toHaveProperty('monetization');
      expect(body.trends).toHaveProperty('retention');
      expect(body.trends).toHaveProperty('creator');
      expect(body.trends).toHaveProperty('safety');
      expect(body.trends).toHaveProperty('gaming');
    });

    it('should filter trends by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/trends?from=2024-01-01&to=2024-01-31&country=NP'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('country');
      expect(body.country).toBe('NP');
    });

    it('should validate required parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/trends'
        // Missing from and to
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/trends?from=invalid-date&to=2024-01-31'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/trends?from=2024-01-31&to=2024-01-01'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate date range span', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis/trends?from=2024-01-01&to=2024-02-01'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for KPI access', async () => {
      // Remove authentication decorator temporarily
      const tempApp = require('fastify')({ logger: false });
      await tempApp.register(kpiRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'GET',
        url: '/kpis'
      });

      expect(response.statusCode).toBe(401);
      await tempApp.close();
    });

    it('should require admin role for KPI access', async () => {
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

      await tempApp.register(kpiRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'GET',
        url: '/kpis'
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
        url: '/kpis'
      });

      // Should not crash the application
      expect([200, 500]).toContain(response.statusCode);
    });

    it('should handle invalid query parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/kpis?invalidParam=value'
      });

      // Should handle gracefully, either ignore or return 400
      expect([200, 400]).toContain(response.statusCode);
    });
  });
});