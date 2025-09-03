import { Router, type Request, type Response } from 'express';
import { ModerationService } from '../services/ModerationService';
import { authenticateInternalAPI, validateRequestBody, rateLimiter } from '../middleware/auth';
import { ModerationRequest } from 'models/types';
import logger from '../utils/logger';
import Joi from 'joi';

const router: Router = Router();
const moderationService = ModerationService.getInstance();

// Validation schemas
const nsfwScanSchema = Joi.object({
  type: Joi.string().valid('nsfw_scan').required(),
  data: Joi.object({
    videoUrl: Joi.string().uri().optional(),
    streamFrames: Joi.array().items(Joi.binary()).optional()
  }).required(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional()
});

const ageEstimateSchema = Joi.object({
  type: Joi.string().valid('age_estimate').required(),
  data: Joi.object({
    faceFrame: Joi.binary().required()
  }).required(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional()
});

const profanityCheckSchema = Joi.object({
  type: Joi.string().valid('profanity_check').required(),
  data: Joi.object({
    realtimeAudio: Joi.binary().required()
  }).required(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional()
});

const policyEnforceSchema = Joi.object({
  type: Joi.string().valid('policy_enforce').required(),
  data: Joi.object({
    subject: Joi.any().required()
  }).required(),
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional()
});

// Apply middleware to all routes
router.use(authenticateInternalAPI);
router.use(rateLimiter);

/**
 * POST /internal/moderation/nsfw-scan
 * Scan video frames or stream for NSFW content
 */
router.post('/nsfw-scan', validateRequestBody(nsfwScanSchema), async (req, res) => {
  try {
    const request: ModerationRequest = req.body;
    const result = await moderationService.processModerationRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('NSFW scan endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/moderation/age-estimate
 * Estimate age from face frame
 */
router.post('/age-estimate', validateRequestBody(ageEstimateSchema), async (req, res) => {
  try {
    const request: ModerationRequest = req.body;
    const result = await moderationService.processModerationRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Age estimate endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/moderation/profanity-check
 * Check real-time audio for profanity
 */
router.post('/profanity-check', validateRequestBody(profanityCheckSchema), async (req, res) => {
  try {
    const request: ModerationRequest = req.body;
    const result = await moderationService.processModerationRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Profanity check endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/moderation/policy-enforce
 * Enforce policies based on subject analysis
 */
router.post('/policy-enforce', validateRequestBody(policyEnforceSchema), async (req, res) => {
  try {
    const request: ModerationRequest = req.body;
    const result = await moderationService.processModerationRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Policy enforce endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/moderation/process
 * Generic moderation request processor
 */
router.post('/process', async (req, res) => {
  try {
    const request: ModerationRequest = req.body;
    const result = await moderationService.processModerationRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Generic moderation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/moderation/thresholds
 * Get current warning thresholds
 */
router.get('/thresholds', async (req, res) => {
  try {
    const thresholds = moderationService.getThresholds();
    
    res.json({
      success: true,
      data: thresholds,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Get thresholds endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * PUT /internal/moderation/thresholds
 * Update warning thresholds
 */
router.put('/thresholds', async (req, res) => {
  try {
    const { thresholds } = req.body;
    moderationService.updateThresholds(thresholds);
    
    res.json({
      success: true,
      message: 'Thresholds updated successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Update thresholds endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/moderation/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'moderation',
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Service unhealthy',
      timestamp: Date.now()
    });
  }
});

export default router;
