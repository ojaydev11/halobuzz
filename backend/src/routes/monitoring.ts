import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { adminOnly } from '@/middleware/admin';
import { monitoringService } from '@/services/monitoringService';
import { getCacheStats } from '@/config/redis';
import { setupLogger } from '@/config/logger';

const router = Router();
const logger = setupLogger();

// All monitoring routes require admin authentication
router.use(authMiddleware);
router.use(adminOnly);

// Get system health status
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = await monitoringService.getHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    logger.error('Error getting health status:', error);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// Get current system metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.collectMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error collecting metrics:', error);
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Get historical metrics
router.get('/metrics/history', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const metrics = monitoringService.getMetrics();
    const limitedMetrics = Array.isArray(metrics) ? metrics.slice(-Number(limit)) : [];
    
    res.json({
      metrics: limitedMetrics,
      count: limitedMetrics.length,
      total: Array.isArray(metrics) ? metrics.length : 0
    });
  } catch (error) {
    logger.error('Error getting metrics history:', error);
    res.status(500).json({ error: 'Failed to get metrics history' });
  }
});

// Get cache statistics
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getCacheStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache statistics' });
  }
});

// Get alert configuration
router.get('/alerts/config', async (req: Request, res: Response) => {
  try {
    const config = monitoringService.getAlertConfig();
    res.json(config);
  } catch (error) {
    logger.error('Error getting alert config:', error);
    res.status(500).json({ error: 'Failed to get alert configuration' });
  }
});

// Update alert configuration
router.put('/alerts/config', async (req: Request, res: Response) => {
  try {
    const { memoryThreshold, cpuThreshold, responseTimeThreshold, errorRateThreshold, connectionThreshold } = req.body;
    
    const config = {
      ...(memoryThreshold !== undefined && { memoryThreshold }),
      ...(cpuThreshold !== undefined && { cpuThreshold }),
      ...(responseTimeThreshold !== undefined && { responseTimeThreshold }),
      ...(errorRateThreshold !== undefined && { errorRateThreshold }),
      ...(connectionThreshold !== undefined && { connectionThreshold })
    };

    monitoringService.updateAlertConfig(config);
    
    logger.info('Alert configuration updated:', config);
    res.json({ message: 'Alert configuration updated successfully', config });
  } catch (error) {
    logger.error('Error updating alert config:', error);
    res.status(500).json({ error: 'Failed to update alert configuration' });
  }
});

// Get system performance summary
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getMetrics() as any;
    const latest = monitoringService.getLatestMetrics() as any;

    if (!latest || !Array.isArray(metrics) || metrics.length === 0) {
      return res.json({
        status: 'no_data',
        message: 'No performance data available'
      });
    }

    // Calculate averages
    const avgMemory = Array.isArray(metrics) ? metrics.reduce((sum: number, m: any) => sum + (m.memory?.percentage || 0), 0) / metrics.length : 0;
    const avgCpu = Array.isArray(metrics) ? metrics.reduce((sum: number, m: any) => sum + (m.cpu?.usage || 0), 0) / metrics.length : 0;
    const avgResponseTime = Array.isArray(metrics) ? metrics.reduce((sum: number, m: any) => sum + (m.api?.averageResponseTime || 0), 0) / metrics.length : 0;

    // Calculate trends (comparing first half vs second half)
    const metricsArray = Array.isArray(metrics) ? metrics : [];
    const midPoint = Math.floor(metricsArray.length / 2);
    const firstHalf = metricsArray.slice(0, midPoint);
    const secondHalf = metricsArray.slice(midPoint);

    const firstHalfAvgMemory = firstHalf.length > 0 ? firstHalf.reduce((sum: number, m: any) => sum + (m.memory?.percentage || 0), 0) / firstHalf.length : 0;
    const secondHalfAvgMemory = secondHalf.length > 0 ? secondHalf.reduce((sum: number, m: any) => sum + (m.memory?.percentage || 0), 0) / secondHalf.length : 0;

    const memoryTrend = secondHalfAvgMemory > firstHalfAvgMemory ? 'increasing' : 
                       secondHalfAvgMemory < firstHalfAvgMemory ? 'decreasing' : 'stable';

    res.json({
      current: {
        memory: latest?.memory?.percentage || 0,
        cpu: latest?.cpu?.usage || 0,
        responseTime: latest?.api?.averageResponseTime || 0,
        errorRate: latest?.api?.errorRate || 0,
        databaseConnections: latest?.database?.connections || 0
      },
      averages: {
        memory: Math.round(avgMemory * 100) / 100,
        cpu: Math.round(avgCpu * 100) / 100,
        responseTime: Math.round(avgResponseTime * 100) / 100
      },
      trends: {
        memory: memoryTrend
      },
      dataPoints: Array.isArray(metrics) ? metrics.length : 0,
      timeRange: {
        start: Array.isArray(metrics) && metrics.length > 0 ? metrics[0]?.timestamp : new Date(),
        end: latest?.timestamp || new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting performance summary:', error);
    res.status(500).json({ error: 'Failed to get performance summary' });
  }
});

