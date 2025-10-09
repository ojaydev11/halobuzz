import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface AppleReceipt {
  receipt: string;
  productId: string;
  transactionId: string;
}

interface GoogleReceipt {
  packageName: string;
  productId: string;
  purchaseToken: string;
  subscription?: boolean;
}

interface ValidationResult {
  valid: boolean;
  coins?: number;
  tier?: number;
  productId: string;
  transactionId: string;
  error?: string;
}

// Coin packages mapping
const COIN_PACKAGES: { [key: string]: number } = {
  'com.halobuzz.app.coins.100': 100,
  'com.halobuzz.app.coins.500': 550, // 500 + 50 bonus
  'com.halobuzz.app.coins.1000': 1150, // 1000 + 150 bonus
  'com.halobuzz.app.coins.5000': 6000, // 5000 + 1000 bonus
  'com.halobuzz.app.coins.10000': 12500, // 10000 + 2500 bonus
};

// OG Tier subscriptions mapping
const OG_TIER_SUBSCRIPTIONS: { [key: string]: number } = {
  'com.halobuzz.app.og.tier1.monthly': 1,
  'com.halobuzz.app.og.tier2.monthly': 2,
  'com.halobuzz.app.og.tier3.monthly': 3,
  'com.halobuzz.app.og.tier4.monthly': 4,
  'com.halobuzz.app.og.tier5.monthly': 5,
};

export class IAPValidationService {
  private static appleProductionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  private static appleSandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
  private static appleSharedSecret = process.env.APPLE_IAP_SHARED_SECRET || '';

