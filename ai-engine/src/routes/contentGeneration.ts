import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ContentGenerationService, ContentGenerationRequest } from '../services/ContentGenerationService';
import { authenticateAIEngine } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();
const contentGenerationService = ContentGenerationService.getInstance();

/**
 * @route POST /api/ai/content-generation/text-to-video
 * @desc Generate text-to-video content using GPT-4
 * @access Private (AI Engine)
 */
router.post('/text-to-video', 
  authenticateAIEngine,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('duration').optional().isInt({ min: 10, max: 300 }).withMessage('Duration must be between 10-300 seconds'),
    body('style').optional().isString().withMessage('Style must be a string'),
    body('mood').optional().isString().withMessage('Mood must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const request: ContentGenerationRequest = {
        type: 'text-to-video',
        prompt: req.body.prompt,
        userId: req.body.userId,
        streamId: req.body.streamId,
        duration: req.body.duration || 30,
        style: req.body.style,
        mood: req.body.mood
      };

      logger.info('Text-to-video generation request', {
        userId: request.userId,
        prompt: request.prompt,
        duration: request.duration
      });

      const result = await contentGenerationService.generateTextToVideo(request);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            contentId: result.contentId,
            url: result.url,
            metadata: result.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Text-to-video generation endpoint error', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/ai/content-generation/thumbnail
 * @desc Generate AI thumbnail using DALL-E 3
 * @access Private (AI Engine)
 */
router.post('/thumbnail',
  authenticateAIEngine,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('style').optional().isString().withMessage('Style must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const request: ContentGenerationRequest = {
        type: 'thumbnail',
        prompt: req.body.prompt,
        userId: req.body.userId,
        streamId: req.body.streamId,
        style: req.body.style
      };

      logger.info('Thumbnail generation request', {
        userId: request.userId,
        prompt: request.prompt
      });

      const result = await contentGenerationService.generateThumbnail(request);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            contentId: result.contentId,
            url: result.url,
            metadata: result.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Thumbnail generation endpoint error', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/ai/content-generation/background-music
 * @desc Generate background music using MusicLM
 * @access Private (AI Engine)
 */
router.post('/background-music',
  authenticateAIEngine,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('duration').optional().isInt({ min: 10, max: 300 }).withMessage('Duration must be between 10-300 seconds'),
    body('style').optional().isString().withMessage('Style must be a string'),
    body('mood').optional().isString().withMessage('Mood must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const request: ContentGenerationRequest = {
        type: 'background-music',
        prompt: req.body.prompt,
        userId: req.body.userId,
        streamId: req.body.streamId,
        duration: req.body.duration || 30,
        style: req.body.style,
        mood: req.body.mood
      };

      logger.info('Background music generation request', {
        userId: request.userId,
        prompt: request.prompt,
        duration: request.duration
      });

      const result = await contentGenerationService.generateBackgroundMusic(request);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            contentId: result.contentId,
            url: result.url,
            metadata: result.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Background music generation endpoint error', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/ai/content-generation/package
 * @desc Generate complete content package (video + thumbnail + music)
 * @access Private (AI Engine)
 */
router.post('/package',
  authenticateAIEngine,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('duration').optional().isInt({ min: 10, max: 300 }).withMessage('Duration must be between 10-300 seconds'),
    body('style').optional().isString().withMessage('Style must be a string'),
    body('mood').optional().isString().withMessage('Mood must be a string')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const request: ContentGenerationRequest = {
        type: 'text-to-video',
        prompt: req.body.prompt,
        userId: req.body.userId,
        streamId: req.body.streamId,
        duration: req.body.duration || 30,
        style: req.body.style,
        mood: req.body.mood
      };

      logger.info('Content package generation request', {
        userId: request.userId,
        prompt: request.prompt,
        duration: request.duration
      });

      const result = await contentGenerationService.generateContentPackage(request);

      res.status(200).json({
        success: true,
        data: {
          video: result.video,
          thumbnail: result.thumbnail,
          music: result.music
        }
      });

    } catch (error) {
      logger.error('Content package generation endpoint error', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/ai/content-generation/status/:contentId
 * @desc Get generation status for a content ID
 * @access Private (AI Engine)
 */
router.get('/status/:contentId',
  authenticateAIEngine,
  async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;

      // In a real implementation, this would check the status from a database
      // For now, we'll return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          contentId,
          status: 'completed',
          progress: 100,
          estimatedTimeRemaining: 0
        }
      });

    } catch (error) {
      logger.error('Content generation status endpoint error', {
        error: error.message,
        contentId: req.params.contentId
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;