// Get system resource usage
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const latest = monitoringService.getLatestMetrics() as any;

    if (!latest) {
      return res.status(404).json({ error: 'No metrics data available' });
    }

    res.json({
      memory: {
        used: latest?.memory?.used || 0,
        free: latest?.memory?.free || 0,
        total: latest?.memory?.total || 0,
        percentage: latest?.memory?.percentage || 0,
        unit: 'MB'
      },
      cpu: {
        usage: latest?.cpu?.usage || 0,
        loadAverage: latest?.cpu?.loadAverage || 0,
        unit: 'percentage'
      },
      database: {
        connections: latest?.database?.connections || 0,
        operations: latest?.database?.operations || 0,
        responseTime: latest?.database?.responseTime || 0,
        unit: 'ms'
      },
      redis: latest?.redis || {},
      timestamp: latest?.timestamp || new Date()
    });
  } catch (error) {
    logger.error('Error getting resource usage:', error);
    res.status(500).json({ error: 'Failed to get resource usage' });
  }
});

// Get system alerts history (mock implementation)
router.get('/alerts/history', async (req: Request, res: Response) => {
  try {
    // This would typically come from a database or log aggregation service
    const mockAlerts = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        severity: 'warning',
        message: 'High memory usage detected',
        resolved: true
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        severity: 'critical',
        message: 'Database connection limit reached',
        resolved: false
      }
    ];

    res.json({
      alerts: mockAlerts,
      count: mockAlerts.length
    });
  } catch (error) {
    logger.error('Error getting alerts history:', error);
    res.status(500).json({ error: 'Failed to get alerts history' });
  }
});

// Get comprehensive system metrics
router.get('/system/metrics', async (req: Request, res: Response) => {
  try {
    const os = require('os');
    const process = require('process');
    
    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = process.memoryUsage();
    
    // CPU usage
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    
    // Uptime
    const uptime = process.uptime();
    
    // Database health
    const db = require('mongoose').connection.db;
    const dbStats = await db.stats();
    const dbPing = await db.admin().ping();
    
    // Redis health (if available)
    let redisStats = null;
    try {
      const { getRedisClient } = await import('@/config/redis');
      const redis = await getRedisClient();
      if (redis) {
        redisStats = {
          connected: redis.isOpen,
          memory: await redis.memory('usage'),
          keys: await redis.dbSize()
        };
      }
    } catch (error) {
      logger.warn('Redis stats unavailable:', error);
    }
    
    // ChangeStream lag (if available)
    let changeStreamLag = null;
    try {
      const { changeStreamService } = await import('@/services/ChangeStreamService');
      const status = changeStreamService.getStatus();
      changeStreamLag = {
        connected: status.connected,
        activeStreams: status.activeStreams,
        monitoredCollections: status.monitoredCollections.length
      };
    } catch (error) {
      logger.warn('ChangeStream stats unavailable:', error);
    }
    
    // Cache hit rate (mock - in production would use Redis stats)
    const cacheHitRate = Math.random() * 0.3 + 0.7; // 70-100% mock
    
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime)
        },
        memory: {
          total: Math.round(totalMemory / 1024 / 1024), // MB
          used: Math.round(usedMemory / 1024 / 1024), // MB
          free: Math.round(freeMemory / 1024 / 1024), // MB
          percentage: Math.round((usedMemory / totalMemory) * 100),
          process: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024) // MB
          }
        },
        cpu: {
          usage: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          loadAverage: {
            '1min': loadAverage[0],
            '5min': loadAverage[1],
            '15min': loadAverage[2]
          },
          cores: os.cpus().length
        },
        platform: {
          type: os.type(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release()
        }
      },
      database: {
        connected: db.readyState === 1,
        ping: dbPing.ok === 1,
        stats: {
          collections: dbStats.collections,
          dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
          indexSize: Math.round(dbStats.indexSize / 1024 / 1024), // MB
          storageSize: Math.round(dbStats.storageSize / 1024 / 1024), // MB
          objects: dbStats.objects
        }
      },
      redis: redisStats,
      changeStream: changeStreamLag,
      cache: {
        hitRate: Math.round(cacheHitRate * 100), // Percentage
        status: 'healthy'
      },
      application: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
        port: process.env.PORT || 3000
      }
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

