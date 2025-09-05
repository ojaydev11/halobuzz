import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { ageKycService } from '../services/AgeKycService';
import { setupLogger } from '../config/logger';

const logger = setupLogger();
import { requireAgeVerification } from '../middleware/auth';

const router: express.Router = express.Router();

// Submit KYC documents
router.post('/submit', [
  requireAgeVerification,
  body('idCard').isString().notEmpty().withMessage('ID card image is required'),
  body('selfie').isString().notEmpty().withMessage('Selfie image is required')
], async (req: AuthenticatedRequest, res: Response) => {
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
        error: 'Authentication required'
      });
    }

    const { idCard, selfie } = req.body;
    const result = await ageKycService.submitKycDocuments(userId, { idCard, selfie });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    logger.error('KYC submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit KYC documents'
    });
  }
});

// Get KYC status
router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const kycResult = await ageKycService.verifyKyc(userId);
    const ageResult = await ageKycService.verifyAge(userId);

    res.json({
      success: true,
      data: {
        kyc: {
          status: kycResult.status,
          isVerified: kycResult.isVerified,
          reason: kycResult.reason
        },
        age: {
          age: ageResult.age,
          isAdult: ageResult.isAdult,
          isVerified: ageResult.isVerified,
          reason: ageResult.reason
        }
      }
    });
  } catch (error) {
    logger.error('KYC status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KYC status'
    });
  }
});

// Check access permissions
router.get('/access', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const [liveStreaming, payments, games, restrictedContent] = await Promise.all([
      ageKycService.canAccessLiveStreaming(userId),
      ageKycService.canMakePayments(userId),
      ageKycService.canPlayGames(userId),
      ageKycService.canAccessRestrictedContent(userId)
    ]);

    res.json({
      success: true,
      data: {
        liveStreaming,
        payments,
        games,
        restrictedContent
      }
    });
  } catch (error) {
    logger.error('Access check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check access permissions'
    });
  }
});

// Update date of birth (for age verification)
router.put('/date-of-birth', [
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required')
], async (req: AuthenticatedRequest, res: Response) => {
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
        error: 'Authentication required'
      });
    }

    const { dateOfBirth } = req.body;
    const birthDate = new Date(dateOfBirth);
    
    // Validate age
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;

    if (actualAge < 13) {
      return res.status(400).json({
        success: false,
        error: 'You must be at least 13 years old to use this service'
      });
    }

    if (actualAge > 120) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date of birth'
      });
    }

    // Update user's date of birth
    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(userId, { dateOfBirth: birthDate });

    logger.info('Date of birth updated', {
      userId,
      age: actualAge,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Date of birth updated successfully',
      data: {
        age: actualAge,
        isAdult: actualAge >= 18
      }
    });
  } catch (error) {
    logger.error('Date of birth update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update date of birth'
    });
  }
});

export default router;
