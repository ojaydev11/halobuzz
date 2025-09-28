import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/';
import { logger } from './logger';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineManager {
  private isOnline: boolean = true;
  private offlineQueue: OfflineAction[] = [];
  private syncInProgress: boolean = false;
  private cachePrefix = 'halobuzz_cache_';
  private queueKey = 'halobuzz_offline_queue';

  constructor() {
    this.initializeNetworkMonitoring();
    this.loadOfflineQueue();
  }

  private async initializeNetworkMonitoring() {
    // Subscribe to network state changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      logger.info('Network state changed:', {
        isOnline: this.isOnline,
        wasOffline
      });

      // If we just came back online, sync queued actions
      if (wasOffline && this.isOnline) {
        this.syncOfflineActions();
      }
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
  }

  private async loadOfflineQueue() {
    try {
      const queueData = await AsyncStorage.getItem(this.queueKey);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
        logger.info('Loaded offline queue:', { count: this.offlineQueue.length });
      }
    } catch (error) {
      logger.error('Failed to load offline queue:', error);
    }
  }

  private async saveOfflineQueue() {
    try {
      await AsyncStorage.setItem(this.queueKey, JSON.stringify(this.offlineQueue));
    } catch (error) {
      logger.error('Failed to save offline queue:', error);
    }
  }

  // Cache management
  async setCache(key: string, data: any, ttl: number = 300000): Promise<void> {
    try {
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now(),
        ttl
      };

      await AsyncStorage.setItem(
        `${this.cachePrefix}${key}`,
        JSON.stringify(cacheEntry)
      );

      logger.debug('Data cached:', { key, ttl });
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async getCache(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cachePrefix}${key}`);
      if (!cached) return null;

      const cacheEntry: CacheEntry = JSON.parse(cached);
      const isExpired = Date.now() - cacheEntry.timestamp > cacheEntry.ttl;

      if (isExpired) {
        await this.clearCache(key);
        return null;
      }

      logger.debug('Cache hit:', { key });
      return cacheEntry.data;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async clearCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.cachePrefix}${key}`);
      logger.debug('Cache cleared:', { key });
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
      logger.info('All cache cleared:', { count: cacheKeys.length });
    } catch (error) {
      logger.error('Clear all cache error:', error);
    }
  }

  // Offline queue management
  async queueAction(
    type: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any
  ): Promise<string> {
    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      endpoint,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.offlineQueue.push(action);
    await this.saveOfflineQueue();

    logger.info('Action queued for offline sync:', {
      type,
      endpoint,
      method,
      queueSize: this.offlineQueue.length
    });

    return action.id;
  }

  async removeQueuedAction(actionId: string): Promise<void> {
    this.offlineQueue = this.offlineQueue.filter(action => action.id !== actionId);
    await this.saveOfflineQueue();
  }

  async syncOfflineActions(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    logger.info('Starting offline sync:', { count: this.offlineQueue.length });

    const { apiClient } = await import('./api');
    const successfulActions: string[] = [];

    for (const action of this.offlineQueue) {
      try {
        const maxRetries = 3;
        if (action.retryCount >= maxRetries) {
          logger.warn('Action exceeded max retries:', action);
          successfulActions.push(action.id);
          continue;
        }

        // Execute the queued action
        let response;
        switch (action.method) {
          case 'GET':
            response = await apiClient.get(action.endpoint);
            break;
          case 'POST':
            response = await apiClient.post(action.endpoint, action.data);
            break;
          case 'PUT':
            response = await apiClient.put(action.endpoint, action.data);
            break;
          case 'DELETE':
            response = await apiClient.delete(action.endpoint);
            break;
        }

        if (response?.success) {
          successfulActions.push(action.id);
          logger.info('Offline action synced successfully:', action);
        } else {
          action.retryCount++;
          logger.warn('Offline action failed, will retry:', action);
        }

      } catch (error) {
        action.retryCount++;
        logger.error('Offline sync error for action:', { action, error });

        // Remove actions that have exceeded retry limit
        if (action.retryCount >= 3) {
          successfulActions.push(action.id);
        }
      }
    }

    // Remove successfully synced actions
    for (const actionId of successfulActions) {
      await this.removeQueuedAction(actionId);
    }

    await this.saveOfflineQueue();
    this.syncInProgress = false;

    logger.info('Offline sync completed:', {
      synced: successfulActions.length,
      remaining: this.offlineQueue.length
    });
  }

  // Smart caching strategies
  async cacheReelsData(reels: any[]): Promise<void> {
    await this.setCache('reels_feed', reels, 600000); // 10 minutes

    // Cache individual reels for faster access
    for (const reel of reels) {
      await this.setCache(`reel_${reel.id}`, reel, 3600000); // 1 hour
    }
  }

  async getCachedReels(): Promise<any[] | null> {
    return await this.getCache('reels_feed');
  }

  async cacheUserProfile(userId: string, profile: any): Promise<void> {
    await this.setCache(`profile_${userId}`, profile, 1800000); // 30 minutes
  }

  async getCachedUserProfile(userId: string): Promise<any | null> {
    return await this.getCache(`profile_${userId}`);
  }

  async cacheStreamData(streams: any[]): Promise<void> {
    await this.setCache('streams_list', streams, 60000); // 1 minute (frequent updates)
  }

  async getCachedStreams(): Promise<any[] | null> {
    return await this.getCache('streams_list');
  }

  // Predictive caching
  async prefetchUserContent(userId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      const { apiClient } = await import('./api');

      // Prefetch user profile
      const profileResponse = await apiClient.getUserProfile(userId);
      if (profileResponse.success) {
        await this.cacheUserProfile(userId, profileResponse.data);
      }

      // Prefetch user's recent reels
      const reelsResponse = await apiClient.get(`/users/${userId}/reels`);
      if (reelsResponse.success) {
        await this.setCache(`user_reels_${userId}`, reelsResponse.data, 1800000);
      }

      logger.info('Prefetched content for user:', userId);
    } catch (error) {
      logger.error('Prefetch error:', error);
    }
  }

  // Network-aware operations
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  async getNetworkInfo(): Promise<any> {
    return await NetInfo.fetch();
  }

  // Cleanup expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);
        if (cached) {
          const cacheEntry: CacheEntry = JSON.parse(cached);
          const isExpired = Date.now() - cacheEntry.timestamp > cacheEntry.ttl;

          if (isExpired) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      logger.info('Cache cleanup completed');
    } catch (error) {
      logger.error('Cache cleanup error:', error);
    }
  }

  // Background sync scheduling
  async scheduleBackgroundSync(): Promise<void> {
    // Schedule cleanup every 6 hours
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 21600000); // 6 hours

    // Attempt sync every 5 minutes when online
    setInterval(() => {
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.syncOfflineActions();
      }
    }, 300000); // 5 minutes
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

// Utility functions for common operations
export const withOfflineSupport = async <T>(
  operation: () => Promise<T>,
  cacheKey: string,
  cacheTTL: number = 300000
): Promise<T> => {
  try {
    // Try online operation first
    if (offlineManager.isNetworkOnline()) {
      const result = await operation();
      // Cache successful result
      await offlineManager.setCache(cacheKey, result, cacheTTL);
      return result;
    }
  } catch (error) {
    logger.warn('Online operation failed, trying cache:', error);
  }

  // Fallback to cache
  const cached = await offlineManager.getCache(cacheKey);
  if (cached) {
    logger.info('Using cached data:', { cacheKey });
    return cached;
  }

  throw new Error('No data available offline');
};

export default offlineManager;