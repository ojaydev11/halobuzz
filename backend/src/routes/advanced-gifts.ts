import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { advancedGiftEconomy } from '../services/AdvancedGiftEconomyService';
import { logger } from '../config/logger';

const router = express.Router();

// Get available gift packages
router.get('/packages', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const packages = await advancedGiftEconomy.getAvailableGiftPackages(userId);

    res.json({
      success: true,
      data: packages
    });
  } catch (error) {
    logger.error('Error getting gift packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gift packages'
    });
  }
});

// Send advanced gift
router.post('/send', authMiddleware, async (req: any, res) => {
  try {
    const senderId = req.user.userId;
    const { recipientId, giftId, multiplier, message } = req.body;

    const result = await advancedGiftEconomy.sendAdvancedGift(
      senderId,
      recipientId,
      giftId,
      multiplier,
      message
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error sending advanced gift:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send gift'
    });
  }
});

// Get gift history
router.get('/history', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { type, limit = 50, offset = 0 } = req.query;

    const history = await advancedGiftEconomy.getGiftHistory(
      userId,
      {
        type: type as 'sent' | 'received' | undefined,
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error getting gift history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gift history'
    });
  }
});

// Get gift analytics
router.get('/analytics', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const analytics = await advancedGiftEconomy.getGiftAnalytics(userId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting gift analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

// Get trending gifts
router.get('/trending', authMiddleware, async (req: any, res) => {
  try {
    const trending = await advancedGiftEconomy.getTrendingGifts();

    res.json({
      success: true,
      data: trending
    });
  } catch (error) {
    logger.error('Error getting trending gifts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending gifts'
    });
  }
});

// Calculate gift value with multipliers
router.post('/calculate', authMiddleware, async (req: any, res) => {
  try {
    const { giftId, multiplier, recipientId, senderId } = req.body;

    const calculation = await advancedGiftEconomy.calculateGiftValue(
      giftId,
      multiplier,
      recipientId,
      senderId
    );

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    logger.error('Error calculating gift value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate gift value'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req: any, res) => {
  try {
    const { category, timeframe = 'weekly' } = req.query;
    const leaderboard = await advancedGiftEconomy.getGiftLeaderboard(
      timeframe as 'daily' | 'weekly' | 'monthly' | 'alltime',
      category as 'sent' | 'received' | undefined
    );

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error getting gift leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Process gift combo
router.post('/combo', authMiddleware, async (req: any, res) => {
  try {
    const senderId = req.user.userId;
    const { gifts, recipientId } = req.body;

    const result = await advancedGiftEconomy.processGiftCombo(
      senderId,
      recipientId,
      gifts
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing gift combo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process combo'
    });
  }
});

// Get gift recommendations
router.get('/recommendations', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { recipientId, budget, occasion } = req.query;

    const recommendations = await advancedGiftEconomy.getGiftRecommendations(
      userId,
      {
        recipientId: recipientId as string | undefined,
        budget: budget ? Number(budget) : undefined,
        occasion: occasion as string | undefined
      }
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting gift recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

export default router;