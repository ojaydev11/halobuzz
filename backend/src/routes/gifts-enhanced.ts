import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

// Mock gifts data
const mockGifts = [
  {
    id: 'gift_1',
    name: 'Rose',
    emoji: '🌹',
    price: 1,
    rarity: 'common',
    animation: 'float',
    sound: 'gentle',
    description: 'A beautiful rose for your favorite streamer',
    category: 'romance',
    isActive: true,
    maxQuantity: 999,
  },
  {
    id: 'gift_2',
    name: 'Heart',
    emoji: '❤️',
    price: 5,
    rarity: 'common',
    animation: 'bounce',
    sound: 'heartbeat',
    description: 'Show your love with a heart',
    category: 'love',
    isActive: true,
    maxQuantity: 99,
  },
  {
    id: 'gift_3',
    name: 'Crown',
    emoji: '👑',
    price: 50,
    rarity: 'rare',
    animation: 'sparkle',
    sound: 'royal',
    description: 'A royal crown for the king/queen of streaming',
    category: 'royalty',
    isActive: true,
    maxQuantity: 10,
  },
  {
    id: 'gift_4',
    name: 'Diamond',
    emoji: '💎',
    price: 100,
    rarity: 'epic',
    animation: 'shine',
    sound: 'crystal',
    description: 'A precious diamond for special moments',
    category: 'luxury',
    isActive: true,
    maxQuantity: 5,
  },
  {
    id: 'gift_5',
    name: 'Rocket',
    emoji: '🚀',
    price: 200,
    rarity: 'legendary',
    animation: 'launch',
    sound: 'rocket',
    description: 'Launch your support to the moon!',
    category: 'epic',
    isActive: true,
    maxQuantity: 3,
  },
  {
    id: 'gift_6',
    name: 'Rainbow',
    emoji: '🌈',
    price: 500,
    rarity: 'legendary',
    animation: 'rainbow',
    sound: 'magical',
    description: 'A magical rainbow that lights up the stream',
    category: 'magic',
    isActive: true,
    maxQuantity: 1,
  },
];

// Mock gift transactions
const mockGiftTransactions = [
  {
    id: 'tx_1',
    giftId: 'gift_1',
    giftName: 'Rose',
    senderId: 'user_1',
    senderName: 'Viewer1',
    recipientId: 'streamer_1',
    recipientName: 'GamerPro',
    quantity: 5,
    totalPrice: 5,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    message: 'Great stream!',
  },
  {
    id: 'tx_2',
    giftId: 'gift_3',
    giftName: 'Crown',
    senderId: 'user_2',
    senderName: 'Viewer2',
    recipientId: 'streamer_1',
    recipientName: 'GamerPro',
    quantity: 1,
    totalPrice: 50,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    message: 'You deserve this crown!',
  },
];

// Mock creator earnings
const mockCreatorEarnings = {
  'streamer_1': {
    totalEarnings: 1250,
    todayEarnings: 150,
    thisWeekEarnings: 800,
    thisMonthEarnings: 1200,
    giftCount: 45,
    topGift: 'Crown',
    recentTransactions: mockGiftTransactions.slice(0, 5),
  },
};

