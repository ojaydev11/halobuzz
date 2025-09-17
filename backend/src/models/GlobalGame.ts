import mongoose, { Document, Schema } from 'mongoose';

export interface GameKnobs {
  [key: string]: number;
}

export interface IGlobalGame extends Document {
  id: string; // stable id like coin_flip_global
  name: string;
  roundDurationSec: number;
  targetPayoutRate: number; // e.g., 0.60
  minBet: number;
  maxBet: number;
  knobs: GameKnobs;
  createdAt: Date;
  updatedAt: Date;
}

const globalGameSchema = new Schema<IGlobalGame>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  roundDurationSec: { type: Number, required: true, min: 5, max: 3600 },
  targetPayoutRate: { type: Number, required: true, min: 0, max: 1, default: 0.6 },
  minBet: { type: Number, required: true, min: 0 },
  maxBet: { type: Number, required: true, min: 0 },
  knobs: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

globalGameSchema.index({ id: 1 });

export const GlobalGame = mongoose.model<IGlobalGame>('GlobalGame', globalGameSchema);

