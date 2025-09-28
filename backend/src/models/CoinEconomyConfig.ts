import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinEconomyConfig extends Document {
  // Global Economy Settings
  isActive: boolean;
  maintenanceMode: boolean;

  // Coin Pricing (Base: NPR 100 = 500 coins)
  basePricing: {
    baseAmount: number; // Base fiat amount (100 NPR)
    baseCoins: number; // Coins for base amount (500)
    currency: string; // Base currency (NPR)
  };

  // Regional Pricing Adjustments
  regionalPricing: {
    country: string;
    currency: string;
    exchangeRate: number; // Rate to NPR
    localPrice: number; // Local price for base package
    bonusMultiplier: number; // Regional bonus (1.0 = no bonus)
    taxRate: number; // Local tax rate
  }[];

  // Coin Packages
  coinPackages: {
    id: string;
    name: string;
    coins: number;
    price: number; // In NPR
    bonusCoins: number;
    popularity: number; // 1-5 stars
    isVisible: boolean;
    targetAudience: 'new_users' | 'casual' | 'regular' | 'whales';
    usdPrice?: number; // For international users
  }[];

  // OG Membership Tiers
  ogTiers: {
    level: number; // 1-5
    name: string;
    monthlyPrice: number; // In coins
    yearlyPrice: number; // In coins (with discount)
    benefits: {
      bonusMultiplier: number; // Earning bonus
      dailyCoins: number; // Free daily coins
      giftingBonus: number; // Extra gifting power
      exclusiveFeatures: string[]; // List of exclusive features
      prioritySupport: boolean;
      customBadges: boolean;
      earlyAccess: boolean;
    };
    requirements?: {
      minSpending: number; // Min monthly spending to maintain
      minActivity: number; // Min days active per month
    };
  }[];

  // Premium Features Pricing
  premiumFeatures: {
    haloThrone: {
      hourlyPrice: number; // Coins per hour
      dailyPrice: number; // Coins per day
      weeklyPrice: number; // Coins per week
      maxDuration: number; // Max hours per purchase
    };
    stealthMode: {
      dailyPrice: number;
      weeklyPrice: number;
      monthlyPrice: number;
    };
    customAnimations: {
      pricePerAnimation: number;
      bundlePrice: number; // For animation packs
      bundleSize: number; // Animations per bundle
    };
    prioritySupport: {
      monthlyPrice: number;
      yearlyPrice: number;
    };
  };

  // Gifting System Configuration
  gifting: {
    gifts: {
      id: string;
      name: string;
      emoji: string;
      price: number; // In coins
      hostEarning: number; // Coins host receives
      animation: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary';
      requiredOGLevel: number; // Min OG level (0 = everyone)
    }[];

    specialEvents: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      bonusMultiplier: number; // Extra coins for hosts during event
      specialGifts: string[]; // Gift IDs available only during event
    }[];

    hostEarningRates: {
      base: number; // Base percentage hosts earn from gifts (e.g., 0.7 = 70%)
      ogBonus: number; // Extra % for OG hosts
      throneBonus: number; // Extra % for Halo Throne holders
      performanceBonus: number; // Extra % based on performance metrics
    };
  };

  // Game Economy Settings
  gameEconomy: {
    houseEdge: number; // Platform's edge (5-10%)
    maxStakeRatio: number; // Max stake as % of balance
    minGameStake: number; // Minimum game stake
    maxGameStake: number; // Maximum game stake
    jackpotContribution: number; // % of stakes going to jackpot
    tournamentFees: number; // Tournament entry fee %

    aiOpponentSettings: {
      difficultyAdjustment: boolean; // Auto-adjust AI difficulty
      whaleHandicap: number; // Handicap for high spenders
      newUserBonus: number; // Bonus for new users
      maxWinStreakLength: number; // Max consecutive wins allowed
    };

    coinSinks: {
      // Ways to remove coins from economy (anti-inflation)
      gameHouseFees: number; // % taken by house
      premiumFeatureFees: number; // % taken from premium purchases
      withdrawalFees: number; // % taken on withdrawals
      inactivityTax: number; // % deducted from inactive accounts
    };
  };

  // Anti-Inflation Mechanisms
  inflation: {
    targetInflationRate: number; // Target monthly inflation %
    maxCirculatingCoins: number; // Max coins in circulation
    coinBurnEvents: {
      type: 'whale_tax' | 'inactivity' | 'special_event';
      triggerCondition: number;
      burnPercentage: number;
    }[];

    sinkAnalytics: {
      dailyCoinsSunk: number;
      dailyCoinsGenerated: number;
      circulationRatio: number; // Sunk/Generated ratio
      lastAnalysis: Date;
    };
  };

  // Withdrawal & KYC Tiers
  kycTiers: {
    tier: 'tier1' | 'tier2' | 'tier3';
    requirements: string[];
    limits: {
      dailyWithdrawal: number;
      monthlyWithdrawal: number;
      minWithdrawal: number;
      withdrawalFee: number; // % or fixed amount
    };
    processingTime: number; // Hours
    requiredDocuments: string[];
  }[];

  // Emergency Controls
  emergencyControls: {
    enabled: boolean;
    freezeWithdrawals: boolean;
    freezeGaming: boolean;
    freezeGifting: boolean;
    freezePremiumPurchases: boolean;
    maxTransactionAmount: number;
    reason?: string;
    activatedBy?: string;
    activatedAt?: Date;
  };

  // Analytics & Monitoring
  monitoring: {
    alertThresholds: {
      dailyWithdrawalAmount: number; // Alert if exceeded
      suspiciousTransactionCount: number;
      fraudScoreThreshold: number;
      whaleActivityThreshold: number;
    };

    reportingSettings: {
      dailyReports: boolean;
      weeklyReports: boolean;
      monthlyReports: boolean;
      recipients: string[]; // Email addresses
    };
  };

  // Festival & Seasonal Events
  festivalSettings: {
    activeEvents: {
      id: string;
      name: string;
      startDate: Date;
      endDate: Date;
      coinBonusMultiplier: number;
      specialOffers: string[];
      targetRegions: string[];
    }[];

    seasonalPricing: {
      season: 'dashain' | 'tihar' | 'holi' | 'new_year';
      discountPercentage: number;
      bonusCoins: number;
      startDate: Date;
      endDate: Date;
    }[];
  };

  // Audit & Compliance
  lastUpdated: Date;
  updatedBy: string;
  version: number;
  changeLog: {
    date: Date;
    changes: string;
    updatedBy: string;
    version: number;
  }[];
}

