import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { coinLedger } from './CoinLedgerService';
import { CoinWallet } from '@/models/CoinWallet';
import { CoinEconomyConfig } from '@/models/CoinEconomyConfig';
import { CoinTransaction } from '@/models/CoinTransaction';

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  price: number; // In coins
  hostEarning: number; // Coins host receives
  animation: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requiredOGLevel: number;
  isSpecialEvent?: boolean;
  eventId?: string;
  category: 'basic' | 'premium' | 'seasonal' | 'vip';
  effects?: {
    sound?: string;
    screenEffect?: string;
    duration?: number; // milliseconds
    vibration?: boolean;
  };
}

export interface GiftRequest {
  senderId: string;
  recipientId: string;
  giftId: string;
  quantity: number;
  context: {
    liveStreamId?: string;
    gameSessionId?: string;
    message?: string;
    isAnonymous?: boolean;
    roomId?: string;
    eventType?: 'stream' | 'game' | 'direct_message';
  };
  geoLocation?: any;
  deviceInfo?: any;
}

export interface GiftTransaction {
  id: string;
  giftRequest: GiftRequest;
  gift: Gift;
  totalCost: number;
  hostEarnings: number;
  platformFee: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  processedAt?: Date;
  createdAt: Date;
}

export interface GiftingStats {
  totalGiftsSent: number;
  totalGiftsReceived: number;
  totalCoinsSpent: number;
  totalCoinsEarned: number;
  favoriteGifts: string[];
  topRecipients: string[];
  giftingStreak: number;
  lastGiftAt?: Date;
}

export interface LiveStreamGifting {
  streamId: string;
  hostId: string;
  totalGiftsReceived: number;
  totalEarnings: number;
  topGifters: {
    userId: string;
    username?: string;
    totalSpent: number;
    giftCount: number;
  }[];
  recentGifts: {
    senderId: string;
    senderName?: string;
    gift: Gift;
    quantity: number;
    timestamp: Date;
    isAnonymous: boolean;
  }[];
  giftingGoals: {
    target: number;
    current: number;
    reward?: string;
  }[];
}

/**
 * Gifting Service - Handles all gift transactions in live streams, games, and direct messages
 * Supports real-time gifting with animations, host earnings, and spectator engagement
 */
export class GiftingService extends EventEmitter {
  private static instance: GiftingService;
  private availableGifts: Map<string, Gift> = new Map();
  private activeStreams: Map<string, LiveStreamGifting> = new Map();
  private giftingStats: Map<string, GiftingStats> = new Map();
  private specialEvents: Map<string, any> = new Map();

  private constructor() {
    super();
    this.initializeGifts();
    this.startGiftingAnalytics();
    this.startSpecialEventMonitoring();
  }

  static getInstance(): GiftingService {
    if (!GiftingService.instance) {
      GiftingService.instance = new GiftingService();
    }
    return GiftingService.instance;
  }

  /**
   * Initialize available gifts catalog
   */
  private async initializeGifts(): Promise<void> {
    try {
      const config = await CoinEconomyConfig.getCurrentConfig();

      // Load gifts from configuration
      if (config.gifting && config.gifting.gifts) {
        config.gifting.gifts.forEach(giftConfig => {
          const gift: Gift = {
            id: giftConfig.id,
            name: giftConfig.name,
            emoji: giftConfig.emoji,
            price: giftConfig.price,
            hostEarning: giftConfig.hostEarning,
            animation: giftConfig.animation,
            rarity: giftConfig.rarity,
            requiredOGLevel: giftConfig.requiredOGLevel,
            category: this.determineGiftCategory(giftConfig.price),
            effects: this.getGiftEffects(giftConfig.rarity)
          };
          this.availableGifts.set(gift.id, gift);
        });
      } else {
        // Initialize default gifts if config is empty
        await this.initializeDefaultGifts();
      }

      logger.info(`Initialized ${this.availableGifts.size} gifts`);
    } catch (error) {
      logger.error('Error initializing gifts:', error);
      await this.initializeDefaultGifts();
    }
  }

