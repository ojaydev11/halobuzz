import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gift, GiftDocument } from './gifts.schema';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class GiftsService {
  constructor(
    @InjectModel(Gift.name) private readonly giftModel: Model<GiftDocument>,
    private readonly walletService: WalletService,
  ) {}

  async list() {
    return this.giftModel.find().exec();
  }

  async create(def: { code: string; name: string; coinCost: number; rarity?: string; animationUrl?: string }) {
    const doc = new this.giftModel(def);
    return doc.save();
  }

  async sendGift(senderUserId: string, receiverUserId: string, giftCode: string, multiplier = 1) {
    const gift = await this.giftModel.findOne({ code: giftCode }).exec();
    if (!gift) throw new Error('Gift not found');
    const totalCost = gift.coinCost * Math.max(1, multiplier);
    await this.walletService.debit(senderUserId, totalCost, 'gift_send', { gift: giftCode, multiplier });
    await this.walletService.credit(receiverUserId, Math.floor(totalCost * 0.7), 'gift_receive', {
      gift: giftCode,
      multiplier,
      gross: totalCost,
    }); // 70% to receiver
    return { success: true, gift: gift.code, multiplier, totalCost };
  }

  async seedDefaults() {
    const defaults = [
      { code: 'ROSE', name: 'Rose', coinCost: 10, rarity: 'common' },
      { code: 'HEART', name: 'Heart', coinCost: 20, rarity: 'common' },
      { code: 'CASTLE', name: 'Castle', coinCost: 1000, rarity: 'epic' },
      { code: 'DRAGON', name: 'Dragon', coinCost: 5000, rarity: 'legendary' },
    ];
    for (const g of defaults) {
      // eslint-disable-next-line no-await-in-loop
      await this.giftModel.updateOne({ code: g.code }, { $setOnInsert: g }, { upsert: true }).exec();
    }
    return { ok: true };
  }
}