// Get database health check
router.get('/database/health', async (req: Request, res: Response) => {
  try {
    const db = require('mongoose').connection.db;
    const startTime = Date.now();
    
    // Test database connection
    await db.admin().ping();
    const pingTime = Date.now() - startTime;
    
    // Get database stats
    const stats = await db.stats();
    
    // Check for slow operations
    const currentOps = await db.currentOp();
    const slowOps = currentOps.inprog.filter((op: any) => op.secs_running > 5);
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: {
        state: db.readyState,
        pingTime: pingTime,
        healthy: pingTime < 1000 // Less than 1 second
      },
      performance: {
        collections: stats.collections,
        dataSize: Math.round(stats.dataSize / 1024 / 1024), // MB
        indexSize: Math.round(stats.indexSize / 1024 / 1024), // MB
        slowOperations: slowOps.length,
        currentOperations: currentOps.inprog.length
      },
      warnings: []
    };
    
    // Add warnings for potential issues
    if (pingTime > 1000) {
      health.warnings.push('High database ping time');
    }
    
    if (slowOps.length > 0) {
      health.warnings.push(`${slowOps.length} slow operations detected`);
    }
    
    if (stats.dataSize > 1024 * 1024 * 1024) { // 1GB
      health.warnings.push('Large database size detected');
    }
    
    if (health.warnings.length > 0) {
      health.status = 'warning';
    }
    
    res.json(health);
  } catch (error) {
    logger.error('Error checking database health:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Database health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Redis health check
router.get('/redis/health', async (req: Request, res: Response) => {
  try {
    const { getRedisClient } = await import('@/config/redis');
    const redis = await getRedisClient();
    
    if (!redis) {
      return res.status(503).json({
        status: 'unavailable',
        message: 'Redis client not available'
      });
    }
    
    const startTime = Date.now();
    
    // Test Redis connection
    await redis.ping();
    const pingTime = Date.now() - startTime;
    
    // Get Redis info
    const info = await redis.info('memory');
    const memoryUsage = await redis.memory('usage');
    const keyCount = await redis.dbSize();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: {
        connected: redis.isOpen,
        pingTime: pingTime,
        healthy: pingTime < 100
      },
      memory: {
        usage: memoryUsage,
        info: info
      },
      keys: {
        count: keyCount
      },
      warnings: []
    };
    
    // Add warnings for potential issues
    if (pingTime > 100) {
      health.warnings.push('High Redis ping time');
    }
    
    if (keyCount > 100000) {
      health.warnings.push('Large number of Redis keys');
    }
    
    if (health.warnings.length > 0) {
      health.status = 'warning';
    }
    
    res.json(health);
  } catch (error) {
    logger.error('Error checking Redis health:', error);
    res.status(500).json({
      status: 'error',
      error: 'Redis health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get application metrics
router.get('/application/metrics', async (req: Request, res: Response) => {
  try {
    const { User } = await import('@/models/User');
    const { Gift } = await import('@/models/Gift');
    const { Transaction } = await import('@/models/Transaction');
    const { LiveStream } = await import('@/models/LiveStream');
    const { GameSession } = await import('@/models/GameSession');
    
    // Get counts
    const [
      totalUsers,
      activeUsers,
      totalGifts,
      totalTransactions,
      activeStreams,
      totalGameSessions
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Gift.countDocuments(),
      Transaction.countDocuments(),
      LiveStream.countDocuments({ status: 'live' }),
      GameSession.countDocuments()
    ]);
    
    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [
      recentUsers,
      recentGifts,
      recentTransactions,
      recentGameSessions
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: yesterday } }),
      Gift.countDocuments({ createdAt: { $gte: yesterday } }),
      Transaction.countDocuments({ createdAt: { $gte: yesterday } }),
      GameSession.countDocuments({ createdAt: { $gte: yesterday } })
    ]);
    
    const metrics = {
      timestamp: new Date().toISOString(),
      totals: {
        users: totalUsers,
        activeUsers: activeUsers,
        gifts: totalGifts,
        transactions: totalTransactions,
        activeStreams: activeStreams,
        gameSessions: totalGameSessions
      },
      recent: {
        period: '24h',
        newUsers: recentUsers,
        newGifts: recentGifts,
        newTransactions: recentTransactions,
        newGameSessions: recentGameSessions
      },
      rates: {
        userActivityRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        giftRate: recentGifts,
        transactionRate: recentTransactions,
        gameSessionRate: recentGameSessions
      }
    };
    
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting application metrics:', error);
    res.status(500).json({ error: 'Failed to get application metrics' });
  }
});

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

export default router;
