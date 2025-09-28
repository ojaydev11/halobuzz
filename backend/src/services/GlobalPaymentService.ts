import axios from 'axios';
import Stripe from 'stripe';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

// Global payment interfaces
interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  metadata: any;
  customerInfo: CustomerInfo;
  fraudCheck?: boolean;
}

interface CustomerInfo {
  email: string;
  phone?: string;
  address?: Address;
  billingAddress?: Address;
  shippingAddress?: Address;
}

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  clientSecret?: string;
  requires3DSecure?: boolean;
  fraudScore?: number;
  error?: string;
  metadata?: any;
}

interface CurrencyConfig {
  code: string;
  symbol: string;
  decimals: number;
  exchangeRate: number;
  baseCurrency: string;
  supportedProviders: string[];
}

interface FraudDetectionResult {
  score: number;
  risk: 'low' | 'medium' | 'high';
  flags: string[];
  recommendation: 'approve' | 'review' | 'decline';
  details: string;
}

class GlobalPaymentService {
  private stripe: Stripe;
  private supportedCurrencies: Map<string, CurrencyConfig> = new Map();
  private fraudDetectionRules: Map<string, any> = new Map();

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    
    this.initializeSupportedCurrencies();
    this.initializeFraudDetectionRules();
  }

  // Initialize supported currencies
  private initializeSupportedCurrencies(): void {
    const currencies: CurrencyConfig[] = [
      {
        code: 'USD',
        symbol: '$',
        decimals: 2,
        exchangeRate: 1.0,
        baseCurrency: 'USD',
        supportedProviders: ['stripe', 'paypal']
      },
      {
        code: 'EUR',
        symbol: '€',
        decimals: 2,
        exchangeRate: 0.85,
        baseCurrency: 'USD',
        supportedProviders: ['stripe', 'paypal']
      },
      {
        code: 'GBP',
        symbol: '£',
        decimals: 2,
        exchangeRate: 0.79,
        baseCurrency: 'USD',
        supportedProviders: ['stripe', 'paypal']
      },
      {
        code: 'NPR',
        symbol: '₨',
        decimals: 2,
        exchangeRate: 133.0,
        baseCurrency: 'USD',
        supportedProviders: ['esewa', 'khalti']
      },
      {
        code: 'INR',
        symbol: '₹',
        decimals: 2,
        exchangeRate: 83.0,
        baseCurrency: 'USD',
        supportedProviders: ['stripe', 'razorpay']
      },
      {
        code: 'JPY',
        symbol: '¥',
        decimals: 0,
        exchangeRate: 150.0,
        baseCurrency: 'USD',
        supportedProviders: ['stripe']
      },
      {
        code: 'AUD',
        symbol: 'A$',
        decimals: 2,
        exchangeRate: 1.52,
        baseCurrency: 'USD',
        supportedProviders: ['stripe', 'paypal']
      },
      {
        code: 'CAD',
        symbol: 'C$',
        decimals: 2,
        exchangeRate: 1.36,
        baseCurrency: 'USD',
        supportedProviders: ['stripe', 'paypal']
      }
    ];

    currencies.forEach(currency => {
      this.supportedCurrencies.set(currency.code, currency);
    });
  }

  // Initialize fraud detection rules
  private initializeFraudDetectionRules(): void {
    this.fraudDetectionRules.set('velocity', {
      maxTransactionsPerHour: 10,
      maxAmountPerHour: 1000,
      maxTransactionsPerDay: 50,
      maxAmountPerDay: 5000
    });

    this.fraudDetectionRules.set('geolocation', {
      suspiciousCountries: ['XX', 'ZZ'], // Placeholder for high-risk countries
      maxDistanceFromHome: 1000, // km
      timeZoneMismatch: true
    });

    this.fraudDetectionRules.set('device', {
      newDeviceRisk: 0.3,
      vpnDetection: true,
      proxyDetection: true
    });

    this.fraudDetectionRules.set('behavior', {
      unusualHours: true,
      rapidSuccession: true,
      patternAnomaly: true
    });
  }

  // Process global payment with fraud detection
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate currency
      const currencyConfig = this.supportedCurrencies.get(request.currency);
      if (!currencyConfig) {
        return {
          success: false,
          error: `Currency ${request.currency} not supported`
        };
      }

      // Convert amount to base currency (USD)
      const amountInBaseCurrency = request.amount * currencyConfig.exchangeRate;

      // Perform fraud detection
      const fraudResult = await this.performFraudDetection(request, amountInBaseCurrency);
      
      if (fraudResult.recommendation === 'decline') {
        logger.warn(`Payment declined due to fraud: ${fraudResult.details}`, {
          userId: request.userId,
          amount: request.amount,
          currency: request.currency,
          fraudScore: fraudResult.score
        });
        
        return {
          success: false,
          error: 'Payment declined due to security concerns',
          fraudScore: fraudResult.score
        };
      }

      // Create transaction record
      const transaction = await this.createTransactionRecord(request, fraudResult);

      // Process payment based on method and currency
      let paymentResult: PaymentResult;

      switch (request.paymentMethod) {
        case 'stripe':
          paymentResult = await this.processStripePayment(request, currencyConfig);
          break;
        case 'paypal':
          paymentResult = await this.processPayPalPayment(request, currencyConfig);
          break;
        case 'esewa':
          paymentResult = await this.processEsewaPayment(request, currencyConfig);
          break;
        case 'khalti':
          paymentResult = await this.processKhaltiPayment(request, currencyConfig);
          break;
        default:
          return {
            success: false,
            error: `Payment method ${request.paymentMethod} not supported for currency ${request.currency}`
          };
      }

      // Update transaction with payment result
      if (paymentResult.success && paymentResult.transactionId) {
        await Transaction.findByIdAndUpdate(transaction._id, {
          $set: {
            transactionId: paymentResult.transactionId,
            status: paymentResult.requires3DSecure ? 'pending_3ds' : 'pending',
            metadata: {
              ...transaction.metadata,
              fraudScore: fraudResult.score,
              fraudFlags: fraudResult.flags,
              ...paymentResult.metadata
            }
          }
        });
      }

      return paymentResult;

    } catch (error) {
      logger.error('Error processing global payment:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Process Stripe payment with 3D Secure
  private async processStripePayment(
    request: PaymentRequest,
    currencyConfig: CurrencyConfig
  ): Promise<PaymentResult> {
    try {
      // Create or retrieve customer
      const customer = await this.getOrCreateStripeCustomer(request.customerInfo);

      // Create payment intent with 3D Secure
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * Math.pow(10, currencyConfig.decimals)),
        currency: request.currency.toLowerCase(),
        customer: customer.id,
        payment_method_types: ['card'],
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          userId: request.userId,
          ...request.metadata
        },
        // Enable 3D Secure for high-risk transactions
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        }
      });

      if (paymentIntent.status === 'requires_action') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          requires3DSecure: true,
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        };
      } else if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionId: paymentIntent.id,
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        };
      } else {
        return {
          success: false,
          error: `Payment failed: ${paymentIntent.status}`,
          metadata: {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
          }
        };
      }

    } catch (error) {
      logger.error('Error processing Stripe payment:', error);
      return {
        success: false,
        error: 'Stripe payment failed'
      };
    }
  }

  // Process PayPal payment
  private async processPayPalPayment(
    request: PaymentRequest,
    currencyConfig: CurrencyConfig
  ): Promise<PaymentResult> {
    try {
      // PayPal implementation would go here
      // For now, return a mock response
      return {
        success: true,
        transactionId: `paypal_${Date.now()}`,
        paymentUrl: 'https://paypal.com/checkout',
        metadata: {
          provider: 'paypal',
          currency: request.currency
        }
      };
    } catch (error) {
      logger.error('Error processing PayPal payment:', error);
      return {
        success: false,
        error: 'PayPal payment failed'
      };
    }
  }

  // Process eSewa payment (Nepal)
  private async processEsewaPayment(
    request: PaymentRequest,
    currencyConfig: CurrencyConfig
  ): Promise<PaymentResult> {
    try {
      if (request.currency !== 'NPR') {
        return {
          success: false,
          error: 'eSewa only supports NPR currency'
        };
      }

      // eSewa implementation would go here
      // For now, return a mock response
      return {
        success: true,
        transactionId: `esewa_${Date.now()}`,
        paymentUrl: 'https://esewa.com.np/epay/main',
        metadata: {
          provider: 'esewa',
          currency: request.currency
        }
      };
    } catch (error) {
      logger.error('Error processing eSewa payment:', error);
      return {
        success: false,
        error: 'eSewa payment failed'
      };
    }
  }

  // Process Khalti payment (Nepal)
  private async processKhaltiPayment(
    request: PaymentRequest,
    currencyConfig: CurrencyConfig
  ): Promise<PaymentResult> {
    try {
      if (request.currency !== 'NPR') {
        return {
          success: false,
          error: 'Khalti only supports NPR currency'
        };
      }

      // Khalti implementation would go here
      // For now, return a mock response
      return {
        success: true,
        transactionId: `khalti_${Date.now()}`,
        paymentUrl: 'https://khalti.com/api/v2/payment/initiate',
        metadata: {
          provider: 'khalti',
          currency: request.currency
        }
      };
    } catch (error) {
      logger.error('Error processing Khalti payment:', error);
      return {
        success: false,
        error: 'Khalti payment failed'
      };
    }
  }

  // Perform comprehensive fraud detection
  private async performFraudDetection(
    request: PaymentRequest,
    amountInBaseCurrency: number
  ): Promise<FraudDetectionResult> {
    try {
      let fraudScore = 0;
      const flags: string[] = [];

      // Velocity checks
      const velocityResult = await this.checkVelocity(request.userId, amountInBaseCurrency);
      fraudScore += velocityResult.score;
      flags.push(...velocityResult.flags);

      // Geolocation checks
      const geoResult = await this.checkGeolocation(request.customerInfo);
      fraudScore += geoResult.score;
      flags.push(...geoResult.flags);

      // Device checks
      const deviceResult = await this.checkDevice(request.userId);
      fraudScore += deviceResult.score;
      flags.push(...deviceResult.flags);

      // Behavioral checks
      const behaviorResult = await this.checkBehavior(request.userId);
      fraudScore += behaviorResult.score;
      flags.push(...behaviorResult.flags);

      // Determine risk level
      let risk: 'low' | 'medium' | 'high';
      let recommendation: 'approve' | 'review' | 'decline';

      if (fraudScore < 0.3) {
        risk = 'low';
        recommendation = 'approve';
      } else if (fraudScore < 0.7) {
        risk = 'medium';
        recommendation = 'review';
      } else {
        risk = 'high';
        recommendation = 'decline';
      }

      return {
        score: fraudScore,
        risk,
        flags,
        recommendation,
        details: `Fraud score: ${fraudScore.toFixed(2)}, Risk: ${risk}, Flags: ${flags.length}`
      };

    } catch (error) {
      logger.error('Error in fraud detection:', error);
      return {
        score: 0.5, // Default medium risk on error
        risk: 'medium',
        flags: ['fraud_detection_error'],
        recommendation: 'review',
        details: 'Fraud detection failed'
      };
    }
  }

  // Check velocity (transaction frequency and amounts)
  private async checkVelocity(userId: string, amount: number): Promise<{ score: number; flags: string[] }> {
    try {
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      const oneDayAgo = now - (24 * 60 * 60 * 1000);

      // Get recent transactions
      const recentTransactions = await Transaction.find({
        userId,
        createdAt: { $gte: new Date(oneDayAgo) }
      });

      const hourlyTransactions = recentTransactions.filter(t => 
        t.createdAt.getTime() > oneHourAgo
      );

      const hourlyAmount = hourlyTransactions.reduce((sum, t) => sum + t.amount, 0);
      const dailyAmount = recentTransactions.reduce((sum, t) => sum + t.amount, 0);

      const rules = this.fraudDetectionRules.get('velocity');
      let score = 0;
      const flags: string[] = [];

      // Check hourly limits
      if (hourlyTransactions.length > rules.maxTransactionsPerHour) {
        score += 0.3;
        flags.push('high_hourly_transaction_count');
      }

      if (hourlyAmount > rules.maxAmountPerHour) {
        score += 0.3;
        flags.push('high_hourly_amount');
      }

      // Check daily limits
      if (recentTransactions.length > rules.maxTransactionsPerDay) {
        score += 0.2;
        flags.push('high_daily_transaction_count');
      }

      if (dailyAmount > rules.maxAmountPerDay) {
        score += 0.2;
        flags.push('high_daily_amount');
      }

      return { score, flags };

    } catch (error) {
      logger.error('Error checking velocity:', error);
      return { score: 0.1, flags: ['velocity_check_error'] };
    }
  }

  // Check geolocation
  private async checkGeolocation(customerInfo: CustomerInfo): Promise<{ score: number; flags: string[] }> {
    try {
      let score = 0;
      const flags: string[] = [];

      // Check for suspicious countries
      const rules = this.fraudDetectionRules.get('geolocation');
      if (customerInfo.address?.country && rules.suspiciousCountries.includes(customerInfo.address.country)) {
        score += 0.4;
        flags.push('suspicious_country');
      }

      // Check for time zone mismatches (would require IP geolocation)
      if (rules.timeZoneMismatch) {
        // This would typically check user's timezone vs IP location
        // For now, we'll skip this check
      }

      return { score, flags };

    } catch (error) {
      logger.error('Error checking geolocation:', error);
      return { score: 0.1, flags: ['geolocation_check_error'] };
    }
  }

  // Check device
  private async checkDevice(userId: string): Promise<{ score: number; flags: string[] }> {
    try {
      let score = 0;
      const flags: string[] = [];

      // Check for new device (would require device fingerprinting)
      const rules = this.fraudDetectionRules.get('device');
      
      // Mock new device detection
      const isNewDevice = Math.random() < 0.1; // 10% chance of new device
      if (isNewDevice) {
        score += rules.newDeviceRisk;
        flags.push('new_device');
      }

      // Check for VPN/Proxy (would require IP analysis)
      if (rules.vpnDetection) {
        const isVPN = Math.random() < 0.05; // 5% chance of VPN
        if (isVPN) {
          score += 0.2;
          flags.push('vpn_detected');
        }
      }

      return { score, flags };

    } catch (error) {
      logger.error('Error checking device:', error);
      return { score: 0.1, flags: ['device_check_error'] };
    }
  }

  // Check behavior
  private async checkBehavior(userId: string): Promise<{ score: number; flags: string[] }> {
    try {
      let score = 0;
      const flags: string[] = [];

      const rules = this.fraudDetectionRules.get('behavior');

      // Check for unusual hours (would require user's typical activity patterns)
      if (rules.unusualHours) {
        const currentHour = new Date().getHours();
        const isUnusualHour = currentHour < 6 || currentHour > 23;
        if (isUnusualHour) {
          score += 0.1;
          flags.push('unusual_hours');
        }
      }

      // Check for rapid succession transactions
      if (rules.rapidSuccession) {
        const recentTransactions = await Transaction.find({
          userId,
          createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        });

        if (recentTransactions.length > 3) {
          score += 0.2;
          flags.push('rapid_succession');
        }
      }

      return { score, flags };

    } catch (error) {
      logger.error('Error checking behavior:', error);
      return { score: 0.1, flags: ['behavior_check_error'] };
    }
  }

  // Get or create Stripe customer
  private async getOrCreateStripeCustomer(customerInfo: CustomerInfo): Promise<Stripe.Customer> {
    try {
      // Check if customer exists
      const existingCustomers = await this.stripe.customers.list({
        email: customerInfo.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0];
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address ? {
          line1: customerInfo.address.line1,
          line2: customerInfo.address.line2,
          city: customerInfo.address.city,
          state: customerInfo.address.state,
          postal_code: customerInfo.address.postalCode,
          country: customerInfo.address.country
        } : undefined
      });

      return customer;

    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  // Create transaction record
  private async createTransactionRecord(
    request: PaymentRequest,
    fraudResult: FraudDetectionResult
  ): Promise<any> {
    try {
      const transaction = new Transaction({
        userId: request.userId,
        type: 'recharge',
        amount: request.amount,
        currency: request.currency,
        status: 'pending',
        paymentMethod: request.paymentMethod,
        metadata: {
          fraudScore: fraudResult.score,
          fraudFlags: fraudResult.flags,
          fraudRisk: fraudResult.risk,
          ...request.metadata
        }
      });

      await transaction.save();
      return transaction;

    } catch (error) {
      logger.error('Error creating transaction record:', error);
      throw error;
    }
  }

  // Get supported currencies
  getSupportedCurrencies(): CurrencyConfig[] {
    return Array.from(this.supportedCurrencies.values());
  }

  // Get exchange rates
  async getExchangeRates(): Promise<Map<string, number>> {
    try {
      // In production, this would fetch from a real exchange rate API
      const rates = new Map<string, number>();
      
      for (const [code, config] of this.supportedCurrencies) {
        rates.set(code, config.exchangeRate);
      }
      
      return rates;
    } catch (error) {
      logger.error('Error getting exchange rates:', error);
      return new Map();
    }
  }

  // Convert currency
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    try {
      const fromConfig = this.supportedCurrencies.get(fromCurrency);
      const toConfig = this.supportedCurrencies.get(toCurrency);

      if (!fromConfig || !toConfig) {
        throw new Error('Unsupported currency');
      }

      // Convert to base currency (USD) first
      const amountInBaseCurrency = amount * fromConfig.exchangeRate;
      
      // Convert to target currency
      const convertedAmount = amountInBaseCurrency / toConfig.exchangeRate;
      
      return Math.round(convertedAmount * Math.pow(10, toConfig.decimals)) / Math.pow(10, toConfig.decimals);
      
    } catch (error) {
      logger.error('Error converting currency:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const globalPaymentService = new GlobalPaymentService();
export default globalPaymentService;
