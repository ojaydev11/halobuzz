import express, { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

/**
 * @route POST /api/v1/ai-content-studio/generate-video
 * @desc Generate AI video content for creators
 * @access Private
 */
router.post('/generate-video',
  authMiddleware,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('duration').optional().isInt({ min: 10, max: 300 }).withMessage('Duration must be between 10-300 seconds'),
    body('style').optional().isString().withMessage('Style must be a string'),
    body('mood').optional().isString().withMessage('Mood must be a string')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      logger.info('AI video generation request', {
        userId,
        prompt: req.body.prompt,
        duration: req.body.duration
      });

      // Call AI Engine service
      const aiResponse = await axios.post(
        `${process.env.AI_ENGINE_URL}/api/ai/content-generation/text-to-video`,
        {
          prompt: req.body.prompt,
          userId,
          duration: req.body.duration || 30,
          style: req.body.style,
          mood: req.body.mood
        },
        {
          headers: {
            'x-ai-secret': process.env.AI_SERVICE_SECRET,
            'Content-Type': 'application/json'
          }
        }
      );

      if (aiResponse.data.success) {
        res.status(200).json({
          success: true,
          data: {
            contentId: aiResponse.data.data.contentId,
            url: aiResponse.data.data.url,
            metadata: aiResponse.data.data.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: aiResponse.data.error || 'AI generation failed'
        });
      }

    } catch (error) {
      logger.error('AI video generation endpoint error', {
        error: error.message,
        userId: req.user?.id,
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
 * @route POST /api/v1/ai-content-studio/generate-thumbnail
 * @desc Generate AI thumbnail for creators
 * @access Private
 */
router.post('/generate-thumbnail',
  authMiddleware,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('style').optional().isString().withMessage('Style must be a string')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      logger.info('AI thumbnail generation request', {
        userId,
        prompt: req.body.prompt
      });

      // Call AI Engine service
      const aiResponse = await axios.post(
        `${process.env.AI_ENGINE_URL}/api/ai/content-generation/thumbnail`,
        {
          prompt: req.body.prompt,
          userId,
          style: req.body.style
        },
        {
          headers: {
            'x-ai-secret': process.env.AI_SERVICE_SECRET,
            'Content-Type': 'application/json'
          }
        }
      );

      if (aiResponse.data.success) {
        res.status(200).json({
          success: true,
          data: {
            contentId: aiResponse.data.data.contentId,
            url: aiResponse.data.data.url,
            metadata: aiResponse.data.data.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: aiResponse.data.error || 'AI generation failed'
        });
      }

    } catch (error) {
      logger.error('AI thumbnail generation endpoint error', {
        error: error.message,
        userId: req.user?.id,
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
 * @route POST /api/v1/ai-content-studio/generate-music
 * @desc Generate AI background music for creators
 * @access Private
 */
router.post('/generate-music',
  authMiddleware,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('duration').optional().isInt({ min: 10, max: 300 }).withMessage('Duration must be between 10-300 seconds'),
    body('style').optional().isString().withMessage('Style must be a string'),
    body('mood').optional().isString().withMessage('Mood must be a string')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      logger.info('AI music generation request', {
        userId,
        prompt: req.body.prompt,
        duration: req.body.duration
      });

      // Call AI Engine service
      const aiResponse = await axios.post(
        `${process.env.AI_ENGINE_URL}/api/ai/content-generation/background-music`,
        {
          prompt: req.body.prompt,
          userId,
          duration: req.body.duration || 30,
          style: req.body.style,
          mood: req.body.mood
        },
        {
          headers: {
            'x-ai-secret': process.env.AI_SERVICE_SECRET,
            'Content-Type': 'application/json'
          }
        }
      );

      if (aiResponse.data.success) {
        res.status(200).json({
          success: true,
          data: {
            contentId: aiResponse.data.data.contentId,
            url: aiResponse.data.data.url,
            metadata: aiResponse.data.data.metadata
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: aiResponse.data.error || 'AI generation failed'
        });
      }

    } catch (error) {
      logger.error('AI music generation endpoint error', {
        error: error.message,
        userId: req.user?.id,
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
 * @route POST /api/v1/ai-content-studio/generate-package
 * @desc Generate complete AI content package (video + thumbnail + music)
 * @access Private
 */
router.post('/generate-package',
  authMiddleware,
  [
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('duration').optional().isInt({ min: 10, max: 300 }).withMessage('Duration must be between 10-300 seconds'),
    body('style').optional().isString().withMessage('Style must be a string'),
    body('mood').optional().isString().withMessage('Mood must be a string')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      logger.info('AI content package generation request', {
        userId,
        prompt: req.body.prompt,
        duration: req.body.duration
      });

      // Call AI Engine service
      const aiResponse = await axios.post(
        `${process.env.AI_ENGINE_URL}/api/ai/content-generation/package`,
        {
          prompt: req.body.prompt,
          userId,
          duration: req.body.duration || 30,
          style: req.body.style,
          mood: req.body.mood
        },
        {
          headers: {
            'x-ai-secret': process.env.AI_SERVICE_SECRET,
            'Content-Type': 'application/json'
          }
        }
      );

      if (aiResponse.data.success) {
        res.status(200).json({
          success: true,
          data: {
            video: aiResponse.data.data.video,
            thumbnail: aiResponse.data.data.thumbnail,
            music: aiResponse.data.data.music
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: aiResponse.data.error || 'AI generation failed'
        });
      }

    } catch (error) {
      logger.error('AI content package generation endpoint error', {
        error: error.message,
        userId: req.user?.id,
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
 * @route GET /api/v1/ai-content-studio/templates
 * @desc Get AI content generation templates
 * @access Private
 */
router.get('/templates',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = [
        {
          id: 'viral-trending',
          name: 'Viral Trending',
          description: 'Create content that follows current viral trends',
          prompt: 'Create a viral trending video about {topic}',
          style: 'trendy and engaging',
          mood: 'energetic and fun'
        },
        {
          id: 'educational',
          name: 'Educational',
          description: 'Create educational content with clear explanations',
          prompt: 'Create an educational video explaining {topic}',
          style: 'professional and clear',
          mood: 'informative and engaging'
        },
        {
          id: 'entertainment',
          name: 'Entertainment',
          description: 'Create entertaining and humorous content',
          prompt: 'Create an entertaining video about {topic}',
          style: 'fun and creative',
          mood: 'humorous and light'
        },
        {
          id: 'lifestyle',
          name: 'Lifestyle',
          description: 'Create lifestyle and wellness content',
          prompt: 'Create a lifestyle video about {topic}',
          style: 'relaxed and inspiring',
          mood: 'calm and positive'
        },
        {
          id: 'gaming',
          name: 'Gaming',
          description: 'Create gaming and esports content',
          prompt: 'Create a gaming video about {topic}',
          style: 'dynamic and exciting',
          mood: 'competitive and thrilling'
        }
      ];

      res.status(200).json({
        success: true,
        data: templates
      });

    } catch (error) {
      logger.error('AI content templates endpoint error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route GET /api/v1/ai-content-studio/history
 * @desc Get user's AI content generation history
 * @access Private
 */
router.get('/history',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // In a real implementation, this would fetch from database
      // For now, return empty array
      res.status(200).json({
        success: true,
        data: []
      });

    } catch (error) {
      logger.error('AI content history endpoint error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

export default router;