  /**
   * Initialize default gift catalog
   */
  private async initializeDefaultGifts(): Promise<void> {
    const defaultGifts: Gift[] = [
      // Basic Gifts (1-100 coins)
      {
        id: 'heart',
        name: 'Heart',
        emoji: '❤️',
        price: 5,
        hostEarning: 4,
        animation: 'floating_hearts',
        rarity: 'common',
        requiredOGLevel: 0,
        category: 'basic',
        effects: { sound: 'heart_beat', duration: 2000 }
      },
      {
        id: 'rose',
        name: 'Rose',
        emoji: '🌹',
        price: 25,
        hostEarning: 20,
        animation: 'falling_petals',
        rarity: 'common',
        requiredOGLevel: 0,
        category: 'basic',
        effects: { sound: 'romantic', duration: 3000 }
      },
      {
        id: 'thumbs_up',
        name: 'Thumbs Up',
        emoji: '👍',
        price: 10,
        hostEarning: 8,
        animation: 'bouncing_thumb',
        rarity: 'common',
        requiredOGLevel: 0,
        category: 'basic',
        effects: { sound: 'positive', duration: 1500 }
      },
      {
        id: 'clap',
        name: 'Applause',
        emoji: '👏',
        price: 50,
        hostEarning: 40,
        animation: 'clapping_hands',
        rarity: 'common',
        requiredOGLevel: 0,
        category: 'basic',
        effects: { sound: 'applause', duration: 4000 }
      },

      // Premium Gifts (100-1000 coins)
      {
        id: 'diamond',
        name: 'Diamond',
        emoji: '💎',
        price: 500,
        hostEarning: 400,
        animation: 'sparkling_diamonds',
        rarity: 'rare',
        requiredOGLevel: 0,
        category: 'premium',
        effects: { sound: 'diamond_sparkle', screenEffect: 'sparkle_burst', duration: 5000, vibration: true }
      },
      {
        id: 'rocket',
        name: 'Rocket',
        emoji: '🚀',
        price: 250,
        hostEarning: 200,
        animation: 'rocket_launch',
        rarity: 'rare',
        requiredOGLevel: 1,
        category: 'premium',
        effects: { sound: 'rocket_launch', screenEffect: 'screen_shake', duration: 4000 }
      },
      {
        id: 'crown',
        name: 'Crown',
        emoji: '👑',
        price: 1000,
        hostEarning: 800,
        animation: 'golden_crown',
        rarity: 'epic',
        requiredOGLevel: 2,
        category: 'premium',
        effects: { sound: 'royal_fanfare', screenEffect: 'golden_particles', duration: 6000, vibration: true }
      },

      // VIP/Legendary Gifts (1000+ coins)
      {
        id: 'dragon',
        name: 'Dragon',
        emoji: '🐉',
        price: 2500,
        hostEarning: 2000,
        animation: 'flying_dragon',
        rarity: 'legendary',
        requiredOGLevel: 3,
        category: 'vip',
        effects: { sound: 'dragon_roar', screenEffect: 'fire_breath', duration: 8000, vibration: true }
      },
      {
        id: 'galaxy',
        name: 'Galaxy',
        emoji: '🌌',
        price: 5000,
        hostEarning: 4000,
        animation: 'swirling_galaxy',
        rarity: 'legendary',
        requiredOGLevel: 4,
        category: 'vip',
        effects: { sound: 'cosmic_whoosh', screenEffect: 'galaxy_warp', duration: 10000, vibration: true }
      },
      {
        id: 'golden_halo',
        name: 'Golden Halo',
        emoji: '😇',
        price: 10000,
        hostEarning: 8000,
        animation: 'divine_halo',
        rarity: 'legendary',
        requiredOGLevel: 5,
        category: 'vip',
        effects: { sound: 'angelic_choir', screenEffect: 'divine_light', duration: 12000, vibration: true }
      },

      // Seasonal/Event Gifts
      {
        id: 'fireworks',
        name: 'Fireworks',
        emoji: '🎆',
        price: 1500,
        hostEarning: 1200,
        animation: 'fireworks_explosion',
        rarity: 'epic',
        requiredOGLevel: 1,
        category: 'seasonal',
        effects: { sound: 'fireworks_boom', screenEffect: 'colorful_explosions', duration: 7000, vibration: true }
      },
      {
        id: 'party_popper',
        name: 'Party Popper',
        emoji: '🎉',
        price: 200,
        hostEarning: 160,
        animation: 'confetti_burst',
        rarity: 'rare',
        requiredOGLevel: 0,
        category: 'seasonal',
        effects: { sound: 'party_horn', screenEffect: 'confetti_rain', duration: 5000 }
      }
    ];

    defaultGifts.forEach(gift => {
      this.availableGifts.set(gift.id, gift);
    });

    logger.info(`Initialized ${defaultGifts.length} default gifts`);
  }

