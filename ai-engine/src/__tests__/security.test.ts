import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  validateServiceJWT,
  validateHMACSignature,
  internalAPILimiter,
  sanitizeAIInput,
  aiSecurityHeaders
} from '../middleware/security';

describe('AI Engine Security', () => {
  let app: express.Application;
  const TEST_SECRET = 'test-secret-key-minimum-32-characters-long';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    process.env.AI_SERVICE_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.AI_SERVICE_SECRET;
  });

  describe('Service JWT Validation', () => {
    it('should accept valid JWT tokens', async () => {
      app.use(validateServiceJWT);
      app.get('/test', (req, res) => res.json({ success: true, auth: req.serviceAuth }));

      const token = jwt.sign(
        {
          iss: 'halobuzz-backend',
          aud: 'ai-engine',
          sub: 'service',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        TEST_SECRET
      );

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.auth).toBeDefined();
      expect(response.body.auth.iss).toBe('halobuzz-backend');
      expect(response.body.auth.aud).toBe('ai-engine');
    });

    it('should reject invalid JWT tokens', async () => {
      app.use(validateServiceJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid or expired token');
    });

    it('should reject tokens with wrong audience', async () => {
      app.use(validateServiceJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const token = jwt.sign(
        {
          iss: 'halobuzz-backend',
          aud: 'wrong-audience',
          sub: 'service'
        },
        TEST_SECRET
      );

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token audience');
    });

    it('should reject tokens with wrong issuer', async () => {
      app.use(validateServiceJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const token = jwt.sign(
        {
          iss: 'wrong-issuer',
          aud: 'ai-engine',
          sub: 'service'
        },
        TEST_SECRET
      );

      const response = await request(app)
        .get('/test')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token issuer');
    });

    it('should reject missing authorization header', async () => {
      app.use(validateServiceJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing or invalid authorization header');
    });
  });

  describe('HMAC Signature Validation', () => {
    it('should accept valid HMAC signatures', async () => {
      app.use(validateHMACSignature);
      app.post('/test', (req, res) => res.json({ success: true, body: req.body }));

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = { message: 'test content' };
      const payload = JSON.stringify(body) + timestamp;
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/test')
        .set('X-Signature', `sha256=${signature}`)
        .set('X-Timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid HMAC signatures', async () => {
      app.use(validateHMACSignature);
      app.post('/test', (req, res) => res.json({ success: true }));

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = { message: 'test content' };

      const response = await request(app)
        .post('/test')
        .set('X-Signature', 'sha256=invalid-signature')
        .set('X-Timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject old timestamps', async () => {
      app.use(validateHMACSignature);
      app.post('/test', (req, res) => res.json({ success: true }));

      const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 400 seconds ago
      const body = { message: 'test content' };
      const payload = JSON.stringify(body) + oldTimestamp;
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/test')
        .set('X-Signature', `sha256=${signature}`)
        .set('X-Timestamp', oldTimestamp)
        .send(body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Request timestamp too old');
    });

    it('should reject missing signature or timestamp', async () => {
      app.use(validateHMACSignature);
      app.post('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/test')
        .send({ message: 'test' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing signature or timestamp');
    });
  });

  describe('AI Input Sanitization', () => {
    it('should sanitize PII from input', async () => {
      app.use(sanitizeAIInput);
      app.post('/test', (req, res) => res.json({ body: req.body }));

      const inputWithPII = {
        content: 'My email is john@example.com and phone is 555-123-4567',
        text: 'Credit card: 4532-1234-5678-9012',
        message: 'Contact me at user@test.com or call (555) 987-6543'
      };

      const response = await request(app)
        .post('/test')
        .send(inputWithPII);

      expect(response.status).toBe(200);
      expect(response.body.body.content).toBe('My email is [EMAIL] and phone is [PHONE]');
      expect(response.body.body.text).toBe('Credit card: [CARD]');
      expect(response.body.body.message).toBe('Contact me at [EMAIL] or call [PHONE]');
    });

    it('should remove control characters', async () => {
      app.use(sanitizeAIInput);
      app.post('/test', (req, res) => res.json({ body: req.body }));

      const inputWithControlChars = {
        text: 'test\x00content\x08with\x1Fcontrol\x7Fchars'
      };

      const response = await request(app)
        .post('/test')
        .send(inputWithControlChars);

      expect(response.status).toBe(200);
      expect(response.body.body.text).toBe('testcontentwithcontrolchars');
    });
  });

  describe('Security Headers', () => {
    it('should add AI-specific security headers', async () => {
      app.use(aiSecurityHeaders);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-service']).toBe('halobuzz-ai-engine');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to AI endpoints', async () => {
      app.use(internalAPILimiter);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Make many requests rapidly
      const requests = Array(150).fill(null).map(() => 
        request(app).get('/test')
      );

      const responses = await Promise.all(requests);
      
      // Should hit rate limit
      const blockedRequests = responses.filter(r => r.status === 429);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });
  });

  describe('Combined Security Stack', () => {
    it('should work with full security middleware stack', async () => {
      app.use(aiSecurityHeaders);
      app.use(sanitizeAIInput);
      app.use(validateServiceJWT);
      app.use(validateHMACSignature);
      app.post('/internal/test', (req, res) => {
        res.json({
          success: true,
          body: req.body,
          auth: req.serviceAuth,
          headers: {
            xService: res.getHeader('x-service')
          }
        });
      });

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = { 
        content: 'Test content with email@example.com',
        message: 'AI processing request'
      };
      const payload = JSON.stringify(body) + timestamp;
      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(payload)
        .digest('hex');

      const token = jwt.sign(
        {
          iss: 'halobuzz-backend',
          aud: 'ai-engine',
          sub: 'service',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        TEST_SECRET
      );

      const response = await request(app)
        .post('/internal/test')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Signature', `sha256=${signature}`)
        .set('X-Timestamp', timestamp)
        .send(body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.body.content).toBe('Test content with [EMAIL]');
      expect(response.body.auth.iss).toBe('halobuzz-backend');
      expect(response.body.headers.xService).toBe('halobuzz-ai-engine');
    });

    it('should reject requests missing any security requirement', async () => {
      app.use(validateServiceJWT);
      app.use(validateHMACSignature);
      app.post('/internal/test', (req, res) => res.json({ success: true }));

      // Valid JWT but no HMAC
      const token = jwt.sign(
        {
          iss: 'halobuzz-backend',
          aud: 'ai-engine',
          sub: 'service'
        },
        TEST_SECRET
      );

      const response = await request(app)
        .post('/internal/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'test' });

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing AI service secret gracefully', async () => {
      delete process.env.AI_SERVICE_SECRET;
      
      app.use(validateServiceJWT);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .set('Authorization', 'Bearer valid-looking-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Service configuration error');
    });
  });
});
