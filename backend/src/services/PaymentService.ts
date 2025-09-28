import crypto from 'crypto';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

interface PaymentData {
  userId: string;
  amount: number;
  currency: string;
  type: string;
  paymentMethod: string;
  description: string;
  metadata?: any;
}

interface PaymentResult {
  success: boolean;
  transaction?: any;
  idempotent?: boolean;
  error?: string;
}

export class PaymentService {
  private readonly logger = logger;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Process payment with idempotency
   */
  async processPayment(paymentData: PaymentData, idempotencyKey: string): Promise<PaymentResult> {
    try {
      // Check if payment already processed
      const existingPayment = await Transaction.findOne({ 
        idempotencyKey: idempotencyKey 
      });

      if (existingPayment) {
        this.logger.info(`Payment already processed for idempotency key: ${idempotencyKey}`);
        return { 
          success: true, 
          idempotent: true, 
          transaction: existingPayment 
        };
      }

      // Validate user exists and is not banned
      const user = await User.findById(paymentData.userId);
      if (!user || user.isBanned) {
        return { 
          success: false, 
          error: 'User not found or banned' 
        };
      }

      // Validate payment amount
      if (paymentData.amount <= 0) {
        return { 
          success: false, 
          error: 'Invalid payment amount' 
        };
      }

      // Check daily spending limits
      const dailySpent = await this.getDailySpending(user._id.toString());
      const dailyLimit = this.getDailyLimit(user);
      
      if (dailySpent + paymentData.amount > dailyLimit) {
        return { 
          success: false, 
          error: 'Daily spending limit exceeded' 
        };
      }

      // Create new transaction
      const transaction = new Transaction({
        userId: user._id,
        type: paymentData.type,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'pending',
        paymentMethod: paymentData.paymentMethod,
        description: paymentData.description,
        idempotencyKey: idempotencyKey,
        metadata: {
          ...paymentData.metadata,
          orderId: idempotencyKey
        },
        fees: this.calculateFees(paymentData.amount, paymentData.paymentMethod),
        netAmount: paymentData.amount - this.calculateFees(paymentData.amount, paymentData.paymentMethod)
      });

      await transaction.save();

      // Update user balance if it's a recharge
      if (paymentData.type === 'recharge') {
        await this.updateUserBalance(user._id.toString(), paymentData.amount);
      }

      // Cache the transaction for quick lookup
      await setCache(`transaction:${transaction._id}`, transaction.toJSON(), 3600);

      this.logger.info(`Payment processed successfully: ${transaction._id}`);

      return { 
        success: true, 
        idempotent: false, 
        transaction 
      };

    } catch (error) {
      this.logger.error('Error processing payment:', error);
      return { 
        success: false, 
        error: 'Payment processing failed' 
      };
    }
  }

  /**
   * Get daily spending for user
   */
  private async getDailySpending(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await Transaction.aggregate([
      {
        $match: {
          userId: userId,
          status: 'completed',
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          type: { $in: ['recharge', 'gift_sent'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].totalSpent : 0;
  }

  /**
   * Get daily spending limit for user
   */
  private getDailyLimit(user: any): number {
    // Base limit
    let limit = 1000; // $10 default

    // Increase limit based on user verification
    if (user.isVerified) {
      limit *= 2;
    }

    if (user.kycStatus === 'verified') {
      limit *= 5;
    }

    // Increase limit based on trust score
    if (user.trust?.score > 80) {
      limit *= 2;
    }

    return limit;
  }

  /**
   * Calculate payment fees
   */
  private calculateFees(amount: number, paymentMethod: string): number {
    const feeRates = {
      'stripe': 0.029, // 2.9%
      'paypal': 0.034, // 3.4%
      'esewa': 0.02,   // 2%
      'khalti': 0.02   // 2%
    };

    const rate = feeRates[paymentMethod] || 0.03; // Default 3%
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Update user balance
   */
  private async updateUserBalance(userId: string, amount: number): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'coins.balance': amount,
        'coins.totalEarned': amount
      }
    });
  }

  /**
   * Process refund
   */
  async processRefund(transactionId: string, reason: string): Promise<PaymentResult> {
    try {
      const originalTransaction = await Transaction.findById(transactionId);
      if (!originalTransaction) {
        return { success: false, error: 'Transaction not found' };
      }

      if (originalTransaction.status !== 'completed') {
        return { success: false, error: 'Cannot refund incomplete transaction' };
      }

      // Create refund transaction
      const refundTransaction = new Transaction({
        userId: originalTransaction.userId,
        type: 'refund',
        amount: originalTransaction.amount,
        currency: originalTransaction.currency,
        status: 'pending',
        description: `Refund for transaction ${transactionId}: ${reason}`,
        metadata: {
          originalTransactionId: transactionId,
          reason: reason
        },
        fees: 0,
        netAmount: originalTransaction.amount
      });

      await refundTransaction.save();

      // Update user balance
      await this.updateUserBalance(originalTransaction.userId.toString(), -originalTransaction.amount);

      this.logger.info(`Refund processed: ${refundTransaction._id}`);

      return { 
        success: true, 
        transaction: refundTransaction 
      };

    } catch (error) {
      this.logger.error('Error processing refund:', error);
      return { 
        success: false, 
        error: 'Refund processing failed' 
      };
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('userId', 'username email');

      return transactions;
    } catch (error) {
      this.logger.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Create transaction record
   */
  async createTransaction(
    userId: string,
    amount: number,
    coins: number,
    paymentMethod: string,
    metadata: any = {}
  ): Promise<any> {
    try {
      const transaction = new Transaction({
        userId,
        type: 'recharge',
        amount: coins,
        currency: 'coins',
        status: 'pending',
        paymentMethod,
        description: `Recharge ${coins} coins via ${paymentMethod}`,
        metadata: {
          ...metadata,
          originalAmount: amount,
          coins
        },
        fees: this.calculateFees(amount, paymentMethod),
        netAmount: coins
      });

      await transaction.save();
      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Create eSewa payment
   */
  async createEsewaPayment(amount: number, userId: string, coins: number): Promise<any> {
    try {
      const esewaConfig = {
        baseUrl: process.env.ESEWA_BASE_URL || 'https://uat.esewa.com.np',
        merchantId: process.env.ESEWA_MERCHANT_ID || '',
        secretKey: process.env.ESEWA_SECRET_KEY || ''
      };

      if (!esewaConfig.merchantId || !esewaConfig.secretKey) {
        throw new Error('eSewa configuration missing');
      }

      const pid = `halobuzz_${userId}_${Date.now()}`;
      const successUrl = `${process.env.API_BASE_URL}/wallet/webhooks/esewa/success`;
      const failureUrl = `${process.env.API_BASE_URL}/wallet/webhooks/esewa/failure`;

      // Create payment URL
      const paymentUrl = `${esewaConfig.baseUrl}/epay/main?` +
        `pid=${pid}&` +
        `amt=${amount}&` +
        `pdc=0&` +
        `psc=0&` +
        `txAmt=${amount}&` +
        `tAmt=${amount}&` +
        `scd=${esewaConfig.merchantId}&` +
        `su=${encodeURIComponent(successUrl)}&` +
        `fu=${encodeURIComponent(failureUrl)}`;

      return {
        success: true,
        paymentUrl,
        pid,
        amount,
        coins
      };
    } catch (error) {
      this.logger.error('Error creating eSewa payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create Khalti payment
   */
  async createKhaltiPayment(amount: number, userId: string, coins: number): Promise<any> {
    try {
      const khaltiConfig = {
        baseUrl: process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2',
        publicKey: process.env.KHALTI_PUBLIC_KEY || '',
        secretKey: process.env.KHALTI_SECRET_KEY || ''
      };

      if (!khaltiConfig.publicKey || !khaltiConfig.secretKey) {
        throw new Error('Khalti configuration missing');
      }

      const token = `halobuzz_${userId}_${Date.now()}`;
      const returnUrl = `${process.env.API_BASE_URL}/wallet/webhooks/khalti/return`;

      // Create payment initiation request
      const paymentData = {
        public_key: khaltiConfig.publicKey,
        amount: amount * 100, // Convert to paisa
        mobile: '', // Will be filled by user
        product_identity: token,
        product_name: `${coins} HaloBuzz Coins`,
        product_url: returnUrl,
        transaction_pin: '',
        transaction_reference: token,
        additional_data: {
          user_id: userId,
          coins: coins
        }
      };

      return {
        success: true,
        token,
        paymentData,
        amount,
        coins
      };
    } catch (error) {
      this.logger.error('Error creating Khalti payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create Stripe payment intent
   */
  async createStripePaymentIntent(amount: number, currency: string, metadata: any): Promise<any> {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe configuration missing');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          source: 'halobuzz'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount,
        currency
      };
    } catch (error) {
      this.logger.error('Error creating Stripe payment intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create PayPal order
   */
  async createPayPalOrder(amount: number, userId: string, coins: number): Promise<any> {
    try {
      const paypalConfig = {
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
        baseUrl: process.env.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com'
      };

      if (!paypalConfig.clientId || !paypalConfig.clientSecret) {
        throw new Error('PayPal configuration missing');
      }

      const orderId = `halobuzz_${userId}_${Date.now()}`;
      const returnUrl = `${process.env.API_BASE_URL}/wallet/webhooks/paypal/return`;
      const cancelUrl = `${process.env.API_BASE_URL}/wallet/webhooks/paypal/cancel`;

      // Create PayPal order
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderId,
          amount: {
            currency_code: 'USD',
            value: amount.toString()
          },
          description: `${coins} HaloBuzz Coins`,
          custom_id: userId
        }],
        application_context: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
          brand_name: 'HaloBuzz',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      };

      return {
        success: true,
        orderId,
        orderData,
        approvalUrl: `${paypalConfig.baseUrl}/v2/checkout/orders/${orderId}/approve`,
        amount,
        coins
      };
    } catch (error) {
      this.logger.error('Error creating PayPal order:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify eSewa payment
   */
  async verifyEsewaPayment(pid: string, rid: string): Promise<any> {
    try {
      const esewaConfig = {
        baseUrl: process.env.ESEWA_BASE_URL || 'https://uat.esewa.com.np',
        merchantId: process.env.ESEWA_MERCHANT_ID || '',
        secretKey: process.env.ESEWA_SECRET_KEY || ''
      };

      // Verify payment with eSewa
      const verificationUrl = `${esewaConfig.baseUrl}/epay/transrec`;
      const verificationData = {
        amt: '', // Will be filled from transaction
        rid: rid,
        pid: pid,
        scd: esewaConfig.merchantId
      };

      // Find transaction by pid
      const transaction = await Transaction.findOne({ 
        'metadata.pid': pid,
        status: 'pending'
      });

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      verificationData.amt = transaction.amount.toString();

      // Make verification request
      const response = await fetch(verificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(verificationData)
      });

      const result = await response.text();
      
      if (result.includes('Success')) {
        // Update transaction status
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'completed',
          transactionId: rid
        });

        // Update user balance
        await this.updateUserBalance(transaction.userId.toString(), transaction.amount);

        return { success: true, transactionId: rid };
      } else {
        await Transaction.findByIdAndUpdate(transaction._id, {
          status: 'failed'
        });

        return { success: false, error: 'Payment verification failed' };
      }
    } catch (error) {
      this.logger.error('Error verifying eSewa payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify Khalti payment
   */
  async verifyKhaltiPayment(token: string): Promise<any> {
    try {
      const khaltiConfig = {
        baseUrl: process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2',
        secretKey: process.env.KHALTI_SECRET_KEY || ''
      };

      if (!khaltiConfig.secretKey) {
        throw new Error('Khalti configuration missing');
      }

      // Verify payment with Khalti
      const verificationUrl = `${khaltiConfig.baseUrl}/epayment/lookup/`;
      
      const response = await fetch(verificationUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${khaltiConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const result = await response.json();

      if (result.state && result.state.name === 'Completed') {
        // Find transaction by token
        const transaction = await Transaction.findOne({ 
          'metadata.token': token,
          status: 'pending'
        });

        if (transaction) {
          // Update transaction status
          await Transaction.findByIdAndUpdate(transaction._id, {
            status: 'completed',
            transactionId: token
          });

          // Update user balance
          await this.updateUserBalance(transaction.userId.toString(), transaction.amount);

          return { success: true, transactionId: token };
        }
      }

      return { success: false, error: 'Payment verification failed' };
    } catch (error) {
      this.logger.error('Error verifying Khalti payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(event: any): Promise<any> {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          
          // Find transaction by payment intent ID
          const transaction = await Transaction.findOne({ 
            transactionId: paymentIntent.id,
            status: 'pending'
          });

          if (transaction) {
            // Update transaction status
            await Transaction.findByIdAndUpdate(transaction._id, {
              status: 'completed'
            });

            // Update user balance
            await this.updateUserBalance(transaction.userId.toString(), transaction.amount);

            this.logger.info(`Stripe payment succeeded: ${paymentIntent.id}`);
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          
          // Find and update failed transaction
          await Transaction.findOneAndUpdate(
            { transactionId: failedPayment.id },
            { status: 'failed' }
          );

          this.logger.warn(`Stripe payment failed: ${failedPayment.id}`);
          break;

        default:
          this.logger.info(`Unhandled Stripe event type: ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error handling Stripe webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate payment data
   */
  validatePaymentData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.userId) {
      errors.push('User ID is required');
    }

    if (!data.amount || data.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!data.currency || !['coins', 'USD', 'NPR'].includes(data.currency)) {
      errors.push('Valid currency is required');
    }

    if (!data.type || !['recharge', 'gift_sent', 'gift_received', 'og_bonus', 'refund', 'withdrawal', 'subscription', 'tip', 'brand_deal', 'platform_fee'].includes(data.type)) {
      errors.push('Valid transaction type is required');
    }

    if (!data.paymentMethod || !['esewa', 'khalti', 'stripe', 'paypal'].includes(data.paymentMethod)) {
      errors.push('Valid payment method is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const paymentService = new PaymentService();