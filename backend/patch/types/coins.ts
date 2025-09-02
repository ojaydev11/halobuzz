/**
 * Unified Coin Type System
 * 
 * This patch resolves the duplicate `coins` number vs object type conflicts
 * by providing a canonical coin structure that can be used across the application.
 */

export interface CoinBalance {
  balance: number;
  bonusBalance: number;
  totalBalance: number;
}

export interface UserCoins {
  balance: number;
  bonusBalance: number;
  totalBalance: number;
  lastUpdated: Date;
}

/**
 * Type guard to check if a value is a CoinBalance object
 */
export function isCoinBalance(value: any): value is CoinBalance {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.balance === 'number' &&
    typeof value.bonusBalance === 'number' &&
    typeof value.totalBalance === 'number'
  );
}

/**
 * Type guard to check if a value is a number (legacy coin format)
 */
export function isLegacyCoins(value: any): value is number {
  return typeof value === 'number';
}

/**
 * Convert legacy number coins to CoinBalance object
 */
export function convertLegacyCoins(coins: number): CoinBalance {
  return {
    balance: coins,
    bonusBalance: 0,
    totalBalance: coins
  };
}

/**
 * Convert CoinBalance to legacy number format
 */
export function convertToLegacyCoins(coinBalance: CoinBalance): number {
  return coinBalance.totalBalance;
}

/**
 * Create a new CoinBalance with default values
 */
export function createCoinBalance(balance: number = 0, bonusBalance: number = 0): CoinBalance {
  return {
    balance,
    bonusBalance,
    totalBalance: balance + bonusBalance
  };
}

/**
 * Add coins to a CoinBalance
 */
export function addCoins(coinBalance: CoinBalance, amount: number, isBonus: boolean = false): CoinBalance {
  if (isBonus) {
    return {
      ...coinBalance,
      bonusBalance: coinBalance.bonusBalance + amount,
      totalBalance: coinBalance.totalBalance + amount
    };
  } else {
    return {
      ...coinBalance,
      balance: coinBalance.balance + amount,
      totalBalance: coinBalance.totalBalance + amount
    };
  }
}

/**
 * Subtract coins from a CoinBalance
 */
export function subtractCoins(coinBalance: CoinBalance, amount: number): CoinBalance {
  const newBalance = Math.max(0, coinBalance.balance - amount);
  const newTotal = newBalance + coinBalance.bonusBalance;
  
  return {
    ...coinBalance,
    balance: newBalance,
    totalBalance: newTotal
  };
}
