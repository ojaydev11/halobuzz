import { logger } from '../config/logger';

export interface RegionConfig {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  language: string;
  paymentMethods: string[];
  culturalFeatures: {
    festivals: string[];
    traditions: string[];
    colors: string[];
    symbols: string[];
  };
  pricing: {
    baseMultiplier: number;
    currencySymbol: string;
    exchangeRate: number;
  };
}

export interface LocalizationConfig {
  language: string;
  region: string;
  translations: Record<string, string>;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
}

export class GlobalExpansionService {
  private static instance: GlobalExpansionService;
  private regions: Map<string, RegionConfig> = new Map();
  private localizations: Map<string, LocalizationConfig> = new Map();

  public static getInstance(): GlobalExpansionService {
    if (!GlobalExpansionService.instance) {
      GlobalExpansionService.instance = new GlobalExpansionService();
    }
    return GlobalExpansionService.instance;
  }

  constructor() {
    this.initializeRegions();
    this.initializeLocalizations();
  }

  private initializeRegions() {
    // South Asia Region
    this.regions.set('NP', {
      code: 'NP',
      name: 'Nepal',
      currency: 'NPR',
      timezone: 'Asia/Kathmandu',
      language: 'ne',
      paymentMethods: ['esewa', 'khalti', 'stripe'],
      culturalFeatures: {
        festivals: ['Dashain', 'Tihar', 'Holi', 'Teej'],
        traditions: ['Namaste', 'Tika', 'Mala'],
        colors: ['#ff4757', '#ffd700', '#00d2d3'],
        symbols: ['🏔️', '🕉️', '🌸']
      },
      pricing: {
        baseMultiplier: 1.0,
        currencySymbol: '₨',
        exchangeRate: 1.0
      }
    });

    this.regions.set('IN', {
      code: 'IN',
      name: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      language: 'hi',
      paymentMethods: ['paytm', 'phonepe', 'razorpay', 'stripe'],
      culturalFeatures: {
        festivals: ['Diwali', 'Holi', 'Eid', 'Christmas'],
        traditions: ['Namaste', 'Pranam', 'Aarti'],
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
        symbols: ['🕉️', '🕌', '⛪', '🕊️']
      },
      pricing: {
        baseMultiplier: 0.75,
        currencySymbol: '₹',
        exchangeRate: 0.75
      }
    });

    this.regions.set('BD', {
      code: 'BD',
      name: 'Bangladesh',
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
      language: 'bn',
      paymentMethods: ['bkash', 'nagad', 'rocket', 'stripe'],
      culturalFeatures: {
        festivals: ['Eid', 'Pohela Boishakh', 'Durga Puja'],
        traditions: ['Salam', 'Adab', 'Namaskar'],
        colors: ['#ff4757', '#2ed573', '#ffa502'],
        symbols: ['🕌', '🌺', '🎭']
      },
      pricing: {
        baseMultiplier: 0.8,
        currencySymbol: '৳',
        exchangeRate: 0.8
      }
    });

    this.regions.set('PK', {
      code: 'PK',
      name: 'Pakistan',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      language: 'ur',
      paymentMethods: ['easypaisa', 'jazzcash', 'stripe'],
      culturalFeatures: {
        festivals: ['Eid', 'Ramadan', 'Muharram'],
        traditions: ['Salam', 'Adab', 'Dua'],
        colors: ['#ff4757', '#2ed573', '#ffa502'],
        symbols: ['🕌', '🌙', '⭐']
      },
      pricing: {
        baseMultiplier: 0.7,
        currencySymbol: '₨',
        exchangeRate: 0.7
      }
    });

    this.regions.set('LK', {
      code: 'LK',
      name: 'Sri Lanka',
      currency: 'LKR',
      timezone: 'Asia/Colombo',
      language: 'si',
      paymentMethods: ['stripe', 'paypal'],
      culturalFeatures: {
        festivals: ['Vesak', 'Poson', 'Esala'],
        traditions: ['Ayubowan', 'Namaste', 'Pranam'],
        colors: ['#ff4757', '#ffd700', '#00d2d3'],
        symbols: ['🕉️', '🌸', '🏛️']
      },
      pricing: {
        baseMultiplier: 0.6,
        currencySymbol: '₨',
        exchangeRate: 0.6
      }
    });

    // Southeast Asia Region
    this.regions.set('TH', {
      code: 'TH',
      name: 'Thailand',
      currency: 'THB',
      timezone: 'Asia/Bangkok',
      language: 'th',
      paymentMethods: ['stripe', 'paypal'],
      culturalFeatures: {
        festivals: ['Songkran', 'Loy Krathong', 'Makha Bucha'],
        traditions: ['Wai', 'Sawasdee', 'Khop Khun'],
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
        symbols: ['🏛️', '🌸', '🐘']
      },
      pricing: {
        baseMultiplier: 0.8,
        currencySymbol: '฿',
        exchangeRate: 0.8
      }
    });

    this.regions.set('VN', {
      code: 'VN',
      name: 'Vietnam',
      currency: 'VND',
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      paymentMethods: ['stripe', 'paypal'],
      culturalFeatures: {
        festivals: ['Tet', 'Mid-Autumn', 'Hung Kings'],
        traditions: ['Chao', 'Cam On', 'Xin Chao'],
        colors: ['#ff4757', '#ffd700', '#00d2d3'],
        symbols: ['🏮', '🌸', '🐉']
      },
      pricing: {
        baseMultiplier: 0.5,
        currencySymbol: '₫',
        exchangeRate: 0.5
      }
    });

    // Middle East Region
    this.regions.set('AE', {
      code: 'AE',
      name: 'United Arab Emirates',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      language: 'ar',
      paymentMethods: ['stripe', 'paypal'],
      culturalFeatures: {
        festivals: ['Eid', 'Ramadan', 'National Day'],
        traditions: ['Salam', 'Shukran', 'Marhaba'],
        colors: ['#ff4757', '#ffd700', '#00d2d3'],
        symbols: ['🕌', '🏜️', '🐪']
      },
      pricing: {
        baseMultiplier: 1.2,
        currencySymbol: 'د.إ',
        exchangeRate: 1.2
      }
    });

    // Americas Region
    this.regions.set('US', {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      timezone: 'America/New_York',
      language: 'en',
      paymentMethods: ['stripe', 'paypal'],
      culturalFeatures: {
        festivals: ['Thanksgiving', 'Christmas', 'Independence Day'],
        traditions: ['Hello', 'Thank You', 'Please'],
        colors: ['#ff4757', '#4ecdc4', '#45b7d1'],
        symbols: ['🇺🇸', '🦅', '🏛️']
      },
      pricing: {
        baseMultiplier: 1.0,
        currencySymbol: '$',
        exchangeRate: 1.0
      }
    });
  }