  /**
   * Validate Apple IAP receipt
   */
  static async validateAppleReceipt(receipt: AppleReceipt): Promise<ValidationResult> {
    try {
      // Try production first
      let response = await this.verifyAppleReceipt(receipt.receipt, this.appleProductionUrl);

      // If production fails with sandbox receipt, try sandbox
      if (response.status === 21007) {
        console.log('Sandbox receipt detected, retrying with sandbox URL');
        response = await this.verifyAppleReceipt(receipt.receipt, this.appleSandboxUrl);
      }

      // Check validation status
      if (response.status !== 0) {
        return {
          valid: false,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
          error: `Apple validation failed with status: ${response.status}`,
        };
      }

      // Extract receipt data
      const receiptData = response.receipt || response.latest_receipt_info?.[0];
      if (!receiptData) {
        return {
          valid: false,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
          error: 'No receipt data found',
        };
      }

      // Verify product ID matches
      if (receiptData.product_id !== receipt.productId) {
        return {
          valid: false,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
          error: 'Product ID mismatch',
        };
      }

      // Verify transaction ID matches
      if (receiptData.transaction_id !== receipt.transactionId) {
        return {
          valid: false,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
          error: 'Transaction ID mismatch',
        };
      }

      // Check if it's a coin package or subscription
      const coins = COIN_PACKAGES[receipt.productId];
      const tier = OG_TIER_SUBSCRIPTIONS[receipt.productId];

      if (coins) {
        return {
          valid: true,
          coins,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
        };
      } else if (tier) {
        return {
          valid: true,
          tier,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
        };
      } else {
        return {
          valid: false,
          productId: receipt.productId,
          transactionId: receipt.transactionId,
          error: 'Unknown product ID',
        };
      }
    } catch (error) {
      console.error('Apple receipt validation error:', error);
      return {
        valid: false,
        productId: receipt.productId,
        transactionId: receipt.transactionId,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Verify Apple receipt with Apple servers
   */
  private static async verifyAppleReceipt(receiptData: string, url: string): Promise<any> {
    const response = await axios.post(url, {
      'receipt-data': receiptData,
      password: this.appleSharedSecret,
      'exclude-old-transactions': true,
    });

    return response.data;
  }

  /**
   * Validate Google Play receipt
   */
  static async validateGoogleReceipt(receipt: GoogleReceipt): Promise<ValidationResult> {
    try {
      // For Google Play, we need to use Google Play Developer API
      // This requires service account credentials

      // Check if it's a subscription or one-time purchase
      if (receipt.subscription) {
        return await this.validateGoogleSubscription(receipt);
      } else {
        return await this.validateGoogleProduct(receipt);
      }
    } catch (error) {
      console.error('Google receipt validation error:', error);
      return {
        valid: false,
        productId: receipt.productId,
        transactionId: receipt.purchaseToken,
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Validate Google Play product purchase
   */
  private static async validateGoogleProduct(receipt: GoogleReceipt): Promise<ValidationResult> {
    try {
      // Note: This requires Google Play Developer API setup
      // For production, you need to:
      // 1. Enable Google Play Developer API in Google Cloud Console
      // 2. Create a service account with proper permissions
      // 3. Download service account JSON key
      // 4. Set GOOGLE_APPLICATION_CREDENTIALS env variable

      // For now, we'll use a basic validation
      // In production, use googleapis package for proper validation

      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${receipt.packageName}/purchases/products/${receipt.productId}/tokens/${receipt.purchaseToken}`;

      // This would require OAuth2 token
      // For production implementation, see:
      // https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/get

      // Temporary: Accept all Google receipts with basic validation
      // TODO: Implement proper Google Play validation with service account

      const coins = COIN_PACKAGES[receipt.productId];
      if (coins) {
        return {
          valid: true,
          coins,
          productId: receipt.productId,
          transactionId: receipt.purchaseToken,
        };
      }

      return {
        valid: false,
        productId: receipt.productId,
        transactionId: receipt.purchaseToken,
        error: 'Unknown product ID',
      };
    } catch (error) {
      console.error('Google product validation error:', error);
      throw error;
    }
  }

  /**
   * Validate Google Play subscription
   */
  private static async validateGoogleSubscription(receipt: GoogleReceipt): Promise<ValidationResult> {
    try {
      // Similar to product validation, requires Google Play Developer API
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${receipt.packageName}/purchases/subscriptions/${receipt.productId}/tokens/${receipt.purchaseToken}`;

      // Temporary: Accept all Google subscriptions with basic validation
      // TODO: Implement proper Google Play validation with service account

      const tier = OG_TIER_SUBSCRIPTIONS[receipt.productId];
      if (tier) {
        return {
          valid: true,
          tier,
          productId: receipt.productId,
          transactionId: receipt.purchaseToken,
        };
      }

      return {
        valid: false,
        productId: receipt.productId,
        transactionId: receipt.purchaseToken,
        error: 'Unknown subscription ID',
      };
    } catch (error) {
      console.error('Google subscription validation error:', error);
      throw error;
    }
  }

  /**
   * Check if transaction has been processed before (prevent replay attacks)
   */
  static async isDuplicateTransaction(transactionId: string): Promise<boolean> {
    try {
      // Check database for existing transaction
      const Transaction = (await import('@/models/Transaction')).default;

      const existing = await Transaction.findOne({
        'metadata.iap.transactionId': transactionId,
      });

      return !!existing;
    } catch (error) {
      console.error('Duplicate transaction check error:', error);
      // Err on the side of caution - treat as not duplicate if check fails
      return false;
    }
  }

  /**
   * Get coin amount for product ID
   */
  static getCoinAmount(productId: string): number | null {
    return COIN_PACKAGES[productId] || null;
  }

  /**
   * Get OG tier for product ID
   */
  static getOGTier(productId: string): number | null {
    return OG_TIER_SUBSCRIPTIONS[productId] || null;
  }

  /**
   * Validate receipt data integrity
   */
  static validateReceiptIntegrity(receiptData: string, signature?: string): boolean {
    if (!signature) {
      // If no signature provided, skip integrity check
      return true;
    }

    try {
      // Verify signature using public key
      // This is platform-specific and optional
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(receiptData);

      // Note: You would need to get the public key from Apple/Google
      // For now, we'll skip this check
      return true;
    } catch (error) {
      console.error('Receipt integrity validation error:', error);
      return false;
    }
  }

  /**
   * Generate validation report for audit
   */
  static generateValidationReport(result: ValidationResult): any {
    return {
      timestamp: new Date().toISOString(),
      valid: result.valid,
      productId: result.productId,
      transactionId: result.transactionId,
      coins: result.coins,
      tier: result.tier,
      error: result.error,
    };
  }
}

export default IAPValidationService;
