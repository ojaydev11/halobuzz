const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const LiveStream = require('../src/models/LiveStream');
const Transaction = require('../src/models/Transaction');
const Gift = require('../src/models/Gift');
const ModerationFlag = require('../src/models/ModerationFlag');
const Festival = require('../src/models/Festival');

class DatabaseIndexManager {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async createAllIndexes() {
    console.log('🚀 Starting database index creation...\n');

    try {
      await this.createUserIndexes();
      await this.createLiveStreamIndexes();
      await this.createTransactionIndexes();
      await this.createGiftIndexes();
      await this.createModerationFlagIndexes();
      await this.createFestivalIndexes();
      await this.createTTLIndexes();

      console.log('\n✅ All database indexes created successfully!');
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      throw error;
    }
  }

  async createUserIndexes() {
    console.log('📊 Creating User indexes...');
    
    const indexes = [
      // Basic indexes
      { email: 1 }, // Unique email
      { username: 1 }, // Unique username
      { phoneNumber: 1 }, // Unique phone
      
      // Performance indexes
      { lastActiveAt: -1 }, // Active users
      { createdAt: -1 }, // New users
      { isVerified: 1 }, // Verified users
      { isBanned: 1 }, // Banned users
      { isActive: 1 }, // Active accounts
      
      // OG and trust indexes
      { ogLevel: -1 }, // OG level sorting
      { 'trust.score': -1 }, // Trust score sorting
      { 'trust.factors.totalStreams': -1 }, // Stream count
      { 'trust.factors.totalGifts': -1 }, // Gift count
      
      // Coin indexes
      { 'coins.balance': -1 }, // Coin balance
      { 'coins.totalSpent': -1 }, // Total spent
      { 'coins.totalEarned': -1 }, // Total earned
      
      // Social indexes
      { followers: -1 }, // Follower count
      { following: -1 }, // Following count
      { 'preferences.interests': 1 }, // Interest matching
      
      // Location indexes
      { 'location.country': 1 }, // Country filtering
      { 'location.city': 1 }, // City filtering
      
      // Composite indexes
      { isActive: 1, lastActiveAt: -1 }, // Active users by activity
      { ogLevel: -1, 'trust.score': -1 }, // OG level and trust
      { 'location.country': 1, isActive: 1 }, // Country and active
      { createdAt: -1, isVerified: 1 }, // New verified users
    ];

    for (const index of indexes) {
      try {
        await User.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
  }

  async createLiveStreamIndexes() {
    console.log('📊 Creating LiveStream indexes...');
    
    const indexes = [
      // Basic indexes
      { userId: 1 }, // User streams
      { status: 1 }, // Stream status
      { type: 1 }, // Stream type
      { category: 1 }, // Category filtering
      
      // Performance indexes
      { createdAt: -1 }, // Recent streams
      { startTime: -1 }, // Stream start time
      { endTime: -1 }, // Stream end time
      { duration: -1 }, // Stream duration
      
      // Engagement indexes
      { totalViewers: -1 }, // Viewer count
      { currentViewers: -1 }, // Current viewers
      { totalLikes: -1 }, // Like count
      { totalComments: -1 }, // Comment count
      { totalShares: -1 }, // Share count
      { totalCoins: -1 }, // Coin count
      
      // Quality indexes
      { quality: 1 }, // Stream quality
      { bitrate: -1 }, // Bitrate
      { resolution: 1 }, // Resolution
      
      // Location indexes
      { 'location.country': 1 }, // Country
      { 'location.city': 1 }, // City
      
      // Composite indexes
      { status: 1, createdAt: -1 }, // Active streams by date
      { userId: 1, status: 1 }, // User active streams
      { category: 1, status: 1 }, // Category active streams
      { 'location.country': 1, status: 1 }, // Country active streams
      { totalViewers: -1, status: 1 }, // Popular active streams
      { createdAt: -1, category: 1 }, // Recent streams by category
      { userId: 1, createdAt: -1 }, // User streams by date
    ];

    for (const index of indexes) {
      try {
        await LiveStream.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
  }

  async createTransactionIndexes() {
    console.log('📊 Creating Transaction indexes...');
    
    const indexes = [
      // Basic indexes
      { userId: 1 }, // User transactions
      { type: 1 }, // Transaction type
      { status: 1 }, // Transaction status
      { paymentMethod: 1 }, // Payment method
      { currency: 1 }, // Currency
      
      // Performance indexes
      { createdAt: -1 }, // Recent transactions
      { amount: -1 }, // Amount sorting
      { transactionId: 1 }, // Transaction ID
      
      // Security indexes
      { idempotencyKey: 1 }, // Idempotency (unique)
      { transactionHash: 1 }, // Transaction hash
      
      // Financial indexes
      { fees: -1 }, // Fee amount
      { netAmount: -1 }, // Net amount
      
      // Composite indexes
      { userId: 1, createdAt: -1 }, // User transactions by date
      { type: 1, status: 1 }, // Transaction type and status
      { paymentMethod: 1, status: 1 }, // Payment method and status
      { userId: 1, type: 1 }, // User transaction types
      { createdAt: -1, status: 1 }, // Recent transactions by status
      { amount: -1, status: 1 }, // High value transactions
      { userId: 1, paymentMethod: 1 }, // User payment methods
    ];

    for (const index of indexes) {
      try {
        await Transaction.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
  }

  async createGiftIndexes() {
    console.log('📊 Creating Gift indexes...');
    
    const indexes = [
      // Basic indexes
      { name: 1 }, // Gift name
      { category: 1 }, // Gift category
      { price: -1 }, // Gift price
      { isActive: 1 }, // Active gifts
      
      // Performance indexes
      { popularity: -1 }, // Popularity
      { createdAt: -1 }, // Recent gifts
      
      // Special indexes
      { isSpecial: 1 }, // Special gifts
      { festivalId: 1 }, // Festival gifts
      
      // Composite indexes
      { category: 1, isActive: 1 }, // Active gifts by category
      { price: -1, isActive: 1 }, // Active gifts by price
      { popularity: -1, isActive: 1 }, // Popular active gifts
    ];

    for (const index of indexes) {
      try {
        await Gift.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
  }

  // ChatMessage indexes removed - model doesn't exist

  async createModerationFlagIndexes() {
    console.log('📊 Creating ModerationFlag indexes...');
    
    const indexes = [
      // Basic indexes
      { userId: 1 }, // User flags
      { contentType: 1 }, // Content type
      { action: 1 }, // Moderation action
      { status: 1 }, // Flag status
      
      // Performance indexes
      { createdAt: -1 }, // Recent flags
      { confidence: -1 }, // Confidence score
      
      // Moderation indexes
      { reviewedBy: 1 }, // Reviewed by
      { reviewedAt: -1 }, // Review date
      
      // Composite indexes
      { userId: 1, createdAt: -1 }, // User flags by date
      { status: 1, createdAt: -1 }, // Flags by status and date
      { action: 1, status: 1 }, // Action and status
      { contentType: 1, action: 1 }, // Content type and action
      { confidence: -1, status: 1 }, // High confidence flags
    ];

    for (const index of indexes) {
      try {
        await ModerationFlag.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
  }

  async createFestivalIndexes() {
    console.log('📊 Creating Festival indexes...');
    
    const indexes = [
      // Basic indexes
      { name: 1 }, // Festival name
      { country: 1 }, // Country
      { isActive: 1 }, // Active festivals
      
      // Performance indexes
      { startDate: 1 }, // Start date
      { endDate: 1 }, // End date
      { createdAt: -1 }, // Recent festivals
      
      // Composite indexes
      { country: 1, startDate: 1 }, // Country festivals by date
      { isActive: 1, startDate: 1 }, // Active festivals by date
      { startDate: 1, endDate: 1 }, // Date range
    ];

    for (const index of indexes) {
      try {
        await Festival.collection.createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }
  }

  async createTTLIndexes() {
    console.log('📊 Creating TTL indexes for automatic cleanup...');
    
    const ttlIndexes = [
      // Session cleanup (7 days)
      { collection: 'sessions', field: 'expires', ttl: 7 * 24 * 60 * 60 },
      
      // Temporary data cleanup (1 day)
      { collection: 'tempdata', field: 'createdAt', ttl: 24 * 60 * 60 },
      
      // Log cleanup (30 days)
      { collection: 'logs', field: 'timestamp', ttl: 30 * 24 * 60 * 60 },
      
      // Cache cleanup (1 hour)
      { collection: 'cache', field: 'expiresAt', ttl: 60 * 60 },
    ];

    for (const ttlIndex of ttlIndexes) {
      try {
        const collection = mongoose.connection.db.collection(ttlIndex.collection);
        await collection.createIndex(
          { [ttlIndex.field]: 1 }, 
          { expireAfterSeconds: ttlIndex.ttl, background: true }
        );
        console.log(`  ✅ Created TTL index: ${ttlIndex.collection}.${ttlIndex.field} (${ttlIndex.ttl}s)`);
      } catch (error) {
        console.error(`  ❌ Error creating TTL index ${ttlIndex.collection}:`, error.message);
      }
    }
  }

  async getIndexStats() {
    console.log('\n📈 Index Statistics:');
    
    const collections = ['users', 'livestreams', 'transactions', 'gifts', 'moderationflags', 'festivals'];
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const stats = await collection.stats();
        const indexes = await collection.indexes();
        
        console.log(`\n📊 ${collectionName.toUpperCase()}:`);
        console.log(`  Documents: ${stats.count.toLocaleString()}`);
        console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Indexes: ${indexes.length}`);
        console.log(`  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      } catch (error) {
        console.error(`  ❌ Error getting stats for ${collectionName}:`, error.message);
      }
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }
  }
}

// Main execution
async function main() {
  const indexManager = new DatabaseIndexManager();
  
  try {
    await indexManager.connect();
    await indexManager.createAllIndexes();
    await indexManager.getIndexStats();
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await indexManager.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseIndexManager;