  private initializeLocalizations() {
    // English (Default)
    this.localizations.set('en', {
      language: 'en',
      region: 'US',
      translations: {
        'welcome': 'Welcome to HaloBuzz',
        'live_stream': 'Live Stream',
        'follow': 'Follow',
        'unfollow': 'Unfollow',
        'like': 'Like',
        'share': 'Share',
        'gift': 'Gift',
        'chat': 'Chat',
        'search': 'Search',
        'profile': 'Profile',
        'settings': 'Settings',
        'logout': 'Logout'
      },
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US',
      currencyFormat: '$0.00'
    });

    // Hindi
    this.localizations.set('hi', {
      language: 'hi',
      region: 'IN',
      translations: {
        'welcome': 'HaloBuzz में आपका स्वागत है',
        'live_stream': 'लाइव स्ट्रीम',
        'follow': 'फॉलो करें',
        'unfollow': 'अनफॉलो करें',
        'like': 'पसंद करें',
        'share': 'शेयर करें',
        'gift': 'गिफ्ट',
        'chat': 'चैट',
        'search': 'खोजें',
        'profile': 'प्रोफाइल',
        'settings': 'सेटिंग्स',
        'logout': 'लॉग आउट'
      },
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'hi-IN',
      currencyFormat: '₹0.00'
    });

    // Bengali
    this.localizations.set('bn', {
      language: 'bn',
      region: 'BD',
      translations: {
        'welcome': 'HaloBuzz এ স্বাগতম',
        'live_stream': 'লাইভ স্ট্রিম',
        'follow': 'ফলো করুন',
        'unfollow': 'আনফলো করুন',
        'like': 'লাইক করুন',
        'share': 'শেয়ার করুন',
        'gift': 'গিফট',
        'chat': 'চ্যাট',
        'search': 'খুঁজুন',
        'profile': 'প্রোফাইল',
        'settings': 'সেটিংস',
        'logout': 'লগ আউট'
      },
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'bn-BD',
      currencyFormat: '৳0.00'
    });

    // Urdu
    this.localizations.set('ur', {
      language: 'ur',
      region: 'PK',
      translations: {
        'welcome': 'HaloBuzz میں خوش آمدید',
        'live_stream': 'لائیو سٹریم',
        'follow': 'فالو کریں',
        'unfollow': 'ان فالو کریں',
        'like': 'لائک کریں',
        'share': 'شیئر کریں',
        'gift': 'گفٹ',
        'chat': 'چیٹ',
        'search': 'تلاش کریں',
        'profile': 'پروفائل',
        'settings': 'سیٹنگز',
        'logout': 'لاگ آؤٹ'
      },
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ur-PK',
      currencyFormat: '₨0.00'
    });

    // Thai
    this.localizations.set('th', {
      language: 'th',
      region: 'TH',
      translations: {
        'welcome': 'ยินดีต้อนรับสู่ HaloBuzz',
        'live_stream': 'สตรีมสด',
        'follow': 'ติดตาม',
        'unfollow': 'เลิกติดตาม',
        'like': 'ถูกใจ',
        'share': 'แชร์',
        'gift': 'ของขวัญ',
        'chat': 'แชท',
        'search': 'ค้นหา',
        'profile': 'โปรไฟล์',
        'settings': 'การตั้งค่า',
        'logout': 'ออกจากระบบ'
      },
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'th-TH',
      currencyFormat: '฿0.00'
    });
  }

