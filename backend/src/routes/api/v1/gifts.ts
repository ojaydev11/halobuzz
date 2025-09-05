import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, authMiddleware } from '../../../middleware/auth';
import { Gift } from '../../../models/Gift';
import { User } from '../../../models/User';
import { LiveStream } from '../../../models/LiveStream';
import { Transaction } from '../../../models/Transaction';
import { logger } from '../../../config/logger';
import { giftRateLimiter } from '../../../middleware/rateLimiter';
import { metricsService } from '../../../services/MetricsService';
import { socketService } from '../../../services/SocketService';
import { connectRedis } from '../../../config/redis';

const router = express.Router();

/**
 * POST /api/v1/gifts/send
 * Send a gift to a live stream
 */
router.post('/send', [
  authMiddleware,
  giftRateLimiter, // 30 gifts per minute per user
  body('streamId')
    .isMongoId()
    .withMessage('Valid stream ID required'),
  body('giftId')
    .isMongoId()
    .withMessage('Valid gift ID required'),
  body('quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    const { streamId, giftId, quantity = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get user, gift, and stream
    const [user, gift, stream] = await Promise.all([
      User.findById(userId),
      Gift.findById(giftId),
      LiveStream.findById(streamId).populate('hostId', 'username')
    ]);

    // Validate entities exist
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!gift || !gift.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Gift not available'
      });
    }

    if (!stream || stream.status !== 'live') {
      return res.status(404).json({
        success: false,
        error: 'Stream is not live'
      });
    }

    // Check OG tier requirement
    if (gift.ogTierRequired && user.ogLevel < gift.ogTierRequired) {
      return res.status(403).json({
        success: false,
        error: `This gift requires OG Level ${gift.ogTierRequired}`
      });
    }

    // Calculate total cost
    const totalCost = gift.priceCoins * quantity;

    // Check user balance
    if ((user.coins?.balance || 0) < totalCost) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coin balance',
        required: totalCost,
        balance: user.coins?.balance || 0
      });
    }

    // Deduct coins from sender
    user.coins.balance -= totalCost;
    user.coins.totalSpent += totalCost;
    await user.save();

    // Add coins to host (with platform fee)
    const platformFee = 0.3; // 30% platform fee
    const hostEarnings = Math.floor(totalCost * (1 - platformFee));
    
    const host = await User.findById(stream.hostId);
    if (host) {
      host.coins.balance += hostEarnings;
      host.coins.totalEarned += hostEarnings;
      await host.save();
    }

    // Update gift statistics
    gift.incrementSent(totalCost);
    await gift.save();

    // Update stream statistics
    stream.totalGifts += quantity;
    stream.totalCoins += totalCost;
    await stream.save();

    // Create transaction records
    await Transaction.create([
      {
        userId: userId,
        type: 'gift_sent',
        amount: -totalCost,
        currency: 'COINS',
        status: 'completed',
        description: `Sent ${quantity}x ${gift.name} to ${stream.hostId.username}`,
        metadata: {
          giftId,
          streamId,
          quantity,
          recipientId: stream.hostId._id
        }
      },
      {
        userId: stream.hostId._id,
        type: 'gift_received',
        amount: hostEarnings,
        currency: 'COINS',
        status: 'completed',
        description: `Received ${quantity}x ${gift.name} from ${user.username}`,
        metadata: {
          giftId,
          streamId,
          quantity,
          senderId: userId,
          platformFee: totalCost - hostEarnings
        }
      }
    ]);

    // Update leaderboard in Redis
    const redis = await connectRedis();
    const leaderboardKey = `leaderboard:stream:${streamId}`;
    await redis.zincrby(leaderboardKey, totalCost, `${userId}:${user.username}`);
    await redis.expire(leaderboardKey, 86400); // Expire after 24 hours

    // Broadcast gift event via WebSocket
    socketService.broadcastToStream(streamId, 'gift', {
      sender: {
        id: userId,
        username: user.username,
        ogLevel: user.ogLevel
      },
      gift: {
        id: giftId,
        name: gift.name,
        icon: gift.icon,
        animation: gift.animation,
        quantity
      },
      value: totalCost,
      timestamp: new Date()
    });

    // Track metrics
    metricsService.incrementCounter('gift_send_total', {
      gift_type: gift.category
    });
    metricsService.recordHistogram('gift_value_coins', totalCost);
    metricsService.incrementCounter('gift_revenue_total', {}, hostEarnings);

    // Log gift transaction
    logger.info('Gift sent successfully', {
      userId,
      streamId,
      giftId,
      quantity,
      totalCost,
      hostEarnings
    });

    res.status(200).json({
      success: true,
      message: 'Gift sent successfully',
      data: {
        transactionId: `gift_${Date.now()}`,
        giftName: gift.name,
        quantity,
        totalCost,
        newBalance: user.coins.balance,
        animation: gift.animation
      }
    });

  } catch (error: any) {
    logger.error('Failed to send gift:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send gift'
    });
  }
});