  /**
   * Send a gift to a recipient
   */
  async sendGift(request: GiftRequest): Promise<GiftTransaction> {
    const { senderId, recipientId, giftId, quantity, context } = request;

    // Validate gift
    const gift = this.availableGifts.get(giftId);
    if (!gift) {
      throw new Error('Gift not found');
    }

    // Check sender's wallet and permissions
    const senderWallet = await CoinWallet.findOne({ userId: senderId });
    if (!senderWallet) {
      throw new Error('Sender wallet not found');
    }

    // Check OG level requirement
    if (senderWallet.ogLevel < gift.requiredOGLevel) {
      throw new Error(`OG Level ${gift.requiredOGLevel} required for this gift`);
    }

    // Calculate costs
    const totalCost = gift.price * quantity;
    const hostEarnings = gift.hostEarning * quantity;
    const platformFee = totalCost - hostEarnings;

    // Check if sender can afford the gift
    if (!senderWallet.canSpend(totalCost)) {
      throw new Error('Insufficient balance');
    }

    // Check daily gifting limits
    const today = new Date().toDateString();
    const todayUsage = senderWallet.dailyUsage.find(u => u.date.toDateString() === today);
    const dailyGifted = todayUsage?.gifted || 0;

    if (dailyGifted + totalCost > senderWallet.dailyLimits.gifting) {
      throw new Error('Daily gifting limit exceeded');
    }

    // Check special event requirements
    if (gift.isSpecialEvent && gift.eventId) {
      const eventActive = await this.isEventActive(gift.eventId);
      if (!eventActive) {
        throw new Error('Special event gift is not currently available');
      }
    }

    try {
      // Create gift transaction
      const giftTransaction: GiftTransaction = {
        id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        giftRequest: request,
        gift,
        totalCost,
        hostEarnings,
        platformFee,
        status: 'pending',
        createdAt: new Date()
      };

      // Process sender transaction (deduct coins)
      await coinLedger.processTransaction({
        userId: senderId,
        targetUserId: recipientId,
        type: 'gift_sent',
        amount: totalCost,
        source: 'gift',
        destination: 'host_earnings',
        context: {
          giftId,
          giftName: gift.name,
          quantity,
          transactionId: giftTransaction.id,
          ...context
        },
        geoLocation: request.geoLocation,
        deviceInfo: request.deviceInfo
      });

      // Process recipient transaction (credit coins)
      await coinLedger.processTransaction({
        userId: recipientId,
        targetUserId: senderId,
        type: 'gift_received',
        amount: hostEarnings,
        source: 'gift',
        destination: 'wallet',
        context: {
          giftId,
          giftName: gift.name,
          quantity,
          transactionId: giftTransaction.id,
          fromUserId: senderId,
          ...context
        }
      });

      // Update transaction status
      giftTransaction.status = 'completed';
      giftTransaction.processedAt = new Date();

      // Update gifting statistics
      await this.updateGiftingStats(senderId, recipientId, gift, quantity, totalCost, hostEarnings);

      // Update live stream data if applicable
      if (context.liveStreamId) {
        await this.updateLiveStreamGifting(context.liveStreamId, recipientId, senderId, gift, quantity, request.context.isAnonymous || false);
      }

      // Emit events for real-time updates
      this.emit('giftSent', {
        senderId,
        recipientId,
        gift,
        quantity,
        totalCost,
        hostEarnings,
        context,
        timestamp: new Date()
      });

      // Special handling for high-value gifts
      if (totalCost >= 1000) {
        this.emit('highValueGift', {
          senderId,
          recipientId,
          gift,
          quantity,
          totalCost,
          context
        });
      }

      logger.info(`Gift sent: ${senderId} -> ${recipientId} | ${gift.name} x${quantity} (${totalCost} coins)`);

      return giftTransaction;

    } catch (error) {
      logger.error('Error processing gift transaction:', error);
      throw error;
    }
  }

