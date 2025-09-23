import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Generate Agora token for live streaming
router.post('/token', [
  body('channelName')
    .notEmpty()
    .withMessage('Channel name is required')
    .isLength({ min: 1, max: 64 })
    .withMessage('Channel name must be 1-64 characters'),
  body('uid')
    .optional()
    .isInt({ min: 1 })
    .withMessage('UID must be a positive integer')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { channelName, uid } = req.body;
    const userId = req.user?.userId;

    // Validate environment variables
    const agoraAppId = process.env.AGORA_APP_ID;
    const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!agoraAppId || !agoraAppCertificate) {
      logger.error('Agora configuration missing');
      return res.status(500).json({
        success: false,
        error: 'Agora service not configured'
      });
    }

    // Generate Agora token
    const { AgoraToken } = await import('agora-access-token') as any;
    const agoraToken = new AgoraToken(agoraAppId, agoraAppCertificate);

    // Set token expiration (24 hours from now)
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 24 * 3600;
    
    // Use provided UID or generate one based on user ID
    const tokenUid = uid || (userId ? parseInt(userId.toString().slice(-8), 16) : Math.floor(Math.random() * 1000000));
    
    // Set role (PUBLISHER for stream hosts, SUBSCRIBER for viewers)
    const role = AgoraToken.Role.PUBLISHER;

    // Build token
    const token = agoraToken.buildTokenWithUid(channelName, tokenUid, role, privilegeExpiredTs);

    logger.info(`Agora token generated for channel: ${channelName}, user: ${userId}`);

    res.json({
      success: true,
      data: {
        token,
        channelName,
        uid: tokenUid,
        expiresAt: privilegeExpiredTs,
        agoraAppId
      }
    });

  } catch (error) {
    logger.error('Agora token generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Agora token'
    });
  }
});

// Refresh Agora token
router.post('/refresh', [
  body('channelName')
    .notEmpty()
    .withMessage('Channel name is required'),
  body('uid')
    .optional()
    .isInt({ min: 1 })
    .withMessage('UID must be a positive integer')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { channelName, uid } = req.body;
    const userId = req.user?.userId;

    // Validate environment variables
    const agoraAppId = process.env.AGORA_APP_ID;
    const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!agoraAppId || !agoraAppCertificate) {
      logger.error('Agora configuration missing');
      return res.status(500).json({
        success: false,
        error: 'Agora service not configured'
      });
    }

    // Generate new Agora token
    const { AgoraToken } = await import('agora-access-token') as any;
    const agoraToken = new AgoraToken(agoraAppId, agoraAppCertificate);

    // Set token expiration (24 hours from now)
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 24 * 3600;
    
    // Use provided UID or generate one based on user ID
    const tokenUid = uid || (userId ? parseInt(userId.toString().slice(-8), 16) : Math.floor(Math.random() * 1000000));
    
    // Set role (PUBLISHER for stream hosts, SUBSCRIBER for viewers)
    const role = AgoraToken.Role.PUBLISHER;

    // Build token
    const token = agoraToken.buildTokenWithUid(channelName, tokenUid, role, privilegeExpiredTs);

    logger.info(`Agora token refreshed for channel: ${channelName}, user: ${userId}`);

    res.json({
      success: true,
      data: {
        token,
        channelName,
        uid: tokenUid,
        expiresAt: privilegeExpiredTs,
        agoraAppId
      }
    });

  } catch (error) {
    logger.error('Agora token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh Agora token'
    });
  }
});

export default router;
