import { EventEmitter } from 'events';
import axios from 'axios';
import crypto from 'crypto';
import { logger } from '@/config/logger';
import { coinLedger } from './CoinLedgerService';
import { CoinWallet } from '@/models/CoinWallet';
import { CoinEconomyConfig } from '@/models/CoinEconomyConfig';

export interface PaymentGateway {
  id: string;
  name: string;
  isActive: boolean;
  supportedCurrencies: string[];
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  apiConfig: {
    baseUrl: string;
    publicKey?: string;
    secretKey?: string;
    merchantId?: string;
  };
  features: {
    instantCallback: boolean;
    refundSupport: boolean;
    recurringPayments: boolean;
    mobileSupport: boolean;
  };
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  basePrice: number; // In NPR
  bonusCoins: number;
  popularity: number;
  discount?: number; // Percentage discount
  isVisible: boolean;
  targetAudience: 'new_users' | 'casual' | 'regular' | 'whales';
  localizedPricing: {
    [currency: string]: {
      price: number;
      currency: string;
      displayPrice: string;
    };
  };
}

export interface PaymentRequest {
  userId: string;
  packageId: string;
  gatewayId: string;
  currency: string;
  amount: number;
  clientInfo: {
    ipAddress: string;
    userAgent: string;
    platform: 'web' | 'mobile' | 'ios' | 'android';
  };
  geoLocation?: {
    country: string;
    region: string;
    city?: string;
  };
}

export interface PaymentSession {
  sessionId: string;
  userId: string;
  packageId: string;
  gatewayId: string;
  amount: number;
  currency: string;
  coins: number;
  bonusCoins: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  paymentUrl?: string;
  gatewayTransactionId?: string;
  completedAt?: Date;
  failureReason?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WebhookPayload {
  gatewayId: string;
  transactionId: string;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  merchantReference: string;
  gatewayResponse: any;
  timestamp: Date;
  signature?: string;
}

/**
 * Coin Purchase Service - Handles coin purchases through multiple payment gateways
 * Supports eSewa, Khalti, Stripe, and other regional payment methods
 */
export class CoinPurchaseService extends EventEmitter {
  private static instance: CoinPurchaseService;
  private paymentGateways: Map<string, PaymentGateway> = new Map();
  private coinPackages: Map<string, CoinPackage> = new Map();
  private paymentSessions: Map<string, PaymentSession> = new Map();

  private constructor() {
    super();
    this.initializePaymentGateways();
    this.initializeCoinPackages();
    this.startSessionCleanup();
    this.startPaymentMonitoring();
  }

  static getInstance(): CoinPurchaseService {
    if (!CoinPurchaseService.instance) {
      CoinPurchaseService.instance = new CoinPurchaseService();
    }
    return CoinPurchaseService.instance;
  }

