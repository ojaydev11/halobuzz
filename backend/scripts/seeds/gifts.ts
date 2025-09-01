import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface Gift {
  code: string;
  name: string;
  priceCoins: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'flower' | 'emoji' | 'sticker' | 'super' | 'festival';
  animation: {
    lottieUrl: string;
  };
  active: boolean;
  isFestivalGift?: boolean;
  description?: string;
}

const gifts: Gift[] = [
  // Flower Category (8 items)
  {
    code: 'rose_red',
    name: 'Red Rose',
    priceCoins: 50,
    rarity: 'common',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/rose_red.json'
    },
    active: true,
    description: 'Classic red rose symbolizing love and passion'
  },
  {
    code: 'rose_pink',
    name: 'Pink Rose',
    priceCoins: 75,
    rarity: 'common',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/rose_pink.json'
    },
    active: true,
    description: 'Gentle pink rose for admiration and grace'
  },
  {
    code: 'sunflower',
    name: 'Sunflower',
    priceCoins: 100,
    rarity: 'rare',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/sunflower.json'
    },
    active: true,
    description: 'Bright sunflower bringing joy and positivity'
  },
  {
    code: 'lotus',
    name: 'Sacred Lotus',
    priceCoins: 150,
    rarity: 'epic',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/lotus.json'
    },
    active: true,
    description: 'Sacred lotus representing purity and enlightenment'
  },
  {
    code: 'marigold',
    name: 'Marigold',
    priceCoins: 80,
    rarity: 'common',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/marigold.json'
    },
    active: true,
    description: 'Vibrant marigold for celebrations and festivals'
  },
  {
    code: 'jasmine',
    name: 'Jasmine',
    priceCoins: 120,
    rarity: 'rare',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/jasmine.json'
    },
    active: true,
    description: 'Fragrant jasmine for beauty and grace'
  },
  {
    code: 'orchid',
    name: 'Orchid',
    priceCoins: 200,
    rarity: 'epic',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/orchid.json'
    },
    active: true,
    description: 'Elegant orchid symbolizing luxury and strength'
  },
  {
    code: 'golden_rose',
    name: 'Golden Rose',
    priceCoins: 500,
    rarity: 'legendary',
    category: 'flower',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/golden_rose.json'
    },
    active: true,
    description: 'Rare golden rose for the most special moments'
  },

  // Emoji Category (7 items)
  {
    code: 'heart_red',
    name: 'Red Heart',
    priceCoins: 30,
    rarity: 'common',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/heart_red.json'
    },
    active: true,
    description: 'Classic red heart for love and affection'
  },
  {
    code: 'heart_sparkle',
    name: 'Sparkling Heart',
    priceCoins: 60,
    rarity: 'rare',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/heart_sparkle.json'
    },
    active: true,
    description: 'Sparkling heart with magical effects'
  },
  {
    code: 'fire',
    name: 'Fire',
    priceCoins: 80,
    rarity: 'rare',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/fire.json'
    },
    active: true,
    description: 'Burning fire for passion and energy'
  },
  {
    code: 'star',
    name: 'Star',
    priceCoins: 100,
    rarity: 'epic',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/star.json'
    },
    active: true,
    description: 'Shining star for excellence and achievement'
  },
  {
    code: 'crown',
    name: 'Crown',
    priceCoins: 300,
    rarity: 'legendary',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/crown.json'
    },
    active: true,
    description: 'Royal crown for kings and queens'
  },
  {
    code: 'diamond',
    name: 'Diamond',
    priceCoins: 400,
    rarity: 'legendary',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/diamond.json'
    },
    active: true,
    description: 'Precious diamond for luxury and wealth'
  },
  {
    code: 'rainbow',
    name: 'Rainbow',
    priceCoins: 150,
    rarity: 'epic',
    category: 'emoji',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/rainbow.json'
    },
    active: true,
    description: 'Colorful rainbow for hope and joy'
  },

  // Sticker Category (6 items)
  {
    code: 'cat_cute',
    name: 'Cute Cat',
    priceCoins: 40,
    rarity: 'common',
    category: 'sticker',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/cat_cute.json'
    },
    active: true,
    description: 'Adorable cat sticker for cuteness'
  },
  {
    code: 'dog_happy',
    name: 'Happy Dog',
    priceCoins: 50,
    rarity: 'common',
    category: 'sticker',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/dog_happy.json'
    },
    active: true,
    description: 'Happy dog sticker for joy and friendship'
  },
  {
    code: 'panda_sleep',
    name: 'Sleeping Panda',
    priceCoins: 90,
    rarity: 'rare',
    category: 'sticker',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/panda_sleep.json'
    },
    active: true,
    description: 'Sleepy panda for relaxation and peace'
  },
  {
    code: 'unicorn',
    name: 'Unicorn',
    priceCoins: 180,
    rarity: 'epic',
    category: 'sticker',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/unicorn.json'
    },
    active: true,
    description: 'Magical unicorn for fantasy and dreams'
  },
  {
    code: 'dragon',
    name: 'Dragon',
    priceCoins: 250,
    rarity: 'legendary',
    category: 'sticker',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/dragon.json'
    },
    active: true,
    description: 'Mighty dragon for power and strength'
  },
  {
    code: 'butterfly',
    name: 'Butterfly',
    priceCoins: 70,
    rarity: 'common',
    category: 'sticker',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/butterfly.json'
    },
    active: true,
    description: 'Beautiful butterfly for transformation'
  },

  // Super Category (4 items)
  {
    code: 'rocket_super',
    name: 'Super Rocket',
    priceCoins: 1000,
    rarity: 'legendary',
    category: 'super',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/rocket_super.json'
    },
    active: true,
    description: 'Super rocket with spectacular effects'
  },
  {
    code: 'laser_show',
    name: 'Laser Show',
    priceCoins: 800,
    rarity: 'epic',
    category: 'super',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/laser_show.json'
    },
    active: true,
    description: 'Amazing laser light show'
  },
  {
    code: 'fireworks',
    name: 'Fireworks',
    priceCoins: 600,
    rarity: 'epic',
    category: 'super',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/fireworks.json'
    },
    active: true,
    description: 'Colorful fireworks display'
  },
  {
    code: 'meteor',
    name: 'Meteor Shower',
    priceCoins: 1200,
    rarity: 'legendary',
    category: 'super',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/meteor.json'
    },
    active: true,
    description: 'Epic meteor shower from space'
  },

  // Festival Category (5 items) - These are festival gifts
  {
    code: 'dashain_tika',
    name: 'Dashain Tika',
    priceCoins: 200,
    rarity: 'epic',
    category: 'festival',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/dashain_tika.json'
    },
    active: true,
    isFestivalGift: true,
    description: 'Traditional Dashain tika blessing'
  },
  {
    code: 'tihar_diyo',
    name: 'Tihar Diyo',
    priceCoins: 150,
    rarity: 'rare',
    category: 'festival',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/tihar_diyo.json'
    },
    active: true,
    isFestivalGift: true,
    description: 'Sacred oil lamp for Tihar festival'
  },
  {
    code: 'holi_colors',
    name: 'Holi Colors',
    priceCoins: 180,
    rarity: 'epic',
    category: 'festival',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/holi_colors.json'
    },
    active: true,
    isFestivalGift: true,
    description: 'Vibrant Holi colors celebration'
  },
  {
    code: 'lhosar_flag',
    name: 'Lhosar Prayer Flag',
    priceCoins: 120,
    rarity: 'rare',
    category: 'festival',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/lhosar_flag.json'
    },
    active: true,
    isFestivalGift: true,
    description: 'Colorful prayer flags for Lhosar'
  },
  {
    code: 'christmas_tree',
    name: 'Christmas Tree',
    priceCoins: 300,
    rarity: 'epic',
    category: 'festival',
    animation: {
      lottieUrl: 'https://assets.lottiefiles.com/gifts/christmas_tree.json'
    },
    active: true,
    isFestivalGift: true,
    description: 'Festive Christmas tree with lights'
  }
];

