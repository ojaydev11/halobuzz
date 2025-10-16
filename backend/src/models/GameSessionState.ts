/**
 * Game Session State Model
 * Stores active game sessions and player states
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSessionState extends Document {
  sessionId: string;
  gameId: string;
  gameType: 'battle-royale' | 'tournament' | 'multiplayer' | 'ai-challenge' | 'skill' | 'strategy';
  status: 'waiting' | 'starting' | 'active' | 'paused' | 'finished';
  players: Map<string, PlayerState>;
  gameState: any; // Game-specific state
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  startTime?: Date;
  endTime?: Date;
  createdAt: Date;
  lastUpdated: Date;
  version: number;
}

export interface PlayerState {
  userId: string;
  username: string;
  level: number;
  avatar?: string;
  score: number;
  rank: number;
  status: 'active' | 'eliminated' | 'disconnected' | 'afk';
  stake: number;
  joinedAt: Date;
  lastAction: Date;
  gameData: any; // Player-specific game data
  position?: {
    x: number;
    y: number;
    z?: number;
  };
  health?: number;
  energy?: number;
  inventory?: string[];
}

const PlayerStateSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  level: { type: Number, required: true, min: 1 },
  avatar: { type: String },
  score: { type: Number, required: true, min: 0 },
  rank: { type: Number, required: true, min: 1 },
  status: { 
    type: String, 
    required: true,
    enum: ['active', 'eliminated', 'disconnected', 'afk']
  },
  stake: { type: Number, required: true, min: 0 },
  joinedAt: { type: Date, required: true },
  lastAction: { type: Date, required: true },
  gameData: { type: Schema.Types.Mixed },
  position: {
    x: { type: Number },
    y: { type: Number },
    z: { type: Number }
  },
  health: { type: Number, min: 0, max: 100 },
  energy: { type: Number, min: 0, max: 100 },
  inventory: { type: [String] }
}, { _id: false });

const GameSessionStateSchema = new Schema({
  sessionId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  gameId: { type: String, required: true },
  gameType: { 
    type: String, 
    required: true,
    enum: ['battle-royale', 'tournament', 'multiplayer', 'ai-challenge', 'skill', 'strategy']
  },
  status: { 
    type: String, 
    required: true,
    enum: ['waiting', 'starting', 'active', 'paused', 'finished']
  },
  players: { 
    type: Map, 
    of: PlayerStateSchema,
    default: new Map()
  },
  gameState: { type: Schema.Types.Mixed },
  currentRound: { type: Number, required: true, min: 0 },
  totalRounds: { type: Number, required: true, min: 1 },
  timeRemaining: { type: Number, required: true, min: 0 },
  startTime: { type: Date },
  endTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'game_session_states'
});

// Indexes for performance
GameSessionStateSchema.index({ sessionId: 1 });
GameSessionStateSchema.index({ gameId: 1 });
GameSessionStateSchema.index({ status: 1 });
GameSessionStateSchema.index({ gameType: 1 });
GameSessionStateSchema.index({ createdAt: 1 });
GameSessionStateSchema.index({ lastUpdated: 1 });

// TTL index to automatically clean up finished sessions after 24 hours
GameSessionStateSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 86400 });

// Pre-save hook to update version and timestamp
GameSessionStateSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  this.version += 1;
  next();
});

export const GameSessionState = mongoose.model<IGameSessionState>('GameSessionState', GameSessionStateSchema);
