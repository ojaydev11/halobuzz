import mongoose, { Document, Schema } from 'mongoose';

export interface ILinkCast extends Document {
  primaryHostId: mongoose.Types.ObjectId;
  secondaryHostId: mongoose.Types.ObjectId;
  primaryStreamId: mongoose.Types.ObjectId;
  secondaryStreamId?: mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'ended' | 'rejected';
  linkCode: string;
  agoraChannel: string;
  agoraTokenPrimary: string;
  agoraTokenSecondary: string;
  invitedAt: Date;
  acceptedAt?: Date;
  endedAt?: Date;
  rejectionReason?: string;
  settings: {
    splitScreen: boolean;
    audioMix: boolean;
    maxDuration: number; // in minutes
    viewerLimit: number;
    allowGifts: boolean;
    revenueShare: {
      primaryHost: number; // percentage
      secondaryHost: number; // percentage
    };
  };
  analytics: {
    totalViewers: number;
    peakViewers: number;
    totalGifts: number;
    totalCoins: number;
    primaryHostEarnings: number;
    secondaryHostEarnings: number;
    viewerRetention: number;
    crossCountryViewers: Map<string, number>;
  };
  crossCountry: {
    primaryCountry: string;
    secondaryCountry: string;
    latency: number; // in ms
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  createdAt: Date;
  updatedAt: Date;
}

const linkCastSchema = new Schema<ILinkCast>({
  primaryHostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  secondaryHostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  primaryStreamId: {
    type: Schema.Types.ObjectId,
    ref: 'LiveStream',
    required: true
  },
  secondaryStreamId: {
    type: Schema.Types.ObjectId,
    ref: 'LiveStream',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'ended', 'rejected'],
    default: 'pending'
  },
  linkCode: {
    type: String,
    required: true,
    unique: true
  },
  agoraChannel: {
    type: String,
    required: true,
    unique: true
  },
  agoraTokenPrimary: {
    type: String,
    required: true
  },
  agoraTokenSecondary: {
    type: String,
    required: true
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  settings: {
    splitScreen: { type: Boolean, default: true },
    audioMix: { type: Boolean, default: true },
    maxDuration: { type: Number, default: 120, min: 30, max: 240 },
    viewerLimit: { type: Number, default: 50000 },
    allowGifts: { type: Boolean, default: true },
    revenueShare: {
      primaryHost: { type: Number, default: 50, min: 0, max: 100 },
      secondaryHost: { type: Number, default: 50, min: 0, max: 100 }
    }
  },
  analytics: {
    totalViewers: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    totalGifts: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    primaryHostEarnings: { type: Number, default: 0 },
    secondaryHostEarnings: { type: Number, default: 0 },
    viewerRetention: { type: Number, default: 0 },
    crossCountryViewers: { type: Map, of: Number, default: new Map() }
  },
  crossCountry: {
    primaryCountry: { type: String, required: true },
    secondaryCountry: { type: String, required: true },
    latency: { type: Number, default: 0 },
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    }
  }
}, {
  timestamps: true
});

// Indexes
linkCastSchema.index({ primaryHostId: 1, status: 1 });
linkCastSchema.index({ secondaryHostId: 1, status: 1 });
linkCastSchema.index({ linkCode: 1 });
linkCastSchema.index({ status: 1, createdAt: -1 });
linkCastSchema.index({ 'analytics.totalViewers': -1 });

// Generate unique link code
linkCastSchema.methods.generateLinkCode = function(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LC_${timestamp}_${random}`.toUpperCase();
};

// Accept link invitation
linkCastSchema.methods.acceptInvitation = function(): void {
  this.status = 'active';
  this.acceptedAt = new Date();
};

// Reject link invitation
linkCastSchema.methods.rejectInvitation = function(reason: string): void {
  this.status = 'rejected';
  this.rejectionReason = reason;
};

// End LinkCast session
linkCastSchema.methods.endSession = function(): void {
  this.status = 'ended';
  this.endedAt = new Date();
};

// Update connection quality based on latency
linkCastSchema.methods.updateConnectionQuality = function(latency: number): void {
  this.crossCountry.latency = latency;
  if (latency < 50) {
    this.crossCountry.connectionQuality = 'excellent';
  } else if (latency < 150) {
    this.crossCountry.connectionQuality = 'good';
  } else if (latency < 300) {
    this.crossCountry.connectionQuality = 'fair';
  } else {
    this.crossCountry.connectionQuality = 'poor';
  }
};

// Calculate earnings split
linkCastSchema.methods.calculateEarnings = function(totalCoins: number): { primary: number, secondary: number } {
  const primaryShare = (totalCoins * this.settings.revenueShare.primaryHost) / 100;
  const secondaryShare = (totalCoins * this.settings.revenueShare.secondaryHost) / 100;
  
  this.analytics.primaryHostEarnings = primaryShare;
  this.analytics.secondaryHostEarnings = secondaryShare;
  
  return {
    primary: primaryShare,
    secondary: secondaryShare
  };
};

// Static method to find active LinkCast sessions
linkCastSchema.statics.findActive = function() {
  return this.find({ status: 'active' })
    .populate('primaryHostId', 'username avatar country')
    .populate('secondaryHostId', 'username avatar country')
    .sort({ 'analytics.totalViewers': -1 });
};

// Static method to find pending invitations for a user
linkCastSchema.statics.findPendingInvitations = function(userId: string) {
  return this.find({
    secondaryHostId: userId,
    status: 'pending',
    invitedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
  })
    .populate('primaryHostId', 'username avatar country followers')
    .sort({ invitedAt: -1 });
};

// Pre-save middleware
linkCastSchema.pre('save', function(next) {
  if (this.isNew) {
    this.linkCode = this.generateLinkCode();
    this.agoraChannel = `linkcast_${this.linkCode.toLowerCase()}`;
  }
  
  // Ensure revenue share adds up to 100%
  const totalShare = this.settings.revenueShare.primaryHost + this.settings.revenueShare.secondaryHost;
  if (totalShare !== 100) {
    this.settings.revenueShare.primaryHost = 50;
    this.settings.revenueShare.secondaryHost = 50;
  }
  
  next();
});

export const LinkCast = mongoose.model<ILinkCast>('LinkCast', linkCastSchema);