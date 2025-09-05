import mongoose, { Document, Schema } from 'mongoose';

export interface IThrone extends Document {
  streamId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  avatar: string;
  ogLevel: number;
  totalGifts: number;
  totalCoins: number;
  expiresAt: Date;
  isActive: boolean;
  claimedAt?: Date;
  metadata: {
    giftCount: number;
    uniqueGifters: number;
    topGift: {
      giftId: string;
      giftName: string;
      amount: number;
    };
    sessionDuration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const throneSchema = new Schema<IThrone>({
  streamId: {
    type: Schema.Types.ObjectId,
    ref: 'LiveStream',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    required: true
  },
  ogLevel: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  totalGifts: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCoins: {
    type: Number,
    default: 0,
    min: 0
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  claimedAt: {
    type: Date,
    default: null
  },
  metadata: {
    giftCount: { type: Number, default: 0 },
    uniqueGifters: { type: Number, default: 0 },
    topGift: {
      giftId: { type: Schema.Types.ObjectId, ref: 'Gift' },
      giftName: { type: String },
      amount: { type: Number, default: 0 }
    },
    sessionDuration: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
throneSchema.index({ streamId: 1, expiresAt: -1 });
throneSchema.index({ userId: 1 });
throneSchema.index({ isActive: 1 });
throneSchema.index({ expiresAt: 1 });
throneSchema.index({ totalCoins: -1 });
throneSchema.index({ createdAt: -1 });

// Pre-save middleware to check expiration
throneSchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isActive = false;
  }
  next();
});

// Method to claim throne
throneSchema.methods.claim = function(): void {
  this.claimedAt = new Date();
  this.isActive = false;
};

// Method to add gift
throneSchema.methods.addGift = function(coins: number, giftId?: string, giftName?: string): void {
  this.totalGifts++;
  this.totalCoins += coins;
  this.metadata.giftCount++;
  
  if (giftId && giftName && coins > this.metadata.topGift.amount) {
    this.metadata.topGift = {
      giftId,
      giftName,
      amount: coins
    };
  }
};

// Static method to find active throne for stream
throneSchema.statics.findActiveForStream = function(streamId: string) {
  return this.findOne({
    streamId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'username avatar ogLevel');
};

// Static method to find expired thrones
throneSchema.statics.findExpired = function() {
  return this.find({
    isActive: true,
    expiresAt: { $lte: new Date() }
  });
};

// Static method to find user's throne history
throneSchema.statics.findUserHistory = function(userId: string, limit: number = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('streamId', 'title thumbnail');
};

// Static method to find top thrones
throneSchema.statics.findTopThrones = function(limit: number = 10) {
  return this.find({ isActive: false })
    .sort({ totalCoins: -1, totalGifts: -1 })
    .limit(limit)
    .populate('userId', 'username avatar ogLevel')
    .populate('streamId', 'title thumbnail');
};

export const Throne = mongoose.model<IThrone>('Throne', throneSchema);
