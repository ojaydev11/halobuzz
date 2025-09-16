import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';

export interface CreatorTier {
  name: string;
  level: number;
  minFollowers: number;
  minRevenue: number;
  benefits: string[];
  revenueShare: number; // Percentage creator gets
  platformFee: number; // Percentage platform takes
}

export interface CreatorStats {
  userId: string;
  username: string;
  tier: CreatorTier;
  totalRevenue: number;
  monthlyRevenue: number;
  totalFollowers: number;
  totalStreams: number;
  totalViews: number;
  totalGifts: number;
  averageViewerCount: number;
  engagementRate: number;
  conversionRate: number;
  topCategories: string[];
  revenueBreakdown: {
    gifts: number;
    subscriptions: number;
    tips: number;
    brandDeals: number;
    merchandise: number;
  };
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  benefits: string[];
  duration: 'monthly' | 'yearly';
  creatorRevenue: number; // Amount creator gets
  platformFee: number; // Amount platform takes
}

export interface BrandDeal {
  id: string;
  creatorId: string;
  brandName: string;
  dealType: 'sponsored_stream' | 'product_placement' | 'brand_ambassador';
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  requirements: string[];
  deliverables: string[];
  commission: number; // Platform commission percentage
}

export class CreatorEconomyService {
  private static instance: CreatorEconomyService;
  private creatorTiers: CreatorTier[] = [];
  private subscriptionTiers: SubscriptionTier[] = [];

  public static getInstance(): CreatorEconomyService {
    if (!CreatorEconomyService.instance) {
      CreatorEconomyService.instance = new CreatorEconomyService();
    }
    return CreatorEconomyService.instance;
  }

  constructor() {
    this.initializeCreatorTiers();
    this.initializeSubscriptionTiers();
  }

  private initializeCreatorTiers() {
    this.creatorTiers = [
      {
        name: 'Rising Star',
        level: 1,
        minFollowers: 0,
        minRevenue: 0,
        benefits: [
          'Basic analytics',
          'Standard support',
          'Gift receiving',
          'Basic customization'
        ],
        revenueShare: 70,
        platformFee: 30
      },
      {
        name: 'Popular Creator',
        level: 2,
        minFollowers: 1000,
        minRevenue: 100,
        benefits: [
          'Advanced analytics',
          'Priority support',
          'Custom badges',
          'Early access to features',
          'Creator tools'
        ],
        revenueShare: 75,
        platformFee: 25
      },
      {
        name: 'Influencer',
        level: 3,
        minFollowers: 10000,
        minRevenue: 1000,
        benefits: [
          'Premium analytics',
          'Dedicated support',
          'Brand partnership opportunities',
          'Merchandise store',
          'Subscription tiers',
          'Advanced creator tools'
        ],
        revenueShare: 80,
        platformFee: 20
      },
      {
        name: 'Superstar',
        level: 4,
        minFollowers: 100000,
        minRevenue: 10000,
        benefits: [
          'Enterprise analytics',
          'Personal account manager',
          'Exclusive brand deals',
          'Revenue sharing programs',
          'Platform partnership',
          'Custom features'
        ],
        revenueShare: 85,
        platformFee: 15
      },
      {
        name: 'Legend',
        level: 5,
        minFollowers: 1000000,
        minRevenue: 100000,
        benefits: [
          'White-label solutions',
          'Revenue sharing equity',
          'Platform advisory role',
          'Exclusive events',
          'Custom integrations',
          'Global expansion support'
        ],
        revenueShare: 90,
        platformFee: 10
      }
    ];
  }

