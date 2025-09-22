import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Throne, ThroneDocument } from './throne.schema';
import { WalletService } from '../wallet/wallet.service';
import { THRONE_PRICE_COINS, THRONE_VALIDITY_DAYS } from '@halobuzz/shared/constants';

@Injectable()
export class ThroneService {
  constructor(
    @InjectModel(Throne.name) private readonly throneModel: Model<ThroneDocument>,
    private readonly walletService: WalletService,
  ) {}

  async purchase(userId: string, streamId?: string) {
    await this.walletService.debit(userId, THRONE_PRICE_COINS);
    const now = new Date();
    const expires = new Date(now.getTime() + THRONE_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    const doc = new this.throneModel({ userId, streamId, purchasedAt: now, expiresAt: expires });
    return doc.save();
  }
}

