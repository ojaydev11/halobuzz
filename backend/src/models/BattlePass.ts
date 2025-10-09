import mongoose, { Document, Schema } from 'mongoose';

export interface IBattlePass extends Document {
  seasonId: string;
  name: string;
  description: string;
  theme: string;           // e.g., "Galactic Warriors", "Neon Nights"

  // Season Timeline
  schedule: {
    startDate: Date;
    endDate: Date;
    durationDays: number;
  };

  // Methods
  calculateMatchXP(result: 'win' | 'loss', performanceScore: number, isFirstWin: boolean, isInParty: boolean): number;
  getTierForXP(totalXP: number): number;

  // Pass Tiers
  tiers: {
    level: number;         // 1-100 typically
    xpRequired: number;    // Cumulative XP to reach this tier
    freeRewards: {
      type: 'coins' | 'skin' | 'emote' | 'banner' | 'title' | 'avatar' | 'xp-boost';
      itemId: string;
      quantity: number;
      name: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    }[];
    premiumRewards: {
      type: 'coins' | 'skin' | 'emote' | 'banner' | 'title' | 'avatar' | 'xp-boost';
      itemId: string;
      quantity: number;
      name: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    }[];
  }[];

  // Pricing
  pricing: {
    premiumCost: number;     // Cost in coins
    premiumPlusCost: number; // Includes +25 tiers instantly
    bundleCost: number;      // Premium + cosmetic bundle
  };

  // XP Calculation
  xpConfig: {
    baseXPPerMatch: number;
    winBonus: number;
    firstWinOfDay: number;
    performanceMultiplier: number; // Based on KDA, damage, etc.
    partyBonus: number;            // Bonus for playing with friends
    dailyQuestXP: number;
    weeklyQuestXP: number;
  };

  // Challenges & Quests
  dailyChallenges: {
    challengeId: string;
    name: string;
    description: string;
    requirement: {
      type: 'wins' | 'kills' | 'damage' | 'healing' | 'objectives' | 'playtime';
      target: number;
      gameMode?: string;
    };
    xpReward: number;
    coinReward?: number;
    expiresAt: Date;
    active: boolean;
  }[];

  weeklyChallenges: {
    challengeId: string;
    name: string;
    description: string;
    requirement: {
      type: 'wins' | 'kills' | 'damage' | 'healing' | 'objectives' | 'playtime';
      target: number;
      gameMode?: string;
    };
    xpReward: number;
    coinReward?: number;
    expiresAt: Date;
    active: boolean;
  }[];

  milestones: {
    level: number;
    name: string;
    description: string;
    specialReward: string; // e.g., "Exclusive Mythic Skin"
  }[];

  // Statistics
  stats: {
    totalPlayers: number;
    premiumOwners: number;
    averageLevel: number;
    maxLevelReached: number;
    totalXPEarned: number;
    conversionRate: number; // % who bought premium
  };

  // Featured Content
  featured: {
    showcaseSkin: string;
    showcaseVideo?: string;
    highlightTiers: number[]; // e.g., [10, 25, 50, 75, 100]
  };

