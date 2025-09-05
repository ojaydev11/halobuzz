import express from 'express';
import { body, validationResult } from 'express-validator';
import { Gift } from '../models/Gift';
import { Festival } from '../models/Festival';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Transaction } from '../models/Transaction';
import { reputationService } from '../services/ReputationService';
import { logger } from '../config/logger';
import { emitGift } from '../realtime/emitters';

const router = express.Router();

// Get gifts list
router.get('/', async (req, res) => {
  try {
    const {
      category,
      rarity,
      priceMin,
      priceMax,
      limit = 50,
      page = 1,
      sortBy = 'popularity'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const filter: any = { isActive: true };

    if (category) filter.category = category;
    if (rarity) filter.rarity = rarity;
    if (priceMin || priceMax) {
      filter.priceCoins = {};
      if (priceMin) filter.priceCoins.$gte = parseInt(priceMin as string);
      if (priceMax) filter.priceCoins.$lte = parseInt(priceMax as string);
    }

    let sortCriteria: any = {};
    switch (sortBy) {
      case 'price':
        sortCriteria = { priceCoins: 1 };
        break;
      case 'rarity':
        sortCriteria = { rarity: 1 };
        break;
      case 'popularity':
      default:
        sortCriteria = { 'stats.popularity': -1 };
        break;
    }

    const [activeGifts, activeFestivals] = await Promise.all([
      Gift.find(filter)
        .sort(sortCriteria)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Festival.find({ isActive: true, startDate: { $lte: new Date() }, endDate: { $gte: new Date() } })
    ]);

    // Merge festival gifts if within festival dates
    const festivalGiftIds = new Set<string>();
    const festivalGifts: any[] = [];
    for (const fest of activeFestivals as any[]) {
      for (const gift of (fest.gifts || [])) {
        const id = (gift._id || gift).toString();
        festivalGiftIds.add(id);
        festivalGifts.push(gift);
      }
    }

    // Deduplicate by id, prefer active gift doc details when available
    const activeById = new Map(activeGifts.map(g => [g._id.toString(), g]));
    const mergedMap = new Map<string, any>();
    for (const g of activeGifts) mergedMap.set(g._id.toString(), g);
    for (const g of festivalGifts) {
      const id = (g._id || g).toString();
      if (!mergedMap.has(id)) {
        mergedMap.set(id, activeById.get(id) || g);
      }
    }
    const gifts = Array.from(mergedMap.values());
    const total = gifts.length;

    res.json({
      success: true,
      data: {
        gifts: gifts.map(gift => ({
          id: gift._id,
          name: gift.name,
          description: gift.description,
          icon: gift.icon,
          animation: gift.animation,
          priceCoins: gift.priceCoins,
          priceUSD: gift.priceUSD,
          category: gift.category,
          rarity: gift.rarity,
          isLimited: gift.isLimited,
          limitedQuantity: gift.limitedQuantity,
          soldQuantity: gift.soldQuantity,
          effects: gift.effects,
          stats: gift.stats,
          ogTierRequired: gift.ogTierRequired
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
    logger.error('Get gifts failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gifts'
    });
  }
});

// Get popular gifts
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const gifts = await Gift.find({ isActive: true }).sort({ sentCount: -1, totalRevenue: -1 }).limit(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        gifts: gifts.map(gift => ({
          id: gift._id,
          name: gift.name,
          icon: gift.icon,
          priceCoins: gift.priceCoins,
          category: gift.category,
          rarity: gift.rarity,
          stats: gift.stats
        }))
      }
    });

  } catch (error) {
    logger.error('Get popular gifts failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular gifts'
    });
  }
});

// Get gift by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const gift = await Gift.findById(id);
    if (!gift) {
      return res.status(404).json({
        success: false,
        error: 'Gift not found'
      });
    }

    res.json({
      success: true,
      data: {
        gift: {
          id: gift._id,
          name: gift.name,
          description: gift.description,
          icon: gift.icon,
          animation: gift.animation,
          priceCoins: gift.priceCoins,
          priceUSD: gift.priceUSD,
          category: gift.category,
          rarity: gift.rarity,
          isLimited: gift.isLimited,
          limitedQuantity: gift.limitedQuantity,
          soldQuantity: gift.soldQuantity,
          effects: gift.effects,
          stats: gift.stats,
          ogTierRequired: gift.ogTierRequired,
          festivalId: gift.festivalId
        }
      }
    });

  } catch (error) {
    logger.error('Get gift failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gift'
    });
  }
});

