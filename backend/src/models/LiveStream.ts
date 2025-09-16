import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveStream extends Document {
  hostId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  tags: string[];
  isAudioOnly: boolean;
  isAnonymous: boolean;
  isPrivate: boolean;
  streamKey: string;
  anonymousSettings?: {
    hiddenIdentity: boolean;
    voiceChanger: 'none' | 'low' | 'medium' | 'high';
    avatarMask: string;
    displayName: string;
    allowDirectMessages: boolean;
    revealThreshold?: number; // Coins needed to reveal identity
    autoRevealAt?: Date; // Auto reveal after certain time
    isRevealed: boolean;
  };
  agoraChannel: string;
  agoraToken: string;
  status: 'preparing' | 'live' | 'ended' | 'banned';
  startedAt?: Date;
  endedAt?: Date;
  duration: number; // in seconds
  maxViewers: number;
  currentViewers: number;
  totalViewers: number;
  peakViewers: number;
  totalGifts: number;
  totalCoins: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  thumbnail?: string;
  recordingUrl?: string;
  country: string;
  language: string;
  isModerated: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationNotes?: string;
  aiSuggestions: {
    coHosts: string[];
    giftPrompts: string[];
    engagementTips: string[];
  };
  settings: {
    allowGifts: boolean;
    allowComments: boolean;
    allowShares: boolean;
    minAge: number;
    maxViewers: number;
    autoRecord: boolean;
  };
  analytics: {
    viewerRetention: number;
    engagementRate: number;
    giftConversionRate: number;
    topGifters: Array<{
      userId: string;
      username: string;
      totalGifts: number;
      totalCoins: number;
    }>;
    viewerDemographics: {
      ageGroups: Record<string, number>;
      countries: Record<string, number>;
      genders: Record<string, number>;
    };
  };
  metrics: {
    giftsCoins: number;
    viewerCount: number;
    aiEngagementScore: number;
    engagementScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const liveStreamSchema = new Schema<ILiveStream>({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: [
      'entertainment',
      'music',
      'dance',
      'comedy',
      'gaming',
      'education',
      'lifestyle',
      'news',
      'sports',
      'other'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 20
  }],
  isAudioOnly: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  streamKey: {
    type: String,
    required: true,
    unique: true
  },
  anonymousSettings: {
    hiddenIdentity: { type: Boolean, default: false },
    voiceChanger: {
      type: String,
      enum: ['none', 'low', 'medium', 'high'],
      default: 'none'
    },
    avatarMask: { type: String, default: 'default_mask' },
    displayName: { type: String, default: 'Anonymous Host' },
    allowDirectMessages: { type: Boolean, default: false },
    revealThreshold: { type: Number, min: 0 },
    autoRevealAt: { type: Date },
    isRevealed: { type: Boolean, default: false }
  },
  agoraChannel: {
    type: String,
    required: true,
    unique: true
  },
  agoraToken: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['preparing', 'live', 'ended', 'banned'],
    default: 'preparing'
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  maxViewers: {
    type: Number,
    default: 0,
    min: 0
  },
  currentViewers: {
    type: Number,
    default: 0,
    min: 0
  },
  totalViewers: {
    type: Number,
    default: 0,
    min: 0
  },
  peakViewers: {
    type: Number,
    default: 0,
    min: 0
  },
  totalGifts: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCoins: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  totalShares: {
    type: Number,
    default: 0,
    min: 0
  },
  totalComments: {
    type: Number,
    default: 0,
    min: 0
  },
  thumbnail: {
    type: String,
    default: null
  },
  recordingUrl: {
    type: String,
    default: null
  },
  country: {
    type: String,
    required: true,
    default: 'NP'
  },
  language: {
    type: String,
    required: true,
    default: 'en'
  },
  isModerated: {
    type: Boolean,
    default: false
  },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  moderationNotes: {
    type: String,
    default: null
  },
  aiSuggestions: {
    coHosts: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    giftPrompts: [String],
    engagementTips: [String]
  },
  settings: {
    allowGifts: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },
    allowShares: { type: Boolean, default: true },
    minAge: { type: Number, default: 13, min: 13, max: 100 },
    maxViewers: { type: Number, default: 10000, min: 1 },
    autoRecord: { type: Boolean, default: false }
  },
  analytics: {
    viewerRetention: { type: Number, default: 0, min: 0, max: 100 },
    engagementRate: { type: Number, default: 0, min: 0, max: 100 },
    giftConversionRate: { type: Number, default: 0, min: 0, max: 100 },
    topGifters: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      username: String,
      totalGifts: { type: Number, default: 0 },
      totalCoins: { type: Number, default: 0 }
    }],
    viewerDemographics: {
      ageGroups: { type: Map, of: Number, default: {} },
      countries: { type: Map, of: Number, default: {} },
      genders: { type: Map, of: Number, default: {} }
    }
  },
  metrics: {
    giftsCoins: { type: Number, default: 0, min: 0 },
    viewerCount: { type: Number, default: 0, min: 0 },
    aiEngagementScore: { type: Number, default: 0, min: 0, max: 100 },
    engagementScore: { type: Number, default: 0, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

// Indexes
liveStreamSchema.index({ hostId: 1 });
liveStreamSchema.index({ status: 1, country: 1 });
liveStreamSchema.index({ category: 1 });
liveStreamSchema.index({ country: 1 });
liveStreamSchema.index({ createdAt: -1 });
liveStreamSchema.index({ currentViewers: -1 });
liveStreamSchema.index({ totalCoins: -1 });
liveStreamSchema.index({ 'metrics.giftsCoins': -1 });
// Note: streamKey and agoraChannel already have unique indexes from schema definition

// Pre-save middleware to generate stream key and Agora channel
liveStreamSchema.pre('save', function(next) {
  if (this.isNew) {
    this.streamKey = (this as any).generateStreamKey();
    this.agoraChannel = (this as any).generateAgoraChannel();
  }
  next();
});

// Method to generate unique stream key
liveStreamSchema.methods.generateStreamKey = function(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `hb_${timestamp}_${random}`.toUpperCase();
};

// Method to generate Agora channel name
liveStreamSchema.methods.generateAgoraChannel = function(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  return `halobuzz_${timestamp}_${random}`;
};

// Method to start stream
liveStreamSchema.methods.startStream = function(): void {
  this.status = 'live';
  this.startedAt = new Date();
  this.currentViewers = 0;
  this.peakViewers = 0;
  this.totalViewers = 0;
  this.totalGifts = 0;
  this.totalCoins = 0;
  this.totalLikes = 0;
  this.totalShares = 0;
  this.totalComments = 0;
};

// Method to end stream
liveStreamSchema.methods.endStream = function(): void {
  this.status = 'ended';
  this.endedAt = new Date();
  this.duration = Math.floor((this.endedAt.getTime() - this.startedAt!.getTime()) / 1000);
  this.currentViewers = 0;
};

// Method to add viewer
liveStreamSchema.methods.addViewer = function(): void {
  this.currentViewers++;
  this.totalViewers++;
  if (this.currentViewers > this.peakViewers) {
    this.peakViewers = this.currentViewers;
  }
  if (this.currentViewers > this.maxViewers) {
    this.maxViewers = this.currentViewers;
  }
};

// Method to remove viewer
liveStreamSchema.methods.removeViewer = function(): void {
  if (this.currentViewers > 0) {
    this.currentViewers--;
  }
};

// Method to add gift
liveStreamSchema.methods.addGift = function(coins: number): void {
  this.totalGifts++;
  this.totalCoins += coins;
};

// Method to add like
liveStreamSchema.methods.addLike = function(): void {
  this.totalLikes++;
};

// Method to add share
liveStreamSchema.methods.addShare = function(): void {
  this.totalShares++;
};

// Method to add comment
liveStreamSchema.methods.addComment = function(): void {
  this.totalComments++;
};

// Static method to find live streams by category
liveStreamSchema.statics.findByCategory = function(category: string, limit: number = 20) {
  return this.find({ 
    status: 'live', 
    category,
    isModerated: true,
    moderationStatus: 'approved'
  })
  .sort({ currentViewers: -1, totalCoins: -1 })
  .limit(limit)
  .populate('hostId', 'username avatar followers ogLevel');
};

// Static method to find trending streams
liveStreamSchema.statics.findTrending = function(limit: number = 20) {
  return this.find({ 
    status: 'live',
    isModerated: true,
    moderationStatus: 'approved'
  })
  .sort({ currentViewers: -1, totalCoins: -1, totalLikes: -1 })
  .limit(limit)
  .populate('hostId', 'username avatar followers ogLevel');
};

// Static method to find streams by country
liveStreamSchema.statics.findByCountry = function(country: string, limit: number = 20) {
  return this.find({ 
    status: 'live', 
    country,
    isModerated: true,
    moderationStatus: 'approved'
  })
  .sort({ currentViewers: -1 })
  .limit(limit)
  .populate('hostId', 'username avatar followers ogLevel');
};

export const LiveStream = mongoose.model<ILiveStream>('LiveStream', liveStreamSchema);
