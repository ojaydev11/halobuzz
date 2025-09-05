import mongoose, { Document, Schema } from 'mongoose';

export interface IGift extends Document {
  name: string;
  description: string;
  icon: string;
  animation: string;
  priceCoins: number;
  priceUSD: number;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
  isLimited: boolean;
  limitedQuantity?: number;
  soldQuantity: number;
  festivalId?: mongoose.Types.ObjectId;
  ogTierRequired?: number;
  effects: {
    sound: string;
    visual: string;
    duration: number;
  };
  stats: {
    totalSent: number;
    totalCoins: number;
    popularity: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const giftSchema = new Schema<IGift>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  icon: {
    type: String,
    required: true
  },
  animation: {
    type: String,
    required: true
  },
  priceCoins: {
    type: Number,
    required: true,
    min: 1
  },
  priceUSD: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'love',
      'celebration',
      'funny',
      'luxury',
      'seasonal',
      'special'
    ]
  },
  rarity: {
    type: String,
    required: true,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isLimited: {
    type: Boolean,
    default: false
  },
  limitedQuantity: {
    type: Number,
    min: 1,
    default: null
  },
  soldQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  festivalId: {
    type: Schema.Types.ObjectId,
    ref: 'Festival',
    default: null
  },
  ogTierRequired: {
    type: Number,
    min: 0,
    max: 5,
    default: null
  },
  effects: {
    sound: { type: String, required: true },
    visual: { type: String, required: true },
    duration: { type: Number, default: 3000, min: 1000, max: 10000 }
  },
  stats: {
    totalSent: { type: Number, default: 0, min: 0 },
    totalCoins: { type: Number, default: 0, min: 0 },
    popularity: { type: Number, default: 0, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

// Indexes
giftSchema.index({ isActive: 1, priceCoins: 1 });
giftSchema.index({ category: 1 });
giftSchema.index({ rarity: 1 });
giftSchema.index({ festivalId: 1 });
giftSchema.index({ ogTierRequired: 1 });
giftSchema.index({ 'stats.popularity': -1 });
giftSchema.index({ 'stats.totalSent': -1 });

// Pre-save middleware to update popularity
giftSchema.pre('save', function(next) {
  if (this.isModified('stats.totalSent')) {
    // Calculate popularity based on total sent and recent activity
    this.stats.popularity = Math.min(100, Math.floor(this.stats.totalSent / 10));
  }
  next();
});

// Method to increment sent count
giftSchema.methods.incrementSent = function(coins: number): void {
  this.stats.totalSent++;
  this.stats.totalCoins += coins;
  this.soldQuantity++;
};

// Static method to find active gifts by price range
giftSchema.statics.findByPriceRange = function(minPrice: number, maxPrice: number) {
  return this.find({
    isActive: true,
    priceCoins: { $gte: minPrice, $lte: maxPrice }
  }).sort({ 'stats.popularity': -1 });
};

// Static method to find gifts by category
giftSchema.statics.findByCategory = function(category: string) {
  return this.find({
    isActive: true,
    category
  }).sort({ 'stats.popularity': -1 });
};

// Static method to find popular gifts
giftSchema.statics.findPopular = function(limit: number = 20) {
  return this.find({ isActive: true })
    .sort({ 'stats.popularity': -1, 'stats.totalSent': -1 })
    .limit(limit);
};

export const Gift = mongoose.model<IGift>('Gift', giftSchema);