// Send gift to stream
router.post('/:streamId/gift', [
  body('giftId')
    .isMongoId()
    .withMessage('Valid gift ID is required'),
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be 1-100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { streamId } = req.params;
    const { giftId, quantity = 1 } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate stream
    const stream = await LiveStream.findById(streamId);
    if (!stream) {
      return res.status(404).json({
        success: false,
        error: 'Stream not found'
      });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({
        success: false,
        error: 'Stream is not live'
      });
    }

    // Validate gift
    const gift = await Gift.findById(giftId);
    if (!gift) {
      return res.status(404).json({
        success: false,
        error: 'Gift not found'
      });
    }

    if (!gift.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Gift is not available'
      });
    }

    // Check OG tier requirement
    if (gift.ogTierRequired && user.ogLevel < gift.ogTierRequired) {
      return res.status(403).json({
        success: false,
        error: `OG Tier ${gift.ogTierRequired} required for this gift`
      });
    }

    // Check limited quantity
    if (gift.isLimited && gift.soldQuantity >= gift.limitedQuantity!) {
      return res.status(400).json({
        success: false,
        error: 'Gift is sold out'
      });
    }

    const totalCost = gift.priceCoins * quantity;

    // Check user balance
    if (user.coins?.balance < totalCost) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coins'
      });
    }

    // Deduct coins from user
    await User.findByIdAndUpdate(userId, {
      $inc: { 
        'coins.balance': -totalCost,
        'coins.totalSpent': totalCost
      }
    });

    // Add coins to stream host
    await User.findByIdAndUpdate(stream.hostId, {
      $inc: { 
        'coins.balance': totalCost,
        'coins.totalEarned': totalCost
      }
    });

    // Update stream metrics
    (stream as any).addGift(totalCost);
    await stream.save();

    // Update gift stats
    (gift as any).incrementSent(totalCost);
    await gift.save();

    // Create transaction records
    const senderTransaction = new Transaction({
      userId,
      type: 'gift_sent',
      amount: totalCost,
      currency: 'coins',
      status: 'completed',
      description: `Sent ${quantity}x ${gift.name} to stream`,
      metadata: {
        giftId: gift._id,
        streamId: stream._id,
        quantity,
        giftName: gift.name
      },
      netAmount: totalCost
    });
    await senderTransaction.save();

    const receiverTransaction = new Transaction({
      userId: stream.hostId,
      type: 'gift_received',
      amount: totalCost,
      currency: 'coins',
      status: 'completed',
      description: `Received ${quantity}x ${gift.name} from ${user.username}`,
      metadata: {
        giftId: gift._id,
        streamId: stream._id,
        quantity,
        giftName: gift.name,
        senderId: userId,
        senderUsername: user.username
      },
      netAmount: totalCost
    });
    await receiverTransaction.save();

    // Apply reputation changes
    await reputationService.applyReputationDelta(userId, 'gift_sent', {
      coins: totalCost,
      giftId: gift._id,
      streamId: stream._id
    });

    await reputationService.applyReputationDelta(stream.hostId.toString(), 'gift_received', {
      coins: totalCost,
      giftId: gift._id,
      streamId: stream._id
    });

    // Emit gift event to WebSocket clients
    emitGift(stream.agoraChannel, {
      from: userId,
      fromUsername: user.username,
      giftId: gift._id.toString(),
      qty: quantity,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: 'Gift sent successfully',
      data: {
        gift: {
          id: gift._id,
          name: gift.name,
          icon: gift.icon,
          animation: gift.animation,
          quantity,
          totalCost,
          effects: gift.effects
        },
        stream: {
          id: stream._id,
          totalCoins: stream.totalCoins,
          totalGifts: stream.totalGifts
        },
        user: {
          newBalance: (user.coins?.balance || 0) - totalCost
        }
      }
    });

  } catch (error) {
    logger.error('Send gift failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send gift'
    });
  }
});

// Get gifts by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const gifts = await Gift.find({ category, isActive: true }).sort({ sentCount: -1 });
    const limitedGifts = gifts.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        category,
        gifts: limitedGifts.map(gift => ({
          id: gift._id,
          name: gift.name,
          icon: gift.icon,
          priceCoins: gift.priceCoins,
          rarity: gift.rarity,
          stats: gift.stats
        }))
      }
    });

  } catch (error) {
    logger.error('Get gifts by category failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gifts by category'
    });
  }
});

export default router;
