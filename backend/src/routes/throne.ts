import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { Throne } from '../models/Throne';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { reputationService } from '../services/ReputationService';
import { logger } from '../config/logger';

const router = express.Router();

// Claim throne
router.post('/:streamId/claim', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { streamId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate stream
    const stream = await LiveStream.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found'
      });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: 'Stream is not live'
      });
    }

    // Check if user is the stream host
    if (stream.hostId.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: 'Stream host cannot claim throne'
      });
    }

    // Check if throne already exists for this stream
    const existingThrone = await Throne.findOne({ streamId, isActive: true, expiresAt: { $gt: new Date() } });
    if (existingThrone) {
      return res.status(400).json({
        success: false,
        error: 'Throne already claimed for this stream'
      });
    }

    // Calculate throne requirements (e.g., minimum coins spent)
    const minCoinsRequired = 1000; // Minimum coins to claim throne
    const userGiftsInStream = await calculateUserGiftsInStream(userId, streamId);

    if (userGiftsInStream < minCoinsRequired) {
      return res.status(400).json({
        success: false,
        error: `Minimum ${minCoinsRequired} coins required to claim throne (current: ${userGiftsInStream})`
      });
    }

    // Create throne
    const throne = new Throne({
      streamId,
      userId,
      username: user.username,
      avatar: user.avatar,
      ogLevel: user.ogLevel,
      totalGifts: 0,
      totalCoins: userGiftsInStream,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isActive: true
    });

    await throne.save();

    // Apply reputation bonus for claiming throne
    await reputationService.applyReputationDelta(userId, 'throne_claimed', {
      coins: userGiftsInStream,
      streamId: stream._id
    });

    res.json({
      success: true,
      message: 'Throne claimed successfully',
      data: {
        throne: {
          id: throne._id,
          streamId: throne.streamId,
          userId: throne.userId,
          username: throne.username,
          avatar: throne.avatar,
          ogLevel: throne.ogLevel,
          totalCoins: throne.totalCoins,
          expiresAt: throne.expiresAt,
          isActive: throne.isActive
        }
      }
    });

  } catch (error) {
    logger.error('Claim throne failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim throne'
    });
  }
});

// Get active throne for stream
router.get('/:streamId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { streamId } = req.params;

    const throne = await Throne.findOne({ streamId, isActive: true, expiresAt: { $gt: new Date() } });

    if (!throne) {
      return res.status(404).json({
        success: false,
        error: 'No active throne found for this stream'
      });
    }

    res.json({
      success: true,
      data: {
        throne: {
          id: throne._id,
          streamId: throne.streamId,
          userId: throne.userId,
          username: throne.username,
          avatar: throne.avatar,
          ogLevel: throne.ogLevel,
          totalGifts: throne.totalGifts,
          totalCoins: throne.totalCoins,
          expiresAt: throne.expiresAt,
          isActive: throne.isActive,
          metadata: throne.metadata
        }
      }
    });

  } catch (error) {
    logger.error('Get throne failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get throne'
    });
  }
});

// Get user's throne history
router.get('/user/:userId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const thrones = await Throne.find({ userId }).sort({ createdAt: -1 }).limit(parseInt(limit as string));
    const total = await Throne.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        thrones: thrones.map(throne => ({
          id: throne._id,
          streamId: throne.streamId,
          streamTitle: (throne.streamId as any)?.title,
          totalGifts: throne.totalGifts,
          totalCoins: throne.totalCoins,
          expiresAt: throne.expiresAt,
          claimedAt: throne.claimedAt,
          isActive: throne.isActive,
          metadata: throne.metadata
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get user throne history failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get throne history'
    });
  }
});

// Get top thrones
router.get('/top', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const thrones = await Throne.find({ isActive: false }).sort({ totalCoins: -1, totalGifts: -1 }).limit(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        thrones: thrones.map(throne => ({
          id: throne._id,
          streamId: throne.streamId,
          streamTitle: (throne.streamId as any)?.title,
          userId: throne.userId,
          username: throne.username,
          avatar: throne.avatar,
          ogLevel: throne.ogLevel,
          totalGifts: throne.totalGifts,
          totalCoins: throne.totalCoins,
          claimedAt: throne.claimedAt,
          metadata: throne.metadata
        }))
      }
    });

  } catch (error) {
    logger.error('Get top thrones failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top thrones'
    });
  }
});

// Add gift to throne
router.post('/:throneId/gift', [
  body('giftId')
    .isMongoId()
    .withMessage('Valid gift ID is required'),
  body('coins')
    .isInt({ min: 1 })
    .withMessage('Valid coin amount is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { throneId } = req.params;
    const { giftId, coins } = req.body;

    const throne = await Throne.findById(throneId);
    if (!throne) {
      return res.status(404).json({
        success: false,
        error: 'Throne not found'
      });
    }

    if (!throne.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Throne is not active'
      });
    }

    // Add gift to throne
    (throne as any).addGift(coins, giftId);
    await throne.save();

    res.json({
      success: true,
      message: 'Gift added to throne',
      data: {
        throne: {
          id: throne._id,
          totalGifts: throne.totalGifts,
          totalCoins: throne.totalCoins,
          metadata: throne.metadata
        }
      }
    });

  } catch (error) {
    logger.error('Add gift to throne failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add gift to throne'
    });
  }
});

// Helper function to calculate user's gifts in a stream
async function calculateUserGiftsInStream(userId: string, streamId: string): Promise<number> {
  try {
    const { Transaction } = await import('../models/Transaction');
    
    const result = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          'metadata.streamId': streamId,
          type: 'gift_sent',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCoins: { $sum: '$amount' }
        }
      }
    ]);

    return result[0]?.totalCoins || 0;
  } catch (error) {
    logger.error('Calculate user gifts in stream failed:', error);
    return 0;
  }
}

export default router;
