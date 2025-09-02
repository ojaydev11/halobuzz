import request from 'supertest';
import { app } from '../../index';

describe('Security Headers', () => {
  describe('GET /healthz', () => {
    it('should return security headers', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
      expect(response.headers['x-download-options']).toBe('noopen');
      expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
      
      // Check HSTS header
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains');
      expect(response.headers['strict-transport-security']).toContain('preload');
      
      // Check CSP header
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      
      // Check that server header is removed
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should include request ID header', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/healthz')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject requests from disallowed origins', async () => {
      const response = await request(app)
        .get('/healthz')
        .set('Origin', 'https://malicious-site.com')
        .expect(200); // CORS error is handled by the CORS middleware

      // The response should not include CORS headers for disallowed origins
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/healthz')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type, Authorization')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });

  describe('HTTPS Enforcement', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/healthz')
        .set('x-forwarded-proto', 'http')
        .expect(301);

      expect(response.headers.location).toMatch(/^https:/);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
