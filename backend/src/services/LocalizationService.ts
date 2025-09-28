import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

// Localization interfaces
interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  translations: Record<string, string>;
}

interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  timezone: string;
  currency: string;
  language: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface ContentFilter {
  country: string;
  restrictions: {
    ageGate: boolean;
    contentTypes: string[];
    blockedCategories: string[];
    timeRestrictions: {
      start: string;
      end: string;
    }[];
  };
}

class LocalizationService {
  private supportedLocales: Map<string, LocaleConfig> = new Map();
  private geoLocations: Map<string, GeoLocation> = new Map();
  private contentFilters: Map<string, ContentFilter> = new Map();

  constructor() {
    this.initializeSupportedLocales();
    this.initializeGeoLocations();
    this.initializeContentFilters();
  }

  // Initialize supported locales
  private initializeSupportedLocales(): void {
    const locales: LocaleConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        numberFormat: { decimal: '.', thousands: ',' },
        translations: {
          'welcome': 'Welcome',
          'login': 'Login',
          'register': 'Register',
          'profile': 'Profile',
          'settings': 'Settings',
          'logout': 'Logout'
        }
      },
      {
        code: 'ne',
        name: 'Nepali',
        nativeName: 'नेपाली',
        direction: 'ltr',
        currency: 'NPR',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: '12h',
        numberFormat: { decimal: '.', thousands: ',' },
        translations: {
          'welcome': 'स्वागत छ',
          'login': 'लगइन',
          'register': 'दर्ता',
          'profile': 'प्रोफाइल',
          'settings': 'सेटिङ',
          'logout': 'लगआउट'
        }
      },
      {
        code: 'hi',
        name: 'Hindi',
        nativeName: 'हिन्दी',
        direction: 'ltr',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        numberFormat: { decimal: '.', thousands: ',' },
        translations: {
          'welcome': 'स्वागत',
          'login': 'लॉगिन',
          'register': 'रजिस्टर',
          'profile': 'प्रोफाइल',
          'settings': 'सेटिंग्स',
          'logout': 'लॉगआउट'
        }
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        currency: 'SAR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        numberFormat: { decimal: '.', thousands: ',' },
        translations: {
          'welcome': 'مرحباً',
          'login': 'تسجيل الدخول',
          'register': 'التسجيل',
          'profile': 'الملف الشخصي',
          'settings': 'الإعدادات',
          'logout': 'تسجيل الخروج'
        }
      }
    ];

    locales.forEach(locale => {
      this.supportedLocales.set(locale.code, locale);
    });
  }

  // Initialize geo locations
  private initializeGeoLocations(): void {
    const locations: GeoLocation[] = [
      {
        country: 'Nepal',
        countryCode: 'NP',
        region: 'Asia',
        city: 'Kathmandu',
        timezone: 'Asia/Kathmandu',
        currency: 'NPR',
        language: 'ne',
        coordinates: { lat: 27.7172, lng: 85.3240 }
      },
      {
        country: 'United States',
        countryCode: 'US',
        region: 'North America',
        city: 'New York',
        timezone: 'America/New_York',
        currency: 'USD',
        language: 'en',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      {
        country: 'India',
        countryCode: 'IN',
        region: 'Asia',
        city: 'New Delhi',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        language: 'hi',
        coordinates: { lat: 28.6139, lng: 77.2090 }
      },
      {
        country: 'United Kingdom',
        countryCode: 'GB',
        region: 'Europe',
        city: 'London',
        timezone: 'Europe/London',
        currency: 'GBP',
        language: 'en',
        coordinates: { lat: 51.5074, lng: -0.1278 }
      }
    ];

    locations.forEach(location => {
      this.geoLocations.set(location.countryCode, location);
    });
  }

  // Initialize content filters
  private initializeContentFilters(): void {
    const filters: ContentFilter[] = [
      {
        country: 'NP',
        restrictions: {
          ageGate: true,
          contentTypes: ['streaming', 'gaming', 'social'],
          blockedCategories: ['adult', 'gambling'],
          timeRestrictions: [
            { start: '22:00', end: '06:00' } // Night restrictions
          ]
        }
      },
      {
        country: 'US',
        restrictions: {
          ageGate: true,
          contentTypes: ['streaming', 'gaming', 'social'],
          blockedCategories: ['adult'],
          timeRestrictions: []
        }
      },
      {
        country: 'IN',
        restrictions: {
          ageGate: true,
          contentTypes: ['streaming', 'gaming', 'social'],
          blockedCategories: ['adult', 'gambling'],
          timeRestrictions: [
            { start: '23:00', end: '05:00' }
          ]
        }
      }
    ];

    filters.forEach(filter => {
      this.contentFilters.set(filter.country, filter);
    });
  }

  // Get locale configuration
  async getLocaleConfig(localeCode: string): Promise<LocaleConfig | null> {
    try {
      // Check cache first
      const cached = await getCache(`locale:${localeCode}`) as LocaleConfig;
      if (cached) {
        return cached;
      }

      const locale = this.supportedLocales.get(localeCode);
      if (locale) {
        await setCache(`locale:${localeCode}`, locale, 3600); // 1 hour TTL
      }

      return locale || null;
    } catch (error) {
      logger.error('Error getting locale config:', error);
      return null;
    }
  }

  // Translate text
  async translate(key: string, localeCode: string, params?: Record<string, any>): Promise<string> {
    try {
      const locale = await this.getLocaleConfig(localeCode);
      if (!locale) {
        return key; // Return key if locale not found
      }

      let translation = locale.translations[key] || key;

      // Replace parameters
      if (params) {
        Object.keys(params).forEach(param => {
          translation = translation.replace(`{${param}}`, params[param]);
        });
      }

      return translation;
    } catch (error) {
      logger.error('Error translating text:', error);
      return key;
    }
  }

  // Get geo location by IP
  async getGeoLocation(ipAddress: string): Promise<GeoLocation | null> {
    try {
      // Check cache first
      const cached = await getCache(`geo:${ipAddress}`) as GeoLocation;
      if (cached) {
        return cached;
      }

      // Mock geo location - in production, use a real IP geolocation service
      const mockLocation: GeoLocation = {
        country: 'Nepal',
        countryCode: 'NP',
        region: 'Asia',
        city: 'Kathmandu',
        timezone: 'Asia/Kathmandu',
        currency: 'NPR',
        language: 'ne',
        coordinates: { lat: 27.7172, lng: 85.3240 }
      };

      await setCache(`geo:${ipAddress}`, mockLocation, 86400); // 24 hours TTL
      return mockLocation;

    } catch (error) {
      logger.error('Error getting geo location:', error);
      return null;
    }
  }

  // Get content filter for country
  async getContentFilter(countryCode: string): Promise<ContentFilter | null> {
    try {
      return this.contentFilters.get(countryCode) || null;
    } catch (error) {
      logger.error('Error getting content filter:', error);
      return null;
    }
  }

  // Check if content is allowed
  async isContentAllowed(
    countryCode: string,
    contentType: string,
    category: string,
    userAge?: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    restrictions?: string[];
  }> {
    try {
      const filter = await this.getContentFilter(countryCode);
      if (!filter) {
        return { allowed: true }; // No restrictions if no filter
      }

      const restrictions: string[] = [];

      // Check content type
      if (!filter.restrictions.contentTypes.includes(contentType)) {
        return {
          allowed: false,
          reason: 'Content type not allowed in this region',
          restrictions: ['content_type']
        };
      }

      // Check blocked categories
      if (filter.restrictions.blockedCategories.includes(category)) {
        return {
          allowed: false,
          reason: 'Content category blocked in this region',
          restrictions: ['category']
        };
      }

      // Check age gate
      if (filter.restrictions.ageGate && (!userAge || userAge < 18)) {
        restrictions.push('age_verification_required');
      }

      // Check time restrictions
      const currentHour = new Date().getHours();
      const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
      
      const hasTimeRestriction = filter.restrictions.timeRestrictions.some(restriction => {
        return currentTime >= restriction.start || currentTime <= restriction.end;
      });

      if (hasTimeRestriction) {
        restrictions.push('time_restriction');
      }

      return {
        allowed: restrictions.length === 0,
        restrictions: restrictions.length > 0 ? restrictions : undefined
      };

    } catch (error) {
      logger.error('Error checking content allowance:', error);
      return { allowed: true }; // Default to allowed on error
    }
  }

  // Format currency
  formatCurrency(amount: number, localeCode: string): string {
    try {
      const locale = this.supportedLocales.get(localeCode);
      if (!locale) {
        return `${amount}`;
      }

      const { decimal, thousands } = locale.numberFormat;
      const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).replace(',', thousands).replace('.', decimal);

      return `${locale.currency} ${formatted}`;
    } catch (error) {
      logger.error('Error formatting currency:', error);
      return `${amount}`;
    }
  }

  // Format date
  formatDate(date: Date, localeCode: string): string {
    try {
      const locale = this.supportedLocales.get(localeCode);
      if (!locale) {
        return date.toISOString();
      }

      // Simple date formatting based on locale
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      switch (locale.dateFormat) {
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'DD/MM/YYYY':
          return `${day}/${month}/${year}`;
        case 'YYYY/MM/DD':
          return `${year}/${month}/${day}`;
        default:
          return `${day}/${month}/${year}`;
      }
    } catch (error) {
      logger.error('Error formatting date:', error);
      return date.toISOString();
    }
  }

  // Get supported locales
  getSupportedLocales(): LocaleConfig[] {
    return Array.from(this.supportedLocales.values());
  }

  // Get supported countries
  getSupportedCountries(): GeoLocation[] {
    return Array.from(this.geoLocations.values());
  }
}

// Export singleton instance
export const localizationService = new LocalizationService();
export default localizationService;
