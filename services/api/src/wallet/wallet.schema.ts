import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ default: 0 })
  coinBalance: number;

  @Prop({ default: 0 })
  bonusCoinBalance: number;

  @Prop({ default: 0 })
  lockedCoinBalance: number;

  @Prop({ default: 0 })
  totalGiftsSent: number;

  @Prop({ default: 0 })
  totalGiftsReceived: number;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

