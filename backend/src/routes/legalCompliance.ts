/**
 * Legal Compliance Routes
 * Provides age verification, GDPR, CCPA, and COPPA compliance endpoints
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  legalComplianceService,
  requireAgeVerification,
  requireAdultContentAccess,
  requireLegalCompliance
} from '../middleware/legalCompliance';
import { authMiddleware } from '../middleware/auth';
import { adminLimiter } from '../middleware/enhancedRateLimiting';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * POST /legal/age/verify
 * Verify user age
 */
router.post('/age/verify', [
  authMiddleware,
  adminLimiter,
  body('declaredAge')
    .isInt({ min: 13, max: 120 })
    .withMessage('Valid age between 13 and 120 is required'),
  body('verificationMethod')
    .isIn(['self_declared', 'document_upload', 'third_party'])
    .withMessage('Valid verification method is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { declaredAge, verificationMethod } = req.body;
    const userId = (req as any).user.userId;

    const result = await legalComplianceService.verifyAge(userId, declaredAge, verificationMethod);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Age verification completed successfully'
    });

  } catch (error) {
    logger.error('Age verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Age verification failed'
    });
  }
});

/**
 * GET /legal/age/status
 * Get age verification status
 */
router.get('/age/status', [
  authMiddleware,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const status = await legalComplianceService.getAgeVerificationStatus(userId);

    res.json({
      success: true,
      data: {
        ageVerification: status,
        meetsRequirements: await legalComplianceService.meetsAgeRequirements(userId),
        canAccessAdultContent: await legalComplianceService.canAccessAdultContent(userId)
      }
    });

  } catch (error) {
    logger.error('Age verification status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Age verification status check failed'
    });
  }
});

/**
 * POST /legal/gdpr/delete
 * Handle GDPR data deletion request
 */
router.post('/gdpr/delete', [
  authMiddleware,
  adminLimiter,
  body('confirmDeletion')
    .equals('true')
    .withMessage('Deletion confirmation is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = (req as any).user.userId;
    const result = await legalComplianceService.handleGDPRDeletion(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Data deletion completed successfully'
    });

  } catch (error) {
    logger.error('GDPR deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'GDPR deletion failed'
    });
  }
});

/**
 * GET /legal/ccpa/access
 * Handle CCPA data access request
 */
router.get('/ccpa/access', [
  authMiddleware,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const result = await legalComplianceService.handleCCPAAccess(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('CCPA access request failed:', error);
    res.status(500).json({
      success: false,
      error: 'CCPA access request failed'
    });
  }
});

/**
 * POST /legal/coppa/consent
 * Handle COPPA parental consent
 */
router.post('/coppa/consent', [
  authMiddleware,
  adminLimiter,
  body('parentalConsent')
    .equals('true')
    .withMessage('Parental consent is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = (req as any).user.userId;
    const { parentalConsent } = req.body;

    const result = await legalComplianceService.handleCOPPACompliance(userId, parentalConsent);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Parental consent recorded successfully'
    });

  } catch (error) {
    logger.error('COPPA consent handling failed:', error);
    res.status(500).json({
      success: false,
      error: 'COPPA consent handling failed'
    });
  }
});

/**
 * GET /legal/config
 * Get legal configuration
 */
router.get('/config', [
  authMiddleware,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const config = legalComplianceService.getLegalConfig();

    res.json({
      success: true,
      data: {
        minimumAge: config.minimumAge,
        requireAgeVerification: config.requireAgeVerification,
        requireParentalConsent: config.requireParentalConsent,
        restrictAdultContent: config.restrictAdultContent,
        enableGDPRCompliance: config.enableGDPRCompliance,
        enableCCPACompliance: config.enableCCPACompliance,
        enableCOPPACompliance: config.enableCOPPACompliance
      }
    });

  } catch (error) {
    logger.error('Legal config retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Legal config retrieval failed'
    });
  }
});

/**
 * GET /legal/privacy-policy
 * Get privacy policy
 */
router.get('/privacy-policy', async (req: Request, res: Response) => {
  try {
    const privacyPolicy = {
      version: '1.0',
      lastUpdated: '2023-12-01',
      sections: [
        {
          title: 'Information We Collect',
          content: 'We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.'
        },
        {
          title: 'How We Use Your Information',
          content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.'
        },
        {
          title: 'Information Sharing',
          content: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.'
        },
        {
          title: 'Data Security',
          content: 'We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.'
        },
        {
          title: 'Your Rights',
          content: 'You have the right to access, update, or delete your personal information. You may also opt out of certain communications from us.'
        }
      ]
    };

    res.json({
      success: true,
      data: privacyPolicy
    });

  } catch (error) {
    logger.error('Privacy policy retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Privacy policy retrieval failed'
    });
  }
});

/**
 * GET /legal/terms-of-service
 * Get terms of service
 */
router.get('/terms-of-service', async (req: Request, res: Response) => {
  try {
    const termsOfService = {
      version: '1.0',
      lastUpdated: '2023-12-01',
      sections: [
        {
          title: 'Acceptance of Terms',
          content: 'By accessing and using HaloBuzz, you accept and agree to be bound by the terms and provision of this agreement.'
        },
        {
          title: 'Use License',
          content: 'Permission is granted to temporarily download one copy of HaloBuzz for personal, non-commercial transitory viewing only.'
        },
        {
          title: 'User Accounts',
          content: 'You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer.'
        },
        {
          title: 'Prohibited Uses',
          content: 'You may not use our service for any unlawful purpose or to solicit others to perform unlawful acts.'
        },
        {
          title: 'Content',
          content: 'Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material.'
        }
      ]
    };

    res.json({
      success: true,
      data: termsOfService
    });

  } catch (error) {
    logger.error('Terms of service retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Terms of service retrieval failed'
    });
  }
});

export default router;
