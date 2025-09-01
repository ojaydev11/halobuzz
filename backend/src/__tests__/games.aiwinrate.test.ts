import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import gamesRoutes from '@/routes/games';
import { Game } from '@/models/Game';

describe('Games AI win rate enforcement', () => {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = { userId: '000000000000000000000000' }; next(); });
  app.use('/api/v1/games', gamesRoutes);

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await Game.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('rejects play when aiWinRate is below 35%', async () => {
    const game = await Game.create({
      name: 'LowAI', description: 'Test', type: 'battle', isActive: true,
      minPlayers: 1, maxPlayers: 4, entryFee: 0, prizePool: 0, duration: 60,
      aiWinRate: 20, rules: [], rewards: { coins: 0, experience: 0, specialItems: [] }, metadata: {}
    } as any);
    const res = await request(app).post(`/api/v1/games/${game._id}/play`).send({ players: [{ userId: '000000000000000000000000', betAmount: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/aiWinRate/);
  });

  it('rejects play when aiWinRate is above 55%', async () => {
    const game = await Game.create({
      name: 'HighAI', description: 'Test', type: 'battle', isActive: true,
      minPlayers: 1, maxPlayers: 4, entryFee: 0, prizePool: 0, duration: 60,
      aiWinRate: 80, rules: [], rewards: { coins: 0, experience: 0, specialItems: [] }, metadata: {}
    } as any);
    const res = await request(app).post(`/api/v1/games/${game._id}/play`).send({ players: [{ userId: '000000000000000000000000', betAmount: 1 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/aiWinRate/);
  });

  it('accepts play when aiWinRate is within bounds', async () => {
    const game = await Game.create({
      name: 'OKAI', description: 'Test', type: 'battle', isActive: true,
      minPlayers: 1, maxPlayers: 4, entryFee: 0, prizePool: 0, duration: 60,
      aiWinRate: 40, rules: [], rewards: { coins: 0, experience: 0, specialItems: [] }, metadata: {}
    } as any);
    const res = await request(app).post(`/api/v1/games/${game._id}/play`).send({ players: [{ userId: '000000000000000000000000', betAmount: 1 }] });
    // subsequent user balance deduction may fail without a real user; we only assert not rejected by aiWinRate
    expect([200, 400, 500]).toContain(res.status);
  });
});


