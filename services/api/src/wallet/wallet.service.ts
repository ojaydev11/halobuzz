import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './wallet.schema';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>,
    private readonly transactions: TransactionsService,
  ) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) wallet = await new this.walletModel({ userId }).save();
    return wallet;
  }

  async credit(userId: string, amount: number, txType: 'purchase' | 'gift_receive' | 'reward' | 'throne' | 'withdraw' | 'fee' = 'purchase', metadata?: Record<string, unknown>) {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.coinBalance += amount;
    await wallet.save();
    await this.transactions.record(userId, txType, amount, { reason: 'credit', ...(metadata || {}) });
    return wallet;
  }

  async debit(userId: string, amount: number, txType: 'gift_send' | 'withdraw' | 'throne' | 'fee' = 'fee', metadata?: Record<string, unknown>) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.coinBalance < amount) throw new Error('Insufficient balance');
    wallet.coinBalance -= amount;
    await wallet.save();
    await this.transactions.record(userId, txType, -amount, { reason: 'debit', ...(metadata || {}) });
    return wallet;
  }
}

