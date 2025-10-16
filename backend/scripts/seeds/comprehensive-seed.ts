/**
 * Comprehensive Seed Script
 * Populates the database with realistic test data for development and testing
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { Gift } from '../src/models/Gift';
import { Transaction } from '../src/models/Transaction';
import { LiveStream } from '../src/models/LiveStream';
import { GameSession } from '../src/models/GameSession';
import { Tournament } from '../src/models/Tournament';
import { AuditLog } from '../src/models/AuditLog';
import { ReputationEvent } from '../src/models/ReputationEvent';
import { Message } from '../src/models/Message';

// Configuration
const SEED_CONFIG = {
  users: {
    count: 50,
    adminCount: 3,
    moderatorCount: 5,
    verifiedCount: 20
  },
  gifts: {
    count: 200,
    minAmount: 10,
    maxAmount: 500
  },
  streams: {
    count: 30,
    activeCount: 5
  },
  gameSessions: {
    count: 100
  },
  tournaments: {
    count: 5
  },
  messages: {
    count: 150
  }
};

// Sample data arrays
const USERNAMES = [
  'gamerpro', 'streamqueen', 'halomaster', 'giftgiver', 'coincollector',
  'livelegend', 'tournamentking', 'socialbutterfly', 'gamingninja', 'streamstar',
  'halochampion', 'giftmaster', 'coinwhale', 'livestreamer', 'tournamentpro',
  'socialgamer', 'gaminghero', 'streamking', 'halolegend', 'giftgoddess',
  'coinmaster', 'livestar', 'tournamentchamp', 'socialqueen', 'gamingpro',
  'streamgoddess', 'haloking', 'giftqueen', 'coinlegend', 'livemaster',
  'tournamentstar', 'socialking', 'gamingstar', 'streamchamp', 'halopro',
  'giftstar', 'coinqueen', 'livemaster', 'tournamentking', 'socialpro',
  'gamingqueen', 'streammaster', 'halostar', 'giftchamp', 'coinpro',
  'livestar', 'tournamentqueen', 'socialstar', 'gamingmaster', 'streampro'
];

const STREAM_TITLES = [
  'Epic Gaming Session', 'Late Night Stream', 'Tournament Practice',
  'Gift Opening Party', 'Community Hangout', 'Speedrun Attempt',
  'New Game First Look', 'Retro Gaming Night', 'Multiplayer Madness',
  'Chill Gaming Vibes', 'Competitive Play', 'Casual Gaming',
  'Gift Economy Discussion', 'Community Building', 'Game Review',
  'Tutorial Stream', 'Q&A Session', 'Behind the Scenes',
  'Gaming Tips & Tricks', 'Community Challenges'
];

const GAME_TYPES = [
  'crypto-battle-royale', 'speed-chess', 'ai-poker', 'reflex-arena',
  'strategy-empire', 'memory-master', 'reaction-test', 'puzzle-solver'
];

const GIFT_TYPES = [
  'coin', 'diamond', 'rose', 'heart', 'star', 'crown', 'trophy', 'medal'
];

const MESSAGE_CONTENT = [
  'Hey! How are you doing?', 'Great stream today!', 'Thanks for the gift!',
  'Amazing gameplay!', 'Can we play together?', 'Love your content!',
  'Keep up the great work!', 'You\'re awesome!', 'Thanks for following!',
  'See you in the next stream!', 'GG!', 'Nice moves!', 'Well played!',
  'That was incredible!', 'You\'re the best!', 'Thanks for everything!',
  'Looking forward to more!', 'You rock!', 'Amazing skills!', 'Legend!'
];

class DatabaseSeeder {
  private users: any[] = [];
  private streams: any[] = [];
  private tournaments: any[] = [];

  async seed(): Promise<void> {
    try {
      console.log('🌱 Starting database seeding...');
      
      await this.seedUsers();
      await this.seedStreams();
      await this.seedTournaments();
      await this.seedGifts();
      await this.seedGameSessions();
      await this.seedMessages();
      await this.seedAuditLogs();
      await this.seedReputationEvents();
      
      console.log('✅ Database seeding completed successfully!');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  private async seedUsers(): Promise<void> {
    console.log('👥 Seeding users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    for (let i = 0; i < SEED_CONFIG.users.count; i++) {
      const isAdmin = i < SEED_CONFIG.users.adminCount;
      const isModerator = i >= SEED_CONFIG.users.adminCount && i < SEED_CONFIG.users.adminCount + SEED_CONFIG.users.moderatorCount;
      const isVerified = i < SEED_CONFIG.users.verifiedCount;
      
      const user = await User.create({
        username: USERNAMES[i] || `user${i}`,
        email: `user${i}@example.com`,
        password: hashedPassword,
        displayName: USERNAMES[i] || `User ${i}`,
        country: this.getRandomCountry(),
        language: 'en',
        isVerified: isVerified,
        role: isAdmin ? 'admin' : isModerator ? 'moderator' : 'user',
        coins: {
          balance: this.getRandomInt(100, 2000),
          bonusBalance: this.getRandomInt(0, 500),
          totalEarned: this.getRandomInt(500, 5000),
          totalSpent: this.getRandomInt(100, 2000)
        },
        trust: {
          score: this.getRandomInt(20, 100),
          level: this.getRandomElement(['low', 'medium', 'high', 'verified']),
          factors: {
            kycVerified: isVerified,
            phoneVerified: Math.random() > 0.5,
            emailVerified: true,
            socialConnected: Math.random() > 0.3,
            activeDays: this.getRandomInt(1, 365),
            totalStreams: this.getRandomInt(0, 50),
            totalGifts: this.getRandomInt(0, 100),
            reportCount: this.getRandomInt(0, 5)
          }
        },
        karma: {
          total: this.getRandomInt(0, 1000),
          categories: {
            helpfulness: this.getRandomInt(0, 200),
            mentorship: this.getRandomInt(0, 200),
            creativity: this.getRandomInt(0, 200),
            positivity: this.getRandomInt(0, 200),
            cultural_respect: this.getRandomInt(0, 200),
            community_service: this.getRandomInt(0, 200)
          },
          level: this.getRandomElement(['beginner', 'helper', 'guardian', 'elder', 'bodhisattva']),
          levelName: this.getRandomElement(['नयाँ साथी', 'सहयोगी', 'रक्षक', 'बुजुर्ग', 'बोधिसत्त्व']),
          lastUpdated: new Date(),
          milestones: []
        },
        preferences: {
          notifications: {
            push: true,
            email: Math.random() > 0.5,
            sms: Math.random() > 0.7
          },
          privacy: {
            profileVisibility: this.getRandomElement(['public', 'private', 'followers']),
            showOnlineStatus: Math.random() > 0.3,
            allowGifts: true,
            allowMessages: true
          },
          language: 'en',
          timezone: this.getRandomTimezone(),
          interests: this.getRandomInterests(),
          autoGifter: Math.random() > 0.8,
          categories: this.getRandomCategories(),
          creators: []
        },
        followers: this.getRandomInt(0, 1000),
        following: this.getRandomInt(0, 500),
        totalLikes: this.getRandomInt(0, 5000),
        totalViews: this.getRandomInt(0, 10000),
        ogLevel: this.getRandomInt(0, 5),
        lastActiveAt: this.getRandomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
      });
      
      this.users.push(user);
    }
    
    console.log(`✅ Created ${this.users.length} users`);
  }

  private async seedStreams(): Promise<void> {
    console.log('📺 Seeding live streams...');
    
    for (let i = 0; i < SEED_CONFIG.streams.count; i++) {
      const user = this.getRandomElement(this.users);
      const isActive = i < SEED_CONFIG.streams.activeCount;
      
      const stream = await LiveStream.create({
        userId: user._id,
        title: this.getRandomElement(STREAM_TITLES),
        description: `This is a ${isActive ? 'live' : 'recorded'} stream by ${user.username}`,
        status: isActive ? 'live' : this.getRandomElement(['completed', 'scheduled', 'cancelled']),
        category: this.getRandomElement(['gaming', 'entertainment', 'education', 'sports']),
        tags: this.getRandomTags(),
        thumbnail: `https://example.com/thumbnails/stream${i}.jpg`,
        streamUrl: isActive ? `rtmp://example.com/live/stream${i}` : null,
        viewerCount: isActive ? this.getRandomInt(1, 1000) : 0,
        maxViewers: this.getRandomInt(10, 2000),
        duration: isActive ? this.getRandomInt(300, 7200) : this.getRandomInt(600, 10800),
        startTime: this.getRandomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        endTime: isActive ? null : this.getRandomDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), new Date()),
        isPublic: Math.random() > 0.2,
        allowGifts: true,
        allowComments: true,
        moderationEnabled: Math.random() > 0.3,
        quality: this.getRandomElement(['720p', '1080p', '4K']),
        language: 'en'
      });
      
      this.streams.push(stream);
    }
    
    console.log(`✅ Created ${this.streams.length} streams`);
  }

  private async seedTournaments(): Promise<void> {
    console.log('🏆 Seeding tournaments...');
    
    for (let i = 0; i < SEED_CONFIG.tournaments.count; i++) {
      const tournament = await Tournament.create({
        name: `Tournament ${i + 1}`,
        description: `Epic tournament #${i + 1} with amazing prizes!`,
        gameType: this.getRandomElement(GAME_TYPES),
        entryFee: this.getRandomInt(50, 500),
        prizePool: this.getRandomInt(1000, 10000),
        maxParticipants: this.getRandomInt(16, 128),
        currentParticipants: this.getRandomInt(0, 64),
        status: this.getRandomElement(['upcoming', 'active', 'completed', 'cancelled']),
        startDate: this.getRandomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        endDate: this.getRandomDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
        rules: [
          'No cheating or exploiting',
          'Respect other players',
          'Follow fair play guidelines',
          'Have fun!'
        ],
        prizes: [
          { position: 1, amount: this.getRandomInt(500, 2000), type: 'coins' },
          { position: 2, amount: this.getRandomInt(200, 1000), type: 'coins' },
          { position: 3, amount: this.getRandomInt(100, 500), type: 'coins' }
        ],
        organizer: this.getRandomElement(this.users)._id,
        isPublic: true,
        registrationDeadline: this.getRandomDate(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      });
      
      this.tournaments.push(tournament);
    }
    
    console.log(`✅ Created ${this.tournaments.length} tournaments`);
  }

  private async seedGifts(): Promise<void> {
    console.log('🎁 Seeding gifts...');
    
    for (let i = 0; i < SEED_CONFIG.gifts.count; i++) {
      const sender = this.getRandomElement(this.users);
      const recipient = this.getRandomElement(this.users.filter(u => u._id.toString() !== sender._id.toString()));
      const amount = this.getRandomInt(SEED_CONFIG.gifts.minAmount, SEED_CONFIG.gifts.maxAmount);
      
      await Gift.create({
        senderId: sender._id,
        recipientId: recipient._id,
        senderUsername: sender.username,
        recipientUsername: recipient.username,
        amount: amount,
        type: this.getRandomElement(GIFT_TYPES),
        message: this.getRandomElement([
          'Thanks for the great stream!',
          'Amazing gameplay!',
          'Keep up the great work!',
          'You\'re awesome!',
          'Love your content!',
          'GG!',
          'Well played!',
          'Legend!',
          'You rock!',
          'Amazing skills!'
        ]),
        status: this.getRandomElement(['completed', 'pending', 'cancelled']),
        streamId: Math.random() > 0.5 ? this.getRandomElement(this.streams)?._id : null,
        createdAt: this.getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      });
    }
    
    console.log(`✅ Created ${SEED_CONFIG.gifts.count} gifts`);
  }

  private async seedGameSessions(): Promise<void> {
    console.log('🎮 Seeding game sessions...');
    
    for (let i = 0; i < SEED_CONFIG.gameSessions.count; i++) {
      const user = this.getRandomElement(this.users);
      const gameType = this.getRandomElement(GAME_TYPES);
      const entryFee = this.getRandomInt(10, 200);
      const score = this.getRandomInt(100, 10000);
      
      await GameSession.create({
        sessionId: `session_${i}_${Date.now()}`,
        gameId: gameType,
        userId: user._id,
        entryFee: entryFee,
        reward: score > 5000 ? entryFee * 2 : entryFee,
        platformRake: Math.floor(entryFee * 0.1),
        startTime: this.getRandomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        endTime: this.getRandomDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), new Date()),
        duration: this.getRandomInt(60, 1800),
        score: score,
        rank: this.getRandomInt(1, 100),
        metadata: {
          gameSpecific: {
            level: this.getRandomInt(1, 50),
            difficulty: this.getRandomElement(['easy', 'medium', 'hard', 'expert'])
          },
          difficulty: this.getRandomElement(['easy', 'medium', 'hard']),
          mode: this.getRandomElement(['solo', 'multiplayer', 'tournament'])
        },
        fpsMetrics: {
          samples: Array.from({ length: 10 }, () => this.getRandomInt(30, 120)),
          avg: this.getRandomInt(45, 90),
          min: this.getRandomInt(20, 60),
          max: this.getRandomInt(60, 144),
          p95: this.getRandomInt(50, 100)
        },
        networkLatency: {
          samples: Array.from({ length: 5 }, () => this.getRandomInt(10, 200)),
          avg: this.getRandomInt(20, 100)
        },
        antiCheatFlags: Math.random() > 0.9 ? ['suspicious_timing'] : [],
        suspicionScore: this.getRandomInt(0, 20),
        validated: Math.random() > 0.1,
        validationHash: `hash_${i}_${Date.now()}`,
        status: this.getRandomElement(['completed', 'abandoned', 'disqualified']),
        tournamentId: Math.random() > 0.8 ? this.getRandomElement(this.tournaments)?._id : null
      });
    }
    
    console.log(`✅ Created ${SEED_CONFIG.gameSessions.count} game sessions`);
  }

  private async seedMessages(): Promise<void> {
    console.log('💬 Seeding messages...');
    
    for (let i = 0; i < SEED_CONFIG.messages.count; i++) {
      const sender = this.getRandomElement(this.users);
      const recipient = this.getRandomElement(this.users.filter(u => u._id.toString() !== sender._id.toString()));
      
      await Message.create({
        senderId: sender._id,
        recipientId: recipient._id,
        content: this.getRandomElement(MESSAGE_CONTENT),
        type: 'text',
        status: this.getRandomElement(['sent', 'delivered', 'read']),
        createdAt: this.getRandomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        readAt: Math.random() > 0.3 ? this.getRandomDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), new Date()) : null
      });
    }
    
    console.log(`✅ Created ${SEED_CONFIG.messages.count} messages`);
  }

  private async seedAuditLogs(): Promise<void> {
    console.log('📋 Seeding audit logs...');
    
    const adminUsers = this.users.filter(u => u.role === 'admin');
    
    for (let i = 0; i < 50; i++) {
      const admin = this.getRandomElement(adminUsers);
      const targetUser = this.getRandomElement(this.users);
      
      await AuditLog.create({
        admin: admin._id,
        action: this.getRandomElement(['user.ban', 'user.unban', 'user.verify', 'user.role.update', 'gift.moderate']),
        resource: this.getRandomElement(['user', 'gift', 'stream', 'tournament']),
        resourceId: targetUser._id,
        details: {
          reason: this.getRandomElement(['Policy violation', 'Spam', 'Inappropriate content', 'Suspicious activity']),
          previousValue: this.getRandomElement(['active', 'banned', 'unverified']),
          newValue: this.getRandomElement(['banned', 'active', 'verified'])
        },
        ip: this.getRandomIP(),
        userAgent: this.getRandomUserAgent(),
        createdAt: this.getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      });
    }
    
    console.log('✅ Created 50 audit logs');
  }

  private async seedReputationEvents(): Promise<void> {
    console.log('⭐ Seeding reputation events...');
    
    for (let i = 0; i < 100; i++) {
      const user = this.getRandomElement(this.users);
      const eventType = this.getRandomElement(['gift_sent', 'gift_received', 'stream_hosted', 'stream_watched', 'game_won', 'tournament_participated']);
      
      await ReputationEvent.create({
        userId: user._id,
        type: eventType,
        delta: this.getRandomInt(-10, 20),
        description: this.getReputationDescription(eventType),
        metadata: {
          amount: this.getRandomInt(10, 500),
          gameType: this.getRandomElement(GAME_TYPES),
          tournamentId: this.getRandomElement(this.tournaments)?._id
        },
        createdAt: this.getRandomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      });
    }
    
    console.log('✅ Created 100 reputation events');
  }

  // Helper methods
  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  private getRandomCountry(): string {
    const countries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'KR', 'IN', 'BR'];
    return this.getRandomElement(countries);
  }

  private getRandomTimezone(): string {
    const timezones = ['UTC', 'EST', 'PST', 'GMT', 'CET', 'JST', 'AEST'];
    return this.getRandomElement(timezones);
  }

  private getRandomInterests(): string[] {
    const interests = ['gaming', 'streaming', 'esports', 'technology', 'music', 'art', 'sports', 'education'];
    return interests.slice(0, this.getRandomInt(1, 4));
  }

  private getRandomCategories(): string[] {
    const categories = ['action', 'strategy', 'puzzle', 'racing', 'sports', 'simulation', 'adventure'];
    return categories.slice(0, this.getRandomInt(1, 3));
  }

  private getRandomTags(): string[] {
    const tags = ['gaming', 'live', 'fun', 'community', 'entertainment', 'interactive', 'casual', 'competitive'];
    return tags.slice(0, this.getRandomInt(2, 5));
  }

  private getRandomIP(): string {
    return `${this.getRandomInt(1, 255)}.${this.getRandomInt(1, 255)}.${this.getRandomInt(1, 255)}.${this.getRandomInt(1, 255)}`;
  }

  private getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return this.getRandomElement(userAgents);
  }

  private getReputationDescription(eventType: string): string {
    const descriptions = {
      'gift_sent': 'Sent a gift to another user',
      'gift_received': 'Received a gift from another user',
      'stream_hosted': 'Hosted a live stream',
      'stream_watched': 'Watched a live stream',
      'game_won': 'Won a game session',
      'tournament_participated': 'Participated in a tournament'
    };
    return descriptions[eventType] || 'Reputation event occurred';
  }

  private printSummary(): void {
    console.log('\n📊 Seeding Summary:');
    console.log(`👥 Users: ${this.users.length}`);
    console.log(`📺 Streams: ${this.streams.length}`);
    console.log(`🏆 Tournaments: ${this.tournaments.length}`);
    console.log(`🎁 Gifts: ${SEED_CONFIG.gifts.count}`);
    console.log(`🎮 Game Sessions: ${SEED_CONFIG.gameSessions.count}`);
    console.log(`💬 Messages: ${SEED_CONFIG.messages.count}`);
    console.log(`📋 Audit Logs: 50`);
    console.log(`⭐ Reputation Events: 100`);
    console.log('\n🎉 Database is ready for development and testing!');
  }
}

// Main execution
async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz-test';
    await mongoose.connect(mongoUri);
    console.log('📡 Connected to MongoDB');

    // Run seeder
    const seeder = new DatabaseSeeder();
    await seeder.seed();

    // Close connection
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseSeeder };
