import request from 'supertest';
import express from 'express';
import walletRoutes from '@/routes/wallet';

describe('Wallet pricing validator', () => {
  const app = express();
  app.use(express.json());
  // Mock auth
  app.use((req: any, _res, next) => { req.user = { userId: '000000000000000000000000' }; next(); });
  app.use('/api/v1/wallet', walletRoutes);

  it('rejects invalid NP pricing for eSewa', async () => {
    const res = await request(app)
      .post('/api/v1/wallet/recharge')
      .send({ amount: 10, paymentMethod: 'esewa', coins: 400 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid NP pricing/);
  });

  it('accepts valid NP pricing for Khalti', async () => {
    const res = await request(app)
      .post('/api/v1/wallet/recharge')
      .send({ amount: 10, paymentMethod: 'khalti', coins: 500 });
    // Will fail later without external mocks; we only assert validator passed
    expect(res.status).not.toBe(400);
  });
});


