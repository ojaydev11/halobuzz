/**
 * Database Migration Utility
 * Handles schema migrations and data transformations for production deployments
 */

import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Gift } from '../src/models/Gift';
import { Transaction } from '../src/models/Transaction';
import { AuditLog } from '../src/models/AuditLog';
import { setupLogger } from '../src/config/logger';

const logger = setupLogger();

interface Migration {
  version: string;
  name: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

class DatabaseMigrator {
  private migrations: Migration[] = [];
  private currentVersion: string = '0.0.0';

  constructor() {
    this.registerMigrations();
  }

  private registerMigrations(): void {
    // Migration 1: Add role field to existing users
    this.migrations.push({
      version: '1.0.0',
      name: 'add_user_roles',
      description: 'Add role field to existing users and set default role',
      up: async () => {
        logger.info('Running migration: add_user_roles');
        
        const result = await User.updateMany(
          { role: { $exists: false } },
          { $set: { role: 'user' } }
        );
        
        logger.info(`Updated ${result.modifiedCount} users with default role`);
      },
      down: async () => {
        logger.info('Rolling back migration: add_user_roles');
        
        await User.updateMany(
          { role: 'user' },
          { $unset: { role: 1 } }
        );
        
        logger.info('Removed role field from users');
      }
    });

    // Migration 2: Add giftCount field for performance optimization
    this.migrations.push({
      version: '1.1.0',
      name: 'add_gift_count_field',
      description: 'Add giftCount field to User model for fast gift statistics',
      up: async () => {
        logger.info('Running migration: add_gift_count_field');
        
        const users = await User.find({ giftCount: { $exists: false } });
        
        for (const user of users) {
          const sentGifts = await Gift.countDocuments({ senderId: user._id });
          const receivedGifts = await Gift.countDocuments({ recipientId: user._id });
          
          await User.findByIdAndUpdate(user._id, {
            $set: {
              giftCount: sentGifts + receivedGifts,
              'trust.factors.totalGifts': sentGifts + receivedGifts
            }
          });
        }
        
        logger.info(`Updated gift counts for ${users.length} users`);
      },
      down: async () => {
        logger.info('Rolling back migration: add_gift_count_field');
        
        await User.updateMany(
          {},
          { $unset: { giftCount: 1 } }
        );
        
        logger.info('Removed giftCount field from users');
      }
    });

    // Migration 3: Add anonymization fields to sensitive collections
    this.migrations.push({
      version: '1.2.0',
      name: 'add_anonymization_fields',
      description: 'Add anonymization tracking fields for GDPR compliance',
      up: async () => {
        logger.info('Running migration: add_anonymization_fields');
        
        // Add anonymization fields to Gift collection
        await Gift.updateMany(
          { anonymizedAt: { $exists: false } },
          { $set: { anonymizedAt: null, anonymizedBy: null } }
        );
        
        // Add anonymization fields to Transaction collection
        await Transaction.updateMany(
          { anonymizedAt: { $exists: false } },
          { $set: { anonymizedAt: null, anonymizedBy: null } }
        );
        
        // Add anonymization fields to LiveStream collection
        const { LiveStream } = await import('../src/models/LiveStream');
        await LiveStream.updateMany(
          { anonymizedAt: { $exists: false } },
          { $set: { anonymizedAt: null, anonymizedBy: null } }
        );
        
        // Add anonymization fields to GameSession collection
        const { GameSession } = await import('../src/models/GameSession');
        await GameSession.updateMany(
          { anonymizedAt: { $exists: false } },
          { $set: { anonymizedAt: null, anonymizedBy: null } }
        );
        
        // Add anonymization fields to Message collection
        const { Message } = await import('../src/models/Message');
        await Message.updateMany(
          { anonymizedAt: { $exists: false } },
          { $set: { anonymizedAt: null, anonymizedBy: null } }
        );
        
        logger.info('Added anonymization fields to all collections');
      },
      down: async () => {
        logger.info('Rolling back migration: add_anonymization_fields');
        
        await Gift.updateMany(
          {},
          { $unset: { anonymizedAt: 1, anonymizedBy: 1 } }
        );
        
        await Transaction.updateMany(
          {},
          { $unset: { anonymizedAt: 1, anonymizedBy: 1 } }
        );
        
        const { LiveStream } = await import('../src/models/LiveStream');
        await LiveStream.updateMany(
          {},
          { $unset: { anonymizedAt: 1, anonymizedBy: 1 } }
        );
        
        const { GameSession } = await import('../src/models/GameSession');
        await GameSession.updateMany(
          {},
          { $unset: { anonymizedAt: 1, anonymizedBy: 1 } }
        );
        
        const { Message } = await import('../src/models/Message');
        await Message.updateMany(
          {},
          { $unset: { anonymizedAt: 1, anonymizedBy: 1 } }
        );
        
        logger.info('Removed anonymization fields from all collections');
      }
    });

    // Migration 4: Create performance indexes
    this.migrations.push({
      version: '1.3.0',
      name: 'create_performance_indexes',
      description: 'Create performance indexes for frequently queried fields',
      up: async () => {
        logger.info('Running migration: create_performance_indexes');
        
        // User indexes
        await User.collection.createIndex({ 'coins.balance': 1 });
        await User.collection.createIndex({ 'trust.score': -1 });
        await User.collection.createIndex({ 'lastActiveAt': -1 });
        await User.collection.createIndex({ 'role': 1, 'isBanned': 1 });
        
        // Gift indexes
        await Gift.collection.createIndex({ senderId: 1, createdAt: -1 });
        await Gift.collection.createIndex({ recipientId: 1, createdAt: -1 });
        await Gift.collection.createIndex({ status: 1, createdAt: -1 });
        await Gift.collection.createIndex({ amount: -1 });
        
        // Transaction indexes
        await Transaction.collection.createIndex({ userId: 1, createdAt: -1 });
        await Transaction.collection.createIndex({ type: 1, createdAt: -1 });
        await Transaction.collection.createIndex({ amount: -1 });
        
        // Audit log indexes
        await AuditLog.collection.createIndex({ admin: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ resource: 1, resourceId: 1 });
        await AuditLog.collection.createIndex({ action: 1, createdAt: -1 });
        
        logger.info('Created performance indexes');
      },
      down: async () => {
        logger.info('Rolling back migration: create_performance_indexes');
        
        // Drop indexes (be careful in production!)
        try {
          await User.collection.dropIndex({ 'coins.balance': 1 });
          await User.collection.dropIndex({ 'trust.score': -1 });
          await User.collection.dropIndex({ 'lastActiveAt': -1 });
          await User.collection.dropIndex({ 'role': 1, 'isBanned': 1 });
          
          await Gift.collection.dropIndex({ senderId: 1, createdAt: -1 });
          await Gift.collection.dropIndex({ recipientId: 1, createdAt: -1 });
          await Gift.collection.dropIndex({ status: 1, createdAt: -1 });
          await Gift.collection.dropIndex({ amount: -1 });
          
          await Transaction.collection.dropIndex({ userId: 1, createdAt: -1 });
          await Transaction.collection.dropIndex({ type: 1, createdAt: -1 });
          await Transaction.collection.dropIndex({ amount: -1 });
          
          await AuditLog.collection.dropIndex({ admin: 1, createdAt: -1 });
          await AuditLog.collection.dropIndex({ resource: 1, resourceId: 1 });
          await AuditLog.collection.dropIndex({ action: 1, createdAt: -1 });
          
          logger.info('Dropped performance indexes');
        } catch (error) {
          logger.warn('Some indexes may not exist:', error);
        }
      }
    });

    // Migration 5: Add TTL indexes for audit logs
    this.migrations.push({
      version: '1.4.0',
      name: 'add_audit_log_ttl',
      description: 'Add TTL index to audit logs for automatic cleanup',
      up: async () => {
        logger.info('Running migration: add_audit_log_ttl');
        
        // Create TTL index for audit logs (expire after 1 year)
        await AuditLog.collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year
        );
        
        logger.info('Added TTL index to audit logs');
      },
      down: async () => {
        logger.info('Rolling back migration: add_audit_log_ttl');
        
        try {
          await AuditLog.collection.dropIndex({ createdAt: 1 });
          logger.info('Removed TTL index from audit logs');
        } catch (error) {
          logger.warn('TTL index may not exist:', error);
        }
      }
    });