/**
 * GET /api/v1/leaderboards/live/:streamId
 * Get live stream gift leaderboard
 */
router.get('/leaderboards/live/:streamId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { streamId } = req.params;
    const { limit = 10 } = req.query;

    // Validate stream exists
    const stream = await LiveStream.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found'
      });
    }

    // Get leaderboard from Redis
    const redis = await connectRedis();
    const leaderboardKey = `leaderboard:stream:${streamId}`;
    
    // Get top gifters with scores
    const topGifters = await redis.zrevrange(
      leaderboardKey, 
      0, 
      Number(limit) - 1,
      'WITHSCORES'
    );

    // Parse leaderboard data
    const leaderboard = [];
    for (let i = 0; i < topGifters.length; i += 2) {
      const [userId, username] = topGifters[i].split(':');
      const score = parseInt(topGifters[i + 1]);
      
      // Get user details
      const user = await User.findById(userId).select('username avatar ogLevel');
      
      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        user: {
          id: userId,
          username: user?.username || username,
          avatar: user?.avatar,
          ogLevel: user?.ogLevel || 0
        },
        totalGifted: score
      });
    }

    // Get stream stats
    const stats = {
      totalGifts: stream.totalGifts,
      totalCoins: stream.totalCoins,
      uniqueGifters: leaderboard.length,
      topGifter: leaderboard[0] || null
    };

    res.status(200).json({
      success: true,
      data: {
        streamId,
        leaderboard,
        stats,
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    logger.error('Failed to get leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

/**
 * GET /api/v1/gifts
 * Get available gifts
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, minPrice, maxPrice, rarity } = req.query;
    const userId = req.user?.userId;

    // Build query
    const query: any = { isActive: true };
    if (category) query.category = category;
    if (rarity) query.rarity = rarity;
    if (minPrice || maxPrice) {
      query.priceCoins = {};
      if (minPrice) query.priceCoins.$gte = Number(minPrice);
      if (maxPrice) query.priceCoins.$lte = Number(maxPrice);
    }

    // Get user's OG level for filtering
    let userOgLevel = 0;
    if (userId) {
      const user = await User.findById(userId).select('ogLevel');
      userOgLevel = user?.ogLevel || 0;
    }

    // Get gifts
    const gifts = await Gift.find(query)
      .sort({ 'stats.popularity': -1 })
      .lean();

    // Filter by OG requirements and add availability
    const availableGifts = gifts.map(gift => ({
      ...gift,
      available: !gift.ogTierRequired || userOgLevel >= gift.ogTierRequired,
      lockedReason: gift.ogTierRequired && userOgLevel < gift.ogTierRequired
        ? `Requires OG Level ${gift.ogTierRequired}`
        : null
    }));

    res.status(200).json({
      success: true,
      data: availableGifts
    });

  } catch (error: any) {
    logger.error('Failed to get gifts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gifts'
    });
  }
});

/**
 * GET /api/v1/gifts/categories
 * Get gift categories with counts
 */
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await Gift.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          minPrice: { $min: '$priceCoins' },
          maxPrice: { $max: '$priceCoins' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: categories.map(cat => ({
        category: cat._id,
        count: cat.count,
        priceRange: {
          min: cat.minPrice,
          max: cat.maxPrice
        }
      }))
    });

  } catch (error: any) {
    logger.error('Failed to get gift categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
});

/**
 * GET /api/v1/gifts/popular
 * Get popular gifts
 */
router.get('/popular', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const popularGifts = await Gift.findPopular(Number(limit));

    res.status(200).json({
      success: true,
      data: popularGifts
    });

  } catch (error: any) {
    logger.error('Failed to get popular gifts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular gifts'
    });
  }
});

export default router;