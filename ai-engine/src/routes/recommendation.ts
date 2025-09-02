import express from 'express';
import { authenticateAIEngine } from '../middleware/auth';
import { validateServiceJWT, sanitizeAIInput } from '../middleware/security';
import HyperPersonalizationEngine from '../services/recommendation/RecommendationEngine';
import logger from '../utils/logger';

const router = express.Router();
const recommendationEngine = HyperPersonalizationEngine.getInstance();

// Apply security middleware
router.use(authenticateAIEngine);
router.use(validateServiceJWT);
router.use(sanitizeAIInput);

/**
 * @route POST /api/ai/recommendation/score-content
 * @desc Score content for a specific user
 * @access Internal AI Engine
 */
router.post('/score-content', async (req, res) => {
  try {
    const { userId, contentId } = req.body;

    if (!userId || !contentId) {
      return res.status(400).json({
        success: false,
        error: 'userId and contentId are required'
      });
    }

    const score = await recommendationEngine.scoreContent(userId, contentId);

    logger.info('Content scored successfully', {
      userId,
      contentId,
      score,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        userId,
        contentId,
        score,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error scoring content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to score content'
    });
  }
});

/**
 * @route POST /api/ai/recommendation/personalized-feed
 * @desc Get personalized content feed for user
 * @access Internal AI Engine
 */
router.post('/personalized-feed', async (req, res) => {
  try {
    const { userId, limit = 20, contentType, mood, culturalBridge } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const feed = await recommendationEngine.getPersonalizedFeed(userId, limit);

    logger.info('Personalized feed generated', {
      userId,
      limit,
      contentType,
      mood,
      culturalBridge,
      contentCount: feed.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        userId,
        content: feed,
        count: feed.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating personalized feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personalized feed'
    });
  }
});

/**
 * @route POST /api/ai/recommendation/mood-based
 * @desc Get mood-based content recommendations
 * @access Internal AI Engine
 */
router.post('/mood-based', async (req, res) => {
  try {
    const { userId, detectedMood } = req.body;

    if (!userId || !detectedMood) {
      return res.status(400).json({
        success: false,
        error: 'userId and detectedMood are required'
      });
    }

    const recommendations = await recommendationEngine.getMoodBasedRecommendations(userId, detectedMood);

    logger.info('Mood-based recommendations generated', {
      userId,
      detectedMood,
      recommendationCount: recommendations.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        userId,
        mood: detectedMood,
        recommendations,
        count: recommendations.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating mood-based recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mood-based recommendations'
    });
  }
});

/**
 * @route POST /api/ai/recommendation/cultural-bridge
 * @desc Get cross-cultural content recommendations
 * @access Internal AI Engine
 */
router.post('/cultural-bridge', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const bridgeContent = await recommendationEngine.getCulturalBridgeContent(userId);

    logger.info('Cultural bridge content generated', {
      userId,
      contentCount: bridgeContent.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        userId,
        bridgeContent,
        count: bridgeContent.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating cultural bridge content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate cultural bridge content'
    });
  }
});

/**
 * @route POST /api/ai/recommendation/update-profile
 * @desc Update user personalization profile
 * @access Internal AI Engine
 */
router.post('/update-profile', async (req, res) => {
  try {
    const { userId, interactionData } = req.body;

    if (!userId || !interactionData) {
      return res.status(400).json({
        success: false,
        error: 'userId and interactionData are required'
      });
    }

    await recommendationEngine.updateUserProfile(userId, interactionData);

    logger.info('User profile updated', {
      userId,
      interactionType: interactionData.type || 'unknown',
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        userId,
        updated: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

/**
 * @route GET /api/ai/recommendation/health
 * @desc Health check for recommendation service
 * @access Internal AI Engine
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'recommendation-engine',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    logger.error('Recommendation service health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Service unhealthy'
    });
  }
});

export default router;