    // Migration 6: Backfill missing trust scores
    this.migrations.push({
      version: '1.5.0',
      name: 'backfill_trust_scores',
      description: 'Calculate and backfill trust scores for existing users',
      up: async () => {
        logger.info('Running migration: backfill_trust_scores');
        
        const users = await User.find({ 'trust.score': { $exists: false } });
        
        for (const user of users) {
          let trustScore = 0;
          
          // Calculate trust score based on various factors
          if (user.isVerified) trustScore += 20;
          if (user.kycStatus === 'verified') trustScore += 15;
          if (user.ageVerified) trustScore += 10;
          
          // Add points based on activity
          const daysActive = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          trustScore += Math.min(daysActive * 0.1, 20);
          
          // Add points based on gifts
          const giftCount = user.giftCount || 0;
          trustScore += Math.min(giftCount * 0.5, 25);
          
          // Add points based on followers
          trustScore += Math.min(user.followers * 0.01, 10);
          
          // Cap at 100
          trustScore = Math.min(trustScore, 100);
          
          // Determine trust level
          let trustLevel = 'low';
          if (trustScore >= 80) trustLevel = 'verified';
          else if (trustScore >= 60) trustLevel = 'high';
          else if (trustScore >= 40) trustLevel = 'medium';
          
          await User.findByIdAndUpdate(user._id, {
            $set: {
              'trust.score': Math.round(trustScore),
              'trust.level': trustLevel,
              'trust.lastUpdated': new Date()
            }
          });
        }
        
        logger.info(`Backfilled trust scores for ${users.length} users`);
      },
      down: async () => {
        logger.info('Rolling back migration: backfill_trust_scores');
        
        await User.updateMany(
          {},
          { 
            $unset: { 
              'trust.score': 1,
              'trust.level': 1,
              'trust.lastUpdated': 1
            }
          }
        );
        
        logger.info('Removed trust scores from users');
      }
    });
  }

  async migrate(targetVersion?: string): Promise<void> {
    try {
      logger.info('🚀 Starting database migration...');
      
      const migrationsToRun = this.getMigrationsToRun(targetVersion);
      
      if (migrationsToRun.length === 0) {
        logger.info('✅ Database is already up to date');
        return;
      }
      
      logger.info(`📋 Running ${migrationsToRun.length} migrations...`);
      
      for (const migration of migrationsToRun) {
        logger.info(`🔄 Running migration: ${migration.name} (${migration.version})`);
        logger.info(`📝 ${migration.description}`);
        
        try {
          await migration.up();
          await this.recordMigration(migration);
          logger.info(`✅ Migration ${migration.name} completed successfully`);
        } catch (error) {
          logger.error(`❌ Migration ${migration.name} failed:`, error);
          throw error;
        }
      }
      
      logger.info('🎉 All migrations completed successfully!');
      
    } catch (error) {
      logger.error('💥 Migration failed:', error);
      throw error;
    }
  }

  async rollback(targetVersion?: string): Promise<void> {
    try {
      logger.info('🔄 Starting database rollback...');
      
      const migrationsToRollback = this.getMigrationsToRollback(targetVersion);
      
      if (migrationsToRollback.length === 0) {
        logger.info('✅ No migrations to rollback');
        return;
      }
      
      logger.info(`📋 Rolling back ${migrationsToRollback.length} migrations...`);
      
      for (const migration of migrationsToRollback) {
        logger.info(`🔄 Rolling back migration: ${migration.name} (${migration.version})`);
        
        try {
          await migration.down();
          await this.removeMigrationRecord(migration);
          logger.info(`✅ Rollback ${migration.name} completed successfully`);
        } catch (error) {
          logger.error(`❌ Rollback ${migration.name} failed:`, error);
          throw error;
        }
      }
      
      logger.info('🎉 All rollbacks completed successfully!');
      
    } catch (error) {
      logger.error('💥 Rollback failed:', error);
      throw error;
    }
  }

