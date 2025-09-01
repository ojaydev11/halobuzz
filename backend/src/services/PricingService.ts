export class PricingService {
  // NP baseline: NPR 10 = 500 coins => 1 coin = 0.02 NPR; 1 NPR = 50 coins
  static validateNepalBaseline(amountNpr: number, coins: number): void {
    if (!Number.isFinite(amountNpr) || !Number.isFinite(coins)) {
      throw new Error('Invalid pricing inputs');
    }
    if (amountNpr <= 0 || coins <= 0) {
      throw new Error('Amount and coins must be positive');
    }
    const expectedCoins = Math.round(amountNpr * 50);
    if (coins !== expectedCoins) {
      throw new Error(`Invalid NP pricing: expected ${expectedCoins} coins for NPR ${amountNpr}`);
    }
  }
}


