import mongoose from 'mongoose';
import { config } from 'dotenv';
config();
import { seedGlobalGames } from '../../scripts/seeds/global-games';
import { GlobalGame } from '@/models/GlobalGame';
import { gamesEngineService } from '@/services/GamesEngineService';

describe('RNG reproducibility per {gameId,bucketStart}', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await seedGlobalGames();
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('Same {gameId,bucketStart} yields identical outcome', async () => {
    const game = await GlobalGame.findOne({ id: 'coin_flip_global' });
    if (!game) throw new Error('game missing');
    const b = gamesEngineService.getCurrentBucket(game);
    const r1 = await gamesEngineService.getOrCreateRound(game, b.bucketStart);
    const settled1 = await gamesEngineService.resolveRound(game, r1.bucketStart);
    const settled2 = await gamesEngineService.resolveRound(game, r1.bucketStart);
    expect(JSON.stringify(settled1.outcome)).toBe(JSON.stringify(settled2.outcome));
  });
});