  private initializeSubscriptionTiers() {
    this.subscriptionTiers = [
      {
        id: 'basic',
        name: 'Supporter',
        price: 4.99,
        currency: 'USD',
        benefits: [
          'Exclusive content access',
          'Supporter badge',
          'Priority chat',
          'Monthly Q&A session'
        ],
        duration: 'monthly',
        creatorRevenue: 3.49, // 70% of $4.99
        platformFee: 1.50
      },
      {
        id: 'premium',
        name: 'VIP Supporter',
        price: 9.99,
        currency: 'USD',
        benefits: [
          'All Supporter benefits',
          'VIP badge',
          'Direct messaging',
          'Custom content requests',
          'Weekly live sessions'
        ],
        duration: 'monthly',
        creatorRevenue: 6.99, // 70% of $9.99
        platformFee: 3.00
      },
      {
        id: 'ultimate',
        name: 'Ultimate Fan',
        price: 19.99,
        currency: 'USD',
        benefits: [
          'All VIP benefits',
          'Ultimate badge',
          'Personal shoutouts',
          'Exclusive merchandise',
          'Private group access',
          'Monthly 1-on-1 call'
        ],
        duration: 'monthly',
        creatorRevenue: 13.99, // 70% of $19.99
        platformFee: 6.00
      },
      {
        id: 'yearly_basic',
        name: 'Supporter (Yearly)',
        price: 49.99,
        currency: 'USD',
        benefits: [
          'All Supporter benefits',
          '2 months free',
          'Yearly supporter badge'
        ],
        duration: 'yearly',
        creatorRevenue: 34.99, // 70% of $49.99
        platformFee: 15.00
      },
      {
        id: 'yearly_premium',
        name: 'VIP Supporter (Yearly)',
        price: 99.99,
        currency: 'USD',
        benefits: [
          'All VIP benefits',
          '2 months free',
          'Yearly VIP badge'
        ],
        duration: 'yearly',
        creatorRevenue: 69.99, // 70% of $99.99
        platformFee: 30.00
      }
    ];
  }

  async getCreatorTier(userId: string): Promise<CreatorTier> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const stats = await this.getCreatorStats(userId);
      
      // Find appropriate tier based on followers and revenue
      const tier = this.creatorTiers
        .slice()
        .reverse()
        .find(t => 
          stats.totalFollowers >= t.minFollowers && 
          stats.totalRevenue >= t.minRevenue
        ) || this.creatorTiers[0]; // Default to lowest tier

