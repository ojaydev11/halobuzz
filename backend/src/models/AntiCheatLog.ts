/**
 * AntiCheatLog Model
 * Comprehensive Anti-Cheat Logging System
 *
 * Tracks suspicious activities:
 * - Impossible scores
 * - Abnormal timing patterns
 * - Input rate anomalies
 * - Replay hash mismatches
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IAntiCheatLog extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: string;
  sessionId: string;

  // Flag Information
  flagType: 'impossible_score' | 'abnormal_timing' | 'input_rate_anomaly' | 'replay_mismatch' | 'network_manipulation' | 'client_modification' | 'pattern_recognition';
  severity: 'low' | 'medium' | 'high' | 'critical';

  // Details
  details: {
    expected?: any;
    actual?: any;
    deviation?: number;
    description?: string;
    evidence?: any;
  };

  // Context
  timestamp: Date;
  gameMode?: string;
  tournamentId?: mongoose.Types.ObjectId;

  // Action Taken
  actionTaken: 'none' | 'warning_issued' | 'score_invalidated' | 'session_terminated' | 'temporary_ban' | 'permanent_ban' | 'manual_review';
  actionedAt?: Date;
  actionedBy?: mongoose.Types.ObjectId; // Admin user ID

  // Review
  reviewed: boolean;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewNotes?: string;

  // Status
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';

  createdAt: Date;
  updatedAt: Date;
}

const AntiCheatLogSchema = new Schema<IAntiCheatLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    gameId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    flagType: {
      type: String,
      enum: ['impossible_score', 'abnormal_timing', 'input_rate_anomaly', 'replay_mismatch', 'network_manipulation', 'client_modification', 'pattern_recognition'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    gameMode: {
      type: String,
    },
    tournamentId: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
    },
    actionTaken: {
      type: String,
      enum: ['none', 'warning_issued', 'score_invalidated', 'session_terminated', 'temporary_ban', 'permanent_ban', 'manual_review'],
      default: 'none',
      index: true,
    },
    actionedAt: {
      type: Date,
    },
    actionedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNotes: {
      type: String,
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'false_positive'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
AntiCheatLogSchema.index({ userId: 1, createdAt: -1 });
AntiCheatLogSchema.index({ gameId: 1, severity: 1, createdAt: -1 });
AntiCheatLogSchema.index({ status: 1, severity: 1, createdAt: -1 });
AntiCheatLogSchema.index({ reviewed: 1, severity: 1, createdAt: -1 });

export const AntiCheatLog = mongoose.model<IAntiCheatLog>('AntiCheatLog', AntiCheatLogSchema);
