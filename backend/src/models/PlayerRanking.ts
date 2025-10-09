import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayerRanking extends Document {
  userId: string;
  gameMode: 'halo-arena' | 'halo-royale' | 'halo-clash' | 'halo-rally' | 'halo-raids' | 'halo-tactics';

  // TrueSkill2 Rating System
  rating: {
    mu: number;           // Skill mean (25.0 default)
    sigma: number;        // Skill uncertainty (8.333 default)
    tau: number;          // Dynamics factor (0.083 default)
    beta: number;         // Skill difference factor (4.167 default)
  };

  // MMR and Ranking
  mmr: number;            // Matchmaking Rating (conservative estimate: μ - 3σ)
  displayMmr: number;     // Public-facing MMR (rounded)
  peakMmr: number;        // Highest MMR achieved
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Champion' | 'Legend';
  division: 1 | 2 | 3 | 4 | 5; // Within tier
  leaguePoints: number;   // LP for promotions (0-100)

  // Season Progress
  seasonId: string;
  wins: number;
  losses: number;
  winRate: number;        // Calculated: wins / (wins + losses)
  gamesPlayed: number;
  rankUpgames: number;    // Games played at current rank
  promoProgress: number;  // Games won in promotion series (best of 3 or 5)

  // Performance Stats
  stats: {
    averageKills: number;
    averageDeaths: number;
    averageAssists: number;
    kda: number;          // (Kills + Assists) / Deaths
    averageDamage: number;
    averageHealing: number;
    averageObjectives: number;
    mvpCount: number;
    aceCount: number;     // Team wipes
  };

  // Streak Tracking
  streak: {
    current: number;      // Positive for wins, negative for losses
    longestWin: number;
    longestLose: number;
  };

  // Rank History
  rankHistory: {
    tier: string;
    division: number;
    achievedAt: Date;
    mmr: number;
  }[];

  // Recent Form
  recentMatches: {
    matchId: string;
    result: 'win' | 'loss' | 'draw';
    mmrChange: number;
    performanceScore: number;
    timestamp: Date;
  }[];

  // Anti-Smurf Detection
  smurfDetection: {
    probability: number;  // 0-1 chance of being a smurf
    accountAge: number;   // Days since account creation
    performanceAnomaly: number; // How unusual is their performance
    rapidClimb: boolean;  // Climbing too fast?
    flaggedBy: string[];  // Reasons flagged
  };

  // Matchmaking Preferences
  preferences: {
    primaryRole?: 'assault' | 'support' | 'tank' | 'sniper' | 'specialist';
    secondaryRole?: 'assault' | 'support' | 'tank' | 'sniper' | 'specialist';
    autoFill: boolean;
    preferredRegion: string;
  };

  // Penalties & Restrictions
  penalties: {
    isRestricted: boolean;
    restrictionEnd?: Date;
    reason?: string;
    dodgeCount: number;   // Queue dodges this week
    afkCount: number;     // AFK violations
    toxicityScore: number; // 0-100, based on reports
  };

  lastMatchAt: Date;
  lastRankUpdateAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const playerRankingSchema = new Schema<IPlayerRanking>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  gameMode: {
    type: String,
    required: true,
    enum: ['halo-arena', 'halo-royale', 'halo-clash', 'halo-rally', 'halo-raids', 'halo-tactics']
  },
  rating: {
    mu: { type: Number, default: 25.0 },
    sigma: { type: Number, default: 8.333 },
    tau: { type: Number, default: 0.083 },
    beta: { type: Number, default: 4.167 }
  },
  mmr: { type: Number, default: 0, index: true },
  displayMmr: { type: Number, default: 0 },
  peakMmr: { type: Number, default: 0 },
  tier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Champion', 'Legend'],
    default: 'Bronze'
  },
  division: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 5
  },
  leaguePoints: { type: Number, default: 0, min: 0, max: 100 },
  seasonId: { type: String, required: true, index: true },
  wins: { type: Number, default: 0, min: 0 },
  losses: { type: Number, default: 0, min: 0 },
  winRate: { type: Number, default: 0, min: 0, max: 100 },
  gamesPlayed: { type: Number, default: 0, min: 0 },
  rankUpgames: { type: Number, default: 0, min: 0 },
  promoProgress: { type: Number, default: 0, min: 0, max: 5 },
  stats: {
    averageKills: { type: Number, default: 0 },
    averageDeaths: { type: Number, default: 0 },
    averageAssists: { type: Number, default: 0 },
    kda: { type: Number, default: 0 },
    averageDamage: { type: Number, default: 0 },
    averageHealing: { type: Number, default: 0 },
    averageObjectives: { type: Number, default: 0 },
    mvpCount: { type: Number, default: 0 },
    aceCount: { type: Number, default: 0 }
  },
  streak: {
    current: { type: Number, default: 0 },
    longestWin: { type: Number, default: 0 },
    longestLose: { type: Number, default: 0 }
  },
  rankHistory: [{
    tier: String,
    division: Number,
    achievedAt: Date,
    mmr: Number
  }],
  recentMatches: [{
    matchId: String,
    result: { type: String, enum: ['win', 'loss', 'draw'] },
    mmrChange: Number,
    performanceScore: Number,
    timestamp: Date
  }],
  smurfDetection: {
    probability: { type: Number, default: 0, min: 0, max: 1 },
    accountAge: { type: Number, default: 0 },
    performanceAnomaly: { type: Number, default: 0 },
    rapidClimb: { type: Boolean, default: false },
    flaggedBy: [String]
  },
  preferences: {
    primaryRole: {
      type: String,
      enum: ['assault', 'support', 'tank', 'sniper', 'specialist']
    },
    secondaryRole: {
      type: String,
      enum: ['assault', 'support', 'tank', 'sniper', 'specialist']
    },
    autoFill: { type: Boolean, default: true },
    preferredRegion: { type: String, default: 'us-east' }
  },
  penalties: {
    isRestricted: { type: Boolean, default: false },
    restrictionEnd: Date,
    reason: String,
    dodgeCount: { type: Number, default: 0 },
    afkCount: { type: Number, default: 0 },
    toxicityScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  lastMatchAt: Date,
  lastRankUpdateAt: Date
}, {
  timestamps: true
});

