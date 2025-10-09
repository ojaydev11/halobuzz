import * as InAppPurchases from 'expo-in-app-purchases';
import { Platform, Alert } from 'react-native';
import { apiClient } from '@/lib/api';

// IAP Product IDs - must match Apple App Store Connect and Google Play Console
export const IAP_PRODUCT_IDS = {
  COINS_100: Platform.select({
    ios: 'com.halobuzz.app.coins.100',
    android: 'com.halobuzz.app.coins.100',
  }) as string,
  COINS_500: Platform.select({
    ios: 'com.halobuzz.app.coins.500',
    android: 'com.halobuzz.app.coins.500',
  }) as string,
  COINS_1000: Platform.select({
    ios: 'com.halobuzz.app.coins.1000',
    android: 'com.halobuzz.app.coins.1000',
  }) as string,
  COINS_5000: Platform.select({
    ios: 'com.halobuzz.app.coins.5000',
    android: 'com.halobuzz.app.coins.5000',
  }) as string,
  COINS_10000: Platform.select({
    ios: 'com.halobuzz.app.coins.10000',
    android: 'com.halobuzz.app.coins.10000',
  }) as string,
  // OG Tier Subscriptions
  OG_TIER_1: Platform.select({
    ios: 'com.halobuzz.app.og.tier1.monthly',
    android: 'com.halobuzz.app.og.tier1.monthly',
  }) as string,
  OG_TIER_2: Platform.select({
    ios: 'com.halobuzz.app.og.tier2.monthly',
    android: 'com.halobuzz.app.og.tier2.monthly',
  }) as string,
  OG_TIER_3: Platform.select({
    ios: 'com.halobuzz.app.og.tier3.monthly',
    android: 'com.halobuzz.app.og.tier3.monthly',
  }) as string,
  OG_TIER_4: Platform.select({
    ios: 'com.halobuzz.app.og.tier4.monthly',
    android: 'com.halobuzz.app.og.tier4.monthly',
  }) as string,
  OG_TIER_5: Platform.select({
    ios: 'com.halobuzz.app.og.tier5.monthly',
    android: 'com.halobuzz.app.og.tier5.monthly',
  }) as string,
};

export interface CoinPackage {
  id: string;
  productId: string;
  coins: number;
  price: string;
  currency: string;
  title: string;
  description: string;
  bonus?: number;
  popular?: boolean;
  bestValue?: boolean;
}

export interface OGTierProduct {
  id: string;
  productId: string;
  tier: number;
  price: string;
  currency: string;
  title: string;
  description: string;
  benefits: string[];
}

export interface PurchaseResult {
  success: boolean;
  coins?: number;
  error?: string;
  transactionId?: string;
}

class InAppPurchaseService {
  private static instance: InAppPurchaseService;
  private initialized: boolean = false;
  private products: InAppPurchases.IAPItemDetails[] = [];
  private purchaseListener: any = null;

  static getInstance(): InAppPurchaseService {
    if (!InAppPurchaseService.instance) {
      InAppPurchaseService.instance = new InAppPurchaseService();
    }
    return InAppPurchaseService.instance;
  }

  /**
   * Initialize IAP system
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      // Connect to store
      await InAppPurchases.connectAsync();
      console.log('✅ IAP connected to store');

      // Set up purchase listener
      this.purchaseListener = InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
        console.log('Purchase listener triggered:', { responseCode, errorCode });

        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          results?.forEach((purchase) => {
            if (!purchase.acknowledged) {
              this.processPurchase(purchase);
            }
          });
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          console.log('User canceled purchase');
        } else if (responseCode === InAppPurchases.IAPResponseCode.ERROR) {
          console.error('IAP error:', errorCode);
          Alert.alert('Purchase Failed', 'An error occurred during the purchase. Please try again.');
        }
      });

      // Fetch available products
      await this.fetchProducts();

      this.initialized = true;
      console.log('✅ IAP service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize IAP:', error);
      return false;
    }
  }

  /**
   * Fetch available products from store
   */
  async fetchProducts(): Promise<void> {
    try {
      const productIds = Object.values(IAP_PRODUCT_IDS);
      const { responseCode, results } = await InAppPurchases.getProductsAsync(productIds);

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        this.products = results;
        console.log(`✅ Fetched ${results.length} IAP products:`, results.map(p => p.productId));
      } else {
        console.warn('⚠️ Failed to fetch products, response code:', responseCode);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    }
  }

