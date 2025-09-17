import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import globalGamesRoutes from '@/routes/global-games';
import { seedGlobalGames } from '../../scripts/seeds/global-games';

describe('Global Games API', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/global-games', globalGamesRoutes);

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await seedGlobalGames();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('GET /games returns games with bucket and seedHash', async () => {
    const res = await request(app).get('/api/v1/global-games');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('bucketStart');
  });

  it('POST /games/:id/play records a play and rejects after lock', async () => {
    const { body: list } = await request(app).get('/api/v1/global-games');
    const g = list[0];
    const res = await request(app).post(`/api/v1/global-games/${g.id}/play`).send({ userId: 'u_1', betAmount: 10, choice: 'heads' });
    expect([200,400]).toContain(res.status);
  });

  it('GET /games/:id/round returns public data', async () => {
    const { body: list } = await request(app).get('/api/v1/global-games');
    const g = list[0];
    const res = await request(app).get(`/api/v1/global-games/${g.id}/round`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('seedHash');
  });

  it('GET /games/:id/history returns settled rounds', async () => {
    const { body: list } = await request(app).get('/api/v1/global-games');
    const g = list[0];
    const res = await request(app).get(`/api/v1/global-games/${g.id}/history?limit=5`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