const CoinEconomyConfigSchema = new Schema<ICoinEconomyConfig>({
  isActive: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },

  basePricing: {
    baseAmount: { type: Number, default: 100 }, // NPR 100
    baseCoins: { type: Number, default: 500 }, // 500 coins
    currency: { type: String, default: 'NPR' }
  },

  regionalPricing: [{
    country: { type: String, required: true },
    currency: { type: String, required: true },
    exchangeRate: { type: Number, required: true },
    localPrice: { type: Number, required: true },
    bonusMultiplier: { type: Number, default: 1.0 },
    taxRate: { type: Number, default: 0 }
  }],

  coinPackages: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    coins: { type: Number, required: true },
    price: { type: Number, required: true },
    bonusCoins: { type: Number, default: 0 },
    popularity: { type: Number, min: 1, max: 5, default: 3 },
    isVisible: { type: Boolean, default: true },
    targetAudience: {
      type: String,
      enum: ['new_users', 'casual', 'regular', 'whales'],
      default: 'casual'
    },
    usdPrice: Number
  }],

  ogTiers: [{
    level: { type: Number, required: true, min: 1, max: 5 },
    name: { type: String, required: true },
    monthlyPrice: { type: Number, required: true },
    yearlyPrice: { type: Number, required: true },
    benefits: {
      bonusMultiplier: { type: Number, default: 1.1 },
      dailyCoins: { type: Number, default: 10 },
      giftingBonus: { type: Number, default: 1.1 },
      exclusiveFeatures: [String],
      prioritySupport: { type: Boolean, default: false },
      customBadges: { type: Boolean, default: false },
      earlyAccess: { type: Boolean, default: false }
    },
    requirements: {
      minSpending: Number,
      minActivity: Number
    }
  }],

  premiumFeatures: {
    haloThrone: {
      hourlyPrice: { type: Number, default: 100 },
      dailyPrice: { type: Number, default: 2000 },
      weeklyPrice: { type: Number, default: 12000 },
      maxDuration: { type: Number, default: 168 } // 1 week max
    },
    stealthMode: {
      dailyPrice: { type: Number, default: 50 },
      weeklyPrice: { type: Number, default: 300 },
      monthlyPrice: { type: Number, default: 1000 }
    },
    customAnimations: {
      pricePerAnimation: { type: Number, default: 200 },
      bundlePrice: { type: Number, default: 1500 },
      bundleSize: { type: Number, default: 10 }
    },
    prioritySupport: {
      monthlyPrice: { type: Number, default: 500 },
      yearlyPrice: { type: Number, default: 5000 }
    }
  },

  gifting: {
    gifts: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      emoji: { type: String, required: true },
      price: { type: Number, required: true },
      hostEarning: { type: Number, required: true },
      animation: { type: String, required: true },
      rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common'
      },
      requiredOGLevel: { type: Number, default: 0 }
    }],

    specialEvents: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      bonusMultiplier: { type: Number, default: 1.5 },
      specialGifts: [String]
    }],

    hostEarningRates: {
      base: { type: Number, default: 0.7 }, // 70% to host
      ogBonus: { type: Number, default: 0.05 }, // +5% for OG hosts
      throneBonus: { type: Number, default: 0.1 }, // +10% for throne holders
      performanceBonus: { type: Number, default: 0.05 } // +5% for top performers
    }
  },

  gameEconomy: {
    houseEdge: { type: Number, default: 0.05 }, // 5%
    maxStakeRatio: { type: Number, default: 0.1 }, // 10% of balance
    minGameStake: { type: Number, default: 10 },
    maxGameStake: { type: Number, default: 10000 },
    jackpotContribution: { type: Number, default: 0.02 }, // 2%
    tournamentFees: { type: Number, default: 0.05 }, // 5%

    aiOpponentSettings: {
      difficultyAdjustment: { type: Boolean, default: true },
      whaleHandicap: { type: Number, default: 0.1 }, // 10% handicap
      newUserBonus: { type: Number, default: 0.2 }, // 20% bonus
      maxWinStreakLength: { type: Number, default: 10 }
    },

    coinSinks: {
      gameHouseFees: { type: Number, default: 0.05 }, // 5%
      premiumFeatureFees: { type: Number, default: 0.02 }, // 2%
      withdrawalFees: { type: Number, default: 0.03 }, // 3%
      inactivityTax: { type: Number, default: 0.01 } // 1% per month
    }
  },

  inflation: {
    targetInflationRate: { type: Number, default: 0.02 }, // 2% monthly
    maxCirculatingCoins: { type: Number, default: 10000000 }, // 10M coins
    coinBurnEvents: [{
      type: {
        type: String,
        enum: ['whale_tax', 'inactivity', 'special_event']
      },
      triggerCondition: Number,
      burnPercentage: Number
    }],

    sinkAnalytics: {
      dailyCoinsSunk: { type: Number, default: 0 },
      dailyCoinsGenerated: { type: Number, default: 0 },
      circulationRatio: { type: Number, default: 0 },
      lastAnalysis: { type: Date, default: Date.now }
    }
  },

  kycTiers: [{
    tier: {
      type: String,
      enum: ['tier1', 'tier2', 'tier3'],
      required: true
    },
    requirements: [String],
    limits: {
      dailyWithdrawal: Number,
      monthlyWithdrawal: Number,
      minWithdrawal: Number,
      withdrawalFee: Number
    },
    processingTime: Number,
    requiredDocuments: [String]
  }],

  emergencyControls: {
    enabled: { type: Boolean, default: false },
    freezeWithdrawals: { type: Boolean, default: false },
    freezeGaming: { type: Boolean, default: false },
    freezeGifting: { type: Boolean, default: false },
    freezePremiumPurchases: { type: Boolean, default: false },
    maxTransactionAmount: { type: Number, default: 50000 },
    reason: String,
    activatedBy: String,
    activatedAt: Date
  },

  monitoring: {
    alertThresholds: {
      dailyWithdrawalAmount: { type: Number, default: 100000 },
      suspiciousTransactionCount: { type: Number, default: 50 },
      fraudScoreThreshold: { type: Number, default: 80 },
      whaleActivityThreshold: { type: Number, default: 25000 }
    },

    reportingSettings: {
      dailyReports: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
      monthlyReports: { type: Boolean, default: true },
      recipients: [String]
    }
  },

  festivalSettings: {
    activeEvents: [{
      id: String,
      name: String,
      startDate: Date,
      endDate: Date,
      coinBonusMultiplier: Number,
      specialOffers: [String],
      targetRegions: [String]
    }],

    seasonalPricing: [{
      season: {
        type: String,
        enum: ['dashain', 'tihar', 'holi', 'new_year']
      },
      discountPercentage: Number,
      bonusCoins: Number,
      startDate: Date,
      endDate: Date
    }]
  },

  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, required: true },
  version: { type: Number, default: 1 },
  changeLog: [{
    date: { type: Date, default: Date.now },
    changes: { type: String, required: true },
    updatedBy: { type: String, required: true },
    version: { type: Number, required: true }
  }]
}, {
  timestamps: true,
  collection: 'coineconomyconfig'
});

// Ensure single configuration document
CoinEconomyConfigSchema.index({}, { unique: true });

// Static method to get current config (singleton pattern)
CoinEconomyConfigSchema.statics.getCurrentConfig = async function() {
  let config = await this.findOne({});
  if (!config) {
    // Create default configuration
    config = await this.create({
      updatedBy: 'system',
      // All other fields will use defaults
    });
  }
  return config;
};

// Instance method to update config safely
CoinEconomyConfigSchema.methods.updateConfig = function(changes: any, updatedBy: string) {
  Object.assign(this, changes);
  this.lastUpdated = new Date();
  this.updatedBy = updatedBy;
  this.version += 1;

  this.changeLog.push({
    date: new Date(),
    changes: JSON.stringify(changes),
    updatedBy: updatedBy,
    version: this.version
  });

  return this.save();
};

export const CoinEconomyConfig = mongoose.model<ICoinEconomyConfig>('CoinEconomyConfig', CoinEconomyConfigSchema);