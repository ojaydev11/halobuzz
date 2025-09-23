import { Injectable } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class WithdrawalsService {
  constructor(private readonly walletService: WalletService) {}

  async requestWithdrawal(userId: string, region: string, amountCoins: number) {
    const minCoins = region === 'NPR' ? 5000 : 10000;
    if (amountCoins < minCoins) throw new Error('Below minimum withdrawal threshold');
    await this.walletService.debit(userId, amountCoins);
    return { success: true, status: 'pending_admin_approval', amountCoins };
  }
}

