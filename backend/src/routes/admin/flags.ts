import express from 'express';
import { body, validationResult } from 'express-validator';
import { featureFlags } from '@/config/flags';
import { logger } from '@/config/logger';
import { requireCSRF } from '@/middleware/admin';

const router: express.Router = express.Router();

// Get all feature flags
router.get('/', async (req, res) => {
  try {
    const flags = await featureFlags.getAllFlags();
    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    logger.error('Failed to get feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags'
    });
  }
});

// Update a specific feature flag
router.put('/:key', [
  requireCSRF,
  body('value').isBoolean(),
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { key } = req.params;
    const { value, reason } = req.body;
    const modifiedBy = req.user?.userId || 'unknown';

    await featureFlags.setFlag(key, value, modifiedBy);

    logger.info(`Feature flag ${key} updated to ${value} by ${modifiedBy}`, {
      reason,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      message: `Feature flag ${key} updated to ${value}`
    });
  } catch (error) {
    logger.error('Failed to update feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag'
    });
  }
});

// Update multiple feature flags
router.put('/', [
  requireCSRF,
  body('flags').isArray(),
  body('flags.*.key').isString(),
  body('flags.*.value').isBoolean(),
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { flags, reason } = req.body;
    const modifiedBy = req.user?.userId || 'unknown';

    const results = [];
    for (const flag of flags) {
      try {
        await featureFlags.setFlag(flag.key, flag.value, modifiedBy);
        results.push({ key: flag.key, success: true });
      } catch (error) {
        results.push({ key: flag.key, success: false, error: error.message });
      }
    }

    logger.info(`Multiple feature flags updated by ${modifiedBy}`, {
      flags: flags.map(f => ({ key: f.key, value: f.value })),
      reason,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: results,
      message: 'Feature flags updated'
    });
  } catch (error) {
    logger.error('Failed to update feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flags'
    });
  }
});

// Emergency disable all features
router.post('/emergency/disable-all', [
  requireCSRF,
  body('reason').isString().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { reason } = req.body;
    const modifiedBy = req.user?.userId || 'unknown';

    await featureFlags.emergencyDisableAll(reason, modifiedBy);

    logger.warn(`EMERGENCY DISABLE ALL executed by ${modifiedBy}`, {
      reason,
      requestId: req.headers['x-request-id'],
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Emergency disable all executed successfully'
    });
  } catch (error) {
    logger.error('Failed to execute emergency disable all:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute emergency disable all'
    });
  }
});

// Refresh feature flags cache
router.post('/refresh-cache', [
  requireCSRF
], async (req, res) => {
  try {
    await featureFlags.refreshCache();

    logger.info(`Feature flags cache refreshed by ${req.user?.userId}`, {
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      message: 'Feature flags cache refreshed'
    });
  } catch (error) {
    logger.error('Failed to refresh feature flags cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache'
    });
  }
});

// Get feature flag audit log
router.get('/audit/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // In a real implementation, this would query an audit log collection
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      data: {
        key,
        changes: [
          {
            timestamp: new Date().toISOString(),
            modifiedBy: 'system',
            oldValue: false,
            newValue: true,
            reason: 'Initial setup'
          }
        ]
      }
    });
  } catch (error) {
    logger.error('Failed to get feature flag audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit log'
    });
  }
});

export default router;