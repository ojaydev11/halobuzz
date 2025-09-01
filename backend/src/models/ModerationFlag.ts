import mongoose, { Document, Schema } from 'mongoose';

export interface IModerationFlag extends Document {
  reporterId: string;
  reportedUserId?: string;
  reportedStreamId?: string;
  reportedMessageId?: string;
  type: 'user' | 'stream' | 'message' | 'content';
  reason: 'inappropriate' | 'spam' | 'harassment' | 'violence' | 'copyright' | 'fake_news' | 'other';
  description: string;
  evidence?: string[]; // URLs to evidence
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedModerator?: string;
  reviewedAt?: Date;
  action?: 'warn' | 'blur' | 'ban' | 'delete' | 'none';
  actionDetails?: {
    duration?: number; // for temporary bans
    reason: string;
    notified: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const moderationFlagSchema = new Schema<IModerationFlag>({
  reporterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reportedStreamId: {
    type: Schema.Types.ObjectId,
    ref: 'LiveStream',
    default: null
  },
  reportedMessageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['user', 'stream', 'message', 'content']
  },
  reason: {
    type: String,
    required: true,
    enum: ['inappropriate', 'spam', 'harassment', 'violence', 'copyright', 'fake_news', 'other']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  evidence: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    required: true,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedModerator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  action: {
    type: String,
    enum: ['warn', 'blur', 'ban', 'delete', 'none'],
    default: null
  },
  actionDetails: {
    duration: { type: Number, min: 0 }, // in hours
    reason: { type: String, maxlength: 500 },
    notified: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes
moderationFlagSchema.index({ status: 1, priority: 1 });
moderationFlagSchema.index({ type: 1 });
moderationFlagSchema.index({ reason: 1 });
moderationFlagSchema.index({ reportedUserId: 1 });
moderationFlagSchema.index({ reportedStreamId: 1 });
moderationFlagSchema.index({ reportedMessageId: 1 });
moderationFlagSchema.index({ reporterId: 1 });
moderationFlagSchema.index({ assignedModerator: 1 });
moderationFlagSchema.index({ createdAt: -1 });

// Pre-save middleware to set priority based on reason
moderationFlagSchema.pre('save', function(next) {
  if (this.isModified('reason')) {
    const priorityMap = {
      'violence': 'urgent',
      'harassment': 'high',
      'inappropriate': 'medium',
      'spam': 'low',
      'copyright': 'high',
      'fake_news': 'medium',
      'other': 'low'
    };
    this.priority = priorityMap[this.reason] || 'medium';
  }
  next();
});

// Method to assign moderator
moderationFlagSchema.methods.assignModerator = function(moderatorId: string): void {
  this.assignedModerator = moderatorId;
  this.status = 'reviewed';
  this.reviewedAt = new Date();
};

// Method to resolve flag
moderationFlagSchema.methods.resolve = function(action: string, details: any): void {
  this.status = 'resolved';
  this.action = action;
  this.actionDetails = details;
  this.reviewedAt = new Date();
};

// Static method to find pending flags
moderationFlagSchema.statics.findPending = function(limit: number = 50) {
  return this.find({ status: 'pending' })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit)
    .populate('reporterId', 'username avatar')
    .populate('reportedUserId', 'username avatar')
    .populate('reportedStreamId', 'title thumbnail')
    .populate('assignedModerator', 'username avatar');
};

// Static method to find flags by user
moderationFlagSchema.statics.findByReportedUser = function(userId: string) {
  return this.find({ reportedUserId: userId })
    .sort({ createdAt: -1 })
    .populate('reporterId', 'username avatar')
    .populate('assignedModerator', 'username avatar');
};

// Static method to find flags by stream
moderationFlagSchema.statics.findByStream = function(streamId: string) {
  return this.find({ reportedStreamId: streamId })
    .sort({ createdAt: -1 })
    .populate('reporterId', 'username avatar')
    .populate('assignedModerator', 'username avatar');
};

// Static method to get moderation statistics
moderationFlagSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

export const ModerationFlag = mongoose.model<IModerationFlag>('ModerationFlag', moderationFlagSchema);
