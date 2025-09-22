import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './transactions.schema';

@Injectable()
export class TransactionsService {
  constructor(@InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>) {}

  async record(userId: string, type: string, amountCoins: number, metadata?: Record<string, unknown>) {
    const doc = new this.txModel({ userId, type, amountCoins, metadata });
    return doc.save();
  }
}

