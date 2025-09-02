import logger from '../../utils/logger';
import mongoose from 'mongoose';
import crypto from 'crypto';

export interface CreatorTier {
  id: string;
  creatorId: string;
  name: string;
  price: number;
  currency: 'USD' | 'HALOBUZZ_COIN' | 'USDC';
  billingCycle: 'monthly' | 'yearly';
  benefits: {
    exclusiveContent: boolean;
    directMessaging: boolean;
    priorityComments: boolean;
    customEmotes: string[];
    monthlyNFTDrop: boolean;
    videoCallAccess: boolean;
    earlyAccess: boolean;
    behindTheScenes: boolean;
    liveStreamPriority: boolean;
    customBadge: boolean;
    shoutout: boolean;
    merchandise: boolean;
  };
  subscriberCount: number;
  maxSubscribers?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  subscriberId: string;
  creatorId: string;
  tierId: string;
  status: 'active' | 'cancelled' | 'expired' | 'paused' | 'pending';
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date;
  amount: number;
  currency: string;
  billingCycle: string;
  paymentMethod: {
    type: 'card' | 'wallet' | 'crypto';
    last4?: string;
    provider?: string;
  };
  autoRenew: boolean;
  cancellationReason?: string;
  cancelledAt?: Date;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriberAnalytics {
  totalSubscribers: number;
  activeSubscribers: number;
  newSubscribers: number;
  churnRate: number;
  averageRevenuePerUser: number;
  monthlyRecurringRevenue: number;
  tierDistribution: Array<{
    tierId: string;
    tierName: string;
    subscriberCount: number;
    revenue: number;
  }>;
  subscriberGrowth: Array<{
    date: string;
    newSubscribers: number;
    totalSubscribers: number;
  }>;
  topSubscribers: Array<{
    subscriberId: string;
    username: string;
    subscriptionLength: number;
    totalPaid: number;
    tier: string;
  }>;
  demographics: {
    ageGroups: Record<string, number>;
    countries: Record<string, number>;
    genders: Record<string, number>;
  };
}

export interface RevenueProjection {
  currentMRR: number;
  projectedMRR: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    nextYear: number;
  };
  growthRate: number;
  churnRate: number;
  newSubscriberProjection: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
  };
  confidence: number;
  assumptions: string[];
}

export interface ExclusiveContent {
  id: string;
  creatorId: string;
  tierId: string;
  title: string;
  description: string;
  contentType: 'video' | 'image' | 'audio' | 'text' | 'live_stream';
  contentUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  isLive: boolean;
  scheduledTime?: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  accessLevel: 'tier_specific' | 'all_subscribers';
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

// Creator Tier Schema
const creatorTierSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['USD', 'HALOBUZZ_COIN', 'USDC'], required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
  benefits: {
    exclusiveContent: { type: Boolean, default: false },
    directMessaging: { type: Boolean, default: false },
    priorityComments: { type: Boolean, default: false },
    customEmotes: [{ type: String }],
    monthlyNFTDrop: { type: Boolean, default: false },
    videoCallAccess: { type: Boolean, default: false },
    earlyAccess: { type: Boolean, default: false },
    behindTheScenes: { type: Boolean, default: false },
    liveStreamPriority: { type: Boolean, default: false },
    customBadge: { type: Boolean, default: false },
    shoutout: { type: Boolean, default: false },
    merchandise: { type: Boolean, default: false }
  },
  subscriberCount: { type: Number, default: 0 },
  maxSubscribers: { type: Number },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tierId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorTier', required: true },
  status: { type: String, enum: ['active', 'cancelled', 'expired', 'paused', 'pending'], default: 'pending' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  nextBillingDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  billingCycle: { type: String, required: true },
  paymentMethod: {
    type: { type: String, enum: ['card', 'wallet', 'crypto'] },
    last4: { type: String },
    provider: { type: String }
  },
  autoRenew: { type: Boolean, default: true },
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Exclusive Content Schema
const exclusiveContentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tierId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorTier', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  contentType: { type: String, enum: ['video', 'image', 'audio', 'text', 'live_stream'], required: true },
  contentUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  duration: { type: Number },
  isLive: { type: Boolean, default: false },
  scheduledTime: { type: Date },
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  accessLevel: { type: String, enum: ['tier_specific', 'all_subscribers'], default: 'tier_specific' },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

const CreatorTierModel = mongoose.model('CreatorTier', creatorTierSchema);
const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);
const ExclusiveContentModel = mongoose.model('ExclusiveContent', exclusiveContentSchema);

export class AdvancedSubscriptionService {
  private static instance: AdvancedSubscriptionService;
  private subscriptionCache: Map<string, Subscription[]> = new Map();

