import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinWallet extends Document {
  userId: string;

  // Balance Tracking
  totalBalance: number; // Total coins owned
  availableBalance: number; // Available for spending/withdrawal
  lockedBalance: number; // Locked in games, pending transactions, etc.

  // Balance Breakdown for Transparency
  balanceBySource: {
    purchased: number; // Coins bought with real money
    gifted: number; // Coins received as gifts
    earned: number; // Coins earned from games, rewards
    bonus: number; // Bonus coins (non-withdrawable)
  };

  // Withdrawal Tracking
  totalWithdrawn: number; // Lifetime withdrawals
  withdrawableBalance: number; // Amount eligible for withdrawal (excludes bonus coins)

  // OG Membership Integration
  ogLevel: number; // 0=None, 1-5=OG levels
  ogCoinsSpent: number; // Total coins spent on OG upgrades
  ogBonusMultiplier: number; // Bonus multiplier for OG members (1.0 = no bonus)

  // Premium Features
  premiumFeatures: {
    haloThrone: {
      active: boolean;
      expiresAt?: Date;
      coinsSpent: number;
    };
    stealthMode: {
      active: boolean;
      expiresAt?: Date;
      coinsSpent: number;
    };
    customAnimations: {
      active: boolean;
      animationIds: string[];
      coinsSpent: number;
    };
    prioritySupport: {
      active: boolean;
      expiresAt?: Date;
      coinsSpent: number;
    };
  };

  // Transaction Statistics
  stats: {
    totalTransactions: number;
    totalSpent: number;
    totalEarned: number;
    gamesPlayed: number;
    giftsGiven: number;
    giftsReceived: number;
    biggestWin: number;
    biggestLoss: number;
    currentStreak: number; // Win/loss streak
    longestStreak: number;
  };

  // Velocity & Anti-Fraud
  dailyLimits: {
    spending: number; // Max daily spending limit
    withdrawal: number; // Max daily withdrawal limit
    gifting: number; // Max daily gifting limit
    gaming: number; // Max daily gaming limit
  };

  dailyUsage: {
    date: Date;
    spent: number;
    withdrawn: number;
    gifted: number;
    gamed: number;
  }[];

  // Risk Management
  riskProfile: {
    level: 'low' | 'medium' | 'high' | 'critical';
    flags: string[]; // Risk flags
    lastReview: Date;
    freezeReason?: string;
    freezeExpiresAt?: Date;
  };

  // Compliance & KYC
  kycLevel: 'none' | 'basic' | 'full'; // KYC verification level
  withdrawalTier: 'tier1' | 'tier2' | 'tier3'; // Withdrawal limits based on KYC

  // Audit Trail
  lastTransactionAt: Date;
  lastBalanceUpdate: Date;
  version: number; // For optimistic locking

  // Lock fields for concurrent transaction safety
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string; // Transaction ID that locked the wallet
}

const CoinWalletSchema = new Schema<ICoinWallet>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  totalBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  availableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceBySource: {
    purchased: { type: Number, default: 0, min: 0 },
    gifted: { type: Number, default: 0, min: 0 },
    earned: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 }
  },
  totalWithdrawn: {
    type: Number,
    default: 0,
    min: 0
  },
  withdrawableBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  ogLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ogCoinsSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  ogBonusMultiplier: {
    type: Number,
    default: 1.0,
    min: 1.0,
    max: 2.0
  },
  premiumFeatures: {
    haloThrone: {
      active: { type: Boolean, default: false },
      expiresAt: Date,
      coinsSpent: { type: Number, default: 0 }
    },
    stealthMode: {
      active: { type: Boolean, default: false },
      expiresAt: Date,
      coinsSpent: { type: Number, default: 0 }
    },
    customAnimations: {
      active: { type: Boolean, default: false },
      animationIds: [String],
      coinsSpent: { type: Number, default: 0 }
    },
    prioritySupport: {
      active: { type: Boolean, default: false },
      expiresAt: Date,
      coinsSpent: { type: Number, default: 0 }
    }
  },
  stats: {
    totalTransactions: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    giftsGiven: { type: Number, default: 0 },
    giftsReceived: { type: Number, default: 0 },
    biggestWin: { type: Number, default: 0 },
    biggestLoss: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 }
  },
  dailyLimits: {
    spending: { type: Number, default: 5000 }, // Default limits
    withdrawal: { type: Number, default: 2000 },
    gifting: { type: Number, default: 1000 },
    gaming: { type: Number, default: 3000 }
  },
  dailyUsage: [{
    date: { type: Date, required: true },
    spent: { type: Number, default: 0 },
    withdrawn: { type: Number, default: 0 },
    gifted: { type: Number, default: 0 },
    gamed: { type: Number, default: 0 }
  }],
  riskProfile: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    flags: [String],
    lastReview: { type: Date, default: Date.now },
    freezeReason: String,
    freezeExpiresAt: Date
  },
  kycLevel: {
    type: String,
    enum: ['none', 'basic', 'full'],
    default: 'none'
  },
  withdrawalTier: {
    type: String,
    enum: ['tier1', 'tier2', 'tier3'],
    default: 'tier1'
  },
  lastTransactionAt: Date,
  lastBalanceUpdate: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  },
  lockedAt: Date,
  lockedBy: String
}, {
  timestamps: true,
  collection: 'coinwallets'
});

