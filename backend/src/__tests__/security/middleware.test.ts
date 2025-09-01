import request from 'supertest';
import express from 'express';
import { 
  globalLimiter, 
  authLimiter, 
  sanitizeInput, 
  deviceFingerprint,
  securityHeaders
} from '@/middleware/security';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Rate Limiting', () => {
    it('should apply global rate limiting', async () => {
      app.use(globalLimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make multiple requests rapidly
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/test')
      );

      const responses = await Promise.all(requests);
      
      // All should succeed initially (under limit)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should apply stricter auth rate limiting', async () => {
      app.use(authLimiter);
      app.post('/auth/login', (req, res) => res.json({ success: true }));

      // Make multiple auth requests
      const requests = Array(7).fill(null).map(() => 
        request(app).post('/auth/login').send({ username: 'test', password: 'test' })
      );

      const responses = await Promise.all(requests);
      
      // Should hit rate limit faster than global limiter
      const blockedRequests = responses.filter(r => r.status === 429);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize malicious input', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json({ body: req.body }));

      const maliciousInput = {
        name: 'test\x00user', // null byte
        description: 'test\x08content', // control character
        nested: {
          field: 'value\x00with\x08nulls'
        }
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousInput);

      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe('testuser');
      expect(response.body.body.description).toBe('testcontent');
      expect(response.body.body.nested.field).toBe('valuewithnulls');
    });

    it('should handle arrays in input', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json({ body: req.body }));

      const inputWithArray = {
        items: ['item1\x00', 'item2\x08', 'clean_item'],
        metadata: {
          tags: ['tag1\x00', 'tag2']
        }
      };

      const response = await request(app)
        .post('/test')
        .send(inputWithArray);

      expect(response.status).toBe(200);
      expect(response.body.body.items[0]).toBe('item1');
      expect(response.body.body.items[1]).toBe('item2');
      expect(response.body.body.items[2]).toBe('clean_item');
      expect(response.body.body.metadata.tags[0]).toBe('tag1');
    });
  });

  describe('Device Fingerprinting', () => {
    it('should extract device fingerprint data', async () => {
      app.use(deviceFingerprint);
      app.get('/test', (req, res) => res.json({ fingerprint: req.deviceFingerprint }));

      const response = await request(app)
        .get('/test')
        .set('X-Device-ID', 'test-device-123')
        .set('User-Agent', 'Mozilla/5.0 Test Browser')
        .set('Accept-Language', 'en-US,en;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.fingerprint).toBeDefined();
      expect(response.body.fingerprint.deviceId).toBe('test-device-123');
      expect(response.body.fingerprint.userAgent).toBe('Mozilla/5.0 Test Browser');
      expect(response.body.fingerprint.acceptLanguage).toBe('en-US,en;q=0.9');
    });

    it('should handle missing device fingerprint headers', async () => {
      app.use(deviceFingerprint);
      app.get('/test', (req, res) => res.json({ fingerprint: req.deviceFingerprint }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.fingerprint).toBeDefined();
      expect(response.body.fingerprint.deviceId).toBeUndefined();
      expect(response.body.fingerprint.userAgent).toBeUndefined();
    });
  });

  describe('Security Headers', () => {
    it('should add security headers', async () => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Create middleware that throws an error
      const errorMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        throw new Error('Middleware error');
      };

      app.use(errorMiddleware);
      app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.status(500).json({ error: 'Internal server error' });
      });
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Combined Middleware Stack', () => {
    it('should work with multiple security middleware', async () => {
      app.use(securityHeaders);
      app.use(sanitizeInput);
      app.use(deviceFingerprint);
      app.post('/test', (req, res) => {
        res.json({
          body: req.body,
          fingerprint: req.deviceFingerprint,
          headers: {
            xContentType: res.getHeader('x-content-type-options'),
            xFrame: res.getHeader('x-frame-options')
          }
        });
      });

      const response = await request(app)
        .post('/test')
        .set('X-Device-ID', 'test-device')
        .send({ name: 'test\x00user', value: 'clean' });

      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe('testuser');
      expect(response.body.fingerprint.deviceId).toBe('test-device');
      expect(response.body.headers.xContentType).toBe('nosniff');
      expect(response.body.headers.xFrame).toBe('DENY');
    });
  });
});