  private getMigrationsToRun(targetVersion?: string): Migration[] {
    const appliedMigrations = this.getAppliedMigrations();
    const targetVer = targetVersion || this.getLatestVersion();
    
    return this.migrations.filter(migration => {
      const isApplied = appliedMigrations.includes(migration.version);
      const isTargetReached = this.compareVersions(migration.version, targetVer) > 0;
      
      return !isApplied && !isTargetReached;
    });
  }

  private getMigrationsToRollback(targetVersion?: string): Migration[] {
    const appliedMigrations = this.getAppliedMigrations();
    const targetVer = targetVersion || '0.0.0';
    
    return this.migrations
      .filter(migration => appliedMigrations.includes(migration.version))
      .filter(migration => this.compareVersions(migration.version, targetVer) > 0)
      .reverse(); // Rollback in reverse order
  }

  private getAppliedMigrations(): string[] {
    // In a real implementation, this would read from a migrations collection
    // For now, we'll return an empty array to run all migrations
    return [];
  }

  private getLatestVersion(): string {
    return this.migrations[this.migrations.length - 1]?.version || '0.0.0';
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  private async recordMigration(migration: Migration): Promise<void> {
    // In a real implementation, this would write to a migrations collection
    logger.info(`Recorded migration: ${migration.version}`);
  }

  private async removeMigrationRecord(migration: Migration): Promise<void> {
    // In a real implementation, this would remove from a migrations collection
    logger.info(`Removed migration record: ${migration.version}`);
  }

  async getStatus(): Promise<void> {
    logger.info('📊 Migration Status:');
    logger.info(`📋 Total migrations: ${this.migrations.length}`);
    
    const appliedMigrations = this.getAppliedMigrations();
    logger.info(`✅ Applied migrations: ${appliedMigrations.length}`);
    
    const pendingMigrations = this.migrations.filter(m => !appliedMigrations.includes(m.version));
    logger.info(`⏳ Pending migrations: ${pendingMigrations.length}`);
    
    if (pendingMigrations.length > 0) {
      logger.info('📝 Pending migrations:');
      pendingMigrations.forEach(migration => {
        logger.info(`  - ${migration.name} (${migration.version}): ${migration.description}`);
      });
    }
  }
}

// Main execution
async function main() {
  try {
    const command = process.argv[2];
    const targetVersion = process.argv[3];
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
    await mongoose.connect(mongoUri);
    logger.info('📡 Connected to MongoDB');

    const migrator = new DatabaseMigrator();

    switch (command) {
      case 'migrate':
        await migrator.migrate(targetVersion);
        break;
      case 'rollback':
        await migrator.rollback(targetVersion);
        break;
      case 'status':
        await migrator.getStatus();
        break;
      default:
        logger.info('Usage: npm run migrate [migrate|rollback|status] [target-version]');
        logger.info('Examples:');
        logger.info('  npm run migrate migrate');
        logger.info('  npm run migrate rollback 1.0.0');
        logger.info('  npm run migrate status');
    }

    // Close connection
    await mongoose.disconnect();
    logger.info('📡 Disconnected from MongoDB');
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseMigrator };
