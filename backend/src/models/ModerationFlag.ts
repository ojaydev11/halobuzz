import mongoose, { Document, Schema } from 'mongoose';

export interface IModerationFlag extends Document {
  userId: mongoose.Types.ObjectId;
  contentType: 'text' | 'image' | 'video' | 'stream' | 'profile';
  action: 'allow' | 'warn' | 'block' | 'review';
  confidence: number;
  categories: string[];
  reason?: string;
  metadata?: {
    contentId?: string;
    streamId?: string;
    originalContent?: string;
    context?: any;
    [key: string]: any;
  };
  status: 'pending' | 'reviewed' | 'flagged' | 'resolved';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const moderationFlagSchema = new Schema<IModerationFlag>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentType: {
    type: String,
    required: true,
    enum: ['text', 'image', 'video', 'stream', 'profile']
  },
  action: {
    type: String,
    required: true,
    enum: ['allow', 'warn', 'block', 'review']
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  categories: [{
    type: String,
    required: true
  }],
  reason: {
    type: String,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'reviewed', 'flagged', 'resolved'],
    default: 'pending'
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  resolution: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes
moderationFlagSchema.index({ userId: 1, createdAt: -1 });
moderationFlagSchema.index({ contentType: 1, action: 1 });
moderationFlagSchema.index({ status: 1, createdAt: -1 });
moderationFlagSchema.index({ confidence: 1 });
moderationFlagSchema.index({ categories: 1 });

// Static methods
moderationFlagSchema.statics.findByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar')
    .populate('reviewedBy', 'username');
};

moderationFlagSchema.statics.findPending = function(limit: number = 100) {
  return this.find({ status: 'pending' })
    .sort({ confidence: -1, createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

moderationFlagSchema.statics.findByAction = function(action: string, limit: number = 100) {
  return this.find({ action })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username avatar');
};

// Instance methods
moderationFlagSchema.methods.resolve = function(reviewedBy: string, resolution: string) {
  this.status = 'resolved';
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  this.resolution = resolution;
  return this.save();
};

moderationFlagSchema.methods.flag = function() {
  this.status = 'flagged';
  return this.save();
};

// Static methods
moderationFlagSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

moderationFlagSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Instance methods
moderationFlagSchema.methods.resolve = function(resolution: string, reviewedBy: string) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.reviewedBy = reviewedBy;
  this.reviewedAt = new Date();
  return this.save();
};

moderationFlagSchema.methods.flag = function() {
  this.status = 'flagged';
  return this.save();
};

export const ModerationFlag = mongoose.model<IModerationFlag>('ModerationFlag', moderationFlagSchema);