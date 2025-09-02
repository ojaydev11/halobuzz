import express from 'express';
import { authenticateAIEngine } from '../middleware/auth';
import { validateServiceJWT, sanitizeAIInput } from '../middleware/security';
import ConversationAIService from '../services/conversation/ConversationAIService';
import logger from '../utils/logger';

const router = express.Router();
const conversationAI = ConversationAIService.getInstance();

// Apply security middleware
router.use(authenticateAIEngine);
router.use(validateServiceJWT);
router.use(sanitizeAIInput);

/**
 * @route POST /api/ai/conversation/icebreakers
 * @desc Generate conversation starters for shy users
 * @access Internal AI Engine
 */
router.post('/icebreakers', async (req, res) => {
  try {
    const { streamContext, userProfile, targetAudience } = req.body;

    if (!streamContext || !userProfile || !targetAudience) {
      return res.status(400).json({
        success: false,
        error: 'streamContext, userProfile, and targetAudience are required'
      });
    }

    const icebreakers = await conversationAI.generateIcebreakers({
      streamContext,
      userProfile,
      targetAudience
    });

    logger.info('Icebreakers generated', {
      userId: userProfile.userId,
      streamId: streamContext.streamId,
      streamCategory: streamContext.category,
      currentViewers: streamContext.currentViewers,
      icebreakerCount: icebreakers.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        userId: userProfile.userId,
        streamId: streamContext.streamId,
        icebreakers,
        count: icebreakers.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating icebreakers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate icebreakers'
    });
  }
});

/**
 * @route POST /api/ai/conversation/analyze-flow
 * @desc Analyze conversation flow and provide insights
 * @access Internal AI Engine
 */
router.post('/analyze-flow', async (req, res) => {
  try {
    const { chatHistory } = req.body;

    if (!chatHistory || !Array.isArray(chatHistory)) {
      return res.status(400).json({
        success: false,
        error: 'chatHistory array is required'
      });
    }

    const insights = await conversationAI.analyzeConversationFlow(chatHistory);

    logger.info('Conversation flow analyzed', {
      messageCount: chatHistory.length,
      mood: insights.mood,
      engagementLevel: insights.engagementLevel,
      dominantTopics: insights.dominantTopics.length,
      conversationFlow: insights.conversationFlow,
      activeUsers: insights.participantActivity.activeUsers,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        insights,
        messageCount: chatHistory.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error analyzing conversation flow:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze conversation flow'
    });
  }
});

/**
 * @route POST /api/ai/conversation/cultural-responses
 * @desc Generate culturally appropriate responses
 * @access Internal AI Engine
 */
router.post('/cultural-responses', async (req, res) => {
  try {
    const { context } = req.body;

    if (!context) {
      return res.status(400).json({
        success: false,
        error: 'context object is required'
      });
    }

    const { message, userCulturalBackground, streamCulturalContext, targetAudience } = context;

    if (!message || !userCulturalBackground || !streamCulturalContext || !targetAudience) {
      return res.status(400).json({
        success: false,
        error: 'message, userCulturalBackground, streamCulturalContext, and targetAudience are required'
      });
    }

    const responses = await conversationAI.generateCulturallyAppropriateResponses(context);

    logger.info('Cultural responses generated', {
      messageLength: message.length,
      userCulturalBackground,
      streamCulturalContext,
      responseCount: responses.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        responses,
        count: responses.length,
        culturalContext: {
          user: userCulturalBackground,
          stream: streamCulturalContext
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating cultural responses:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate cultural responses'
    });
  }
});

/**
 * @route POST /api/ai/conversation/host-prompts
 * @desc Generate conversation prompts for stream hosts
 * @access Internal AI Engine
 */
router.post('/host-prompts', async (req, res) => {
  try {
    const { streamContext, conversationInsights } = req.body;

    if (!streamContext || !conversationInsights) {
      return res.status(400).json({
        success: false,
        error: 'streamContext and conversationInsights are required'
      });
    }

    const prompts = await conversationAI.generateHostPrompts(streamContext, conversationInsights);

    logger.info('Host prompts generated', {
      streamId: streamContext.streamId,
      streamCategory: streamContext.category,
      engagementLevel: conversationInsights.engagementLevel,
      conversationFlow: conversationInsights.conversationFlow,
      promptCount: prompts.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        streamId: streamContext.streamId,
        prompts,
        count: prompts.length,
        context: {
          engagementLevel: conversationInsights.engagementLevel,
          conversationFlow: conversationInsights.conversationFlow,
          mood: conversationInsights.mood
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error generating host prompts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate host prompts'
    });
  }
});

/**
 * @route POST /api/ai/conversation/suggest-topics
 * @desc Suggest conversation topics for streams
 * @access Internal AI Engine
 */
router.post('/suggest-topics', async (req, res) => {
  try {
    const { streamContext, userInterests } = req.body;

    if (!streamContext || !userInterests) {
      return res.status(400).json({
        success: false,
        error: 'streamContext and userInterests are required'
      });
    }

    const topics = await conversationAI.suggestConversationTopics(streamContext, userInterests);

    logger.info('Conversation topics suggested', {
      streamId: streamContext.streamId,
      streamCategory: streamContext.category,
      currentViewers: streamContext.currentViewers,
      userInterestsCount: userInterests.length,
      topicCount: topics.length,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        streamId: streamContext.streamId,
        topics,
        count: topics.length,
        context: {
          category: streamContext.category,
          viewers: streamContext.currentViewers,
          userInterests
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error suggesting conversation topics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to suggest conversation topics'
    });
  }
});

/**
 * @route POST /api/ai/conversation/analyze-sentiment
 * @desc Analyze sentiment of conversation messages
 * @access Internal AI Engine
 */
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required'
      });
    }

    // Analyze sentiment for each message
    const sentimentAnalysis = await Promise.all(
      messages.map(async (message: any) => {
        try {
          const prompt = `
            Analyze the sentiment of this message (0-1 scale, where 1 is very positive):
            "${message.content}"
            
            Consider: emotional tone, positivity/negativity, energy level.
            Return only a number between 0 and 1.
          `;

          // This would use the AI model manager in a real implementation
          const sentiment = Math.random() * 0.4 + 0.3; // Mock sentiment for now
          
          return {
            messageId: message.id,
            content: message.content,
            sentiment,
            timestamp: message.timestamp
          };
        } catch (error) {
          logger.error('Error analyzing message sentiment:', error);
          return {
            messageId: message.id,
            content: message.content,
            sentiment: 0.5,
            timestamp: message.timestamp
          };
        }
      })
    );

    // Calculate overall sentiment
    const overallSentiment = sentimentAnalysis.reduce((sum, analysis) => sum + analysis.sentiment, 0) / sentimentAnalysis.length;

    logger.info('Sentiment analysis completed', {
      messageCount: messages.length,
      overallSentiment: overallSentiment.toFixed(3),
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        overallSentiment,
        messageAnalysis: sentimentAnalysis,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error analyzing sentiment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment'
    });
  }
});

/**
 * @route GET /api/ai/conversation/health
 * @desc Health check for conversation AI service
 * @access Internal AI Engine
 */
router.get('/health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        service: 'conversation-ai',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: [
          'icebreaker-generation',
          'conversation-analysis',
          'cultural-responses',
          'host-prompts',
          'topic-suggestions',
          'sentiment-analysis'
        ]
      }
    });
  } catch (error) {
    logger.error('Conversation AI service health check failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Service unhealthy'
    });
  }
});

export default router;
