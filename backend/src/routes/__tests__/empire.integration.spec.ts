import { FastifyInstance } from 'fastify';
import { empireRoutes } from '../empire';

// Mock the analytics models
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/models/AnalyticsAlert');
jest.mock('../../analytics/models/AnalyticsForecast');
jest.mock('../../analytics/models/AnalyticsSimulation');
jest.mock('../../analytics/services/simulations');

describe('Empire Routes Integration', () => {
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

    await app.register(empireRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /empire-dashboard', () => {
    it('should return empire dashboard data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/empire-dashboard?from=2024-01-01&to=2024-01-31'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('apps');
      expect(body).toHaveProperty('period');
      expect(body).toHaveProperty('generatedAt');
      expect(body.summary).toHaveProperty('totalApps');
      expect(body.summary).toHaveProperty('totalRevenue');
      expect(body.summary).toHaveProperty('totalDAU');
    });

    it('should filter by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/empire-dashboard?from=2024-01-01&to=2024-01-31&country=NP'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter by app ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/empire-dashboard?from=2024-01-01&to=2024-01-31&appId=halobuzz'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should validate required parameters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/empire-dashboard'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle invalid date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/empire-dashboard?from=invalid-date&to=2024-01-31'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /empire-dashboard/apps', () => {
    it('should return empire apps list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/empire-dashboard/apps'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('apps');
      expect(Array.isArray(body.apps)).toBe(true);
      
      if (body.apps.length > 0) {
        const app = body.apps[0];
        expect(app).toHaveProperty('appId');
        expect(app).toHaveProperty('name');
        expect(app).toHaveProperty('status');
        expect(app).toHaveProperty('lastDataUpdate');
        expect(app).toHaveProperty('totalRevenue');
        expect(app).toHaveProperty('totalDAU');
        expect(app).toHaveProperty('activeAlerts');
      }
    });
  });

  describe('POST /simulate', () => {
    it('should run simulation successfully', async () => {
      const simulationRequest = {
        scenario: 'double_gift_multiplier',
        params: { multiplier: 2.0 },
        horizonDays: 7
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: simulationRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('scenario');
      expect(body).toHaveProperty('projectedKpis');
      expect(body).toHaveProperty('baselineKpis');
      expect(body).toHaveProperty('deltaVsBaseline');
      expect(body).toHaveProperty('insights');
      expect(body).toHaveProperty('simulationId');
      expect(body).toHaveProperty('generatedAt');
    });

    it('should validate scenario enum', async () => {
      const invalidRequest = {
        scenario: 'invalid_scenario',
        horizonDays: 7
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate horizon days range', async () => {
      const invalidRequest = {
        scenario: 'double_gift_multiplier',
        horizonDays: 100
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        scenario: 'double_gift_multiplier'
        // Missing horizonDays
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle segment filtering', async () => {
      const simulationRequest = {
        scenario: 'price_change_coin_pack',
        params: { priceChange: 10 },
        segment: { country: 'NP', og: 'tier3' },
        horizonDays: 14
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: simulationRequest
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /simulations', () => {
    it('should fetch simulations successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('simulations');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit');
      expect(body).toHaveProperty('offset');
      expect(Array.isArray(body.simulations)).toBe(true);
    });

    it('should filter simulations by scenario', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?scenario=double_gift_multiplier'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?limit=10&offset=5'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(5);
    });

    it('should validate pagination limits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?limit=200'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate offset minimum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?offset=-1'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for empire dashboard', async () => {
      // Remove authentication decorator temporarily
      const tempApp = require('fastify')({ logger: false });
      await tempApp.register(empireRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'GET',
        url: '/empire-dashboard?from=2024-01-01&to=2024-01-31'
      });

      expect(response.statusCode).toBe(401);
      await tempApp.close();
    });

    it('should require admin role for simulations', async () => {
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

      await tempApp.register(empireRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/simulate',
        payload: {
          scenario: 'double_gift_multiplier',
          horizonDays: 7
        }
      });

      expect(response.statusCode).toBe(403);
      await tempApp.close();
    });
  });
});
