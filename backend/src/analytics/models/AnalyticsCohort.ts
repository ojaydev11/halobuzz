import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsCohort extends Document {
  cohortDate: Date; // Week/Month when users signed up
  granularity: 'week' | 'month';
  country: string;
  
  // Cohort Size
  cohortSize: number; // Number of users who signed up in this period
  
  // Retention Metrics (percentage of cohort still active)
  retention: {
    d1: number; // Day 1 retention
    d3: number; // Day 3 retention
    d7: number; // Day 7 retention
    d14: number; // Day 14 retention
    d30: number; // Day 30 retention
    d60: number; // Day 60 retention
    d90: number; // Day 90 retention
  };
  
  // Revenue Metrics
  revenue: {
    totalRevenue: number; // Total revenue from this cohort
    avgRevenuePerUser: number; // ARPU for this cohort
    revenueByPeriod: {
      week1: number;
      week2: number;
      week3: number;
      week4: number;
      month2: number;
      month3: number;
    };
  };
  
  // Engagement Metrics
  engagement: {
    avgSessionsPerUser: number;
    avgStreamsPerUser: number;
    avgGiftsSentPerUser: number;
    avgGiftsReceivedPerUser: number;
    avgGamePlaysPerUser: number;
  };
  
  // Churn Analysis
  churn: {
    churnedUsers: number; // Users who haven't been active for 30+ days
    churnRate: number; // Percentage of cohort that churned
    avgLifetimeDays: number; // Average days active before churning
    churnRiskScore: number; // 0-100 risk score
  };
  
  // Creator Metrics (for users who became creators)
  creators: {
    creatorsInCohort: number;
    creatorConversionRate: number; // percentage
    avgCreatorRevenue: number;
    topCreatorRevenue: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const analyticsCohortSchema = new Schema<IAnalyticsCohort>({
  cohortDate: {
    type: Date,
    required: true,
    index: true
  },
  granularity: {
    type: String,
    required: true,
    enum: ['week', 'month'],
    index: true
  },
  country: {
    type: String,
    required: true,
    default: 'ALL',
    index: true
  },
  
  cohortSize: {
    type: Number,
    required: true,
    min: 0
  },
  
  retention: {
    d1: { type: Number, default: 0, min: 0, max: 100 },
    d3: { type: Number, default: 0, min: 0, max: 100 },
    d7: { type: Number, default: 0, min: 0, max: 100 },
    d14: { type: Number, default: 0, min: 0, max: 100 },
    d30: { type: Number, default: 0, min: 0, max: 100 },
    d60: { type: Number, default: 0, min: 0, max: 100 },
    d90: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  revenue: {
    totalRevenue: { type: Number, default: 0, min: 0 },
    avgRevenuePerUser: { type: Number, default: 0, min: 0 },
    revenueByPeriod: {
      week1: { type: Number, default: 0, min: 0 },
      week2: { type: Number, default: 0, min: 0 },
      week3: { type: Number, default: 0, min: 0 },
      week4: { type: Number, default: 0, min: 0 },
      month2: { type: Number, default: 0, min: 0 },
      month3: { type: Number, default: 0, min: 0 }
    }
  },
  
  engagement: {
    avgSessionsPerUser: { type: Number, default: 0, min: 0 },
    avgStreamsPerUser: { type: Number, default: 0, min: 0 },
    avgGiftsSentPerUser: { type: Number, default: 0, min: 0 },
    avgGiftsReceivedPerUser: { type: Number, default: 0, min: 0 },
    avgGamePlaysPerUser: { type: Number, default: 0, min: 0 }
  },
  
  churn: {
    churnedUsers: { type: Number, default: 0, min: 0 },
    churnRate: { type: Number, default: 0, min: 0, max: 100 },
    avgLifetimeDays: { type: Number, default: 0, min: 0 },
    churnRiskScore: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  creators: {
    creatorsInCohort: { type: Number, default: 0, min: 0 },
    creatorConversionRate: { type: Number, default: 0, min: 0, max: 100 },
    avgCreatorRevenue: { type: Number, default: 0, min: 0 },
    topCreatorRevenue: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsCohortSchema.index({ cohortDate: -1, granularity: 1, country: 1 });
analyticsCohortSchema.index({ granularity: 1, cohortDate: -1 });
analyticsCohortSchema.index({ country: 1, cohortDate: -1 });

// Unique constraint to prevent duplicates
analyticsCohortSchema.index({ cohortDate: 1, granularity: 1, country: 1 }, { unique: true });

export const AnalyticsCohort = mongoose.model<IAnalyticsCohort>('AnalyticsCohort', analyticsCohortSchema);
