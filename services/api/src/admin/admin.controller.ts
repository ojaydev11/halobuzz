import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StreamSession, StreamSessionDocument } from '../streams/streams.schema';
import { Transaction, TransactionDocument } from '../transactions/transactions.schema';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectModel(StreamSession.name) private readonly streamModel: Model<StreamSessionDocument>,
    @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
  ) {}

  @Get('overview')
  async overview() {
    const activeHosts = await this.streamModel.countDocuments({ isLive: true }).exec();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const earnings = await this.txModel.aggregate([
      { $match: { type: { $in: ['purchase', 'fee'] }, createdAt: { $gte: since } } },
      { $group: { _id: null, coins: { $sum: '$amountCoins' } } },
    ]);
    return {
      earningsLast24hCoins: earnings?.[0]?.coins || 0,
      activeHosts,
      suspiciousReports: 0,
    };
  }
}

