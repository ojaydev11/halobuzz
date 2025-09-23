import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsAlert extends Document {
  appId: string;
  alertId: string;
  type: 'revenue_drop' | 'payer_rate_drop' | 'abuse_spike' | 'infra_error' | 'churn_spike' | 'engagement_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  
  // Alert Details
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  deviation: number; // percentage deviation from threshold
  
  // Context
  country?: string;
  timeWindow: string; // '15min', '1hour', '1day'
  affectedUsers?: number;
  affectedRevenue?: number;
  
  // Alert Configuration
  config: {
    threshold: number;
    comparisonPeriod: string; // '7day_avg', '30day_avg', 'previous_day'
    notificationChannels: string[]; // 'email', 'slack', 'webhook'
    autoResolve: boolean;
    escalationLevel: number;
  };
  
  // Resolution
  resolution?: {
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
    resolution: string;
    actionTaken: string;
  };
  
  // Notifications
  notifications: Array<{
    channel: string;
    sentAt: Date;
    status: 'sent' | 'failed' | 'delivered';
    response?: string;
  }>;
  
  // Related Data
  relatedData: {
    kpiSnapshot: any;
    affectedEntities: string[]; // user IDs, stream IDs, etc.
    trends: any;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const analyticsAlertSchema = new Schema<IAnalyticsAlert>({
  appId: {
    type: String,
    required: true,
    default: 'halobuzz',
    index: true
  },
  alertId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['revenue_drop', 'payer_rate_drop', 'abuse_spike', 'infra_error', 'churn_spike', 'engagement_drop'],
    index: true
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'acknowledged', 'resolved', 'dismissed'],
    default: 'active',
    index: true
  },
  
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  metric: {
    type: String,
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  thresholdValue: {
    type: Number,
    required: true
  },
  deviation: {
    type: Number,
    required: true
  },
  
  country: {
    type: String,
    default: 'ALL',
    index: true
  },
  timeWindow: {
    type: String,
    required: true,
    enum: ['15min', '1hour', '1day', '7day']
  },
  affectedUsers: {
    type: Number,
    default: 0,
    min: 0
  },
  affectedRevenue: {
    type: Number,
    default: 0,
    min: 0
  },
  
  config: {
    threshold: { type: Number, required: true },
    comparisonPeriod: { 
      type: String, 
      required: true,
      enum: ['7day_avg', '30day_avg', 'previous_day', 'previous_week']
    },
    notificationChannels: [{ type: String }],
    autoResolve: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 1, min: 1, max: 3 }
  },
  
  resolution: {
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolution: String,
    actionTaken: String
  },
  
  notifications: [{
    channel: { type: String, required: true },
    sentAt: { type: Date, required: true },
    status: { 
      type: String, 
      required: true,
      enum: ['sent', 'failed', 'delivered']
    },
    response: String
  }],
  
  relatedData: {
    kpiSnapshot: { type: Schema.Types.Mixed },
    affectedEntities: [String],
    trends: { type: Schema.Types.Mixed }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
analyticsAlertSchema.index({ appId: 1, status: 1, severity: 1, createdAt: -1 });
analyticsAlertSchema.index({ appId: 1, type: 1, country: 1, createdAt: -1 });
analyticsAlertSchema.index({ appId: 1, createdAt: -1 });
analyticsAlertSchema.index({ appId: 1, 'config.escalationLevel': 1, status: 1 });
analyticsAlertSchema.index({ status: 1, severity: 1, createdAt: -1 });
analyticsAlertSchema.index({ type: 1, country: 1, createdAt: -1 });
analyticsAlertSchema.index({ createdAt: -1 });
analyticsAlertSchema.index({ 'config.escalationLevel': 1, status: 1 });

// TTL for resolved alerts (90 days)
analyticsAlertSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 7776000, // 90 days
    partialFilterExpression: { status: 'resolved' }
  }
);

export const AnalyticsAlert = mongoose.model<IAnalyticsAlert>('AnalyticsAlert', analyticsAlertSchema);
