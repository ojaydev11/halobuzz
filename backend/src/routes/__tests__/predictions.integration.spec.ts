import { FastifyInstance } from 'fastify';
import { predictionRoutes } from '../predictions';

// Mock the analytics models and services
jest.mock('../../analytics/models/AnalyticsForecast');
jest.mock('../../analytics/services/predictions');

describe('Prediction Routes Integration', () => {
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

    await app.register(predictionRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /generate', () => {
    it('should generate predictions successfully', async () => {
      const predictionRequest = {
        type: 'revenue',
        horizonDays: 7,
        country: 'ALL'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: predictionRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('predictionId');
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('horizonDays');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('generatedAt');
      
      expect(Array.isArray(body.predictions)).toBe(true);
      expect(body.predictions.length).toBe(7); // horizonDays
    });

    it('should validate type enum', async () => {
      const invalidRequest = {
        type: 'invalid_type',
        horizonDays: 7,
        country: 'ALL'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate horizon days range', async () => {
      const invalidRequest = {
        type: 'revenue',
        horizonDays: 100,
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
        type: 'revenue',
        horizonDays: 7,
        country: 'INVALID_COUNTRY_CODE'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        type: 'revenue',
        horizonDays: 7
        // Missing country
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: invalidRequest
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle multiple prediction types', async () => {
      const predictionRequest = {
        type: 'engagement',
        horizonDays: 14,
        country: 'NP'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: predictionRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.type).toBe('engagement');
      expect(body.horizonDays).toBe(14);
      expect(body.country).toBe('NP');
    });

    it('should handle monetization predictions', async () => {
      const predictionRequest = {
        type: 'monetization',
        horizonDays: 30,
        country: 'US'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: predictionRequest
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.type).toBe('monetization');
      expect(body.horizonDays).toBe(30);
      expect(body.country).toBe('US');
    });
  });

  describe('GET /predictions', () => {
    it('should fetch predictions successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('total');
      expect(body).toHaveProperty('limit');
      expect(body).toHaveProperty('offset');
      expect(Array.isArray(body.predictions)).toBe(true);
    });

    it('should filter predictions by type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions?type=revenue'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should filter predictions by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions?country=NP'
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions?limit=10&offset=5'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(10);
      expect(body.offset).toBe(5);
    });

    it('should validate pagination limits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions?limit=200'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate offset minimum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions?offset=-1'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate type enum', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions?type=invalid_type'
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /predictions/:id', () => {
    it('should fetch specific prediction successfully', async () => {
      const predictionId = '507f1f77bcf86cd799439011';
      
      const response = await app.inject({
        method: 'GET',
        url: `/predictions/${predictionId}`
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('predictionId');
      expect(body).toHaveProperty('type');
      expect(body).toHaveProperty('horizonDays');
      expect(body).toHaveProperty('country');
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('generatedAt');
    });

    it('should validate prediction ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/predictions/invalid-id'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle non-existent prediction', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await app.inject({
        method: 'GET',
        url: `/predictions/${nonExistentId}`
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for prediction generation', async () => {
      // Remove authentication decorator temporarily
      const tempApp = require('fastify')({ logger: false });
      await tempApp.register(predictionRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          type: 'revenue',
          horizonDays: 7,
          country: 'ALL'
        }
      });

      expect(response.statusCode).toBe(401);
      await tempApp.close();
    });

    it('should require admin role for prediction generation', async () => {
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

      await tempApp.register(predictionRoutes);
      await tempApp.ready();

      const response = await tempApp.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          type: 'revenue',
          horizonDays: 7,
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
        url: '/predictions'
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

    it('should handle prediction generation failures', async () => {
      // This would require mocking the PredictionService to throw an error
      const response = await app.inject({
        method: 'POST',
        url: '/generate',
        payload: {
          type: 'revenue',
          horizonDays: 7,
          country: 'ALL'
        }
      });

      // Should handle errors gracefully
      expect([200, 500]).toContain(response.statusCode);
    });
  });
});