// GET /gifts - Get all available gifts
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, rarity, minPrice, maxPrice, limit = 50, offset = 0 } = req.query;
    
    logger.info('Fetching gifts', { category, rarity, minPrice, maxPrice });
    
    let filteredGifts = mockGifts.filter(gift => gift.isActive);
    
    // Apply filters
    if (category && category !== 'all') {
      filteredGifts = filteredGifts.filter(gift => gift.category === category);
    }
    
    if (rarity && rarity !== 'all') {
      filteredGifts = filteredGifts.filter(gift => gift.rarity === rarity);
    }
    
    if (minPrice) {
      filteredGifts = filteredGifts.filter(gift => gift.price >= Number(minPrice));
    }
    
    if (maxPrice) {
      filteredGifts = filteredGifts.filter(gift => gift.price <= Number(maxPrice));
    }
    
    // Apply pagination
    const paginatedGifts = filteredGifts.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      gifts: paginatedGifts,
      total: filteredGifts.length,
      categories: ['all', 'romance', 'love', 'royalty', 'luxury', 'epic', 'magic'],
      rarities: ['all', 'common', 'rare', 'epic', 'legendary'],
    });
  } catch (error) {
    logger.error('Error fetching gifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gifts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /gifts/send - Send a gift
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { 
      giftId, 
      recipientId, 
      quantity = 1, 
      message = '', 
      senderId 
    } = req.body;
    
    logger.info('Sending gift', { giftId, recipientId, quantity, senderId });
    
    // Validate required fields
    if (!giftId || !recipientId || !senderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: giftId, recipientId, senderId',
      });
    }
    
    // Find the gift
    const gift = mockGifts.find(g => g.id === giftId);
    if (!gift) {
      return res.status(404).json({
        success: false,
        message: 'Gift not found',
      });
    }
    
    // Check if gift is active
    if (!gift.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Gift is not available',
      });
    }
    
    // Check quantity limit
    if (quantity > gift.maxQuantity) {
      return res.status(400).json({
        success: false,
        message: `Maximum quantity allowed: ${gift.maxQuantity}`,
      });
    }
    
    // Calculate total price
    const totalPrice = gift.price * quantity;
    
    // Check sender's balance (in real app, check actual balance)
    const senderBalance = 1000; // Mock balance
    if (senderBalance < totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        required: totalPrice,
        available: senderBalance,
      });
    }
    
    // Create gift transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction = {
      id: transactionId,
      giftId,
      giftName: gift.name,
      senderId,
      senderName: 'CurrentUser', // In real app, get from user data
      recipientId,
      recipientName: 'RecipientUser', // In real app, get from user data
      quantity,
      totalPrice,
      timestamp: new Date().toISOString(),
      message,
    };
    
    // Add to mock transactions
    mockGiftTransactions.unshift(transaction);
    
    // Update creator earnings (in real app, update database)
    if (!mockCreatorEarnings[recipientId]) {
      mockCreatorEarnings[recipientId] = {
        totalEarnings: 0,
        todayEarnings: 0,
        thisWeekEarnings: 0,
        thisMonthEarnings: 0,
        giftCount: 0,
        topGift: '',
        recentTransactions: [],
      };
    }
    
    mockCreatorEarnings[recipientId].totalEarnings += totalPrice;
    mockCreatorEarnings[recipientId].todayEarnings += totalPrice;
    mockCreatorEarnings[recipientId].thisWeekEarnings += totalPrice;
    mockCreatorEarnings[recipientId].thisMonthEarnings += totalPrice;
    mockCreatorEarnings[recipientId].giftCount += quantity;
    mockCreatorEarnings[recipientId].recentTransactions.unshift(transaction);
    
    res.json({
      success: true,
      transaction,
      message: `Gift sent successfully! ${gift.emoji} x${quantity}`,
    });
  } catch (error) {
    logger.error('Error sending gift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send gift',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /gifts/transactions - Get gift transactions
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { userId, type = 'all', limit = 20, offset = 0 } = req.query;
    
    logger.info('Fetching gift transactions', { userId, type });
    
    let filteredTransactions = mockGiftTransactions;
    
    // Filter by user
    if (userId) {
      if (type === 'sent') {
        filteredTransactions = filteredTransactions.filter(tx => tx.senderId === userId);
      } else if (type === 'received') {
        filteredTransactions = filteredTransactions.filter(tx => tx.recipientId === userId);
      } else {
        filteredTransactions = filteredTransactions.filter(
          tx => tx.senderId === userId || tx.recipientId === userId
        );
      }
    }
    
    // Apply pagination
    const paginatedTransactions = filteredTransactions.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      transactions: paginatedTransactions,
      total: filteredTransactions.length,
    });
  } catch (error) {
    logger.error('Error fetching gift transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gift transactions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /gifts/earnings/:userId - Get creator earnings
router.get('/earnings/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    logger.info('Fetching creator earnings', { userId });
    
    const earnings = mockCreatorEarnings[userId] || {
      totalEarnings: 0,
      todayEarnings: 0,
      thisWeekEarnings: 0,
      thisMonthEarnings: 0,
      giftCount: 0,
      topGift: '',
      recentTransactions: [],
    };
    
    res.json({
      success: true,
      earnings,
    });
  } catch (error) {
    logger.error('Error fetching creator earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch creator earnings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /gifts/leaderboard - Get top gifters leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { period = 'all', limit = 10 } = req.query;
    
    logger.info('Fetching gifters leaderboard', { period });
    
    // Calculate leaderboard from transactions
    const gifterStats = new Map();
    
    mockGiftTransactions.forEach(tx => {
      const key = tx.senderId;
      if (!gifterStats.has(key)) {
        gifterStats.set(key, {
          userId: key,
          username: tx.senderName,
          totalSpent: 0,
          giftCount: 0,
          topGift: '',
        });
      }
      
      const stats = gifterStats.get(key);
      stats.totalSpent += tx.totalPrice;
      stats.giftCount += tx.quantity;
      
      if (!stats.topGift || tx.totalPrice > stats.totalSpent) {
        stats.topGift = tx.giftName;
      }
    });
    
    // Convert to array and sort
    const leaderboard = Array.from(gifterStats.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, Number(limit));
    
    res.json({
      success: true,
      leaderboard,
      period,
    });
  } catch (error) {
    logger.error('Error fetching gifters leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gifters leaderboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

