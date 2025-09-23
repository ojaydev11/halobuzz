import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsDailyKPI extends Document {
  appId: string;
  date: Date;
  country: string;
  
  // Revenue KPIs
  revenue: {
    total: number;
    byPaymentMethod: {
      esewa: number;
      khalti: number;
      stripe: number;
      paypal: number;
    };
    byOGTier: {
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
      tier5: number;
    };
    giftRevenue: number;
    coinTopups: number;
    platformFees: number;
  };
  
  // Engagement KPIs
  engagement: {
    dau: number; // Daily Active Users
    mau: number; // Monthly Active Users (calculated)
    avgSessionDuration: number; // in minutes
    avgViewersPerStream: number;
    totalStreams: number;
    totalStreamDuration: number; // in minutes
    battleParticipation: number;
    giftSent: number;
    messagesSent: number;
  };
  
  // Monetization KPIs
  monetization: {
    arpu: number; // Average Revenue Per User
    arppu: number; // Average Revenue Per Paying User
    payerRate: number; // Percentage of users who paid
    avgGiftValue: number;
    coinTopupVolume: number;
    ogConversionRate: number;
  };
  
  // Creator KPIs
  creators: {
    activeHosts: number;
    topHostRevenue: number;
    avgHostRevenue: number;
    newHosts: number;
    hostRetentionRate: number;
  };
  
  // Safety KPIs
  safety: {
    flaggedContent: number;
    bannedUsers: number;
    appealsProcessed: number;
    moderationActions: number;
    safetyScore: number; // 0-100
  };
  
  // Gaming KPIs
  gaming: {
    gamesPlayed: number;
    totalStakes: number;
    totalPayouts: number;
    houseEdge: number;
    avgGameDuration: number;
    activePlayers: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const analyticsDailyKPISchema = new Schema<IAnalyticsDailyKPI>({
  appId: {
    type: String,
    required: true,
    default: 'halobuzz',
    index: true
  },
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
  
  revenue: {
    total: { type: Number, default: 0, min: 0 },
    byPaymentMethod: {
      esewa: { type: Number, default: 0, min: 0 },
      khalti: { type: Number, default: 0, min: 0 },
      stripe: { type: Number, default: 0, min: 0 },
      paypal: { type: Number, default: 0, min: 0 }
    },
    byOGTier: {
      tier1: { type: Number, default: 0, min: 0 },
      tier2: { type: Number, default: 0, min: 0 },
      tier3: { type: Number, default: 0, min: 0 },
      tier4: { type: Number, default: 0, min: 0 },
      tier5: { type: Number, default: 0, min: 0 }
    },
    giftRevenue: { type: Number, default: 0, min: 0 },
    coinTopups: { type: Number, default: 0, min: 0 },
    platformFees: { type: Number, default: 0, min: 0 }
  },
  
  engagement: {
    dau: { type: Number, default: 0, min: 0 },
    mau: { type: Number, default: 0, min: 0 },
    avgSessionDuration: { type: Number, default: 0, min: 0 },
    avgViewersPerStream: { type: Number, default: 0, min: 0 },
    totalStreams: { type: Number, default: 0, min: 0 },
    totalStreamDuration: { type: Number, default: 0, min: 0 },
    battleParticipation: { type: Number, default: 0, min: 0 },
    giftSent: { type: Number, default: 0, min: 0 },
    messagesSent: { type: Number, default: 0, min: 0 }
  },
  
  monetization: {
    arpu: { type: Number, default: 0, min: 0 },
    arppu: { type: Number, default: 0, min: 0 },
    payerRate: { type: Number, default: 0, min: 0, max: 100 },
    avgGiftValue: { type: Number, default: 0, min: 0 },
    coinTopupVolume: { type: Number, default: 0, min: 0 },
    ogConversionRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  creators: {
    activeHosts: { type: Number, default: 0, min: 0 },
    topHostRevenue: { type: Number, default: 0, min: 0 },
    avgHostRevenue: { type: Number, default: 0, min: 0 },
    newHosts: { type: Number, default: 0, min: 0 },
    hostRetentionRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  safety: {
    flaggedContent: { type: Number, default: 0, min: 0 },
    bannedUsers: { type: Number, default: 0, min: 0 },
    appealsProcessed: { type: Number, default: 0, min: 0 },
    moderationActions: { type: Number, default: 0, min: 0 },
    safetyScore: { type: Number, default: 100, min: 0, max: 100 }
  },
  
  gaming: {
    gamesPlayed: { type: Number, default: 0, min: 0 },
    totalStakes: { type: Number, default: 0, min: 0 },
    totalPayouts: { type: Number, default: 0, min: 0 },
    houseEdge: { type: Number, default: 40, min: 0, max: 100 },
    avgGameDuration: { type: Number, default: 0, min: 0 },
    activePlayers: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsDailyKPISchema.index({ appId: 1, date: -1, country: 1 });
analyticsDailyKPISchema.index({ appId: 1, date: -1 });
analyticsDailyKPISchema.index({ appId: 1, country: 1, date: -1 });
analyticsDailyKPISchema.index({ date: -1, country: 1 });
analyticsDailyKPISchema.index({ date: -1 });
analyticsDailyKPISchema.index({ country: 1, date: -1 });

// Unique constraint to prevent duplicates
analyticsDailyKPISchema.index({ appId: 1, date: 1, country: 1 }, { unique: true });

export const AnalyticsDailyKPI = mongoose.model<IAnalyticsDailyKPI>('AnalyticsDailyKPI', analyticsDailyKPISchema);
