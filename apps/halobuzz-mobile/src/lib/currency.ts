type Currency = 'NPR' | 'USD' | 'INR';

const BASE_MAPPING = { coinsPerRs: 500 / 10 }; // Rs 10 = 500 coins => 50 coins per Rs

const rates: Record<Currency, number> = {
  NPR: 1,
  USD: 133, // approx NPR per USD (example; should be from backend)
  INR: 1.6,
};

export function coinsFor(amount: number, currency: Currency = 'NPR'): number {
  const npr = amount * rates[currency];
  return Math.floor(npr * BASE_MAPPING.coinsPerRs);
}

export function formatCurrency(amount: number, currency: Currency = 'NPR') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

