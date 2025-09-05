import { createClient, RedisClientType } from 'redis';
import { setupLogger } from './logger';

const logger = setupLogger();

// Check if Redis is enabled
export const isRedisEnabled = !!process.env.REDIS_URL;

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<void> => {
  if (!isRedisEnabled) {
    logger.warn('Redis is disabled - skipping connection');
    return;
  }
  
  const redisUrl = process.env.REDIS_URL!;
  const url = new URL(redisUrl);
  const isSecure = url.protocol === 'rediss:' || url.protocol === 'redis+tls:';
  
  // Extract password from URL if present, otherwise use environment variable
  const password = url.password || process.env.REDIS_PASSWORD || undefined;
  
  logger.info(`Connecting to Redis: ${url.protocol}//${url.hostname}:${url.port || (isSecure ? '6380' : '6379')} (SSL: ${isSecure})`);
  
  try {
    // Create Redis client with proper SSL handling
    const clientConfig: any = {
      password: password,
      socket: {
        connectTimeout: 10000
      }
    };
    
    // Handle SSL/TLS configuration
    if (isSecure) {
      clientConfig.socket.tls = {
        rejectUnauthorized: false,
        servername: url.hostname
      };
    }
    
    // Use URL or individual components
    if (isSecure) {
      clientConfig.socket.host = url.hostname;
      clientConfig.socket.port = parseInt(url.port) || 6380;
      clientConfig.socket.tls = {
        rejectUnauthorized: false,
        servername: url.hostname
      };
    } else {
      clientConfig.url = redisUrl;
    }
    
    redisClient = createClient(clientConfig);

    redisClient.on('error', (error) => {
      logger.error('Redis connection error:', error);
      // Don't throw here, let the application continue without Redis
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
    logger.error('Failed to connect to Redis with SSL:', error);
    
    // If SSL connection failed, try without SSL as fallback
    if (isSecure) {
      try {
        logger.info('Attempting Redis connection without SSL as fallback...');
        const fallbackUrl = redisUrl.replace('rediss://', 'redis://');
        redisClient = createClient({
          url: fallbackUrl,
          password: password,
          socket: {
            connectTimeout: 10000
          }
        });
        
        redisClient.on('error', (err) => {
          logger.error('Redis fallback connection error:', err);
        });
        
        await redisClient.connect();
        logger.info('Redis connected successfully without SSL');
        return;
      } catch (fallbackError) {
        logger.error('Redis fallback connection also failed:', fallbackError);
      }
    }
    
    // If all connection attempts failed
    logger.warn('Continuing without Redis - caching and real-time features will be disabled');
    redisClient = null;
  }
};

export const getRedisClient = (): RedisClientType | null => {
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