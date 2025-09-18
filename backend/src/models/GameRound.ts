import mongoose, { Document, Schema } from 'mongoose';

export interface IGameRound extends Document {
  gameId: mongoose.Types.ObjectId;
  roundId: string; // gameId-duration-bucket
  startAt: Date;
  endAt: Date;
  durationSec: number;
  seedHash: string; // HMAC for fairness disclosure
  outcomeIndex: number; // index of winning option
  optionsCount: number;
  totalStake: number;
  payoutPool: number;
  status: 'open' | 'closed' | 'settled';
  createdAt: Date;
  updatedAt: Date;
}

const gameRoundSchema = new Schema<IGameRound>({
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
  roundId: { type: String, required: true, unique: true, index: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  durationSec: { type: Number, required: true, min: 5 },
  seedHash: { type: String, required: true },
  outcomeIndex: { type: Number, required: true, min: 0 },
  optionsCount: { type: Number, required: true, min: 2 },
  totalStake: { type: Number, default: 0, min: 0 },
  payoutPool: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['open', 'closed', 'settled'], default: 'open', index: true }
}, { timestamps: true });

gameRoundSchema.index({ gameId: 1, endAt: -1 });

export const GameRound = mongoose.model<IGameRound>('GameRound', gameRoundSchema);


