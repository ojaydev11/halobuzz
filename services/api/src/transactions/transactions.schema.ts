import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  userId: string;

  @Prop({ enum: ['purchase', 'gift_send', 'gift_receive', 'withdraw', 'reward', 'throne', 'fee'], required: true })
  type: string;

  @Prop({ required: true })
  amountCoins: number; // positive for credit, negative for debit

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

