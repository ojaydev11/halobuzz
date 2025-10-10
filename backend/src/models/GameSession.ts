/**
 * GameSession Model
 * E-Sports Grade Game Session Tracking
 *
 * Tracks individual game sessions with complete metrics:
 * - Entry fees and rewards
 * - Performance metrics (FPS, latency)
 * - Anti-cheat flags
 * - Server-side validation
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IGameSession extends Document {
  sessionId: string;
  gameId: string;
  userId: mongoose.Types.ObjectId;

  // Financial
  entryFee: number;
  reward: number;
  platformRake: number; // Platform fee collected

  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds

  // Game Data
  score: number;
  rank?: number; // Placement in multiplayer
  metadata: {
    gameSpecific?: any; // Game-specific data (e.g., distance for runner, answers for trivia)
    difficulty?: string;
    mode?: string; // 'solo', 'multiplayer', 'tournament'
  };

  // Performance Metrics
  fpsMetrics: {
    samples: number[];
    avg: number;
    min: number;
    max: number;
    p95: number;
  };
  networkLatency?: {
    samples: number[];
    avg: number;
  };

  // Anti-Cheat
  antiCheatFlags: string[];
  suspicionScore: number; // 0-100, higher = more suspicious
  validated: boolean; // Server validated the score
  validationHash?: string; // Hash of game actions for verification

  // Status
  status: 'playing' | 'completed' | 'abandoned' | 'disqualified';

  // Tournament Info (if applicable)
  tournamentId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gameId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    entryFee: {
      type: Number,
      required: true,
      min: 0,
    },
    reward: {
      type: Number,
      default: 0,
      min: 0,
    },
    platformRake: {
      type: Number,
      default: 0,
      min: 0,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      min: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      min: 1,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    fpsMetrics: {
      samples: {
        type: [Number],
        default: [],
      },
      avg: {
        type: Number,
        default: 0,
      },
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
        default: 0,
      },
      p95: {
        type: Number,
        default: 0,
      },
    },
    networkLatency: {
      samples: {
        type: [Number],
        default: [],
      },
      avg: {
        type: Number,
        default: 0,
      },
    },
    antiCheatFlags: {
      type: [String],
      default: [],
    },
    suspicionScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    validated: {
      type: Boolean,
      default: false,
    },
    validationHash: {
      type: String,
    },
    status: {
      type: String,
      enum: ['playing', 'completed', 'abandoned', 'disqualified'],
      default: 'playing',
      index: true,
    },
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
GameSessionSchema.index({ userId: 1, gameId: 1, createdAt: -1 });
GameSessionSchema.index({ gameId: 1, score: -1 }); // For leaderboards
GameSessionSchema.index({ tournamentId: 1, score: -1 }); // For tournament rankings
GameSessionSchema.index({ status: 1, createdAt: -1 });
GameSessionSchema.index({ suspicionScore: -1 }); // For anti-cheat monitoring

// Calculate duration before saving
GameSessionSchema.pre('save', function (next) {
  if (this.endTime && this.startTime) {
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }

  // Calculate FPS metrics from samples
  if (this.fpsMetrics.samples.length > 0) {
    const sorted = [...this.fpsMetrics.samples].sort((a, b) => a - b);
    this.fpsMetrics.min = sorted[0];
    this.fpsMetrics.max = sorted[sorted.length - 1];
    this.fpsMetrics.avg = sorted.reduce((sum, fps) => sum + fps, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    this.fpsMetrics.p95 = sorted[p95Index];
  }

  // Calculate network latency
  if (this.networkLatency && this.networkLatency.samples.length > 0) {
    this.networkLatency.avg = this.networkLatency.samples.reduce((sum, lat) => sum + lat, 0) / this.networkLatency.samples.length;
  }

  next();
});

export const GameSession = mongoose.model<IGameSession>('GameSession', GameSessionSchema);
