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
    await this.walletService.debit(senderUserId, totalCost);
    await this.walletService.credit(receiverUserId, Math.floor(totalCost * 0.7)); // 70% to receiver
    return { success: true, gift: gift.code, multiplier, totalCost };
  }
}

