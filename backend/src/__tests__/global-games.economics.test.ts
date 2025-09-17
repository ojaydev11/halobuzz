import mongoose from 'mongoose';
import { config } from 'dotenv';
config();
import { seedGlobalGames } from '../../scripts/seeds/global-games';
import { simulatePlays } from '../../scripts/play-sim';

describe('Global Games economics ~0.60 payout', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await seedGlobalGames();
  });
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const games = [
    'coin_flip_global','dice_high_low_global','spin_wheel_global','card_high_low_global',
    'single_card_draw_global','quick_draw_global','target_blast_global','color_rush_global'
  ];

  it('payout ratio in [0.58, 0.62] for each game (10k simulated plays)', async () => {
    for (const id of games) {
      const r = await simulatePlays(id, 200, 'uniform');
      expect(r.payoutRate).toBeGreaterThanOrEqual(0.58);
      expect(r.payoutRate).toBeLessThanOrEqual(0.62);
    }
  }, 180000);
});

