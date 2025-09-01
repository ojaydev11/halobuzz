import { Router } from 'express';
import { EngagementService } from '../services/EngagementService';
import { authenticateInternalAPI, validateRequestBody, rateLimiter } from '../middleware/auth';
import { EngagementRequest } from '../models/types';
import logger from '../utils/logger';
import Joi from 'joi';

const router = Router();
const engagementService = EngagementService.getInstance();

// Validation schemas
const boredomDetectorSchema = Joi.object({
  type: Joi.string().valid('boredom_detector').required(),
  data: Joi.object({
    viewerEvents: Joi.array().items(Joi.object({
      viewerId: Joi.string().required(),
      timestamp: Joi.number().required(),
      eventType: Joi.string().valid('view', 'like', 'comment', 'share', 'leave', 'return').required(),
      duration: Joi.number().optional()
    })).required()
  }).required(),
  userId: Joi.string().optional()
});

const cohostSuggesterSchema = Joi.object({
  type: Joi.string().valid('cohost_suggester').required(),
  data: Joi.object({
    hostId: Joi.string().required(),
    country: Joi.string().length(2).required()
  }).required(),
  userId: Joi.string().optional()
});

const festivalSkinnerSchema = Joi.object({
  type: Joi.string().valid('festival_skinner').required(),
  data: Joi.object({
    country: Joi.string().length(2).required(),
    date: Joi.string().isoDate().required()
  }).required(),
  userId: Joi.string().optional()
});

const battleBoostSchema = Joi.object({
  streamId: Joi.string().required(),
  multiplier: Joi.number().min(1).max(10).required(),
  durationSec: Joi.number().min(10).max(300).required()
});

// Apply middleware to all routes
router.use(authenticateInternalAPI);
router.use(rateLimiter);

/**
 * POST /internal/engagement/boredom-detector
 * Detect boredom from viewer events and suggest engagement boost
 */
router.post('/boredom-detector', validateRequestBody(boredomDetectorSchema), async (req, res) => {
  try {
    const request: EngagementRequest = req.body;
    const result = await engagementService.processEngagementRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Boredom detector endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/engagement/cohost-suggester
 * Suggest cohosts based on host ID and country
 */
router.post('/cohost-suggester', validateRequestBody(cohostSuggesterSchema), async (req, res) => {
  try {
    const request: EngagementRequest = req.body;
    const result = await engagementService.processEngagementRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Cohost suggester endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/engagement/festival-skinner
 * Get festival skin and gift set for country and date
 */
router.post('/festival-skinner', validateRequestBody(festivalSkinnerSchema), async (req, res) => {
  try {
    const request: EngagementRequest = req.body;
    const result = await engagementService.processEngagementRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Festival skinner endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/engagement/process
 * Generic engagement request processor
 */
router.post('/process', async (req, res) => {
  try {
    const request: EngagementRequest = req.body;
    const result = await engagementService.processEngagementRequest(request);
    
    res.json(result);
  } catch (error) {
    logger.error('Generic engagement endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/engagement/thresholds
 * Get current boredom thresholds
 */
router.get('/thresholds', async (req, res) => {
  try {
    const thresholds = engagementService.getBoredomThresholds();
    
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
 * PUT /internal/engagement/thresholds
 * Update boredom thresholds
 */
router.put('/thresholds', async (req, res) => {
  try {
    const { thresholds } = req.body;
    engagementService.updateBoredomThresholds(thresholds);
    
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
 * POST /internal/engagement/battle-boost
 * Trigger battle boost for a stream
 */
router.post('/battle-boost', validateRequestBody(battleBoostSchema), async (req, res) => {
  try {
    const { streamId, multiplier, durationSec } = req.body;
    
    // Trigger battle boost via socket to backend
    const result = await engagementService.triggerBattleBoost(streamId, multiplier, durationSec);
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Battle boost endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/engagement/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'engagement',
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
