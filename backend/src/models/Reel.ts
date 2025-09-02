import mongoose, { Document, Schema } from 'mongoose';

export interface IReel extends Document {
  userId: mongoose.Types.ObjectId;
  username: string;
  avatar?: string;
  fileKey: string;
  viewUrl?: string;
  title: string;
  description?: string;
  tags: string[];
  category: 'entertainment' | 'gaming' | 'music' | 'comedy' | 'education' | 'lifestyle' | 'other';
  isPublic: boolean;
  status: 'processing' | 'active' | 'blocked' | 'deleted';
  metadata: {
    duration: number; // in seconds
    resolution: string; // e.g., "1080x1920"
    fileSize: number; // in bytes
    format: string; // e.g., "mp4"
    thumbnail?: string; // thumbnail URL
    views: number;
    likes: number;
    shares: number;
    comments: number;
    trendingScore: number;
    engagementRate: number;
  };
  likes: mongoose.Types.ObjectId[]; // User IDs who liked
  comments: {
    userId: mongoose.Types.ObjectId;
    username: string;
    avatar?: string;
    text: string;
    createdAt: Date;
    likes: number;
    replies: {
      userId: mongoose.Types.ObjectId;
      username: string;
      avatar?: string;
      text: string;
      createdAt: Date;
      likes: number;
    }[];
  }[];
  analytics: {
    watchTime: number; // total watch time in seconds
    completionRate: number; // percentage of viewers who watched to end
    shareRate: number;
    likeRate: number;
    commentRate: number;
    demographics: {
      ageGroups: Map<string, number>;
      countries: Map<string, number>;
      genders: Map<string, number>;
    };
    peakViewers: number;
    avgWatchTime: number;
  };
  moderation: {
    isReviewed: boolean;
    reviewedAt?: Date;
    reviewedBy?: mongoose.Types.ObjectId;
    flags: string[];
    aiModerationScore: number; // 0-100, higher = more likely to violate
    contentWarnings: string[];
  };
  monetization: {
    isMonetized: boolean;
    revenue: number;
    adRevenue: number;
    giftRevenue: number;
    subscriptionRevenue: number;
  };
  processing: {
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number; // 0-100
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    tasks: {
      transcoding: boolean;
      thumbnailGeneration: boolean;
      contentModeration: boolean;
      aiAnalysis: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  incrementView(): Promise<void>;
  addLike(userId: string): Promise<boolean>;
  removeLike(userId: string): Promise<boolean>;
  addComment(comment: any): Promise<void>;
  updateTrendingScore(): Promise<void>;
  softDelete(): Promise<void>;
}

const reelSchema = new Schema<IReel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  fileKey: {
    type: String,
    required: true,
    unique: true
  },
  viewUrl: {
    type: String
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  tags: [{
    type: String,
    maxlength: 20,
    trim: true
  }],
  category: {
    type: String,
    enum: ['entertainment', 'gaming', 'music', 'comedy', 'education', 'lifestyle', 'other'],
    default: 'other',
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  status: {
    type: String,
    enum: ['processing', 'active', 'blocked', 'deleted'],
    default: 'processing',
    index: true
  },
  metadata: {
    duration: { type: Number, default: 0 },
    resolution: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    format: { type: String, default: 'mp4' },
    thumbnail: { type: String },
    views: { type: Number, default: 0, index: true },
    likes: { type: Number, default: 0, index: true },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0, index: true },
    engagementRate: { type: Number, default: 0 }
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: { type: String, required: true },
    avatar: { type: String },
    text: { 
      type: String, 
      required: true, 
      maxlength: 500,
      trim: true
    },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    replies: [{
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: { type: String, required: true },
      avatar: { type: String },
      text: { 
        type: String, 
        required: true, 
        maxlength: 300,
        trim: true
      },
      createdAt: { type: Date, default: Date.now },
      likes: { type: Number, default: 0 }
    }]
  }],
  analytics: {
    watchTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    shareRate: { type: Number, default: 0 },
    likeRate: { type: Number, default: 0 },
    commentRate: { type: Number, default: 0 },
    demographics: {
      ageGroups: { type: Map, of: Number, default: new Map() },
      countries: { type: Map, of: Number, default: new Map() },
      genders: { type: Map, of: Number, default: new Map() }
    },
    peakViewers: { type: Number, default: 0 },
    avgWatchTime: { type: Number, default: 0 }
  },
  moderation: {
    isReviewed: { type: Boolean, default: false },
    reviewedAt: { type: Date },
    reviewedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User' 
    },
    flags: [{ type: String }],
    aiModerationScore: { type: Number, default: 0, min: 0, max: 100 },
    contentWarnings: [{ type: String }]
  },
  monetization: {
    isMonetized: { type: Boolean, default: false },
    revenue: { type: Number, default: 0 },
    adRevenue: { type: Number, default: 0 },
    giftRevenue: { type: Number, default: 0 },
    subscriptionRevenue: { type: Number, default: 0 }
  },
  processing: {
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued'
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    errorMessage: { type: String },
    tasks: {
      transcoding: { type: Boolean, default: false },
      thumbnailGeneration: { type: Boolean, default: false },
      contentModeration: { type: Boolean, default: false },
      aiAnalysis: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Don't expose sensitive internal data
      delete ret.processing;
      delete ret.moderation?.reviewedBy;
      return ret;
    }
  }
});

