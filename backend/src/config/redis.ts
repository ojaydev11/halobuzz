import Redis from 'redis';
import { setupLogger } from './logger';

const logger = setupLogger();

// Check if Redis is enabled
export const isRedisEnabled = !!process.env.REDIS_URL;

let redisClient: Redis.RedisClientType | null = null;

export const connectRedis = async (): Promise<void> => {
  if (!isRedisEnabled) {
    logger.warn('Redis is disabled - skipping connection');
    return;
  }
  
  try {
    const redisUrl = process.env.REDIS_URL!;
    
    redisClient = Redis.createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 10000,
      },
    });

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis connection ended');
    });

    await redisClient.connect();

  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): Redis.RedisClientType | null => {
  if (!isRedisEnabled) {
    return null;
  }
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
};

// Cache utility functions
export const setCache = async (key: string, value: any, ttl?: number): Promise<void> => {
  const client = getRedisClient();
  if (!client) return;
  
  try {
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await client.setEx(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  } catch (error) {
    logger.error('Error setting cache:', error);
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    
    if (value) {
      return JSON.parse(value) as T;
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting cache:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  const client = getRedisClient();
  if (!client) return;
  
  try {
    await client.del(key);
  } catch (error) {
    logger.error('Error deleting cache:', error);
  }
};

export const clearCache = async (pattern: string): Promise<void> => {
  const client = getRedisClient();
  if (!client) return;
  
  try {
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
  }
};

// Advanced caching utilities for production optimization
export const setCacheWithTags = async (key: string, value: any, tags: string[], ttl?: number): Promise<void> => {
  try {
    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);
    
    // Set the main cache entry
    if (ttl) {
      await client.setEx(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
    
    // Set tag associations for cache invalidation
    for (const tag of tags) {
      await client.sAdd(`tag:${tag}`, key);
      if (ttl) {
        await client.expire(`tag:${tag}`, ttl);
      }
    }
  } catch (error) {
    logger.error('Error setting cache with tags:', error);
  }
};

export const invalidateCacheByTags = async (tags: string[]): Promise<void> => {
  try {
    const client = getRedisClient();
    
    for (const tag of tags) {
      const keys = await client.sMembers(`tag:${tag}`);
      if (keys.length > 0) {
        await client.del(keys);
        await client.del(`tag:${tag}`);
      }
    }
  } catch (error) {
    logger.error('Error invalidating cache by tags:', error);
  }
};

// Cache warming utilities
export const warmCache = async (key: string, fetchFunction: () => Promise<any>, ttl: number = 3600): Promise<any> => {
  try {
    // Try to get from cache first
    let cached = await getCache(key);
    if (cached) {
      return cached;
    }
    
    // If not in cache, fetch and cache
    const data = await fetchFunction();
    await setCache(key, data, ttl);
    return data;
  } catch (error) {
    logger.error('Error warming cache:', error);
    // Fallback to direct fetch
    return await fetchFunction();
  }
};

// Distributed locking for cache consistency
export const acquireLock = async (lockKey: string, ttl: number = 10): Promise<boolean> => {
  try {
    const client = getRedisClient();
    const result = await client.setNX(lockKey, '1');
    if (result) {
      await client.expire(lockKey, ttl);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Error acquiring lock:', error);
    return false;
  }
};

export const releaseLock = async (lockKey: string): Promise<void> => {
  try {
    const client = getRedisClient();
    await client.del(lockKey);
  } catch (error) {
    logger.error('Error releasing lock:', error);
  }
};

// Cache statistics and monitoring
export const getCacheStats = async (): Promise<any> => {
  const client = getRedisClient();
  if (!client) {
    return {
      enabled: false,
      message: 'Redis not configured',
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    const info = await client.info('memory');
    const keyspace = await client.info('keyspace');
    
    return {
      enabled: true,
      memory: info,
      keyspace: keyspace,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    return {
      enabled: true,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
};