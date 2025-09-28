import { EventEmitter } from 'events';
import { logger } from '@/config/logger';

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
    localizedPrices: Map<string, number>;
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
  freeRewards: Map<number, BattlePassReward[]>;
  premiumRewards: Map<number, BattlePassReward[]>;
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

export interface UserBattlePass {
  userId: string;
  battlePassId: string;
  currentTier: number;
  currentXP: number;
  isPremium: boolean;
  purchasedAt?: Date;
  claimedRewards: Set<number>;
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

export interface UserInventory {
  userId: string;
  currency: VirtualCurrency;
  cosmetics: Map<string, CosmeticItem>;
  boosts: Map<string, BoostItem>;
  consumables: Map<string, number>;
  lastUpdated: Date;
}

export interface CosmeticItem {
  id: string;
  type: 'avatar' | 'skin' | 'emote' | 'effect' | 'badge';
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  equippedAt?: Date;
  obtainedAt: Date;
  source: 'purchase' | 'battle_pass' | 'loot_box' | 'achievement' | 'event';
}

export interface BoostItem {
  id: string;
  type: 'xp_boost' | 'coin_boost' | 'win_rate_boost' | 'luck_boost';
  name: string;
  multiplier: number;
  duration: number; // in seconds
  activatedAt?: Date;
  expiresAt?: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'purchase' | 'earn' | 'spend' | 'refund';
  productId?: string;
  amount: {
    real?: number;
    currency?: 'USD' | 'EUR' | 'GBP';
    virtual?: VirtualCurrency;
  };
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
  metadata?: any;
  receiptId?: string;
}

export interface RewardSystem {
  dailyRewards: DailyReward[];
  weeklyRewards: WeeklyReward[];
  achievementRewards: Map<string, AchievementReward>;
  referralRewards: ReferralReward;
}

export interface DailyReward {
  day: number;
  reward: {
    coins?: number;
    gems?: number;
    items?: string[];
  };
  claimed: boolean;
  multiplier?: number;
}

export interface WeeklyReward {
  week: number;
  requirement: {
    gamesPlayed?: number;
    wins?: number;
    loginDays?: number;
  };
  reward: {
    coins?: number;
    gems?: number;
    items?: string[];
    lootBoxes?: string[];
  };
  claimed: boolean;
}

export interface AchievementReward {
  coins?: number;
  gems?: number;
  items?: string[];
  title?: string;
  badge?: string;
}

export interface ReferralReward {
  referrerReward: {
    coins: number;
    gems: number;
    items?: string[];
  };
  referredReward: {
    coins: number;
    gems: number;
    items?: string[];
  };
  requirements: {
    newUserMustReachLevel: number;
    newUserMustPlay: number;
  };
}

/**
 * Monetization Service
 * Handles in-app purchases, virtual currency, battle passes, loot boxes, and reward systems
 */
export class MonetizationService extends EventEmitter {
  private static instance: MonetizationService;
  private iapProducts = new Map<string, IAPProduct>();
  private battlePasses = new Map<string, BattlePass>();
  private userBattlePasses = new Map<string, UserBattlePass[]>();
  private lootBoxes = new Map<string, LootBox>();
  private userInventories = new Map<string, UserInventory>();
  private transactions = new Map<string, Transaction>();
  private rewardSystem: RewardSystem;

  private constructor() {
    super();
    this.initializeMockData();
    this.startPeriodicTasks();
  }

  static getInstance(): MonetizationService {
    if (!MonetizationService.instance) {
      MonetizationService.instance = new MonetizationService();
    }
    return MonetizationService.instance;
  }

  /**
   * Initialize monetization data
   */
  private initializeMockData(): void {
    this.createIAPProducts();
    this.createBattlePasses();
    this.createLootBoxes();
    this.createRewardSystem();
    logger.info('Monetization service initialized');
  }

  /**
   * Get user's virtual currency balance
   */
  getUserCurrency(userId: string): VirtualCurrency {
    const inventory = this.getUserInventory(userId);
    return inventory.currency;
  }

