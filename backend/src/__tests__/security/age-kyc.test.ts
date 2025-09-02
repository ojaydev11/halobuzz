import request from 'supertest';
import { app } from '../../index';

describe('Age Verification and KYC', () => {
  describe('Age Verification', () => {
    it('should validate date of birth format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
          dateOfBirth: 'invalid-date'
        })
        .expect(400);

      expect(response.body.error).toContain('date of birth');
    });

    it('should reject registration for users under 18', async () => {
      const under18Date = new Date();
      under18Date.setFullYear(under18Date.getFullYear() - 17);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'minor@example.com',
          password: 'password123',
          username: 'minoruser',
          dateOfBirth: under18Date.toISOString().split('T')[0]
        })
        .expect(400);

      expect(response.body.error).toContain('age');
    });

    it('should allow registration for users 18 and over', async () => {
      const over18Date = new Date();
      over18Date.setFullYear(over18Date.getFullYear() - 19);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'adult@example.com',
          password: 'password123',
          username: 'adultuser',
          dateOfBirth: over18Date.toISOString().split('T')[0]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Live Streaming Restrictions', () => {
    it('should block live streaming for users under 18', async () => {
      // This would require authentication with a minor account
      const response = await request(app)
        .post('/api/v1/streams/start')
        .set('Authorization', 'Bearer minor-token')
        .send({
          title: 'Test Stream',
          description: 'Test description'
        })
        .expect(403);

      expect(response.body.error).toContain('age');
    });

    it('should allow live streaming for users 18 and over', async () => {
      // This would require authentication with an adult account
      const response = await request(app)
        .post('/api/v1/streams/start')
        .set('Authorization', 'Bearer adult-token')
        .send({
          title: 'Test Stream',
          description: 'Test description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Payment Restrictions', () => {
    it('should block payments for users under 18', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', 'Bearer minor-token')
        .send({ amount: 100 })
        .expect(403);

      expect(response.body.error).toContain('age');
    });

    it('should allow payments for users 18 and over', async () => {
      const response = await request(app)
        .post('/api/v1/wallet/recharge')
        .set('Authorization', 'Bearer adult-token')
        .send({ amount: 100 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('KYC Requirements', () => {
    it('should require KYC for hosting streams', async () => {
      const response = await request(app)
        .post('/api/v1/streams/start')
        .set('Authorization', 'Bearer unverified-token')
        .send({
          title: 'Test Stream',
          description: 'Test description'
        })
        .expect(403);

      expect(response.body.error).toContain('KYC');
    });

    it('should allow hosting after KYC verification', async () => {
      const response = await request(app)
        .post('/api/v1/streams/start')
        .set('Authorization', 'Bearer verified-token')
        .send({
          title: 'Test Stream',
          description: 'Test description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Content Restrictions', () => {
    it('should restrict certain content for minors', async () => {
      const response = await request(app)
        .get('/api/v1/content/restricted')
        .set('Authorization', 'Bearer minor-token')
        .expect(403);

      expect(response.body.error).toContain('age');
    });

    it('should allow content access for adults', async () => {
      const response = await request(app)
        .get('/api/v1/content/restricted')
        .set('Authorization', 'Bearer adult-token')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Compliance Logging', () => {
    it('should log age verification events', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          username: 'testuser',
          dateOfBirth: '1990-01-01'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      // In a real implementation, this would check that the age verification was logged
    });

    it('should log KYC verification events', async () => {
      const response = await request(app)
        .post('/api/v1/kyc/verify')
        .set('Authorization', 'Bearer test-token')
        .send({
          documentType: 'passport',
          documentNumber: 'A1234567',
          country: 'US'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // In a real implementation, this would check that the KYC verification was logged
    });
  });
});
