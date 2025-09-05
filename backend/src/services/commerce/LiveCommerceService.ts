import { logger } from '@/config/logger';
import mongoose from 'mongoose';
import crypto from 'crypto';

export interface ShoppableProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'HALOBUZZ_COIN';
  images: string[];
  description: string;
  shortDescription: string;
  inventory: number;
  categories: string[];
  tags: string[];
  creatorId: string;
  streamId?: string;
  isActive: boolean;
  isFeatured: boolean;
  discount?: {
    percentage: number;
    validUntil: Date;
  };
  variants?: Array<{
    id: string;
    name: string;
    price: number;
    inventory: number;
    attributes: Record<string, string>;
  }>;
  shipping: {
    freeShipping: boolean;
    estimatedDays: number;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
  ratings: {
    average: number;
    count: number;
    distribution: Record<string, number>;
  };
  analytics: {
    views: number;
    clicks: number;
    purchases: number;
    conversionRate: number;
    revenue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveShoppingSession {
  id: string;
  streamId: string;
  creatorId: string;
  products: string[];
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  totalSales: number;
  totalRevenue: number;
  viewerCount: number;
  engagement: {
    productClicks: number;
    addToCart: number;
    purchases: number;
    shares: number;
  };
  featuredProducts: string[];
  currentProduct?: string;
  sessionStats: {
    averageViewTime: number;
    peakViewers: number;
    conversionRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupBuy {
  id: string;
  productId: string;
  initiatorId: string;
  targetQuantity: number;
  currentQuantity: number;
  discountTiers: Array<{
    quantity: number;
    discountPercentage: number;
  }>;
  participants: Array<{
    userId: string;
    quantity: number;
    joinedAt: Date;
  }>;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  expiresAt: Date;
  currentDiscount: number;
  savings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiveCheckout {
  id: string;
  userId: string;
  productId: string;
  streamId: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  paymentMethod: {
    type: 'card' | 'wallet' | 'crypto';
    details: any;
  };
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  orderNumber: string;
  estimatedDelivery: Date;
  trackingNumber?: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommerceAnalytics {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  salesByStream: Array<{
    streamId: string;
    streamTitle: string;
    sales: number;
    revenue: number;
    viewerCount: number;
  }>;
  customerInsights: {
    repeatCustomers: number;
    newCustomers: number;
    averageCustomerValue: number;
    topCountries: Record<string, number>;
  };
  trends: Array<{
    date: string;
    sales: number;
    revenue: number;
    orders: number;
  }>;
}

// Product Schema
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  currency: { type: String, enum: ['USD', 'EUR', 'GBP', 'HALOBUZZ_COIN'], required: true },
  images: [{ type: String }],
  description: { type: String, required: true },
  shortDescription: { type: String, required: true },
  inventory: { type: Number, required: true },
  categories: [{ type: String }],
  tags: [{ type: String }],
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream' },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  discount: {
    percentage: { type: Number },
    validUntil: { type: Date }
  },
  variants: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    inventory: { type: Number, required: true },
    attributes: { type: mongoose.Schema.Types.Mixed }
  }],
  shipping: {
    freeShipping: { type: Boolean, default: false },
    estimatedDays: { type: Number, required: true },
    weight: { type: Number, required: true },
    dimensions: {
      length: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    }
  },
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    distribution: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Live Shopping Session Schema
const liveShoppingSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  isActive: { type: Boolean, default: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  totalSales: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  viewerCount: { type: Number, default: 0 },
  engagement: {
    productClicks: { type: Number, default: 0 },
    addToCart: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  featuredProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  currentProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  sessionStats: {
    averageViewTime: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Group Buy Schema
const groupBuySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetQuantity: { type: Number, required: true },
  currentQuantity: { type: Number, default: 0 },
  discountTiers: [{
    quantity: { type: Number, required: true },
    discountPercentage: { type: Number, required: true }
  }],
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quantity: { type: Number, required: true },
    joinedAt: { type: Date, required: true }
  }],
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'expired'], default: 'active' },
  expiresAt: { type: Date, required: true },
  currentDiscount: { type: Number, default: 0 },
  savings: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Live Checkout Schema
const liveCheckoutSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  paymentMethod: {
    type: { type: String, enum: ['card', 'wallet', 'crypto'], required: true },
    details: { type: mongoose.Schema.Types.Mixed }
  },
  shippingAddress: {
    name: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String }
  },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  transactionId: { type: String },
  orderNumber: { type: String, required: true },
  estimatedDelivery: { type: Date },
  trackingNumber: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

const ProductModel = mongoose.model('Product', productSchema);
const LiveShoppingSessionModel = mongoose.model('LiveShoppingSession', liveShoppingSessionSchema);
const GroupBuyModel = mongoose.model('GroupBuy', groupBuySchema);
const LiveCheckoutModel = mongoose.model('LiveCheckout', liveCheckoutSchema);

export class LiveCommerceService {
  private static instance: LiveCommerceService;
  private activeSessions: Map<string, LiveShoppingSession> = new Map();
  private activeGroupBuys: Map<string, GroupBuy> = new Map();

  private constructor() {
    this.initializeSessionMonitoring();
    this.initializeGroupBuyMonitoring();
    logger.info('LiveCommerceService initialized');
  }

  static getInstance(): LiveCommerceService {
    if (!LiveCommerceService.instance) {
      LiveCommerceService.instance = new LiveCommerceService();
    }
    return LiveCommerceService.instance;
  }

  /**
   * Add products to live streams
   */
  async addProductToStream(streamId: string, productId: string): Promise<void> {
    try {
      const product = await ProductModel.findOne({ id: productId });
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      // Get or create live shopping session
      let session = await LiveShoppingSessionModel.findOne({ streamId, isActive: true });
      if (!session) {
        const sessionId = this.generateSessionId();
        const stream = await mongoose.model('LiveStream').findById(streamId);
        if (!stream) {
          throw new Error(`Stream ${streamId} not found`);
        }

        session = new LiveShoppingSessionModel({
          id: sessionId,
          streamId,
          creatorId: stream.hostId,
          products: [product._id],
          startTime: new Date(),
          isActive: true
        });
      } else {
        if (!session.products.includes(product._id)) {
          session.products.push(product._id);
        }
      }

      await session.save();
      this.activeSessions.set(streamId, this.mapToLiveShoppingSession(session));

      // Update product stream association
      (product as any).streamId = streamId;
      await ProductModel.findByIdAndUpdate((product as any)._id, { streamId });

      logger.info('Product added to stream', {
        streamId,
        productId,
        sessionId: session.id
      });
    } catch (error) {
      logger.error('Error adding product to stream:', error);
      throw error;
    }
  }

  /**
   * Handle instant checkout during streams
   */
  async processLiveCheckout(productId: string, buyerId: string, streamId: string, quantity: number = 1, paymentMethod: any): Promise<LiveCheckout> {
    try {
      const product = await ProductModel.findOne({ id: productId });
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      if (!product.isActive) {
        throw new Error(`Product ${productId} is not available`);
      }

      if (product.inventory < quantity) {
        throw new Error(`Insufficient inventory for product ${productId}`);
      }

      // Calculate total amount
      const unitPrice = product.discount && product.discount.validUntil > new Date() 
        ? product.price * (1 - product.discount.percentage / 100)
        : product.price;
      const totalAmount = unitPrice * quantity;

      // Create checkout record
      const checkoutId = this.generateCheckoutId();
      const orderNumber = this.generateOrderNumber();

      const checkout = new LiveCheckoutModel({
        id: checkoutId,
        userId: buyerId,
        productId: product._id,
        streamId,
        quantity,
        totalAmount,
        currency: product.currency,
        paymentMethod,
        status: 'pending',
        orderNumber,
        estimatedDelivery: new Date(Date.now() + product.shipping.estimatedDays * 24 * 60 * 60 * 1000)
      });

      await checkout.save();

      // Process payment (mock implementation)
      const paymentSuccess = await this.processPayment(checkout, paymentMethod);
      
      if (paymentSuccess) {
        checkout.status = 'completed';
        checkout.transactionId = this.generateTransactionId();
        
        // Update inventory
        product.inventory -= quantity;
        product.analytics.purchases += quantity;
        product.analytics.revenue += totalAmount;
        product.analytics.conversionRate = product.analytics.purchases / Math.max(1, product.analytics.views);
        await product.save();

        // Update session stats
        await this.updateSessionStats(streamId, totalAmount, quantity);

        await checkout.save();

        logger.info('Live checkout completed', {
          checkoutId,
          productId,
          buyerId,
          streamId,
          totalAmount,
          quantity
        });
      } else {
        checkout.status = 'failed';
        await checkout.save();
        throw new Error('Payment processing failed');
      }

      return this.mapToLiveCheckout(checkout);
    } catch (error) {
      logger.error('Error processing live checkout:', error);
      throw error;
    }
  }

  /**
   * Group buying functionality
   */
  async initiateGroupBuy(productId: string, initiatorId: string, targetQuantity: number, discountTiers: Array<{ quantity: number; discountPercentage: number }>): Promise<GroupBuy> {
    try {
      const product = await ProductModel.findOne({ id: productId });
      if (!product) {
        throw new Error(`Product ${productId} not found`);
      }

      if (product.inventory < targetQuantity) {
        throw new Error(`Insufficient inventory for group buy`);
      }

      const groupBuyId = this.generateGroupBuyId();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const groupBuy = new GroupBuyModel({
        id: groupBuyId,
        productId: product._id,
        initiatorId,
        targetQuantity,
        currentQuantity: 0,
        discountTiers,
        participants: [],
        status: 'active',
        expiresAt,
        currentDiscount: 0,
        savings: 0
      });

      await groupBuy.save();
      this.activeGroupBuys.set(groupBuyId, this.mapToGroupBuy(groupBuy));

      logger.info('Group buy initiated', {
        groupBuyId,
        productId,
        initiatorId,
        targetQuantity,
        expiresAt
      });

      return this.mapToGroupBuy(groupBuy);
    } catch (error) {
      logger.error('Error initiating group buy:', error);
      throw error;
    }
  }

  /**
   * Join group buy
   */
  async joinGroupBuy(groupBuyId: string, userId: string, quantity: number): Promise<boolean> {
    try {
      const groupBuy = await GroupBuyModel.findOne({ id: groupBuyId });
      if (!groupBuy) {
        throw new Error(`Group buy ${groupBuyId} not found`);
      }

      if (groupBuy.status !== 'active') {
        throw new Error(`Group buy ${groupBuyId} is not active`);
      }

      if (new Date() > groupBuy.expiresAt) {
        groupBuy.status = 'expired';
        await groupBuy.save();
        throw new Error(`Group buy ${groupBuyId} has expired`);
      }

      // Check if user already joined
      const existingParticipant = groupBuy.participants.find(p => p.userId.toString() === userId);
      if (existingParticipant) {
        existingParticipant.quantity += quantity;
      } else {
        groupBuy.participants.push({
          userId,
          quantity,
          joinedAt: new Date()
        });
      }

      groupBuy.currentQuantity += quantity;

      // Update discount based on current quantity
      const currentDiscount = this.calculateGroupBuyDiscount(groupBuy.currentQuantity, groupBuy.discountTiers);
      groupBuy.currentDiscount = currentDiscount;

      // Calculate savings
      const product = await ProductModel.findById(groupBuy.productId);
      if (product) {
        const savingsPerUnit = product.price * (currentDiscount / 100);
        groupBuy.savings = savingsPerUnit * groupBuy.currentQuantity;
      }

      await groupBuy.save();
      this.activeGroupBuys.set(groupBuyId, this.mapToGroupBuy(groupBuy));

      // Check if target reached
      if (groupBuy.currentQuantity >= groupBuy.targetQuantity) {
        await this.completeGroupBuy(groupBuyId);
      }

      logger.info('User joined group buy', {
        groupBuyId,
        userId,
        quantity,
        currentQuantity: groupBuy.currentQuantity,
        currentDiscount: groupBuy.currentDiscount
      });

      return true;
    } catch (error) {
      logger.error('Error joining group buy:', error);
      throw error;
    }
  }

  /**
   * Creator product showcase management
   */
  async manageProductShowcase(creatorId: string, products: Partial<ShoppableProduct>[]): Promise<void> {
    try {
      for (const productData of products) {
        if (productData.id) {
          // Update existing product
          const product = await ProductModel.findOne({ id: productData.id, creatorId });
          if (product) {
            Object.assign(product, productData);
            await product.save();
          }
        } else {
          // Create new product
          const productId = this.generateProductId();
          const product = new ProductModel({
            id: productId,
            creatorId,
            ...productData
          });
          await product.save();
        }
      }

      logger.info('Product showcase managed', {
        creatorId,
        productCount: products.length
      });
    } catch (error) {
      logger.error('Error managing product showcase:', error);
      throw error;
    }
  }

  /**
   * Get live shopping session
   */
  async getLiveShoppingSession(streamId: string): Promise<LiveShoppingSession | null> {
    try {
      const session = await LiveShoppingSessionModel.findOne({ streamId, isActive: true });
      return session ? this.mapToLiveShoppingSession(session) : null;
    } catch (error) {
      logger.error('Error getting live shopping session:', error);
      throw error;
    }
  }

  /**
   * Get commerce analytics
   */
  async getCommerceAnalytics(creatorId?: string, timeframe: string = '30days'): Promise<CommerceAnalytics> {
    try {
      const days = parseInt(timeframe.replace('days', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get completed checkouts
      const query: any = { 
        status: 'completed',
        createdAt: { $gte: startDate }
      };
      if (creatorId) {
        query.creatorId = creatorId;
      }

      const checkouts = await LiveCheckoutModel.find(query).populate('productId');

      // Calculate analytics
      const totalSales = checkouts.reduce((sum, checkout) => sum + checkout.quantity, 0);
      const totalRevenue = checkouts.reduce((sum, checkout) => sum + checkout.totalAmount, 0);
      const averageOrderValue = totalSales > 0 ? totalRevenue / checkouts.length : 0;

      // Get top products
      const productSales = new Map();
      checkouts.forEach(checkout => {
        const productId = checkout.productId._id.toString();
        const productName = (checkout.productId as any).name;
        if (productSales.has(productId)) {
          const existing = productSales.get(productId);
          existing.sales += checkout.quantity;
          existing.revenue += checkout.totalAmount;
        } else {
          productSales.set(productId, {
            productId,
            name: productName,
            sales: checkout.quantity,
            revenue: checkout.totalAmount
          });
        }
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Get sales by stream
      const streamSales = new Map();
      checkouts.forEach(checkout => {
        const streamId = checkout.streamId.toString();
        if (streamSales.has(streamId)) {
          const existing = streamSales.get(streamId);
          existing.sales += checkout.quantity;
          existing.revenue += checkout.totalAmount;
        } else {
          streamSales.set(streamId, {
            streamId,
            streamTitle: `Stream ${streamId}`, // Would get actual title
            sales: checkout.quantity,
            revenue: checkout.totalAmount,
            viewerCount: 0 // Would get actual viewer count
          });
        }
      });

      const salesByStream = Array.from(streamSales.values())
        .sort((a, b) => b.revenue - a.revenue);

      // Get trends (mock implementation)
      const trends = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dayCheckouts = checkouts.filter(c => 
          c.createdAt.toDateString() === date.toDateString()
        );
        
        trends.push({
          date: date.toISOString().split('T')[0],
          sales: dayCheckouts.reduce((sum, c) => sum + c.quantity, 0),
          revenue: dayCheckouts.reduce((sum, c) => sum + c.totalAmount, 0),
          orders: dayCheckouts.length
        });
      }

      const analytics: CommerceAnalytics = {
        totalSales,
        totalRevenue,
        averageOrderValue,
        conversionRate: 0, // Would calculate from view data
        topProducts,
        salesByStream,
        customerInsights: {
          repeatCustomers: 0, // Would calculate from customer data
          newCustomers: 0,
          averageCustomerValue: averageOrderValue,
          topCountries: {} // Would get from shipping addresses
        },
        trends
      };

      logger.info('Commerce analytics generated', {
        creatorId,
        timeframe,
        totalSales,
        totalRevenue,
        averageOrderValue
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting commerce analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async processPayment(checkout: any, paymentMethod: any): Promise<boolean> {
    // Mock payment processing - in real implementation, integrate with payment providers
    return Math.random() > 0.1; // 90% success rate
  }

  private async updateSessionStats(streamId: string, revenue: number, quantity: number): Promise<void> {
    try {
      const session = await LiveShoppingSessionModel.findOne({ streamId, isActive: true });
      if (session) {
        session.totalSales += quantity;
        session.totalRevenue += revenue;
        session.engagement.purchases += 1;
        await session.save();
      }
    } catch (error) {
      logger.error('Error updating session stats:', error);
    }
  }

  private calculateGroupBuyDiscount(currentQuantity: number, discountTiers: Array<{ quantity: number; discountPercentage: number }>): number {
    let discount = 0;
    for (const tier of discountTiers.sort((a, b) => b.quantity - a.quantity)) {
      if (currentQuantity >= tier.quantity) {
        discount = tier.discountPercentage;
        break;
      }
    }
    return discount;
  }

  private async completeGroupBuy(groupBuyId: string): Promise<void> {
    try {
      const groupBuy = await GroupBuyModel.findOne({ id: groupBuyId });
      if (!groupBuy) return;

      groupBuy.status = 'completed';
      await groupBuy.save();

      // Process all participants' orders
      for (const participant of groupBuy.participants) {
        // Create checkout for each participant
        // This would integrate with the checkout system
        logger.info('Processing group buy order', {
          groupBuyId,
          userId: participant.userId,
          quantity: participant.quantity
        });
      }

      this.activeGroupBuys.delete(groupBuyId);

      logger.info('Group buy completed', {
        groupBuyId,
        totalParticipants: groupBuy.participants.length,
        totalQuantity: groupBuy.currentQuantity,
        finalDiscount: groupBuy.currentDiscount
      });
    } catch (error) {
      logger.error('Error completing group buy:', error);
    }
  }

  private initializeSessionMonitoring(): void {
    // Monitor active sessions every 5 minutes
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredSessions = await LiveShoppingSessionModel.find({
          isActive: true,
          endTime: { $lte: now }
        });

        for (const session of expiredSessions) {
          session.isActive = false;
          await session.save();
          this.activeSessions.delete(session.streamId.toString());
        }
      } catch (error) {
        logger.error('Error monitoring sessions:', error);
      }
    }, 300000); // Check every 5 minutes
  }

  private initializeGroupBuyMonitoring(): void {
    // Monitor active group buys every minute
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredGroupBuys = await GroupBuyModel.find({
          status: 'active',
          expiresAt: { $lte: now }
        });

        for (const groupBuy of expiredGroupBuys) {
          groupBuy.status = 'expired';
          await groupBuy.save();
          this.activeGroupBuys.delete(groupBuy.id);
        }
      } catch (error) {
        logger.error('Error monitoring group buys:', error);
      }
    }, 60000); // Check every minute
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateProductId(): string {
    return `product_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateGroupBuyId(): string {
    return `groupbuy_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateCheckoutId(): string {
    return `checkout_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private mapToShoppableProduct(product: any): ShoppableProduct {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      currency: product.currency,
      images: product.images,
      description: product.description,
      shortDescription: product.shortDescription,
      inventory: product.inventory,
      categories: product.categories,
      tags: product.tags,
      creatorId: product.creatorId,
      streamId: product.streamId,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      discount: product.discount,
      variants: product.variants,
      shipping: product.shipping,
      ratings: product.ratings,
      analytics: product.analytics,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
  }

  private mapToLiveShoppingSession(session: any): LiveShoppingSession {
    return {
      id: session.id,
      streamId: session.streamId,
      creatorId: session.creatorId,
      products: session.products,
      isActive: session.isActive,
      startTime: session.startTime,
      endTime: session.endTime,
      totalSales: session.totalSales,
      totalRevenue: session.totalRevenue,
      viewerCount: session.viewerCount,
      engagement: session.engagement,
      featuredProducts: session.featuredProducts,
      currentProduct: session.currentProduct,
      sessionStats: session.sessionStats,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  private mapToGroupBuy(groupBuy: any): GroupBuy {
    return {
      id: groupBuy.id,
      productId: groupBuy.productId,
      initiatorId: groupBuy.initiatorId,
      targetQuantity: groupBuy.targetQuantity,
      currentQuantity: groupBuy.currentQuantity,
      discountTiers: groupBuy.discountTiers,
      participants: groupBuy.participants,
      status: groupBuy.status,
      expiresAt: groupBuy.expiresAt,
      currentDiscount: groupBuy.currentDiscount,
      savings: groupBuy.savings,
      createdAt: groupBuy.createdAt,
      updatedAt: groupBuy.updatedAt
    };
  }

  private mapToLiveCheckout(checkout: any): LiveCheckout {
    return {
      id: checkout.id,
      userId: checkout.userId,
      productId: checkout.productId,
      streamId: checkout.streamId,
      quantity: checkout.quantity,
      totalAmount: checkout.totalAmount,
      currency: checkout.currency,
      paymentMethod: checkout.paymentMethod,
      shippingAddress: checkout.shippingAddress,
      status: checkout.status,
      transactionId: checkout.transactionId,
      orderNumber: checkout.orderNumber,
      estimatedDelivery: checkout.estimatedDelivery,
      trackingNumber: checkout.trackingNumber,
      metadata: checkout.metadata,
      createdAt: checkout.createdAt,
      updatedAt: checkout.updatedAt
    };
  }
}

export default LiveCommerceService;
