import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: {
    userTier?: number[];
    countries?: string[];
    appVersion?: string;
  };
}

interface FeatureFlags {
  [key: string]: FeatureFlag;
}

class FeatureFlagService {
  private flags: FeatureFlags = {};
  private lastFetch: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  async checkFeatureFlags() {
    try {
      // Check if we need to fetch fresh flags
      const now = Date.now();
      if (now - this.lastFetch > this.cacheDuration) {
        await this.fetchFeatureFlags();
      }

      // Load cached flags if fetch failed
      if (Object.keys(this.flags).length === 0) {
        await this.loadCachedFlags();
      }

      console.log('Feature flags loaded:', this.flags);
    } catch (error) {
      console.error('Failed to check feature flags:', error);
      await this.loadCachedFlags();
    }
  }

  private async fetchFeatureFlags() {
    try {
      const response = await axios.get('http://localhost:3001/api/config/feature-flags');
      this.flags = response.data;
      this.lastFetch = Date.now();
      
      // Cache the flags
      await this.cacheFlags();
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
      throw error;
    }
  }

  private async cacheFlags() {
    try {
      await AsyncStorage.setItem('feature_flags', JSON.stringify({
        flags: this.flags,
        timestamp: this.lastFetch
      }));
    } catch (error) {
      console.error('Failed to cache feature flags:', error);
    }
  }

  private async loadCachedFlags() {
    try {
      const cached = await AsyncStorage.getItem('feature_flags');
      if (cached) {
        const data = JSON.parse(cached);
        this.flags = data.flags;
        this.lastFetch = data.timestamp;
      }
    } catch (error) {
      console.error('Failed to load cached feature flags:', error);
    }
  }

  isFeatureEnabled(featureName: string, context?: {
    userTier?: number;
    country?: string;
    appVersion?: string;
  }): boolean {
    const flag = this.flags[featureName];
    
    if (!flag) {
      return false; // Feature not found, disabled by default
    }

    if (!flag.enabled) {
      return false; // Feature explicitly disabled
    }

    // Check conditions
    if (flag.conditions) {
      if (flag.conditions.userTier && context?.userTier) {
        if (!flag.conditions.userTier.includes(context.userTier)) {
          return false;
        }
      }

      if (flag.conditions.countries && context?.country) {
        if (!flag.conditions.countries.includes(context.country)) {
          return false;
        }
      }

      if (flag.conditions.appVersion && context?.appVersion) {
        // Simple version comparison - can be enhanced
        if (context.appVersion !== flag.conditions.appVersion) {
          return false;
        }
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const random = Math.random() * 100;
      if (random > flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  getFeatureValue(featureName: string, defaultValue: any = null, context?: {
    userTier?: number;
    country?: string;
    appVersion?: string;
  }): any {
    if (this.isFeatureEnabled(featureName, context)) {
      const flag = this.flags[featureName];
      return flag?.value || defaultValue;
    }
    return defaultValue;
  }

  getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  async refreshFlags() {
    this.lastFetch = 0; // Force refresh
    await this.checkFeatureFlags();
  }

  // Predefined feature checks
  isLiveStreamingEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('live_streaming', context);
  }

  isReelsEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('reels', context);
  }

  isGamingEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('gaming', context);
  }

  isOGStoreEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('og_store', context);
  }

  isBattleSystemEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('battle_system', context);
  }

  isGiftSystemEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('gift_system', context);
  }

  isLiteModeEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('lite_mode', context);
  }

  isAnonymousModeEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('anonymous_mode', context);
  }

  isCountryFilterEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('country_filter', context);
  }

  isAgeGateEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('age_gate', context);
  }

  // Payment gateway features
  isEsewaEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('payment_esewa', context);
  }

  isKhaltiEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('payment_khalti', context);
  }

  isStripeEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('payment_stripe', context);
  }

  // Content moderation features
  isContentModerationEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('content_moderation', context);
  }

  isBlurOverlayEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('blur_overlay', context);
  }

  isWarningBannerEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('warning_banner', context);
  }

  // Social features
  isDirectMessagingEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('direct_messaging', context);
  }

  isThreeMessageRuleEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('three_message_rule', context);
  }

  isUnsendEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('unsend_messages', context);
  }

  // Analytics and tracking
  isAnalyticsEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('analytics', context);
  }

  isCrashReportingEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('crash_reporting', context);
  }

  // Performance features
  isOfflineQueueEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('offline_queue', context);
  }

  isPreloadEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('preload_content', context);
  }

  // Debug features
  isDebugModeEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('debug_mode', context);
  }

  isTestModeEnabled(context?: { userTier?: number; country?: string }): boolean {
    return this.isFeatureEnabled('test_mode', context);
  }
}

export const featureFlagService = new FeatureFlagService();

export const checkFeatureFlags = async () => {
  await featureFlagService.checkFeatureFlags();
};
