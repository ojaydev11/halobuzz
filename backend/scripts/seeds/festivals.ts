import mongoose from 'mongoose';
import { config } from 'dotenv';

// Load environment variables
config();

interface Festival {
  country: string;
  name: string;
  start: Date;
  end: Date;
  giftSetId: string;
  uiSkinUrl: string;
  rules: string[];
  description?: string;
  isActive?: boolean;
  priority?: number;
}

const festivals: Festival[] = [
  // Nepali Festivals
  {
    country: 'NP',
    name: 'Dashain',
    start: new Date('2024-10-15'),
    end: new Date('2024-10-25'),
    giftSetId: 'dashain_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/dashain_2024.json',
    rules: [
      'Traditional tika blessing gifts available',
      'Special Dashain-themed profile frames',
      'Family reunion celebration bonuses',
      'Cultural music and dance themes',
      'Blessing exchange between users'
    ],
    description: 'The biggest and most important festival in Nepal, celebrating victory of good over evil',
    isActive: true,
    priority: 1
  },
  {
    country: 'NP',
    name: 'Tihar',
    start: new Date('2024-11-01'),
    end: new Date('2024-11-05'),
    giftSetId: 'tihar_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/tihar_2024.json',
    rules: [
      'Oil lamp (diyo) gifts available',
      'Five-day celebration themes',
      'Sister-brother bond celebration',
      'Light decoration bonuses',
      'Cultural storytelling events'
    ],
    description: 'Festival of lights celebrating the bond between brothers and sisters',
    isActive: true,
    priority: 2
  },
  {
    country: 'NP',
    name: 'Lhosar',
    start: new Date('2024-02-10'),
    end: new Date('2024-02-12'),
    giftSetId: 'lhosar_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/lhosar_2024.json',
    rules: [
      'Prayer flag gifts available',
      'Tibetan Buddhist themes',
      'New Year celebration bonuses',
      'Traditional dance themes',
      'Cultural exchange events'
    ],
    description: 'Tibetan New Year celebration with prayer flags and traditional dances',
    isActive: true,
    priority: 3
  },
  {
    country: 'NP',
    name: 'Holi',
    start: new Date('2024-03-25'),
    end: new Date('2024-03-26'),
    giftSetId: 'holi_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/holi_2024.json',
    rules: [
      'Color powder gifts available',
      'Rainbow-themed celebrations',
      'Friendship and unity bonuses',
      'Colorful profile themes',
      'Community celebration events'
    ],
    description: 'Festival of colors celebrating spring and unity',
    isActive: true,
    priority: 4
  },
  {
    country: 'NP',
    name: 'Buddha Jayanti',
    start: new Date('2024-05-23'),
    end: new Date('2024-05-23'),
    giftSetId: 'buddha_jayanti_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/buddha_jayanti_2024.json',
    rules: [
      'Lotus flower gifts available',
      'Peace and meditation themes',
      'Spiritual enlightenment bonuses',
      'Buddhist cultural events',
      'Mindfulness activities'
    ],
    description: 'Birth anniversary of Lord Buddha celebrated with peace and meditation',
    isActive: true,
    priority: 5
  },

  // Global Festivals
  {
    country: 'GLOBAL',
    name: 'Christmas',
    start: new Date('2024-12-24'),
    end: new Date('2024-12-26'),
    giftSetId: 'christmas_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/christmas_2024.json',
    rules: [
      'Christmas tree and star gifts available',
      'Winter wonderland themes',
      'Gift-giving celebration bonuses',
      'Santa Claus themed events',
      'Family gathering bonuses'
    ],
    description: 'Christian celebration of the birth of Jesus Christ',
    isActive: true,
    priority: 1
  },
  {
    country: 'GLOBAL',
    name: 'New Year',
    start: new Date('2024-12-31'),
    end: new Date('2025-01-01'),
    giftSetId: 'new_year_2025',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/new_year_2025.json',
    rules: [
      'Fireworks and celebration gifts available',
      'Countdown themes',
      'New beginning bonuses',
      'Resolution sharing events',
      'Global celebration bonuses'
    ],
    description: 'Global celebration of the new year with fireworks and resolutions',
    isActive: true,
    priority: 1
  },
  {
    country: 'GLOBAL',
    name: 'Eid al-Fitr',
    start: new Date('2024-04-10'),
    end: new Date('2024-04-12'),
    giftSetId: 'eid_fitr_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/eid_fitr_2024.json',
    rules: [
      'Crescent moon and star gifts available',
      'Islamic cultural themes',
      'Community celebration bonuses',
      'Charity and giving events',
      'Family reunion bonuses'
    ],
    description: 'Islamic festival marking the end of Ramadan fasting',
    isActive: true,
    priority: 2
  },
  {
    country: 'GLOBAL',
    name: 'Eid al-Adha',
    start: new Date('2024-06-17'),
    end: new Date('2024-06-19'),
    giftSetId: 'eid_adha_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/eid_adha_2024.json',
    rules: [
      'Sacrifice and charity themed gifts',
      'Islamic pilgrimage themes',
      'Community sharing bonuses',
      'Religious celebration events',
      'Family gathering bonuses'
    ],
    description: 'Islamic festival of sacrifice and charity',
    isActive: true,
    priority: 2
  },
  {
    country: 'GLOBAL',
    name: 'Valentine\'s Day',
    start: new Date('2024-02-14'),
    end: new Date('2024-02-14'),
    giftSetId: 'valentine_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/valentine_2024.json',
    rules: [
      'Heart and rose gifts available',
      'Love and romance themes',
      'Couple celebration bonuses',
      'Love expression events',
      'Sweet message bonuses'
    ],
    description: 'Celebration of love and romance',
    isActive: true,
    priority: 3
  },
  {
    country: 'GLOBAL',
    name: 'Halloween',
    start: new Date('2024-10-31'),
    end: new Date('2024-10-31'),
    giftSetId: 'halloween_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/halloween_2024.json',
    rules: [
      'Spooky and scary themed gifts',
      'Costume celebration themes',
      'Trick or treat bonuses',
      'Horror movie themes',
      'Costume contest events'
    ],
    description: 'Spooky celebration with costumes and treats',
    isActive: true,
    priority: 3
  },
  {
    country: 'GLOBAL',
    name: 'Thanksgiving',
    start: new Date('2024-11-28'),
    end: new Date('2024-11-28'),
    giftSetId: 'thanksgiving_2024',
    uiSkinUrl: 'https://assets.halobuzz.com/skins/thanksgiving_2024.json',
    rules: [
      'Turkey and harvest themed gifts',
      'Family gratitude themes',
      'Thankful message bonuses',
      'Harvest celebration events',
      'Family gathering bonuses'
    ],
    description: 'Celebration of gratitude and family',
    isActive: true,
    priority: 3
  }
];

