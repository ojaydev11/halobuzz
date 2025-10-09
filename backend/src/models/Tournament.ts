import mongoose, { Document, Schema } from 'mongoose';

export interface ITournament extends Document {
  name: string;
  code: string;           // Unique tournament code
  gameMode: 'halo-arena' | 'halo-royale' | 'halo-clash' | 'halo-rally' | 'halo-raids' | 'halo-tactics';
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'special';
  format: 'single-elimination' | 'double-elimination' | 'swiss' | 'round-robin' | 'battle-royale';

  // Tournament Details
  description: string;
  rules: string[];
  bannerImage?: string;
  sponsorLogo?: string;

  // Schedule
  schedule: {
    registrationStart: Date;
    registrationEnd: Date;
    tournamentStart: Date;
    tournamentEnd?: Date;
    checkInStart?: Date;    // Time when players must check in
    checkInEnd?: Date;
  };

  // Participant Management
  participants: {
    minPlayers: number;
    maxPlayers: number;
    currentPlayers: number;
    teamSize: number;       // 1 for solo, 2 for duo, 5 for team
    registeredPlayers: {
      userId: string;
      teamId?: string;
      registeredAt: Date;
      checkedIn: boolean;
      seed?: number;        // Tournament seeding based on MMR
      mmr: number;
    }[];
    waitlist: {
      userId: string;
      registeredAt: Date;
    }[];
  };

  // Entry Requirements
  requirements: {
    minMMR?: number;
    maxMMR?: number;
    minAccountLevel?: number;
    tier?: ('Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Champion' | 'Legend')[];
    region?: string[];
    entryFee: number;       // Coin cost to enter
    verified: boolean;      // Require verified accounts
  };

  // Prize Pool
  prizePool: {
    totalCoins: number;
    distribution: {
      placement: number;    // 1st, 2nd, 3rd, etc.
      coins: number;
      percentage: number;
    }[];
    sponsoredPrizes?: {
      placement: number;
      description: string;
      value: number;
    }[];
  };

  // Bracket & Matches
  bracket: {
    rounds: {
      roundNumber: number;
      name: string;         // "Quarter Finals", "Semi Finals", etc.
      matches: {
        matchId: string;
        player1: string | null;
        player2: string | null;
        winner: string | null;
        score?: string;     // "3-1", "2-0", etc.
        scheduledTime?: Date;
        completedAt?: Date;
        status: 'pending' | 'in-progress' | 'completed' | 'bye';
      }[];
    }[];
    grandFinals?: {
      matchId: string;
      player1: string;
      player2: string;
      winner?: string;
      score?: string;
    };
  };

  // Live Statistics
  liveStats: {
    viewerCount: number;
    peakViewers: number;
    totalMatches: number;
    completedMatches: number;
    averageMatchDuration: number;
    featuredMatch?: string; // Current featured match ID
  };

  // Spectator Integration
  spectator: {
    streamUrls: {
      platform: 'twitch' | 'youtube' | 'halobuzz';
      url: string;
      language: string;
      viewers: number;
    }[];
    enableCrowdBetting: boolean; // Allow viewers to bet coins on outcomes
    enableCrowdVoting: boolean;  // Allow viewers to influence game (HaloClash)
    chatEnabled: boolean;
  };

  // Status & Lifecycle
  status: 'draft' | 'registration' | 'check-in' | 'in-progress' | 'completed' | 'cancelled';
  featured: boolean;      // Show on homepage
  region: string[];

  // Results & Winners
  results: {
    placement: number;
    userId: string;
    teamId?: string;
    prizeCoins: number;
    performanceScore: number;
  }[];

  // Analytics
  analytics: {
    totalRegistrations: number;
    totalCheckIns: number;
    dropoutRate: number;
    averagePlayerMMR: number;
    totalCoinsAwarded: number;
    totalViewTime: number; // Total minutes watched
  };

  // Metadata
  createdBy: string;      // Admin or system
  tags: string[];
  isRecurring: boolean;   // For daily/weekly tournaments
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string;       // "14:00 UTC"
  };

  createdAt: Date;
  updatedAt: Date;
}

