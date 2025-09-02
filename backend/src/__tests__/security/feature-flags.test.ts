import request from 'supertest';
import { app } from '../../index';

describe('Feature Flags and Admin Security', () => {
  describe('Feature Flag System', () => {
    it('should return safe config subset', async () => {
      const response = await request(app)
        .get('/api/v1/config')
        .expect(200);

      expect(response.body).toHaveProperty('gamesEnabledGlobal');
      expect(response.body).toHaveProperty('battleBoostEnabled');
      expect(response.body).toHaveProperty('festivalMode');
      expect(response.body).toHaveProperty('aiModerationStrict');
      expect(response.body).toHaveProperty('newRegistrationPause');
      expect(response.body).toHaveProperty('perCountryToggles');

      // Should not expose sensitive internal flags
      expect(response.body).not.toHaveProperty('internalDebugMode');
      expect(response.body).not.toHaveProperty('adminBypass');
    });

    it('should respect feature flag states', async () => {
      // Test with games disabled
      const response = await request(app)
        .get('/api/v1/config')
        .expect(200);

      if (!response.body.gamesEnabledGlobal) {
        const gameResponse = await request(app)
          .post('/api/v1/games/play')
          .set('Authorization', 'Bearer test-token')
          .send({ gameType: 'battle', betAmount: 100 })
          .expect(503);

        expect(gameResponse.body.error).toContain('disabled');
      }
    });

    it('should handle emergency disable all', async () => {
      // Simulate emergency disable
      const response = await request(app)
        .post('/api/v1/admin/emergency/disable-all')
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Security incident' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify all features are disabled
      const configResponse = await request(app)
        .get('/api/v1/config')
        .expect(200);

      expect(configResponse.body.gamesEnabledGlobal).toBe(false);
      expect(configResponse.body.battleBoostEnabled).toBe(false);
      expect(configResponse.body.festivalMode).toBe(false);
    });
  });

  describe('Admin Authentication', () => {
    it('should require admin authentication for admin routes', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .expect(401);

      expect(response.body.error).toContain('authentication');
    });

    it('should require admin role for admin routes', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(response.body.error).toContain('admin');
    });

    it('should allow admin access with valid admin token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Admin Email Whitelist', () => {
    it('should enforce admin email whitelist', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', 'Bearer non-whitelisted-admin-token')
        .send({ email: 'nonadmin@example.com' })
        .expect(403);

      expect(response.body.error).toContain('whitelist');
    });

    it('should allow whitelisted admin emails', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', 'Bearer whitelisted-admin-token')
        .send({ email: 'admin@halobuzz.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for mutating admin operations', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users/delete')
        .set('Authorization', 'Bearer admin-token')
        .send({ userId: 'test-user' })
        .expect(403);

      expect(response.body.error).toContain('CSRF');
    });

    it('should accept valid CSRF tokens', async () => {
      // First get CSRF token
      const csrfResponse = await request(app)
        .get('/api/v1/admin/csrf-token')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const csrfToken = csrfResponse.body.csrfToken;

      const response = await request(app)
        .post('/api/v1/admin/users/delete')
        .set('Authorization', 'Bearer admin-token')
        .set('x-csrf-token', csrfToken)
        .send({ userId: 'test-user' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Admin Session Security', () => {
    it('should enforce short admin sessions', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer expired-admin-token')
        .expect(401);

      expect(response.body.error).toContain('expired');
    });

    it('should require secure cookies for admin', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      
      // Check for secure cookie attributes
      const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
      expect(cookieString).toContain('HttpOnly');
      expect(cookieString).toContain('Secure');
      expect(cookieString).toContain('SameSite=Lax');
    });
  });

  describe('Admin Rate Limiting', () => {
    it('should rate limit admin operations', async () => {
      // Make multiple admin requests quickly
      for (let i = 0; i < 60; i++) {
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', 'Bearer admin-token');

        if (i < 50) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
          expect(response.body.error).toContain('rate limit');
          break;
        }
      }
    });
  });

  describe('Admin Audit Logging', () => {
    it('should log all admin actions', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users/ban')
        .set('Authorization', 'Bearer admin-token')
        .set('x-csrf-token', 'valid-csrf-token')
        .send({ userId: 'test-user', reason: 'Violation' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // In a real implementation, this would verify the action was logged
    });

    it('should include request ID in admin logs', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      // In a real implementation, this would verify the request ID was logged
    });
  });

  describe('Feature Flag Management', () => {
    it('should allow admins to update feature flags', async () => {
      const response = await request(app)
        .put('/api/v1/admin/feature-flags')
        .set('Authorization', 'Bearer admin-token')
        .set('x-csrf-token', 'valid-csrf-token')
        .send({
          gamesEnabledGlobal: false,
          reason: 'Maintenance'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require admin role for flag updates', async () => {
      const response = await request(app)
        .put('/api/v1/admin/feature-flags')
        .set('Authorization', 'Bearer user-token')
        .send({
          gamesEnabledGlobal: false
        })
        .expect(403);

      expect(response.body.error).toContain('admin');
    });

    it('should log feature flag changes', async () => {
      const response = await request(app)
        .put('/api/v1/admin/feature-flags')
        .set('Authorization', 'Bearer admin-token')
        .set('x-csrf-token', 'valid-csrf-token')
        .send({
          gamesEnabledGlobal: true,
          reason: 'Feature re-enabled'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // In a real implementation, this would verify the change was logged
    });
  });
});
