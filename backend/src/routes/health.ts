import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
      api: 'ok'
    },
    uptime: process.uptime()
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      // Test database query
      await mongoose.connection.db.admin().ping();
      health.services.database = 'ok';
    } else {
      health.services.database = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    logger.error('Database health check failed:', error);
    health.services.database = 'error';
    health.status = 'degraded';
  }

  try {
    // Check Redis connection
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.ping();
      health.services.redis = 'ok';
    } else {
      health.services.redis = 'disabled';
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
    health.services.redis = 'error';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Detailed health check with more information
router.get('/health/detailed', async (req: Request, res: Response) => {
  const detailedHealth = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: 'unknown',
        connectionState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        responseTime: 0,
        error: ''
      },
      redis: {
        status: 'unknown',
        connected: false,
        responseTime: 0,
        error: ''
      },
      api: {
        status: 'ok',
        version: process.env.npm_package_version || 'unknown',
        nodeVersion: process.version,
        platform: process.platform
      }
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const responseTime = Date.now() - start;
      
      detailedHealth.services.database.status = 'ok';
      detailedHealth.services.database.responseTime = responseTime;
    } else {
      detailedHealth.services.database.status = 'disconnected';
      detailedHealth.status = 'degraded';
    }
  } catch (error) {
    logger.error('Database detailed health check failed:', error);
    detailedHealth.services.database.status = 'error';
    detailedHealth.services.database.error = error instanceof Error ? error.message : String(error);
    detailedHealth.status = 'degraded';
  }

  try {
    // Check Redis connection
    const redisClient = getRedisClient();
    if (redisClient) {
      const start = Date.now();
      await redisClient.ping();
      const responseTime = Date.now() - start;
      
      detailedHealth.services.redis.status = 'ok';
      detailedHealth.services.redis.connected = true;
      detailedHealth.services.redis.responseTime = responseTime;
    } else {
      detailedHealth.services.redis.status = 'disabled';
    }
  } catch (error) {
    logger.error('Redis detailed health check failed:', error);
    detailedHealth.services.redis.status = 'error';
    detailedHealth.services.redis.error = error instanceof Error ? error.message : String(error);
    detailedHealth.status = 'degraded';
  }

  const statusCode = detailedHealth.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(detailedHealth);
});

export default router;
