const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../dist/models/User').User;

const demoAccounts = [
  {
    username: 'demo_user',
    email: 'demo@halobuzz.com',
    password: 'Demo123!',
    displayName: 'Demo User',
    country: 'US',
    language: 'en',
    isVerified: true,
    kycStatus: 'verified',
    ageVerified: true,
    totalCoinsEarned: 1000,
    coins: 500,
    followers: 150,
    following: 75,
    totalLikes: 2500,
    totalViews: 15000,
    ogLevel: 3
  },
  {
    username: 'test_user',
    email: 'test@halobuzz.com',
    password: 'Test123!',
    displayName: 'Test User',
    country: 'CA',
    language: 'en',
    isVerified: true,
    kycStatus: 'verified',
    ageVerified: true,
    totalCoinsEarned: 500,
    coins: 250,
    followers: 50,
    following: 25,
    totalLikes: 1000,
    totalViews: 5000,
    ogLevel: 2
  },
  {
    username: 'admin_demo',
    email: 'admin@halobuzz.com',
    password: 'Admin123!',
    displayName: 'Admin Demo',
    country: 'US',
    language: 'en',
    isVerified: true,
    kycStatus: 'verified',
    ageVerified: true,
    totalCoinsEarned: 5000,
    coins: 2000,
    followers: 500,
    following: 100,
    totalLikes: 10000,
    totalViews: 50000,
    ogLevel: 5
  }
];

async function createDemoAccounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz');
    console.log('Connected to MongoDB');

    // Clear existing demo accounts
    await User.deleteMany({ 
      email: { $in: demoAccounts.map(acc => acc.email) } 
    });
    console.log('Cleared existing demo accounts');

    // Create demo accounts
    for (const account of demoAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 12);
      
      const user = new User({
        ...account,
        password: hashedPassword,
        lastActiveAt: new Date(),
        preferences: {
          notifications: {
            push: true,
            email: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'public',
            showOnlineStatus: true,
            allowGifts: true,
            allowMessages: true
          },
          content: {
            showMatureContent: false,
            language: account.language
          }
        }
      });

      await user.save();
      console.log(`✅ Created demo account: ${account.username} (${account.email})`);
    }

    console.log('\n🎉 Demo accounts created successfully!');
    console.log('\n📱 Demo Account Credentials:');
    console.log('================================');
    demoAccounts.forEach(account => {
      console.log(`Username: ${account.username}`);
      console.log(`Email: ${account.email}`);
      console.log(`Password: ${account.password}`);
      console.log(`Coins: ${account.coins}`);
      console.log('---');
    });

  } catch (error) {
    console.error('Error creating demo accounts:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createDemoAccounts();

