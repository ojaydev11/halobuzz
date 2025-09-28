const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Create User indexes
    console.log('📊 Creating User indexes...');
    const userIndexes = [
      { email: 1 }, // Unique email
      { username: 1 }, // Unique username
      { lastActiveAt: -1 }, // Active users
      { createdAt: -1 }, // New users
      { isVerified: 1 }, // Verified users
      { ogLevel: -1 }, // OG level sorting
      { 'trust.score': -1 }, // Trust score sorting
      { 'coins.balance': -1 }, // Coin balance
      { followers: -1 }, // Follower count
      { 'location.country': 1 }, // Country filtering
    ];

    for (const index of userIndexes) {
      try {
        await db.collection('users').createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Create LiveStream indexes
    console.log('📊 Creating LiveStream indexes...');
    const streamIndexes = [
      { userId: 1 }, // User streams
      { status: 1 }, // Stream status
      { type: 1 }, // Stream type
      { category: 1 }, // Category filtering
      { createdAt: -1 }, // Recent streams
      { totalViewers: -1 }, // Viewer count
      { totalLikes: -1 }, // Like count
      { totalCoins: -1 }, // Coin count
      { status: 1, createdAt: -1 }, // Active streams by date
      { userId: 1, status: 1 }, // User active streams
    ];

    for (const index of streamIndexes) {
      try {
        await db.collection('livestreams').createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Create Transaction indexes
    console.log('📊 Creating Transaction indexes...');
    const transactionIndexes = [
      { userId: 1 }, // User transactions
      { type: 1 }, // Transaction type
      { status: 1 }, // Transaction status
      { paymentMethod: 1 }, // Payment method
      { createdAt: -1 }, // Recent transactions
      { amount: -1 }, // Amount sorting
      { idempotencyKey: 1 }, // Idempotency (unique)
      { userId: 1, createdAt: -1 }, // User transactions by date
      { type: 1, status: 1 }, // Transaction type and status
    ];

    for (const index of transactionIndexes) {
      try {
        await db.collection('transactions').createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Create Gift indexes
    console.log('📊 Creating Gift indexes...');
    const giftIndexes = [
      { name: 1 }, // Gift name
      { category: 1 }, // Gift category
      { price: -1 }, // Gift price
      { isActive: 1 }, // Active gifts
      { popularity: -1 }, // Popularity
      { category: 1, isActive: 1 }, // Active gifts by category
    ];

    for (const index of giftIndexes) {
      try {
        await db.collection('gifts').createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Create ModerationFlag indexes
    console.log('📊 Creating ModerationFlag indexes...');
    const moderationIndexes = [
      { userId: 1 }, // User flags
      { contentType: 1 }, // Content type
      { action: 1 }, // Moderation action
      { status: 1 }, // Flag status
      { createdAt: -1 }, // Recent flags
      { confidence: -1 }, // Confidence score
      { userId: 1, createdAt: -1 }, // User flags by date
      { status: 1, createdAt: -1 }, // Flags by status and date
    ];

    for (const index of moderationIndexes) {
      try {
        await db.collection('moderationflags').createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    // Create Festival indexes
    console.log('📊 Creating Festival indexes...');
    const festivalIndexes = [
      { name: 1 }, // Festival name
      { country: 1 }, // Country
      { isActive: 1 }, // Active festivals
      { startDate: 1 }, // Start date
      { endDate: 1 }, // End date
      { country: 1, startDate: 1 }, // Country festivals by date
    ];

    for (const index of festivalIndexes) {
      try {
        await db.collection('festivals').createIndex(index, { background: true });
        console.log(`  ✅ Created index: ${JSON.stringify(index)}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Index already exists: ${JSON.stringify(index)}`);
        } else {
          console.error(`  ❌ Error creating index ${JSON.stringify(index)}:`, error.message);
        }
      }
    }

    console.log('\n✅ All database indexes created successfully!');

    // Get index statistics
    console.log('\n📈 Index Statistics:');
    const collections = ['users', 'livestreams', 'transactions', 'gifts', 'moderationflags', 'festivals'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
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

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the script
createIndexes();

