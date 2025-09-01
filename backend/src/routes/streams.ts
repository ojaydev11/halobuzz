import express from 'express';
import { body, validationResult } from 'express-validator';
import { LiveStream } from '../models/LiveStream';
import { User } from '../models/User';
import { rankingService } from '../services/RankingService';
import { AgoraToken } from 'agora-access-token';
import { logger } from '../config/logger';

const router = express.Router();

// Create stream
router.post('/', [
  body('title')
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be max 500 characters'),
  body('category')
    .isIn(['entertainment', 'music', 'dance', 'comedy', 'gaming', 'education', 'lifestyle', 'news', 'sports', 'other'])
    .withMessage('Valid category is required'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be array with max 10 items'),
  body('isAudioOnly')
    .optional()
    .isBoolean()
    .withMessage('isAudioOnly must be boolean'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const {
      title,
      description = '',
      category,
      tags = [],
      isAudioOnly = false,
      isPrivate = false
    } = req.body;

    // Generate Agora token
    const agoraAppId = process.env.AGORA_APP_ID!;
    const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE!;
    const agoraToken = new AgoraToken(agoraAppId, agoraAppCertificate);
    
    const channelName = `halobuzz_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const uid = 0; // 0 for dynamic uid
    const role = AgoraToken.Role.PUBLISHER;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    const token = agoraToken.buildTokenWithUid(channelName, uid, role, privilegeExpiredTs);

    // Create stream
    const stream = new LiveStream({
      hostId: userId,
      title,
      description,
      category,
      tags,
      isAudioOnly,
      isPrivate,
      agoraChannel: channelName,
      agoraToken: token,
      country: user.country,
      language: user.language
    });

    await stream.save();

    // Update user's total streams count
    await User.findByIdAndUpdate(userId, {
      $inc: { 'trust.factors.totalStreams': 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Stream created successfully',
      data: {
        stream: {
          id: stream._id,
          title: stream.title,
          description: stream.description,
          category: stream.category,
          tags: stream.tags,
          isAudioOnly: stream.isAudioOnly,
          isPrivate: stream.isPrivate,
          agoraChannel: stream.agoraChannel,
          agoraToken: stream.agoraToken,
          streamKey: stream.streamKey,
          status: stream.status
        }
      }
    });

  } catch (error) {
    logger.error('Create stream failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stream'
    });
  }
});

// Get streams (ranked)
router.get('/', async (req, res) => {
  try {
    const {
      category,
      country,
      limit = 20,
      page = 1,
      sortBy = 'engagementScore'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const filter: any = { status: 'live' };

    if (category) filter.category = category;
    if (country) filter.country = country;

    let sortCriteria: any = {};
    switch (sortBy) {
      case 'giftsAmount':
        sortCriteria = { 'metrics.giftsCoins': -1 };
        break;
      case 'viewerCount':
        sortCriteria = { 'metrics.viewerCount': -1 };
        break;
      case 'aiEngagementScore':
        sortCriteria = { 'metrics.aiEngagementScore': -1 };
        break;
      case 'engagementScore':
      default:
        sortCriteria = { 'metrics.engagementScore': -1 };
        break;
    }

    const streams = await LiveStream.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('hostId', 'username avatar followers ogLevel trust');

    const total = await LiveStream.countDocuments(filter);

    res.json({
      success: true,
      data: {
        streams: streams.map(stream => ({
          id: stream._id,
          title: stream.title,
          description: stream.description,
          category: stream.category,
          tags: stream.tags,
          host: stream.hostId,
          currentViewers: stream.currentViewers,
          totalCoins: stream.totalCoins,
          totalLikes: stream.totalLikes,
          metrics: stream.metrics,
          thumbnail: stream.thumbnail,
          isAudioOnly: stream.isAudioOnly,
          isPrivate: stream.isPrivate,
          startedAt: stream.startedAt,
          createdAt: stream.createdAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get streams failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streams'
    });
  }
});

// Get trending streams
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await rankingService.getTrendingStreams(parseInt(limit as string));

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Get trending streams failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending streams'
    });
  }
});

// Get stream by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const stream = await LiveStream.findById(id)
      .populate('hostId', 'username avatar followers ogLevel trust bio');

    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found'
      });
    }

    res.json({
      success: true,
      data: {
        stream: {
          id: stream._id,
          title: stream.title,
          description: stream.description,
          category: stream.category,
          tags: stream.tags,
          host: stream.hostId,
          status: stream.status,
          currentViewers: stream.currentViewers,
          totalViewers: stream.totalViewers,
          totalCoins: stream.totalCoins,
          totalLikes: stream.totalLikes,
          totalShares: stream.totalShares,
          totalComments: stream.totalComments,
          metrics: stream.metrics,
          analytics: stream.analytics,
          thumbnail: stream.thumbnail,
          isAudioOnly: stream.isAudioOnly,
          isPrivate: stream.isPrivate,
          agoraChannel: stream.agoraChannel,
          agoraToken: stream.agoraToken,
          startedAt: stream.startedAt,
          createdAt: stream.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Get stream failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream'
    });
  }
});

// End stream
router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const stream = await LiveStream.findById(id);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found'
      });
    }

    if (stream.hostId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only stream host can end the stream'
      });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: 'Stream is not live'
      });
    }

    // End the stream
    stream.endStream();
    await stream.save();

    // Update final metrics
    await rankingService.updateStreamMetrics(stream._id.toString());

    res.json({
      success: true,
      message: 'Stream ended successfully',
      data: {
        stream: {
          id: stream._id,
          status: stream.status,
          endedAt: stream.endedAt,
          duration: stream.duration,
          totalViewers: stream.totalViewers,
          totalCoins: stream.totalCoins,
          totalLikes: stream.totalLikes
        }
      }
    });

  } catch (error) {
    logger.error('End stream failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end stream'
    });
  }
});

// Get user's streams
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const streams = await LiveStream.find({ hostId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('hostId', 'username avatar');

    const total = await LiveStream.countDocuments({ hostId: userId });

    res.json({
      success: true,
      data: {
        streams: streams.map(stream => ({
          id: stream._id,
          title: stream.title,
          category: stream.category,
          status: stream.status,
          currentViewers: stream.currentViewers,
          totalViewers: stream.totalViewers,
          totalCoins: stream.totalCoins,
          totalLikes: stream.totalLikes,
          thumbnail: stream.thumbnail,
          startedAt: stream.startedAt,
          endedAt: stream.endedAt,
          duration: stream.duration,
          createdAt: stream.createdAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get user streams failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user streams'
    });
  }
});

export default router;
