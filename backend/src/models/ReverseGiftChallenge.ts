import mongoose, { Document, Schema } from 'mongoose';

export interface IReverseGiftChallenge extends Document {
  hostId: mongoose.Types.ObjectId;
  streamId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  totalCoins: number; // Total coins to redistribute
  minViewers: number; // Minimum viewers required to start
  maxWinners: number; // Maximum number of winners
  entryRequirement: {
    type: 'free' | 'gift' | 'follow' | 'og_only';
    minGiftAmount?: number; // If type is 'gift'
    ogTierRequired?: number; // If type is 'og_only'
  };
  distribution: {
    type: 'equal' | 'random' | 'tiered' | 'ai_based';
    tiers?: {
      position: number;
      percentage: number;
      coins: number;
    }[];
  };
  participants: {
    userId: mongoose.Types.ObjectId;
    username: string;
    entryTime: Date;
    giftAmount: number;
    isEligible: boolean;
  }[];
  winners: {
    userId: mongoose.Types.ObjectId;
    username: string;
    position: number;
    coinsWon: number;
    claimedAt?: Date;
  }[];
  aiSettings: {
    favorEngagement: boolean; // Favor active participants
    favorLoyalty: boolean; // Favor long-time followers
    favorNewcomers: boolean; // Help new viewers
    redistributionAlgorithm: 'fair' | 'weighted' | 'surprise';
  };
  startedAt?: Date;
  endedAt?: Date;
  scheduledEndTime?: Date;
  analytics: {
    totalParticipants: number;
    totalGiftsReceived: number;
    engagementBoost: number; // Percentage increase in engagement
    viewerRetention: number; // Percentage of viewers who stayed
    viralScore: number; // How viral the challenge went
  };
  createdAt: Date;
  updatedAt: Date;
}