  /**
   * Initialize payment gateways
   */
  private initializePaymentGateways(): void {
    const gateways: PaymentGateway[] = [
      {
        id: 'esewa',
        name: 'eSewa',
        isActive: true,
        supportedCurrencies: ['NPR'],
        fees: {
          percentage: 2.5,
          fixed: 10,
          currency: 'NPR'
        },
        apiConfig: {
          baseUrl: 'https://uat.esewa.com.np/epay',
          merchantId: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST',
          secretKey: process.env.ESEWA_SECRET_KEY || ''
        },
        features: {
          instantCallback: true,
          refundSupport: false,
          recurringPayments: false,
          mobileSupport: true
        }
      },
      {
        id: 'khalti',
        name: 'Khalti',
        isActive: true,
        supportedCurrencies: ['NPR'],
        fees: {
          percentage: 3.0,
          fixed: 5,
          currency: 'NPR'
        },
        apiConfig: {
          baseUrl: 'https://khalti.com/api/v2',
          publicKey: process.env.KHALTI_PUBLIC_KEY || '',
          secretKey: process.env.KHALTI_SECRET_KEY || ''
        },
        features: {
          instantCallback: true,
          refundSupport: true,
          recurringPayments: false,
          mobileSupport: true
        }
      },
      {
        id: 'stripe',
        name: 'Stripe',
        isActive: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'INR'],
        fees: {
          percentage: 3.5,
          fixed: 0.30,
          currency: 'USD'
        },
        apiConfig: {
          baseUrl: 'https://api.stripe.com/v1',
          publicKey: process.env.STRIPE_PUBLIC_KEY || '',
          secretKey: process.env.STRIPE_SECRET_KEY || ''
        },
        features: {
          instantCallback: true,
          refundSupport: true,
          recurringPayments: true,
          mobileSupport: true
        }
      },
      {
        id: 'paypal',
        name: 'PayPal',
        isActive: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'CAD'],
        fees: {
          percentage: 4.4,
          fixed: 0.49,
          currency: 'USD'
        },
        apiConfig: {
          baseUrl: 'https://api.paypal.com/v2',
          publicKey: process.env.PAYPAL_CLIENT_ID || '',
          secretKey: process.env.PAYPAL_CLIENT_SECRET || ''
        },
        features: {
          instantCallback: true,
          refundSupport: true,
          recurringPayments: true,
          mobileSupport: true
        }
      }
    ];

    gateways.forEach(gateway => {
      this.paymentGateways.set(gateway.id, gateway);
    });

