import express from 'express';
import { authenticateAIEngine } from '../middleware/auth';
import { validateServiceJWT, sanitizeAIInput } from '../middleware/security';
import AIContentEnhancer from '../services/enhancement/ContentEnhancementService';
import logger from '../utils/logger';

const router = express.Router();
const contentEnhancer = AIContentEnhancer.getInstance();

// Apply security middleware
router.use(authenticateAIEngine);
router.use(validateServiceJWT);
router.use(sanitizeAIInput);

/**
 * @route POST /api/ai/enhancement/thumbnails
 * @desc Generate smart thumbnails for video content
 * @access Internal AI Engine
 */
router.post('/thumbnails', async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'videoId is required'
      });
    }

    const thumbnails = await contentEnhancer.generateSmartThumbnails(videoId);

    logger.info('Smart thumbnails generated', {
      videoId,
      thumbnailCount: thumbnails.length,
      requestId: req.headers['x-request-id']
    });

    return res.json({
      success: true,
      data: {
        videoId,
        thumbnails,
        count: thumbnails.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating smart thumbnails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate smart thumbnails'
    });
  }
});

/**
 * @route POST /api/ai/enhancement/editing-suggestions
 * @desc Generate real-time editing suggestions for video content
 * @access Internal AI Engine
 */
router.post('/editing-suggestions', async (req, res) => {
  try {
    const { videoBuffer, contentType = 'video' } = req.body;

    if (!videoBuffer) {
      return res.status(400).json({
        success: false,
        error: 'videoBuffer is required'
      });
    }

    // Convert base64 buffer if needed
    const buffer = Buffer.isBuffer(videoBuffer) ? videoBuffer : Buffer.from(videoBuffer, 'base64');
    
    const suggestions = await contentEnhancer.suggestEdits(buffer);

    logger.info('Editing suggestions generated', {
      contentType,
      bufferSize: buffer.length,
      cutsCount: suggestions.cuts.length,
      transitionsCount: suggestions.transitions.length,
      effectsCount: suggestions.effects.length,
      overallScore: suggestions.overallScore,
      requestId: req.headers['x-request-id']
    });

    return res.json({
      success: true,
      data: {
        suggestions,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating editing suggestions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate editing suggestions'
    });
  }
});

/**
 * @route POST /api/ai/enhancement/metadata
 * @desc Generate AI-powered content metadata (titles, hashtags, descriptions)
 * @access Internal AI Engine
 */
router.post('/metadata', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content object is required'
      });
    }

    const metadata = await contentEnhancer.generateContentMetadata(content);

    logger.info('Content metadata generated', {
      contentId: content.id || 'unknown',
      title: metadata.title,
      hashtagsCount: metadata.hashtags.length,
      tagsCount: metadata.tags.length,
      targetAudienceCount: metadata.targetAudience.length,
      culturalAdaptationsCount: metadata.culturalAdaptations.length,
      requestId: req.headers['x-request-id']
    });

    return res.json({
      success: true,
      data: {
        metadata,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating content metadata:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate content metadata'
    });
  }
});

/**
 * @route POST /api/ai/enhancement/subtitles
 * @desc Generate automatic subtitles in multiple languages
 * @access Internal AI Engine
 */
router.post('/subtitles', async (req, res) => {
  try {
    const { audioBuffer, targetLanguages = ['en'] } = req.body;

    if (!audioBuffer) {
      return res.status(400).json({
        success: false,
        error: 'audioBuffer is required'
      });
    }

    // Convert base64 buffer if needed
    const buffer = Buffer.isBuffer(audioBuffer) ? audioBuffer : Buffer.from(audioBuffer, 'base64');
    
    const subtitles = await contentEnhancer.generateSubtitles(buffer, targetLanguages);

    logger.info('Subtitles generated', {
      targetLanguages,
      languagesCount: subtitles.length,
      totalSegments: subtitles.reduce((sum, sub) => sum + sub.segments.length, 0),
      requestId: req.headers['x-request-id']
    });

    return res.json({
      success: true,
      data: {
        subtitles,
        count: subtitles.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating subtitles:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate subtitles'
    });
  }
});

/**
 * @route POST /api/ai/enhancement/enhance
 * @desc Comprehensive content enhancement with multiple AI features
 * @access Internal AI Engine
 */
router.post('/enhance', async (req, res) => {
  try {
    const {
      contentId,
      contentType = 'video',
      contentBuffer,
      contentUrl,
      targetLanguages = ['en'],
      enhancementTypes = ['thumbnails', 'metadata'],
      creatorPreferences
    } = req.body;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'contentId is required'
      });
    }

    if (enhancementTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one enhancement type is required'
      });
    }

    const enhancementRequest = {
      contentId,
      contentType,
      contentBuffer,
      contentUrl,
      targetLanguages,
      enhancementTypes,
      creatorPreferences
    };

    const results = await contentEnhancer.enhanceContent(enhancementRequest);

    logger.info('Content enhancement completed', {
      contentId,
      contentType,
      enhancementTypes,
      resultsCount: Object.keys(results).length,
      requestId: req.headers['x-request-id']
    });

    return res.json({
      success: true,
      data: {
        contentId,
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error enhancing content:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to enhance content'
    });
  }
});

/**
 * @route GET /api/ai/enhancement/health
 * @desc Health check for content enhancement service
 * @access Internal AI Engine
 */
router.get('/health', async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        service: 'content-enhancement',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: [
          'smart-thumbnails',
          'editing-suggestions',
          'metadata-generation',
          'subtitle-generation',
          'cultural-adaptation'
        ]
      }
    });
  } catch (error) {
    logger.error('Content enhancement service health check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Service unhealthy'
    });
  }
});

export default router;
