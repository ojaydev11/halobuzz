export const COIN_RATE_PER_LOCAL_CURRENCY: Record<string, number> = {
  NPR: 50, // Rs.1 = 50 coins so Rs.10 = 500 coins
  USD: 5, // $1 = 5*10 = 50 coins baseline; override with FX as needed
};

export const DEFAULT_DAILY_REWARD_COINS = 100;

export const OG_LEVEL_PERKS: Record<number, string[]> = {
  1: ['Basic perks', 'Daily small reward'],
  2: ['Increased rewards', 'Priority support'],
  3: ['Auto Gifter Bot access', 'Exclusive badge'],
  4: ['Ghost mode', 'Unsend/delete messages'],
  5: ['Exclusive lounges', 'Max rewards and perks'],
};

export const THRONE_PRICE_COINS = 15000;
export const THRONE_VALIDITY_DAYS = 25;

