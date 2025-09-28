import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { fortressSecurity } from '../services/FortressSecuritySystem';
import { logger } from '../config/logger';

const router = express.Router();

// Get security dashboard
router.get('/dashboard', authMiddleware, async (req: any, res) => {
  try {
    const dashboard = await fortressSecurity.getSecurityDashboard();

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error getting security dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security dashboard'
    });
  }
});

// Get threat detection status
router.get('/threats', authMiddleware, async (req: any, res) => {
  try {
    const threats = await fortressSecurity.getThreatDetectionStatus();

    res.json({
      success: true,
      data: threats
    });
  } catch (error) {
    logger.error('Error getting threat detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get threat detection'
    });
  }
});

// Get security analytics
router.get('/analytics', authMiddleware, async (req: any, res) => {
  try {
    const analytics = await fortressSecurity.getSecurityAnalytics();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting security analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

// Get fraud detection results
router.get('/fraud', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const fraudDetection = await fortressSecurity.getFraudDetectionResults(userId);

    res.json({
      success: true,
      data: fraudDetection
    });
  } catch (error) {
    logger.error('Error getting fraud detection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get fraud detection'
    });
  }
});

// Report security incident
router.post('/incident', authMiddleware, async (req: any, res) => {
  try {
    const { type, description, severity, metadata } = req.body;
    const reporterId = req.user.userId;

    const result = await fortressSecurity.reportSecurityIncident(
      type,
      description,
      severity,
      reporterId,
      metadata
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error reporting security incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report incident'
    });
  }
});

// Get security alerts
router.get('/alerts', authMiddleware, async (req: any, res) => {
  try {
    const alerts = await fortressSecurity.getSecurityAlerts();

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Error getting security alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

// Update security configuration
router.post('/config', authMiddleware, async (req: any, res) => {
  try {
    const config = req.body;
    const result = await fortressSecurity.updateSecurityConfig(config);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating security config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update config'
    });
  }
});

// Get blocked IPs
router.get('/blocked-ips', authMiddleware, async (req: any, res) => {
  try {
    const blockedIPs = await fortressSecurity.getBlockedIPs();

    res.json({
      success: true,
      data: blockedIPs
    });
  } catch (error) {
    logger.error('Error getting blocked IPs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blocked IPs'
    });
  }
});

// Block IP address
router.post('/block-ip', authMiddleware, async (req: any, res) => {
  try {
    const { ip, reason, duration } = req.body;
    const result = await fortressSecurity.blockIP(ip, reason, duration);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error blocking IP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block IP'
    });
  }
});

// Get security metrics
router.get('/metrics', authMiddleware, async (req: any, res) => {
  try {
    const metrics = await fortressSecurity.getSecurityMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting security metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

export default router;