  /**
   * Get coin packages with prices
   */
  getCoinPackages(): CoinPackage[] {
    const packages: CoinPackage[] = [
      {
        id: 'coins_100',
        productId: IAP_PRODUCT_IDS.COINS_100,
        coins: 100,
        price: '$0.99',
        currency: 'USD',
        title: 'Starter Pack',
        description: '100 Coins',
      },
      {
        id: 'coins_500',
        productId: IAP_PRODUCT_IDS.COINS_500,
        coins: 500,
        price: '$4.99',
        currency: 'USD',
        title: 'Popular Pack',
        description: '500 Coins + 50 Bonus',
        bonus: 50,
        popular: true,
      },
      {
        id: 'coins_1000',
        productId: IAP_PRODUCT_IDS.COINS_1000,
        coins: 1000,
        price: '$9.99',
        currency: 'USD',
        title: 'Value Pack',
        description: '1,000 Coins + 150 Bonus',
        bonus: 150,
      },
      {
        id: 'coins_5000',
        productId: IAP_PRODUCT_IDS.COINS_5000,
        coins: 5000,
        price: '$39.99',
        currency: 'USD',
        title: 'Mega Pack',
        description: '5,000 Coins + 1,000 Bonus',
        bonus: 1000,
        bestValue: true,
      },
      {
        id: 'coins_10000',
        productId: IAP_PRODUCT_IDS.COINS_10000,
        coins: 10000,
        price: '$79.99',
        currency: 'USD',
        title: 'Ultimate Pack',
        description: '10,000 Coins + 2,500 Bonus',
        bonus: 2500,
      },
    ];

    // Update with actual store prices if available
    return packages.map(pkg => {
      const product = this.products.find(p => p.productId === pkg.productId);
      if (product) {
        return {
          ...pkg,
          price: product.price,
          currency: product.currencyCode || pkg.currency,
          title: product.title || pkg.title,
          description: product.description || pkg.description,
        };
      }
      return pkg;
    });
  }

  /**
   * Get OG Tier subscription products
   */
  getOGTierProducts(): OGTierProduct[] {
    const tiers: OGTierProduct[] = [
      {
        id: 'og_tier_1',
        productId: IAP_PRODUCT_IDS.OG_TIER_1,
        tier: 1,
        price: '$4.99',
        currency: 'USD',
        title: 'OG Tier 1',
        description: 'Bronze Member',
        benefits: ['Custom badge', 'Priority support', '5% coin bonus'],
      },
      {
        id: 'og_tier_2',
        productId: IAP_PRODUCT_IDS.OG_TIER_2,
        tier: 2,
        price: '$9.99',
        currency: 'USD',
        title: 'OG Tier 2',
        description: 'Silver Member',
        benefits: ['Custom badge', 'Priority support', '10% coin bonus', 'Early stream access'],
      },
      {
        id: 'og_tier_3',
        productId: IAP_PRODUCT_IDS.OG_TIER_3,
        tier: 3,
        price: '$19.99',
        currency: 'USD',
        title: 'OG Tier 3',
        description: 'Gold Member',
        benefits: ['Custom badge', 'Priority support', '15% coin bonus', 'Early stream access', 'Pin messages'],
      },
      {
        id: 'og_tier_4',
        productId: IAP_PRODUCT_IDS.OG_TIER_4,
        tier: 4,
        price: '$49.99',
        currency: 'USD',
        title: 'OG Tier 4',
        description: 'Platinum Member',
        benefits: ['Custom badge', 'Priority support', '20% coin bonus', 'All lower tier benefits', 'Unsend messages', 'AI gift suggestions'],
      },
      {
        id: 'og_tier_5',
        productId: IAP_PRODUCT_IDS.OG_TIER_5,
        tier: 5,
        price: '$99.99',
        currency: 'USD',
        title: 'OG Tier 5',
        description: 'Diamond Member',
        benefits: ['All benefits', 'Ghost Mode', 'Buzz Entry animation', 'AI sidekick', 'OG Lounge access', '25% coin bonus'],
      },
    ];

    // Update with actual store prices if available
    return tiers.map(tier => {
      const product = this.products.find(p => p.productId === tier.productId);
      if (product) {
        return {
          ...tier,
          price: product.price,
          currency: product.currencyCode || tier.currency,
        };
      }
      return tier;
    });
  }

