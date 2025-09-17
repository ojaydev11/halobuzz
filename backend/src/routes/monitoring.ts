import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth';
import { adminOnly } from '@/middleware/admin';
import { monitoringService } from '@/services/monitoringService';
import { getCacheStats } from '@/config/redis';
import { setupLogger } from '@/config/logger';
import { GameRound } from '@/models/GameRound';
import { GlobalGame } from '@/models/GlobalGame';

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
    // Append payout metrics for games
    const games = await GlobalGame.find({});
    const payoutStats: any[] = [];
    for (const g of games) {
      const rounds = await GameRound.find({ gameId: g.id, status: 'settled' }).sort({ bucketStart: -1 }).limit(200);
      const totals = rounds.reduce((acc, r) => ({ bets: acc.bets + (r.totals?.bets || 0), payouts: acc.payouts + (r.totals?.payouts || 0) }), { bets: 0, payouts: 0 });
      const rate = totals.bets > 0 ? totals.payouts / totals.bets : null;
      payoutStats.push({ gameId: g.id, payoutRateTrailing: rate });
    }
    res.json({ ...metrics, payoutStats });
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
    const limitedMetrics = metrics.slice(-Number(limit));
    
    res.json({
      metrics: limitedMetrics,
      count: limitedMetrics.length,
      total: metrics.length
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
    const metrics = monitoringService.getMetrics();
    const latest = monitoringService.getLatestMetrics();
    
    if (!latest || metrics.length === 0) {
      return res.json({
        status: 'no_data',
        message: 'No performance data available'
      });
    }

    // Calculate averages
    const avgMemory = metrics.reduce((sum, m) => sum + m.memory.percentage, 0) / metrics.length;
    const avgCpu = metrics.reduce((sum, m) => sum + m.cpu.usage, 0) / metrics.length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.api.averageResponseTime, 0) / metrics.length;

    // Calculate trends (comparing first half vs second half)
    const midPoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, midPoint);
    const secondHalf = metrics.slice(midPoint);

    const firstHalfAvgMemory = firstHalf.reduce((sum, m) => sum + m.memory.percentage, 0) / firstHalf.length;
    const secondHalfAvgMemory = secondHalf.reduce((sum, m) => sum + m.memory.percentage, 0) / secondHalf.length;

    const memoryTrend = secondHalfAvgMemory > firstHalfAvgMemory ? 'increasing' : 
                       secondHalfAvgMemory < firstHalfAvgMemory ? 'decreasing' : 'stable';

    res.json({
      current: {
        memory: latest.memory.percentage,
        cpu: latest.cpu.usage,
        responseTime: latest.api.averageResponseTime,
        errorRate: latest.api.errorRate,
        databaseConnections: latest.database.connections
      },
      averages: {
        memory: Math.round(avgMemory * 100) / 100,
        cpu: Math.round(avgCpu * 100) / 100,
        responseTime: Math.round(avgResponseTime * 100) / 100
      },
      trends: {
        memory: memoryTrend
      },
      dataPoints: metrics.length,
      timeRange: {
        start: metrics[0]?.timestamp,
        end: latest.timestamp
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
    const latest = monitoringService.getLatestMetrics();
    
    if (!latest) {
      return res.status(404).json({ error: 'No metrics data available' });
    }

    res.json({
      memory: {
        used: latest.memory.used,
        free: latest.memory.free,
        total: latest.memory.total,
        percentage: latest.memory.percentage,
        unit: 'MB'
      },
      cpu: {
        usage: latest.cpu.usage,
        loadAverage: latest.cpu.loadAverage,
        unit: 'percentage'
      },
      database: {
        connections: latest.database.connections,
        operations: latest.database.operations,
        responseTime: latest.database.responseTime,
        unit: 'ms'
      },
      redis: latest.redis,
      timestamp: latest.timestamp
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

export default router;
