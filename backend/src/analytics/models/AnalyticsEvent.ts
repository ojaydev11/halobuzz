import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  eventType: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
    browser?: string;
    os?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  metadata?: Record<string, any>;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'user_action',
      'system_event',
      'business_event',
      'error_event',
      'performance_event',
      'security_event'
    ]
  },
  eventName: {
    type: String,
    required: true,
    maxlength: 100
  },
  properties: {
    type: Schema.Types.Mixed,
    required: true,
    default: {}
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  sessionId: {
    type: String,
    maxlength: 100
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String,
    os: String
  },
  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'analytics_events'
});

// Indexes for performance
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ eventName: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ sessionId: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 });
analyticsEventSchema.index({ 'location.country': 1, timestamp: -1 });

// Compound indexes for common queries
analyticsEventSchema.index({ eventType: 1, eventName: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });

// Static methods
analyticsEventSchema.statics.findByEventType = function(eventType: string, limit: number = 100) {
  return this.find({ eventType }).sort({ timestamp: -1 }).limit(limit);
};

analyticsEventSchema.statics.findByUser = function(userId: string, limit: number = 100) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit);
};

analyticsEventSchema.statics.findBySession = function(sessionId: string) {
  return this.find({ sessionId }).sort({ timestamp: 1 });
};

analyticsEventSchema.statics.getEventCounts = function(startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventName',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        eventName: '$_id',
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);
export default AnalyticsEvent;
