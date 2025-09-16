import express from 'express';
import { body, validationResult } from 'express-validator';
import { AIContentGenerationService } from '../services/AIContentGenerationService';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { logger } from '../config/logger';

const router = express.Router();
const aiContentService = new AIContentGenerationService();

// Generate AI video
router.post('/generate-video', [
  authMiddleware,
  rateLimiter({ windowMs: 60000, max: 10 }), // 10 requests per minute
  body('prompt')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Prompt must be 10-500 characters'),
  body('style')
    .optional()
    .isIn(['cinematic', 'documentary', 'animated', 'realistic'])
    .withMessage('Invalid style'),
  body('duration')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Duration must be 5-60 seconds'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { prompt, style, duration } = req.body;
    const creatorId = req.user.id;

    logger.info('AI video generation request', { creatorId, prompt, style, duration });

    const result = await aiContentService.generateVideo({
      prompt,
      contentType: 'video',
      style,
      duration,
      creatorId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('AI video generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI video',
    });
  }
});

// Generate AI thumbnail
router.post('/generate-thumbnail', [
  authMiddleware,
  rateLimiter({ windowMs: 60000, max: 20 }),
  body('videoId')
    .isString()
    .withMessage('Video ID is required'),
  body('prompt')
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Prompt must be 5-200 characters'),
], async (req, res) => {
  try {
    const { videoId, prompt } = req.body;
    const creatorId = req.user.id;

    logger.info('AI thumbnail generation request', { creatorId, videoId, prompt });

    const thumbnailUrl = await aiContentService.generateThumbnail(videoId, prompt);

    res.json({
      success: true,
      data: { thumbnailUrl },
    });
  } catch (error) {
    logger.error('AI thumbnail generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI thumbnail',
    });
  }
});

// Generate AI music
router.post('/generate-music', [
  authMiddleware,
  rateLimiter({ windowMs: 60000, max: 15 }),
  body('prompt')
    .isString()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Prompt must be 5-200 characters'),
  body('style')
    .optional()
    .isIn(['upbeat', 'calm', 'energetic', 'melancholic', 'epic'])
    .withMessage('Invalid music style'),
  body('duration')
    .optional()
    .isInt({ min: 10, max: 300 })
    .withMessage('Duration must be 10-300 seconds'),
], async (req, res) => {
  try {
    const { prompt, style, duration } = req.body;
    const creatorId = req.user.id;

    logger.info('AI music generation request', { creatorId, prompt, style, duration });

    const result = await aiContentService.generateMusic({
      prompt,
      contentType: 'music',
      style,
      duration,
      creatorId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('AI music generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI music',
    });
  }
});

// Generate AI subtitles
router.post('/generate-subtitles', [
  authMiddleware,
  rateLimiter({ windowMs: 60000, max: 5 }),
  body('videoId')
    .isString()
    .withMessage('Video ID is required'),
  body('languages')
    .isArray({ min: 1, max: 10 })
    .withMessage('Languages must be an array with 1-10 items'),
], async (req, res) => {
  try {
    const { videoId, languages } = req.body;
    const creatorId = req.user.id;

    logger.info('AI subtitle generation request', { creatorId, videoId, languages });

    const result = await aiContentService.generateSubtitles(videoId, languages);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('AI subtitle generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI subtitles',
    });
  }
});

// Get AI content generation status
router.get('/status/:contentId', [
  authMiddleware,
], async (req, res) => {
  try {
    const { contentId } = req.params;
    const creatorId = req.user.id;

    // In a real implementation, this would check the actual processing status
    res.json({
      success: true,
      data: {
        contentId,
        status: 'completed',
        progress: 100,
        estimatedTimeRemaining: 0,
      },
    });
  } catch (error) {
    logger.error('Failed to get AI content status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content status',
    });
  }
});

// Get AI content generation history
router.get('/history', [
  authMiddleware,
], async (req, res) => {
  try {
    const creatorId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // In a real implementation, this would fetch from database
    res.json({
      success: true,
      data: {
        content: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get AI content history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content history',
    });
  }
});

export default router;