// Create Festival schema
const festivalSchema = new mongoose.Schema({
  country: {
    type: String,
    required: true,
    enum: ['NP', 'GLOBAL', 'IN', 'BD', 'PK', 'LK']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  giftSetId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  uiSkinUrl: {
    type: String,
    required: true,
    trim: true
  },
  rules: [{
    type: String,
    required: true
  }],
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  }
}, {
  timestamps: true
});

// Indexes
festivalSchema.index({ country: 1 });
festivalSchema.index({ start: 1 });
festivalSchema.index({ end: 1 });
festivalSchema.index({ isActive: 1 });
festivalSchema.index({ giftSetId: 1 }, { unique: true });

// Virtual for checking if festival is currently active
festivalSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.start && now <= this.end;
});

// Virtual for days until festival starts
festivalSchema.virtual('daysUntilStart').get(function() {
  const now = new Date();
  const diffTime = this.start.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days until festival ends
festivalSchema.virtual('daysUntilEnd').get(function() {
  const now = new Date();
  const diffTime = this.end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const Festival = mongoose.model('Festival', festivalSchema);

async function seedFestivals() {
  try {
    console.log('🎉 Starting Festivals seeding...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Festival.deleteMany({});
    console.log('🗑️  Cleared existing Festivals');

    // Insert new data
    const result = await Festival.insertMany(festivals);
    console.log(`✅ Successfully seeded ${result.length} Festivals`);

    // Display statistics
    const countryStats = await Festival.aggregate([
      { $group: { _id: '$country', count: { $sum: 1 } } }
    ]);

    const activeFestivals = await Festival.countDocuments({ isActive: true });

    console.log('\n📊 Festival Statistics:');
    console.log('By Country:');
    countryStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} festivals`);
    });

    console.log(`\nActive Festivals: ${activeFestivals}`);

    // Display upcoming festivals
    const upcomingFestivals = await Festival.find({
      start: { $gte: new Date() },
      isActive: true
    }).sort({ start: 1 }).limit(5);

    console.log('\n📅 Upcoming Festivals:');
    upcomingFestivals.forEach(festival => {
      const daysUntil = Math.ceil((festival.start.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  ${festival.name} (${festival.country}) - ${daysUntil} days until start`);
    });

    console.log('\n🎉 Festivals seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Festivals:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedFestivals()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedFestivals, Festival };
