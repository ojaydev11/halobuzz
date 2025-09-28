import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';

interface GiftTier {
  id: string;
  name: string;
  minPrice: number;
  maxPrice: number;
  multiplier: number;
  exclusiveAccess: string[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface DynamicGift {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  demandMultiplier: number;
  timeMultiplier: number;
  userSegmentMultiplier: number;
  finalPrice: number;
  isLimitedEdition: boolean;
  expirationDate?: Date;
  maxQuantity?: number;
  soldQuantity: number;
}

interface GiftMultiplier {
  id: string;
  name: string;
  multiplier: number;
  conditions: {
    timeRange?: { start: string; end: string };
    userSegment?: string[];
    eventType?: string;
    minSpend?: number;
  };
  isActive: boolean;
  expirationDate?: Date;
}

interface GiftBox {
  id: string;
  name: string;
  price: number;
  contents: {
    giftId: string;
    quantity: number;
    guaranteed: boolean;
  }[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  maxPurchases: number;
  soldCount: number;
}

interface NFTGift {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  blockchain: 'ethereum' | 'polygon' | 'bsc';
  tokenId: string;
  contractAddress: string;
  isTradeable: boolean;
  isBurnable: boolean;
  creator: string;
  royalties: number;
}

export class AdvancedGiftEconomy {
  private readonly logger = logger;
  private readonly giftTiers: GiftTier[] = [
    {
      id: 'basic',
      name: 'Basic Gifts',
      minPrice: 0,
      maxPrice: 1,
      multiplier: 1,
      exclusiveAccess: [],
      rarity: 'common'
    },
    {
      id: 'premium',
      name: 'Premium Gifts',
      minPrice: 1,
      maxPrice: 10,
      multiplier: 1.5,
      exclusiveAccess: ['premium_badge'],
      rarity: 'rare'
    },
    {
      id: 'luxury',
      name: 'Luxury Gifts',
      minPrice: 10,
      maxPrice: 100,
      multiplier: 2,
      exclusiveAccess: ['luxury_badge', 'exclusive_emotes'],
      rarity: 'epic'
    },
    {
      id: 'exclusive',
      name: 'Exclusive Gifts',
      minPrice: 100,
      maxPrice: 1000,
      multiplier: 3,
      exclusiveAccess: ['exclusive_badge', 'vip_access', 'custom_emotes'],
      rarity: 'legendary'
    },
    {
      id: 'legendary',
      name: 'Legendary Gifts',
      minPrice: 1000,
      maxPrice: 10000,
      multiplier: 5,
      exclusiveAccess: ['legendary_badge', 'vip_access', 'custom_emotes', 'exclusive_events'],
      rarity: 'legendary'
    }
  ];

  private readonly activeMultipliers: GiftMultiplier[] = [];

  /**
   * Calculate dynamic pricing for gifts
   */
  async calculateDynamicPricing(giftId: string, userId: string): Promise<DynamicGift> {
    try {
      const basePrice = await this.getGiftBasePrice(giftId);
      const demandMultiplier = await this.calculateDemandMultiplier(giftId);
      const timeMultiplier = await this.calculateTimeMultiplier();
      const userSegmentMultiplier = await this.calculateUserSegmentMultiplier(userId);
      
      const finalPrice = basePrice * demandMultiplier * timeMultiplier * userSegmentMultiplier;

      const dynamicGift: DynamicGift = {
        id: giftId,
        name: await this.getGiftName(giftId),
        basePrice,
        currentPrice: finalPrice,
        demandMultiplier,
        timeMultiplier,
        userSegmentMultiplier,
        finalPrice,
        isLimitedEdition: await this.isLimitedEdition(giftId),
        expirationDate: await this.getExpirationDate(giftId),
        maxQuantity: await this.getMaxQuantity(giftId),
        soldQuantity: await this.getSoldQuantity(giftId)
      };

      return dynamicGift;
    } catch (error) {
      this.logger.error('Error calculating dynamic pricing:', error);
      throw error;
    }
  }

  /**
   * Apply gift multipliers
   */
  async applyGiftMultipliers(userId: string, giftId: string, baseAmount: number): Promise<number> {
    try {
      let totalMultiplier = 1;

      // Apply active multipliers
      for (const multiplier of this.activeMultipliers) {
        if (await this.isMultiplierApplicable(multiplier, userId, giftId)) {
          totalMultiplier *= multiplier.multiplier;
        }
      }

      // Apply user tier multiplier
      const userTier = await this.getUserTier(userId);
      const tierMultiplier = this.giftTiers.find(t => t.id === userTier)?.multiplier || 1;
      totalMultiplier *= tierMultiplier;

      // Apply streak multiplier
      const streakMultiplier = await this.getStreakMultiplier(userId);
      totalMultiplier *= streakMultiplier;

      return Math.round(baseAmount * totalMultiplier);
    } catch (error) {
      this.logger.error('Error applying gift multipliers:', error);
      return baseAmount;
    }
  }

  /**
   * Create limited edition gift
   */
  async createLimitedEditionGift(giftData: Partial<DynamicGift>): Promise<DynamicGift> {
    try {
      const limitedGift: DynamicGift = {
        id: `limited_${Date.now()}`,
        name: giftData.name || 'Limited Edition Gift',
        basePrice: giftData.basePrice || 10,
        currentPrice: giftData.basePrice || 10,
        demandMultiplier: 1,
        timeMultiplier: 1,
        userSegmentMultiplier: 1,
        finalPrice: giftData.basePrice || 10,
        isLimitedEdition: true,
        expirationDate: giftData.expirationDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        maxQuantity: giftData.maxQuantity || 100,
        soldQuantity: 0
      };

      // Cache the limited edition gift
      await setCache(`limited_gift:${limitedGift.id}`, limitedGift, 7 * 24 * 60 * 60); // 7 days

      return limitedGift;
    } catch (error) {
      this.logger.error('Error creating limited edition gift:', error);
      throw error;
    }
  }

  /**
   * Create gift box
   */
  async createGiftBox(boxData: Partial<GiftBox>): Promise<GiftBox> {
    try {
      const giftBox: GiftBox = {
        id: `box_${Date.now()}`,
        name: boxData.name || 'Mystery Gift Box',
        price: boxData.price || 50,
        contents: boxData.contents || [],
        rarity: boxData.rarity || 'common',
        maxPurchases: boxData.maxPurchases || 1000,
        soldCount: 0
      };

      // Cache the gift box
      await setCache(`gift_box:${giftBox.id}`, giftBox, 30 * 24 * 60 * 60); // 30 days

      return giftBox;
    } catch (error) {
      this.logger.error('Error creating gift box:', error);
      throw error;
    }
  }

  /**
   * Create NFT gift
   */
  async createNFTGift(nftData: Partial<NFTGift>): Promise<NFTGift> {
    try {
      const nftGift: NFTGift = {
        id: `nft_${Date.now()}`,
        name: nftData.name || 'NFT Gift',
        description: nftData.description || 'A unique NFT gift',
        imageUrl: nftData.imageUrl || '',
        rarity: nftData.rarity || 'common',
        blockchain: nftData.blockchain || 'ethereum',
        tokenId: nftData.tokenId || '',
        contractAddress: nftData.contractAddress || '',
        isTradeable: nftData.isTradeable || true,
        isBurnable: nftData.isBurnable || false,
        creator: nftData.creator || '',
        royalties: nftData.royalties || 5
      };

      // Cache the NFT gift
      await setCache(`nft_gift:${nftGift.id}`, nftGift, 365 * 24 * 60 * 60); // 1 year

      return nftGift;
    } catch (error) {
      this.logger.error('Error creating NFT gift:', error);
      throw error;
    }
  }

  /**
   * Process gift purchase
   */
  async processGiftPurchase(userId: string, giftId: string, targetUserId: string, quantity: number = 1): Promise<any> {
    try {
      const user = await User.findById(userId);
      const targetUser = await User.findById(targetUserId);
      
      if (!user || !targetUser) {
        throw new Error('User not found');
      }

      // Calculate dynamic pricing
      const dynamicGift = await this.calculateDynamicPricing(giftId, userId);
      
      // Check if gift is available
      if (dynamicGift.isLimitedEdition && dynamicGift.soldQuantity >= (dynamicGift.maxQuantity || 0)) {
        throw new Error('Gift sold out');
      }

      // Check if gift has expired
      if (dynamicGift.expirationDate && new Date() > dynamicGift.expirationDate) {
        throw new Error('Gift has expired');
      }

      const totalCost = dynamicGift.finalPrice * quantity;

      // Check user balance
      if (user.coins.balance < totalCost) {
        throw new Error('Insufficient balance');
      }

      // Apply multipliers
      const finalAmount = await this.applyGiftMultipliers(userId, giftId, totalCost);

      // Deduct coins from sender
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'coins.balance': -totalCost,
          'coins.totalSpent': totalCost
        }
      });

      // Add coins to receiver
      await User.findByIdAndUpdate(targetUserId, {
        $inc: {
          'coins.balance': finalAmount,
          'coins.totalEarned': finalAmount
        }
      });

      // Create transaction record
      const transaction = new Transaction({
        userId,
        targetUserId,
        type: 'gift_sent',
        amount: totalCost,
        description: `Gift: ${dynamicGift.name}`,
        metadata: {
          giftId,
          quantity,
          finalAmount,
          multipliers: await this.getActiveMultipliers(userId, giftId)
        }
      });

      await transaction.save();

      // Update gift sold quantity
      if (dynamicGift.isLimitedEdition) {
        await this.updateSoldQuantity(giftId, quantity);
      }

      // Update user statistics
      await this.updateUserGiftStats(userId, targetUserId, finalAmount);

      return {
        success: true,
        transactionId: transaction._id,
        finalAmount,
        multipliers: await this.getActiveMultipliers(userId, giftId)
      };
    } catch (error) {
      this.logger.error('Error processing gift purchase:', error);
      throw error;
    }
  }

