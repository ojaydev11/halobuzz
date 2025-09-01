import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface Game {
  code: string;
  name: string;
  entryCoins: number;
  payoutTable: Array<{
    rank: number;
    payout: number;
    percentage: number;
  }>;
  aiWinRate: number;
  active: boolean;
  description?: string;
  category?: string;
  minPlayers?: number;
  maxPlayers?: number;
  duration?: number; // in seconds
}

const games: Game[] = [
  {
    code: 'coin_flip',
    name: 'Coin Flip',
    entryCoins: 10,
    payoutTable: [
      { rank: 1, payout: 18, percentage: 90 },
      { rank: 2, payout: 0, percentage: 10 }
    ],
    aiWinRate: 0.45,
    active: true,
    description: 'Simple coin flip game - heads or tails',
    category: 'luck',
    minPlayers: 2,
    maxPlayers: 2,
    duration: 30
  },
  {
    code: 'dice_roll',
    name: 'Dice Roll',
    entryCoins: 20,
    payoutTable: [
      { rank: 1, payout: 35, percentage: 85 },
      { rank: 2, payout: 0, percentage: 15 }
    ],
    aiWinRate: 0.48,
    active: true,
    description: 'Roll the dice and get the highest number',
    category: 'luck',
    minPlayers: 2,
    maxPlayers: 4,
    duration: 45
  },
  {
    code: 'number_guess',
    name: 'Number Guess',
    entryCoins: 15,
    payoutTable: [
      { rank: 1, payout: 25, percentage: 88 },
      { rank: 2, payout: 0, percentage: 12 }
    ],
    aiWinRate: 0.42,
    active: true,
    description: 'Guess the number closest to the target',
    category: 'skill',
    minPlayers: 2,
    maxPlayers: 6,
    duration: 60
  },
  {
    code: 'color_pick',
    name: 'Color Pick',
    entryCoins: 25,
    payoutTable: [
      { rank: 1, payout: 45, percentage: 92 },
      { rank: 2, payout: 0, percentage: 8 }
    ],
    aiWinRate: 0.50,
    active: true,
    description: 'Pick the color that appears next',
    category: 'luck',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 40
  },
  {
    code: 'quick_math',
    name: 'Quick Math',
    entryCoins: 30,
    payoutTable: [
      { rank: 1, payout: 55, percentage: 80 },
      { rank: 2, payout: 15, percentage: 15 },
      { rank: 3, payout: 0, percentage: 5 }
    ],
    aiWinRate: 0.38,
    active: true,
    description: 'Solve math problems quickly',
    category: 'skill',
    minPlayers: 2,
    maxPlayers: 4,
    duration: 90
  },
  {
    code: 'word_scramble',
    name: 'Word Scramble',
    entryCoins: 35,
    payoutTable: [
      { rank: 1, payout: 65, percentage: 75 },
      { rank: 2, payout: 20, percentage: 20 },
      { rank: 3, payout: 0, percentage: 5 }
    ],
    aiWinRate: 0.35,
    active: true,
    description: 'Unscramble the word correctly',
    category: 'skill',
    minPlayers: 2,
    maxPlayers: 6,
    duration: 120
  },
  {
    code: 'memory_match',
    name: 'Memory Match',
    entryCoins: 40,
    payoutTable: [
      { rank: 1, payout: 75, percentage: 70 },
      { rank: 2, payout: 25, percentage: 25 },
      { rank: 3, payout: 0, percentage: 5 }
    ],
    aiWinRate: 0.52,
    active: true,
    description: 'Match pairs of cards from memory',
    category: 'skill',
    minPlayers: 2,
    maxPlayers: 4,
    duration: 180
  },
  {
    code: 'speed_tap',
    name: 'Speed Tap',
    entryCoins: 50,
    payoutTable: [
      { rank: 1, payout: 90, percentage: 65 },
      { rank: 2, payout: 35, percentage: 30 },
      { rank: 3, payout: 0, percentage: 5 }
    ],
    aiWinRate: 0.55,
    active: true,
    description: 'Tap as fast as you can',
    category: 'skill',
    minPlayers: 2,
    maxPlayers: 8,
    duration: 60
  },
  {
    code: 'pattern_match',
    name: 'Pattern Match',
    entryCoins: 45,
    payoutTable: [
      { rank: 1, payout: 80, percentage: 68 },
      { rank: 2, payout: 30, percentage: 27 },
      { rank: 3, payout: 0, percentage: 5 }
    ],
    aiWinRate: 0.40,
    active: true,
    description: 'Remember and repeat the pattern',
    category: 'skill',
    minPlayers: 2,
    maxPlayers: 6,
    duration: 150
  },
  {
    code: 'luck_wheel',
    name: 'Luck Wheel',
    entryCoins: 60,
    payoutTable: [
      { rank: 1, payout: 110, percentage: 60 },
      { rank: 2, payout: 45, percentage: 35 },
      { rank: 3, payout: 0, percentage: 5 }
    ],
    aiWinRate: 0.50,
    active: true,
    description: 'Spin the wheel and test your luck',
    category: 'luck',
    minPlayers: 2,
    maxPlayers: 10,
    duration: 75
  }
];

