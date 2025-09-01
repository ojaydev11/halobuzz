import mongoose, { Document, Schema } from 'mongoose';

export interface IReputationEvent extends Document {
  userId: string;
  type: 'gift_sent' | 'gift_received' | 'stream_hosted' | 'stream_watched' | 'og_subscription' | 'throne_claimed' | 'game_won' | 'report_received' | 'moderation_action';
  delta: number; // positive or negative reputation change
  description: string;
  metadata?: {
    giftId?: string;
    streamId?: string;
    gameId?: string;
    ogTier?: number;
    reportReason?: string;
    moderationAction?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const reputationEventSchema = new Schema<IReputationEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'gift_sent',
      'gift_received',
      'stream_hosted',
      'stream_watched',
      'og_subscription',
      'throne_claimed',
      'game_won',
      'report_received',
      'moderation_action'
    ]
  },
  delta: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
reputationEventSchema.index({ userId: 1, createdAt: 1 });
reputationEventSchema.index({ type: 1 });
reputationEventSchema.index({ delta: 1 });
reputationEventSchema.index({ createdAt: -1 });

// Static method to find user reputation events
reputationEventSchema.statics.findByUser = function(userId: string, limit: number = 50, skip: number = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'username avatar');
};

// Static method to find events by type
reputationEventSchema.statics.findByType = function(type: string, limit: number = 50) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

// Static method to get user reputation summary
reputationEventSchema.statics.getUserSummary = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$type',
        totalDelta: { $sum: '$delta' },
        count: { $sum: 1 },
        averageDelta: { $avg: '$delta' }
      }
    }
  ]);
};

// Static method to get total reputation for user
reputationEventSchema.statics.getTotalReputation = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalReputation: { $sum: '$delta' }
      }
    }
  ]);
};

// Static method to find recent reputation events
reputationEventSchema.statics.findRecent = function(limit: number = 20) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

export const ReputationEvent = mongoose.model<IReputationEvent>('ReputationEvent', reputationEventSchema);