// Indexes for performance
reelSchema.index({ userId: 1, createdAt: -1 });
reelSchema.index({ status: 1, isPublic: 1 });
reelSchema.index({ category: 1, 'metadata.views': -1 });
reelSchema.index({ 'metadata.trendingScore': -1 });
reelSchema.index({ 'metadata.likes': -1 });
reelSchema.index({ tags: 1 });
reelSchema.index({ createdAt: -1 });
reelSchema.index({ 'moderation.isReviewed': 1, 'moderation.aiModerationScore': -1 });

// Compound indexes for common queries
reelSchema.index({ 
  status: 1, 
  isPublic: 1, 
  'metadata.trendingScore': -1 
});

reelSchema.index({ 
  category: 1, 
  status: 1, 
  'metadata.views': -1 
});

// Method to increment view count
reelSchema.methods.incrementView = async function(): Promise<void> {
  this.metadata.views += 1;
  await this.save();
};

// Method to add like
reelSchema.methods.addLike = async function(userId: string): Promise<boolean> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  if (this.likes.includes(userObjectId)) {
    return false; // Already liked
  }
  
  this.likes.push(userObjectId);
  this.metadata.likes = this.likes.length;
  await this.save();
  return true;
};

// Method to remove like
reelSchema.methods.removeLike = async function(userId: string): Promise<boolean> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const index = this.likes.indexOf(userObjectId);
  
  if (index === -1) {
    return false; // Not liked
  }
  
  this.likes.splice(index, 1);
  this.metadata.likes = this.likes.length;
  await this.save();
  return true;
};

// Method to add comment
reelSchema.methods.addComment = async function(comment: any): Promise<void> {
  this.comments.push(comment);
  this.metadata.comments = this.comments.length;
  await this.save();
};

// Method to update trending score
reelSchema.methods.updateTrendingScore = async function(): Promise<void> {
  const now = Date.now();
  const createdTime = this.createdAt.getTime();
  const ageHours = (now - createdTime) / (1000 * 60 * 60);
  
  // Trending score algorithm
  const viewWeight = 1;
  const likeWeight = 2;
  const commentWeight = 3;
  const shareWeight = 4;
  const recencyMultiplier = Math.max(0.1, 1 / (1 + ageHours * 0.1));
  
  this.metadata.trendingScore = (
    this.metadata.views * viewWeight +
    this.metadata.likes * likeWeight +
    this.metadata.comments * commentWeight +
    this.metadata.shares * shareWeight
  ) * recencyMultiplier;
  
  await this.save();
};

// Method to soft delete
reelSchema.methods.softDelete = async function(): Promise<void> {
  this.status = 'deleted';
  await this.save();
};

// Static method to find trending reels
reelSchema.statics.findTrending = function(limit: number = 10, timeFrame: string = '24h') {
  const timeMap: { [key: string]: number } = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 168,
    '30d': 720
  };
  
  const hours = timeMap[timeFrame] || 24;
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    status: 'active',
    isPublic: true,
    createdAt: { $gte: cutoffTime }
  })
  .sort({ 'metadata.trendingScore': -1 })
  .limit(limit)
  .populate('userId', 'username avatar ogLevel');
};

// Static method to find by category
reelSchema.statics.findByCategory = function(category: string, limit: number = 20, skip: number = 0) {
  return this.find({
    category,
    status: 'active',
    isPublic: true
  })
  .sort({ 'metadata.views': -1 })
  .skip(skip)
  .limit(limit)
  .populate('userId', 'username avatar ogLevel');
};

// Virtual for engagement rate calculation
reelSchema.virtual('engagementRate').get(function() {
  if (this.metadata.views === 0) return 0;
  return ((this.metadata.likes + this.metadata.comments + this.metadata.shares) / this.metadata.views) * 100;
});

// Pre-save middleware to update engagement rate
reelSchema.pre('save', function(next) {
  if (this.metadata.views > 0) {
    this.metadata.engagementRate = ((this.metadata.likes + this.metadata.comments + this.metadata.shares) / this.metadata.views) * 100;
  }
  next();
});

// Pre-remove middleware to clean up files
reelSchema.pre('remove', async function(next) {
  // TODO: Clean up S3 files when reel is removed
  // await deleteS3Object(this.fileKey);
  next();
});

export const Reel = mongoose.model<IReel>('Reel', reelSchema);