  /**
   * Get user's complete inventory
   */
  getUserInventory(userId: string): UserInventory {
    if (!this.userInventories.has(userId)) {
      // Create new inventory for user
      const newInventory: UserInventory = {
        userId,
        currency: { coins: 1000, gems: 100, tokens: 0 }, // Starting currency
        cosmetics: new Map(),
        boosts: new Map(),
        consumables: new Map(),
        lastUpdated: new Date()
      };

      // Add starter cosmetics
      const starterAvatar: CosmeticItem = {
        id: 'avatar_starter',
        type: 'avatar',
        name: 'Rookie Player',
        rarity: 'common',
        obtainedAt: new Date(),
        source: 'achievement'
      };
      newInventory.cosmetics.set(starterAvatar.id, starterAvatar);

      this.userInventories.set(userId, newInventory);
    }

    return this.userInventories.get(userId)!;
  }

  /**
   * Add currency to user's account
   */
  async addCurrency(
    userId: string,
    currency: Partial<VirtualCurrency>,
    source: 'purchase' | 'reward' | 'game_win' | 'daily_bonus' | 'referral' = 'reward'
  ): Promise<VirtualCurrency> {
    const inventory = this.getUserInventory(userId);

    inventory.currency.coins += currency.coins || 0;
    inventory.currency.gems += currency.gems || 0;
    inventory.currency.tokens += currency.tokens || 0;
    inventory.lastUpdated = new Date();

    // Create transaction record
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'earn',
      amount: { virtual: currency as VirtualCurrency },
      status: 'completed',
      timestamp: new Date(),
      metadata: { source }
    };

    this.transactions.set(transaction.id, transaction);

    this.emit('currencyAdded', { userId, currency, source, newBalance: inventory.currency });
    logger.info(`Added currency to user ${userId}: ${JSON.stringify(currency)} from ${source}`);

    return inventory.currency;
  }

  /**
   * Deduct currency from user's account
   */
  async deductCurrency(userId: string, currency: Partial<VirtualCurrency>): Promise<boolean> {
    const inventory = this.getUserInventory(userId);

    // Check if user has enough currency
    if ((currency.coins && inventory.currency.coins < currency.coins) ||
        (currency.gems && inventory.currency.gems < currency.gems) ||
        (currency.tokens && inventory.currency.tokens < currency.tokens)) {
      return false;
    }

    inventory.currency.coins -= currency.coins || 0;
    inventory.currency.gems -= currency.gems || 0;
    inventory.currency.tokens -= currency.tokens || 0;
    inventory.lastUpdated = new Date();

    // Create transaction record
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'spend',
      amount: { virtual: currency as VirtualCurrency },
      status: 'completed',
      timestamp: new Date()
    };

    this.transactions.set(transaction.id, transaction);

    this.emit('currencyDeducted', { userId, currency, newBalance: inventory.currency });
    logger.info(`Deducted currency from user ${userId}: ${JSON.stringify(currency)}`);

