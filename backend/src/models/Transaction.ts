import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'recharge' | 'gift_sent' | 'gift_received' | 'og_bonus' | 'refund' | 'withdrawal' | 'subscription' | 'tip' | 'brand_deal' | 'platform_fee';
  amount: number;
  currency: 'coins' | 'USD' | 'NPR';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: 'esewa' | 'khalti' | 'stripe' | 'paypal';
  paymentProvider?: string;
  transactionId?: string;
  referenceId?: string;
  idempotencyKey?: string; // Add for duplicate prevention
  description: string;
  metadata?: {
    giftId?: string;
    streamId?: string;
    ogTier?: number;
    festivalId?: string;
    orderId?: string; // Add for idempotency
    [key: string]: any;
  };
  fees: number;
  netAmount: number;
  hash?: string; // Add for ledger integrity
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['recharge', 'gift_sent', 'gift_received', 'og_bonus', 'refund', 'withdrawal', 'subscription', 'tip', 'brand_deal', 'platform_fee']
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    enum: ['coins', 'USD', 'NPR'],
    default: 'coins'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['esewa', 'khalti', 'stripe', 'paypal'],
    default: null
  },
  paymentProvider: {
    type: String,
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  referenceId: {
    type: String,
    default: null
  },
  idempotencyKey: {
    type: String,
    default: null,
    sparse: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  fees: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  hash: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ paymentMethod: 1 });
transactionSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
transactionSchema.index({ referenceId: 1 });
transactionSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate net amount and generate hash
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('fees')) {
    this.netAmount = this.amount - this.fees;
  }
  
  // Generate hash for ledger integrity
  if (this.isNew) {
    const crypto = require('crypto');
    const hashData = `${this.userId}-${this.amount}-${this.type}-${Date.now()}`;
    this.hash = crypto.createHash('sha256').update(hashData).digest('hex');
  }
  
  next();
});

// Static method to find user transactions
transactionSchema.statics.findUserTransactions = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

// Static method to find transactions by type
transactionSchema.statics.findByType = function(type: string, status: string = 'completed') {
  return this.find({ type, status })
    .sort({ createdAt: -1 })
    .populate('userId', 'username avatar');
};

// Static method to get transaction summary
transactionSchema.statics.getSummary = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Critical indexes for financial integrity and performance
// Financial queries - CRITICAL PRIORITY
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, type: 1, status: 1 });

// Payment idempotency - CRITICAL for data integrity
transactionSchema.index({ 'metadata.orderId': 1 }, { sparse: true, unique: true });
transactionSchema.index({ idempotencyKey: 1 }, { sparse: true, unique: true });

// Cleanup jobs for failed transactions
transactionSchema.index({ status: 1, createdAt: 1 });

// TTL for failed transactions (30 days)
transactionSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { status: 'failed' }
  }
);

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