  getRegionConfig(regionCode: string): RegionConfig | null {
    return this.regions.get(regionCode.toUpperCase()) || null;
  }

  getLocalizationConfig(language: string): LocalizationConfig | null {
    return this.localizations.get(language.toLowerCase()) || null;
  }

  getAllRegions(): RegionConfig[] {
    return Array.from(this.regions.values());
  }

  getAllLocalizations(): LocalizationConfig[] {
    return Array.from(this.localizations.values());
  }

  getSupportedLanguages(): string[] {
    return Array.from(this.localizations.keys());
  }

  getSupportedRegions(): string[] {
    return Array.from(this.regions.keys());
  }

  formatPrice(amount: number, regionCode: string): string {
    const region = this.getRegionConfig(regionCode);
    if (!region) return `$${amount.toFixed(2)}`;

    const localizedAmount = amount * region.pricing.exchangeRate;
    return `${region.pricing.currencySymbol}${localizedAmount.toFixed(2)}`;
  }

  formatDate(date: Date, language: string): string {
    const localization = this.getLocalizationConfig(language);
    if (!localization) {
      return date.toLocaleDateString('en-US');
    }

    return date.toLocaleDateString(localization.numberFormat);
  }

  translate(key: string, language: string): string {
    const localization = this.getLocalizationConfig(language);
    if (!localization) {
      return key; // Return key if no translation found
    }

    return localization.translations[key] || key;
  }

  getCulturalFeatures(regionCode: string) {
    const region = this.getRegionConfig(regionCode);
    return region?.culturalFeatures || null;
  }

  getPaymentMethods(regionCode: string): string[] {
    const region = this.getRegionConfig(regionCode);
    return region?.paymentMethods || ['stripe', 'paypal'];
  }

  detectUserRegion(ip: string, userAgent: string): string {
    // Simple region detection based on IP and user agent
    // In production, use a proper geolocation service
    
    if (ip.includes('192.168') || ip.includes('127.0')) {
      return 'NP'; // Default to Nepal for local development
    }

    // Mock region detection - in production, use MaxMind or similar
    const mockRegions = ['NP', 'IN', 'BD', 'PK', 'LK', 'TH', 'VN', 'AE', 'US'];
    const randomIndex = Math.floor(Math.random() * mockRegions.length);
    return mockRegions[randomIndex];
  }

  async updateExchangeRates(): Promise<void> {
    try {
      // In production, fetch real exchange rates from an API
      // For now, we'll use mock data
      logger.info('Updating exchange rates for all regions');
      
      // Mock exchange rate updates
      const exchangeRates = {
        'USD': 1.0,
        'NPR': 133.0,
        'INR': 83.0,
        'BDT': 110.0,
        'PKR': 280.0,
        'LKR': 325.0,
        'THB': 35.0,
        'VND': 24000.0,
        'AED': 3.67
      };

      // Update exchange rates for each region
      for (const [code, region] of this.regions) {
        const rate = exchangeRates[region.currency as keyof typeof exchangeRates];
        if (rate) {
          region.pricing.exchangeRate = rate;
        }
      }

      logger.info('Exchange rates updated successfully');
    } catch (error) {
      logger.error('Failed to update exchange rates:', error);
    }
  }
}

export const globalExpansionService = GlobalExpansionService.getInstance();