    logger.info(`Initialized ${gateways.length} payment gateways`);
  }

  /**
   * Initialize coin packages
   */
  private async initializeCoinPackages(): Promise<void> {
    try {
      const config = await CoinEconomyConfig.getCurrentConfig();

      if (config.coinPackages && config.coinPackages.length > 0) {
        config.coinPackages.forEach(packageConfig => {
          const coinPackage: CoinPackage = {
            id: packageConfig.id,
            name: packageConfig.name,
            coins: packageConfig.coins,
            basePrice: packageConfig.price,
            bonusCoins: packageConfig.bonusCoins,
            popularity: packageConfig.popularity,
            isVisible: packageConfig.isVisible,
            targetAudience: packageConfig.targetAudience,
            localizedPricing: this.generateLocalizedPricing(packageConfig.price, packageConfig.usdPrice)
          };
          this.coinPackages.set(coinPackage.id, coinPackage);
        });
      } else {
        await this.initializeDefaultCoinPackages();
      }

      logger.info(`Initialized ${this.coinPackages.size} coin packages`);
    } catch (error) {
      logger.error('Error initializing coin packages:', error);
      await this.initializeDefaultCoinPackages();
    }
  }

  /**
   * Initialize default coin packages
   */
  private async initializeDefaultCoinPackages(): Promise<void> {
    const defaultPackages: Omit<CoinPackage, 'localizedPricing'>[] = [
      {
        id: 'starter',
        name: 'Starter Pack',
        coins: 100,
        basePrice: 20, // NPR 20
        bonusCoins: 0,
        popularity: 3,
        isVisible: true,
        targetAudience: 'new_users'
      },
      {
        id: 'basic',
        name: 'Basic Pack',
        coins: 500,
        basePrice: 100, // NPR 100
        bonusCoins: 50,
        popularity: 5,
        isVisible: true,
        targetAudience: 'casual'
      },
      {
        id: 'popular',
        name: 'Popular Pack',
        coins: 1200,
        basePrice: 200, // NPR 200
        bonusCoins: 200,
        popularity: 5,
        discount: 10,
        isVisible: true,
        targetAudience: 'regular'
      },
      {
        id: 'premium',
        name: 'Premium Pack',
        coins: 2500,
        basePrice: 400, // NPR 400
        bonusCoins: 500,
        popularity: 4,
        discount: 15,
        isVisible: true,
        targetAudience: 'regular'
      },
      {
        id: 'whale',
        name: 'Whale Pack',
        coins: 6000,
        basePrice: 800, // NPR 800
        bonusCoins: 1500,
        popularity: 3,
        discount: 20,
        isVisible: true,
        targetAudience: 'whales'
      },
      {
        id: 'mega',
        name: 'Mega Pack',
        coins: 15000,
        basePrice: 2000, // NPR 2000
        bonusCoins: 5000,
        popularity: 2,
        discount: 25,
        isVisible: true,
        targetAudience: 'whales'
      }
    ];

    defaultPackages.forEach(pkg => {
      const coinPackage: CoinPackage = {
        ...pkg,
        localizedPricing: this.generateLocalizedPricing(pkg.basePrice)
      };
      this.coinPackages.set(coinPackage.id, coinPackage);
    });
  }

  /**
   * Create payment session for coin purchase
   */
  async createPaymentSession(request: PaymentRequest): Promise<PaymentSession> {
    const { userId, packageId, gatewayId, currency } = request;

    // Validate package
    const coinPackage = this.coinPackages.get(packageId);
    if (!coinPackage || !coinPackage.isVisible) {
      throw new Error('Coin package not available');
    }

    // Validate gateway
    const gateway = this.paymentGateways.get(gatewayId);
    if (!gateway || !gateway.isActive) {
      throw new Error('Payment gateway not available');
    }

    if (!gateway.supportedCurrencies.includes(currency)) {
      throw new Error(`Currency ${currency} not supported by ${gateway.name}`);
    }

    // Get localized pricing
    const pricing = coinPackage.localizedPricing[currency];
    if (!pricing) {
      throw new Error(`Pricing not available for currency ${currency}`);
    }

    // Apply fees
    const baseAmount = pricing.price;
    const fees = this.calculateFees(baseAmount, gateway);
    const totalAmount = baseAmount + fees;

    // Create payment session
    const sessionId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: PaymentSession = {
      sessionId,
      userId,
      packageId,
      gatewayId,
      amount: totalAmount,
      currency,
      coins: coinPackage.coins,
      bonusCoins: coinPackage.bonusCoins,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      createdAt: new Date()
    };

    try {
      // Create payment with gateway
      const paymentUrl = await this.createGatewayPayment(session, gateway, request);
      session.paymentUrl = paymentUrl;
      session.status = 'processing';

      // Store session
      this.paymentSessions.set(sessionId, session);

      this.emit('paymentSessionCreated', {
        sessionId,
        userId,
        packageId,
        gatewayId,
        amount: totalAmount,
        currency
      });

      logger.info(`Created payment session ${sessionId} for user ${userId}: ${coinPackage.name} via ${gateway.name}`);

      return session;

    } catch (error) {
      logger.error('Error creating payment session:', error);
      throw error;
    }
  }

  /**
   * Handle webhook from payment gateway
   */
  async handleWebhook(webhookPayload: WebhookPayload): Promise<void> {
    const { gatewayId, transactionId, status, merchantReference, gatewayResponse } = webhookPayload;

    // Find payment session
    const session = Array.from(this.paymentSessions.values())
      .find(s => s.sessionId === merchantReference && s.gatewayId === gatewayId);

    if (!session) {
      logger.warn(`Payment session not found for webhook: ${merchantReference}`);
      return;
    }

    const gateway = this.paymentGateways.get(gatewayId);
    if (!gateway) {
      logger.error(`Payment gateway not found: ${gatewayId}`);
      return;
    }

    // Verify webhook signature if required
    if (webhookPayload.signature) {
      const isValidSignature = this.verifyWebhookSignature(webhookPayload, gateway);
      if (!isValidSignature) {
        logger.error(`Invalid webhook signature for session ${session.sessionId}`);
        return;
      }
    }

    try {
      session.gatewayTransactionId = transactionId;

      if (status === 'success') {
        await this.completePayment(session);
      } else if (status === 'failed') {
        await this.failPayment(session, gatewayResponse?.error || 'Payment failed');
      }

      this.emit('webhookProcessed', {
        sessionId: session.sessionId,
        gatewayId,
        status,
        transactionId
      });

    } catch (error) {
      logger.error(`Error processing webhook for session ${session.sessionId}:`, error);
      await this.failPayment(session, error instanceof Error ? error.message : 'Webhook processing error');
    }
  }

  /**
   * Get available coin packages for user
   */
  async getAvailableCoinPackages(userId: string, currency = 'NPR'): Promise<CoinPackage[]> {
    const packages = Array.from(this.coinPackages.values())
      .filter(pkg => pkg.isVisible && pkg.localizedPricing[currency])
      .sort((a, b) => a.basePrice - b.basePrice);

    // Apply personalization based on user profile (future enhancement)
    // const userProfile = await this.getUserProfile(userId);
    // return this.personalizePackages(packages, userProfile);

    return packages;
  }

  /**
   * Get available payment gateways for currency
   */
  getAvailableGateways(currency: string): PaymentGateway[] {
    return Array.from(this.paymentGateways.values())
      .filter(gateway =>
        gateway.isActive && gateway.supportedCurrencies.includes(currency)
      )
      .sort((a, b) => a.fees.percentage - b.fees.percentage);
  }

  /**
   * Get payment session status
   */
  getPaymentSession(sessionId: string): PaymentSession | null {
    return this.paymentSessions.get(sessionId) || null;
  }

  /**
   * Cancel payment session
   */
  async cancelPaymentSession(sessionId: string, reason = 'User cancelled'): Promise<void> {
    const session = this.paymentSessions.get(sessionId);
    if (!session) {
      throw new Error('Payment session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Cannot cancel completed payment');
    }

    session.status = 'cancelled';
    session.failureReason = reason;

    this.emit('paymentCancelled', {
      sessionId,
      userId: session.userId,
      reason
    });

    logger.info(`Payment session ${sessionId} cancelled: ${reason}`);
  }

  /**
   * Private helper methods
   */
  private async createGatewayPayment(
    session: PaymentSession,
    gateway: PaymentGateway,
    request: PaymentRequest
  ): Promise<string> {
    const { userId, clientInfo } = request;

    switch (gateway.id) {
      case 'esewa':
        return await this.createESewaPayment(session, gateway);
      case 'khalti':
        return await this.createKhaltiPayment(session, gateway, clientInfo);
      case 'stripe':
        return await this.createStripePayment(session, gateway, clientInfo);
      case 'paypal':
        return await this.createPayPalPayment(session, gateway);
      default:
        throw new Error(`Unsupported payment gateway: ${gateway.id}`);
    }
  }

  private async createESewaPayment(session: PaymentSession, gateway: PaymentGateway): Promise<string> {
    // eSewa integration
    const params = new URLSearchParams({
      amt: session.amount.toString(),
      pdc: '0',
      psc: '0',
      txAmt: '0',
      tAmt: session.amount.toString(),
      pid: session.sessionId,
      scd: gateway.apiConfig.merchantId!,
      su: `${process.env.API_BASE_URL}/payments/esewa/success`,
      fu: `${process.env.API_BASE_URL}/payments/esewa/failure`
    });

    return `${gateway.apiConfig.baseUrl}/main?${params.toString()}`;
  }

  private async createKhaltiPayment(session: PaymentSession, gateway: PaymentGateway, clientInfo: any): Promise<string> {
    // Khalti integration
    try {
      const response = await axios.post(`${gateway.apiConfig.baseUrl}/payment/initiate/`, {
        return_url: `${process.env.API_BASE_URL}/payments/khalti/callback`,
        website_url: process.env.FRONTEND_URL,
        amount: session.amount * 100, // Amount in paisa
        purchase_order_id: session.sessionId,
        purchase_order_name: `HaloBuzz Coins - ${session.coins} coins`,
        customer_info: {
          name: 'HaloBuzz User',
          email: `user${session.userId}@halobuzz.com`,
          phone: '9800000000'
        },
        amount_breakdown: [{
          label: 'HaloBuzz Coins',
          amount: session.amount * 100
        }]
      }, {
        headers: {
          'Authorization': `Key ${gateway.apiConfig.secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.payment_url;
    } catch (error) {
      logger.error('Error creating Khalti payment:', error);
      throw new Error('Failed to create Khalti payment');
    }
  }

  private async createStripePayment(session: PaymentSession, gateway: PaymentGateway, clientInfo: any): Promise<string> {
    // Stripe integration
    try {
      const response = await axios.post(`${gateway.apiConfig.baseUrl}/checkout/sessions`, {
        line_items: [{
          price_data: {
            currency: session.currency.toLowerCase(),
            product_data: {
              name: `HaloBuzz Coins - ${session.coins + session.bonusCoins} coins`,
              description: `${session.coins} coins + ${session.bonusCoins} bonus coins`
            },
            unit_amount: Math.round(session.amount * 100) // Amount in cents
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          halobuzz_session_id: session.sessionId,
          user_id: session.userId
        }
      }, {
        headers: {
          'Authorization': `Bearer ${gateway.apiConfig.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.url;
    } catch (error) {
      logger.error('Error creating Stripe payment:', error);
      throw new Error('Failed to create Stripe payment');
    }
  }

  private async createPayPalPayment(session: PaymentSession, gateway: PaymentGateway): Promise<string> {
    // PayPal integration
    try {
      // First, get access token
      const tokenResponse = await axios.post(`${gateway.apiConfig.baseUrl}/oauth2/token`,
        'grant_type=client_credentials', {
        auth: {
          username: gateway.apiConfig.publicKey!,
          password: gateway.apiConfig.secretKey!
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const accessToken = tokenResponse.data.access_token;

      // Create payment
      const paymentResponse = await axios.post(`${gateway.apiConfig.baseUrl}/payments/payment`, {
        intent: 'sale',
        payer: {
          payment_method: 'paypal'
        },
        transactions: [{
          amount: {
            total: session.amount.toString(),
            currency: session.currency
          },
          description: `HaloBuzz Coins - ${session.coins + session.bonusCoins} coins`,
          custom: session.sessionId
        }],
        redirect_urls: {
          return_url: `${process.env.API_BASE_URL}/payments/paypal/success`,
          cancel_url: `${process.env.API_BASE_URL}/payments/paypal/cancel`
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const approvalUrl = paymentResponse.data.links.find((link: any) => link.rel === 'approval_url');
      return approvalUrl?.href || '';

    } catch (error) {
      logger.error('Error creating PayPal payment:', error);
      throw new Error('Failed to create PayPal payment');
    }
  }

  private async completePayment(session: PaymentSession): Promise<void> {
    try {
      // Credit coins to user wallet
      const totalCoins = session.coins + session.bonusCoins;

      await coinLedger.processTransaction({
        userId: session.userId,
        type: 'purchase',
        amount: totalCoins,
        source: 'purchase',
        destination: 'wallet',
        context: {
          packageId: session.packageId,
          gatewayId: session.gatewayId,
          paymentAmount: session.amount,
          currency: session.currency,
          baseCoins: session.coins,
          bonusCoins: session.bonusCoins,
          transactionId: session.gatewayTransactionId
        }
      });

      // Update session
      session.status = 'completed';
      session.completedAt = new Date();

      this.emit('paymentCompleted', {
        sessionId: session.sessionId,
        userId: session.userId,
        coinsAdded: totalCoins,
        amount: session.amount,
        currency: session.currency
      });

      logger.info(`Payment completed: ${session.sessionId} - ${totalCoins} coins added to user ${session.userId}`);

    } catch (error) {
      logger.error(`Error completing payment ${session.sessionId}:`, error);
      await this.failPayment(session, error instanceof Error ? error.message : 'Payment processing error');
    }
  }

  private async failPayment(session: PaymentSession, reason: string): Promise<void> {
    session.status = 'failed';
    session.failureReason = reason;

    this.emit('paymentFailed', {
      sessionId: session.sessionId,
      userId: session.userId,
      reason
    });

    logger.warn(`Payment failed: ${session.sessionId} - ${reason}`);
  }

  private calculateFees(amount: number, gateway: PaymentGateway): number {
    const percentageFee = (amount * gateway.fees.percentage) / 100;
    const totalFees = percentageFee + gateway.fees.fixed;
    return Math.round(totalFees * 100) / 100; // Round to 2 decimal places
  }

  private generateLocalizedPricing(basePrice: number, usdPrice?: number): CoinPackage['localizedPricing'] {
    const pricing: CoinPackage['localizedPricing'] = {
      NPR: {
        price: basePrice,
        currency: 'NPR',
        displayPrice: `Rs. ${basePrice}`
      }
    };

    // Add USD pricing
    const usdAmount = usdPrice || Math.round((basePrice / 130) * 100) / 100; // Assuming 1 USD = 130 NPR
    pricing.USD = {
      price: usdAmount,
      currency: 'USD',
      displayPrice: `$${usdAmount}`
    };

    // Add other currencies
    pricing.EUR = {
      price: Math.round(usdAmount * 0.85 * 100) / 100,
      currency: 'EUR',
      displayPrice: `€${Math.round(usdAmount * 0.85 * 100) / 100}`
    };

    pricing.INR = {
      price: Math.round(usdAmount * 83),
      currency: 'INR',
      displayPrice: `₹${Math.round(usdAmount * 83)}`
    };

    return pricing;
  }

  private verifyWebhookSignature(payload: WebhookPayload, gateway: PaymentGateway): boolean {
    if (!payload.signature || !gateway.apiConfig.secretKey) {
      return false;
    }

    // Implementation would depend on gateway's signature verification method
    // This is a simplified example
    const expectedSignature = crypto
      .createHmac('sha256', gateway.apiConfig.secretKey)
      .update(JSON.stringify(payload.gatewayResponse))
      .digest('hex');

    return expectedSignature === payload.signature;
  }

  private startSessionCleanup(): void {
    // Clean up expired sessions every 10 minutes
    setInterval(() => {
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, session] of this.paymentSessions.entries()) {
        if (session.expiresAt <= now && session.status === 'pending') {
          session.status = 'expired';
          cleanedCount++;
        }

        // Remove old completed/failed sessions after 24 hours
        if (session.completedAt &&
            now.getTime() - session.completedAt.getTime() > 24 * 60 * 60 * 1000) {
          this.paymentSessions.delete(sessionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.debug(`Cleaned up ${cleanedCount} payment sessions`);
      }
    }, 600000); // 10 minutes
  }

  private startPaymentMonitoring(): void {
    // Monitor payment trends every hour
    setInterval(() => {
      const stats = this.generatePaymentStats();
      this.emit('paymentStats', stats);
    }, 3600000); // 1 hour
  }

  private generatePaymentStats(): any {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentSessions = Array.from(this.paymentSessions.values())
      .filter(s => s.createdAt >= oneDayAgo);

    const stats = {
      total24h: recentSessions.length,
      completed24h: recentSessions.filter(s => s.status === 'completed').length,
      failed24h: recentSessions.filter(s => s.status === 'failed').length,
      pending24h: recentSessions.filter(s => s.status === 'pending' || s.status === 'processing').length,
      totalAmount24h: recentSessions
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => sum + s.amount, 0),
      gatewayBreakdown: {} as any
    };

    // Gateway breakdown
    for (const gateway of this.paymentGateways.keys()) {
      const gatewayStats = recentSessions.filter(s => s.gatewayId === gateway);
      stats.gatewayBreakdown[gateway] = {
        total: gatewayStats.length,
        completed: gatewayStats.filter(s => s.status === 'completed').length,
        successRate: gatewayStats.length > 0
          ? (gatewayStats.filter(s => s.status === 'completed').length / gatewayStats.length) * 100
          : 0
      };
    }

    return stats;
  }
}

export const coinPurchase = CoinPurchaseService.getInstance();