import { Router } from 'express';
import { ReputationShield } from '../services/ReputationShield';
import { authenticateInternalAPI, validateRequestBody, rateLimiter } from '../middleware/auth';
import { ReputationEvent } from '../models/types';
import logger from '../utils/logger';
import Joi from 'joi';

const router = Router();
const reputationShield = ReputationShield.getInstance();

// Validation schemas
const reputationEventSchema = Joi.object({
  userId: Joi.string().required(),
  eventType: Joi.string().valid('positive', 'negative', 'neutral').required(),
  score: Joi.number().min(-100).max(100).required(),
  reason: Joi.string().required(),
  timestamp: Joi.number().optional(),
  source: Joi.string().valid('moderation', 'engagement', 'user_report', 'system').required()
});

const bulkEventsSchema = Joi.object({
  events: Joi.array().items(reputationEventSchema).min(1).max(1000).required()
});

// Apply middleware to all routes
router.use(authenticateInternalAPI);
router.use(rateLimiter);

/**
 * POST /internal/reputation/event
 * Add a reputation event and update user score
 */
router.post('/event', validateRequestBody(reputationEventSchema), async (req, res) => {
  try {
    const event: ReputationEvent = {
      ...req.body,
      timestamp: req.body.timestamp || Date.now()
    };
    
    const result = await reputationShield.addReputationEvent(event);
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Add reputation event endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * POST /internal/reputation/bulk-events
 * Process multiple reputation events
 */
router.post('/bulk-events', validateRequestBody(bulkEventsSchema), async (req, res) => {
  try {
    const { events } = req.body;
    const eventsWithTimestamp = events.map((event: ReputationEvent) => ({
      ...event,
      timestamp: event.timestamp || Date.now()
    }));
    
    const result = await reputationShield.processBulkEvents(eventsWithTimestamp);
    
    res.json(result);
  } catch (error) {
    logger.error('Bulk events endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/reputation/score/:userId
 * Get current reputation score for user
 */
router.get('/score/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await reputationShield.getReputationScore(userId);
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Get reputation score endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/reputation/permissions/:userId
 * Check if user can perform specific actions
 */
router.get('/permissions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await reputationShield.checkUserPermissions(userId);
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Check user permissions endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/reputation/events/:userId
 * Get reputation events for user
 */
router.get('/events/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    const result = await reputationShield.getUserEvents(userId, Number(limit));
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Get user events endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/reputation/configuration
 * Get current configuration
 */
router.get('/configuration', async (req, res) => {
  try {
    const result = reputationShield.getConfiguration();
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Get configuration endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * PUT /internal/reputation/configuration
 * Update configuration
 */
router.put('/configuration', async (req, res) => {
  try {
    const { scoreThresholds, decayRates, minimumActions } = req.body;
    
    if (scoreThresholds) {
      reputationShield.updateScoreThresholds(scoreThresholds);
    }
    
    if (decayRates) {
      reputationShield.updateDecayRates(decayRates);
    }
    
    if (minimumActions) {
      reputationShield.updateMinimumActions(minimumActions);
    }
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Update configuration endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/reputation/statistics
 * Get reputation system statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const result = reputationShield.getStatistics();
    
    res.json({
      success: true,
      data: result,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Get statistics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    });
  }
});

/**
 * GET /internal/reputation/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'reputation',
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
