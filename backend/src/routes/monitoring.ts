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

export default router;