  /**
   * Get user tier
   */
  private async getUserTier(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) return 'basic';

    const totalSpent = user.coins.totalSpent;
    
    if (totalSpent >= 10000) return 'legendary';
    if (totalSpent >= 1000) return 'exclusive';
    if (totalSpent >= 100) return 'luxury';
    if (totalSpent >= 10) return 'premium';
    return 'basic';
  }

  /**
   * Get streak multiplier
   */
  private async getStreakMultiplier(userId: string): Promise<number> {
    const streak = await getCache(`streak:${userId}`) || 0;
    
    if (streak >= 30) return 2.0; // 100% bonus for 30+ day streak
    if (streak >= 14) return 1.5; // 50% bonus for 14+ day streak
    if (streak >= 7) return 1.2;  // 20% bonus for 7+ day streak
    return 1.0;
  }

  /**
   * Check if multiplier is applicable
   */
  private async isMultiplierApplicable(multiplier: GiftMultiplier, userId: string, giftId: string): Promise<boolean> {
    if (!multiplier.isActive) return false;
    
    if (multiplier.expirationDate && new Date() > multiplier.expirationDate) {
      return false;
    }

    // Check time range
    if (multiplier.conditions.timeRange) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = this.parseTime(multiplier.conditions.timeRange.start);
      const endTime = this.parseTime(multiplier.conditions.timeRange.end);
      
      if (currentTime < startTime || currentTime > endTime) {
        return false;
      }
    }

    // Check user segment
    if (multiplier.conditions.userSegment) {
      const userTier = await this.getUserTier(userId);
      if (!multiplier.conditions.userSegment.includes(userTier)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Parse time string to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get active multipliers for user and gift
   */
  private async getActiveMultipliers(userId: string, giftId: string): Promise<any[]> {
    const activeMultipliers = [];
    
    for (const multiplier of this.activeMultipliers) {
      if (await this.isMultiplierApplicable(multiplier, userId, giftId)) {
        activeMultipliers.push({
          id: multiplier.id,
          name: multiplier.name,
          multiplier: multiplier.multiplier
        });
      }
    }

    return activeMultipliers;
  }

  /**
   * Update sold quantity
   */
  private async updateSoldQuantity(giftId: string, quantity: number): Promise<void> {
    const gift = await getCache(`limited_gift:${giftId}`);
    if (gift) {
      gift.soldQuantity += quantity;
      await setCache(`limited_gift:${giftId}`, gift, 7 * 24 * 60 * 60);
    }
  }

  /**
   * Update user gift statistics
   */
  private async updateUserGiftStats(userId: string, targetUserId: string, amount: number): Promise<void> {
    // Update sender stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'trust.factors.totalGifts': 1
      }
    });

    // Update receiver stats
    await User.findByIdAndUpdate(targetUserId, {
      $inc: {
        'trust.factors.totalGifts': 1
      }
    });
  }

  // Mock methods for demonstration
  private async getGiftBasePrice(giftId: string): Promise<number> {
    return 10; // Mock base price
  }

  private async getGiftName(giftId: string): Promise<string> {
    return 'Sample Gift'; // Mock gift name
  }

  private async calculateDemandMultiplier(giftId: string): Promise<number> {
    return 1.2; // Mock demand multiplier
  }

  private async calculateTimeMultiplier(): Promise<number> {
    return 1.1; // Mock time multiplier
  }

  private async calculateUserSegmentMultiplier(userId: string): Promise<number> {
    return 0.9; // Mock user segment multiplier
  }

  private async isLimitedEdition(giftId: string): Promise<boolean> {
    return false; // Mock limited edition check
  }

  private async getExpirationDate(giftId: string): Promise<Date | undefined> {
    return undefined; // Mock expiration date
  }

  private async getMaxQuantity(giftId: string): Promise<number | undefined> {
    return undefined; // Mock max quantity
  }

  private async getSoldQuantity(giftId: string): Promise<number> {
    return 0; // Mock sold quantity
  }
}

export const advancedGiftEconomy = new AdvancedGiftEconomy();