  /**
   * Get available gifts for a user
   */
  async getAvailableGifts(userId: string): Promise<Gift[]> {
    const wallet = await CoinWallet.findOne({ userId });
    const userOGLevel = wallet?.ogLevel || 0;

    const availableGifts = Array.from(this.availableGifts.values())
      .filter(gift => {
        // Check OG level requirement
        if (gift.requiredOGLevel > userOGLevel) {
          return false;
        }

        // Check special event availability
        if (gift.isSpecialEvent && gift.eventId) {
          // Would check if event is active
          return false; // For now, exclude special events
        }

        return true;
      })
      .sort((a, b) => a.price - b.price);

    return availableGifts;
  }

  /**
   * Get live stream gifting information
   */
  async getLiveStreamGifting(streamId: string): Promise<LiveStreamGifting | null> {
    return this.activeStreams.get(streamId) || null;
  }

  /**
   * Start live stream gifting session
   */
  async startLiveStreamGifting(streamId: string, hostId: string): Promise<LiveStreamGifting> {
    const streamGifting: LiveStreamGifting = {
      streamId,
      hostId,
      totalGiftsReceived: 0,
      totalEarnings: 0,
      topGifters: [],
      recentGifts: [],
      giftingGoals: [
        { target: 1000, current: 0, reward: 'Special Dance' },
        { target: 5000, current: 0, reward: 'Karaoke Song' },
        { target: 10000, current: 0, reward: 'Game with Viewers' }
      ]
    };

    this.activeStreams.set(streamId, streamGifting);
    this.emit('streamGiftingStarted', { streamId, hostId });

    return streamGifting;
  }

