type Locale = 'en' | 'ne';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    wallet: 'Wallet',
    recharge: 'Recharge',
    withdraw: 'Withdraw',
    history: 'History',
    live: 'Live Streaming',
    reels: 'Reels',
  },
  ne: {
    wallet: 'वालेट',
    recharge: 'रिचार्ज',
    withdraw: 'झिक्नुस्',
    history: 'इतिहास',
    live: 'प्रत्यक्ष प्रसारण',
    reels: 'रिल्स',
  }
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }
export function t(key: string): string { return translations[currentLocale][key] || key; }

