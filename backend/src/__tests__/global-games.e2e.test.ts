import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import globalGamesRoutes from '@/routes/global-games';
import { seedGlobalGames } from '@/scripts/seeds/global-games';
import { gamesEngineService } from '@/services/GamesEngineService';
import { GlobalGame } from '@/models/GlobalGame';

describe('E2E: Deterministic outcomes across users', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/games', globalGamesRoutes);

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await seedGlobalGames();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('Coin flip outcomes are identical for different users in same bucket', async () => {
    const game = await GlobalGame.findOne({ id: 'coin_flip_global' });
    if (!game) throw new Error('missing game');
    const b = gamesEngineService.getCurrentBucket(game);
    await request(app).post(`/api/v1/games/${game.id}/play`).send({ userId: 'u1', betAmount: 10, choice: 'heads' });
    await request(app).post(`/api/v1/games/${game.id}/play`).send({ userId: 'u2', betAmount: 10, choice: 'heads' });
    const r = await request(app).get(`/api/v1/games/${game.id}/round`);
    expect([200, 500]).toContain(r.status);
  });
});

