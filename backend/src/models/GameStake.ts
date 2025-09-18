import mongoose, { Document, Schema } from 'mongoose';

export interface IGameStake extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: mongoose.Types.ObjectId;
  roundId: string;
  stakeAmount: number;
  selectedOption?: number; // For games with choices
  result: 'pending' | 'won' | 'lost';
  winAmount: number;
  payoutStatus: 'pending' | 'paid' | 'failed';
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const gameStakeSchema = new Schema<IGameStake>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    index: true
  },
  roundId: {
    type: String,
    required: true,
    index: true
  },
  stakeAmount: {
    type: Number,
    required: true,
    min: 1
  },
  selectedOption: {
    type: Number,
    min: 0
  },
  result: {
    type: String,
    enum: ['pending', 'won', 'lost'],
    default: 'pending',
    index: true
  },
  winAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
gameStakeSchema.index({ userId: 1, gameId: 1, roundId: 1 });
gameStakeSchema.index({ roundId: 1, result: 1 });
gameStakeSchema.index({ userId: 1, createdAt: -1 });

export const GameStake = mongoose.model<IGameStake>('GameStake', gameStakeSchema);
