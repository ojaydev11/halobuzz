import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsFunnel extends Document {
  date: Date;
  country: string;
  
  // User Journey Funnel
  signupToFirstLive: {
    totalSignups: number;
    firstLiveAttempts: number;
    firstLiveSuccess: number;
    conversionRate: number; // percentage
    avgDaysToFirstLive: number;
  };
  
  signupToFirstGift: {
    totalSignups: number;
    firstGiftSent: number;
    conversionRate: number; // percentage
    avgDaysToFirstGift: number;
  };
  
  signupToFirstPayment: {
    totalSignups: number;
    firstPayment: number;
    conversionRate: number; // percentage
    avgDaysToFirstPayment: number;
  };
  
  // Stream Engagement Funnel
  streamEngagement: {
    streamsStarted: number;
    streamsWithViewers: number;
    streamsWithGifts: number;
    streamsWithComments: number;
    viewerToGiftRate: number; // percentage
    viewerToCommentRate: number; // percentage
  };
  
  // OG Tier Conversion Funnel
  ogConversion: {
    totalUsers: number;
    ogTier1Purchases: number;
    ogTier2Purchases: number;
    ogTier3Purchases: number;
    ogTier4Purchases: number;
    ogTier5Purchases: number;
    totalOGPurchases: number;
    conversionRate: number; // percentage
  };
  
  // Gaming Funnel
  gamingConversion: {
    totalUsers: number;
    gamesViewed: number;
    gamesPlayed: number;
    gamesWithStakes: number;
    conversionRate: number; // percentage
    avgStakeAmount: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const analyticsFunnelSchema = new Schema<IAnalyticsFunnel>({
  date: {
    type: Date,
    required: true,
    index: true
  },
  country: {
    type: String,
    required: true,
    default: 'ALL',
    index: true
  },
  
  signupToFirstLive: {
    totalSignups: { type: Number, default: 0, min: 0 },
    firstLiveAttempts: { type: Number, default: 0, min: 0 },
    firstLiveSuccess: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgDaysToFirstLive: { type: Number, default: 0, min: 0 }
  },
  
  signupToFirstGift: {
    totalSignups: { type: Number, default: 0, min: 0 },
    firstGiftSent: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgDaysToFirstGift: { type: Number, default: 0, min: 0 }
  },
  
  signupToFirstPayment: {
    totalSignups: { type: Number, default: 0, min: 0 },
    firstPayment: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgDaysToFirstPayment: { type: Number, default: 0, min: 0 }
  },
  
  streamEngagement: {
    streamsStarted: { type: Number, default: 0, min: 0 },
    streamsWithViewers: { type: Number, default: 0, min: 0 },
    streamsWithGifts: { type: Number, default: 0, min: 0 },
    streamsWithComments: { type: Number, default: 0, min: 0 },
    viewerToGiftRate: { type: Number, default: 0, min: 0, max: 100 },
    viewerToCommentRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  ogConversion: {
    totalUsers: { type: Number, default: 0, min: 0 },
    ogTier1Purchases: { type: Number, default: 0, min: 0 },
    ogTier2Purchases: { type: Number, default: 0, min: 0 },
    ogTier3Purchases: { type: Number, default: 0, min: 0 },
    ogTier4Purchases: { type: Number, default: 0, min: 0 },
    ogTier5Purchases: { type: Number, default: 0, min: 0 },
    totalOGPurchases: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  gamingConversion: {
    totalUsers: { type: Number, default: 0, min: 0 },
    gamesViewed: { type: Number, default: 0, min: 0 },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    gamesWithStakes: { type: Number, default: 0, min: 0 },
    conversionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgStakeAmount: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsFunnelSchema.index({ date: -1, country: 1 });
analyticsFunnelSchema.index({ date: -1 });
analyticsFunnelSchema.index({ country: 1, date: -1 });

// Unique constraint to prevent duplicates
analyticsFunnelSchema.index({ date: 1, country: 1 }, { unique: true });

export const AnalyticsFunnel = mongoose.model<IAnalyticsFunnel>('AnalyticsFunnel', analyticsFunnelSchema);
