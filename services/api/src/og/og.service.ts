import { Injectable, BadRequestException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { DEFAULT_DAILY_REWARD_COINS } from '@halobuzz/shared';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OgService {
  constructor(private readonly walletService: WalletService, private readonly redis: RedisService) {}

  async dailyReward(userId: string, ogLevel: number) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `og:daily:${userId}:${dateKey}`;
    const exists = await this.redis.redis.get(key);
    if (exists) throw new BadRequestException('Daily reward already claimed');
    const multiplier = 1 + (ogLevel - 1) * 0.25;
    const coins = Math.floor(DEFAULT_DAILY_REWARD_COINS * multiplier);
    await this.walletService.credit(userId, coins, 'reward', { source: 'daily' });
    const ttl = 24 * 60 * 60; // seconds
    await this.redis.redis.set(key, '1', 'EX', ttl);
    return { coins };
  }
}

