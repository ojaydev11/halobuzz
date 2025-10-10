/**
 * MMRRating Model
 * Elo-based MMR System for Competitive Games
 *
 * Implements ranked matchmaking with:
 * - Elo rating system
 * - Seasonal resets
 * - Win/loss tracking
 * - Rank tiers
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IMMRRating extends Document {
  userId: mongoose.Types.ObjectId;
  gameId: string;

  // MMR (Matchmaking Rating)
  mmr: number; // Base: 1000, Range: 0-3000+
  peakMmr: number; // Highest MMR achieved
  startingMmr: number; // MMR at season start

  // Win/Loss Record
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // Auto-calculated percentage

  // Streak Tracking
  currentWinStreak: number;
  currentLossStreak: number;
  longestWinStreak: number;

  // Rank Tier
  rank: 'Unranked' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster';
  division: number; // 1-5 within each rank (5 = highest)

  // Competitive Stats
  gamesPlayed: number;
  lastMatchAt?: Date;
  lastRankChangeAt?: Date;

  // Season Info
  season: string; // e.g., '2025-Q4'
  seasonStartDate: Date;

  // Placement Matches
  placementMatchesRemaining: number;
  placementMatchesPlayed: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MMRRatingSchema = new Schema<IMMRRating>(
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
    mmr: {
      type: Number,
      default: 1000,
      min: 0,
    },
    peakMmr: {
      type: Number,
      default: 1000,
    },
    startingMmr: {
      type: Number,
      default: 1000,
    },
    wins: {
      type: Number,
      default: 0,
      min: 0,
    },
    losses: {
      type: Number,
      default: 0,
      min: 0,
    },
    draws: {
      type: Number,
      default: 0,
      min: 0,
    },
    winRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    currentWinStreak: {
      type: Number,
      default: 0,
    },
    currentLossStreak: {
      type: Number,
      default: 0,
    },
    longestWinStreak: {
      type: Number,
      default: 0,
    },
    rank: {
      type: String,
      enum: ['Unranked', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'],
      default: 'Unranked',
    },
    division: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastMatchAt: {
      type: Date,
    },
    lastRankChangeAt: {
      type: Date,
    },
    season: {
      type: String,
      required: true,
      index: true,
    },
    seasonStartDate: {
      type: Date,
      required: true,
    },
    placementMatchesRemaining: {
      type: Number,
      default: 5, // 5 placement matches to start
      min: 0,
    },
    placementMatchesPlayed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
MMRRatingSchema.index({ userId: 1, gameId: 1, season: 1 }, { unique: true });
MMRRatingSchema.index({ gameId: 1, season: 1, mmr: -1 }); // For leaderboards
MMRRatingSchema.index({ gameId: 1, season: 1, rank: 1, mmr: -1 }); // For rank-specific queries

// Calculate win rate before saving
MMRRatingSchema.pre('save', function (next) {
  const totalGames = this.wins + this.losses + this.draws;
  if (totalGames > 0) {
    this.winRate = (this.wins / totalGames) * 100;
  } else {
    this.winRate = 0;
  }

  // Update peak MMR
  if (this.mmr > this.peakMmr) {
    this.peakMmr = this.mmr;
  }

  next();
});

// Helper method to calculate rank from MMR
MMRRatingSchema.methods.updateRankFromMmr = function () {
  const mmr = this.mmr;

  if (this.placementMatchesRemaining > 0) {
    this.rank = 'Unranked';
    return;
  }

  if (mmr < 800) {
    this.rank = 'Bronze';
    this.division = Math.ceil((mmr - 0) / 160); // 0-799 = Bronze 1-5
  } else if (mmr < 1200) {
    this.rank = 'Silver';
    this.division = Math.ceil((mmr - 800) / 80); // 800-1199 = Silver 1-5
  } else if (mmr < 1600) {
    this.rank = 'Gold';
    this.division = Math.ceil((mmr - 1200) / 80); // 1200-1599 = Gold 1-5
  } else if (mmr < 2000) {
    this.rank = 'Platinum';
    this.division = Math.ceil((mmr - 1600) / 80); // 1600-1999 = Platinum 1-5
  } else if (mmr < 2400) {
    this.rank = 'Diamond';
    this.division = Math.ceil((mmr - 2000) / 80); // 2000-2399 = Diamond 1-5
  } else if (mmr < 2800) {
    this.rank = 'Master';
    this.division = Math.ceil((mmr - 2400) / 80); // 2400-2799 = Master 1-5
  } else {
    this.rank = 'Grandmaster';
    this.division = 1; // All Grandmasters are division 1
  }

  this.lastRankChangeAt = new Date();
};

export const MMRRating = mongoose.model<IMMRRating>('MMRRating', MMRRatingSchema);
