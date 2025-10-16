/**
 * Matchmaking Queue Model
 * Stores active matchmaking queues and player positions
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IMatchmakingQueue extends Document {
  queueId: string;
  gameType: string;
  gameMode: string;
  region: string;
  skillLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';
  players: Map<string, QueuePlayer>;
  maxPlayers: number;
  minPlayers: number;
  averageWaitTime: number;
  status: 'active' | 'matching' | 'full' | 'closed';
  createdAt: Date;
  lastUpdated: Date;
  version: number;
}

export interface QueuePlayer {
  userId: string;
  username: string;
  mmr: number;
  joinedAt: Date;
  estimatedWaitTime: number;
  priority: number; // VIP, premium users get higher priority
  preferences: {
    mapPreference?: string;
    rolePreference?: string;
    languagePreference?: string;
  };
}

const QueuePlayerSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  mmr: { type: Number, required: true, min: 0 },
  joinedAt: { type: Date, required: true },
  estimatedWaitTime: { type: Number, required: true, min: 0 },
  priority: { type: Number, required: true, min: 0, max: 10 },
  preferences: {
    mapPreference: { type: String },
    rolePreference: { type: String },
    languagePreference: { type: String }
  }
}, { _id: false });

const MatchmakingQueueSchema = new Schema({
  queueId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  gameType: { type: String, required: true },
  gameMode: { type: String, required: true },
  region: { type: String, required: true },
  skillLevel: { 
    type: String, 
    required: true,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster']
  },
  players: { 
    type: Map, 
    of: QueuePlayerSchema,
    default: new Map()
  },
  maxPlayers: { type: Number, required: true, min: 2 },
  minPlayers: { type: Number, required: true, min: 2 },
  averageWaitTime: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'matching', 'full', 'closed']
  },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'matchmaking_queues'
});

// Indexes for performance
MatchmakingQueueSchema.index({ queueId: 1 });
MatchmakingQueueSchema.index({ gameType: 1, gameMode: 1, region: 1 });
MatchmakingQueueSchema.index({ skillLevel: 1 });
MatchmakingQueueSchema.index({ status: 1 });
MatchmakingQueueSchema.index({ createdAt: 1 });

// TTL index to automatically clean up old queues after 1 hour
MatchmakingQueueSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 3600 });

// Pre-save hook to update version and timestamp
MatchmakingQueueSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  this.version += 1;
  next();
});

export const MatchmakingQueue = mongoose.model<IMatchmakingQueue>('MatchmakingQueue', MatchmakingQueueSchema);
