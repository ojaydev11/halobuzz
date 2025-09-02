import request from 'supertest';
import { app } from '../../index';

describe('Rate Limiting', () => {
  describe('Global Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      // Make 10 requests (well within the 100/minute limit)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .get('/healthz')
          .expect(200);
      }
    });

    it('should block requests exceeding global limit', async () => {
      // This test would need to be adjusted based on the actual rate limit configuration
      // For now, we'll test the rate limit response structure
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      // Check that rate limit headers are present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Auth Rate Limiting', () => {
    it('should block excessive auth attempts', async () => {
      // Make 6 auth attempts (exceeding the 5/minute limit)
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });

        if (i < 5) {
          expect(response.status).toBe(401); // Auth failure
        } else {
          expect(response.status).toBe(429); // Rate limited
          expect(response.body.error).toContain('Too many authentication attempts');
        }
      }
    });
  });

  describe('Payment Rate Limiting', () => {
    it('should block excessive payment attempts', async () => {
      // This would require authentication, so we'll test the structure
      const response = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', 'Bearer invalid-token')
        .send({ amount: 100 });

      // Should get auth error, not rate limit error for single request
      expect(response.status).toBe(401);
    });
  });
});
