import axios from 'axios';
import Stripe from 'stripe';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { logger } from '../config/logger';

export class PaymentService {
  private stripe: Stripe;
  private esewaConfig: any;
  private khaltiConfig: any;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
    
    this.esewaConfig = {
      merchantId: process.env.ESEWA_MERCHANT_ID,
      secretKey: process.env.ESEWA_SECRET_KEY,
      apiUrl: process.env.ESEWA_API_URL || 'https://esewa.com.np/epay/main',
      verifyUrl: process.env.ESEWA_VERIFY_URL || 'https://esewa.com.np/epay/transrec'
    };
    
    this.khaltiConfig = {
      publicKey: process.env.KHALTI_PUBLIC_KEY,
      secretKey: process.env.KHALTI_SECRET_KEY,
      apiUrl: process.env.KHALTI_API_URL || 'https://khalti.com/api/v2'
    };
  }

  // Stripe Payment Methods
  async createStripePaymentIntent(amount: number, currency: string, metadata: any) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      logger.error('Stripe payment intent creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async handleStripeWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleStripePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;
        default:
          logger.info(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Stripe webhook handling failed:', error);
      throw error;
    }
  }

  private async handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const { userId, amount, coins } = paymentIntent.metadata;
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount: parseInt(amount),
      currency: 'USD',
      status: 'completed',
      paymentMethod: 'stripe',
      paymentProvider: 'stripe',
      transactionId: paymentIntent.id,
      description: `Coin recharge via Stripe - ${coins} coins`,
      netAmount: parseInt(amount)
    });
    await transaction.save();

    // Update user coins
    await User.findByIdAndUpdate(userId, {
      $inc: { 'coins.balance': parseInt(coins) },
      $inc: { 'coins.totalEarned': parseInt(coins) }
    });

    logger.info(`Stripe payment successful for user ${userId}, amount: ${amount}`);
  }

  private async handleStripePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const { userId } = paymentIntent.metadata;
    
    // Create failed transaction record
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount: 0,
      currency: 'USD',
      status: 'failed',
      paymentMethod: 'stripe',
      paymentProvider: 'stripe',
      transactionId: paymentIntent.id,
      description: 'Coin recharge failed via Stripe',
      netAmount: 0
    });
    await transaction.save();

    logger.error(`Stripe payment failed for user ${userId}`);
  }

  // eSewa Payment Methods
  async createEsewaPayment(amount: number, userId: string, coins: number) {
    try {
      const paymentData = {
        amt: amount,
        pdc: 0,
        psc: 0,
        txAmt: 0,
        tAmt: amount,
        pid: `HB_${Date.now()}_${userId}`,
        scd: this.esewaConfig.merchantId,
        su: `${process.env.BASE_URL}/api/v1/payments/esewa/success`,
        fu: `${process.env.BASE_URL}/api/v1/payments/esewa/failure`
      };

      return {
        success: true,
        paymentUrl: `${this.esewaConfig.apiUrl}?${new URLSearchParams(paymentData).toString()}`,
        pid: paymentData.pid
      };
    } catch (error) {
      logger.error('eSewa payment creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyEsewaPayment(pid: string, refId: string) {
    try {
      const response = await axios.post(this.esewaConfig.verifyUrl, {
        amt: 0, // Will be fetched from transaction
        rid: refId,
        pid: pid,
        scd: this.esewaConfig.merchantId
      });

      if (response.data === 'Success') {
        // Fetch transaction details and process
        const transaction = await Transaction.findOne({ 'metadata.pid': pid });
        if (transaction) {
          await this.processEsewaSuccess(transaction, refId);
        }
        return { success: true };
      } else {
        return { success: false, error: 'Payment verification failed' };
      }
    } catch (error) {
      logger.error('eSewa payment verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async processEsewaSuccess(transaction: any, refId: string) {
    transaction.status = 'completed';
    transaction.referenceId = refId;
    await transaction.save();

    // Update user coins
    await User.findByIdAndUpdate(transaction.userId, {
      $inc: { 'coins.balance': transaction.amount },
      $inc: { 'coins.totalEarned': transaction.amount }
    });

    logger.info(`eSewa payment successful for user ${transaction.userId}`);
  }

  // Khalti Payment Methods
  async createKhaltiPayment(amount: number, userId: string, coins: number) {
    try {
      const paymentData = {
        public_key: this.khaltiConfig.publicKey,
        amount: amount * 100, // Khalti expects amount in paisa
        product_identity: `HB_${Date.now()}_${userId}`,
        product_name: `${coins} HaloBuzz Coins`,
        customer_info: {
          name: 'HaloBuzz User',
          email: 'user@halobuzz.com'
        },
        amount_breakdown: {
          landmark: 'HaloBuzz Coins',
          amount: amount * 100
        },
        customer_details: {
          name: 'HaloBuzz User',
          email: 'user@halobuzz.com',
          phone: '9800000000'
        }
      };

      const response = await axios.post(`${this.khaltiConfig.apiUrl}/epayment/initiate/`, paymentData, {
        headers: {
          'Authorization': `Key ${this.khaltiConfig.secretKey}`
        }
      });

      return {
        success: true,
        paymentUrl: response.data.payment_url,
        token: response.data.token
      };
    } catch (error) {
      logger.error('Khalti payment creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyKhaltiPayment(token: string) {
    try {
      const response = await axios.post(`${this.khaltiConfig.apiUrl}/epayment/lookup/`, {
        token: token
      }, {
        headers: {
          'Authorization': `Key ${this.khaltiConfig.secretKey}`
        }
      });

      if (response.data.status === 'Completed') {
        await this.processKhaltiSuccess(token, response.data);
        return { success: true };
      } else {
        return { success: false, error: 'Payment not completed' };
      }
    } catch (error) {
      logger.error('Khalti payment verification failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async processKhaltiSuccess(token: string, paymentData: any) {
    // Find transaction by token and update
    const transaction = await Transaction.findOne({ 'metadata.token': token });
    if (transaction) {
      transaction.status = 'completed';
      transaction.referenceId = paymentData.idx;
      await transaction.save();

      // Update user coins
      await User.findByIdAndUpdate(transaction.userId, {
        $inc: { 'coins.balance': transaction.amount },
        $inc: { 'coins.totalEarned': transaction.amount }
      });

      logger.info(`Khalti payment successful for user ${transaction.userId}`);
    }
  }

  // Generic methods
  async createTransaction(userId: string, amount: number, coins: number, paymentMethod: string, metadata: any = {}) {
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount,
      currency: 'NPR',
      status: 'pending',
      paymentMethod,
      description: `Coin recharge via ${paymentMethod} - ${coins} coins`,
      metadata,
      netAmount: amount
    });

    await transaction.save();
    return transaction;
  }

  async getTransactionHistory(userId: string, limit: number = 20) {
    return Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async getTransactionStats(userId: string) {
    return Transaction.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
  }
}

export const paymentService = new PaymentService();
