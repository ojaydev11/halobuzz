import mongoose, { Document, Schema, HydratedDocument } from 'mongoose';

export interface RoundTotals {
  bets: number;
  payouts: number;
}

export type RoundStatus = 'open' | 'locked' | 'settled';

export interface IGameRound extends Document {
  gameId: string;
  bucketStart: string; // ISO
  seedHash: string;
  seedRevealed?: string;
  outcome?: any;
  totals: RoundTotals;
  status: RoundStatus;
  createdAt: Date;
  updatedAt: Date;
}

const gameRoundSchema = new Schema<IGameRound>({
  gameId: { type: String, required: true, index: true },
  bucketStart: { type: String, required: true, index: true },
  seedHash: { type: String, required: true },
  seedRevealed: { type: String, default: undefined },
  outcome: { type: Schema.Types.Mixed, default: undefined },
  totals: {
    bets: { type: Number, default: 0 },
    payouts: { type: Number, default: 0 }
  },
  status: { type: String, enum: ['open','locked','settled'], default: 'open', index: true }
}, { timestamps: true });

gameRoundSchema.index({ gameId: 1, bucketStart: 1 }, { unique: true });

export const GameRound = mongoose.model<IGameRound>('GameRound', gameRoundSchema);

export type GameRoundDoc = HydratedDocument<IGameRound>;

