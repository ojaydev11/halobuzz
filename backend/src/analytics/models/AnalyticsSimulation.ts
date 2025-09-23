import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsSimulation extends Document {
  scenario: string;
  params: Record<string, any>;
  segment: Record<string, any>;
  horizonDays: number;
  baseline: {
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  };
  projected: {
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  };
  delta: {
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  };
  dailyProjections: Array<{
    date: string;
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  }>;
  confidence: number;
  assumptions: string[];
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSimulationSchema = new Schema<IAnalyticsSimulation>({
  scenario: {
    type: String,
    required: true,
    index: true
  },
  params: {
    type: Schema.Types.Mixed,
    default: {}
  },
  segment: {
    type: Schema.Types.Mixed,
    default: {}
  },
  horizonDays: {
    type: Number,
    required: true,
    min: 7,
    max: 60
  },
  baseline: {
    revenue: { type: Number, required: true },
    payerRate: { type: Number, required: true },
    arppu: { type: Number, required: true },
    engagement: { type: Number, required: true }
  },
  projected: {
    revenue: { type: Number, required: true },
    payerRate: { type: Number, required: true },
    arppu: { type: Number, required: true },
    engagement: { type: Number, required: true }
  },
  delta: {
    revenue: { type: Number, required: true },
    payerRate: { type: Number, required: true },
    arppu: { type: Number, required: true },
    engagement: { type: Number, required: true }
  },
  dailyProjections: [{
    date: { type: String, required: true },
    revenue: { type: Number, required: true },
    payerRate: { type: Number, required: true },
    arppu: { type: Number, required: true },
    engagement: { type: Number, required: true }
  }],
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  assumptions: [{
    type: String
  }],
  generatedAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
analyticsSimulationSchema.index({ scenario: 1, generatedAt: -1 });
analyticsSimulationSchema.index({ generatedAt: -1 });

// TTL for old simulations (90 days)
analyticsSimulationSchema.index(
  { generatedAt: 1 },
  { expireAfterSeconds: 7776000 } // 90 days
);

export const AnalyticsSimulation = mongoose.model<IAnalyticsSimulation>('AnalyticsSimulation', analyticsSimulationSchema);
