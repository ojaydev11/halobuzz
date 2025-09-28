import * as express from 'express';
import { productionMonitoringService } from '../services/ProductionMonitoringService';
import { authMiddleware } from '../middleware/auth';
import { enhancedAuthMiddleware } from '../middleware/EnhancedAuthMiddleware';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isVerified: boolean;
    isAdmin: boolean;
    ogLevel: number;
    trustScore: number;
    mfaEnabled: boolean;
    lastLoginAt: Date;
  };
}

const router = express.Router();

/**
 * @route GET /monitoring/system-metrics
 * @description Get real-time system metrics
 * @access Private (Admin only)
 */
router.get('/system-metrics', 
  authMiddleware, 
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const metrics = await productionMonitoringService.getSystemMetrics();
      
      logger.info('System metrics retrieved', {
        userId: req.user?.id,
        cpuUsage: metrics.cpu.usage,
        memoryUsage: metrics.memory.percentage,
        diskUsage: metrics.disk.percentage
      });

      res.json({
        success: true,
        metrics
      });
    } catch (error: any) {
      logger.error('System metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system metrics'
      });
    }
  }
);

/**
 * @route GET /monitoring/application-metrics
 * @description Get application metrics
 * @access Private (Admin only)
 */
router.get('/application-metrics',
  authMiddleware,
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const metrics = await productionMonitoringService.getApplicationMetrics();
      
      logger.info('Application metrics retrieved', {
        userId: req.user?.id,
        totalUsers: metrics.users.total,
        activeStreams: metrics.streams.active,
        totalRevenue: metrics.transactions.totalRevenue
      });

      res.json({
        success: true,
        metrics
      });
    } catch (error: any) {
      logger.error('Application metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get application metrics'
      });
    }
  }
);

/**
 * @route GET /monitoring/health-status
 * @description Get health status of all services
 * @access Private (Admin only)
 */
router.get('/health-status',
  authMiddleware,
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const healthChecks = await productionMonitoringService.getHealthStatus();
      
      const overallHealth = healthChecks.every(check => check.status === 'healthy') 
        ? 'healthy' 
        : healthChecks.some(check => check.status === 'unhealthy') 
          ? 'unhealthy' 
          : 'degraded';

      logger.info('Health status retrieved', {
        userId: req.user?.id,
        overallHealth,
        services: healthChecks.length
      });

      res.json({
        success: true,
        overallHealth,
        services: healthChecks
      });
    } catch (error: any) {
      logger.error('Health status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get health status'
      });
    }
  }
);

/**
 * @route GET /monitoring/alerts
 * @description Get active alerts
 * @access Private (Admin only)
 */
router.get('/alerts',
  authMiddleware,
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const alerts = await productionMonitoringService.getActiveAlerts();
      
      logger.info('Active alerts retrieved', {
        userId: req.user?.id,
        alertCount: alerts.length
      });

      res.json({
        success: true,
        alerts
      });
    } catch (error: any) {
      logger.error('Alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get alerts'
      });
    }
  }
);

/**
 * @route POST /monitoring/alerts/resolve
 * @description Resolve an alert
 * @access Private (Admin only)
 */
router.post('/alerts/resolve',
  authMiddleware,
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { alertId } = req.body;

      if (!alertId) {
        return res.status(400).json({
          success: false,
          error: 'Alert ID is required'
        });
      }

      const resolved = await productionMonitoringService.resolveAlert(alertId);
      
      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }

      logger.info('Alert resolved', {
        userId: req.user?.id,
        alertId
      });

      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } catch (error: any) {
      logger.error('Resolve alert error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      });
    }
  }
);

/**
 * @route POST /monitoring/alerts/rules
 * @description Create alert rule
 * @access Private (Super Admin only)
 */
router.post('/alerts/rules',
  authMiddleware,
  enhancedAuthMiddleware.requireSuperAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { name, metric, operator, threshold, severity, enabled, cooldown } = req.body;

      if (!name || !metric || !operator || !threshold || !severity) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, metric, operator, threshold, severity'
        });
      }

      const rule = await productionMonitoringService.createAlertRule({
        name,
        metric,
        operator,
        threshold,
        severity,
        enabled: enabled !== false,
        cooldown: cooldown || 5
      });

      logger.info('Alert rule created', {
        userId: req.user?.id,
        ruleId: rule.id,
        name: rule.name
      });

      res.json({
        success: true,
        rule
      });
    } catch (error: any) {
      logger.error('Create alert rule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create alert rule'
      });
    }
  }
);

/**
 * @route PUT /monitoring/alerts/rules/:ruleId
 * @description Update alert rule
 * @access Private (Super Admin only)
 */
router.put('/alerts/rules/:ruleId',
  authMiddleware,
  enhancedAuthMiddleware.requireSuperAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { ruleId } = req.params;
      const updates = req.body;

      const updated = await productionMonitoringService.updateAlertRule(ruleId, updates);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Alert rule not found'
        });
      }

      logger.info('Alert rule updated', {
        userId: req.user?.id,
        ruleId
      });

      res.json({
        success: true,
        message: 'Alert rule updated successfully'
      });
    } catch (error: any) {
      logger.error('Update alert rule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update alert rule'
      });
    }
  }
);

/**
 * @route GET /monitoring/dashboard
 * @description Get performance dashboard data
 * @access Private (Admin only)
 */
router.get('/dashboard',
  authMiddleware,
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const dashboard = await productionMonitoringService.getPerformanceDashboard();
      
      logger.info('Performance dashboard retrieved', {
        userId: req.user?.id,
        overallHealth: dashboard.summary.overallHealth,
        criticalAlerts: dashboard.summary.criticalAlerts
      });

      res.json({
        success: true,
        dashboard
      });
    } catch (error: any) {
      logger.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }
);

/**
 * @route GET /monitoring/real-time
 * @description Get real-time metrics
 * @access Private (Admin only)
 */
router.get('/real-time',
  authMiddleware,
  enhancedAuthMiddleware.requireAdmin.bind(enhancedAuthMiddleware),
  async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const realTimeMetrics = await productionMonitoringService.getRealTimeMetrics();
      
      logger.info('Real-time metrics retrieved', {
        userId: req.user?.id,
        activeStreams: realTimeMetrics.activeStreams,
        activeUsers: realTimeMetrics.activeUsers
      });

      res.json({
        success: true,
        metrics: realTimeMetrics
      });
    } catch (error: any) {
      logger.error('Real-time metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time metrics'
      });
    }
  }
);

export default router;
