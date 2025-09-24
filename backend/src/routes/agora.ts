import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import agoraService from '../services/AgoraService';

const router = express.Router();

// Enhanced Agora token generation with global optimization
router.post('/token', [
  body('channelName')
    .notEmpty()
    .withMessage('Channel name is required')
    .isLength({ min: 1, max: 64 })
    .withMessage('Channel name must be 1-64 characters'),
  body('role')
    .optional()
    .isIn(['publisher', 'subscriber'])
    .withMessage('Role must be publisher or subscriber'),
  body('region')
    .optional()
    .isString()
    .withMessage('Region must be a string')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { channelName, role = 'publisher', region } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Use enhanced Agora service
    const result = await agoraService.generateToken(channelName, userId, role, region);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`Enhanced Agora token generated for channel: ${channelName}, user: ${userId}, region: ${result.region}`);

    res.json({
      success: true,
      data: {
        token: result.token,
        channelName,
        uid: result.uid,
        expiresAt: result.expiresAt,
        region: result.region,
        quality: result.quality,
        agoraAppId: process.env.AGORA_APP_ID
      }
    });

  } catch (error) {
    logger.error('Enhanced Agora token generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Agora token'
    });
  }
});

// Enhanced Agora token refresh with caching
router.post('/refresh', [
  body('channelName')
    .notEmpty()
    .withMessage('Channel name is required'),
  body('role')
    .optional()
    .isIn(['publisher', 'subscriber'])
    .withMessage('Role must be publisher or subscriber')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { channelName, role = 'publisher' } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Use enhanced Agora service for refresh
    const result = await agoraService.refreshToken(channelName, userId, role);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`Enhanced Agora token refreshed for channel: ${channelName}, user: ${userId}, region: ${result.region}`);

    res.json({
      success: true,
      data: {
        token: result.token,
        channelName,
        uid: result.uid,
        expiresAt: result.expiresAt,
        region: result.region,
        quality: result.quality,
        agoraAppId: process.env.AGORA_APP_ID
      }
    });

  } catch (error) {
    logger.error('Enhanced Agora token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh Agora token'
    });
  }
});

// Get channel metrics for monitoring
router.get('/metrics/:channelName', async (req: AuthenticatedRequest, res) => {
  try {
    const { channelName } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const metrics = await agoraService.getChannelMetrics(channelName);

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Error getting channel metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get channel metrics'
    });
  }
});

// Update channel metrics
router.post('/metrics/:channelName', [
  body('viewerCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Viewer count must be a non-negative integer'),
  body('publisherCount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Publisher count must be a non-negative integer'),
  body('bandwidth')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bandwidth must be a non-negative integer'),
  body('latency')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Latency must be a non-negative integer')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { channelName } = req.params;
    const { viewerCount, publisherCount, bandwidth, latency } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    await agoraService.updateChannelMetrics(channelName, {
      viewerCount,
      publisherCount,
      bandwidth,
      latency
    });

    res.json({
      success: true,
      message: 'Channel metrics updated successfully'
    });

  } catch (error) {
    logger.error('Error updating channel metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update channel metrics'
    });
  }
});

// Get all active channels
router.get('/channels', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const channels = await agoraService.getActiveChannels();

    res.json({
      success: true,
      data: channels
    });

  } catch (error) {
    logger.error('Error getting active channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active channels'
    });
  }
});

// Get region statistics
router.get('/regions', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const regionStats = await agoraService.getRegionStats();

    res.json({
      success: true,
      data: regionStats
    });

  } catch (error) {
    logger.error('Error getting region stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get region statistics'
    });
  }
});

export default router;