  /**
   * Purchase coins
   */
  async purchaseCoins(productId: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('Initiating purchase for product:', productId);

      // Start purchase flow
      await InAppPurchases.purchaseItemAsync(productId);

      // The purchase listener will handle the result
      // Return pending state
      return {
        success: true,
        error: 'Purchase initiated, waiting for completion...',
      };
    } catch (error) {
      console.error('Purchase error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      Alert.alert(
        'Purchase Failed',
        `Unable to complete purchase: ${errorMessage}`,
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Subscribe to OG Tier
   */
  async subscribeToOGTier(tier: number): Promise<PurchaseResult> {
    const productId = Object.values(IAP_PRODUCT_IDS).find(id => id.includes(`og.tier${tier}`));

    if (!productId) {
      return {
        success: false,
        error: 'Invalid OG tier',
      };
    }

    return this.purchaseCoins(productId);
  }

  /**
   * Process completed purchase
   */
  private async processPurchase(purchase: InAppPurchases.InAppPurchase): Promise<void> {
    console.log('Processing purchase:', purchase.productId);

    try {
      // Verify with backend
      const verificationResult = await this.verifyPurchaseWithBackend(purchase);

      if (verificationResult.success) {
        // Acknowledge purchase
        await InAppPurchases.finishTransactionAsync(purchase, true);

        console.log('✅ Purchase verified and acknowledged:', purchase.productId);

        // Show success message
        Alert.alert(
          '🎉 Purchase Successful!',
          `${verificationResult.coins} coins have been added to your account.`,
          [{ text: 'Great!' }]
        );
      } else {
        // Failed verification
        console.error('❌ Purchase verification failed:', verificationResult.error);

        Alert.alert(
          'Verification Failed',
          'Your purchase could not be verified. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error processing purchase:', error);

      Alert.alert(
        'Processing Error',
        'An error occurred while processing your purchase. Please contact support if coins were not added.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Verify purchase with backend server
   */
  private async verifyPurchaseWithBackend(purchase: InAppPurchases.InAppPurchase): Promise<PurchaseResult> {
    try {
      const response = await apiClient.post('/wallet/iap/verify', {
        platform: Platform.OS,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        purchaseToken: purchase.purchaseToken,
        receipt: purchase.transactionReceipt,
        orderId: purchase.orderId,
      });

      if (response.success && response.data) {
        return {
          success: true,
          coins: response.data.coins,
          transactionId: purchase.transactionId || undefined,
        };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Verification failed',
        };
      }
    } catch (error) {
      console.error('Backend verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<{ success: boolean; count: number }> {
    try {
      console.log('Restoring purchases...');

      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();

      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        console.log(`Found ${results.length} previous purchases`);

        // Process unacknowledged purchases
        const unacknowledged = results.filter(p => !p.acknowledged);

        for (const purchase of unacknowledged) {
          await this.processPurchase(purchase);
        }

        Alert.alert(
          'Restore Complete',
          `${unacknowledged.length} purchases restored.`,
          [{ text: 'OK' }]
        );

        return {
          success: true,
          count: unacknowledged.length,
        };
      }

      return {
        success: false,
        count: 0,
      };
    } catch (error) {
      console.error('Restore purchases error:', error);

      Alert.alert(
        'Restore Failed',
        'Unable to restore purchases. Please try again later.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        count: 0,
      };
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      if (this.purchaseListener) {
        this.purchaseListener.remove();
        this.purchaseListener = null;
      }

      await InAppPurchases.disconnectAsync();
      this.initialized = false;
      console.log('✅ IAP service disconnected');
    } catch (error) {
      console.error('Error disconnecting IAP:', error);
    }
  }

  /**
   * Check if IAP is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      // IAP is not available on simulators/emulators
      const isAvailable = await InAppPurchases.isAvailableAsync();
      return isAvailable;
    } catch (error) {
      console.error('Error checking IAP availability:', error);
      return false;
    }
  }
}

export default InAppPurchaseService.getInstance();
