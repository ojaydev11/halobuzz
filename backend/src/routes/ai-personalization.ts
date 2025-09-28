import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { aiPersonalization } from '../services/AIHyperPersonalizationEngine';
import { logger } from '../config/logger';

const router = express.Router();

// Get personalized content recommendations
router.get('/recommendations', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const recommendations = await aiPersonalization.getPersonalizedRecommendations(userId);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting personalized recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations'
    });
  }
});

// Get personalized user experience
router.get('/experience', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const experience = await aiPersonalization.getPersonalizedExperience(userId);

    res.json({
      success: true,
      data: experience
    });
  } catch (error) {
    logger.error('Error getting personalized experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get experience'
    });
  }
});

// Update user preferences for personalization
router.post('/preferences', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const preferences = req.body;

    const result = await aiPersonalization.updateUserPreferences(userId, preferences);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

// Get user behavior insights
router.get('/insights', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const insights = await aiPersonalization.getUserBehaviorInsights(userId);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error getting user insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get insights'
    });
  }
});

// Record user interaction for learning
router.post('/interaction', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const interaction = req.body;

    await aiPersonalization.recordUserInteraction(userId, interaction);

    res.json({
      success: true,
      message: 'Interaction recorded successfully'
    });
  } catch (error) {
    logger.error('Error recording user interaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record interaction'
    });
  }
});

// Get personalized challenges
router.get('/challenges', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const challenges = await aiPersonalization.getPersonalizedChallenges(userId);

    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    logger.error('Error getting personalized challenges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get challenges'
    });
  }
});

// Get engagement optimization
router.get('/optimization', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const optimization = await aiPersonalization.getEngagementOptimization(userId);

    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    logger.error('Error getting engagement optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization'
    });
  }
});

export default router;