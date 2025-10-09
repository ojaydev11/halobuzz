import mongoose, { Document, Schema } from 'mongoose';

export interface IHeroMastery extends Document {
  userId: string;
  heroId: string;
  heroName: string;

  // Mastery Level
  masteryLevel: number;  // 1-100
  totalXP: number;
  xpToNextLevel: number;

  // Statistics
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    kda: number;
    totalDamage: number;
    totalHealing: number;
    averageDamagePerGame: number;
    averageHealingPerGame: number;
    pentaKills: number;  // 5 kills in rapid succession
    quadraKills: number;
    tripleKills: number;
    doubleKills: number;
    longestKillStreak: number;
    firstBloodCount: number; // First kill of match
    clutchPlays: number;     // Won 1v3+ situations
  };

  // Ability Performance
  abilityStats: {
    abilityId: string;
    abilityName: string;
    timesUsed: number;
    successRate: number;   // % of times ability led to kill/assist
    averageDamage: number;
    averageHealing: number;
  }[];

  // Milestones & Mastery Rewards
  milestones: {
    level: number;
    name: string;
    achievedAt?: Date;
    reward: {
      type: 'title' | 'banner' | 'emote' | 'skin' | 'coins';
      itemId: string;
      name: string;
    };
  }[];

  // Achievements for this hero
  achievements: {
    achievementId: string;
    name: string;
    description: string;
    progress: number;
    target: number;
    completed: boolean;
    completedAt?: Date;
  }[];

  // Recent Performance
  recentGames: {
    matchId: string;
    result: 'win' | 'loss';
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    healing: number;
    duration: number;
    xpEarned: number;
    playedAt: Date;
  }[];

  // Best Performances
  bestPerformances: {
    mostKills: {
      kills: number;
      matchId: string;
      date: Date;
    };
    mostDamage: {
      damage: number;
      matchId: string;
      date: Date;
    };
    highestKDA: {
      kda: number;
      matchId: string;
      date: Date;
    };
    longestGame: {
      duration: number;
      matchId: string;
      date: Date;
    };
  };

  // Unlocks
  unlocks: {
    skins: string[];
    emotes: string[];
    voiceLines: string[];
    titles: string[];
  };

  lastPlayedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const heroMasterySchema = new Schema<IHeroMastery>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  heroId: {
    type: String,
    required: true,
    index: true
  },
  heroName: {
    type: String,
    required: true
  },
  masteryLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  totalXP: {
    type: Number,
    default: 0,
    min: 0
  },
  xpToNextLevel: {
    type: Number,
    default: 500
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    totalKills: { type: Number, default: 0 },
    totalDeaths: { type: Number, default: 0 },
    totalAssists: { type: Number, default: 0 },
    kda: { type: Number, default: 0 },
    totalDamage: { type: Number, default: 0 },
    totalHealing: { type: Number, default: 0 },
    averageDamagePerGame: { type: Number, default: 0 },
    averageHealingPerGame: { type: Number, default: 0 },
    pentaKills: { type: Number, default: 0 },
    quadraKills: { type: Number, default: 0 },
    tripleKills: { type: Number, default: 0 },
    doubleKills: { type: Number, default: 0 },
    longestKillStreak: { type: Number, default: 0 },
    firstBloodCount: { type: Number, default: 0 },
    clutchPlays: { type: Number, default: 0 }
  },
  abilityStats: [{
    abilityId: String,
    abilityName: String,
    timesUsed: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    averageDamage: { type: Number, default: 0 },
    averageHealing: { type: Number, default: 0 }
  }],
  milestones: [{
    level: Number,
    name: String,
    achievedAt: Date,
    reward: {
      type: { type: String, enum: ['title', 'banner', 'emote', 'skin', 'coins'] },
      itemId: String,
      name: String
    }
  }],
  achievements: [{
    achievementId: String,
    name: String,
    description: String,
    progress: { type: Number, default: 0 },
    target: Number,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  recentGames: [{
    matchId: String,
    result: { type: String, enum: ['win', 'loss'] },
    kills: Number,
    deaths: Number,
    assists: Number,
    damage: Number,
    healing: Number,
    duration: Number,
    xpEarned: Number,
    playedAt: Date
  }],
  bestPerformances: {
    mostKills: {
      kills: { type: Number, default: 0 },
      matchId: String,
      date: Date
    },
    mostDamage: {
      damage: { type: Number, default: 0 },
      matchId: String,
      date: Date
    },
    highestKDA: {
      kda: { type: Number, default: 0 },
      matchId: String,
      date: Date
    },
    longestGame: {
      duration: { type: Number, default: 0 },
      matchId: String,
      date: Date
    }
  },
  unlocks: {
    skins: [String],
    emotes: [String],
    voiceLines: [String],
    titles: [String]
  },
  lastPlayedAt: Date
}, {
  timestamps: true
});

// Compound indexes
heroMasterySchema.index({ userId: 1, heroId: 1 }, { unique: true });
heroMasterySchema.index({ heroId: 1, masteryLevel: -1 }); // Hero leaderboards
heroMasterySchema.index({ userId: 1, masteryLevel: -1 }); // User's best heroes

