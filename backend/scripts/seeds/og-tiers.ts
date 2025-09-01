import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface OGTier {
  tier: number;
  name: string;
  priceCoins: number;
  durationDays: number;
  rebatePct: number;
  perks: string[];
  dailyReward: number;
}

const ogTiers: OGTier[] = [
  {
    tier: 1,
    name: "Fresh OG",
    priceCoins: 5000,
    durationDays: 15,
    rebatePct: 0.6,
    perks: [
      "upcoming_hosts",
      "custom_bubble",
      "ai_gift_hint"
    ],
    dailyReward: Math.floor(5000 * 0.6 / 15) // 200 coins per day
  },
  {
    tier: 2,
    name: "Skilled OG",
    priceCoins: 7000,
    durationDays: 25,
    rebatePct: 0.6,
    perks: [
      "viewer_insights",
      "early_join",
      "viewer_mirror",
      "animated_reacts"
    ],
    dailyReward: Math.floor(7000 * 0.6 / 25) // 168 coins per day
  },
  {
    tier: 3,
    name: "Elite OG",
    priceCoins: 9000,
    durationDays: 30,
    rebatePct: 0.6,
    perks: [
      "auto_gifter_one",
      "stealth_entry",
      "pin_one_message",
      "mic_priority"
    ],
    dailyReward: Math.floor(9000 * 0.6 / 30) // 180 coins per day
  },
  {
    tier: 4,
    name: "Crown OG",
    priceCoins: 15000,
    durationDays: 60,
    rebatePct: 0.6,
    perks: [
      "buzz_entry",
      "ai_cohost",
      "og_lounge",
      "profile_anim",
      "unsend"
    ],
    dailyReward: Math.floor(15000 * 0.6 / 60) // 150 coins per day
  },
  {
    tier: 5,
    name: "Immortal OG",
    priceCoins: 45000,
    durationDays: 180,
    rebatePct: 0.6,
    perks: [
      "ghost_mode",
      "monthly_vote",
      "whale_radar",
      "premium_reel_week",
      "sidekick",
      "unsend",
      "og_spotlight"
    ],
    dailyReward: Math.floor(45000 * 0.6 / 180) // 150 coins per day
  }
];

// Create OG Tier schema
const ogTierSchema = new mongoose.Schema({
  tier: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 5
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  priceCoins: {
    type: Number,
    required: true,
    min: 0
  },
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },
  rebatePct: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0.6
  },
  perks: [{
    type: String,
    required: true
  }],
  dailyReward: {
    type: Number,
    required: true,
    min: 0
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const OGTier = mongoose.model('OGTier', ogTierSchema);

async function seedOGTiers() {
  try {
    console.log('🌟 Starting OG Tiers seeding...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await OGTier.deleteMany({});
    console.log('🗑️  Cleared existing OG Tiers');

    // Insert new data
    const result = await OGTier.insertMany(ogTiers);
    console.log(`✅ Successfully seeded ${result.length} OG Tiers`);

    // Display seeded data
    console.log('\n📋 Seeded OG Tiers:');
    result.forEach(tier => {
      console.log(`  Tier ${tier.tier}: ${tier.name} - ${tier.priceCoins} coins (${tier.dailyReward} daily reward)`);
    });

    console.log('\n🎉 OG Tiers seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding OG Tiers:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedOGTiers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedOGTiers, OGTier };
