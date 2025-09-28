const mongoose = require('mongoose');
require('dotenv').config();

async function addIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz');
    
    const db = mongoose.connection.db;
    console.log('Connected to MongoDB');
    
    // User indexes
    console.log('Adding User indexes...');
    await db.collection('users').createIndex({ email: 1, isBanned: 1 });
    await db.collection('users').createIndex({ username: 1, isBanned: 1 });
    await db.collection('users').createIndex({ phone: 1 }, { sparse: true });
    await db.collection('users').createIndex({ 'trust.score': -1 });
    await db.collection('users').createIndex({ 'karma.total': -1 });
    await db.collection('users').createIndex({ 'karma.level': 1 });
    await db.collection('users').createIndex({ country: 1 });
    await db.collection('users').createIndex({ ogLevel: -1, followers: -1 });
    await db.collection('users').createIndex({ lastActiveAt: -1 });
    await db.collection('users').createIndex({ isVerified: 1, isBanned: 1 });
    await db.collection('users').createIndex({ kycStatus: 1, ageVerified: 1 });
    
    // LiveStream indexes
    console.log('Adding LiveStream indexes...');
    await db.collection('livestreams').createIndex({ 
      status: 1, 
      category: 1, 
      country: 1, 
      currentViewers: -1 
    });
    await db.collection('livestreams').createIndex({ hostId: 1, status: 1, createdAt: -1 });
    await db.collection('livestreams').createIndex({ agoraChannel: 1 }, { unique: true });
    await db.collection('livestreams').createIndex({ streamKey: 1 }, { unique: true });
    await db.collection('livestreams').createIndex({ status: 1, totalCoins: -1, currentViewers: -1 });
    await db.collection('livestreams').createIndex({ moderationStatus: 1, createdAt: 1 });
    await db.collection('livestreams').createIndex({ createdAt: -1 });
    await db.collection('livestreams').createIndex({ 'metrics.giftsCoins': -1 });
    
    // Transaction indexes
    console.log('Adding Transaction indexes...');
    await db.collection('transactions').createIndex({ userId: 1, status: 1, createdAt: -1 });
    await db.collection('transactions').createIndex({ type: 1, status: 1, createdAt: -1 });
    await db.collection('transactions').createIndex({ userId: 1, type: 1, status: 1 });
    await db.collection('transactions').createIndex({ 'metadata.orderId': 1 }, { sparse: true, unique: true });
    await db.collection('transactions').createIndex({ transactionId: 1 }, { unique: true, sparse: true });
    await db.collection('transactions').createIndex({ referenceId: 1 });
    await db.collection('transactions').createIndex({ paymentMethod: 1 });
    await db.collection('transactions').createIndex({ createdAt: -1 });
    
    // TTL for cleanup
    console.log('Adding TTL indexes...');
    await db.collection('failed_transactions').createIndex(
      { createdAt: 1 },
      { expireAfterSeconds: 2592000 } // 30 days
    );
    
    // Message indexes
    console.log('Adding Message indexes...');
    await db.collection('messages').createIndex({ channelId: 1, createdAt: -1 });
    await db.collection('messages').createIndex({ senderId: 1, createdAt: -1 });
    await db.collection('messages').createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
    
    // Gift indexes
    console.log('Adding Gift indexes...');
    await db.collection('gifts').createIndex({ streamId: 1, createdAt: -1 });
    await db.collection('gifts').createIndex({ senderId: 1, createdAt: -1 });
    await db.collection('gifts').createIndex({ receiverId: 1, createdAt: -1 });
    await db.collection('gifts').createIndex({ giftType: 1 });
    
    // Analytics indexes
    console.log('Adding Analytics indexes...');
    await db.collection('analytics_events').createIndex({ eventType: 1, timestamp: -1 });
    await db.collection('analytics_events').createIndex({ userId: 1, timestamp: -1 });
    await db.collection('analytics_events').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
    
    // Audit log indexes
    console.log('Adding AuditLog indexes...');
    await db.collection('auditlogs').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ action: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ ipAddress: 1, createdAt: -1 });
    await db.collection('auditlogs').createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year
    
    console.log('All indexes added successfully!');
    
    // List all indexes
    console.log('\nListing all indexes:');
    const collections = ['users', 'livestreams', 'transactions', 'messages', 'gifts', 'analytics_events', 'auditlogs'];
    
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n${collectionName} indexes:`);
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
    
  } catch (error) {
    console.error('Error adding indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

addIndexes();
