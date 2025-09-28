import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinTransaction extends Document {
  // Core Transaction Data
  txId: string; // Unique blockchain-like transaction ID
  userId: string; // User who initiated/owns the transaction
  targetUserId?: string; // Target user (for gifts, transfers)

  // Transaction Classification
  type: 'purchase' | 'gift_sent' | 'gift_received' | 'game_stake' | 'game_win' |
        'game_loss' | 'reward' | 'og_purchase' | 'withdrawal' | 'refund' |
        'premium_feature' | 'throne_purchase' | 'festival_bonus';

  // Monetary Details
  amount: number; // Coin amount (always positive)
  balanceBefore: number; // User's balance before transaction
  balanceAfter: number; // User's balance after transaction

  // Source/Destination Tracking
  source: 'purchase' | 'game' | 'gift' | 'reward' | 'system' | 'og' | 'premium';
  destination: 'wallet' | 'game_pot' | 'host_earnings' | 'system_fee' | 'withdrawal';

  // Context & Metadata
  context: {
    gameId?: string; // If game-related
    gameSessionId?: string; // If game session-related
    liveStreamId?: string; // If live stream gift
    paymentGateway?: 'esewa' | 'khalti' | 'stripe' | 'coinbase'; // If purchase
    paymentId?: string; // External payment reference
    giftType?: string; // Type of gift (rose, rocket, etc.)
    ogLevel?: number; // If OG-related
    premiumFeature?: string; // If premium feature purchase
    festivalId?: string; // If festival-related
    referenceId?: string; // General purpose reference ID
  };

  // Additional properties for compatibility
  metadata?: {
    ogTier?: number;
    [key: string]: any;
  };
  paymentMethod?: string;

  // Anti-Fraud & Compliance
  geoLocation?: {
    country: string;
    region: string;
    city?: string;
    ip: string;
  };

  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    version?: string;
    fingerprint?: string;
  };

  // Audit Trail
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'flagged';
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;

  // Compliance & Verification
  isVerified: boolean; // Manual verification flag
  verifiedBy?: string; // Admin who verified
  verifiedAt?: Date;

  // AI Fraud Detection Scores
  fraudScore?: number; // 0-100, higher = more suspicious
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  // Hash for Integrity (blockchain-like)
  hash: string; // SHA-256 hash of transaction data
  previousHash?: string; // Hash of previous transaction for chain integrity

  // Exchange Rates (for multi-currency)
  exchangeRate?: number; // If purchased with fiat
  originalCurrency?: string; // Original fiat currency
  originalAmount?: number; // Original fiat amount
}

const CoinTransactionSchema = new Schema<ICoinTransaction>({
  txId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  targetUserId: {
    type: String,
    index: true
  },
  type: {
    type: String,
    enum: ['purchase', 'gift_sent', 'gift_received', 'game_stake', 'game_win',
           'game_loss', 'reward', 'og_purchase', 'withdrawal', 'refund',
           'premium_feature', 'throne_purchase', 'festival_bonus'],
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  balanceBefore: {
    type: Number,
    required: true,
    min: 0
  },
  balanceAfter: {
    type: Number,
    required: true,
    min: 0
  },
  source: {
    type: String,
    enum: ['purchase', 'game', 'gift', 'reward', 'system', 'og', 'premium'],
    required: true,
    index: true
  },
  destination: {
    type: String,
    enum: ['wallet', 'game_pot', 'host_earnings', 'system_fee', 'withdrawal'],
    required: true
  },
  context: {
    gameId: String,
    gameSessionId: String,
    liveStreamId: String,
    paymentGateway: {
      type: String,
      enum: ['esewa', 'khalti', 'stripe', 'coinbase']
    },
    paymentId: String,
    giftType: String,
    ogLevel: Number,
    premiumFeature: String,
    festivalId: String,
    referenceId: String
  },
  geoLocation: {
    country: { type: String, index: true },
    region: String,
    city: String,
    ip: { type: String, index: true }
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    version: String,
    fingerprint: { type: String, index: true }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'flagged'],
    default: 'pending',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: Date,
  failureReason: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: String,
  verifiedAt: Date,
  fraudScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  hash: {
    type: String,
    required: true,
    index: true
  },
  previousHash: String,
  exchangeRate: Number,
  originalCurrency: String,
  originalAmount: Number
}, {
  timestamps: true,
  collection: 'cointransactions'
});

// Compound indexes for efficient querying
CoinTransactionSchema.index({ userId: 1, createdAt: -1 }); // User transaction history
CoinTransactionSchema.index({ type: 1, createdAt: -1 }); // Transaction type analysis
CoinTransactionSchema.index({ status: 1, createdAt: -1 }); // Status monitoring
CoinTransactionSchema.index({ fraudScore: -1, riskLevel: 1 }); // Fraud detection
CoinTransactionSchema.index({ 'geoLocation.country': 1, createdAt: -1 }); // Geographic analysis
CoinTransactionSchema.index({ 'context.gameId': 1, createdAt: -1 }); // Game-specific transactions

// Virtual fields
CoinTransactionSchema.virtual('isHighValue').get(function() {
  return this.amount >= 1000; // Configurable threshold
});

CoinTransactionSchema.virtual('isInternational').get(function() {
  return this.geoLocation?.country !== 'NP'; // Nepal is domestic
});

// Static methods for analysis
CoinTransactionSchema.statics.getUserTransactionSummary = function(userId: string, days = 30) {
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: since },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        lastTransaction: { $max: '$createdAt' }
      }
    }
  ]);
};

CoinTransactionSchema.statics.detectFraudPatterns = function(userId: string) {
  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) } // Last 24 hours
      }
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        uniqueIPs: { $addToSet: '$geoLocation.ip' },
        uniqueDevices: { $addToSet: '$deviceInfo.fingerprint' },
        avgFraudScore: { $avg: '$fraudScore' },
        highRiskCount: {
          $sum: {
            $cond: [{ $gte: ['$fraudScore', 70] }, 1, 0]
          }
        }
      }
    }
  ]);
};

// Pre-save middleware to generate transaction hash
CoinTransactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate unique transaction ID
    this.txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate hash for integrity
    const crypto = await import('crypto');
    const dataToHash = `${this.txId}${this.userId}${this.type}${this.amount}${this.createdAt}`;
    this.hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // Get previous transaction hash for chain integrity
    const lastTx = await this.constructor.findOne(
      { userId: this.userId },
      {},
      { sort: { createdAt: -1 } }
    );
    if (lastTx) {
      this.previousHash = lastTx.hash;
    }
  }
  next();
});

export const CoinTransaction = mongoose.model<ICoinTransaction>('CoinTransaction', CoinTransactionSchema);