import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsHostPerformance extends Document {
  hostId: mongoose.Types.ObjectId;
  date: Date;
  country: string;
  
  // Stream Performance
  streams: {
    totalStreams: number;
    totalDuration: number; // in minutes
    avgDuration: number; // in minutes
    totalViewers: number;
    avgViewers: number;
    peakViewers: number;
    uniqueViewers: number;
  };
  
  // Engagement Metrics
  engagement: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalGifts: number;
    totalGiftCoins: number;
    engagementRate: number; // percentage
    viewerRetention: number; // percentage
    giftConversionRate: number; // percentage
  };
  
  // Revenue Metrics
  revenue: {
    totalRevenue: number;
    avgRevenuePerStream: number;
    topStreamRevenue: number;
    revenueGrowth: number; // percentage vs previous period
    giftRevenue: number;
    ogRevenue: number;
  };
  
  // Audience Demographics
  audience: {
    topCountries: Array<{ country: string; viewers: number }>;
    ageGroups: Array<{ ageGroup: string; viewers: number }>;
    genderDistribution: Array<{ gender: string; viewers: number }>;
    returningViewers: number;
    newViewers: number;
  };
  
  // Performance Rankings
  rankings: {
    revenueRank: number;
    viewersRank: number;
    engagementRank: number;
    overallRank: number;
    categoryRank: number; // within their content category
  };
  
  // Growth Metrics
  growth: {
    followerGrowth: number;
    viewerGrowth: number;
    revenueGrowth: number;
    engagementGrowth: number;
    streamFrequencyGrowth: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const analyticsHostPerformanceSchema = new Schema<IAnalyticsHostPerformance>({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  
  streams: {
    totalStreams: { type: Number, default: 0, min: 0 },
    totalDuration: { type: Number, default: 0, min: 0 },
    avgDuration: { type: Number, default: 0, min: 0 },
    totalViewers: { type: Number, default: 0, min: 0 },
    avgViewers: { type: Number, default: 0, min: 0 },
    peakViewers: { type: Number, default: 0, min: 0 },
    uniqueViewers: { type: Number, default: 0, min: 0 }
  },
  
  engagement: {
    totalLikes: { type: Number, default: 0, min: 0 },
    totalComments: { type: Number, default: 0, min: 0 },
    totalShares: { type: Number, default: 0, min: 0 },
    totalGifts: { type: Number, default: 0, min: 0 },
    totalGiftCoins: { type: Number, default: 0, min: 0 },
    engagementRate: { type: Number, default: 0, min: 0, max: 100 },
    viewerRetention: { type: Number, default: 0, min: 0, max: 100 },
    giftConversionRate: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  revenue: {
    totalRevenue: { type: Number, default: 0, min: 0 },
    avgRevenuePerStream: { type: Number, default: 0, min: 0 },
    topStreamRevenue: { type: Number, default: 0, min: 0 },
    revenueGrowth: { type: Number, default: 0 },
    giftRevenue: { type: Number, default: 0, min: 0 },
    ogRevenue: { type: Number, default: 0, min: 0 }
  },
  
  audience: {
    topCountries: [{
      country: String,
      viewers: Number
    }],
    ageGroups: [{
      ageGroup: String,
      viewers: Number
    }],
    genderDistribution: [{
      gender: String,
      viewers: Number
    }],
    returningViewers: { type: Number, default: 0, min: 0 },
    newViewers: { type: Number, default: 0, min: 0 }
  },
  
  rankings: {
    revenueRank: { type: Number, default: 0, min: 0 },
    viewersRank: { type: Number, default: 0, min: 0 },
    engagementRank: { type: Number, default: 0, min: 0 },
    overallRank: { type: Number, default: 0, min: 0 },
    categoryRank: { type: Number, default: 0, min: 0 }
  },
  
  growth: {
    followerGrowth: { type: Number, default: 0 },
    viewerGrowth: { type: Number, default: 0 },
    revenueGrowth: { type: Number, default: 0 },
    engagementGrowth: { type: Number, default: 0 },
    streamFrequencyGrowth: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsHostPerformanceSchema.index({ hostId: 1, date: -1 });
analyticsHostPerformanceSchema.index({ date: -1, country: 1 });
analyticsHostPerformanceSchema.index({ 'rankings.overallRank': 1, date: -1 });
analyticsHostPerformanceSchema.index({ 'revenue.totalRevenue': -1, date: -1 });

// Unique constraint to prevent duplicates
analyticsHostPerformanceSchema.index({ hostId: 1, date: 1, country: 1 }, { unique: true });

export const AnalyticsHostPerformance = mongoose.model<IAnalyticsHostPerformance>('AnalyticsHostPerformance', analyticsHostPerformanceSchema);
