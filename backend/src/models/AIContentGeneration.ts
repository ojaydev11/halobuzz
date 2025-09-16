import mongoose, { Document, Schema } from 'mongoose';

export interface IAIContentGeneration extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: 'text-to-video' | 'thumbnail' | 'background-music' | 'package';
  prompt: string;
  contentId: string;
  url?: string;
  metadata?: {
    script?: string;
    visualDescription?: string;
    duration?: number;
    style?: string;
    mood?: string;
    generatedAt: string;
    originalUrl?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // in seconds
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiContentGenerationSchema = new Schema<IAIContentGeneration>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text-to-video', 'thumbnail', 'background-music', 'package'],
    required: true,
    index: true
  },
  prompt: {
    type: String,
    required: true,
    maxlength: 1000
  },
  contentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  url: {
    type: String,
    validate: {
      validator: function(v: string) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  metadata: {
    script: String,
    visualDescription: String,
    duration: {
      type: Number,
      min: 10,
      max: 300
    },
    style: String,
    mood: String,
    generatedAt: String,
    originalUrl: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  estimatedTimeRemaining: {
    type: Number,
    min: 0
  },
  error: String
}, {
  timestamps: true,
  collection: 'ai_content_generations'
});

// Indexes for performance
aiContentGenerationSchema.index({ userId: 1, createdAt: -1 });
aiContentGenerationSchema.index({ type: 1, status: 1 });
aiContentGenerationSchema.index({ createdAt: -1 });

// Virtual for generation duration
aiContentGenerationSchema.virtual('generationDuration').get(function() {
  if (this.status === 'completed' && this.createdAt) {
    return Date.now() - this.createdAt.getTime();
  }
  return null;
});

// Pre-save middleware
aiContentGenerationSchema.pre('save', function(next) {
  // Update progress based on status
  if (this.status === 'completed') {
    this.progress = 100;
    this.estimatedTimeRemaining = 0;
  } else if (this.status === 'failed') {
    this.progress = 0;
    this.estimatedTimeRemaining = 0;
  }
  
  next();
});

// Static methods
aiContentGenerationSchema.statics.findByUserId = function(userId: string, limit = 20, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'username displayName avatar');
};

aiContentGenerationSchema.statics.findByType = function(type: string, limit = 20, skip = 0) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'username displayName avatar');
};

aiContentGenerationSchema.statics.findPending = function() {
  return this.find({ status: { $in: ['pending', 'processing'] } })
    .sort({ createdAt: 1 });
};

aiContentGenerationSchema.statics.getStats = function(userId?: string) {
  const matchStage = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        processing: {
          $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
        }
      }
    }
  ]);
};

export const AIContentGeneration = mongoose.model<IAIContentGeneration>('AIContentGeneration', aiContentGenerationSchema);
