import { Router, Request, Response } from 'express';
import { AIIntegrationService } from '../services/aiIntegration/AIIntegrationService';
import logger from '../utils/logger';

const router = Router();
const aiIntegration = AIIntegrationService.getInstance();

/**
 * @route POST /api/ai/intelligence/personal
 * @desc Process personal brain request
 */
router.post('/personal', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, message, context, metadata } = req.body;

    if (!userId || !sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, sessionId, message'
      });
    }

    const response = await aiIntegration.processAIRequest({
      userId,
      sessionId,
      requestType: 'personal',
      data: { message, metadata },
      context
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error in personal brain route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/knowledge
 * @desc Process knowledge brain request
 */
router.post('/knowledge', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, topics, domains, depth, format, context } = req.body;

    if (!userId || !sessionId || !topics) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, sessionId, topics'
      });
    }

    const response = await aiIntegration.processAIRequest({
      userId,
      sessionId,
      requestType: 'knowledge',
      data: { topics, domains, depth, format },
      context
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error in knowledge brain route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/creative
 * @desc Process creative intelligence request
 */
router.post('/creative', async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      sessionId, 
      contentType, 
      prompt, 
      style, 
      targetAudience, 
      constraints, 
      goals 
    } = req.body;

    if (!userId || !sessionId || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, sessionId, prompt'
      });
    }

    const response = await aiIntegration.processAIRequest({
      userId,
      sessionId,
      requestType: 'creative',
      data: { contentType, prompt, style, targetAudience, constraints, goals }
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error in creative intelligence route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/reasoning
 * @desc Process advanced reasoning request
 */
router.post('/reasoning', async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      sessionId, 
      problem, 
      context, 
      reasoningType, 
      depth, 
      includeAlternatives, 
      includeAssumptions 
    } = req.body;

    if (!userId || !sessionId || !problem) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, sessionId, problem'
      });
    }

    const response = await aiIntegration.processAIRequest({
      userId,
      sessionId,
      requestType: 'reasoning',
      data: { problem, reasoningType, depth, includeAlternatives, includeAssumptions },
      context
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error in advanced reasoning route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/learning
 * @desc Process autonomous learning request
 */
router.post('/learning', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, serviceName, metrics, context, forceOptimization } = req.body;

    if (!userId || !sessionId || !serviceName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, sessionId, serviceName'
      });
    }

    const response = await aiIntegration.processAIRequest({
      userId,
      sessionId,
      requestType: 'learning',
      data: { serviceName, metrics, forceOptimization },
      context
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error in autonomous learning route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/comprehensive
 * @desc Process comprehensive AI request using multiple services
 */
router.post('/comprehensive', async (req: Request, res: Response) => {
  try {
    const { 
      userId, 
      sessionId, 
      includePersonal, 
      includeKnowledge, 
      includeCreative, 
      includeReasoning,
      data,
      context 
    } = req.body;

    if (!userId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, sessionId'
      });
    }

    const response = await aiIntegration.processAIRequest({
      userId,
      sessionId,
      requestType: 'comprehensive',
      data: { 
        ...data, 
        includePersonal, 
        includeKnowledge, 
        includeCreative, 
        includeReasoning 
      },
      context
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Error in comprehensive AI route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/ai/intelligence/capabilities
 * @desc Get AI service capabilities
 */
router.get('/capabilities', async (req: Request, res: Response) => {
  try {
    const capabilities = await aiIntegration.getServiceCapabilities();

    res.json({
      success: true,
      data: capabilities
    });

  } catch (error) {
    logger.error('Error getting AI capabilities:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/ai/intelligence/analytics
 * @desc Get AI integration analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const analytics = await aiIntegration.getAIAnalytics();

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Error getting AI analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/ai/intelligence/health
 * @desc Get AI services health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await aiIntegration.healthCheck();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Error getting AI health status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/ai/intelligence/user/:userId/insights
 * @desc Get user-specific AI insights
 */
router.get('/user/:userId/insights', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { PersonalBrainService } = await import('../services/personalBrain/PersonalBrainService');
    
    const personalBrain = PersonalBrainService.getInstance();
    const insights = await personalBrain.getUserInsights(userId);

    res.json({
      success: true,
      data: insights
    });

  } catch (error) {
    logger.error('Error getting user insights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route DELETE /api/ai/intelligence/user/:userId/context
 * @desc Clear user context (GDPR compliance)
 */
router.delete('/user/:userId/context', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { PersonalBrainService } = await import('../services/personalBrain/PersonalBrainService');
    
    const personalBrain = PersonalBrainService.getInstance();
    await personalBrain.clearUserContext(userId);

    res.json({
      success: true,
      message: 'User context cleared successfully'
    });

  } catch (error) {
    logger.error('Error clearing user context:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/trends/analyze
 * @desc Analyze trending topics
 */
router.post('/trends/analyze', async (req: Request, res: Response) => {
  try {
    const { topics, timeframe } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid topics array'
      });
    }

    const { CreativeIntelligenceService } = await import('../services/creativeIntelligence/CreativeIntelligenceService');
    const creativeIntelligence = CreativeIntelligenceService.getInstance();
    const trends = await creativeIntelligence.analyzeTrends(topics, timeframe);

    res.json({
      success: true,
      data: trends
    });

  } catch (error) {
    logger.error('Error analyzing trends:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/audience/analyze
 * @desc Analyze audience preferences
 */
router.post('/audience/analyze', async (req: Request, res: Response) => {
  try {
    const { audienceId, data } = req.body;

    if (!audienceId || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: audienceId, data'
      });
    }

    const { CreativeIntelligenceService } = await import('../services/creativeIntelligence/CreativeIntelligenceService');
    const creativeIntelligence = CreativeIntelligenceService.getInstance();
    const analysis = await creativeIntelligence.analyzeAudience(audienceId, data);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Error analyzing audience:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/ai/intelligence/predictions/analyze
 * @desc Perform predictive analysis
 */
router.post('/predictions/analyze', async (req: Request, res: Response) => {
  try {
    const { target, timeframe, data, methodology, scenarios } = req.body;

    if (!target || !timeframe || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: target, timeframe, data'
      });
    }

    const { AdvancedReasoningService } = await import('../services/advancedReasoning/AdvancedReasoningService');
    const advancedReasoning = AdvancedReasoningService.getInstance();
    const analysis = await advancedReasoning.performPredictiveAnalysis({
      target,
      timeframe,
      data,
      methodology: methodology || 'hybrid',
      scenarios: scenarios || ['conservative', 'optimistic']
    });

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Error performing predictive analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
