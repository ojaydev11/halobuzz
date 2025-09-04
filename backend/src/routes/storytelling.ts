import { Router, Request, Response } from 'express';
import { InteractiveStorytellingService } from '@/services/storytelling/InteractiveStorytellingService';
import { authenticateToken } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();
const storytellingService = InteractiveStorytellingService.getInstance();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(socialLimiter);

/**
 * @route POST /api/v1/storytelling/story
 * @desc Create a new interactive story
 */
router.post('/story', async (req: Request, res: Response) => {
  try {
    const { title, description, genre, settings } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!title || !description || !genre) {
      return res.status(400).json({ error: 'Title, description, and genre are required' });
    }

    const story = await storytellingService.createStory(
      userId,
      title,
      description,
      genre,
      settings
    );

    res.status(201).json({
      success: true,
      data: story
    });
  } catch (error) {
    logger.error('Error creating interactive story', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create story' });
  }
});

/**
 * @route POST /api/v1/storytelling/:storyId/chapter
 * @desc Add a chapter to the story
 */
router.post('/:storyId/chapter', async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const { title, content, mediaUrl, timeLimit } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const chapter = await storytellingService.addChapter(
      storyId,
      userId,
      title,
      content,
      mediaUrl,
      timeLimit
    );

    res.status(201).json({
      success: true,
      data: chapter
    });
  } catch (error) {
    logger.error('Error adding chapter', { error, storyId: req.params.storyId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to add chapter' });
  }
});

/**
 * @route POST /api/v1/storytelling/:storyId/chapter/:chapterId/choice
 * @desc Add a choice to a chapter
 */
router.post('/:storyId/chapter/:chapterId/choice', async (req: Request, res: Response) => {
  try {
    const { storyId, chapterId } = req.params;
    const { text, consequence, nextChapterId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!text || !consequence) {
      return res.status(400).json({ error: 'Text and consequence are required' });
    }

    const choice = await storytellingService.addChoice(
      storyId,
      chapterId,
      userId,
      text,
      consequence,
      nextChapterId
    );

    res.status(201).json({
      success: true,
      data: choice
    });
  } catch (error) {
    logger.error('Error adding choice', { error, storyId: req.params.storyId, chapterId: req.params.chapterId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to add choice' });
  }
});

/**
 * @route POST /api/v1/storytelling/:storyId/chapter/:chapterId/vote
 * @desc Vote on a choice or user content
 */
router.post('/:storyId/chapter/:chapterId/vote', async (req: Request, res: Response) => {
  try {
    const { storyId, chapterId } = req.params;
    const { choiceId, contentId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!choiceId && !contentId) {
      return res.status(400).json({ error: 'Either choiceId or contentId is required' });
    }

    await storytellingService.vote(storyId, chapterId, userId, choiceId, contentId);

    res.status(200).json({
      success: true,
      message: 'Vote cast successfully'
    });
  } catch (error) {
    logger.error('Error casting vote', { error, storyId: req.params.storyId, chapterId: req.params.chapterId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

/**
 * @route POST /api/v1/storytelling/:storyId/chapter/:chapterId/content
 * @desc Submit user-generated content
 */
router.post('/:storyId/chapter/:chapterId/content', async (req: Request, res: Response) => {
  try {
    const { storyId, chapterId } = req.params;
    const { type, content, mediaUrl } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!type || !content) {
      return res.status(400).json({ error: 'Type and content are required' });
    }

    const userContent = await storytellingService.submitUserContent(
      storyId,
      chapterId,
      userId,
      type,
      content,
      mediaUrl
    );

    res.status(201).json({
      success: true,
      data: userContent
    });
  } catch (error) {
    logger.error('Error submitting user content', { error, storyId: req.params.storyId, chapterId: req.params.chapterId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to submit user content' });
  }
});

/**
 * @route POST /api/v1/storytelling/:storyId/progress
 * @desc Progress to next chapter
 */
router.post('/:storyId/progress', async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const nextChapter = await storytellingService.progressToNextChapter(storyId, userId);

    res.status(200).json({
      success: true,
      data: nextChapter
    });
  } catch (error) {
    logger.error('Error progressing to next chapter', { error, storyId: req.params.storyId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to progress to next chapter' });
  }
});

/**
 * @route GET /api/v1/storytelling/:storyId
 * @desc Get story with current chapter
 */
router.get('/:storyId', async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const story = await storytellingService.getStory(storyId);

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.status(200).json({
      success: true,
      data: story
    });
  } catch (error) {
    logger.error('Error getting story', { error, storyId: req.params.storyId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get story' });
  }
});

/**
 * @route GET /api/v1/storytelling/:storyId/progress
 * @desc Get user's story progress
 */
router.get('/:storyId/progress', async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const progress = await storytellingService.getUserProgress(userId, storyId);

    res.status(200).json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error getting user progress', { error, storyId: req.params.storyId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get user progress' });
  }
});

/**
 * @route GET /api/v1/storytelling/:storyId/analytics
 * @desc Get story analytics
 */
router.get('/:storyId/analytics', async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const analytics = await storytellingService.getStoryAnalytics(storyId);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting story analytics', { error, storyId: req.params.storyId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get story analytics' });
  }
});

/**
 * @route GET /api/v1/storytelling/trending
 * @desc Get trending stories
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const stories = await storytellingService.getTrendingStories(
      limit ? parseInt(limit as string) : 10
    );

    res.status(200).json({
      success: true,
      data: stories
    });
  } catch (error) {
    logger.error('Error getting trending stories', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get trending stories' });
  }
});

export default router;