// Indexes for efficient querying
CoinWalletSchema.index({ totalBalance: -1 }); // Rich users analysis
CoinWalletSchema.index({ ogLevel: -1, totalBalance: -1 }); // OG member analysis
CoinWalletSchema.index({ 'riskProfile.level': 1 }); // Risk monitoring
CoinWalletSchema.index({ kycLevel: 1, withdrawalTier: 1 }); // Compliance tracking

// Virtual fields
CoinWalletSchema.virtual('isWhale').get(function() {
  return this.totalBalance >= 50000; // 50k+ coins = whale
});

CoinWalletSchema.virtual('isHighRoller').get(function() {
  return this.stats.totalSpent >= 100000; // 100k+ spent = high roller
});

CoinWalletSchema.virtual('profitLoss').get(function() {
  return this.stats.totalEarned - this.stats.totalSpent;
});

CoinWalletSchema.virtual('activeOGMember').get(function() {
  return this.ogLevel > 0;
});

// Instance methods
CoinWalletSchema.methods.canSpend = function(amount: number): boolean {
  return this.availableBalance >= amount && !this.isLocked;
};

CoinWalletSchema.methods.canWithdraw = function(amount: number): boolean {
  if (this.isLocked || this.riskProfile.level === 'critical') {
    return false;
  }

  const today = new Date().toDateString();
  const todayUsage = this.dailyUsage.find(u => u.date.toDateString() === today);
  const dailyWithdrawn = todayUsage?.withdrawn || 0;

  return this.withdrawableBalance >= amount &&
         (dailyWithdrawn + amount) <= this.dailyLimits.withdrawal;
};

CoinWalletSchema.methods.getTierLimits = function() {
  const limits = {
    tier1: { daily: 1000, monthly: 25000 },
    tier2: { daily: 5000, monthly: 100000 },
    tier3: { daily: 25000, monthly: 500000 }
  };
  return limits[this.withdrawalTier];
};

CoinWalletSchema.methods.updateDailyUsage = function(type: string, amount: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayUsage = this.dailyUsage.find(u =>
    u.date.getTime() === today.getTime()
  );

  if (!todayUsage) {
    todayUsage = {
      date: today,
      spent: 0,
      withdrawn: 0,
      gifted: 0,
      gamed: 0
    };
    this.dailyUsage.push(todayUsage);
  }

  if (type in todayUsage) {
    (todayUsage as any)[type] += amount;
  }

  // Keep only last 30 days
  const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  this.dailyUsage = this.dailyUsage.filter(u => u.date >= thirtyDaysAgo);
};

// Static methods
CoinWalletSchema.statics.getWealthDistribution = function() {
  return this.aggregate([
    {
      $bucket: {
        groupBy: '$totalBalance',
        boundaries: [0, 100, 500, 1000, 5000, 10000, 50000, Number.MAX_SAFE_INTEGER],
        default: 'other',
        output: {
          count: { $sum: 1 },
          totalBalance: { $sum: '$totalBalance' },
          avgBalance: { $avg: '$totalBalance' }
        }
      }
    }
  ]);
};

CoinWalletSchema.statics.getTopWhales = function(limit = 100) {
  return this.find({})
    .sort({ totalBalance: -1 })
    .limit(limit)
    .populate('userId', 'username displayName ogLevel')
    .select('totalBalance stats ogLevel premiumFeatures');
};

// Pre-save middleware for balance validation
CoinWalletSchema.pre('save', function(next) {
  // Ensure balance consistency
  const totalBySource = Object.values(this.balanceBySource).reduce((sum, val) => sum + val, 0);

  if (Math.abs(this.totalBalance - totalBySource) > 0.01) {
    return next(new Error('Balance inconsistency detected'));
  }

  // Update withdrawable balance (exclude bonus coins)
  this.withdrawableBalance = Math.max(0,
    this.balanceBySource.purchased +
    this.balanceBySource.gifted +
    this.balanceBySource.earned
  );

  // Update version for optimistic locking
  if (this.isModified()) {
    this.version += 1;
    this.lastBalanceUpdate = new Date();
  }

  next();
});

// Middleware to clean up expired locks
CoinWalletSchema.pre('save', function(next) {
  if (this.isLocked && this.lockedAt) {
    const lockTimeout = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - this.lockedAt.getTime() > lockTimeout) {
      this.isLocked = false;
      this.lockedAt = undefined;
      this.lockedBy = undefined;
    }
  }
  next();
});

export const CoinWallet = mongoose.model<ICoinWallet>('CoinWallet', CoinWalletSchema);