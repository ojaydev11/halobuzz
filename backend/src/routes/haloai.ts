import express from 'express';
import { haloAIService } from '../services/HaloAIService';
import { authMiddleware } from '../middleware/auth';
import { User } from '../models/User';
import { Festival } from '../models/Festival';
import { getCache } from '../config/redis';

const router = express.Router();

/**
 * @route POST /haloai/engage
 * @desc Get AI engagement suggestions
 */
router.post('/engage', authMiddleware, async (req, res) => {
  try {
    const { requestType = 'boost', context } = req.body;
    const userId = req.user?.id;

    const result = await haloAIService.processEngagementRequest(
      userId,
      requestType,
      context
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error processing engagement request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process engagement request'
    });
  }
});

/**
 * @route GET /haloai/whale-notifications
 * @desc Get whale notifications for user
 */
router.get('/whale-notifications', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Check if user is a whale
    const user = await User.findById(userId);
    if (!user || (user.coins?.totalSpent || 0) < 1000) {
      return res.json({
        success: true,
        notifications: []
      });
    }

    // Get cached whale notifications
    const notifications = await getCache(`whale_notification:${userId}`);
    
    res.json({
      success: true,
      notifications: notifications || []
    });
  } catch (error) {
    console.error('Error fetching whale notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch whale notifications'
    });
  }
});

/**
 * @route POST /haloai/auto-gifter
 * @desc Enable/disable auto gifter for OG3+ users
 */
router.post('/auto-gifter', authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user?.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.ogLevel < 3) {
      return res.status(403).json({
        success: false,
        error: 'Auto gifter is only available for OG3+ users'
      });
    }

    // Update user preferences
    user.preferences = {
      ...user.preferences,
      autoGifter: enabled
    };

    await user.save();

    res.json({
      success: true,
      message: `Auto gifter ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error updating auto gifter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update auto gifter'
    });
  }
});

/**
 * @route GET /haloai/festivals
 * @desc Get active festivals
 */
router.get('/festivals', async (req, res) => {
  try {
    const { country } = req.query;

    const query: any = {
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      isActive: true
    };

    if (country) {
      query.country = country;
    }

    const festivals = await Festival.find(query).sort({ startDate: 1 });

    res.json({
      success: true,
      festivals
    });
  } catch (error) {
    console.error('Error fetching festivals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch festivals'
    });
  }
});

/**
 * @route POST /haloai/festival-events
 * @desc Trigger festival event creation
 */
router.post('/festival-events', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Check if user is admin
    const user = await User.findById(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Trigger festival event detection and creation
    await haloAIService.detectAndCreateFestivalEvents();

    res.json({
      success: true,
      message: 'Festival events processed successfully'
    });
  } catch (error) {
    console.error('Error processing festival events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process festival events'
    });
  }
});

/**
 * @route GET /haloai/recommendations
 * @desc Get AI recommendations for user
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { type = 'general' } = req.query;

    let result;
    if (type === 'streams') {
      // Get stream recommendations
      result = await haloAIService.processEngagementRequest(
        userId,
        'suggestions',
        { type: 'streams' }
      );
    } else if (type === 'gifts') {
      // Get gift recommendations
      result = await haloAIService.processEngagementRequest(
        userId,
        'suggestions',
        { type: 'gifts' }
      );
    } else {
      // Get general recommendations
      result = await haloAIService.processEngagementRequest(
        userId,
        'suggestions'
      );
    }

    res.json({
      success: true,
      recommendations: result.suggestions || [],
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations'
    });
  }
});

/**
 * @route POST /haloai/chat-suggestions
 * @desc Get AI chat suggestions for stream
 */
router.post('/chat-suggestions', authMiddleware, async (req, res) => {
  try {
    const { streamId, context } = req.body;
    const userId = req.user?.id;

    const result = await haloAIService.processEngagementRequest(
      userId,
      'boost',
      { streamId, ...context }
    );

    // Filter for chat suggestions only
    const chatSuggestions = result.actions?.filter(
      (action: any) => action.type === 'chat'
    ) || [];

    res.json({
      success: true,
      suggestions: chatSuggestions.map((s: any) => s.suggestion),
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error fetching chat suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat suggestions'
    });
  }
});

/**
 * @route GET /haloai/engagement-analysis
 * @desc Get engagement analysis for user
 */
router.get('/engagement-analysis', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { streamId } = req.query;

    const result = await haloAIService.processEngagementRequest(
      userId,
      'analysis',
      { streamId }
    );

    res.json({
      success: true,
      analysis: result.metadata,
      recommendations: result.suggestions
    });
  } catch (error) {
    console.error('Error fetching engagement analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement analysis'
    });
  }
});

/**
 * @route PUT /ai/features/voice-cloning
 * @desc Update voice cloning settings
 */
router.put('/features/voice-cloning', authMiddleware, async (req, res) => {
  try {
    const { enabled, voiceId, settings } = req.body;
    const userId = req.user?.id;

    // Update user's voice cloning preferences
    await User.findByIdAndUpdate(userId, {
      $set: {
        'aiFeatures.voiceCloning': {
          enabled: enabled || false,
          voiceId: voiceId || null,
          settings: settings || {}
        }
      }
    });

    res.json({
      success: true,
      message: 'Voice cloning settings updated successfully',
      data: {
        enabled: enabled || false,
        voiceId: voiceId || null,
        settings: settings || {}
      }
    });
  } catch (error) {
    console.error('Error updating voice cloning settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update voice cloning settings'
    });
  }
});

export default router;
