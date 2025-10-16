import { setupLogger } from '@/config/logger';
import { connectDatabase } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const logger = setupLogger();
const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retention: number; // days
  compression: boolean;
  encryption: boolean;
  storage: {
    type: 'local' | 's3' | 'gcs';
    path?: string;
    bucket?: string;
    region?: string;
  };
}

export interface BackupResult {
  success: boolean;
  timestamp: Date;
  size: number;
  path: string;
  error?: string;
}

export class BackupService {
  private static instance: BackupService;
  private config: BackupConfig = {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: parseInt(process.env.BACKUP_RETENTION || '30'),
    compression: process.env.BACKUP_COMPRESSION !== 'false',
    encryption: process.env.BACKUP_ENCRYPTION === 'true',
    storage: {
      type: (process.env.BACKUP_STORAGE_TYPE as 'local' | 's3' | 'gcs') || 'local',
      path: process.env.BACKUP_STORAGE_PATH || './backups',
      bucket: process.env.BACKUP_STORAGE_BUCKET,
      region: process.env.BACKUP_STORAGE_REGION
    }
  };

  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  public async createDatabaseBackup(): Promise<BackupResult> {
    try {
      if (!this.config.enabled) {
        throw new Error('Backup service is disabled');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `halobuzz-db-backup-${timestamp}`;
      const backupPath = path.join(this.config.storage.path!, backupName);

      // Ensure backup directory exists
      await fs.mkdir(this.config.storage.path!, { recursive: true });

      // Get MongoDB connection string
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
      const dbName = new URL(mongoUri).pathname.substring(1);

      // Create MongoDB dump
      const dumpCommand = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;
      await execAsync(dumpCommand);

      // Compress if enabled
      let finalPath = backupPath;
      if (this.config.compression) {
        const compressedPath = `${backupPath}.tar.gz`;
        await execAsync(`tar -czf "${compressedPath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`);
        await fs.rm(backupPath, { recursive: true, force: true });
        finalPath = compressedPath;
      }

      // Get file size
      const stats = await fs.stat(finalPath);
      const size = stats.size;

      // Upload to cloud storage if configured
      if (this.config.storage.type !== 'local') {
        await this.uploadToCloudStorage(finalPath);
      }

      logger.info(`Database backup created successfully: ${finalPath} (${size} bytes)`);

      return {
        success: true,
        timestamp: new Date(),
        size,
        path: finalPath
      };

    } catch (error) {
      logger.error('Database backup failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        size: 0,
        path: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async createRedisBackup(): Promise<BackupResult> {
    try {
      if (!this.config.enabled) {
        throw new Error('Backup service is disabled');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `halobuzz-redis-backup-${timestamp}.rdb`;
      const backupPath = path.join(this.config.storage.path!, backupName);

      // Ensure backup directory exists
      await fs.mkdir(this.config.storage.path!, { recursive: true });

      // Trigger Redis BGSAVE
      const redisClient = getRedisClient();
      await redisClient.bgSave();

      // Wait for background save to complete
      await this.waitForRedisSave();

      // Copy the RDB file
      const redisDataDir = process.env.REDIS_DATA_DIR || '/var/lib/redis';
      const rdbFile = path.join(redisDataDir, 'dump.rdb');
      
      await fs.copyFile(rdbFile, backupPath);

      // Compress if enabled
      let finalPath = backupPath;
      if (this.config.compression) {
        const compressedPath = `${backupPath}.gz`;
        await execAsync(`gzip "${backupPath}"`);
        finalPath = compressedPath;
      }

      // Get file size
      const stats = await fs.stat(finalPath);
      const size = stats.size;

      // Upload to cloud storage if configured
      if (this.config.storage.type !== 'local') {
        await this.uploadToCloudStorage(finalPath);
      }

      logger.info(`Redis backup created successfully: ${finalPath} (${size} bytes)`);

      return {
        success: true,
        timestamp: new Date(),
        size,
        path: finalPath
      };

    } catch (error) {
      logger.error('Redis backup failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        size: 0,
        path: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async createFullBackup(): Promise<{
    database: BackupResult;
    redis: BackupResult;
    config: BackupResult;
  }> {
    logger.info('Starting full system backup...');

    const [databaseBackup, redisBackup, configBackup] = await Promise.all([
      this.createDatabaseBackup(),
      this.createRedisBackup(),
      this.createConfigBackup()
    ]);

    logger.info('Full system backup completed', {
      database: databaseBackup.success,
      redis: redisBackup.success,
      config: configBackup.success
    });

    return {
      database: databaseBackup,
      redis: redisBackup,
      config: configBackup
    };
  }

  private async createConfigBackup(): Promise<BackupResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `halobuzz-config-backup-${timestamp}.json`;
      const backupPath = path.join(this.config.storage.path!, backupName);

      // Collect configuration data
      const configData = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version,
        features: {
          backup: this.config,
          monitoring: {
            enabled: process.env.MONITORING_ENABLED === 'true'
          },
          security: {
            rateLimiting: process.env.RATE_LIMITING_ENABLED !== 'false',
            cors: process.env.CORS_ORIGIN?.split(',') || []
          }
        }
      };

      await fs.writeFile(backupPath, JSON.stringify(configData, null, 2));

      const stats = await fs.stat(backupPath);
      const size = stats.size;

      return {
        success: true,
        timestamp: new Date(),
        size,
        path: backupPath
      };

    } catch (error) {
      logger.error('Config backup failed:', error);
      return {
        success: false,
        timestamp: new Date(),
        size: 0,
        path: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async waitForRedisSave(): Promise<void> {
    const redisClient = getRedisClient();
    const lastSave = await redisClient.lastSave();
    
    // Wait up to 30 seconds for background save to complete
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentSave = await redisClient.lastSave();
      if (currentSave > lastSave) {
        return;
      }
    }
    
    throw new Error('Redis background save timeout');
  }

  private async uploadToCloudStorage(filePath: string): Promise<void> {
    // Implementation would depend on the storage type
    // This is a placeholder for S3/GCS upload logic
    logger.info(`Uploading ${filePath} to ${this.config.storage.type} storage`);
  }

  public async cleanupOldBackups(): Promise<void> {
    try {
      const backupDir = this.config.storage.path!;
      const files = await fs.readdir(backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retention);

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info(`Deleted old backup: ${file}`);
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old backups:', error);
    }
  }

  public async restoreDatabase(backupPath: string): Promise<boolean> {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
      const dbName = new URL(mongoUri).pathname.substring(1);

      // Extract if compressed
      let restorePath = backupPath;
      if (backupPath.endsWith('.tar.gz')) {
        const extractPath = backupPath.replace('.tar.gz', '');
        await execAsync(`tar -xzf "${backupPath}" -C "${path.dirname(backupPath)}"`);
        restorePath = extractPath;
      }

      // Restore MongoDB dump
      const restoreCommand = `mongorestore --uri="${mongoUri}" --drop "${restorePath}"`;
      await execAsync(restoreCommand);

      logger.info(`Database restored successfully from: ${backupPath}`);
      return true;

    } catch (error) {
      logger.error('Database restore failed:', error);
      return false;
    }
  }

  public getConfig(): BackupConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const backupService = BackupService.getInstance();
