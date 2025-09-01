import mongoose, { Document, Schema } from 'mongoose';

export interface IOGTier extends Document {
  tier: number; // 1-5
  name: string;
  description: string;
  priceUSD: number;
  priceCoins: number;
  duration: number; // in days
  benefits: {
    dailyBonus: number;
    exclusiveGifts: string[];
    chatPrivileges: string[];
    customEmojis: string[];
    profileBadge: string;
    prioritySupport: boolean;
    adFree: boolean;
    customUsername: boolean;
    streamSkins: string[];
    giftDiscount: number; // percentage
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ogTierSchema = new Schema<IOGTier>({
  tier: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 5
  },
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
    maxlength: 500
  },
  priceUSD: {
    type: Number,
    required: true,
    min: 0
  },
  priceCoins: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    default: 30 // 30 days
  },
  benefits: {
    dailyBonus: {
      type: Number,
      required: true,
      min: 0
    },
    exclusiveGifts: [{
      type: Schema.Types.ObjectId,
      ref: 'Gift'
    }],
    chatPrivileges: [{
      type: String,
      enum: ['delete_messages', 'pin_messages', 'moderate_chat', 'custom_colors']
    }],
    customEmojis: [String],
    profileBadge: {
      type: String,
      required: true
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    adFree: {
      type: Boolean,
      default: false
    },
    customUsername: {
      type: Boolean,
      default: false
    },
    streamSkins: [String],
    giftDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
ogTierSchema.index({ tier: 1 }, { unique: true });
ogTierSchema.index({ isActive: 1 });
ogTierSchema.index({ priceUSD: 1 });
ogTierSchema.index({ priceCoins: 1 });

// Static method to find active tiers
ogTierSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ tier: 1 });
};

// Static method to find tier by number
ogTierSchema.statics.findByTier = function(tier: number) {
  return this.findOne({ tier, isActive: true });
};

// Static method to find next tier
ogTierSchema.statics.findNextTier = function(currentTier: number) {
  return this.findOne({ 
    tier: { $gt: currentTier }, 
    isActive: true 
  }).sort({ tier: 1 });
};

export const OGTier = mongoose.model<IOGTier>('OGTier', ogTierSchema);
