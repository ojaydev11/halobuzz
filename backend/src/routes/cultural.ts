import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { CulturalIntelligenceService } from '@/services/cultural/CulturalIntelligenceService';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();
const culturalService = CulturalIntelligenceService.getInstance();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * @route POST /api/v1/cultural/profile
 * @desc Create or update cultural profile
 */
router.post('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { primaryCulture, secondaryCultures, languagePreferences, culturalValues, communicationStyle, contentPreferences } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!primaryCulture) {
      return res.status(400).json({ error: 'Primary culture is required' });
    }

    const profile = await culturalService.createCulturalProfile(userId, {
      primaryCulture,
      secondaryCultures,
      languagePreferences,
      culturalValues,
      communicationStyle,
      contentPreferences
    });

    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error creating cultural profile', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create cultural profile' });
  }
});

/**
 * @route POST /api/v1/cultural/content/analyze
 * @desc Analyze content for cultural adaptation
 */
router.post('/content/analyze', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentId, originalCulture, targetCultures, content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!contentId || !originalCulture || !targetCultures || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const culturalContent = await culturalService.analyzeContentForCulturalAdaptation(
      contentId,
      originalCulture,
      targetCultures,
      content
    );

    res.status(200).json({
      success: true,
      data: culturalContent
    });
  } catch (error) {
    logger.error('Error analyzing content for cultural adaptation', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to analyze content' });
  }
});

/**
 * @route POST /api/v1/cultural/recommendations
 * @desc Generate cultural recommendations
 */
router.post('/recommendations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentType, limit } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!contentType) {
      return res.status(400).json({ error: 'Content type is required' });
    }

    const recommendations = await culturalService.generateCulturalRecommendations(
      userId,
      contentType,
      limit || 10
    );

    res.status(200).json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error generating cultural recommendations', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * @route POST /api/v1/cultural/engagement/track
 * @desc Track cultural engagement
 */
router.post('/engagement/track', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentId, culture, engagement } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!contentId || !culture || !engagement) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await culturalService.trackCulturalEngagement(userId, contentId, culture, engagement);

    res.status(200).json({
      success: true,
      message: 'Cultural engagement tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking cultural engagement', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to track engagement' });
  }
});

/**
 * @route GET /api/v1/cultural/analytics
 * @desc Get cultural analytics
 */
router.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const analytics = await culturalService.getCulturalAnalytics(userId);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting cultural analytics', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get cultural analytics' });
  }
});

/**
 * @route GET /api/v1/cultural/bridges
 * @desc Get cultural bridges
 */
router.get('/bridges', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sourceCulture, targetCulture, bridgeType } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!sourceCulture || !targetCulture) {
      return res.status(400).json({ error: 'Source and target cultures are required' });
    }

    const bridges = await culturalService.getCulturalBridges(
      sourceCulture as string,
      targetCulture as string,
      bridgeType as string
    );

    res.status(200).json({
      success: true,
      data: bridges
    });
  } catch (error) {
    logger.error('Error getting cultural bridges', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get cultural bridges' });
  }
});

export default router;
