import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  name: string;
  code: string; // Unique game identifier
  description: string;
  type: 'instant' | 'timed' | 'multiplayer' | 'skill' | 'luck';
  category: 'coin-flip' | 'dice' | 'wheel' | 'predictor' | 'color' | 'rps' | 'treasure' | 'clicker';
  isActive: boolean;
  minPlayers: number;
  maxPlayers: number;
  entryFee: number;
  minStake: number;
  maxStake: number;
  prizePool: number;
  duration: number; // in seconds
  roundDuration: number; // Duration of each round in seconds
  houseEdge: number; // House edge percentage (40% target)
  rules: string[];
  rewards: {
    coins: number;
    experience: number;
    specialItems: string[];
  };
  config: {
    options?: number; // Number of options (for games with choices)
    multipliers?: number[]; // Possible win multipliers
    targetRTP?: number; // Target Return To Player percentage (60%)
  };
  metadata: {
    totalPlayed: number;
    totalWinners: number;
    totalPrizePool: number;
    averagePlayers: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const gameSchema = new Schema<IGame>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50
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
    enum: ['instant', 'timed', 'multiplayer', 'skill', 'luck']
  },
  category: {
    type: String,
    required: true,
    enum: ['coin-flip', 'dice', 'wheel', 'predictor', 'color', 'rps', 'treasure', 'clicker']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minPlayers: {
    type: Number,
    required: true,
    min: 1
  },
  maxPlayers: {
    type: Number,
    required: true,
    min: 1
  },
  entryFee: {
    type: Number,
    default: 0,
    min: 0
  },
  minStake: {
    type: Number,
    default: 10,
    min: 1
  },
  maxStake: {
    type: Number,
    default: 10000,
    min: 1
  },
  prizePool: {
    type: Number,
    default: 0,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 5,
    max: 3600 // max 1 hour
  },
  roundDuration: {
    type: Number,
    default: 30,
    min: 5,
    max: 300
  },
  houseEdge: {
    type: Number,
    default: 40, // 40% house edge = 60% RTP
    min: 0,
    max: 100
  },
  rules: [{
    type: String,
    trim: true,
    maxlength: 200
  }],
  rewards: {
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
    specialItems: [String]
  },
  config: {
    options: { type: Number, default: 2 },
    multipliers: [{ type: Number }],
    targetRTP: { type: Number, default: 60 }
  },
  metadata: {
    totalPlayed: { type: Number, default: 0, min: 0 },
    totalWinners: { type: Number, default: 0, min: 0 },
    totalPrizePool: { type: Number, default: 0, min: 0 },
    averagePlayers: { type: Number, default: 0, min: 0 }
  }
}, {
  timestamps: true
});

// Indexes
gameSchema.index({ isActive: 1 });
gameSchema.index({ type: 1 });
gameSchema.index({ category: 1 });
gameSchema.index({ code: 1 });
gameSchema.index({ entryFee: 1 });
gameSchema.index({ 'metadata.totalPlayed': -1 });
gameSchema.index({ 'metadata.averagePlayers': -1 });

// Pre-save middleware to update metadata
gameSchema.pre('save', function(next) {
  if (this.isModified('metadata.totalPlayed') && this.metadata.totalPlayed > 0) {
    this.metadata.averagePlayers = Math.round(this.metadata.totalPlayed / 10);
  }
  next();
});

// Method to start game
gameSchema.methods.startGame = function(): void {
  this.metadata.totalPlayed++;
};

// Method to end game with winner
gameSchema.methods.endGame = function(winnerCount: number, totalPrize: number): void {
  this.metadata.totalWinners += winnerCount;
  this.metadata.totalPrizePool += totalPrize;
};

// Static method to find active games
gameSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ 'metadata.totalPlayed': -1 });
};

// Static method to find games by type
gameSchema.statics.findByType = function(type: string) {
  return this.find({ type, isActive: true }).sort({ 'metadata.totalPlayed': -1 });
};

// Static method to find popular games
gameSchema.statics.findPopular = function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ 'metadata.totalPlayed': -1, 'metadata.averagePlayers': -1 })
    .limit(limit);
};

export const Game = mongoose.model<IGame>('Game', gameSchema);