  status: 'draft' | 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

const battlePassSchema = new Schema<IBattlePass>({
  seasonId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  theme: {
    type: String,
    required: true
  },
  schedule: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: Number
  },
  tiers: [{
    level: { type: Number, required: true },
    xpRequired: { type: Number, required: true },
    freeRewards: [{
      type: { type: String, enum: ['coins', 'skin', 'emote', 'banner', 'title', 'avatar', 'xp-boost'] },
      itemId: String,
      quantity: { type: Number, default: 1 },
      name: String,
      rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary', 'mythic'] }
    }],
    premiumRewards: [{
      type: { type: String, enum: ['coins', 'skin', 'emote', 'banner', 'title', 'avatar', 'xp-boost'] },
      itemId: String,
      quantity: { type: Number, default: 1 },
      name: String,
      rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary', 'mythic'] }
    }]
  }],
  pricing: {
    premiumCost: { type: Number, default: 10000 },    // 10,000 coins (~$10)
    premiumPlusCost: { type: Number, default: 25000 }, // 25,000 coins (~$25)
    bundleCost: { type: Number, default: 35000 }       // 35,000 coins (~$35)
  },
  xpConfig: {
    baseXPPerMatch: { type: Number, default: 100 },
    winBonus: { type: Number, default: 50 },
    firstWinOfDay: { type: Number, default: 200 },
    performanceMultiplier: { type: Number, default: 1.5 },
    partyBonus: { type: Number, default: 25 },
    dailyQuestXP: { type: Number, default: 500 },
    weeklyQuestXP: { type: Number, default: 2000 }
  },
  dailyChallenges: [{
    challengeId: { type: String, required: true },
    name: String,
    description: String,
    requirement: {
      type: { type: String, enum: ['wins', 'kills', 'damage', 'healing', 'objectives', 'playtime'] },
      target: Number,
      gameMode: String
    },
    xpReward: Number,
    coinReward: Number,
    expiresAt: Date,
    active: { type: Boolean, default: true }
  }],
  weeklyChallenges: [{
    challengeId: { type: String, required: true },
    name: String,
    description: String,
    requirement: {
      type: { type: String, enum: ['wins', 'kills', 'damage', 'healing', 'objectives', 'playtime'] },
      target: Number,
      gameMode: String
    },
    xpReward: Number,
    coinReward: Number,
    expiresAt: Date,
    active: { type: Boolean, default: true }
  }],
  milestones: [{
    level: Number,
    name: String,
    description: String,
    specialReward: String
  }],
  stats: {
    totalPlayers: { type: Number, default: 0 },
    premiumOwners: { type: Number, default: 0 },
    averageLevel: { type: Number, default: 0 },
    maxLevelReached: { type: Number, default: 0 },
    totalXPEarned: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  featured: {
    showcaseSkin: String,
    showcaseVideo: String,
    highlightTiers: [Number]
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'ended'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Indexes
battlePassSchema.index({ seasonId: 1 }, { unique: true });
battlePassSchema.index({ status: 1, 'schedule.startDate': 1 });

// Pre-save middleware
battlePassSchema.pre('save', function(next) {
  // Calculate duration
  this.schedule.durationDays = Math.ceil(
    (this.schedule.endDate.getTime() - this.schedule.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate conversion rate
  if (this.stats.totalPlayers > 0) {
    this.stats.conversionRate = (this.stats.premiumOwners / this.stats.totalPlayers) * 100;
  }

  next();
});

// Method to calculate XP for match
battlePassSchema.methods.calculateMatchXP = function(
  result: 'win' | 'loss',
  performanceScore: number,
  isFirstWin: boolean,
  isInParty: boolean
): number {
  let xp = this.xpConfig.baseXPPerMatch;

  // Win bonus
  if (result === 'win') {
    xp += this.xpConfig.winBonus;
  }

  // First win of the day
  if (isFirstWin) {
    xp += this.xpConfig.firstWinOfDay;
  }

  // Performance multiplier
  xp += Math.floor(performanceScore * this.xpConfig.performanceMultiplier);

  // Party bonus
  if (isInParty) {
    xp += this.xpConfig.partyBonus;
  }

  return xp;
};

// Method to get tier for XP amount
battlePassSchema.methods.getTierForXP = function(totalXP: number): number {
  for (let i = this.tiers.length - 1; i >= 0; i--) {
    if (totalXP >= this.tiers[i].xpRequired) {
      return this.tiers[i].level;
    }
  }
  return 1;
};

// Static method to get active battle pass
battlePassSchema.statics.getActive = function() {
  return this.findOne({
    status: 'active',
    'schedule.startDate': { $lte: new Date() },
    'schedule.endDate': { $gte: new Date() }
  });
};

export const BattlePass = mongoose.model<IBattlePass>('BattlePass', battlePassSchema);

// Player Battle Pass Progress Model
export interface IPlayerBattlePass extends Document {
  userId: string;
  seasonId: string;

  // Progress
  currentLevel: number;
  totalXP: number;
  xpToNextLevel: number;

  // Methods
  addXP(xpAmount: number, battlePass: IBattlePass): Promise<number>;
  claimReward(level: number, rewardType: 'free' | 'premium'): boolean;
  purchasePremium(tier: 'premium' | 'premium-plus', cost: number): void;

  // Premium Status
  hasPremium: boolean;
  hasPremiumPlus: boolean;
  purchasedAt?: Date;
  purchaseAmount: number;

  // Rewards Claimed
  claimedRewards: {
    level: number;
    rewardType: 'free' | 'premium';
    itemId: string;
    claimedAt: Date;
  }[];

  // Daily/Weekly Progress
  dailyChallengeProgress: {
    challengeId: string;
    progress: number;
    completed: boolean;
    claimedAt?: Date;
  }[];

  weeklyChallengeProgress: {
    challengeId: string;
    progress: number;
    completed: boolean;
    claimedAt?: Date;
  }[];

  // Statistics
  stats: {
    matchesPlayed: number;
    totalXPEarned: number;
    challengesCompleted: number;
    firstWinsCollected: number;
    lastPlayedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const playerBattlePassSchema = new Schema<IPlayerBattlePass>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  seasonId: {
    type: String,
    required: true,
    index: true
  },
  currentLevel: {
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
    default: 1000
  },
  hasPremium: {
    type: Boolean,
    default: false
  },
  hasPremiumPlus: {
    type: Boolean,
    default: false
  },
  purchasedAt: Date,
  purchaseAmount: {
    type: Number,
    default: 0
  },
  claimedRewards: [{
    level: Number,
    rewardType: { type: String, enum: ['free', 'premium'] },
    itemId: String,
    claimedAt: Date
  }],
  dailyChallengeProgress: [{
    challengeId: String,
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    claimedAt: Date
  }],
  weeklyChallengeProgress: [{
    challengeId: String,
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    claimedAt: Date
  }],
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    totalXPEarned: { type: Number, default: 0 },
    challengesCompleted: { type: Number, default: 0 },
    firstWinsCollected: { type: Number, default: 0 },
    lastPlayedAt: Date
  }
}, {
  timestamps: true
});

// Compound index
playerBattlePassSchema.index({ userId: 1, seasonId: 1 }, { unique: true });
playerBattlePassSchema.index({ seasonId: 1, currentLevel: -1 }); // Leaderboard

// Method to add XP
playerBattlePassSchema.methods.addXP = async function(xpAmount: number, battlePass: IBattlePass): Promise<number> {
  this.totalXP += xpAmount;
  this.stats.totalXPEarned += xpAmount;

  // Calculate new level
  const newLevel = battlePass.getTierForXP(this.totalXP);
  const levelsGained = newLevel - this.currentLevel;

  if (levelsGained > 0) {
    this.currentLevel = newLevel;

    // Calculate XP to next level
    if (newLevel < battlePass.tiers.length) {
      const nextTier = battlePass.tiers.find(t => t.level === newLevel + 1);
      if (nextTier) {
        this.xpToNextLevel = nextTier.xpRequired - this.totalXP;
      }
    } else {
      this.xpToNextLevel = 0; // Max level reached
    }
  }

  this.stats.lastPlayedAt = new Date();
  await this.save();

  return levelsGained;
};

// Method to claim reward
playerBattlePassSchema.methods.claimReward = function(level: number, rewardType: 'free' | 'premium'): boolean {
  // Check if already claimed
  if (this.claimedRewards.some(r => r.level === level && r.rewardType === rewardType)) {
    return false;
  }

  // Check if premium reward and user doesn't have premium
  if (rewardType === 'premium' && !this.hasPremium) {
    return false;
  }

  // Check if level is unlocked
  if (level > this.currentLevel) {
    return false;
  }

  this.claimedRewards.push({
    level,
    rewardType,
    itemId: `tier-${level}-${rewardType}`,
    claimedAt: new Date()
  });

  return true;
};

// Method to purchase premium
playerBattlePassSchema.methods.purchasePremium = function(tier: 'premium' | 'premium-plus', cost: number): void {
  this.hasPremium = true;
  if (tier === 'premium-plus') {
    this.hasPremiumPlus = true;
    this.currentLevel = Math.min(this.currentLevel + 25, 100);
  }

  this.purchasedAt = new Date();
  this.purchaseAmount = cost;
};

export const PlayerBattlePass = mongoose.model<IPlayerBattlePass>('PlayerBattlePass', playerBattlePassSchema);
