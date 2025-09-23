import { FastifyInstance } from 'fastify';
import { empireRoutes } from '../empire';

// Mock the analytics models
jest.mock('../../analytics/models/AnalyticsDailyKPI');
jest.mock('../../analytics/models/AnalyticsAlert');
jest.mock('../../analytics/models/AnalyticsForecast');
jest.mock('../../analytics/models/AnalyticsSimulation');
jest.mock('../../analytics/services/simulations');

describe('Simulation Routes', () => {
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
      expect(body.scenario).toBe('double_gift_multiplier');
      expect(body.projectedKpis).toHaveLength(7);
      expect(body.baselineKpis).toHaveLength(7);
      expect(body.insights).toBeDefined();
      expect(body.simulationId).toBeDefined();
      expect(body.generatedAt).toBeDefined();
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
        horizonDays: 100 // Exceeds maximum
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
      
      const body = JSON.parse(response.body);
      expect(body.scenario).toBe('price_change_coin_pack');
      expect(body.projectedKpis).toHaveLength(14);
    });

    it('should validate params constraints', async () => {
      const invalidRequest = {
        scenario: 'double_gift_multiplier',
        params: { multiplier: 10 }, // Exceeds maximum of 5.0
        horizonDays: 7
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle simulation engine errors', async () => {
      // Mock simulation engine to throw error
      const { SimulationEngine } = require('../../analytics/services/simulations');
      SimulationEngine.mockImplementation(() => ({
        runSimulation: jest.fn().mockRejectedValue(new Error('Simulation failed'))
      }));

      const simulationRequest = {
        scenario: 'double_gift_multiplier',
        horizonDays: 7
      };

      const response = await app.inject({
        method: 'POST',
        url: '/simulate',
        payload: simulationRequest
      });

      expect(response.statusCode).toBe(500);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Simulation failed');
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
      expect(body.simulations).toBeDefined();
      expect(body.total).toBeDefined();
      expect(body.limit).toBeDefined();
      expect(body.offset).toBeDefined();
    });

    it('should filter simulations by scenario', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?scenario=double_gift_multiplier'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.simulations).toBeDefined();
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
        url: '/simulations?limit=200' // Exceeds maximum of 100
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate offset minimum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/simulations?offset=-1' // Below minimum of 0
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database errors', async () => {
      // Mock AnalyticsSimulation to throw error
      const { AnalyticsSimulation } = require('../../analytics/models/AnalyticsSimulation');
      AnalyticsSimulation.find.mockRejectedValue(new Error('Database error'));

      const response = await app.inject({
        method: 'GET',
        url: '/simulations'
      });

      expect(response.statusCode).toBe(500);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Failed to fetch simulations');
    });
  });
});