    return true;
  }

  /**
   * Get all IAP products
   */
  getIAPProducts(): IAPProduct[] {
    return Array.from(this.iapProducts.values()).sort((a, b) => a.price.usd - b.price.usd);
  }

  /**
   * Get featured IAP products
   */
  getFeaturedProducts(): IAPProduct[] {
    return Array.from(this.iapProducts.values())
      .filter(product => product.isPopular || product.isBestValue || product.discount)
      .sort((a, b) => {
        if (a.isBestValue && !b.isBestValue) return -1;
        if (!a.isBestValue && b.isBestValue) return 1;
        if (a.isPopular && !b.isPopular) return -1;
        if (!a.isPopular && b.isPopular) return 1;
        return a.price.usd - b.price.usd;
      });
  }

  /**
   * Process IAP purchase
   */
  async processPurchase(userId: string, productId: string, receiptData?: any): Promise<{success: boolean, transaction?: Transaction}> {
    try {
      const product = this.iapProducts.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // In production, verify receipt with Apple/Google
      const isReceiptValid = this.verifyReceipt(receiptData);
      if (!isReceiptValid) {
        throw new Error('Invalid receipt');
      }

      // Create transaction
      const transaction: Transaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        type: 'purchase',
        productId,
        amount: {
          real: product.price.usd,
          currency: 'USD'
        },
        status: 'completed',
        timestamp: new Date(),
        receiptId: receiptData?.transactionId
      };

      this.transactions.set(transaction.id, transaction);

      // Grant rewards
      const inventory = this.getUserInventory(userId);
      if (product.rewards.coins) inventory.currency.coins += product.rewards.coins;
      if (product.rewards.gems) inventory.currency.gems += product.rewards.gems;
      if (product.rewards.tokens) inventory.currency.tokens += product.rewards.tokens;

      // Add items to inventory
      if (product.rewards.items) {
        for (const itemId of product.rewards.items) {
          await this.addItemToInventory(userId, itemId);
        }
      }

      inventory.lastUpdated = new Date();

      this.emit('purchaseCompleted', { userId, productId, transaction, rewards: product.rewards });
      logger.info(`Purchase completed for user ${userId}: product ${productId}`);

      return { success: true, transaction };
    } catch (error: any) {
      logger.error('Error processing purchase:', error);
      return { success: false };
    }
  }

  /**
   * Get available battle passes
   */
  getActiveBattlePasses(): BattlePass[] {
    const now = new Date();
    return Array.from(this.battlePasses.values())
      .filter(bp => bp.isActive && bp.startDate <= now && bp.endDate > now);
  }

  /**
   * Get user's battle pass progress
   */
  getUserBattlePass(userId: string, battlePassId: string): UserBattlePass | null {
    const userPasses = this.userBattlePasses.get(userId) || [];
    return userPasses.find(up => up.battlePassId === battlePassId) || null;
  }

  /**
   * Purchase battle pass
   */
  async purchaseBattlePass(userId: string, battlePassId: string, useGems: boolean = false): Promise<boolean> {
    try {
      const battlePass = this.battlePasses.get(battlePassId);
      if (!battlePass) return false;

      let userBattlePass = this.getUserBattlePass(userId, battlePassId);

      if (userBattlePass?.isPremium) {
        return false; // Already owns premium
      }

      const cost = useGems ? battlePass.price.gems : battlePass.price.usd;

      if (useGems) {
        const success = await this.deductCurrency(userId, { gems: cost });
        if (!success) return false;
      }
      // In production, process real money payment

      if (!userBattlePass) {
        userBattlePass = {
          userId,
          battlePassId,
          currentTier: 0,
          currentXP: 0,
          isPremium: true,
          purchasedAt: new Date(),
          claimedRewards: new Set()
        };

        if (!this.userBattlePasses.has(userId)) {
          this.userBattlePasses.set(userId, []);
        }
        this.userBattlePasses.get(userId)!.push(userBattlePass);
      } else {
        userBattlePass.isPremium = true;
        userBattlePass.purchasedAt = new Date();
      }

      this.emit('battlePassPurchased', { userId, battlePassId });
      logger.info(`Battle pass purchased by user ${userId}: ${battlePassId}`);

      return true;
    } catch (error) {
      logger.error('Error purchasing battle pass:', error);
      return false;
    }
  }

  /**
   * Add XP to user's battle pass
   */
  async addBattlePassXP(userId: string, battlePassId: string, xp: number): Promise<void> {
    let userBattlePass = this.getUserBattlePass(userId, battlePassId);

    if (!userBattlePass) {
      // Create free battle pass progress
      userBattlePass = {
        userId,
        battlePassId,
        currentTier: 0,
        currentXP: 0,
        isPremium: false,
        claimedRewards: new Set()
      };

      if (!this.userBattlePasses.has(userId)) {
        this.userBattlePasses.set(userId, []);
      }
      this.userBattlePasses.get(userId)!.push(userBattlePass);
    }

    const battlePass = this.battlePasses.get(battlePassId);
    if (!battlePass) return;

    userBattlePass.currentXP += xp;

    // Calculate new tier
    const newTier = Math.floor(userBattlePass.currentXP / battlePass.xpPerTier);
    const maxTier = battlePass.maxTier;

    if (newTier > userBattlePass.currentTier && newTier <= maxTier) {
      const oldTier = userBattlePass.currentTier;
      userBattlePass.currentTier = Math.min(newTier, maxTier);

      this.emit('battlePassTierUp', {
        userId,
        battlePassId,
        oldTier,
        newTier: userBattlePass.currentTier,
        xpGained: xp
      });

      logger.info(`Battle pass tier up for user ${userId}: tier ${userBattlePass.currentTier}`);
    }
  }

  /**
   * Claim battle pass reward
   */
  async claimBattlePassReward(userId: string, battlePassId: string, tier: number): Promise<boolean> {
    const userBattlePass = this.getUserBattlePass(userId, battlePassId);
    const battlePass = this.battlePasses.get(battlePassId);

    if (!userBattlePass || !battlePass || tier > userBattlePass.currentTier) {
      return false;
    }

    if (userBattlePass.claimedRewards.has(tier)) {
      return false; // Already claimed
    }

    const rewards: BattlePassReward[] = [];

    // Add free rewards
    const freeRewards = battlePass.freeRewards.get(tier);
    if (freeRewards) {
      rewards.push(...freeRewards);
    }

    // Add premium rewards if user has premium
    if (userBattlePass.isPremium) {
      const premiumRewards = battlePass.premiumRewards.get(tier);
      if (premiumRewards) {
        rewards.push(...premiumRewards);
      }
    }

    // Grant rewards
    for (const reward of rewards) {
      if (reward.type === 'currency' && reward.amount) {
        if (reward.item === 'coins') {
          await this.addCurrency(userId, { coins: reward.amount }, 'reward');
        } else if (reward.item === 'gems') {
          await this.addCurrency(userId, { gems: reward.amount }, 'reward');
        }
      } else {
        await this.addItemToInventory(userId, reward.item);
      }
    }

    userBattlePass.claimedRewards.add(tier);

    this.emit('battlePassRewardClaimed', { userId, battlePassId, tier, rewards });
    logger.info(`Battle pass reward claimed by user ${userId}: tier ${tier}`);

    return true;
  }

  /**
   * Get available loot boxes
   */
  getAvailableLootBoxes(): LootBox[] {
    const now = new Date();
    return Array.from(this.lootBoxes.values())
      .filter(box => !box.availableUntil || box.availableUntil > now);
  }

  /**
   * Open loot box
   */
  async openLootBox(userId: string, lootBoxId: string): Promise<{success: boolean, rewards?: LootBoxItem[]}> {
    try {
      const lootBox = this.lootBoxes.get(lootBoxId);
      if (!lootBox) {
        return { success: false };
      }

      // Check if user can afford the loot box
      if (lootBox.price.coins) {
        const success = await this.deductCurrency(userId, { coins: lootBox.price.coins });
        if (!success) return { success: false };
      }
      if (lootBox.price.gems) {
        const success = await this.deductCurrency(userId, { gems: lootBox.price.gems });
        if (!success) return { success: false };
      }

      // Generate rewards based on drop rates
      const rewards = this.generateLootBoxRewards(lootBox);

      // Add rewards to inventory
      for (const reward of rewards) {
        if (reward.type === 'currency' && reward.amount) {
          if (reward.item === 'coins') {
            await this.addCurrency(userId, { coins: reward.amount }, 'reward');
          } else if (reward.item === 'gems') {
            await this.addCurrency(userId, { gems: reward.amount }, 'reward');
          }
        } else {
          await this.addItemToInventory(userId, reward.item);
        }
      }

      this.emit('lootBoxOpened', { userId, lootBoxId, rewards });
      logger.info(`Loot box opened by user ${userId}: ${lootBoxId}, rewards: ${rewards.length}`);

      return { success: true, rewards };
    } catch (error) {
      logger.error('Error opening loot box:', error);
      return { success: false };
    }
  }

  /**
   * Get daily rewards status
   */
  getUserDailyRewards(userId: string): DailyReward[] {
    // Mock implementation - in production, this would check user's claim history
    return this.rewardSystem.dailyRewards.map((reward, index) => ({
      ...reward,
      claimed: Math.random() > 0.7 // Mock claimed status
    }));
  }

  /**
   * Claim daily reward
   */
  async claimDailyReward(userId: string, day: number): Promise<boolean> {
    const reward = this.rewardSystem.dailyRewards[day - 1];
    if (!reward) return false;

    // In production, check if user can claim this reward
    if (reward.claimed) return false;

    // Grant rewards
    if (reward.reward.coins) {
      await this.addCurrency(userId, { coins: reward.reward.coins }, 'daily_bonus');
    }
    if (reward.reward.gems) {
      await this.addCurrency(userId, { gems: reward.reward.gems }, 'daily_bonus');
    }

    reward.claimed = true;

    this.emit('dailyRewardClaimed', { userId, day, reward: reward.reward });
    logger.info(`Daily reward claimed by user ${userId}: day ${day}`);

    return true;
  }

  /**
   * Private helper methods
   */
  private verifyReceipt(receiptData: any): boolean {
    // Mock receipt verification - in production, verify with app stores
    return receiptData && receiptData.transactionId;
  }

  private async addItemToInventory(userId: string, itemId: string): Promise<void> {
    const inventory = this.getUserInventory(userId);

    // Mock item creation - in production, get item data from database
    const mockItem: CosmeticItem = {
      id: itemId,
      type: 'avatar',
      name: `Item ${itemId}`,
      rarity: 'common',
      obtainedAt: new Date(),
      source: 'purchase'
    };

    inventory.cosmetics.set(itemId, mockItem);
    inventory.lastUpdated = new Date();
  }

  private generateLootBoxRewards(lootBox: LootBox): LootBoxItem[] {
    const rewards: LootBoxItem[] = [];
    const guaranteedCount = lootBox.guaranteedItems;

    // Sort items by rarity (legendary first) for guaranteed algorithm
    const sortedItems = [...lootBox.contents].sort((a, b) => {
      const rarityOrder = { legendary: 4, epic: 3, rare: 2, common: 1 };
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });

    for (let i = 0; i < guaranteedCount; i++) {
      // Use weighted random selection
      let totalWeight = 0;
      for (const item of sortedItems) {
        totalWeight += item.dropRate;
      }

      let randomWeight = Math.random() * totalWeight;

      for (const item of sortedItems) {
        randomWeight -= item.dropRate;
        if (randomWeight <= 0) {
          rewards.push({ ...item });
          break;
        }
      }
    }

    return rewards;
  }

  private createIAPProducts(): void {
    const products: IAPProduct[] = [
      {
        id: 'starter_pack',
        name: 'Starter Pack',
        description: 'Perfect for new players! Get coins and gems to jumpstart your gaming.',
        type: 'consumable',
        category: 'currency',
        price: { usd: 0.99, localizedPrices: new Map([['EUR', 0.89], ['GBP', 0.79]]) },
        rewards: { coins: 1000, gems: 100 },
        isPopular: false,
        isBestValue: false
      },
      {
        id: 'coin_pack_small',
        name: 'Coin Pack (Small)',
        description: 'Get 5,000 coins instantly',
        type: 'consumable',
        category: 'currency',
        price: { usd: 4.99, localizedPrices: new Map([['EUR', 4.49], ['GBP', 3.99]]) },
        rewards: { coins: 5000 },
        isPopular: true,
        isBestValue: false
      },
      {
        id: 'coin_pack_large',
        name: 'Coin Pack (Large)',
        description: 'Best value! Get 50,000 coins + bonus gems',
        type: 'consumable',
        category: 'currency',
        price: { usd: 19.99, localizedPrices: new Map([['EUR', 17.99], ['GBP', 15.99]]) },
        rewards: { coins: 50000, gems: 1000 },
        isPopular: false,
        isBestValue: true
      },
      {
        id: 'gem_pack_premium',
        name: 'Premium Gems',
        description: 'Premium currency for exclusive items and battle passes',
        type: 'consumable',
        category: 'currency',
        price: { usd: 9.99, localizedPrices: new Map([['EUR', 8.99], ['GBP', 7.99]]) },
        rewards: { gems: 1000 },
        isPopular: true,
        isBestValue: false
      },
      {
        id: 'battle_pass_premium',
        name: 'Premium Battle Pass',
        description: 'Unlock exclusive rewards and accelerated progression',
        type: 'consumable',
        category: 'battle_pass',
        price: { usd: 12.99, localizedPrices: new Map([['EUR', 11.99], ['GBP', 9.99]]) },
        rewards: { items: ['battle_pass_season_1'] },
        isPopular: true,
        isBestValue: false
      }
    ];

    products.forEach(product => {
      this.iapProducts.set(product.id, product);
    });
  }

  private createBattlePasses(): void {
    const battlePass: BattlePass = {
      id: 'season_1',
      season: 'Season 1',
      name: 'Digital Warriors',
      description: 'Prove your worth in the digital arena',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      maxTier: 100,
      freeRewards: new Map([
        [1, [{ type: 'currency', item: 'coins', amount: 100, rarity: 'common' }]],
        [5, [{ type: 'cosmetic', item: 'avatar_warrior', rarity: 'rare' }]],
        [10, [{ type: 'currency', item: 'gems', amount: 50, rarity: 'common' }]]
      ]),
      premiumRewards: new Map([
        [1, [{ type: 'currency', item: 'coins', amount: 500, rarity: 'common' }]],
        [5, [{ type: 'cosmetic', item: 'skin_golden', rarity: 'epic' }]],
        [10, [{ type: 'currency', item: 'gems', amount: 200, rarity: 'common' }]],
        [25, [{ type: 'cosmetic', item: 'emote_victory', rarity: 'legendary' }]]
      ]),
      price: { usd: 12.99, gems: 1200 },
      xpPerTier: 1000,
      isActive: true
    };

    this.battlePasses.set(battlePass.id, battlePass);
  }

  private createLootBoxes(): void {
    const lootBoxes: LootBox[] = [
      {
        id: 'common_box',
        name: 'Common Loot Box',
        description: 'Basic rewards for everyday players',
        rarity: 'common',
        price: { coins: 1000 },
        contents: [
          { type: 'currency', item: 'coins', amount: 500, dropRate: 40, rarity: 'common' },
          { type: 'currency', item: 'gems', amount: 50, dropRate: 20, rarity: 'common' },
          { type: 'cosmetic', item: 'avatar_basic', dropRate: 30, rarity: 'common' },
          { type: 'cosmetic', item: 'avatar_rare', dropRate: 10, rarity: 'rare' }
        ],
        guaranteedItems: 3,
        animation: 'basic_open'
      },
      {
        id: 'premium_box',
        name: 'Premium Loot Box',
        description: 'Enhanced rewards with higher rare item chances',
        rarity: 'epic',
        price: { gems: 100 },
        contents: [
          { type: 'currency', item: 'coins', amount: 2000, dropRate: 30, rarity: 'common' },
          { type: 'currency', item: 'gems', amount: 200, dropRate: 25, rarity: 'rare' },
          { type: 'cosmetic', item: 'skin_premium', dropRate: 25, rarity: 'rare' },
          { type: 'cosmetic', item: 'emote_legendary', dropRate: 15, rarity: 'epic' },
          { type: 'cosmetic', item: 'effect_exclusive', dropRate: 5, rarity: 'legendary' }
        ],
        guaranteedItems: 4,
        animation: 'premium_open'
      }
    ];

    lootBoxes.forEach(box => {
      this.lootBoxes.set(box.id, box);
    });
  }

  private createRewardSystem(): void {
    this.rewardSystem = {
      dailyRewards: [
        { day: 1, reward: { coins: 100 }, claimed: false },
        { day: 2, reward: { coins: 150 }, claimed: false },
        { day: 3, reward: { coins: 200, gems: 10 }, claimed: false },
        { day: 4, reward: { coins: 300 }, claimed: false },
        { day: 5, reward: { coins: 400, gems: 20 }, claimed: false },
        { day: 6, reward: { coins: 500, gems: 30 }, claimed: false },
        { day: 7, reward: { coins: 1000, gems: 100 }, claimed: false, multiplier: 2 }
      ],
      weeklyRewards: [],
      achievementRewards: new Map(),
      referralRewards: {
        referrerReward: { coins: 1000, gems: 100, items: ['referral_badge'] },
        referredReward: { coins: 500, gems: 50 },
        requirements: { newUserMustReachLevel: 5, newUserMustPlay: 10 }
      }
    };
  }

  private startPeriodicTasks(): void {
    // Reset daily rewards at midnight
    setInterval(() => {
      this.resetDailyRewards();
    }, 24 * 60 * 60 * 1000);

    // Clean up old transactions
    setInterval(() => {
      this.cleanupOldTransactions();
    }, 7 * 24 * 60 * 60 * 1000);
  }

  private resetDailyRewards(): void {
    // Reset daily rewards for all users
    this.rewardSystem.dailyRewards.forEach(reward => {
      reward.claimed = false;
    });

    this.emit('dailyRewardsReset');
    logger.info('Daily rewards reset');
  }

  private cleanupOldTransactions(): void {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const transactionsToDelete: string[] = [];

    for (const [txnId, transaction] of this.transactions.entries()) {
      if (transaction.timestamp < oneWeekAgo && transaction.status === 'completed') {
        transactionsToDelete.push(txnId);
      }
    }

    transactionsToDelete.forEach(txnId => {
      this.transactions.delete(txnId);
    });

    if (transactionsToDelete.length > 0) {
      logger.info(`Cleaned up ${transactionsToDelete.length} old transactions`);
    }
  }
}

export const monetizationService = MonetizationService.getInstance();