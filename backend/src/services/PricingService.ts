export class PricingService {
  // NP baseline: NPR 100 = 500 coins => 1 coin = 0.2 NPR; 1 NPR = 5 coins
  static validateNepalBaseline(amountNpr: number, coins: number): void {
    if (!Number.isFinite(amountNpr) || !Number.isFinite(coins)) {
      throw new Error('Invalid pricing inputs');
    }
    if (amountNpr <= 0 || coins <= 0) {
      throw new Error('Amount and coins must be positive');
    }
    const expectedCoins = Math.round(amountNpr * 5);
    if (coins !== expectedCoins) {
      throw new Error(`Invalid NP pricing: expected ${expectedCoins} coins for NPR ${amountNpr}`);
    }
  }

  // Auto currency conversion per country
  static convertCurrency(amountNpr: number, targetCurrency: string): number {
    // Exchange rates (simplified - in production, use real-time API)
    const rates: { [key: string]: number } = {
      'USD': 0.0075,  // 1 NPR = 0.0075 USD
      'EUR': 0.0069,
      'GBP': 0.0059,
      'INR': 0.63,    // 1 NPR = 0.63 INR
      'AUD': 0.012,
      'CAD': 0.010,
      'SGD': 0.010,
      'MYR': 0.034,
      'THB': 0.26,
      'PHP': 0.42,
      'IDR': 117.5,
      'VND': 183.5,
      'KRW': 9.90,
      'JPY': 1.12
    };

    if (!rates[targetCurrency]) {
      throw new Error(`Unsupported currency: ${targetCurrency}`);
    }

    return Math.round(amountNpr * rates[targetCurrency] * 100) / 100;
  }

  // Get coin package price by country
  static getCoinPackagePrice(coins: number, currency: string): number {
    // Base rate: 500 coins = 100 NPR
    const baseNpr = (coins / 500) * 100;
    
    if (currency === 'NPR') {
      return baseNpr;
    }
    
    return this.convertCurrency(baseNpr, currency);
  }
}


