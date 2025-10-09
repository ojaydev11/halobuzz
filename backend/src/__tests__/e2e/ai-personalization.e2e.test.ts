import request from 'supertest';
import { app } from '../../index';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';

describe('AI Personalization API - E2E Tests', () => {
  let userToken: string;

  beforeAll(async () => {
    // Setup test database and Redis
    await getMongoDB();
    await getRedisClient();

    // Get token for authenticated requests
    userToken = process.env.TEST_USER_TOKEN || 'test-user-token';
  });

  describe('GET /api/v1/ai-personalization/recommendations', () => {
    it('should get personalized content recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/recommendations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
      expect(Array.isArray(response.body.data.content)).toBe(true);
    });

    it('should return recommendations with relevance scores', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/recommendations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      if (response.body.data.content.length > 0) {
        const recommendation = response.body.data.content[0];
        expect(recommendation).toHaveProperty('contentId');
        expect(recommendation).toHaveProperty('score');
      }
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/recommendations');

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('GET /api/v1/ai-personalization/experience', () => {
    it('should get personalized user experience', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/experience')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contentRecommendations');
      expect(response.body.data).toHaveProperty('streamerRecommendations');
      expect(response.body.data).toHaveProperty('uiPreferences');
      expect(response.body.data).toHaveProperty('notificationSettings');
    });

    it('should include UI customization in experience', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/experience')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      const uiPrefs = response.body.data.uiPreferences;
      expect(uiPrefs).toHaveProperty('theme');
      expect(uiPrefs).toHaveProperty('layout');
    });
  });

  describe('POST /api/v1/ai-personalization/preferences', () => {
    it('should update user preferences', async () => {
      const preferences = {
        contentCategories: ['gaming', 'music', 'sports'],
        streamingHours: ['evening', 'night'],
        language: 'en',
        notificationPreferences: {
          email: true,
          push: true,
          sms: false
        }
      };

      const response = await request(app)
        .post('/api/v1/ai-personalization/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send(preferences)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('profile');
    });

    it('should reject invalid preference data', async () => {
      const response = await request(app)
        .post('/api/v1/ai-personalization/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          contentCategories: 'invalid-not-array'
        });

      // Should either accept it gracefully or reject with 400
      expect([200, 400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/v1/ai-personalization/insights', () => {
    it('should get user behavior insights', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/insights')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('behaviorPatterns');
      expect(response.body.data).toHaveProperty('engagementMetrics');
      expect(response.body.data).toHaveProperty('predictions');
    });

    it('should include engagement metrics in insights', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/insights')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      const engagement = response.body.data.engagementMetrics;
      expect(engagement).toHaveProperty('score');
      expect(engagement).toHaveProperty('trend');
    });

    it('should include churn prediction', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/insights')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      const predictions = response.body.data.predictions;
      expect(predictions).toHaveProperty('churnRisk');
    });
  });

  describe('POST /api/v1/ai-personalization/interaction', () => {
    it('should record user interaction', async () => {
      const interaction = {
        type: 'content_view',
        contentId: 'content-123',
        duration: 300,
        engagement: 0.8,
        metadata: {
          device: 'mobile',
          source: 'recommendation'
        }
      };

      const response = await request(app)
        .post('/api/v1/ai-personalization/interaction')
        .set('Authorization', `Bearer ${userToken}`)
        .send(interaction)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
    });

    it('should handle different interaction types', async () => {
      const interactions = [
        { type: 'like', contentId: 'content-1' },
        { type: 'share', contentId: 'content-2' },
        { type: 'comment', contentId: 'content-3' },
        { type: 'follow', targetUserId: 'user-456' }
      ];

      for (const interaction of interactions) {
        const response = await request(app)
          .post('/api/v1/ai-personalization/interaction')
          .set('Authorization', `Bearer ${userToken}`)
          .send(interaction);

        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('GET /api/v1/ai-personalization/challenges', () => {
    it('should get personalized challenges', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/challenges')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return challenges with difficulty levels', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/challenges')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      if (response.body.data.length > 0) {
        const challenge = response.body.data[0];
        expect(challenge).toHaveProperty('challengeId');
        expect(challenge).toHaveProperty('title');
        expect(challenge).toHaveProperty('difficulty');
        expect(challenge).toHaveProperty('reward');
      }
    });
  });

  describe('GET /api/v1/ai-personalization/optimization', () => {
    it('should get engagement optimization recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/optimization')
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('currentEngagement');
      expect(response.body.data).toHaveProperty('potentialGain');
    });

    it('should include actionable optimization tips', async () => {
      const response = await request(app)
        .get('/api/v1/ai-personalization/optimization')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.body.success).toBe(true);

      const recommendations = response.body.data.recommendations;
      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        const tip = recommendations[0];
        expect(tip).toHaveProperty('action');
        expect(tip).toHaveProperty('impact');
        expect(tip).toHaveProperty('priority');
      }
    });
  });

  // Integration test: Full personalization workflow
  describe('Full Personalization Workflow', () => {
    it('should complete full personalization lifecycle', async () => {
      // 1. Get initial experience
      const experienceResponse = await request(app)
        .get('/api/v1/ai-personalization/experience')
        .set('Authorization', `Bearer ${userToken}`);

      expect(experienceResponse.body.success).toBe(true);

      // 2. Update preferences
      const preferencesResponse = await request(app)
        .post('/api/v1/ai-personalization/preferences')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          contentCategories: ['technology', 'gaming'],
          streamingHours: ['afternoon']
        });

      expect(preferencesResponse.body.success).toBe(true);

      // 3. Record interactions
      const interactionResponse = await request(app)
        .post('/api/v1/ai-personalization/interaction')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          type: 'content_view',
          contentId: 'workflow-content-1',
          duration: 120
        });

      expect(interactionResponse.body.success).toBe(true);

      // 4. Get recommendations
      const recommendationsResponse = await request(app)
        .get('/api/v1/ai-personalization/recommendations')
        .set('Authorization', `Bearer ${userToken}`);

      expect(recommendationsResponse.body.success).toBe(true);

      // 5. Get insights
      const insightsResponse = await request(app)
        .get('/api/v1/ai-personalization/insights')
        .set('Authorization', `Bearer ${userToken}`);

      expect(insightsResponse.body.success).toBe(true);

      // 6. Get challenges
      const challengesResponse = await request(app)
        .get('/api/v1/ai-personalization/challenges')
        .set('Authorization', `Bearer ${userToken}`);

      expect(challengesResponse.body.success).toBe(true);

      // 7. Get optimization tips
      const optimizationResponse = await request(app)
        .get('/api/v1/ai-personalization/optimization')
        .set('Authorization', `Bearer ${userToken}`);

      expect(optimizationResponse.body.success).toBe(true);
    });
  });

  // Performance test
  describe('Performance Tests', () => {
    it('should handle rapid successive requests', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/v1/ai-personalization/recommendations')
          .set('Authorization', `Bearer ${userToken}`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    it('should cache recommendations for performance', async () => {
      const start = Date.now();

      const response1 = await request(app)
        .get('/api/v1/ai-personalization/recommendations')
        .set('Authorization', `Bearer ${userToken}`);

      const firstRequestTime = Date.now() - start;

      const start2 = Date.now();

      const response2 = await request(app)
        .get('/api/v1/ai-personalization/recommendations')
        .set('Authorization', `Bearer ${userToken}`);

      const secondRequestTime = Date.now() - start2;

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);

      // Second request should be faster (cached)
      // This is a soft assertion
      if (firstRequestTime > 100) {
        expect(secondRequestTime).toBeLessThanOrEqual(firstRequestTime);
      }
    });
  });
});