// Create Gift schema
const giftSchema = new mongoose.Schema({
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
  priceCoins: {
    type: Number,
    required: true,
    min: 0
  },
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    required: true
  },
  category: {
    type: String,
    enum: ['flower', 'emoji', 'sticker', 'super', 'festival'],
    required: true
  },
  animation: {
    lottieUrl: {
      type: String,
      required: true
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  isFestivalGift: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
giftSchema.index({ code: 1 });
giftSchema.index({ category: 1 });
giftSchema.index({ rarity: 1 });
giftSchema.index({ active: 1 });
giftSchema.index({ isFestivalGift: 1 });

const Gift = mongoose.model('Gift', giftSchema);

async function seedGifts() {
  try {
    console.log('🎁 Starting Gifts seeding...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Gift.deleteMany({});
    console.log('🗑️  Cleared existing Gifts');

    // Insert new data
    const result = await Gift.insertMany(gifts);
    console.log(`✅ Successfully seeded ${result.length} Gifts`);

    // Display statistics
    const categoryStats = await Gift.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    
    const rarityStats = await Gift.aggregate([
      { $group: { _id: '$rarity', count: { $sum: 1 } } }
    ]);

    const festivalGifts = await Gift.countDocuments({ isFestivalGift: true });

    console.log('\n📊 Gift Statistics:');
    console.log('Categories:');
    categoryStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} gifts`);
    });
    
    console.log('\nRarities:');
    rarityStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} gifts`);
    });

    console.log(`\nFestival Gifts: ${festivalGifts}`);

    console.log('\n🎉 Gifts seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Gifts:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedGifts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedGifts, Gift };