// Create Game schema
const gameSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  entryCoins: {
    type: Number,
    required: true,
    min: 0
  },
  payoutTable: [{
    rank: {
      type: Number,
      required: true,
      min: 1
    },
    payout: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  }],
  aiWinRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0.45
  },
  active: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['luck', 'skill', 'strategy', 'puzzle'],
    default: 'luck'
  },
  minPlayers: {
    type: Number,
    default: 2,
    min: 1
  },
  maxPlayers: {
    type: Number,
    default: 4,
    min: 1
  },
  duration: {
    type: Number,
    min: 0 // in seconds
  }
}, {
  timestamps: true
});

// Indexes
gameSchema.index({ code: 1 }, { unique: true });
gameSchema.index({ active: 1 });
gameSchema.index({ category: 1 });
gameSchema.index({ entryCoins: 1 });

// Virtual for total payout percentage
gameSchema.virtual('totalPayoutPercentage').get(function() {
  return this.payoutTable.reduce((sum, payout) => sum + payout.percentage, 0);
});

// Virtual for house edge
gameSchema.virtual('houseEdge').get(function() {
  const totalPayout = this.payoutTable.reduce((sum, payout) => {
    return sum + (payout.payout * payout.percentage / 100);
  }, 0);
  return ((this.entryCoins - totalPayout) / this.entryCoins) * 100;
});

// Method to calculate expected value
gameSchema.methods.calculateExpectedValue = function() {
  const totalPayout = this.payoutTable.reduce((sum: any, payout: any) => {
    return sum + (payout.payout * payout.percentage / 100);
  }, 0);
  return totalPayout - this.entryCoins;
};

// Method to get payout for rank
gameSchema.methods.getPayoutForRank = function(rank: number) {
  const payout = this.payoutTable.find((p: any) => p.rank === rank);
  return payout ? payout.payout : 0;
};

// Static method to find games by category
gameSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, active: true }).sort({ entryCoins: 1 });
};

// Static method to find games by entry cost range
gameSchema.statics.findByEntryRange = function(minCoins: number, maxCoins: number) {
  return this.find({
    entryCoins: { $gte: minCoins, $lte: maxCoins },
    active: true
  }).sort({ entryCoins: 1 });
};

const Game = mongoose.model('Game', gameSchema);

async function seedGames() {
  try {
    console.log('🎮 Starting Games seeding...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Game.deleteMany({});
    console.log('🗑️  Cleared existing Games');

    // Insert new data
    const result = await Game.insertMany(games);
    console.log(`✅ Successfully seeded ${result.length} Games`);

    // Display statistics
    const categoryStats = await Game.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const activeGames = await Game.countDocuments({ active: true });
    const totalEntryCoins = await Game.aggregate([
      { $group: { _id: null, total: { $sum: '$entryCoins' } } }
    ]);

    console.log('\n📊 Game Statistics:');
    console.log('Categories:');
    categoryStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} games`);
    });

    console.log(`\nActive Games: ${activeGames}`);
    console.log(`Total Entry Coins Range: ${Math.min(...games.map(g => g.entryCoins))} - ${Math.max(...games.map(g => g.entryCoins))}`);

    // Display AI win rate statistics
    const avgAiWinRate = games.reduce((sum, game) => sum + game.aiWinRate, 0) / games.length;
    console.log(`Average AI Win Rate: ${(avgAiWinRate * 100).toFixed(1)}%`);

    // Display games by entry cost
    console.log('\n🎯 Games by Entry Cost:');
    const sortedGames = result.sort((a, b) => a.entryCoins - b.entryCoins);
    sortedGames.forEach(game => {
      console.log(`  ${game.name}: ${game.entryCoins} coins (AI Win Rate: ${(game.aiWinRate * 100).toFixed(1)}%)`);
    });

    console.log('\n🎉 Games seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Games:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedGames()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedGames, Game };
