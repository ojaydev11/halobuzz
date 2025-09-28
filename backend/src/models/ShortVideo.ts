import mongoose, { Document, Schema } from 'mongoose';

export interface IShortVideo extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number; // in seconds
  views: number;
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  category: string;
  isPublic: boolean;
  isMonetized: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    resolution?: string;
    fileSize?: number;
    format?: string;
    subtitles?: {
      language: string;
      url: string;
    }[];
    [key: string]: any;
  };
}

const shortVideoSchema = new Schema<IShortVideo>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  videoUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 300 // 5 minutes max for short videos
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  comments: {
    type: Number,
    default: 0,
    min: 0
  },
  shares: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    maxlength: 30
  }],
  category: {
    type: String,
    required: true,
    enum: ['entertainment', 'education', 'gaming', 'music', 'dance', 'comedy', 'lifestyle', 'news', 'sports', 'other']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isMonetized: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  collection: 'shortvideos'
});

// Indexes
shortVideoSchema.index({ userId: 1, createdAt: -1 });
shortVideoSchema.index({ category: 1, createdAt: -1 });
shortVideoSchema.index({ tags: 1 });
shortVideoSchema.index({ views: -1 });
shortVideoSchema.index({ likes: -1 });

// Virtual for engagement rate
shortVideoSchema.virtual('engagementRate').get(function() {
  const totalEngagement = this.likes + this.comments + this.shares;
  return this.views > 0 ? (totalEngagement / this.views) * 100 : 0;
});

// Methods
shortVideoSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

shortVideoSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

shortVideoSchema.methods.incrementComments = function() {
  this.comments += 1;
  return this.save();
};

shortVideoSchema.methods.incrementShares = function() {
  this.shares += 1;
  return this.save();
};

export const ShortVideo = mongoose.model<IShortVideo>('ShortVideo', shortVideoSchema);
export default ShortVideo;
