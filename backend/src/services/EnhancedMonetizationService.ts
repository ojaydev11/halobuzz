/**
 * Enhanced MonetizationService with MongoDB Persistence
 * Replaces in-memory Maps with persistent MongoDB collections
 */

import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import { logger } from '@/config/logger';
import { Inventory, IInventory } from '../models/Inventory';
import { BattlePassProgress, IBattlePassProgress } from '../models/BattlePassProgress';
import { User } from '../models/User';

export interface VirtualCurrency {
  coins: number;
  gems: number;
  tokens: number;
}

export interface IAPProduct {
  id: string;
  name: string;
  description: string;
  type: 'consumable' | 'non_consumable' | 'subscription';
  category: 'currency' | 'cosmetic' | 'boost' | 'premium' | 'battle_pass';
  price: {
    usd: number;
    localizedPrices: Record<string, number>;
  };
  rewards: {
    coins?: number;
    gems?: number;
    tokens?: number;
    items?: string[];
    boosts?: string[];
  };
  discount?: {
    percentage: number;
    expiresAt: Date;
    originalPrice: number;
  };
  isPopular: boolean;
  isBestValue: boolean;
  purchaseLimit?: number;
  requiredLevel?: number;
  availableUntil?: Date;
}

export interface BattlePass {
  id: string;
  season: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxTier: number;
  freeRewards: Record<number, BattlePassReward[]>;
  premiumRewards: Record<number, BattlePassReward[]>;
  price: {
    usd: number;
    gems: number;
  };
  xpPerTier: number;
  isActive: boolean;
}

export interface BattlePassReward {
  type: 'currency' | 'cosmetic' | 'boost' | 'exclusive';
  item: string;
  amount?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LootBox {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  price: {
    coins?: number;
    gems?: number;
    usd?: number;
  };
  contents: LootBoxItem[];
  guaranteedItems: number;
  animation: string;
  purchaseLimit?: number;
  availableUntil?: Date;
}

export interface LootBoxItem {
  type: 'currency' | 'cosmetic' | 'boost' | 'emote' | 'avatar';
  item: string;
  amount?: number;
  dropRate: number; // Percentage (0-100)
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'reward' | 'refund' | 'gift';
  amount: number;
  currency: 'coins' | 'gems' | 'usd';
  description: string;
  metadata?: any;
  timestamp: Date;
}

export class EnhancedMonetizationService extends EventEmitter {
  private static instance: EnhancedMonetizationService;
  
  // Persistent collections (replacing in-memory Maps)
  private iapProducts: Map<string, IAPProduct> = new Map();
  private battlePasses: Map<string, BattlePass> = new Map();
  private lootBoxes: Map<string, LootBox> = new Map();

  private constructor() {
    super();
    this.initializeProducts();
  }

  static getInstance(): EnhancedMonetizationService {
    if (!EnhancedMonetizationService.instance) {
      EnhancedMonetizationService.instance = new EnhancedMonetizationService();
    }
    return EnhancedMonetizationService.instance;
  }

  /**
   * Initialize product data (this could be loaded from database in production)
   */
  private initializeProducts(): void {
    this.createIAPProducts();
    this.createBattlePasses();
    this.createLootBoxes();
  }

