/**
 * Observability Routes
 * Provides monitoring, metrics, and health check endpoints
 */

import express, { Request, Response } from 'express';
import { 
  metricsEndpoint, 
  healthCheckEndpoint, 
  performanceMetricsEndpoint,
  observabilityService 
} from '../middleware/observability';
import { requireAdmin } from '../middleware/enhancedAdminRBAC';
import { adminLimiter } from '../middleware/enhancedRateLimiting';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', metricsEndpoint);

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', healthCheckEndpoint);

/**
 * GET /healthz
 * Kubernetes health check endpoint
 */
router.get('/healthz', healthCheckEndpoint);

/**
 * GET /performance
 * Performance metrics endpoint
 */
router.get('/performance', performanceMetricsEndpoint);

/**
 * GET /admin/metrics
 * Admin metrics dashboard
 */
router.get('/admin/metrics', [
  requireAdmin,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const metrics = await observabilityService.getMetrics();
    const health = await observabilityService.getHealthStatus();
    const performance = await observabilityService.getPerformanceMetrics();

    res.json({
      success: true,
      data: {
        metrics: metrics,
        health,
        performance
      }
    });

  } catch (error) {
    logger.error('Admin metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin metrics'
    });
  }
});

/**
 * POST /admin/metrics/business
 * Track business metrics
 */
router.post('/admin/metrics/business', [
  requireAdmin,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const { metricType, category, value = 1 } = req.body;

    if (!metricType || !category) {
      return res.status(400).json({
        success: false,
        error: 'Metric type and category are required'
      });
    }

    observabilityService.trackBusinessMetric(metricType, category, value);

    res.json({
      success: true,
      message: 'Business metric tracked successfully'
    });

  } catch (error) {
    logger.error('Business metrics tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track business metric'
    });
  }
});

/**
 * GET /admin/logs
 * Get application logs
 */
router.get('/admin/logs', [
  requireAdmin,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const { level = 'info', limit = 100, offset = 0 } = req.query;

    // In production, integrate with log aggregation service
    // For now, return placeholder
    res.json({
      success: true,
      data: {
        logs: [],
        total: 0,
        level,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error) {
    logger.error('Logs retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

/**
 * GET /admin/alerts
 * Get active alerts
 */
router.get('/admin/alerts', [
  requireAdmin,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    // In production, integrate with alerting system
    // For now, return placeholder
    res.json({
      success: true,
      data: {
        alerts: [],
        total: 0
      }
    });

  } catch (error) {
    logger.error('Alerts retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts'
    });
  }
});

export default router;
