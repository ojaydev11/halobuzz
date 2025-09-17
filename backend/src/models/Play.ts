import mongoose, { Document, Schema } from 'mongoose';

export type PlayResult = 'win'|'lose'|undefined;

export interface IPlay extends Document {
  userId: string;
  gameId: string;
  bucketStart: string; // ISO
  betAmount: number;
  choice?: any;
  result?: 'win'|'lose';
  payout?: number;
  createdAt: Date;
  updatedAt: Date;
}

const playSchema = new Schema<IPlay>({
  userId: { type: String, required: true, index: true },
  gameId: { type: String, required: true, index: true },
  bucketStart: { type: String, required: true, index: true },
  betAmount: { type: Number, required: true, min: 0 },
  choice: { type: Schema.Types.Mixed, default: undefined },
  result: { type: String, enum: ['win','lose'], default: undefined },
  payout: { type: Number, default: 0 }
}, { timestamps: true });

playSchema.index({ userId: 1, gameId: 1, bucketStart: 1 });

export const Play = mongoose.model<IPlay>('Play', playSchema);

