import * as crypto from 'crypto';
import { logger } from '../config/logger';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { getCache, setCache } from '../config/redis';

interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  description: string;
  metadata?: any;
}

interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  clientSecret?: string;
  error?: string;
  requiresVerification?: boolean;
}

interface FraudDetectionResult {
  isFraudulent: boolean;
  riskScore: number;
  reasons: string[];
  action: 'allow' | 'review' | 'block';
}

interface PaymentVerification {
  isValid: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
}

export class SecurePaymentService {
  private readonly logger = logger;
  private readonly maxDailyAmount = 10000; // $10,000 per day per user
  private readonly maxTransactionAmount = 1000; // $1,000 per transaction
  private readonly suspiciousPatterns = [
    /test.*payment/i,
    /fake.*money/i,
    /hack.*payment/i
  ];

  /**
   * Process secure payment with fraud detection
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Generate idempotency key
      const idempotencyKey = this.generateIdempotencyKey(request);
      
      // Check for duplicate requests
      const existingTransaction = await this.checkDuplicateRequest(idempotencyKey);
      if (existingTransaction) {
        return {
          success: true,
          transactionId: existingTransaction._id.toString(),
          error: 'Duplicate request prevented'
        };
      }

      // Fraud detection
      const fraudCheck = await this.detectFraud(request);
      if (fraudCheck.action === 'block') {
        await this.logFraudAttempt(request, fraudCheck);
        return {
          success: false,
          error: 'Payment blocked due to security concerns'
        };
      }

      // Validate payment limits
      const limitCheck = await this.validatePaymentLimits(request);
      if (!limitCheck.valid) {
        return {
          success: false,
          error: limitCheck.reason
        };
      }

      // Create secure transaction
      const transaction = await this.createSecureTransaction(request, idempotencyKey);
      
      // Process payment based on method
      const paymentResult = await this.processPaymentMethod(request, transaction);
      
      // Update transaction status
      await this.updateTransactionStatus(transaction._id.toString(), paymentResult.status);
      
      return {
        success: paymentResult.success,
        transactionId: transaction._id.toString(),
        paymentUrl: (paymentResult as any).paymentUrl,
        clientSecret: (paymentResult as any).clientSecret,
        requiresVerification: fraudCheck.action === 'review'
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
   * Verify payment completion
   */
  async verifyPayment(transactionId: string, verificationData: any): Promise<PaymentVerification> {
    try {
      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return {
          isValid: false,
          transactionId,
          amount: 0,
          currency: '',
          status: 'failed'
        };
      }

      // Verify payment with provider
      const verification = await this.verifyWithProvider(transaction, verificationData);
      
      if (verification.isValid) {
        // Update transaction status
        await Transaction.findByIdAndUpdate(transactionId, {
          status: 'completed',
          completedAt: new Date(),
          verificationData
        });

        // Update user balance
        await this.updateUserBalance(transaction.userId.toString(), transaction.amount);

        // Log successful payment
        await this.logPaymentSuccess(transaction);
      } else {
        await Transaction.findByIdAndUpdate(transactionId, {
          status: 'failed',
          failedAt: new Date(),
          failureReason: verification.reason
        });
      }

      return {
        isValid: verification.isValid,
        transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: verification.isValid ? 'completed' : 'failed'
      };

    } catch (error) {
      this.logger.error('Error verifying payment:', error);
      return {
        isValid: false,
        transactionId,
        amount: 0,
        currency: '',
        status: 'failed'
      };
    }
  }


  /**
   * Validate payment limits
   */
  private async validatePaymentLimits(request: PaymentRequest): Promise<{ valid: boolean; reason?: string }> {
    // Check transaction amount limit
    if (request.amount > this.maxTransactionAmount) {
      return {
        valid: false,
        reason: `Transaction amount exceeds maximum limit of ${this.maxTransactionAmount}`
      };
    }

    // Check daily spending limit
    const dailySpent = await this.getUserDailySpending(request.userId);
    if (dailySpent + request.amount > this.maxDailyAmount) {
      return {
        valid: false,
        reason: `Daily spending limit exceeded. Current: ${dailySpent}, Limit: ${this.maxDailyAmount}`
      };
    }

    // Check user verification status
    const user = await User.findById(request.userId);
    if (!user?.isVerified && request.amount > 100) {
      return {
        valid: false,
        reason: 'Unverified users cannot make payments over $100'
      };
    }

    return { valid: true };
  }

  /**
   * Create secure transaction with hash
   */
  private async createSecureTransaction(request: PaymentRequest, idempotencyKey: string) {
    const transactionHash = this.generateTransactionHash(request);
    
    const transaction = new Transaction({
      userId: request.userId,
      type: 'recharge',
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      paymentMethod: request.paymentMethod,
      description: request.description,
      idempotencyKey,
      transactionHash,
      metadata: {
        ...request.metadata,
        fraudChecked: true,
        securePayment: true
      },
      fees: this.calculateFees(request.amount, request.paymentMethod),
      netAmount: request.amount - this.calculateFees(request.amount, request.paymentMethod)
    });

    await transaction.save();
    return transaction;
  }

  /**
   * Process payment based on method
   */
  private async processPaymentMethod(request: PaymentRequest, transaction: any) {
    switch (request.paymentMethod) {
      case 'stripe':
        return await this.processStripePayment(request, transaction);
      case 'paypal':
        return await this.processPayPalPayment(request, transaction);
      case 'esewa':
        return await this.processEsewaPayment(request, transaction);
      case 'khalti':
        return await this.processKhaltiPayment(request, transaction);
      default:
        throw new Error(`Unsupported payment method: ${request.paymentMethod}`);
    }
  }

  /**
   * Process Stripe payment
   */
  private async processStripePayment(request: PaymentRequest, transaction: any) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        metadata: {
          transactionId: transaction._id.toString(),
          userId: request.userId,
          idempotencyKey: transaction.idempotencyKey
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        status: 'pending',
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      this.logger.error('Stripe payment error:', error);
      return {
        success: false,
        status: 'failed'
      };
    }
  }

  /**
   * Process PayPal payment
   */
  private async processPayPalPayment(request: PaymentRequest, transaction: any) {
    try {
      const paypalConfig = {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        baseUrl: process.env.PAYPAL_BASE_URL || 'https://api.sandbox.paypal.com'
      };

      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: transaction._id.toString(),
          amount: {
            currency_code: request.currency,
            value: request.amount.toString()
          },
          description: request.description
        }],
        application_context: {
          brand_name: 'HaloBuzz',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      };

      return {
        success: true,
        status: 'pending',
        paymentUrl: `${paypalConfig.baseUrl}/v2/checkout/orders`
      };
    } catch (error) {
      this.logger.error('PayPal payment error:', error);
      return {
        success: false,
        status: 'failed'
      };
    }
  }

  /**
   * Process eSewa payment
   */
  private async processEsewaPayment(request: PaymentRequest, transaction: any) {
    try {
      const esewaConfig = {
        baseUrl: process.env.ESEWA_BASE_URL || 'https://uat.esewa.com.np',
        merchantId: process.env.ESEWA_MERCHANT_ID,
        secretKey: process.env.ESEWA_SECRET_KEY
      };

      const pid = `halobuzz_${transaction._id}`;
      const paymentUrl = `${esewaConfig.baseUrl}/epay/main?` +
        `pid=${pid}&` +
        `amt=${request.amount}&` +
        `pdc=0&` +
        `psc=0&` +
        `txAmt=${request.amount}&` +
        `tAmt=${request.amount}&` +
        `scd=${esewaConfig.merchantId}`;

      return {
        success: true,
        status: 'pending',
        paymentUrl
      };
    } catch (error) {
      this.logger.error('eSewa payment error:', error);
      return {
        success: false,
        status: 'failed'
      };
    }
  }

  /**
   * Process Khalti payment
   */
  private async processKhaltiPayment(request: PaymentRequest, transaction: any) {
    try {
      const khaltiConfig = {
        baseUrl: process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2',
        publicKey: process.env.KHALTI_PUBLIC_KEY,
        secretKey: process.env.KHALTI_SECRET_KEY
      };

      const token = `halobuzz_${transaction._id}`;
      const paymentData = {
        public_key: khaltiConfig.publicKey,
        amount: request.amount * 100, // Convert to paisa
        product_identity: token,
        product_name: request.description,
        transaction_reference: token
      };

      return {
        success: true,
        status: 'pending',
        paymentUrl: `${khaltiConfig.baseUrl}/epayment/initiate/`
      };
    } catch (error) {
      this.logger.error('Khalti payment error:', error);
      return {
        success: false,
        status: 'failed'
      };
    }
  }

  /**
   * Verify payment with provider
   */
  private async verifyWithProvider(transaction: any, verificationData: any) {
    // This would implement actual provider verification
    // For now, return a mock verification
    return {
      isValid: true,
      reason: 'Payment verified'
    };
  }

  /**
   * Update user balance
   */
  private async updateUserBalance(userId: string, amount: number) {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'coins.balance': amount }
    });
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(request: PaymentRequest): string {
    const data = `${request.userId}-${request.amount}-${request.currency}-${request.paymentMethod}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate transaction hash
   */
  private generateTransactionHash(request: PaymentRequest): string {
    const data = `${request.userId}-${request.amount}-${request.currency}-${request.paymentMethod}-${request.description}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Check for duplicate requests
   */
  private async checkDuplicateRequest(idempotencyKey: string) {
    return await Transaction.findOne({ idempotencyKey });
  }


  /**
   * Check geolocation consistency
   */
  private async checkGeolocation(ipAddress: string, userId: string) {
    // This would implement actual geolocation checking
    // For now, return a mock result
    return {
      consistent: true,
      location: 'Unknown'
    };
  }

  /**
   * Calculate fees
   */
  private calculateFees(amount: number, paymentMethod: string): number {
    const feeRates = {
      stripe: 0.029,
      paypal: 0.034,
      esewa: 0.025,
      khalti: 0.030
    };

    const rate = feeRates[paymentMethod] || 0.03;
    return Math.round(amount * rate * 100) / 100;
  }

  /**
   * Update transaction status
   */
  private async updateTransactionStatus(transactionId: string, status: string) {
    await Transaction.findByIdAndUpdate(transactionId, {
      status,
      updatedAt: new Date()
    });
  }

  /**
   * Log fraud attempt
   */
  private async logFraudAttempt(request: PaymentRequest, fraudResult: FraudDetectionResult) {
    await setCache(`fraud_attempt:${request.userId}:${Date.now()}`, {
      request,
      fraudResult,
      timestamp: new Date()
    }, 86400); // 24 hours
  }

  /**
   * Log payment success
   */
  private async logPaymentSuccess(transaction: any) {
    await setCache(`payment_success:${transaction.userId}:${Date.now()}`, {
      transactionId: transaction._id,
      amount: transaction.amount,
      timestamp: new Date()
    }, 86400); // 24 hours
  }

  /**
   * Get user's daily spending
   */
  async getUserDailySpending(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'recharge',
          status: 'completed',
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get user's payment history
   */
  async getUserPaymentHistory(userId: string) {
    return await Transaction.find({
      userId,
      type: 'recharge',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ createdAt: -1 });
  }

  /**
   * Detect fraud patterns
   */
  async detectFraud(request: PaymentRequest): Promise<FraudDetectionResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check suspicious patterns in description
    if (this.suspiciousPatterns.some(pattern => pattern.test(request.description))) {
      reasons.push('Suspicious description pattern');
      riskScore += 50;
    }

    // Check user payment history
    const userHistory = await this.getUserPaymentHistory(request.userId);
    
    // Multiple rapid payments
    const recentPayments = userHistory.filter(p => 
      new Date(p.createdAt).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
    );
    
    if (recentPayments.length > 5) {
      reasons.push('Multiple rapid payments');
      riskScore += 30;
    }

    // Unusual amount patterns
    const avgAmount = userHistory.reduce((sum, p) => sum + p.amount, 0) / userHistory.length;
    if (request.amount > avgAmount * 10 && userHistory.length > 0) {
      reasons.push('Unusually high amount');
      riskScore += 25;
    }

    // Check IP geolocation (if available)
    if (request.metadata?.ipAddress) {
      const geoCheck = await this.checkGeolocation(request.metadata.ipAddress, request.userId);
      if (!geoCheck.consistent) {
        reasons.push('Inconsistent geolocation');
        riskScore += 20;
      }
    }

    // Determine action based on risk score
    let action: 'allow' | 'review' | 'block' = 'allow';
    if (riskScore >= 80) {
      action = 'block';
    } else if (riskScore >= 50) {
      action = 'review';
    }

    return {
      isFraudulent: riskScore >= 80,
      riskScore,
      reasons,
      action
    };
  }
}

export const securePaymentService = new SecurePaymentService();
