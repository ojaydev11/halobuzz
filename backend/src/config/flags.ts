import { logger } from './logger';
import { connectDatabase } from './database';
import mongoose from 'mongoose';

// Feature flags schema
const flagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Boolean, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  lastModified: { type: Date, default: Date.now },
  modifiedBy: { type: String, default: 'system' }
});

const FeatureFlag = mongoose.model('FeatureFlag', flagSchema);

// Default feature flags
const DEFAULT_FLAGS = {
  // Core features
  gamesEnabledGlobal: {
    value: true,
    description: 'Enable games globally',
    category: 'core'
  },
  giftsEnabled: {
    value: true,
    description: 'Enable gift sending',
    category: 'core'
  },
  battleBoostEnabled: {
    value: true,
    description: 'Enable battle boost feature',
    category: 'core'
  },
  festivalMode: {
    value: false,
    description: 'Enable festival mode',
    category: 'events'
  },
  
  // Moderation and safety
  aiModerationStrict: {
    value: true,
    description: 'Use strict AI moderation',
    category: 'safety'
  },
  ageVerificationRequired: {
    value: true,
    description: 'Require age verification for restricted features',
    category: 'safety'
  },
  kycRequiredForHosts: {
    value: true,
    description: 'Require KYC verification for live streaming',
    category: 'safety'
  },
  
  // Registration and access
  newRegistrationPause: {
    value: false,
    description: 'Pause new user registrations',
    category: 'access'
  },
  maintenanceMode: {
    value: false,
    description: 'Enable maintenance mode',
    category: 'system'
  },
  
  // Payment and financial
  paymentsEnabled: {
    value: true,
    description: 'Enable payment processing',
    category: 'payments'
  },
  highSpenderControls: {
    value: true,
    description: 'Enable high spender protection controls',
    category: 'payments'
  },
  fraudDetectionEnabled: {
    value: true,
    description: 'Enable payment fraud detection',
    category: 'payments'
  },
  
  // Regional compliance
  nepalComplianceMode: {
    value: true,
    description: 'Enable Nepal-specific compliance features',
    category: 'compliance'
  },
  globalAgeGate: {
    value: true,
    description: 'Enable global 18+ age gate',
    category: 'compliance'
  }
};

class FeatureFlagsService {
  private cache: Map<string, boolean> = new Map();
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute

  async initializeFlags(): Promise<void> {
    try {
      // Ensure database is connected
      if (mongoose.connection.readyState !== 1) {
        await connectDatabase();
      }

      // Initialize default flags if they don't exist
      for (const [key, config] of Object.entries(DEFAULT_FLAGS)) {
        await FeatureFlag.findOneAndUpdate(
          { key },
          {
            key,
            value: config.value,
            description: config.description,
            category: config.category
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      logger.info('Feature flags initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize feature flags:', error);
      throw error;
    }
  }

  async getFlag(key: string): Promise<boolean> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.has(key)) {
        return this.cache.get(key)!;
      }

      // Fetch from database
      const flag = await FeatureFlag.findOne({ key });
      const value = flag ? flag.value : this.getDefaultValue(key);
      
      this.cache.set(key, value);
      this.lastCacheUpdate = Date.now();
      
      return value;
    } catch (error) {
      logger.error(`Failed to get feature flag ${key}:`, error);
      return this.getDefaultValue(key);
    }
  }

  async setFlag(key: string, value: boolean, modifiedBy: string = 'system'): Promise<void> {
    try {
      await FeatureFlag.findOneAndUpdate(
        { key },
        { 
          value, 
          lastModified: new Date(),
          modifiedBy
        },
        { upsert: false }
      );

      // Update cache
      this.cache.set(key, value);
      this.lastCacheUpdate = Date.now();

      logger.info(`Feature flag ${key} updated to ${value} by ${modifiedBy}`);
    } catch (error) {
      logger.error(`Failed to set feature flag ${key}:`, error);
      throw error;
    }
  }

  async getAllFlags(): Promise<any[]> {
    try {
      const flags = await FeatureFlag.find({}).sort({ category: 1, key: 1 });
      return flags;
    } catch (error) {
      logger.error('Failed to get all feature flags:', error);
      return [];
    }
  }

  async refreshCache(): Promise<void> {
    try {
      const flags = await FeatureFlag.find({});
      this.cache.clear();
      
      for (const flag of flags) {
        this.cache.set(flag.key, flag.value);
      }
      
      this.lastCacheUpdate = Date.now();
      logger.info('Feature flags cache refreshed');
    } catch (error) {
      logger.error('Failed to refresh feature flags cache:', error);
    }
  }

  private isCacheValid(): boolean {
    return Date.now() - this.lastCacheUpdate < this.CACHE_TTL;
  }

  private getDefaultValue(key: string): boolean {
    const defaultFlag = DEFAULT_FLAGS[key as keyof typeof DEFAULT_FLAGS];
    return defaultFlag ? defaultFlag.value : false;
  }

  // Convenience methods for common flags
  async isGamesEnabled(): Promise<boolean> {
    return this.getFlag('gamesEnabledGlobal');
  }

  async isMaintenanceMode(): Promise<boolean> {
    return this.getFlag('maintenanceMode');
  }

  async isRegistrationPaused(): Promise<boolean> {
    return this.getFlag('newRegistrationPause');
  }

  async isPaymentsEnabled(): Promise<boolean> {
    return this.getFlag('paymentsEnabled');
  }

  async isHighSpenderControlsEnabled(): Promise<boolean> {
    return this.getFlag('highSpenderControls');
  }

  async isAgeVerificationRequired(): Promise<boolean> {
    return this.getFlag('ageVerificationRequired');
  }

  async isKycRequiredForHosts(): Promise<boolean> {
    return this.getFlag('kycRequiredForHosts');
  }

  async isBattleBoostEnabled(): Promise<boolean> {
    return this.getFlag('battleBoostEnabled');
  }
}

export const featureFlags = new FeatureFlagsService();
export { FeatureFlag };
