import mongoose from 'mongoose';
import { ogDailyBonusJob } from '@/cron/ogDailyBonus';
import { User } from '@/models/User';
import { OGTier } from '@/models/OGTier';

describe('OG Daily Bonus Job', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/halobuzz_test';
    await mongoose.connect(mongoUri);
    await User.deleteMany({});
    await (OGTier as any).deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('credits daily bonus to bonusBalance based on tier formula', async () => {
    await (OGTier as any).create({ tier: 1, name: 'Fresh OG', description: 'Tier 1', priceUSD: 0, priceCoins: 5000, duration: 15, benefits: { dailyBonus: 0, exclusiveGifts: [], chatPrivileges: [], customEmojis: [], profileBadge: 't1', prioritySupport: false, adFree: false, customUsername: false, streamSkins: [], giftDiscount: 0 }, isActive: true });

    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password',
      country: 'NP',
      language: 'en',
      ogLevel: 1,
      ogExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      coins: { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 }
    } as any);

    await ogDailyBonusJob();

    const updated = await User.findById(user._id);
    // floor(5000 * 0.6 / 15) = 200
    expect(updated?.coins?.bonusBalance).toBe(200);
    expect(updated?.coins?.balance).toBe(0);
  });
});


