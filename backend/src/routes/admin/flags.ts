import express from 'express';
import { body, validationResult } from 'express-validator';
import { featureFlags } from '@/config/flags';
import { logger } from '@/config/logger';

const router = express.Router();

// Get all feature flags
router.get('/', async (req, res) => {
  try {
    const flags = await featureFlags.getAllFlags();
    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    logger.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags'
    });
  }
});

// Update a feature flag
router.put('/:key', [
  body('value').isBoolean().withMessage('Value must be a boolean'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { key } = req.params;
    const { value, reason } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username || 'unknown';

    await featureFlags.setFlag(key, value, username);

    // Log the flag change for audit
    logger.info('Feature flag updated', {
      key,
      value,
      reason,
      updatedBy: username,
      userId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Feature flag ${key} updated to ${value}`,
      data: { key, value, updatedBy: username }
    });
  } catch (error) {
    logger.error('Error updating feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag'
    });
  }
});

// Refresh feature flags cache
router.post('/refresh', async (req, res) => {
  try {
    await featureFlags.refreshCache();
    
    logger.info('Feature flags cache refreshed', {
      refreshedBy: req.user?.username || 'unknown',
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Feature flags cache refreshed'
    });
  } catch (error) {
    logger.error('Error refreshing feature flags cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache'
    });
  }
});

// Get specific flag status
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await featureFlags.getFlag(key);
    
    res.json({
      success: true,
      data: { key, value }
    });
  } catch (error) {
    logger.error('Error fetching feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flag'
    });
  }
});

// Emergency kill switch endpoint
router.post('/emergency/disable-all', [
  body('reason').isString().withMessage('Reason is required for emergency action'),
  body('confirmToken').equals('EMERGENCY_DISABLE_ALL').withMessage('Invalid confirmation token')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { reason } = req.body;
    const username = req.user?.username || 'unknown';

    // Disable critical features
    const emergencyFlags = [
      'gamesEnabledGlobal',
      'giftsEnabled',
      'battleBoostEnabled',
      'paymentsEnabled',
      'newRegistrationPause'
    ];

    for (const flag of emergencyFlags) {
      if (flag === 'newRegistrationPause') {
        await featureFlags.setFlag(flag, true, username); // Pause registrations
      } else {
        await featureFlags.setFlag(flag, false, username); // Disable features
      }
    }

    logger.error('EMERGENCY: All critical features disabled', {
      reason,
      disabledBy: username,
      userId: req.user?.id,
      flags: emergencyFlags,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Emergency kill switch activated - all critical features disabled',
      disabledFlags: emergencyFlags
    });
  } catch (error) {
    logger.error('Error executing emergency kill switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute emergency kill switch'
    });
  }
});

// Bulk flag update
router.post('/bulk-update', [
  body('flags').isArray().withMessage('Flags must be an array'),
  body('flags.*.key').isString().withMessage('Flag key must be a string'),
  body('flags.*.value').isBoolean().withMessage('Flag value must be a boolean'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { flags, reason } = req.body;
    const username = req.user?.username || 'unknown';
    const results = [];

    for (const flag of flags) {
      try {
        await featureFlags.setFlag(flag.key, flag.value, username);
        results.push({ key: flag.key, value: flag.value, success: true });
      } catch (error) {
        results.push({ 
          key: flag.key, 
          value: flag.value, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Bulk feature flags update', {
      reason,
      updatedBy: username,
      userId: req.user?.id,
      results,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Bulk flag update completed',
      results
    });
  } catch (error) {
    logger.error('Error in bulk flag update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update flags'
    });
  }
});

export default router;