  /**
   * End live stream gifting session
   */
  async endLiveStreamGifting(streamId: string): Promise<void> {
    const streamData = this.activeStreams.get(streamId);
    if (streamData) {
      this.emit('streamGiftingEnded', {
        streamId,
        totalEarnings: streamData.totalEarnings,
        totalGifts: streamData.totalGiftsReceived,
        topGifters: streamData.topGifters.slice(0, 5)
      });

      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Get user's gifting statistics
   */
  async getUserGiftingStats(userId: string): Promise<GiftingStats> {
    let stats = this.giftingStats.get(userId);

    if (!stats) {
      // Build stats from transaction history
      stats = await this.buildGiftingStats(userId);
      this.giftingStats.set(userId, stats);
    }

    return stats;
  }

  /**
   * Get top gifters leaderboard
   */
  async getTopGifters(timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly', limit = 50): Promise<any[]> {
    const timeframeDays = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;
    const since = new Date(Date.now() - (timeframeDays * 24 * 60 * 60 * 1000));

    const topGifters = await CoinTransaction.aggregate([
      {
        $match: {
          type: 'gift_sent',
          status: 'completed',
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalGifted: { $sum: '$amount' },
          giftCount: { $sum: 1 },
          uniqueRecipients: { $addToSet: '$targetUserId' },
          lastGiftAt: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          uniqueRecipientCount: { $size: '$uniqueRecipients' }
        }
      },
      { $sort: { totalGifted: -1 } },
      { $limit: limit }
    ]);

    return topGifters;
  }

  /**
   * Get top gift recipients
   */
  async getTopRecipients(timeframe: 'daily' | 'weekly' | 'monthly' = 'weekly', limit = 50): Promise<any[]> {
    const timeframeDays = timeframe === 'daily' ? 1 : timeframe === 'weekly' ? 7 : 30;
    const since = new Date(Date.now() - (timeframeDays * 24 * 60 * 60 * 1000));

    const topRecipients = await CoinTransaction.aggregate([
      {
        $match: {
          type: 'gift_received',
          status: 'completed',
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalEarned: { $sum: '$amount' },
          giftCount: { $sum: 1 },
          uniqueGifters: { $addToSet: '$targetUserId' },
          lastGiftAt: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          uniqueGifterCount: { $size: '$uniqueGifters' }
        }
      },
      { $sort: { totalEarned: -1 } },
      { $limit: limit }
    ]);

    return topRecipients;
  }

  /**
   * Create special event gifts
   */
  async createSpecialEvent(eventData: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    bonusMultiplier: number;
    specialGifts: Gift[];
  }): Promise<void> {
    this.specialEvents.set(eventData.id, eventData);

    // Add special gifts to available gifts
    eventData.specialGifts.forEach(gift => {
      gift.isSpecialEvent = true;
      gift.eventId = eventData.id;
      this.availableGifts.set(gift.id, gift);
    });

    this.emit('specialEventCreated', eventData);
    logger.info(`Created special event: ${eventData.name} with ${eventData.specialGifts.length} special gifts`);
  }

  /**
   * Private helper methods
   */
  private determineGiftCategory(price: number): Gift['category'] {
    if (price >= 1000) return 'vip';
    if (price >= 100) return 'premium';
    if (price >= 500) return 'seasonal'; // Special pricing for seasonal
    return 'basic';
  }

  private getGiftEffects(rarity: Gift['rarity']): Gift['effects'] {
    const baseEffects: Gift['effects'] = { duration: 2000 };

    switch (rarity) {
      case 'legendary':
        return { ...baseEffects, duration: 8000, vibration: true, screenEffect: 'full_screen' };
      case 'epic':
        return { ...baseEffects, duration: 6000, vibration: true, screenEffect: 'particle_burst' };
      case 'rare':
        return { ...baseEffects, duration: 4000, screenEffect: 'sparkles' };
      case 'common':
      default:
        return baseEffects;
    }
  }

  private async updateGiftingStats(
    senderId: string,
    recipientId: string,
    gift: Gift,
    quantity: number,
    totalCost: number,
    hostEarnings: number
  ): Promise<void> {
    // Update sender stats
    let senderStats = this.giftingStats.get(senderId);
    if (!senderStats) {
      senderStats = await this.buildGiftingStats(senderId);
    }

    senderStats.totalGiftsSent += quantity;
    senderStats.totalCoinsSpent += totalCost;
    senderStats.lastGiftAt = new Date();

    if (!senderStats.topRecipients.includes(recipientId)) {
      senderStats.topRecipients.unshift(recipientId);
      senderStats.topRecipients = senderStats.topRecipients.slice(0, 10);
    }

    this.giftingStats.set(senderId, senderStats);

    // Update recipient stats
    let recipientStats = this.giftingStats.get(recipientId);
    if (!recipientStats) {
      recipientStats = await this.buildGiftingStats(recipientId);
    }

    recipientStats.totalGiftsReceived += quantity;
    recipientStats.totalCoinsEarned += hostEarnings;

    if (!recipientStats.favoriteGifts.includes(gift.id)) {
      recipientStats.favoriteGifts.unshift(gift.id);
      recipientStats.favoriteGifts = recipientStats.favoriteGifts.slice(0, 10);
    }

    this.giftingStats.set(recipientId, recipientStats);
  }

  private async updateLiveStreamGifting(
    streamId: string,
    hostId: string,
    senderId: string,
    gift: Gift,
    quantity: number,
    isAnonymous: boolean
  ): Promise<void> {
    let streamData = this.activeStreams.get(streamId);
    if (!streamData) {
      streamData = await this.startLiveStreamGifting(streamId, hostId);
    }

    const totalCost = gift.price * quantity;
    const hostEarnings = gift.hostEarning * quantity;

    // Update stream totals
    streamData.totalGiftsReceived += quantity;
    streamData.totalEarnings += hostEarnings;

    // Update top gifters
    let gifterIndex = streamData.topGifters.findIndex(g => g.userId === senderId);
    if (gifterIndex === -1) {
      streamData.topGifters.push({
        userId: senderId,
        totalSpent: totalCost,
        giftCount: quantity
      });
      gifterIndex = streamData.topGifters.length - 1;
    } else {
      streamData.topGifters[gifterIndex].totalSpent += totalCost;
      streamData.topGifters[gifterIndex].giftCount += quantity;
    }

    // Sort top gifters
    streamData.topGifters.sort((a, b) => b.totalSpent - a.totalSpent);
    streamData.topGifters = streamData.topGifters.slice(0, 20);

    // Add to recent gifts
    streamData.recentGifts.unshift({
      senderId: isAnonymous ? 'anonymous' : senderId,
      gift,
      quantity,
      timestamp: new Date(),
      isAnonymous
    });

    // Keep only last 50 recent gifts
    streamData.recentGifts = streamData.recentGifts.slice(0, 50);

    // Update gifting goals
    streamData.giftingGoals.forEach(goal => {
      goal.current = streamData!.totalEarnings;
    });

    this.activeStreams.set(streamId, streamData);

    // Emit real-time update
    this.emit('liveStreamGiftUpdate', {
      streamId,
      hostId,
      senderId: isAnonymous ? null : senderId,
      gift,
      quantity,
      newTotals: {
        totalEarnings: streamData.totalEarnings,
        totalGifts: streamData.totalGiftsReceived
      }
    });
  }

  private async buildGiftingStats(userId: string): Promise<GiftingStats> {
    const [sentStats, receivedStats] = await Promise.all([
      CoinTransaction.aggregate([
        { $match: { userId, type: 'gift_sent', status: 'completed' } },
        {
          $group: {
            _id: null,
            totalGifts: { $sum: 1 },
            totalSpent: { $sum: '$amount' },
            recipients: { $addToSet: '$targetUserId' },
            lastGiftAt: { $max: '$createdAt' }
          }
        }
      ]),
      CoinTransaction.aggregate([
        { $match: { userId, type: 'gift_received', status: 'completed' } },
        {
          $group: {
            _id: null,
            totalGifts: { $sum: 1 },
            totalEarned: { $sum: '$amount' },
            gifters: { $addToSet: '$targetUserId' },
            giftIds: { $push: '$context.giftId' }
          }
        }
      ])
    ]);

    const sent = sentStats[0] || {};
    const received = receivedStats[0] || {};

    return {
      totalGiftsSent: sent.totalGifts || 0,
      totalGiftsReceived: received.totalGifts || 0,
      totalCoinsSpent: sent.totalSpent || 0,
      totalCoinsEarned: received.totalEarned || 0,
      favoriteGifts: received.giftIds?.slice(0, 5) || [],
      topRecipients: sent.recipients?.slice(0, 5) || [],
      giftingStreak: 0, // Would calculate based on consecutive days
      lastGiftAt: sent.lastGiftAt
    };
  }

  private async isEventActive(eventId: string): Promise<boolean> {
    const event = this.specialEvents.get(eventId);
    if (!event) return false;

    const now = new Date();
    return now >= event.startDate && now <= event.endDate;
  }

  private startGiftingAnalytics(): void {
    // Update gifting analytics every 10 minutes
    setInterval(async () => {
      try {
        await this.updateGiftingTrends();
        await this.checkGiftingAnomalies();
      } catch (error) {
        logger.error('Error in gifting analytics:', error);
      }
    }, 600000); // 10 minutes
  }

  private startSpecialEventMonitoring(): void {
    // Check special events every hour
    setInterval(async () => {
      const now = new Date();

      for (const [eventId, event] of this.specialEvents) {
        if (now > event.endDate) {
          // Remove expired special gifts
          event.specialGifts.forEach((gift: Gift) => {
            this.availableGifts.delete(gift.id);
          });

          this.specialEvents.delete(eventId);
          this.emit('specialEventEnded', { eventId, event });
          logger.info(`Special event ended: ${event.name}`);
        }
      }
    }, 3600000); // 1 hour
  }

  private async updateGiftingTrends(): Promise<void> {
    const dailyStats = await CoinTransaction.aggregate([
      {
        $match: {
          type: { $in: ['gift_sent', 'gift_received'] },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            hour: { $hour: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    this.emit('giftingTrends', { dailyStats, timestamp: new Date() });
  }

  private async checkGiftingAnomalies(): Promise<void> {
    // Check for unusual gifting patterns
    const unusualActivity = await CoinTransaction.find({
      type: 'gift_sent',
      amount: { $gte: 5000 }, // Large gifts
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    }).limit(10);

    if (unusualActivity.length > 5) {
      this.emit('giftingAnomaly', {
        type: 'high_value_gifts',
        count: unusualActivity.length,
        details: unusualActivity
      });
    }
  }
}

export const giftingService = GiftingService.getInstance();