// Compound indexes for efficient queries
playerRankingSchema.index({ userId: 1, gameMode: 1, seasonId: 1 }, { unique: true });
playerRankingSchema.index({ gameMode: 1, tier: 1, division: 1, mmr: -1 }); // Leaderboards
playerRankingSchema.index({ seasonId: 1, mmr: -1 }); // Season leaderboards
playerRankingSchema.index({ gameMode: 1, 'smurfDetection.probability': -1 }); // Smurf detection
playerRankingSchema.index({ 'penalties.isRestricted': 1, 'penalties.restrictionEnd': 1 }); // Penalty management

// Pre-save middleware to calculate derived fields
playerRankingSchema.pre('save', function(next) {
  // Calculate win rate
  const totalGames = this.wins + this.losses;
  this.winRate = totalGames > 0 ? (this.wins / totalGames) * 100 : 0;

  // Calculate MMR from TrueSkill rating
  this.mmr = Math.max(0, this.rating.mu - (3 * this.rating.sigma));
  this.displayMmr = Math.round(this.mmr);

  // Update peak MMR
  if (this.mmr > this.peakMmr) {
    this.peakMmr = this.mmr;
  }

  // Calculate KDA
  if (this.stats.averageDeaths > 0) {
    this.stats.kda = (this.stats.averageKills + this.stats.averageAssists) / this.stats.averageDeaths;
  } else {
    this.stats.kda = this.stats.averageKills + this.stats.averageAssists;
  }

  // Keep only last 20 matches in history
  if (this.recentMatches.length > 20) {
    this.recentMatches = this.recentMatches.slice(-20);
  }

  next();
});

// Method to update rank after match
playerRankingSchema.methods.updateAfterMatch = function(
  result: 'win' | 'loss',
  performanceScore: number,
  mmrChange: number
): void {
  // Update wins/losses
  if (result === 'win') {
    this.wins++;
    this.streak.current = this.streak.current >= 0 ? this.streak.current + 1 : 1;
    if (this.streak.current > this.streak.longestWin) {
      this.streak.longestWin = this.streak.current;
    }
  } else {
    this.losses++;
    this.streak.current = this.streak.current <= 0 ? this.streak.current - 1 : -1;
    if (Math.abs(this.streak.current) > this.streak.longestLose) {
      this.streak.longestLose = Math.abs(this.streak.current);
    }
  }

  this.gamesPlayed++;
  this.rankUpgames++;

  // Add to recent matches
  this.recentMatches.push({
    matchId: `match_${Date.now()}`,
    result,
    mmrChange,
    performanceScore,
    timestamp: new Date()
  });

  this.lastMatchAt = new Date();
};

// Method to promote/demote rank
playerRankingSchema.methods.updateTierAndDivision = function(): boolean {
  const tierMMRThresholds = {
    'Bronze': 500,
    'Silver': 1000,
    'Gold': 1500,
    'Platinum': 2000,
    'Diamond': 2500,
    'Master': 3000,
    'Champion': 3500,
    'Legend': 4000
  };

  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Champion', 'Legend'];
  let newTier = this.tier;
  let rankChanged = false;

  // Determine tier based on MMR
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (this.mmr >= tierMMRThresholds[tiers[i] as keyof typeof tierMMRThresholds]) {
      newTier = tiers[i] as IPlayerRanking['tier'];
      break;
    }
  }

  // Check if tier changed
  if (newTier !== this.tier) {
    const oldTier = this.tier;
    this.tier = newTier;
    this.division = tiers.indexOf(newTier) > tiers.indexOf(oldTier) ? 5 : 1;
    this.rankUpgames = 0;
    this.leaguePoints = 0;

    // Add to rank history
    this.rankHistory.push({
      tier: newTier,
      division: this.division,
      achievedAt: new Date(),
      mmr: this.mmr
    });

    this.lastRankUpdateAt = new Date();
    rankChanged = true;
  }

  return rankChanged;
};

// Static method to get leaderboard
playerRankingSchema.statics.getLeaderboard = function(
  gameMode: string,
  seasonId: string,
  limit: number = 100,
  tier?: string
) {
  const query: any = { gameMode, seasonId };
  if (tier) query.tier = tier;

  return this.find(query)
    .sort({ mmr: -1, wins: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

// Static method to get player rank
playerRankingSchema.statics.getPlayerRank = async function(
  userId: string,
  gameMode: string,
  seasonId: string
): Promise<number> {
  const player = await this.findOne({ userId, gameMode, seasonId });
  if (!player) return 0;

  const rankAbove = await this.countDocuments({
    gameMode,
    seasonId,
    mmr: { $gt: player.mmr }
  });

  return rankAbove + 1;
};

export const PlayerRanking = mongoose.model<IPlayerRanking>('PlayerRanking', playerRankingSchema);
