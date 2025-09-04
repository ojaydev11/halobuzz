import { Router, Request, Response } from 'express';
import { MentalHealthService } from '@/services/wellbeing/MentalHealthService';
import { authenticateToken } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();
const mentalHealthService = MentalHealthService.getInstance();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(socialLimiter);

/**
 * @route POST /api/v1/wellbeing/profile
 * @desc Create or update wellbeing profile
 */
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { mentalHealthScore, stressLevel, wellbeingFactors, privacySettings } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const profile = await mentalHealthService.createWellbeingProfile(userId, {
      mentalHealthScore,
      stressLevel,
      wellbeingFactors,
      privacySettings
    });

    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error creating wellbeing profile', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create wellbeing profile' });
  }
});

/**
 * @route POST /api/v1/wellbeing/check
 * @desc Complete wellbeing check
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { type, responses } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!type || !responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Type and responses are required' });
    }

    const check = await mentalHealthService.completeWellbeingCheck(userId, type, responses);

    res.status(200).json({
      success: true,
      data: check
    });
  } catch (error) {
    logger.error('Error completing wellbeing check', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to complete wellbeing check' });
  }
});

/**
 * @route POST /api/v1/wellbeing/intervention
 * @desc Create wellbeing intervention
 */
router.post('/intervention', async (req: Request, res: Response) => {
  try {
    const { type, title, description, action, priority, expiresAt } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!type || !title || !description || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const intervention = await mentalHealthService.createIntervention(
      userId,
      type,
      title,
      description,
      action,
      priority,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.status(201).json({
      success: true,
      data: intervention
    });
  } catch (error) {
    logger.error('Error creating wellbeing intervention', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create intervention' });
  }
});

/**
 * @route POST /api/v1/wellbeing/screen-time/track
 * @desc Track screen time
 */
router.post('/screen-time/track', async (req: Request, res: Response) => {
  try {
    const { duration, category } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!duration || !category) {
      return res.status(400).json({ error: 'Duration and category are required' });
    }

    await mentalHealthService.trackScreenTime(userId, duration, category);

    res.status(200).json({
      success: true,
      message: 'Screen time tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking screen time', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to track screen time' });
  }
});

/**
 * @route GET /api/v1/wellbeing/analytics
 * @desc Get wellbeing analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const analytics = await mentalHealthService.getWellbeingAnalytics(
      userId,
      (period as string) || 'week'
    );

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting wellbeing analytics', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get wellbeing analytics' });
  }
});

/**
 * @route GET /api/v1/wellbeing/resources
 * @desc Get wellbeing resources
 */
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const { category, difficulty } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const resources = await mentalHealthService.getWellbeingResources(
      category as string,
      difficulty as string
    );

    res.status(200).json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error getting wellbeing resources', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get wellbeing resources' });
  }
});

export default router;
