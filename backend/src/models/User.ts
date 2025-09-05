import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  phone?: string;
  password: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  country: string;
  language: string;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  banExpiresAt?: Date;
  lastActiveAt: Date;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  followers: number;
  following: number;
  totalLikes: number;
  totalViews: number;
  ogLevel: number;
  ogExpiresAt?: Date;
  haloThroneExpiresAt?: Date;
  isHaloThroneActive: boolean; // Virtual field
  kycStatus: 'pending' | 'verified' | 'rejected';
  ageVerified: boolean;
  totpSecret?: string;
  boundDevices?: string[];
  kycDocuments?: {
    idCard?: string;
    selfie?: string;
    verificationDate?: Date;
  };
  preferences: {
    notifications: {
      push: boolean;
      email: boolean;
      sms: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'followers';
      showOnlineStatus: boolean;
      allowGifts: boolean;
      allowMessages: boolean;
    };
    language: string;
    timezone: string;
  };
  socialLogin?: {
    google?: {
      id: string;
      email: string;
    };
    facebook?: {
      id: string;
      email: string;
    };
    apple?: {
      id: string;
      email: string;
    };
  };
  deviceTokens: string[];
  trust: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'verified';
    factors: {
      kycVerified: boolean;
      phoneVerified: boolean;
      emailVerified: boolean;
      socialConnected: boolean;
      activeDays: number;
      totalStreams: number;
      totalGifts: number;
      reportCount: number;
    };
  };
  karma: {
    total: number;
    categories: {
      helpfulness: number;
      mentorship: number;
      creativity: number;
      positivity: number;
      cultural_respect: number;
      community_service: number;
    };
    level: 'beginner' | 'helper' | 'guardian' | 'elder' | 'bodhisattva';
    levelName: string; // Nepali name for the level
    lastUpdated: Date;
    milestones: string[]; // Array of milestone IDs achieved
  };
  coins: {
    balance: number;
    bonusBalance: number;
    totalEarned: number;
    totalSpent: number;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: /^\+?[1-9]\d{1,14}$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
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
  isVerified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    default: null
  },
  banExpiresAt: {
    type: Date,
    default: null
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  totalCoinsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCoinsSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  followers: {
    type: Number,
    default: 0,
    min: 0
  },
  following: {
    type: Number,
    default: 0,
    min: 0
  },
  totalLikes: {
    type: Number,
    default: 0,
    min: 0
  },
  totalViews: {
    type: Number,
    default: 0,
    min: 0
  },
  ogLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ogExpiresAt: {
    type: Date,
    default: null
  },
  haloThroneExpiresAt: {
    type: Date,
    default: null
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  ageVerified: {
    type: Boolean,
    default: false
  },
  totpSecret: {
    type: String,
    default: null
  },
  boundDevices: [{
    type: String,
    default: []
  }],
  kycDocuments: {
    idCard: String,
    selfie: String,
    verificationDate: Date
  },
  preferences: {
    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'followers'],
        default: 'public'
      },
      showOnlineStatus: { type: Boolean, default: true },
      allowGifts: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kathmandu' }
  },
  socialLogin: {
    google: {
      id: String,
      email: String
    },
    facebook: {
      id: String,
      email: String
    },
    apple: {
      id: String,
      email: String
    }
  },
  deviceTokens: [{
    type: String,
    default: []
  }],
  trust: {
    score: { type: Number, default: 0, min: 0, max: 100 },
    level: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'verified'], 
      default: 'low' 
    },
    factors: {
      kycVerified: { type: Boolean, default: false },
      phoneVerified: { type: Boolean, default: false },
      emailVerified: { type: Boolean, default: false },
      socialConnected: { type: Boolean, default: false },
      activeDays: { type: Number, default: 0 },
      totalStreams: { type: Number, default: 0 },
      totalGifts: { type: Number, default: 0 },
      reportCount: { type: Number, default: 0 }
    }
  },
  karma: {
    total: { type: Number, default: 0, min: 0 },
    categories: {
      helpfulness: { type: Number, default: 0, min: 0 },
      mentorship: { type: Number, default: 0, min: 0 },
      creativity: { type: Number, default: 0, min: 0 },
      positivity: { type: Number, default: 0, min: 0 },
      cultural_respect: { type: Number, default: 0, min: 0 },
      community_service: { type: Number, default: 0, min: 0 }
    },
    level: { 
      type: String, 
      enum: ['beginner', 'helper', 'guardian', 'elder', 'bodhisattva'], 
      default: 'beginner' 
    },
    levelName: { type: String, default: 'नयाँ साथी (New Friend)' },
    lastUpdated: { type: Date, default: Date.now },
    milestones: [{ type: String, default: [] }]
  },
  coins: {
    balance: { type: Number, default: 0, min: 0 },
    bonusBalance: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.kycDocuments;
      delete ret.deviceTokens;
      return ret;
    }
  }
});

// Indexes
// Note: username, email, and phone already have unique indexes from schema definition
userSchema.index({ country: 1 });
userSchema.index({ ogLevel: -1, followers: -1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ isVerified: 1, isBanned: 1 });
userSchema.index({ 'trust.score': -1 }); // For trust score ranking
userSchema.index({ 'karma.total': -1 }); // For karma ranking
userSchema.index({ 'karma.level': 1 }); // For karma level filtering

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '12'));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for OG status
userSchema.virtual('isOGActive').get(function() {
  if (this.ogLevel === 0) return false;
  if (!this.ogExpiresAt) return true;
  return new Date() < this.ogExpiresAt;
});

// Virtual for Halo Throne status
userSchema.virtual('isHaloThroneActive').get(function() {
  if (!this.haloThroneExpiresAt) return false;
  return new Date() < this.haloThroneExpiresAt;
});

// Static method to find users by country
userSchema.statics.findByCountry = function(country: string) {
  return this.find({ country, isBanned: false, isVerified: true });
};

// Static method to find top creators
userSchema.statics.findTopCreators = function(limit: number = 10) {
  return this.find({ 
    isBanned: false, 
    isVerified: true 
  })
  .sort({ followers: -1, totalViews: -1 })
  .limit(limit);
};

export const User = mongoose.model<IUser>('User', userSchema);
