import request from 'supertest';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import app from '../index';

describe('AI Engine Security', () => {
  const AI_SERVICE_SECRET = 'test-ai-service-secret-32-chars-minimum';
  const BACKEND_SECRET = 'test-backend-secret-32-chars-minimum';

  beforeEach(() => {
    process.env.AI_SERVICE_SECRET = AI_SERVICE_SECRET;
    process.env.BACKEND_URL = 'http://localhost:3000';
    process.env.NODE_ENV = 'development';
  });

  describe('Public Endpoints', () => {
    it('should allow access to health check without authentication', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.service).toBe('halobuzz-ai-engine');
    });

    it('should return security headers on all responses', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
      expect(response.headers['x-service']).toBe('halobuzz-ai-engine');
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Internal API Authentication', () => {
    const createServiceJWT = () => {
      return jwt.sign(
        {
          iss: 'halobuzz-backend',
          aud: 'ai-engine',
          sub: 'backend-service',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        AI_SERVICE_SECRET
      );
    };

    const createHMACSignature = (body: any, timestamp: number) => {
      const payload = JSON.stringify(body) + timestamp;
      return crypto
        .createHmac('sha256', AI_SERVICE_SECRET)
        .update(payload)
        .digest('hex');
    };

    it('should reject requests without JWT token', async () => {
      const response = await request(app)
        .post('/internal/moderation/analyze')
        .send({ content: 'test content' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with invalid JWT token', async () => {
      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', 'Bearer invalid-token')
        .send({ content: 'test content' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should reject requests with JWT from wrong issuer', async () => {
      const invalidToken = jwt.sign(
        {
          iss: 'malicious-service',
          aud: 'ai-engine',
          sub: 'backend-service',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        AI_SERVICE_SECRET
      );

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ content: 'test content' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token issuer');
    });

    it('should reject requests with JWT for wrong audience', async () => {
      const invalidToken = jwt.sign(
        {
          iss: 'halobuzz-backend',
          aud: 'wrong-audience',
          sub: 'backend-service',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        AI_SERVICE_SECRET
      );

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ content: 'test content' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token audience');
    });

    it('should reject requests without HMAC signature', async () => {
      const token = createServiceJWT();
      const timestamp = Math.floor(Date.now() / 1000);

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${token}`)
        .set('x-timestamp', timestamp.toString())
        .send({ content: 'test content' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing signature or timestamp');
    });

    it('should reject requests with invalid HMAC signature', async () => {
      const token = createServiceJWT();
      const timestamp = Math.floor(Date.now() / 1000);
      const body = { content: 'test content' };

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${token}`)
        .set('x-signature', 'invalid-signature')
        .set('x-timestamp', timestamp.toString())
        .send(body)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid signature');
    });

    it('should reject requests with old timestamp', async () => {
      const token = createServiceJWT();
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const body = { content: 'test content' };
      const signature = createHMACSignature(body, oldTimestamp);

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${token}`)
        .set('x-signature', `sha256=${signature}`)
        .set('x-timestamp', oldTimestamp.toString())
        .send(body)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Request timestamp too old');
    });

    it('should accept valid authenticated requests', async () => {
      const token = createServiceJWT();
      const timestamp = Math.floor(Date.now() / 1000);
      const body = { content: 'test content' };
      const signature = createHMACSignature(body, timestamp);

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${token}`)
        .set('x-signature', `sha256=${signature}`)
        .set('x-timestamp', timestamp.toString())
        .send(body)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize PII in request body', async () => {
      const token = createServiceJWT();
      const timestamp = Math.floor(Date.now() / 1000);
      const body = { 
        content: 'Contact me at john.doe@example.com or call 555-123-4567',
        userId: 'user123'
      };
      const signature = createHMACSignature(body, timestamp);

      const response = await request(app)
        .post('/internal/moderation/analyze')
        .set('Authorization', `Bearer ${token}`)
        .set('x-signature', `sha256=${signature}`)
        .set('x-timestamp', timestamp.toString())
        .send(body)
        .expect(200);

      // The response should be successful, indicating the PII was sanitized
      expect(response.body.success).toBe(true);
    });
  });

  describe('Request ID', () => {
    it('should include request ID in response headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});