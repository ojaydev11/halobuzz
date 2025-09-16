import express from 'express';
import { securityMonitoring } from '@/services/SecurityMonitoringService';
import { logger } from '@/config/logger';
import { adminOnly } from '@/middleware/admin';

const router = express.Router();

// Security dashboard - admin only
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    const stats = securityMonitoring.getSecurityStats();
    const recentEvents = securityMonitoring.getRecentEvents(50);
    const unresolvedAlerts = securityMonitoring.getUnresolvedAlerts();

    res.json({
      success: true,
      data: {
        stats,
        recentEvents,
        unresolvedAlerts
      }
    });
  } catch (error) {
    logger.error('Security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load security dashboard'
    });
  }
});

// Get security events
router.get('/events', adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const events = securityMonitoring.getRecentEvents(limit);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    logger.error('Security events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load security events'
    });
  }
});

// Get security alerts
router.get('/alerts', adminOnly, async (req, res) => {
  try {
    const alerts = securityMonitoring.getUnresolvedAlerts();

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Security alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load security alerts'
    });
  }
});

// Resolve security alert
router.post('/alerts/:alertId/resolve', adminOnly, async (req, res) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user?.userId;

    const resolved = securityMonitoring.resolveAlert(alertId, userId || 'unknown');

    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    logger.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert'
    });
  }
});

// Cleanup old security data
router.post('/cleanup', adminOnly, async (req, res) => {
  try {
    securityMonitoring.cleanup();

    res.json({
      success: true,
      message: 'Security data cleanup completed'
    });
  } catch (error) {
    logger.error('Security cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup security data'
    });
  }
});

export default router;