  private constructor() {
    this.initializeBillingMonitoring();
    logger.info('AdvancedSubscriptionService initialized');
  }

  static getInstance(): AdvancedSubscriptionService {
    if (!AdvancedSubscriptionService.instance) {
      AdvancedSubscriptionService.instance = new AdvancedSubscriptionService();
    }
    return AdvancedSubscriptionService.instance;
  }

  /**
   * Multi-tier subscription management
   */
  async createSubscriptionTier(creatorId: string, tierData: Partial<CreatorTier>): Promise<CreatorTier> {
    try {
      const tierId = this.generateTierId();
      
      const tier = new CreatorTierModel({
        id: tierId,
        creatorId,
        name: tierData.name,
        price: tierData.price,
        currency: tierData.currency || 'USD',
        billingCycle: tierData.billingCycle || 'monthly',
        benefits: tierData.benefits || {},
        maxSubscribers: tierData.maxSubscribers,
        isActive: true
      });

      await tier.save();

      logger.info('Subscription tier created', {
        tierId,
        creatorId,
        name: tierData.name,
        price: tierData.price,
        currency: tierData.currency
      });

      return this.mapToCreatorTier(tier);
    } catch (error) {
      logger.error('Error creating subscription tier:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to creator tier
   */
  async subscribeUser(subscriberId: string, creatorId: string, tierId: string, paymentMethod: any): Promise<Subscription> {
    try {
      const tier = await CreatorTierModel.findOne({ id: tierId, creatorId });
      if (!tier) {
        throw new Error(`Tier ${tierId} not found for creator ${creatorId}`);
      }

      if (!tier.isActive) {
        throw new Error(`Tier ${tierId} is not active`);
      }

      if (tier.maxSubscribers && tier.subscriberCount >= tier.maxSubscribers) {
        throw new Error(`Tier ${tierId} has reached maximum subscribers`);
      }

      // Check for existing active subscription
      const existingSubscription = await SubscriptionModel.findOne({
        subscriberId,
        creatorId,
        status: 'active'
      });

      if (existingSubscription) {
        throw new Error('User already has an active subscription to this creator');
      }

      const subscriptionId = this.generateSubscriptionId();
      const now = new Date();
      const endDate = new Date(now);
      
      if (tier.billingCycle === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      const subscription = new SubscriptionModel({
        id: subscriptionId,
        subscriberId,
        creatorId,
        tierId: tier._id,
        status: 'pending',
        startDate: now,
        endDate,
        nextBillingDate: endDate,
        amount: tier.price,
        currency: tier.currency,
        billingCycle: tier.billingCycle,
        paymentMethod,
        autoRenew: true
      });

      await subscription.save();

      // Process payment (mock implementation)
      const paymentSuccess = await this.processPayment(subscription, paymentMethod);
      
      if (paymentSuccess) {
        subscription.status = 'active';
        tier.subscriberCount += 1;
        await Promise.all([subscription.save(), tier.save()]);
      } else {
        subscription.status = 'cancelled';
        subscription.cancellationReason = 'Payment failed';
        await subscription.save();
        throw new Error('Payment processing failed');
      }

      logger.info('User subscribed successfully', {
        subscriptionId,
        subscriberId,
        creatorId,
        tierId,
        amount: tier.price,
        currency: tier.currency
      });

      return this.mapToSubscription(subscription);
    } catch (error) {
      logger.error('Error subscribing user:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<boolean> {
    try {
      const subscription = await SubscriptionModel.findOne({ id: subscriptionId });
      if (!subscription) {
        throw new Error(`Subscription ${subscriptionId} not found`);
      }

      if (subscription.status !== 'active') {
        throw new Error(`Subscription ${subscriptionId} is not active`);
      }

      subscription.status = 'cancelled';
      subscription.cancellationReason = reason || 'User requested';
      subscription.cancelledAt = new Date();
      subscription.autoRenew = false;
      await subscription.save();

      // Update tier subscriber count
      const tier = await CreatorTierModel.findById(subscription.tierId);
      if (tier) {
        tier.subscriberCount = Math.max(0, tier.subscriberCount - 1);
        await tier.save();
      }

      logger.info('Subscription cancelled', {
        subscriptionId,
        subscriberId: subscription.subscriberId,
        creatorId: subscription.creatorId,
        reason
      });

      return true;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  /**
   * Subscriber analytics and insights
   */
  async getSubscriberInsights(creatorId: string): Promise<SubscriberAnalytics> {
    try {
      const subscriptions = await SubscriptionModel.find({ creatorId });
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
      
      const totalSubscribers = subscriptions.length;
      const activeSubscribers = activeSubscriptions.length;
      
      // Calculate new subscribers (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const newSubscribers = subscriptions.filter(sub => sub.createdAt >= thirtyDaysAgo).length;
      
      // Calculate churn rate
      const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled');
      const churnRate = totalSubscribers > 0 ? (cancelledSubscriptions.length / totalSubscribers) * 100 : 0;
      
      // Calculate ARPU and MRR
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
      const averageRevenuePerUser = activeSubscribers > 0 ? totalRevenue / activeSubscribers : 0;
      const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
        return sum + (sub.billingCycle === 'monthly' ? sub.amount : sub.amount / 12);
      }, 0);

      // Get tier distribution
      const tierDistribution = await this.getTierDistribution(creatorId);
      
      // Get subscriber growth data
      const subscriberGrowth = await this.getSubscriberGrowth(creatorId, 30);
      
      // Get top subscribers
      const topSubscribers = await this.getTopSubscribers(creatorId);
      
      // Get demographics (mock implementation)
      const demographics = await this.getSubscriberDemographics(creatorId);

      const analytics: SubscriberAnalytics = {
        totalSubscribers,
        activeSubscribers,
        newSubscribers,
        churnRate,
        averageRevenuePerUser,
        monthlyRecurringRevenue,
        tierDistribution,
        subscriberGrowth,
        topSubscribers,
        demographics
      };

      logger.info('Subscriber insights generated', {
        creatorId,
        totalSubscribers,
        activeSubscribers,
        monthlyRecurringRevenue
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting subscriber insights:', error);
      throw error;
    }
  }

  /**
   * Exclusive content delivery
   */
  async deliverExclusiveContent(tierId: string, content: Partial<ExclusiveContent>): Promise<ExclusiveContent> {
    try {
      const contentId = this.generateContentId();
      
      const exclusiveContent = new ExclusiveContentModel({
        id: contentId,
        creatorId: content.creatorId,
        tierId,
        title: content.title,
        description: content.description,
        contentType: content.contentType,
        contentUrl: content.contentUrl,
        thumbnailUrl: content.thumbnailUrl,
        duration: content.duration,
        isLive: content.isLive || false,
        scheduledTime: content.scheduledTime,
        accessLevel: content.accessLevel || 'tier_specific',
        metadata: content.metadata || {}
      });

      await exclusiveContent.save();

      // Notify subscribers
      await this.notifySubscribers(tierId, exclusiveContent);

      logger.info('Exclusive content delivered', {
        contentId,
        tierId,
        contentType: content.contentType,
        isLive: content.isLive
      });

      return this.mapToExclusiveContent(exclusiveContent);
    } catch (error) {
      logger.error('Error delivering exclusive content:', error);
      throw error;
    }
  }

  /**
   * Subscription revenue forecasting
   */
  async forecastRevenue(creatorId: string, timeframe: string): Promise<RevenueProjection> {
    try {
      const currentMRR = await this.calculateCurrentMRR(creatorId);
      const growthRate = await this.calculateGrowthRate(creatorId);
      const churnRate = await this.calculateChurnRate(creatorId);
      
      const projections = this.calculateProjections(currentMRR, growthRate, churnRate);
      const newSubscriberProjection = await this.projectNewSubscribers(creatorId, growthRate);
      
      const confidence = this.calculateConfidence(growthRate, churnRate);
      const assumptions = this.generateAssumptions(growthRate, churnRate);

      const forecast: RevenueProjection = {
        currentMRR,
        projectedMRR: projections,
        growthRate,
        churnRate,
        newSubscriberProjection,
        confidence,
        assumptions
      };

      logger.info('Revenue forecast generated', {
        creatorId,
        currentMRR,
        growthRate,
        churnRate,
        confidence
      });

      return forecast;
    } catch (error) {
      logger.error('Error forecasting revenue:', error);
      throw error;
    }
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const subscriptions = await SubscriptionModel.find({ 
        subscriberId: userId,
        status: { $in: ['active', 'pending'] }
      }).populate('creatorId', 'username avatar').populate('tierId', 'name price benefits');

      return subscriptions.map(sub => this.mapToSubscription(sub));
    } catch (error) {
      logger.error('Error getting user subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get creator's subscription tiers
   */
  async getCreatorTiers(creatorId: string): Promise<CreatorTier[]> {
    try {
      const tiers = await CreatorTierModel.find({ 
        creatorId,
        isActive: true
      }).sort({ price: 1 });

      return tiers.map(tier => this.mapToCreatorTier(tier));
    } catch (error) {
      logger.error('Error getting creator tiers:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateTierId(): string {
    return `tier_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateContentId(): string {
    return `content_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private async processPayment(subscription: any, paymentMethod: any): Promise<boolean> {
    // Mock payment processing - in real implementation, integrate with payment providers
    return Math.random() > 0.1; // 90% success rate
  }

  private async getTierDistribution(creatorId: string): Promise<Array<{
    tierId: string;
    tierName: string;
    subscriberCount: number;
    revenue: number;
  }>> {
    const tiers = await CreatorTierModel.find({ creatorId });
    const distribution = [];

    for (const tier of tiers) {
      const subscribers = await SubscriptionModel.countDocuments({
        tierId: tier._id,
        status: 'active'
      });

      distribution.push({
        tierId: tier.id,
        tierName: tier.name,
        subscriberCount: subscribers,
        revenue: subscribers * tier.price
      });
    }

    return distribution;
  }

  private async getSubscriberGrowth(creatorId: string, days: number): Promise<Array<{
    date: string;
    newSubscribers: number;
    totalSubscribers: number;
  }>> {
    const growth = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const newSubscribers = await SubscriptionModel.countDocuments({
        creatorId,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });

      const totalSubscribers = await SubscriptionModel.countDocuments({
        creatorId,
        createdAt: { $lte: endOfDay }
      });

      growth.push({
        date: startOfDay.toISOString().split('T')[0],
        newSubscribers,
        totalSubscribers
      });
    }

    return growth;
  }

  private async getTopSubscribers(creatorId: string): Promise<Array<{
    subscriberId: string;
    username: string;
    subscriptionLength: number;
    totalPaid: number;
    tier: string;
  }>> {
    const subscriptions = await SubscriptionModel.find({
      creatorId,
      status: 'active'
    }).populate('subscriberId', 'username').populate('tierId', 'name').sort({ createdAt: 1 }).limit(10);

    return subscriptions.map(sub => ({
      subscriberId: sub.subscriberId._id.toString(),
      username: (sub.subscriberId as any).username,
      subscriptionLength: Math.floor((Date.now() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      totalPaid: sub.amount,
      tier: (sub.tierId as any).name
    }));
  }

  private async getSubscriberDemographics(creatorId: string): Promise<{
    ageGroups: Record<string, number>;
    countries: Record<string, number>;
    genders: Record<string, number>;
  }> {
    // Mock demographics - in real implementation, query user data
    return {
      ageGroups: { '18-24': 30, '25-34': 40, '35-44': 20, '45+': 10 },
      countries: { 'US': 40, 'UK': 20, 'CA': 15, 'AU': 10, 'Other': 15 },
      genders: { 'male': 60, 'female': 35, 'other': 5 }
    };
  }

  private async calculateCurrentMRR(creatorId: string): Promise<number> {
    const activeSubscriptions = await SubscriptionModel.find({
      creatorId,
      status: 'active'
    });

    return activeSubscriptions.reduce((sum, sub) => {
      return sum + (sub.billingCycle === 'monthly' ? sub.amount : sub.amount / 12);
    }, 0);
  }

  private async calculateGrowthRate(creatorId: string): Promise<number> {
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const lastMonthSubs = await SubscriptionModel.countDocuments({
      creatorId,
      createdAt: { $gte: lastMonth, $lt: now }
    });

    const twoMonthsAgoSubs = await SubscriptionModel.countDocuments({
      creatorId,
      createdAt: { $gte: twoMonthsAgo, $lt: lastMonth }
    });

    return twoMonthsAgoSubs > 0 ? ((lastMonthSubs - twoMonthsAgoSubs) / twoMonthsAgoSubs) * 100 : 0;
  }

  private async calculateChurnRate(creatorId: string): Promise<number> {
    const totalSubscriptions = await SubscriptionModel.countDocuments({ creatorId });
    const cancelledSubscriptions = await SubscriptionModel.countDocuments({
      creatorId,
      status: 'cancelled'
    });

    return totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0;
  }

  private calculateProjections(currentMRR: number, growthRate: number, churnRate: number): {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    nextYear: number;
  } {
    const netGrowthRate = (growthRate - churnRate) / 100;
    
    return {
      nextMonth: currentMRR * (1 + netGrowthRate),
      next3Months: currentMRR * Math.pow(1 + netGrowthRate, 3),
      next6Months: currentMRR * Math.pow(1 + netGrowthRate, 6),
      nextYear: currentMRR * Math.pow(1 + netGrowthRate, 12)
    };
  }

  private async projectNewSubscribers(creatorId: string, growthRate: number): Promise<{
    nextMonth: number;
    next3Months: number;
    next6Months: number;
  }> {
    const currentSubscribers = await SubscriptionModel.countDocuments({
      creatorId,
      status: 'active'
    });

    const monthlyGrowth = (growthRate / 100) * currentSubscribers;

    return {
      nextMonth: Math.round(monthlyGrowth),
      next3Months: Math.round(monthlyGrowth * 3),
      next6Months: Math.round(monthlyGrowth * 6)
    };
  }

  private calculateConfidence(growthRate: number, churnRate: number): number {
    // Confidence based on stability of growth and churn rates
    const stability = 1 - Math.abs(growthRate - churnRate) / 100;
    return Math.max(0.3, Math.min(0.95, stability));
  }

  private generateAssumptions(growthRate: number, churnRate: number): string[] {
    const assumptions = [
      'Current growth and churn rates will remain consistent',
      'No major market changes or competitor actions',
      'Creator maintains current content quality and engagement'
    ];

    if (growthRate > 20) {
      assumptions.push('High growth rate may not be sustainable long-term');
    }

    if (churnRate > 15) {
      assumptions.push('High churn rate indicates potential retention issues');
    }

    return assumptions;
  }

  private async notifySubscribers(tierId: string, content: any): Promise<void> {
    // Mock notification - in real implementation, send push notifications, emails, etc.
    logger.info('Notifying subscribers of new exclusive content', {
      tierId,
      contentId: content.id,
      contentType: content.contentType
    });
  }

  private initializeBillingMonitoring(): void {
    // Monitor billing dates every hour
    setInterval(async () => {
      try {
        const now = new Date();
        const dueSubscriptions = await SubscriptionModel.find({
          status: 'active',
          nextBillingDate: { $lte: now },
          autoRenew: true
        });

        for (const subscription of dueSubscriptions) {
          await this.processBilling(subscription);
        }
      } catch (error) {
        logger.error('Error monitoring billing:', error);
      }
    }, 3600000); // Check every hour
  }

  private async processBilling(subscription: any): Promise<void> {
    try {
      // Process payment
      const paymentSuccess = await this.processPayment(subscription, subscription.paymentMethod);
      
      if (paymentSuccess) {
        // Extend subscription
        const newEndDate = new Date(subscription.endDate);
        if (subscription.billingCycle === 'monthly') {
          newEndDate.setMonth(newEndDate.getMonth() + 1);
        } else {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        }

        subscription.endDate = newEndDate;
        subscription.nextBillingDate = newEndDate;
        await subscription.save();

        logger.info('Subscription renewed successfully', {
          subscriptionId: subscription.id,
          newEndDate
        });
      } else {
        // Payment failed - mark as expired
        subscription.status = 'expired';
        await subscription.save();

        logger.warn('Subscription payment failed', {
          subscriptionId: subscription.id
        });
      }
    } catch (error) {
      logger.error('Error processing billing:', error);
    }
  }

  private mapToCreatorTier(tier: any): CreatorTier {
    return {
      id: tier.id,
      creatorId: tier.creatorId,
      name: tier.name,
      price: tier.price,
      currency: tier.currency,
      billingCycle: tier.billingCycle,
      benefits: tier.benefits,
      subscriberCount: tier.subscriberCount,
      maxSubscribers: tier.maxSubscribers,
      isActive: tier.isActive,
      createdAt: tier.createdAt,
      updatedAt: tier.updatedAt
    };
  }

  private mapToSubscription(subscription: any): Subscription {
    return {
      id: subscription.id,
      subscriberId: subscription.subscriberId,
      creatorId: subscription.creatorId,
      tierId: subscription.tierId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBillingDate: subscription.nextBillingDate,
      amount: subscription.amount,
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      paymentMethod: subscription.paymentMethod,
      autoRenew: subscription.autoRenew,
      cancellationReason: subscription.cancellationReason,
      cancelledAt: subscription.cancelledAt,
      metadata: subscription.metadata,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt
    };
  }

  private mapToExclusiveContent(content: any): ExclusiveContent {
    return {
      id: content.id,
      creatorId: content.creatorId,
      tierId: content.tierId,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
      contentUrl: content.contentUrl,
      thumbnailUrl: content.thumbnailUrl,
      duration: content.duration,
      isLive: content.isLive,
      scheduledTime: content.scheduledTime,
      viewCount: content.viewCount,
      likeCount: content.likeCount,
      commentCount: content.commentCount,
      accessLevel: content.accessLevel,
      metadata: content.metadata,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt
    };
  }
}

export default AdvancedSubscriptionService;
