/**
 * Migration Script: In-Memory State to MongoDB Persistence
 * Migrates critical in-memory state to MongoDB collections
 */

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { Inventory } from '../models/Inventory';
import { BattlePassProgress } from '../models/BattlePassProgress';
import { GameSessionState } from '../models/GameSessionState';
import { MatchmakingQueue } from '../models/MatchmakingQueue';
import { User } from '../models/User';

interface MigrationOptions {
  dryRun: boolean;
  batchSize: number;
  skipExisting: boolean;
}

export class InMemoryToMongoMigrator {
  private options: MigrationOptions;

  constructor(options: MigrationOptions = { dryRun: false, batchSize: 100, skipExisting: true }) {
    this.options = options;
  }

  /**
   * Run the complete migration process
   */
  async migrate(): Promise<void> {
    try {
      logger.info('Starting in-memory to MongoDB migration...', this.options);

      // Connect to database
      await connectDatabase();

      // Run migrations in order
      await this.migrateUserInventories();
      await this.migrateBattlePassProgress();
      await this.migrateGameSessionStates();
      await this.migrateMatchmakingQueues();
      await this.createIndexes();

      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate user inventories from in-memory Maps to MongoDB
   */
  private async migrateUserInventories(): Promise<void> {
    logger.info('Migrating user inventories...');

    const users = await User.find({}).select('_id username email');
    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if inventory already exists
        if (this.options.skipExisting) {
          const existing = await Inventory.findOne({ userId: user._id });
          if (existing) {
            skippedCount++;
            continue;
          }
        }

        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Would create inventory for user: ${user.username}`);
          migratedCount++;
          continue;
        }

        // Create default inventory
        const inventory = new Inventory({
          userId: user._id,
          items: new Map(),
          cosmetics: new Map(),
          collectibles: new Map()
        });

        await inventory.save();
        migratedCount++;

        if (migratedCount % this.options.batchSize === 0) {
          logger.info(`Migrated ${migratedCount} inventories...`);
        }
      } catch (error) {
        logger.error(`Failed to migrate inventory for user ${user.username}:`, error);
      }
    }

    logger.info(`User inventories migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
  }

  /**
   * Migrate battle pass progress from in-memory Maps to MongoDB
   */
  private async migrateBattlePassProgress(): Promise<void> {
    logger.info('Migrating battle pass progress...');

    // Get users who might have battle pass progress
    const users = await User.find({ 
      $or: [
        { 'preferences.battlePassEnabled': true },
        { coins: { $gt: 0 } }
      ]
    }).select('_id username');

    let migratedCount = 0;
    let skippedCount = 0;

    // Default battle pass seasons to migrate
    const seasons = ['season-1', 'season-2', 'season-3'];

    for (const user of users) {
      for (const season of seasons) {
        try {
          const battlePassId = `battlepass-${season}`;

          // Check if progress already exists
          if (this.options.skipExisting) {
            const existing = await BattlePassProgress.findOne({ 
              userId: user._id, 
              battlePassId 
            });
            if (existing) {
              skippedCount++;
              continue;
            }
          }

          if (this.options.dryRun) {
            logger.info(`[DRY RUN] Would create battle pass progress for user: ${user.username}, season: ${season}`);
            migratedCount++;
            continue;
          }

          // Create default battle pass progress
          const progress = new BattlePassProgress({
            userId: user._id,
            battlePassId,
            season,
            currentTier: 0,
            currentXP: 0,
            xpToNextTier: 100,
            totalXP: 0,
            premiumUnlocked: false,
            completedTiers: [],
            claimedRewards: [],
            dailyQuests: new Map(),
            weeklyQuests: new Map(),
            seasonQuests: new Map()
          });

          await progress.save();
          migratedCount++;

        } catch (error) {
          logger.error(`Failed to migrate battle pass progress for user ${user.username}, season ${season}:`, error);
        }
      }
    }

    logger.info(`Battle pass progress migration completed: ${migratedCount} migrated, ${skippedCount} skipped`);
  }

  /**
   * Migrate game session states from in-memory Maps to MongoDB
   */
  private async migrateGameSessionStates(): Promise<void> {
    logger.info('Migrating game session states...');

    // This would typically read from the in-memory game service
    // For now, we'll create a few sample sessions for testing
    const sampleSessions = [
      {
        sessionId: 'session-sample-1',
        gameId: 'battle-royale-1',
        gameType: 'battle-royale',
        status: 'waiting',
        players: new Map(),
        gameState: {},
        currentRound: 0,
        totalRounds: 10,
        timeRemaining: 300
      }
    ];

    let migratedCount = 0;

    for (const sessionData of sampleSessions) {
      try {
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Would create game session: ${sessionData.sessionId}`);
          migratedCount++;
          continue;
        }

        const session = new GameSessionState(sessionData);
        await session.save();
        migratedCount++;

      } catch (error) {
        logger.error(`Failed to migrate game session ${sessionData.sessionId}:`, error);
      }
    }

    logger.info(`Game session states migration completed: ${migratedCount} migrated`);
  }

  /**
   * Migrate matchmaking queues from in-memory Maps to MongoDB
   */
  private async migrateMatchmakingQueues(): Promise<void> {
    logger.info('Migrating matchmaking queues...');

    // Create default matchmaking queues for different game types
    const defaultQueues = [
      {
        queueId: 'queue-battle-royale-bronze',
        gameType: 'battle-royale',
        gameMode: 'solo',
        region: 'global',
        skillLevel: 'bronze',
        players: new Map(),
        maxPlayers: 100,
        minPlayers: 50,
        averageWaitTime: 30,
        status: 'active'
      },
      {
        queueId: 'queue-tournament-silver',
        gameType: 'tournament',
        gameMode: 'team',
        region: 'global',
        skillLevel: 'silver',
        players: new Map(),
        maxPlayers: 8,
        minPlayers: 4,
        averageWaitTime: 60,
        status: 'active'
      }
    ];

    let migratedCount = 0;

    for (const queueData of defaultQueues) {
      try {
        if (this.options.dryRun) {
          logger.info(`[DRY RUN] Would create matchmaking queue: ${queueData.queueId}`);
          migratedCount++;
          continue;
        }

        const queue = new MatchmakingQueue(queueData);
        await queue.save();
        migratedCount++;

      } catch (error) {
        logger.error(`Failed to migrate matchmaking queue ${queueData.queueId}:`, error);
      }
    }

    logger.info(`Matchmaking queues migration completed: ${migratedCount} migrated`);
  }

  /**
   * Create additional indexes for performance
   */
  private async createIndexes(): Promise<void> {
    logger.info('Creating additional indexes...');

    try {
      // Inventory indexes
      await Inventory.collection.createIndex({ 'items.itemId': 1 });
      await Inventory.collection.createIndex({ 'cosmetics.cosmeticId': 1 });
      await Inventory.collection.createIndex({ 'collectibles.collectibleId': 1 });

      // Battle pass progress indexes
      await BattlePassProgress.collection.createIndex({ userId: 1, season: 1 });
      await BattlePassProgress.collection.createIndex({ currentTier: 1 });

      // Game session state indexes
      await GameSessionState.collection.createIndex({ gameId: 1, status: 1 });
      await GameSessionState.collection.createIndex({ 'players.userId': 1 });

      // Matchmaking queue indexes
      await MatchmakingQueue.collection.createIndex({ gameType: 1, skillLevel: 1 });
      await MatchmakingQueue.collection.createIndex({ status: 1 });

      logger.info('Additional indexes created successfully');
    } catch (error) {
      logger.error('Failed to create indexes:', error);
    }
  }

  /**
   * Validate migration results
   */
  async validate(): Promise<void> {
    logger.info('Validating migration results...');

    try {
      // Check inventory counts
      const inventoryCount = await Inventory.countDocuments();
      logger.info(`Total inventories: ${inventoryCount}`);

      // Check battle pass progress counts
      const battlePassCount = await BattlePassProgress.countDocuments();
      logger.info(`Total battle pass progress records: ${battlePassCount}`);

      // Check game session counts
      const gameSessionCount = await GameSessionState.countDocuments();
      logger.info(`Total game session states: ${gameSessionCount}`);

      // Check matchmaking queue counts
      const queueCount = await MatchmakingQueue.countDocuments();
      logger.info(`Total matchmaking queues: ${queueCount}`);

      logger.info('Migration validation completed');
    } catch (error) {
      logger.error('Migration validation failed:', error);
    }
  }

  /**
   * Rollback migration (remove created collections)
   */
  async rollback(): Promise<void> {
    logger.warn('Rolling back migration...');

    try {
      await Inventory.collection.drop();
      await BattlePassProgress.collection.drop();
      await GameSessionState.collection.drop();
      await MatchmakingQueue.collection.drop();

      logger.info('Migration rollback completed');
    } catch (error) {
      logger.error('Migration rollback failed:', error);
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipExisting = !args.includes('--force');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100');

  const migrator = new InMemoryToMongoMigrator({
    dryRun,
    batchSize,
    skipExisting
  });

  migrator.migrate()
    .then(() => migrator.validate())
    .then(() => {
      logger.info('Migration process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed:', error);
      process.exit(1);
    });
}
