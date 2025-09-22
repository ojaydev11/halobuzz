import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Wallet, WalletDocument } from './wallet.schema';

@Injectable()
export class WalletService {
  constructor(@InjectModel(Wallet.name) private readonly walletModel: Model<WalletDocument>) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.walletModel.findOne({ userId }).exec();
    if (!wallet) wallet = await new this.walletModel({ userId }).save();
    return wallet;
  }

  async credit(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    wallet.coinBalance += amount;
    await wallet.save();
    return wallet;
  }

  async debit(userId: string, amount: number) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.coinBalance < amount) throw new Error('Insufficient balance');
    wallet.coinBalance -= amount;
    await wallet.save();
    return wallet;
  }
}

