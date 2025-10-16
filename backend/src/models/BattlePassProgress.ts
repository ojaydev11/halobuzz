/**
 * Battle Pass Progress Model
 * Tracks user's progress through battle pass seasons
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IBattlePassProgress extends Document {
  userId: mongoose.Types.ObjectId;
  battlePassId: string;
  season: string;
  currentTier: number;
  currentXP: number;
  xpToNextTier: number;
  totalXP: number;
  premiumUnlocked: boolean;
  premiumPurchaseDate?: Date;
  completedTiers: Set<number>;
  claimedRewards: Set<string>;
  dailyQuests: Map<string, QuestProgress>;
  weeklyQuests: Map<string, QuestProgress>;
  seasonQuests: Map<string, QuestProgress>;
  lastActivity: Date;
  version: number;
}

export interface QuestProgress {
  questId: string;
  questType: 'daily' | 'weekly' | 'season';
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: Date;
  claimed: boolean;
  claimedAt?: Date;
  expiresAt: Date;
}

const QuestProgressSchema = new Schema({
  questId: { type: String, required: true },
  questType: { 
    type: String, 
    required: true,
    enum: ['daily', 'weekly', 'season']
  },
  progress: { type: Number, required: true, min: 0 },
  target: { type: Number, required: true, min: 1 },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  claimed: { type: Boolean, default: false },
  claimedAt: { type: Date },
  expiresAt: { type: Date, required: true }
}, { _id: false });

const BattlePassProgressSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  battlePassId: { type: String, required: true },
  season: { type: String, required: true },
  currentTier: { type: Number, required: true, min: 0 },
  currentXP: { type: Number, required: true, min: 0 },
  xpToNextTier: { type: Number, required: true, min: 0 },
  totalXP: { type: Number, required: true, min: 0 },
  premiumUnlocked: { type: Boolean, default: false },
  premiumPurchaseDate: { type: Date },
  completedTiers: { 
    type: [Number], 
    default: [] 
  },
  claimedRewards: { 
    type: [String], 
    default: [] 
  },
  dailyQuests: { 
    type: Map, 
    of: QuestProgressSchema,
    default: new Map()
  },
  weeklyQuests: { 
    type: Map, 
    of: QuestProgressSchema,
    default: new Map()
  },
  seasonQuests: { 
    type: Map, 
    of: QuestProgressSchema,
    default: new Map()
  },
  lastActivity: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'battlepass_progress'
});

// Compound index for efficient queries
BattlePassProgressSchema.index({ userId: 1, battlePassId: 1 }, { unique: true });
BattlePassProgressSchema.index({ season: 1 });
BattlePassProgressSchema.index({ currentTier: 1 });
BattlePassProgressSchema.index({ lastActivity: 1 });

// Pre-save hook to update version and timestamp
BattlePassProgressSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  this.version += 1;
  next();
});

export const BattlePassProgress = mongoose.model<IBattlePassProgress>('BattlePassProgress', BattlePassProgressSchema);