// Pre-save middleware
heroMasterySchema.pre('save', function(next) {
  // Calculate win rate
  const totalGames = this.stats.wins + this.stats.losses;
  if (totalGames > 0) {
    this.stats.winRate = (this.stats.wins / totalGames) * 100;
  }

  // Calculate KDA
  if (this.stats.totalDeaths > 0) {
    this.stats.kda = (this.stats.totalKills + this.stats.totalAssists) / this.stats.totalDeaths;
  } else {
    this.stats.kda = this.stats.totalKills + this.stats.totalAssists;
  }

  // Calculate averages
  if (this.stats.gamesPlayed > 0) {
    this.stats.averageDamagePerGame = this.stats.totalDamage / this.stats.gamesPlayed;
    this.stats.averageHealingPerGame = this.stats.totalHealing / this.stats.gamesPlayed;
  }

  // Keep only last 20 games
  if (this.recentGames.length > 20) {
    this.recentGames = this.recentGames.slice(-20);
  }

  next();
});

// Method to add game stats
heroMasterySchema.methods.addGameStats = function(gameStats: {
  result: 'win' | 'loss';
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
  healing: number;
  duration: number;
  multikills?: { double?: number; triple?: number; quadra?: number; penta?: number };
  firstBlood?: boolean;
  clutch?: boolean;
}): number {
  // Update stats
  this.stats.gamesPlayed++;
  if (gameStats.result === 'win') {
    this.stats.wins++;
  } else {
    this.stats.losses++;
  }

  this.stats.totalKills += gameStats.kills;
  this.stats.totalDeaths += gameStats.deaths;
  this.stats.totalAssists += gameStats.assists;
  this.stats.totalDamage += gameStats.damage;
  this.stats.totalHealing += gameStats.healing;

  // Multikills
  if (gameStats.multikills) {
    this.stats.doubleKills += gameStats.multikills.double || 0;
    this.stats.tripleKills += gameStats.multikills.triple || 0;
    this.stats.quadraKills += gameStats.multikills.quadra || 0;
    this.stats.pentaKills += gameStats.multikills.penta || 0;
  }

  // Special achievements
  if (gameStats.firstBlood) this.stats.firstBloodCount++;
  if (gameStats.clutch) this.stats.clutchPlays++;

  // Calculate XP earned
  let xpEarned = 100; // Base XP
  xpEarned += gameStats.kills * 10;
  xpEarned += gameStats.assists * 5;
  xpEarned += gameStats.damage / 100;
  if (gameStats.result === 'win') xpEarned *= 1.5;

  this.totalXP += xpEarned;

  // Check for level up
  const xpPerLevel = this.masteryLevel * 500; // Progressive XP requirement
  while (this.totalXP >= xpPerLevel && this.masteryLevel < 100) {
    this.masteryLevel++;
    this.checkMilestones();
  }

  // Update XP to next level
  this.xpToNextLevel = (this.masteryLevel * 500) - (this.totalXP % (this.masteryLevel * 500));

  // Add to recent games
  this.recentGames.push({
    matchId: `match_${Date.now()}`,
    result: gameStats.result,
    kills: gameStats.kills,
    deaths: gameStats.deaths,
    assists: gameStats.assists,
    damage: gameStats.damage,
    healing: gameStats.healing,
    duration: gameStats.duration,
    xpEarned,
    playedAt: new Date()
  });

  // Update best performances
  const kda = gameStats.deaths > 0
    ? (gameStats.kills + gameStats.assists) / gameStats.deaths
    : gameStats.kills + gameStats.assists;

  if (gameStats.kills > this.bestPerformances.mostKills.kills) {
    this.bestPerformances.mostKills = {
      kills: gameStats.kills,
      matchId: `match_${Date.now()}`,
      date: new Date()
    };
  }

  if (gameStats.damage > this.bestPerformances.mostDamage.damage) {
    this.bestPerformances.mostDamage = {
      damage: gameStats.damage,
      matchId: `match_${Date.now()}`,
      date: new Date()
    };
  }

  if (kda > this.bestPerformances.highestKDA.kda) {
    this.bestPerformances.highestKDA = {
      kda,
      matchId: `match_${Date.now()}`,
      date: new Date()
    };
  }

  this.lastPlayedAt = new Date();

  return xpEarned;
};

// Method to check and unlock milestones
heroMasterySchema.methods.checkMilestones = function(): string[] {
  const unlockedRewards: string[] = [];

  for (const milestone of this.milestones) {
    if (this.masteryLevel >= milestone.level && !milestone.achievedAt) {
      milestone.achievedAt = new Date();

      // Add unlocks based on reward type
      switch (milestone.reward.type) {
        case 'skin':
          this.unlocks.skins.push(milestone.reward.itemId);
          break;
        case 'emote':
          this.unlocks.emotes.push(milestone.reward.itemId);
          break;
        case 'title':
          this.unlocks.titles.push(milestone.reward.itemId);
          break;
      }

      unlockedRewards.push(milestone.reward.name);
    }
  }

  return unlockedRewards;
};

// Static method to get hero leaderboard
heroMasterySchema.statics.getHeroLeaderboard = function(heroId: string, limit: number = 100) {
  return this.find({ heroId })
    .sort({ masteryLevel: -1, totalXP: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

// Static method to get user's top heroes
heroMasterySchema.statics.getUserTopHeroes = function(userId: string, limit: number = 5) {
  return this.find({ userId })
    .sort({ masteryLevel: -1, totalXP: -1 })
    .limit(limit);
};

export const HeroMastery = mongoose.model<IHeroMastery>('HeroMastery', heroMasterySchema);
