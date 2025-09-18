import mongoose from 'mongoose';
import { config } from 'dotenv';
import { Game } from '../src/models/Game';

config();

const games = [
  {
    name: 'Coin Flip Arena',
    code: 'coin-flip',
    description: '🪙 Simple heads or tails - Double or nothing! Quick 30-second rounds for instant thrills.',
    type: 'instant',
    category: 'coin-flip',
    minStake: 10,
    maxStake: 10000,
    entryFee: 0,
    duration: 30,
    roundDuration: 30,
    houseEdge: 40,
    config: {
      options: 2,
      multipliers: [0, 1.8],
      targetRTP: 60
    },
    rules: [
      'Choose heads or tails',
      'Win pays 1.8x your stake',
      'Results are globally synchronized',
      'New round every 30 seconds'
    ],
    rewards: {
      coins: 0,
      experience: 10,
      specialItems: []
    }
  },
  {
    name: 'Lucky Dice Duel',
    code: 'dice-duel',
    description: '🎲 Roll the dice against other players - Highest roll takes the pot! Multiplayer excitement.',
    type: 'multiplayer',
    category: 'dice',
    minStake: 20,
    maxStake: 5000,
    entryFee: 0,
    duration: 45,
    roundDuration: 45,
    houseEdge: 40,
    config: {
      options: 6,
      multipliers: [0, 1.8],
      targetRTP: 60
    },
    rules: [
      'All players roll virtual dice',
      'Highest roll wins 60% of the pot',
      'House keeps 40% as commission',
      'Ties split the winnings'
    ],
    rewards: {
      coins: 0,
      experience: 15,
      specialItems: []
    }
  },
  {
    name: 'Wheel of Fortune',
    code: 'wheel-fortune',
    description: '🎡 Spin the wheel for multipliers up to 10x! From 0.5x to jackpot, fortune favors the bold.',
    type: 'luck',
    category: 'wheel',
    minStake: 50,
    maxStake: 20000,
    entryFee: 0,
    duration: 60,
    roundDuration: 60,
    houseEdge: 40,
    config: {
      options: 8,
      multipliers: [0, 0.5, 1, 1.5, 2, 3, 5, 10],
      targetRTP: 60
    },
    rules: [
      'Spin the wheel for a multiplier',
      'Win between 0x and 10x your stake',
      'Jackpot (10x) is rare but possible',
      'New spin every minute'
    ],
    rewards: {
      coins: 0,
      experience: 20,
      specialItems: []
    }
  },
  {
    name: 'Number Predictor',
    code: 'number-predict',
    description: '🔮 Predict if the next number is higher or lower! Test your intuition in this classic game.',
    type: 'skill',
    category: 'predictor',
    minStake: 30,
    maxStake: 8000,
    entryFee: 0,
    duration: 40,
    roundDuration: 40,
    houseEdge: 40,
    config: {
      options: 2,
      multipliers: [0, 1.85],
      targetRTP: 60
    },
    rules: [
      'Current number shown (1-100)',
      'Predict if next is higher or lower',
      'Correct guess pays 1.85x',
      'Global results every 40 seconds'
    ],
    rewards: {
      coins: 0,
      experience: 15,
      specialItems: []
    }
  },
  {
    name: 'Color Rush',
    code: 'color-rush',
    description: '🌈 Pick your color from 6 options - 5x payout if you guess right! Rainbow riches await.',
    type: 'luck',
    category: 'color',
    minStake: 25,
    maxStake: 5000,
    entryFee: 0,
    duration: 35,
    roundDuration: 35,
    houseEdge: 40,
    config: {
      options: 6,
      multipliers: [0, 5],
      targetRTP: 60
    },
    rules: [
      'Choose from 6 colors',
      'Correct color pays 5x stake',
      'All players see same result',
      'New color every 35 seconds'
    ],
    rewards: {
      coins: 0,
      experience: 12,
      specialItems: []
    }
  },
  {
    name: 'Rock Paper Scissors Royale',
    code: 'rps-royale',
    description: '✂️ Classic RPS with a twist - Play against the house! Simple, fast, and fun.',
    type: 'instant',
    category: 'rps',
    minStake: 15,
    maxStake: 3000,
    entryFee: 0,
    duration: 25,
    roundDuration: 25,
    houseEdge: 40,
    config: {
      options: 3,
      multipliers: [0, 1, 1.8],
      targetRTP: 60
    },
    rules: [
      'Choose rock, paper, or scissors',
      'Win pays 1.8x, draw returns stake',
      'House choice is predetermined',
      'Quick 25-second rounds'
    ],
    rewards: {
      coins: 0,
      experience: 10,
      specialItems: []
    }
  },
  {
    name: 'Treasure Hunt',
    code: 'treasure-hunt',
    description: '💎 Pick 3 boxes from 9 - Find treasures for up to 6x payout! Risk and reward balanced.',
    type: 'skill',
    category: 'treasure',
    minStake: 40,
    maxStake: 10000,
    entryFee: 0,
    duration: 90,
    roundDuration: 90,
    houseEdge: 40,
    config: {
      options: 9,
      multipliers: [0, 1.5, 3, 6],
      targetRTP: 60
    },
    rules: [
      'Select 3 boxes from 9 total',
      'Find 1 treasure: 1.5x payout',
      'Find 2 treasures: 3x payout',
      'Find all 3 treasures: 6x payout'
    ],
    rewards: {
      coins: 0,
      experience: 25,
      specialItems: []
    }
  },
  {
    name: 'Speed Clicker Challenge',
    code: 'speed-clicker',
    description: '⚡ Click as fast as you can in 10 seconds! Beat the target for up to 3x rewards.',
    type: 'skill',
    category: 'clicker',
    minStake: 20,
    maxStake: 2000,
    entryFee: 0,
    duration: 10,
    roundDuration: 120,
    houseEdge: 40,
    config: {
      options: 1,
      multipliers: [0, 0.8, 1.5, 2, 3],
      targetRTP: 60
    },
    rules: [
      'Click/tap as fast as possible',
      'Beat the target for multipliers',
      'Exceptional speed: 3x payout',
      'Skill-based with fair targets'
    ],
    rewards: {
      coins: 0,
      experience: 15,
      specialItems: []
    }
  }
];

async function seedGames() {
  try {
    console.log('🎮 Starting 8 Games Seeding...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing games
    await Game.deleteMany({});
    console.log('🗑️  Cleared existing games');

    // Insert new games
    const result = await Game.insertMany(games);
    console.log(`✅ Successfully seeded ${result.length} games`);

    // Display seeded games
    console.log('\n📊 Seeded Games:');
    console.log('=====================================');
    result.forEach((game, index) => {
      console.log(`\n${index + 1}. ${game.name} (${game.code})`);
      console.log(`   Type: ${game.type} | Category: ${game.category}`);
      console.log(`   Stake Range: ${game.minStake} - ${game.maxStake} coins`);
      console.log(`   Round Duration: ${game.roundDuration}s`);
      console.log(`   House Edge: ${game.houseEdge}% | Player RTP: ${game.config.targetRTP}%`);
    });

    console.log('\n=====================================');
    console.log('🎯 Game System Configuration:');
    console.log('  • Total Games: 8');
    console.log('  • Player Win Rate: 60%');
    console.log('  • House Edge: 40%');
    console.log('  • Global Synchronized Results');
    console.log('  • Accessible In & Out of Live Rooms');
    console.log('=====================================');

    console.log('\n🎉 Games seeding completed successfully!');
    console.log('✨ Ready for players to stake and win!');

  } catch (error) {
    console.error('❌ Error seeding games:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  seedGames()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedGames };
