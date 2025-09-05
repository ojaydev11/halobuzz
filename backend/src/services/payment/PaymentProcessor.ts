import crypto from 'crypto';
import Stripe from 'stripe';
import axios from 'axios';
import { Transaction } from '../../models/Transaction';
import { User } from '../../models/User';
import { WebhookEvent } from '../../models/WebhookEvent';
import { logger } from '../../config/logger';
import { metricsService } from '../MetricsService';
import { fraudDetectionService } from '../FraudDetectionService';
import { paymentVelocityService } from '../PaymentVelocityService';

interface PaymentResult {
  success: boolean;
  transactionId?: string;
  coins?: number;
  error?: string;
  provider: string;
}

export class PaymentProcessor {
  private stripe: Stripe;
  private providers = {
    esewa: {
      merchantCode: process.env.ESEWA_MERCHANT_CODE!,
      secret: process.env.ESEWA_SECRET!,
      apiUrl: process.env.ESEWA_API_URL || 'https://esewa.com.np/epay/main',
      verifyUrl: process.env.ESEWA_VERIFY_URL || 'https://esewa.com.np/epay/transrec'
    },
    khalti: {
      publicKey: process.env.KHALTI_PUBLIC_KEY!,
      secretKey: process.env.KHALTI_SECRET_KEY!,
      apiUrl: process.env.KHALTI_API_URL || 'https://khalti.com/api/v2'
    }
  };

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    });
  }

  /**
   * Process top-up request with idempotency
   */
  async processTopup(userId: string, provider: string, amount: number, coins: number, idempotencyKey: string) {
    try {
      // Check for duplicate request (idempotency)
      const existingTransaction = await Transaction.findOne({
        userId,
        'metadata.idempotencyKey': idempotencyKey
      });

      if (existingTransaction) {
        logger.info(`Duplicate topup request detected: ${idempotencyKey}`);
        return {
          success: true,
          transactionId: existingTransaction.transactionId,
          cached: true
        };
      }

      // Fraud detection
      const fraudCheck = await this.performFraudCheck(userId, amount, provider);
      if (!fraudCheck.allowed) {
        throw new Error(`Payment blocked: ${fraudCheck.reason}`);
      }

      // Velocity check  
      const velocityCheck = await paymentVelocityService.checkVelocityLimits(userId, amount, provider);
      if (!velocityCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${velocityCheck.reason}`);
      }

      // Process based on provider
      let result: PaymentResult;
      
      switch (provider) {
        case 'esewa':
          result = await this.processEsewa(userId, amount, coins, idempotencyKey);
          break;
        case 'khalti':
          result = await this.processKhalti(userId, amount, coins, idempotencyKey);
          break;
        case 'stripe':
          result = await this.processStripe(userId, amount, coins, idempotencyKey);
          break;
        default:
          throw new Error('Invalid payment provider');
      }

      // Track metrics
      if (result.success) {
        metricsService.incrementCounter('payment_success_total', { provider });
        metricsService.recordHistogram('payment_amount', amount, { provider });
      } else {
        metricsService.incrementCounter('payment_failure_total', { provider });
      }

      return result;

    } catch (error: any) {
      logger.error('Payment processing failed:', error);
      metricsService.incrementCounter('payment_error_total', { provider });
      throw error;
    }
  }

  /**
   * Process eSewa payment
   */
  private async processEsewa(userId: string, amount: number, coins: number, idempotencyKey: string): Promise<PaymentResult> {
    const productId = `HB_${Date.now()}_${userId.slice(-6)}`;
    const hash = this.generateEsewaHash(amount, productId);

    // Create pending transaction
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount,
      currency: 'NPR',
      status: 'pending',
      paymentMethod: 'esewa',
      paymentProvider: 'esewa',
      transactionId: productId,
      description: `Coin recharge: ${coins} coins`,
      netAmount: amount,
      metadata: {
        idempotencyKey,
        coins,
        hash
      }
    });
    await transaction.save();

    const paymentData = {
      amt: amount.toString(),
      psc: '0',
      pdc: '0',
      txAmt: '0',
      tAmt: amount.toString(),
      pid: productId,
      scd: this.providers.esewa.merchantCode,
      su: `${process.env.API_URL}/api/v1/payments/esewa/webhook`,
      fu: `${process.env.API_URL}/api/v1/payments/esewa/failure`
    };

    return {
      success: true,
      transactionId: productId,
      provider: 'esewa',
      paymentUrl: `${this.providers.esewa.apiUrl}?${new URLSearchParams(paymentData).toString()}`
    };
  }

  /**
   * Process Khalti payment
   */
  private async processKhalti(userId: string, amount: number, coins: number, idempotencyKey: string): Promise<PaymentResult> {
    const productId = `HB_${Date.now()}_${userId.slice(-6)}`;

    // Create pending transaction
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount,
      currency: 'NPR',
      status: 'pending',
      paymentMethod: 'khalti',
      paymentProvider: 'khalti',
      transactionId: productId,
      description: `Coin recharge: ${coins} coins`,
      netAmount: amount,
      metadata: {
        idempotencyKey,
        coins
      }
    });
    await transaction.save();

    // Initiate Khalti payment
    const response = await axios.post(
      `${this.providers.khalti.apiUrl}/epayment/initiate/`,
      {
        return_url: `${process.env.API_URL}/api/v1/payments/khalti/webhook`,
        website_url: process.env.WEBSITE_URL,
        amount: amount * 100, // Convert to paisa
        purchase_order_id: productId,
        purchase_order_name: `${coins} Coins`,
        customer_info: {
          name: userId,
          phone: '9800000000' // Default
        }
      },
      {
        headers: {
          Authorization: `Key ${this.providers.khalti.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      transactionId: productId,
      provider: 'khalti',
      paymentUrl: response.data.payment_url,
      pidx: response.data.pidx
    };
  }

  /**
   * Process Stripe payment
   */
  private async processStripe(userId: string, amount: number, coins: number, idempotencyKey: string): Promise<PaymentResult> {
    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId,
        coins: coins.toString(),
        idempotencyKey
      },
      automatic_payment_methods: {
        enabled: true
      }
    }, {
      idempotencyKey // Stripe's built-in idempotency
    });

    // Create pending transaction
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'stripe',
      paymentProvider: 'stripe',
      transactionId: paymentIntent.id,
      description: `Coin recharge: ${coins} coins`,
      netAmount: amount,
      metadata: {
        idempotencyKey,
        coins,
        clientSecret: paymentIntent.client_secret
      }
    });
    await transaction.save();

    return {
      success: true,
      transactionId: paymentIntent.id,
      provider: 'stripe',
      clientSecret: paymentIntent.client_secret
    };
  }

  /**
   * Handle webhook with idempotency
   */
  async handleWebhook(provider: string, eventId: string, payload: any, signature?: string): Promise<void> {
    try {
      // Check if webhook already processed (idempotency)
      const existingEvent = await WebhookEvent.findOne({
        provider,
        eventId
      });

      if (existingEvent) {
        logger.info(`Webhook already processed: ${provider}/${eventId}`);
        return;
      }

      // Store webhook event
      await WebhookEvent.create({
        provider,
        eventId,
        payload,
        signature,
        processedAt: new Date()
      });

      // Verify and process based on provider
      switch (provider) {
        case 'esewa':
          await this.handleEsewaWebhook(payload);
          break;
        case 'khalti':
          await this.handleKhaltiWebhook(payload);
          break;
        case 'stripe':
          await this.handleStripeWebhook(payload, signature!);
          break;
      }

      logger.info(`Webhook processed successfully: ${provider}/${eventId}`);

    } catch (error: any) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle eSewa webhook
   */
  private async handleEsewaWebhook(data: any): Promise<void> {
    const { oid, amt, refId } = data;

    // Verify with eSewa
    const verification = await this.verifyEsewaPayment(oid, refId, amt);
    if (!verification.success) {
      throw new Error('eSewa payment verification failed');
    }

    // Update transaction
    const transaction = await Transaction.findOne({ transactionId: oid });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === 'completed') {
      logger.info('Transaction already completed');
      return;
    }

    // Update transaction status
    transaction.status = 'completed';
    transaction.metadata.refId = refId;
    await transaction.save();

    // Credit coins to user (< 10s requirement)
    const startTime = Date.now();
    
    await User.findByIdAndUpdate(transaction.userId, {
      $inc: {
        'coins.balance': transaction.metadata.coins,
        'coins.totalEarned': transaction.metadata.coins
      }
    });

    const creditTime = Date.now() - startTime;
    metricsService.recordHistogram('wallet_credit_time_ms', creditTime);

    if (creditTime > 10000) {
      logger.warn(`Slow wallet credit: ${creditTime}ms for transaction ${oid}`);
    }

    logger.info(`eSewa payment completed: ${oid}, coins credited: ${transaction.metadata.coins}`);
  }

  /**
   * Handle Khalti webhook
   */
  private async handleKhaltiWebhook(data: any): Promise<void> {
    const { pidx, transaction_id, amount, purchase_order_id } = data;

    // Verify with Khalti
    const verification = await this.verifyKhaltiPayment(pidx);
    if (!verification.success) {
      throw new Error('Khalti payment verification failed');
    }

    // Update transaction
    const transaction = await Transaction.findOne({ transactionId: purchase_order_id });
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status === 'completed') {
      return;
    }

    // Update transaction status
    transaction.status = 'completed';
    transaction.metadata.khaltiTransactionId = transaction_id;
    await transaction.save();

    // Credit coins to user
    await User.findByIdAndUpdate(transaction.userId, {
      $inc: {
        'coins.balance': transaction.metadata.coins,
        'coins.totalEarned': transaction.metadata.coins
      }
    });

    logger.info(`Khalti payment completed: ${purchase_order_id}, coins credited: ${transaction.metadata.coins}`);
  }

  /**
   * Handle Stripe webhook
   */
  private async handleStripeWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Update transaction
      const transaction = await Transaction.findOne({ transactionId: paymentIntent.id });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status === 'completed') {
        return;
      }

      // Update transaction status
      transaction.status = 'completed';
      await transaction.save();

      // Credit coins to user
      const coins = parseInt(paymentIntent.metadata.coins);
      await User.findByIdAndUpdate(paymentIntent.metadata.userId, {
        $inc: {
          'coins.balance': coins,
          'coins.totalEarned': coins
        }
      });

      logger.info(`Stripe payment completed: ${paymentIntent.id}, coins credited: ${coins}`);
    }
  }

  /**
   * Verify eSewa payment
   */
  private async verifyEsewaPayment(oid: string, refId: string, amount: string): Promise<{ success: boolean }> {
    try {
      const response = await axios.post(this.providers.esewa.verifyUrl, {
        amt: amount,
        rid: refId,
        pid: oid,
        scd: this.providers.esewa.merchantCode
      });

      return { success: response.data.includes('Success') };
    } catch (error) {
      logger.error('eSewa verification failed:', error);
      return { success: false };
    }
  }

  /**
   * Verify Khalti payment
   */
  private async verifyKhaltiPayment(pidx: string): Promise<{ success: boolean }> {
    try {
      const response = await axios.post(
        `${this.providers.khalti.apiUrl}/epayment/lookup/`,
        { pidx },
        {
          headers: {
            Authorization: `Key ${this.providers.khalti.secretKey}`
          }
        }
      );

      return { success: response.data.status === 'Completed' };
    } catch (error) {
      logger.error('Khalti verification failed:', error);
      return { success: false };
    }
  }

  /**
   * Generate eSewa hash for security
   */
  private generateEsewaHash(amount: number, productId: string): string {
    const message = `total_amount=${amount},transaction_uuid=${productId},product_code=${this.providers.esewa.merchantCode}`;
    return crypto.createHmac('sha256', this.providers.esewa.secret).update(message).digest('base64');
  }

  /**
   * Perform fraud detection
   */
  private async performFraudCheck(userId: string, amount: number, provider: string) {
    return fraudDetectionService.checkPaymentFraud(userId, amount, provider, {
      timestamp: Date.now(),
      source: 'topup'
    });
  }
}

export const paymentProcessor = new PaymentProcessor();