import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import walletRoutes from '@/routes/wallet';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';

jest.mock('axios', () => ({ post: jest.fn(async () => ({ data: 'Success' })) }));

describe('eSewa webhook idempotency', () => {
  const app = express();
  // Do not attach express.json; we need raw for webhooks
  app.use('/api/v1/wallet', walletRoutes);

  beforeAll(async () => {
    process.env.ESEWA_WEBHOOK_SECRET = 'testsecret';

    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await User.deleteMany({});
    await Transaction.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('processes once and subsequent replays are no-ops with 200', async () => {
    const user = await User.create({
      username: 'webhookuser',
      email: 'webhook@example.com',
      password: 'password',
      country: 'NP',
      language: 'en',
      coins: { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 }
    } as any);

    // Create pending transaction that will be completed by processing
    await new Transaction({
      userId: user._id,
      type: 'recharge',
      amount: 100,
      currency: 'NPR',
      status: 'pending',
      description: 'Test eSewa',
      metadata: { pid: 'PID_123' },
      netAmount: 100
    }).save();

    const payload = JSON.stringify({ pid: 'PID_123', rid: 'RID_ABC' });
    const sig = crypto.createHmac('sha256', process.env.ESEWA_WEBHOOK_SECRET!).update(payload).digest('hex');

    const first = await request(app)
      .post('/api/v1/wallet/webhooks/esewa')
      .set('x-webhook-signature', sig)
      .send(payload);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/v1/wallet/webhooks/esewa')
      .set('x-webhook-signature', sig)
      .send(payload);
    expect(second.status).toBe(200);
    expect(second.body.message).toMatch(/Already processed/);

    const refreshed = await User.findById(user._id);
    expect(refreshed?.coins?.balance).toBe(100);
  });
});