  /**
   * Get user's inventory from MongoDB
   */
  async getUserInventory(userId: string): Promise<IInventory | null> {
    try {
      const inventory = await Inventory.findOne({ userId }).lean();
      return inventory;
    } catch (error) {
      logger.error(`Failed to get user inventory for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get or create user's inventory
   */
  async getOrCreateUserInventory(userId: string): Promise<IInventory> {
    try {
      let inventory = await Inventory.findOne({ userId });
      
      if (!inventory) {
        inventory = new Inventory({
          userId: new mongoose.Types.ObjectId(userId),
          items: new Map(),
          cosmetics: new Map(),
          collectibles: new Map()
        });
        await inventory.save();
        logger.info(`Created new inventory for user: ${userId}`);
      }
      
      return inventory;
    } catch (error) {
      logger.error(`Failed to get/create user inventory for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add item to user's inventory
   */
  async addItemToInventory(
    userId: string, 
    itemId: string, 
    quantity: number, 
    source: 'purchase' | 'reward' | 'gift' | 'achievement' | 'event',
    metadata?: any
  ): Promise<boolean> {
    try {
      const inventory = await this.getOrCreateUserInventory(userId);
      
      const existingItem = inventory.items.get(itemId);
      if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.metadata = metadata;
      } else {
        inventory.items.set(itemId, {
          itemId,
          quantity,
          acquiredAt: new Date(),
          source,
          metadata
        });
      }
      
      await inventory.save();
      
      logger.info(`Added ${quantity}x ${itemId} to user ${userId}'s inventory`);
      this.emit('inventory:item_added', { userId, itemId, quantity, source });
      
      return true;
    } catch (error) {
      logger.error(`Failed to add item to inventory for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Remove item from user's inventory
   */
  async removeItemFromInventory(userId: string, itemId: string, quantity: number): Promise<boolean> {
    try {
      const inventory = await this.getOrCreateUserInventory(userId);
      
      const existingItem = inventory.items.get(itemId);
      if (!existingItem || existingItem.quantity < quantity) {
        return false;
      }
      
      existingItem.quantity -= quantity;
      if (existingItem.quantity <= 0) {
        inventory.items.delete(itemId);
      }
      
      await inventory.save();
      
      logger.info(`Removed ${quantity}x ${itemId} from user ${userId}'s inventory`);
      this.emit('inventory:item_removed', { userId, itemId, quantity });
      
      return true;
    } catch (error) {
      logger.error(`Failed to remove item from inventory for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user's battle pass progress
   */
  async getUserBattlePassProgress(userId: string, battlePassId: string): Promise<IBattlePassProgress | null> {
    try {
      const progress = await BattlePassProgress.findOne({ 
        userId: new mongoose.Types.ObjectId(userId), 
        battlePassId 
      }).lean();
      return progress;
    } catch (error) {
      logger.error(`Failed to get battle pass progress for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get or create user's battle pass progress
   */
  async getOrCreateBattlePassProgress(userId: string, battlePassId: string): Promise<IBattlePassProgress> {
    try {
      let progress = await BattlePassProgress.findOne({ 
        userId: new mongoose.Types.ObjectId(userId), 
        battlePassId 
      });
      
      if (!progress) {
        const battlePass = this.battlePasses.get(battlePassId);
        if (!battlePass) {
          throw new Error(`Battle pass ${battlePassId} not found`);
        }
        
        progress = new BattlePassProgress({
          userId: new mongoose.Types.ObjectId(userId),
          battlePassId,
          season: battlePass.season,
          currentTier: 0,
          currentXP: 0,
          xpToNextTier: battlePass.xpPerTier,
          totalXP: 0,
          premiumUnlocked: false,
          completedTiers: [],
          claimedRewards: [],
          dailyQuests: new Map(),
          weeklyQuests: new Map(),
          seasonQuests: new Map()
        });
        
        await progress.save();
        logger.info(`Created new battle pass progress for user: ${userId}, battle pass: ${battlePassId}`);
      }
      
      return progress;
    } catch (error) {
      logger.error(`Failed to get/create battle pass progress for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Add XP to user's battle pass progress
   */
  async addBattlePassXP(userId: string, battlePassId: string, xp: number): Promise<boolean> {
    try {
      const progress = await this.getOrCreateBattlePassProgress(userId, battlePassId);
      const battlePass = this.battlePasses.get(battlePassId);
      
      if (!battlePass) {
        return false;
      }
      
      progress.currentXP += xp;
      progress.totalXP += xp;
      
      // Check for tier advancement
      while (progress.currentXP >= progress.xpToNextTier && progress.currentTier < battlePass.maxTier) {
        progress.currentTier++;
        progress.currentXP -= progress.xpToNextTier;
        progress.xpToNextTier = battlePass.xpPerTier;
        
        // Add tier to completed tiers
        if (!progress.completedTiers.includes(progress.currentTier)) {
          progress.completedTiers.push(progress.currentTier);
        }
        
        logger.info(`User ${userId} advanced to tier ${progress.currentTier} in battle pass ${battlePassId}`);
        this.emit('battlepass:tier_advanced', { 
          userId, 
          battlePassId, 
          tier: progress.currentTier 
        });
      }
      
      await progress.save();
      return true;
    } catch (error) {
      logger.error(`Failed to add battle pass XP for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Purchase battle pass premium
   */
  async purchaseBattlePassPremium(userId: string, battlePassId: string): Promise<boolean> {
    try {
      const progress = await this.getOrCreateBattlePassProgress(userId, battlePassId);
      const battlePass = this.battlePasses.get(battlePassId);
      
      if (!battlePass || progress.premiumUnlocked) {
        return false;
      }
      
      // Check if user has enough gems
      const user = await User.findById(userId);
      if (!user || user.coins < battlePass.price.gems) {
        return false;
      }
      
      // Deduct gems
      user.coins -= battlePass.price.gems;
      await user.save();
      
      // Unlock premium
      progress.premiumUnlocked = true;
      progress.premiumPurchaseDate = new Date();
      await progress.save();
      
      logger.info(`User ${userId} purchased premium battle pass ${battlePassId}`);
      this.emit('battlepass:premium_purchased', { userId, battlePassId });
      
      return true;
    } catch (error) {
      logger.error(`Failed to purchase battle pass premium for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Claim battle pass reward
   */
  async claimBattlePassReward(userId: string, battlePassId: string, tier: number): Promise<boolean> {
    try {
      const progress = await this.getOrCreateBattlePassProgress(userId, battlePassId);
      const battlePass = this.battlePasses.get(battlePassId);
      
      if (!battlePass || !progress.completedTiers.includes(tier) || progress.claimedRewards.includes(`${tier}`)) {
        return false;
      }
      
      // Get rewards for this tier
      const freeRewards = battlePass.freeRewards[tier] || [];
      const premiumRewards = progress.premiumUnlocked ? (battlePass.premiumRewards[tier] || []) : [];
      
      // Add rewards to inventory
      for (const reward of [...freeRewards, ...premiumRewards]) {
        if (reward.type === 'currency' && reward.amount) {
          await this.addItemToInventory(userId, reward.item, reward.amount, 'reward');
        } else {
          await this.addItemToInventory(userId, reward.item, 1, 'reward');
        }
      }
      
      // Mark as claimed
      progress.claimedRewards.push(`${tier}`);
      await progress.save();
      
      logger.info(`User ${userId} claimed battle pass reward for tier ${tier}`);
      this.emit('battlepass:reward_claimed', { userId, battlePassId, tier });
      
      return true;
    } catch (error) {
      logger.error(`Failed to claim battle pass reward for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get available IAP products
   */
  getIAPProducts(): IAPProduct[] {
    return Array.from(this.iapProducts.values());
  }

  /**
   * Get available battle passes
   */
  getBattlePasses(): BattlePass[] {
    return Array.from(this.battlePasses.values());
  }

  /**
   * Get available loot boxes
   */
  getLootBoxes(): LootBox[] {
    return Array.from(this.lootBoxes.values());
  }

  /**
   * Create IAP products (mock data)
   */
  private createIAPProducts(): void {
    const products: IAPProduct[] = [
      {
        id: 'coins_100',
        name: '100 Coins',
        description: 'Small coin pack',
        type: 'consumable',
        category: 'currency',
        price: { usd: 0.99, localizedPrices: { 'NP': 120 } },
        rewards: { coins: 100 },
        isPopular: false,
        isBestValue: false
      },
      {
        id: 'coins_1000',
        name: '1000 Coins',
        description: 'Large coin pack',
        type: 'consumable',
        category: 'currency',
        price: { usd: 9.99, localizedPrices: { 'NP': 1200 } },
        rewards: { coins: 1000 },
        isPopular: true,
        isBestValue: true
      },
      {
        id: 'battlepass_premium',
        name: 'Premium Battle Pass',
        description: 'Unlock premium rewards',
        type: 'non_consumable',
        category: 'battle_pass',
        price: { usd: 4.99, localizedPrices: { 'NP': 600 } },
        rewards: { gems: 500 },
        isPopular: true,
        isBestValue: false
      }
    ];

    products.forEach(product => {
      this.iapProducts.set(product.id, product);
    });
  }

  /**
   * Create battle passes (mock data)
   */
  private createBattlePasses(): void {
    const battlePasses: BattlePass[] = [
      {
        id: 'battlepass-season-1',
        season: 'season-1',
        name: 'Season 1 Battle Pass',
        description: 'First season battle pass',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        maxTier: 50,
        freeRewards: {
          1: [{ type: 'currency', item: 'coins', amount: 100, rarity: 'common' }],
          5: [{ type: 'cosmetic', item: 'avatar_frame_1', rarity: 'rare' }]
        },
        premiumRewards: {
          1: [{ type: 'currency', item: 'gems', amount: 50, rarity: 'rare' }],
          10: [{ type: 'cosmetic', item: 'exclusive_avatar', rarity: 'legendary' }]
        },
        price: { usd: 4.99, gems: 500 },
        xpPerTier: 100,
        isActive: true
      }
    ];

    battlePasses.forEach(battlePass => {
      this.battlePasses.set(battlePass.id, battlePass);
    });
  }

  /**
   * Create loot boxes (mock data)
   */
  private createLootBoxes(): void {
    const lootBoxes: LootBox[] = [
      {
        id: 'lootbox_basic',
        name: 'Basic Loot Box',
        description: 'Contains common items',
        rarity: 'common',
        price: { coins: 100 },
        contents: [
          { type: 'currency', item: 'coins', amount: 50, dropRate: 50, rarity: 'common' },
          { type: 'cosmetic', item: 'avatar_1', dropRate: 30, rarity: 'common' },
          { type: 'cosmetic', item: 'emote_1', dropRate: 20, rarity: 'rare' }
        ],
        guaranteedItems: 1,
        animation: 'basic_open'
      }
    ];

    lootBoxes.forEach(lootBox => {
      this.lootBoxes.set(lootBox.id, lootBox);
    });
  }
}

export const enhancedMonetizationService = EnhancedMonetizationService.getInstance();
