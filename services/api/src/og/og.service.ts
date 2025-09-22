import { Injectable } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { DEFAULT_DAILY_REWARD_COINS } from '@halobuzz/shared/constants';

@Injectable()
export class OgService {
  constructor(private readonly walletService: WalletService) {}

  async dailyReward(userId: string, ogLevel: number) {
    const multiplier = 1 + (ogLevel - 1) * 0.25;
    const coins = Math.floor(DEFAULT_DAILY_REWARD_COINS * multiplier);
    await this.walletService.credit(userId, coins);
    return { coins };
  }
}