const tournamentSchema = new Schema<ITournament>({
  name: {
    type: String,
    required: true,
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
  gameMode: {
    type: String,
    required: true,
    enum: ['halo-arena', 'halo-royale', 'halo-clash', 'halo-rally', 'halo-raids', 'halo-tactics']
  },
  type: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'seasonal', 'special']
  },
  format: {
    type: String,
    required: true,
    enum: ['single-elimination', 'double-elimination', 'swiss', 'round-robin', 'battle-royale']
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  rules: [String],
  bannerImage: String,
  sponsorLogo: String,
  schedule: {
    registrationStart: { type: Date, required: true },
    registrationEnd: { type: Date, required: true },
    tournamentStart: { type: Date, required: true },
    tournamentEnd: Date,
    checkInStart: Date,
    checkInEnd: Date
  },
  participants: {
    minPlayers: { type: Number, required: true, min: 2 },
    maxPlayers: { type: Number, required: true, min: 2 },
    currentPlayers: { type: Number, default: 0 },
    teamSize: { type: Number, required: true, min: 1, max: 10 },
    registeredPlayers: [{
      userId: { type: String, required: true },
      teamId: String,
      registeredAt: { type: Date, default: Date.now },
      checkedIn: { type: Boolean, default: false },
      seed: Number,
      mmr: { type: Number, default: 0 }
    }],
    waitlist: [{
      userId: { type: String, required: true },
      registeredAt: { type: Date, default: Date.now }
    }]
  },
  requirements: {
    minMMR: Number,
    maxMMR: Number,
    minAccountLevel: Number,
    tier: [{ type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Champion', 'Legend'] }],
    region: [String],
    entryFee: { type: Number, default: 0, min: 0 },
    verified: { type: Boolean, default: false }
  },
  prizePool: {
    totalCoins: { type: Number, required: true, min: 0 },
    distribution: [{
      placement: { type: Number, required: true },
      coins: { type: Number, required: true },
      percentage: { type: Number, required: true }
    }],
    sponsoredPrizes: [{
      placement: Number,
      description: String,
      value: Number
    }]
  },
  bracket: {
    rounds: [{
      roundNumber: Number,
      name: String,
      matches: [{
        matchId: String,
        player1: String,
        player2: String,
        winner: String,
        score: String,
        scheduledTime: Date,
        completedAt: Date,
        status: {
          type: String,
          enum: ['pending', 'in-progress', 'completed', 'bye'],
          default: 'pending'
        }
      }]
    }],
    grandFinals: {
      matchId: String,
      player1: String,
      player2: String,
      winner: String,
      score: String
    }
  },
  liveStats: {
    viewerCount: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
    completedMatches: { type: Number, default: 0 },
    averageMatchDuration: { type: Number, default: 0 },
    featuredMatch: String
  },
  spectator: {
    streamUrls: [{
      platform: { type: String, enum: ['twitch', 'youtube', 'halobuzz'] },
      url: String,
      language: { type: String, default: 'en' },
      viewers: { type: Number, default: 0 }
    }],
    enableCrowdBetting: { type: Boolean, default: false },
    enableCrowdVoting: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: true }
  },
  status: {
    type: String,
    enum: ['draft', 'registration', 'check-in', 'in-progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  featured: { type: Boolean, default: false },
  region: [String],
  results: [{
    placement: Number,
    userId: String,
    teamId: String,
    prizeCoins: Number,
    performanceScore: Number
  }],
  analytics: {
    totalRegistrations: { type: Number, default: 0 },
    totalCheckIns: { type: Number, default: 0 },
    dropoutRate: { type: Number, default: 0 },
    averagePlayerMMR: { type: Number, default: 0 },
    totalCoinsAwarded: { type: Number, default: 0 },
    totalViewTime: { type: Number, default: 0 }
  },
  createdBy: { type: String, required: true },
  tags: [String],
  isRecurring: { type: Boolean, default: false },
  recurrencePattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    dayOfMonth: { type: Number, min: 1, max: 31 },
    time: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
tournamentSchema.index({ code: 1 }, { unique: true });
tournamentSchema.index({ status: 1, 'schedule.tournamentStart': 1 });
tournamentSchema.index({ gameMode: 1, status: 1, featured: -1 });
tournamentSchema.index({ type: 1, 'schedule.registrationStart': 1 });
tournamentSchema.index({ 'schedule.tournamentStart': 1, status: 1 });

// Pre-save middleware
tournamentSchema.pre('save', function(next) {
  // Update current players count
  this.participants.currentPlayers = this.participants.registeredPlayers.length;

  // Calculate analytics
  this.analytics.totalRegistrations = this.participants.registeredPlayers.length;
  this.analytics.totalCheckIns = this.participants.registeredPlayers.filter(p => p.checkedIn).length;

  if (this.analytics.totalRegistrations > 0) {
    this.analytics.dropoutRate =
      ((this.analytics.totalRegistrations - this.analytics.totalCheckIns) / this.analytics.totalRegistrations) * 100;
  }

  if (this.participants.registeredPlayers.length > 0) {
    const totalMMR = this.participants.registeredPlayers.reduce((sum, p) => sum + p.mmr, 0);
    this.analytics.averagePlayerMMR = totalMMR / this.participants.registeredPlayers.length;
  }

  next();
});

// Method to register player
tournamentSchema.methods.registerPlayer = function(
  userId: string,
  mmr: number,
  teamId?: string
): boolean {
  // Check if tournament is accepting registrations
  if (this.status !== 'registration') {
    throw new Error('Tournament is not accepting registrations');
  }

  // Check if already registered
  if (this.participants.registeredPlayers.some(p => p.userId === userId)) {
    throw new Error('Player already registered');
  }

  // Check MMR requirements
  if (this.requirements.minMMR && mmr < this.requirements.minMMR) {
    throw new Error('MMR too low');
  }
  if (this.requirements.maxMMR && mmr > this.requirements.maxMMR) {
    throw new Error('MMR too high');
  }

  // Check if tournament is full
  if (this.participants.currentPlayers >= this.participants.maxPlayers) {
    // Add to waitlist
    this.participants.waitlist.push({
      userId,
      registeredAt: new Date()
    });
    return false;
  }

  // Register player
  this.participants.registeredPlayers.push({
    userId,
    teamId,
    registeredAt: new Date(),
    checkedIn: false,
    mmr,
    seed: this.participants.currentPlayers + 1
  });

  return true;
};

// Method to check in player
tournamentSchema.methods.checkInPlayer = function(userId: string): void {
  const player = this.participants.registeredPlayers.find(p => p.userId === userId);
  if (!player) {
    throw new Error('Player not registered');
  }

  player.checkedIn = true;
};

// Method to generate bracket
tournamentSchema.methods.generateBracket = function(): void {
  const checkedInPlayers = this.participants.registeredPlayers.filter(p => p.checkedIn);

  if (checkedInPlayers.length < this.participants.minPlayers) {
    throw new Error('Not enough players checked in');
  }

  // Seed players by MMR
  const seededPlayers = checkedInPlayers.sort((a, b) => b.mmr - a.mmr);

  if (this.format === 'single-elimination' || this.format === 'double-elimination') {
    this.generateEliminationBracket(seededPlayers);
  } else if (this.format === 'battle-royale') {
    this.generateBattleRoyaleBracket(seededPlayers);
  }
};

// Helper method for elimination brackets
tournamentSchema.methods.generateEliminationBracket = function(players: any[]): void {
  const rounds = Math.ceil(Math.log2(players.length));
  this.bracket.rounds = [];

  for (let round = 0; round < rounds; round++) {
    const roundName = this.getRoundName(round, rounds);
    const matchesInRound = Math.pow(2, rounds - round - 1);
    const matches = [];

    for (let match = 0; match < matchesInRound; match++) {
      if (round === 0) {
        // First round - pair players
        const player1Index = match * 2;
        const player2Index = match * 2 + 1;

        matches.push({
          matchId: `${this.code}-R${round}-M${match}`,
          player1: players[player1Index]?.userId || null,
          player2: players[player2Index]?.userId || null,
          winner: null,
          status: 'pending'
        });
      } else {
        // Subsequent rounds - winners from previous round
        matches.push({
          matchId: `${this.code}-R${round}-M${match}`,
          player1: null,
          player2: null,
          winner: null,
          status: 'pending'
        });
      }
    }

    this.bracket.rounds.push({
      roundNumber: round,
      name: roundName,
      matches
    });
  }

  this.liveStats.totalMatches = this.bracket.rounds.reduce((sum, r) => sum + r.matches.length, 0);
};

// Helper method for battle royale
tournamentSchema.methods.generateBattleRoyaleBracket = function(players: any[]): void {
  // For battle royale, create multiple matches with 60 players each
  const playersPerMatch = 60;
  const matchCount = Math.ceil(players.length / playersPerMatch);

  this.bracket.rounds = [{
    roundNumber: 0,
    name: 'Battle Royale',
    matches: []
  }];

  for (let i = 0; i < matchCount; i++) {
    this.bracket.rounds[0].matches.push({
      matchId: `${this.code}-BR-${i}`,
      player1: null, // Battle royale doesn't have player1/player2
      player2: null,
      winner: null,
      status: 'pending'
    });
  }

  this.liveStats.totalMatches = matchCount;
};

// Helper to get round name
tournamentSchema.methods.getRoundName = function(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round - 1;

  if (roundsFromEnd === 0) return 'Finals';
  if (roundsFromEnd === 1) return 'Semi Finals';
  if (roundsFromEnd === 2) return 'Quarter Finals';
  if (roundsFromEnd === 3) return 'Round of 16';

  return `Round ${round + 1}`;
};

// Static method to get upcoming tournaments
tournamentSchema.statics.getUpcoming = function(gameMode?: string, limit: number = 10) {
  const query: any = {
    status: { $in: ['registration', 'check-in'] },
    'schedule.tournamentStart': { $gte: new Date() }
  };

  if (gameMode) query.gameMode = gameMode;

  return this.find(query)
    .sort({ 'schedule.tournamentStart': 1 })
    .limit(limit);
};

// Static method to get featured tournaments
tournamentSchema.statics.getFeatured = function(limit: number = 5) {
  return this.find({ featured: true, status: { $in: ['registration', 'in-progress'] } })
    .sort({ 'schedule.tournamentStart': 1 })
    .limit(limit);
};

export const Tournament = mongoose.model<ITournament>('Tournament', tournamentSchema);
