import Redis from 'redis';
import { logger } from '../config/logger';

export class RedisService {
  private client: Redis.RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      await this.connect();
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      await this.connect();
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.expire(key, ttl);
      return result;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      await this.connect();
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.connect();
      await this.client.hSet(key, field, value);
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      await this.connect();
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      return null;
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      await this.connect();
      return await this.client.lPush(key, values);
    } catch (error) {
      logger.error('Redis LPUSH error:', error);
      return 0;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      await this.connect();
      return await this.client.rPop(key);
    } catch (error) {
      logger.error('Redis RPOP error:', error);
      return null;
    }
  }

  async llen(key: string): Promise<number> {
    try {
      await this.connect();
      return await this.client.lLen(key);
    } catch (error) {
      logger.error('Redis LLEN error:', error);
      return 0;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      await this.connect();
      return await this.client.sAdd(key, members);
    } catch (error) {
      logger.error('Redis SADD error:', error);
      return 0;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      await this.connect();
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS error:', error);
      return [];
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await this.client.sIsMember(key, member);
      return result;
    } catch (error) {
      logger.error('Redis SISMEMBER error:', error);
      return false;
    }
  }

  async publish(channel: string, message: string): Promise<number> {
    try {
      await this.connect();
      return await this.client.publish(channel, message);
    } catch (error) {
      logger.error('Redis PUBLISH error:', error);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      await this.connect();
      await this.client.subscribe(channel, callback);
    } catch (error) {
      logger.error('Redis SUBSCRIBE error:', error);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    try {
      await this.connect();
      await this.client.unsubscribe(channel);
    } catch (error) {
      logger.error('Redis UNSUBSCRIBE error:', error);
    }
  }

  // Additional Redis methods needed by the codebase
  async setex(key: string, ttl: number, value: string): Promise<boolean> {
    try {
      await this.connect();
      await this.client.setEx(key, ttl, value);
      return true;
    } catch (error) {
      logger.error('Redis SETEX error:', error);
      return false;
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    try {
      await this.connect();
      return await this.client.hIncrBy(key, field, increment);
    } catch (error) {
      logger.error('Redis HINCRBY error:', error);
      return 0;
    }
  }

  async hmset(key: string, fields: Record<string, string>): Promise<boolean> {
    try {
      await this.connect();
      await this.client.hSet(key, fields);
      return true;
    } catch (error) {
      logger.error('Redis HMSET error:', error);
      return false;
    }
  }

  async hmget(key: string, fields: string[]): Promise<string[]> {
    try {
      await this.connect();
      return await this.client.hmGet(key, fields);
    } catch (error) {
      logger.error('Redis HMGET error:', error);
      return [];
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      await this.connect();
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      logger.error('Redis ZADD error:', error);
      return 0;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      await this.connect();
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      logger.error('Redis ZRANGE error:', error);
      return [];
    }
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      await this.connect();
      return await this.client.zRevRangeByScore(key, start, stop);
    } catch (error) {
      logger.error('Redis ZREVRANGE error:', error);
      return [];
    }
  }

  async zscore(key: string, member: string): Promise<number | null> {
    try {
      await this.connect();
      return await this.client.zScore(key, member);
    } catch (error) {
      logger.error('Redis ZSCORE error:', error);
      return null;
    }
  }

  async zrem(key: string, members: string[]): Promise<number> {
    try {
      await this.connect();
      return await this.client.zRem(key, members);
    } catch (error) {
      logger.error('Redis ZREM error:', error);
      return 0;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      await this.connect();
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS error:', error);
      return [];
    }
  }

  async flushdb(): Promise<boolean> {
    try {
      await this.connect();
      await this.client.flushDb();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHDB error:', error);
      return false;
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      await this.connect();
      return await this.client.mGet(keys);
    } catch (error) {
      logger.error('Redis MGET error:', error);
      return [];
    }
  }

  async mset(keyValuePairs: Record<string, string>): Promise<boolean> {
    try {
      await this.connect();
      await this.client.mSet(keyValuePairs);
      return true;
    } catch (error) {
      logger.error('Redis MSET error:', error);
      return false;
    }
  }

  getClient(): Redis.RedisClientType {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export default RedisService;