      return tier;
    } catch (error) {
      logger.error('Failed to get creator tier:', error);
      return this.creatorTiers[0];
    }
  }

  async getCreatorStats(userId: string): Promise<CreatorStats> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get stream statistics
      const streams = await LiveStream.find({ hostId: userId });
      const totalStreams = streams.length;
      const totalViews = streams.reduce((sum, stream) => sum + (stream.totalViewers || 0), 0);
      const averageViewerCount = totalStreams > 0 ? totalViews / totalStreams : 0;

      // Get transaction statistics
      const transactions = await Transaction.find({ 
        userId,
        status: 'completed',
        type: { $in: ['gift_received', 'subscription', 'tip'] }
      });

      const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const monthlyRevenue = transactions
        .filter(tx => {
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return tx.createdAt >= monthAgo;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Calculate engagement rate (simplified)
      const engagementRate = totalViews > 0 ? (totalViews / (user.followers || 1)) * 100 : 0;

      // Calculate conversion rate (simplified)
      const conversionRate = totalViews > 0 ? (transactions.length / totalViews) * 100 : 0;

      // Get revenue breakdown
      const revenueBreakdown = {
        gifts: transactions.filter(tx => tx.type === 'gift_received').reduce((sum, tx) => sum + tx.amount, 0),
        subscriptions: transactions.filter(tx => tx.type === 'subscription').reduce((sum, tx) => sum + tx.amount, 0),
        tips: transactions.filter(tx => tx.type === 'tip').reduce((sum, tx) => sum + tx.amount, 0),
        brandDeals: 0, // Will be implemented separately
        merchandise: 0 // Will be implemented separately
      };

      // Get top categories
      const categoryCounts = streams.reduce((acc, stream) => {
        acc[stream.category] = (acc[stream.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      const tier = await this.getCreatorTier(userId);

      return {
        userId,
        username: user.username,
        tier,
        totalRevenue,
        monthlyRevenue,
        totalFollowers: user.followers || 0,
        totalStreams,
        totalViews,
        totalGifts: transactions.filter(tx => tx.type === 'gift_received').length,
        averageViewerCount,
        engagementRate,
        conversionRate,
        topCategories,
        revenueBreakdown
      };
    } catch (error) {
      logger.error('Failed to get creator stats:', error);
      throw error;
    }
  }

  async createSubscriptionTier(creatorId: string, tierData: Partial<SubscriptionTier>): Promise<SubscriptionTier> {
    try {
      const creatorTier = await this.getCreatorTier(creatorId);
      
      // Check if creator is eligible for subscriptions
      if (creatorTier.level < 3) {
        throw new Error('Creator must be at least Influencer tier to create subscriptions');
      }

      const subscriptionTier: SubscriptionTier = {
        id: `${creatorId}_${Date.now()}`,
        name: tierData.name || 'Custom Tier',
        price: tierData.price || 9.99,
        currency: tierData.currency || 'USD',
        benefits: tierData.benefits || ['Exclusive content'],
        duration: tierData.duration || 'monthly',
        creatorRevenue: (tierData.price || 9.99) * (creatorTier.revenueShare / 100),
        platformFee: (tierData.price || 9.99) * (creatorTier.platformFee / 100)
      };

      // Store subscription tier (in production, use a database)
      logger.info('Created subscription tier:', subscriptionTier);
      
      return subscriptionTier;
    } catch (error) {
      logger.error('Failed to create subscription tier:', error);
      throw error;
    }
  }

  async processSubscriptionPayment(subscriberId: string, creatorId: string, tierId: string): Promise<boolean> {
    try {
      const creatorTier = await this.getCreatorTier(creatorId);
      const subscriptionTier = this.subscriptionTiers.find(t => t.id === tierId);
      
      if (!subscriptionTier) {
        throw new Error('Subscription tier not found');
      }

      // Create transaction records
      const creatorTransaction = new Transaction({
        userId: creatorId,
        type: 'subscription',
        amount: subscriptionTier.creatorRevenue,
        currency: subscriptionTier.currency,
        status: 'completed',
        description: `Subscription payment from ${subscriberId}`,
        metadata: {
          subscriberId,
          tierId,
          subscriptionTier: subscriptionTier.name,
          platformFee: subscriptionTier.platformFee
        },
        netAmount: subscriptionTier.creatorRevenue
      });

      await creatorTransaction.save();

      // Update creator's subscription count
      await User.findByIdAndUpdate(creatorId, {
        $inc: { 'subscriptions.totalRevenue': subscriptionTier.creatorRevenue }
      });

      logger.info('Subscription payment processed:', {
        subscriberId,
        creatorId,
        tierId,
        amount: subscriptionTier.creatorRevenue
      });

      return true;
    } catch (error) {
      logger.error('Failed to process subscription payment:', error);
      return false;
    }
  }

  async createBrandDeal(dealData: Partial<BrandDeal>): Promise<BrandDeal> {
    try {
      const creatorTier = await this.getCreatorTier(dealData.creatorId!);
      
      // Check if creator is eligible for brand deals
      if (creatorTier.level < 3) {
        throw new Error('Creator must be at least Influencer tier for brand deals');
      }

      const brandDeal: BrandDeal = {
        id: `deal_${Date.now()}`,
        creatorId: dealData.creatorId!,
        brandName: dealData.brandName!,
        dealType: dealData.dealType || 'sponsored_stream',
        amount: dealData.amount!,
        currency: dealData.currency || 'USD',
        status: 'pending',
        startDate: dealData.startDate || new Date(),
        endDate: dealData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        requirements: dealData.requirements || [],
        deliverables: dealData.deliverables || [],
        commission: creatorTier.platformFee
      };

      // Store brand deal (in production, use a database)
      logger.info('Created brand deal:', brandDeal);
      
      return brandDeal;
    } catch (error) {
      logger.error('Failed to create brand deal:', error);
      throw error;
    }
  }

  async processBrandDealPayment(dealId: string): Promise<boolean> {
    try {
      // In production, fetch deal from database
      const deal: BrandDeal = {
        id: dealId,
        creatorId: 'mock_creator',
        brandName: 'Mock Brand',
        dealType: 'sponsored_stream',
        amount: 1000,
        currency: 'USD',
        status: 'completed',
        startDate: new Date(),
        endDate: new Date(),
        requirements: [],
        deliverables: [],
        commission: 20
      };

      const creatorTier = await this.getCreatorTier(deal.creatorId);
      const creatorRevenue = deal.amount * (creatorTier.revenueShare / 100);
      const platformFee = deal.amount * (creatorTier.platformFee / 100);

      // Create transaction record
      const transaction = new Transaction({
        userId: deal.creatorId,
        type: 'brand_deal',
        amount: creatorRevenue,
        currency: deal.currency,
        status: 'completed',
        description: `Brand deal payment from ${deal.brandName}`,
        metadata: {
          dealId,
          brandName: deal.brandName,
          dealType: deal.dealType,
          platformFee
        },
        netAmount: creatorRevenue
      });

      await transaction.save();

      logger.info('Brand deal payment processed:', {
        dealId,
        creatorId: deal.creatorId,
        amount: creatorRevenue
      });

      return true;
    } catch (error) {
      logger.error('Failed to process brand deal payment:', error);
      return false;
    }
  }

  async getCreatorLeaderboard(limit: number = 10): Promise<CreatorStats[]> {
    try {
      const creators = await User.find({ 
        followers: { $gte: 100 } // Only creators with at least 100 followers
      })
        .sort({ followers: -1 })
        .limit(limit * 2); // Get more to filter by revenue

      const creatorStats = await Promise.all(
        creators.map(creator => this.getCreatorStats(creator._id.toString()))
      );

      // Sort by total revenue and return top creators
      return creatorStats
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get creator leaderboard:', error);
      return [];
    }
  }

  async getPlatformRevenueStats(): Promise<{
    totalPlatformRevenue: number;
    totalCreatorRevenue: number;
    monthlyPlatformRevenue: number;
    monthlyCreatorRevenue: number;
    topRevenueSources: Array<{ source: string; revenue: number }>;
  }> {
    try {
      const transactions = await Transaction.find({ status: 'completed' });
      
      const totalPlatformRevenue = transactions
        .filter(tx => tx.type === 'platform_fee')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const totalCreatorRevenue = transactions
        .filter(tx => ['gift_received', 'subscription', 'tip', 'brand_deal'].includes(tx.type))
        .reduce((sum, tx) => sum + tx.amount, 0);

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const monthlyPlatformRevenue = transactions
        .filter(tx => tx.type === 'platform_fee' && tx.createdAt >= monthAgo)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const monthlyCreatorRevenue = transactions
        .filter(tx => 
          ['gift_received', 'subscription', 'tip', 'brand_deal'].includes(tx.type) && 
          tx.createdAt >= monthAgo
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Calculate revenue by source
      const revenueBySource = transactions.reduce((acc, tx) => {
        const source = tx.type;
        acc[source] = (acc[source] || 0) + tx.amount;
        return acc;
      }, {} as Record<string, number>);

      const topRevenueSources = Object.entries(revenueBySource)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([source, revenue]) => ({ source, revenue }));

      return {
        totalPlatformRevenue,
        totalCreatorRevenue,
        monthlyPlatformRevenue,
        monthlyCreatorRevenue,
        topRevenueSources
      };
    } catch (error) {
      logger.error('Failed to get platform revenue stats:', error);
      throw error;
    }
  }
}

export const creatorEconomyService = CreatorEconomyService.getInstance();
