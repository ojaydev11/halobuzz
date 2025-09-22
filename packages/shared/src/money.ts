import { THRONE_PRICE_COINS } from './constants';

export function coinsForLocalCurrency(amount: number, currencyCode: string): number {
  const normalized = currencyCode.toUpperCase();
  if (normalized === 'NPR') {
    // Rs.10 = 500 coins => Rs.1 = 50 coins
    return Math.floor(amount * 50);
  }
  // Fallback: 1 unit = 50 coins (approx). Replace with FX service.
  return Math.floor(amount * 50);
}

export function isThroneAffordable(coinBalance: number): boolean {
  return coinBalance >= THRONE_PRICE_COINS;
}