const reverseGiftChallengeSchema = new Schema<IReverseGiftChallenge>({
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streamId: {
    type: Schema.Types.ObjectId,
    ref: 'LiveStream',
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
    required: true,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalCoins: {
    type: Number,
    required: true,
    min: 100
  },
  minViewers: {
    type: Number,
    default: 10,
    min: 5
  },
  maxWinners: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  entryRequirement: {
    type: {
      type: String,
      enum: ['free', 'gift', 'follow', 'og_only'],
      default: 'free'
    },
    minGiftAmount: {
      type: Number,
      min: 1,
      default: null
    },
    ogTierRequired: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  distribution: {
    type: {
      type: String,
      enum: ['equal', 'random', 'tiered', 'ai_based'],
      default: 'equal'
    },
    tiers: [{
      position: { type: Number, required: true },
      percentage: { type: Number, required: true, min: 0, max: 100 },
      coins: { type: Number, required: true, min: 0 }
    }]
  },
  participants: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: { type: String, required: true },
    entryTime: { type: Date, default: Date.now },
    giftAmount: { type: Number, default: 0 },
    isEligible: { type: Boolean, default: true }
  }],
  winners: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: { type: String, required: true },
    position: { type: Number, required: true },
    coinsWon: { type: Number, required: true },
    claimedAt: { type: Date, default: null }
  }],
  aiSettings: {
    favorEngagement: { type: Boolean, default: true },
    favorLoyalty: { type: Boolean, default: false },
    favorNewcomers: { type: Boolean, default: false },
    redistributionAlgorithm: {
      type: String,
      enum: ['fair', 'weighted', 'surprise'],
      default: 'fair'
    }
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  scheduledEndTime: {
    type: Date,
    default: null
  },
  analytics: {
    totalParticipants: { type: Number, default: 0 },
    totalGiftsReceived: { type: Number, default: 0 },
    engagementBoost: { type: Number, default: 0 },
    viewerRetention: { type: Number, default: 0 },
    viralScore: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
reverseGiftChallengeSchema.index({ hostId: 1, status: 1 });
reverseGiftChallengeSchema.index({ streamId: 1 });
reverseGiftChallengeSchema.index({ status: 1, startedAt: -1 });
reverseGiftChallengeSchema.index({ 'participants.userId': 1 });
reverseGiftChallengeSchema.index({ 'winners.userId': 1 });

// Method to add participant
reverseGiftChallengeSchema.methods.addParticipant = function(
  userId: string,
  username: string,
  giftAmount: number = 0
): boolean {
  // Check if already participating
  const existing = this.participants.find((p: any) => 
    p.userId.toString() === userId
  );
  
  if (existing) {
    existing.giftAmount += giftAmount;
    return false; // Already participating
  }
  
  this.participants.push({
    userId,
    username,
    entryTime: new Date(),
    giftAmount,
    isEligible: true
  });
  
  this.analytics.totalParticipants = this.participants.length;
  return true; // New participant
};

// Method to start challenge
reverseGiftChallengeSchema.methods.startChallenge = function(): void {
  this.status = 'active';
  this.startedAt = new Date();
  
  // Set scheduled end time if not set
  if (!this.scheduledEndTime) {
    this.scheduledEndTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes default
  }
};

// Method to select winners using AI-based distribution
reverseGiftChallengeSchema.methods.selectWinners = function(): void {
  const eligibleParticipants = this.participants.filter((p: any) => p.isEligible);
  
  if (eligibleParticipants.length === 0) {
    this.status = 'cancelled';
    return;
  }
  
  let winners: any[] = [];
  const numWinners = Math.min(this.maxWinners, eligibleParticipants.length);
  
  switch (this.distribution.type) {
    case 'equal':
      // Equal distribution
      const coinsPerWinner = Math.floor(this.totalCoins / numWinners);
      winners = this.selectRandomWinners(eligibleParticipants, numWinners)
        .map((p: any, index: number) => ({
          userId: p.userId,
          username: p.username,
          position: index + 1,
          coinsWon: coinsPerWinner
        }));
      break;
      
    case 'tiered':
      // Tiered distribution based on predefined tiers
      if (this.distribution.tiers && this.distribution.tiers.length > 0) {
        const selectedParticipants = this.selectRandomWinners(eligibleParticipants, numWinners);
        winners = selectedParticipants.map((p: any, index: number) => {
          const tier = this.distribution.tiers.find((t: any) => t.position === index + 1) ||
                      this.distribution.tiers[this.distribution.tiers.length - 1];
          return {
            userId: p.userId,
            username: p.username,
            position: index + 1,
            coinsWon: tier.coins
          };
        });
      }
      break;
      
    case 'ai_based':
      // AI-based distribution considering engagement and other factors
      winners = this.selectAIWinners(eligibleParticipants, numWinners);
      break;
      
    case 'random':
      // Random distribution with varying amounts
      const selectedForRandom = this.selectRandomWinners(eligibleParticipants, numWinners);
      let remainingCoins = this.totalCoins;
      winners = selectedForRandom.map((p: any, index: number) => {
        const isLast = index === numWinners - 1;
        const maxCoins = isLast ? remainingCoins : Math.floor(remainingCoins / (numWinners - index));
        const coinsWon = isLast ? remainingCoins : Math.floor(Math.random() * maxCoins) + 1;
        remainingCoins -= coinsWon;
        
        return {
          userId: p.userId,
          username: p.username,
          position: index + 1,
          coinsWon
        };
      });
      break;
  }
  
  this.winners = winners;
  this.status = 'completed';
  this.endedAt = new Date();
};

// Helper method to select random winners
reverseGiftChallengeSchema.methods.selectRandomWinners = function(
  participants: any[],
  count: number
): any[] {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Helper method for AI-based winner selection
reverseGiftChallengeSchema.methods.selectAIWinners = function(
  participants: any[],
  count: number
): any[] {
  // Score each participant based on AI settings
  const scoredParticipants = participants.map((p: any) => {
    let score = Math.random() * 100; // Base random score
    
    if (this.aiSettings.favorEngagement && p.giftAmount > 0) {
      score += Math.min(p.giftAmount / 10, 50); // Up to 50 bonus points for gifts
    }
    
    if (this.aiSettings.favorNewcomers) {
      const joinTime = new Date(p.entryTime).getTime();
      const challengeStart = new Date(this.startedAt).getTime();
      const timeDiff = joinTime - challengeStart;
      if (timeDiff < 60000) { // Joined within first minute
        score += 20;
      }
    }
    
    return { ...p, score };
  });
  
  // Sort by score and select top participants
  scoredParticipants.sort((a, b) => b.score - a.score);
  const selected = scoredParticipants.slice(0, count);
  
  // Distribute coins based on scores
  const totalScore = selected.reduce((sum, p) => sum + p.score, 0);
  
  return selected.map((p, index) => ({
    userId: p.userId,
    username: p.username,
    position: index + 1,
    coinsWon: Math.floor((p.score / totalScore) * this.totalCoins)
  }));
};

// Method to calculate analytics
reverseGiftChallengeSchema.methods.calculateAnalytics = function(
  initialViewers: number,
  currentViewers: number
): void {
  this.analytics.totalGiftsReceived = this.participants.reduce(
    (sum, p) => sum + p.giftAmount,
    0
  );
  
  if (initialViewers > 0) {
    this.analytics.viewerRetention = (currentViewers / initialViewers) * 100;
    this.analytics.engagementBoost = ((currentViewers - initialViewers) / initialViewers) * 100;
  }
  
  // Calculate viral score based on participation rate and engagement
  const participationRate = (this.analytics.totalParticipants / currentViewers) * 100;
  this.analytics.viralScore = Math.min(
    100,
    (participationRate * 0.5) + (this.analytics.engagementBoost * 0.3) + (this.analytics.viewerRetention * 0.2)
  );
};

// Static method to find active challenges
reverseGiftChallengeSchema.statics.findActive = function() {
  return this.find({ status: 'active' })
    .populate('hostId', 'username avatar')
    .populate('streamId', 'title thumbnail')
    .sort({ startedAt: -1 });
};

// Static method to find challenges by stream
reverseGiftChallengeSchema.statics.findByStream = function(streamId: string) {
  return this.find({ streamId, status: { $in: ['active', 'completed'] } })
    .sort({ createdAt: -1 });
};

export const ReverseGiftChallenge = mongoose.model<IReverseGiftChallenge>(
  'ReverseGiftChallenge',
  reverseGiftChallengeSchema
);