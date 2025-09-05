import mongoose, { Document, Schema } from 'mongoose';

export interface IReputationEvent extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'gift_sent' | 'gift_received' | 'stream_hosted' | 'stream_watched' | 'og_subscription' | 'throne_claimed' | 'game_won' | 'report_received' | 'moderation_action' | 'help_neighbor' | 'teach_skill' | 'mentor_user' | 'donate_time' | 'support_cause' | 'create_positive_content' | 'cultural_celebration' | 'festival_participation' | 'community_challenge' | 'wellness_support';
  delta: number; // positive or negative reputation change
  karmaDelta?: number; // karma points awarded (separate from reputation)
  karmaCategory?: 'helpfulness' | 'mentorship' | 'creativity' | 'positivity' | 'cultural_respect' | 'community_service';
  description: string;
  descriptionNepali?: string; // Nepali translation for cultural events
  metadata?: {
    giftId?: string;
    streamId?: string;
    gameId?: string;
    ogTier?: number;
    reportReason?: string;
    moderationAction?: string;
    // Karma-specific metadata
    impact?: number;
    verifiedBy?: string;
    communityActionId?: string;
    milestoneId?: string;
    // Cultural metadata
    festivalName?: string;
    festivalNameNepali?: string;
    culturalSignificance?: string;
    // Wellness metadata
    wellnessType?: 'mental_health' | 'emotional_support' | 'motivation' | 'guidance';
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const reputationEventSchema = new Schema<IReputationEvent>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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
      'moderation_action',
      'help_neighbor',
      'teach_skill',
      'mentor_user',
      'donate_time',
      'support_cause',
      'create_positive_content',
      'cultural_celebration',
      'festival_participation',
      'community_challenge',
      'wellness_support'
    ]
  },
  delta: {
    type: Number,
    required: true
  },
  karmaDelta: {
    type: Number,
    default: 0
  },
  karmaCategory: {
    type: String,
    enum: ['helpfulness', 'mentorship', 'creativity', 'positivity', 'cultural_respect', 'community_service'],
    default: null
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  descriptionNepali: {
    type: String,
    maxlength: 200,
    default: null
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
reputationEventSchema.index({ karmaDelta: 1 });
reputationEventSchema.index({ karmaCategory: 1 });
reputationEventSchema.index({ userId: 1, karmaCategory: 1 });

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

// Static method to find karma events by category
reputationEventSchema.statics.findKarmaByCategory = function(category: string, limit: number = 50) {
  return this.find({ karmaCategory: category, karmaDelta: { $gt: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar karma.total karma.level');
};

// Static method to get user karma summary
reputationEventSchema.statics.getUserKarmaSummary = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), karmaDelta: { $gt: 0 } } },
    {
      $group: {
        _id: '$karmaCategory',
        totalKarma: { $sum: '$karmaDelta' },
        count: { $sum: 1 },
        averageKarma: { $avg: '$karmaDelta' }
      }
    }
  ]);
};

// Static method to get total karma for user
reputationEventSchema.statics.getTotalKarma = function(userId: string) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), karmaDelta: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        totalKarma: { $sum: '$karmaDelta' }
      }
    }
  ]);
};

// Static method to find cultural events
reputationEventSchema.statics.findCulturalEvents = function(limit: number = 20) {
  return this.find({ 
    type: { $in: ['cultural_celebration', 'festival_participation'] },
    karmaDelta: { $gt: 0 }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar karma.total karma.level');
};

export const ReputationEvent = mongoose.model<IReputationEvent>('ReputationEvent', reputationEventSchema);
