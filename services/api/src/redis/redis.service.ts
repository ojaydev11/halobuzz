import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url);
  }

  get redis() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}

