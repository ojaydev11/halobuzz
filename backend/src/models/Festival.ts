import mongoose, { Document, Schema } from 'mongoose';

export interface IFestival extends Document {
  name: string;
  description: string;
  type: 'seasonal' | 'cultural' | 'special' | 'anniversary';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundImage: string;
    logo: string;
  };
  gifts: string[]; // Gift IDs
  skins: string[]; // Stream skin IDs
  bonuses: {
    giftMultiplier: number;
    coinMultiplier: number;
    experienceMultiplier: number;
  };
  challenges: {
    name: string;
    description: string;
    target: number;
    reward: {
      coins: number;
      experience: number;
      specialItem?: string;
    };
  }[];
  metadata: {
    totalParticipants: number;
    totalGiftsSent: number;
    totalCoinsSpent: number;
    completionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const festivalSchema = new Schema<IFestival>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: ['seasonal', 'cultural', 'special', 'anniversary']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  theme: {
    primaryColor: {
      type: String,
      required: true,
      default: '#FF6B6B'
    },
    secondaryColor: {
      type: String,
      required: true,
      default: '#4ECDC4'
    },
    backgroundImage: {
      type: String,
      required: true
    },
    logo: {
      type: String,
      required: true
    }
  },
  gifts: [{
    type: Schema.Types.ObjectId,
    ref: 'Gift'
  }],
  skins: [String],
  bonuses: {
    giftMultiplier: {
      type: Number,
      default: 1.0,
      min: 1.0,
      max: 5.0
    },
    coinMultiplier: {
      type: Number,
      default: 1.0,
      min: 1.0,
      max: 3.0
    },
    experienceMultiplier: {
      type: Number,
      default: 1.0,
      min: 1.0,
      max: 2.0
    }
  },
  challenges: [{
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    description: {
      type: String,
      required: true,
      maxlength: 300
    },
    target: {
      type: Number,
      required: true,
      min: 1
    },
    reward: {
      coins: {
        type: Number,
        default: 0,
        min: 0
      },
      experience: {
        type: Number,
        default: 0,
        min: 0
      },
      specialItem: String
    }
  }],
  metadata: {
    totalParticipants: { type: Number, default: 0, min: 0 },
    totalGiftsSent: { type: Number, default: 0, min: 0 },
    totalCoinsSpent: { type: Number, default: 0, min: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 100 }
  }
}, {
  timestamps: true
});

// Indexes
festivalSchema.index({ isActive: 1 });
festivalSchema.index({ type: 1 });
festivalSchema.index({ startDate: 1, endDate: 1 });
festivalSchema.index({ 'metadata.totalParticipants': -1 });
festivalSchema.index({ 'metadata.completionRate': -1 });

// Pre-save middleware to check active status
festivalSchema.pre('save', function(next) {
  const now = new Date();
  this.isActive = this.startDate <= now && this.endDate >= now;
  next();
});

// Method to activate festival
festivalSchema.methods.activate = function(): void {
  this.isActive = true;
};

// Method to deactivate festival
festivalSchema.methods.deactivate = function(): void {
  this.isActive = false;
};

// Method to update metadata
festivalSchema.methods.updateMetadata = function(participants: number, gifts: number, coins: number): void {
  this.metadata.totalParticipants = participants;
  this.metadata.totalGiftsSent = gifts;
  this.metadata.totalCoinsSpent = coins;
  this.metadata.completionRate = Math.min(100, Math.round((participants / 1000) * 100));
};

// Static method to find active festivals
festivalSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true
  }).populate('gifts', 'name icon priceCoins');
};

// Static method to find upcoming festivals
festivalSchema.statics.findUpcoming = function(limit: number = 5) {
  const now = new Date();
  return this.find({
    startDate: { $gt: now }
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

// Static method to find festivals by type
festivalSchema.statics.findByType = function(type: string) {
  return this.find({ type }).sort({ startDate: -1 });
};

// Static method to find popular festivals
festivalSchema.statics.findPopular = function(limit: number = 10) {
  return this.find()
    .sort({ 'metadata.totalParticipants': -1, 'metadata.completionRate': -1 })
    .limit(limit);
};

export const Festival = mongoose.model<IFestival>('Festival', festivalSchema);
