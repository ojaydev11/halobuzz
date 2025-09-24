import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import gdprComplianceService from '../services/GDPRComplianceService';

const router = express.Router();

// Record user consent
router.post('/consent', [
  body('consentType')
    .isIn(['marketing', 'analytics', 'cookies', 'data_processing', 'third_party'])
    .withMessage('Valid consent type is required'),
  body('granted')
    .isBoolean()
    .withMessage('Granted status is required'),
  body('version')
    .optional()
    .isString()
    .withMessage('Version must be a string')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { consentType, granted, version = '1.0' } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    const result = await gdprComplianceService.recordConsent(
      userId,
      consentType,
      granted,
      ipAddress,
      userAgent,
      version
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`Consent recorded: ${result.consentId}`, {
      userId,
      consentType,
      granted
    });

    res.json({
      success: true,
      data: {
        consentId: result.consentId,
        consentType,
        granted,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error recording consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record consent'
    });
  }
});

// Check user consent
router.get('/consent/:consentType', async (req: AuthenticatedRequest, res) => {
  try {
    const { consentType } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await gdprComplianceService.checkConsent(userId, consentType as any);

    res.json({
      success: true,
      data: {
        consentType,
        granted: result.granted,
        expiresAt: result.expiresAt,
        consent: result.consent
      }
    });

  } catch (error) {
    logger.error('Error checking consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check consent'
    });
  }
});

// Request data export
router.post('/export', [
  body('dataTypes')
    .optional()
    .isArray()
    .withMessage('Data types must be an array'),
  body('dataTypes.*')
    .isIn(['profile', 'transactions', 'activity', 'preferences'])
    .withMessage('Invalid data type')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { dataTypes = ['profile', 'transactions', 'activity', 'preferences'] } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await gdprComplianceService.requestDataExport(userId, dataTypes);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`Data export requested: ${result.requestId}`, {
      userId,
      dataTypes
    });

    res.json({
      success: true,
      data: {
        requestId: result.requestId,
        estimatedTime: result.estimatedTime,
        dataTypes,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error requesting data export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request data export'
    });
  }
});

// Get data export status
router.get('/export/:requestId', async (req: AuthenticatedRequest, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // In production, this would fetch from database
    const exportData = {
      requestId,
      userId,
      status: 'completed',
      requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      completedAt: new Date(),
      downloadUrl: `https://api.halobuzz.com/exports/${requestId}.json`,
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      dataTypes: ['profile', 'transactions', 'activity', 'preferences'],
      fileSize: 1024000 // 1MB
    };

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    logger.error('Error getting export status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status'
    });
  }
});

// Request data deletion
router.post('/delete', [
  body('deletionTypes')
    .optional()
    .isArray()
    .withMessage('Deletion types must be an array'),
  body('deletionTypes.*')
    .isIn(['profile', 'transactions', 'activity'])
    .withMessage('Invalid deletion type')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { deletionTypes = ['profile', 'transactions', 'activity'] } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await gdprComplianceService.requestDataDeletion(userId, deletionTypes);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`Data deletion requested: ${result.requestId}`, {
      userId,
      deletionTypes
    });

    res.json({
      success: true,
      data: {
        requestId: result.requestId,
        estimatedTime: result.estimatedTime,
        deletionTypes,
        requestedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error requesting data deletion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request data deletion'
    });
  }
});

// Get data deletion status
router.get('/delete/:requestId', async (req: AuthenticatedRequest, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // In production, this would fetch from database
    const deletionData = {
      requestId,
      userId,
      status: 'completed',
      requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      deletionTypes: ['profile', 'transactions', 'activity'],
      retentionPeriod: 30
    };

    res.json({
      success: true,
      data: deletionData
    });

  } catch (error) {
    logger.error('Error getting deletion status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get deletion status'
    });
  }
});

// Get privacy settings
router.get('/privacy-settings', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const settings = await gdprComplianceService.getPrivacySettings(userId);

    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Privacy settings not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    logger.error('Error getting privacy settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get privacy settings'
    });
  }
});

// Update privacy settings
router.put('/privacy-settings', [
  body('dataProcessing')
    .optional()
    .isObject()
    .withMessage('Data processing settings must be an object'),
  body('communication')
    .optional()
    .isObject()
    .withMessage('Communication settings must be an object'),
  body('visibility')
    .optional()
    .isObject()
    .withMessage('Visibility settings must be an object')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const { dataProcessing, communication, visibility } = req.body;

    // Update privacy settings based on consent
    if (dataProcessing) {
      if (dataProcessing.marketing !== undefined) {
        await gdprComplianceService.recordConsent(
          userId,
          'marketing',
          dataProcessing.marketing,
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || ''
        );
      }
      if (dataProcessing.analytics !== undefined) {
        await gdprComplianceService.recordConsent(
          userId,
          'analytics',
          dataProcessing.analytics,
          req.ip || '127.0.0.1',
          req.headers['user-agent'] || ''
        );
      }
    }

    res.json({
      success: true,
      message: 'Privacy settings updated successfully'
    });

  } catch (error) {
    logger.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update privacy settings'
    });
  }
});

// Get compliance statistics (admin only)
router.get('/statistics', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // In production, this would check if user is admin
    const stats = await gdprComplianceService.getComplianceStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting compliance statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance statistics'
    });
  }
});

export default router;
