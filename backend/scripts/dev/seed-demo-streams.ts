import mongoose from 'mongoose';
import { Stream } from '../../src/models/Stream';

// Demo streams data
const demoStreams = [
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream A - Live Gaming',
    description: 'Playing the latest games with amazing viewers!',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/FF6B6B/FFFFFF?text=Demo+A',
    viewers: 1250,
    likes: 89,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-a',
    agoraToken: 'demo-token-a',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream B - Music Session',
    description: 'Live music performance and chat with fans',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/4ECDC4/FFFFFF?text=Demo+B',
    viewers: 890,
    likes: 156,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-b',
    agoraToken: 'demo-token-b',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream C - Cooking Show',
    description: 'Learn to cook delicious Nepali dishes',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/45B7D1/FFFFFF?text=Demo+C',
    viewers: 2100,
    likes: 234,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-c',
    agoraToken: 'demo-token-c',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream D - Tech Talk',
    description: 'Discussing latest technology trends',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/96CEB4/FFFFFF?text=Demo+D',
    viewers: 750,
    likes: 67,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-d',
    agoraToken: 'demo-token-d',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream E - Fitness Workout',
    description: 'Join me for an intense workout session',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/FFEAA7/FFFFFF?text=Demo+E',
    viewers: 1800,
    likes: 198,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-e',
    agoraToken: 'demo-token-e',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream F - Art & Crafts',
    description: 'Creating beautiful handmade crafts',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/DDA0DD/FFFFFF?text=Demo+F',
    viewers: 650,
    likes: 45,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-f',
    agoraToken: 'demo-token-f',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream G - Comedy Show',
    description: 'Laugh your heart out with hilarious content',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/98D8C8/FFFFFF?text=Demo+G',
    viewers: 3200,
    likes: 456,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-g',
    agoraToken: 'demo-token-g',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new mongoose.Types.ObjectId(),
    title: 'Demo Stream H - Travel Vlog',
    description: 'Exploring beautiful places in Nepal',
    status: 'live',
    country: 'NP',
    thumbnailUrl: 'https://via.placeholder.com/300x200/F7DC6F/FFFFFF?text=Demo+H',
    viewers: 1450,
    likes: 123,
    isLive: true,
    streamerId: new mongoose.Types.ObjectId(),
    agoraChannelName: 'demo-stream-h',
    agoraToken: 'demo-token-h',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedDemoStreams() {
  try {
    console.log('🎬 Starting Demo Streams seeding...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz_local';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing demo streams
    await Stream.deleteMany({ title: { $regex: /^Demo Stream/ } });
    console.log('🧹 Cleared existing demo streams');

    // Insert demo streams
    const insertedStreams = await Stream.insertMany(demoStreams);
    console.log(`✅ Inserted ${insertedStreams.length} demo streams`);

    // Print stream IDs for reference
    console.log('\n📋 Demo Stream IDs:');
    insertedStreams.forEach((stream, index) => {
      console.log(`  ${String.fromCharCode(65 + index)}: ${stream._id} (${stream.title})`);
    });

    console.log('\n🎉 Demo streams seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding demo streams:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoStreams()
    .then(() => {
      console.log('✨ Demo streams seeding process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo streams seeding failed:', error);
      process.exit(1);
    });
}

export { seedDemoStreams };
