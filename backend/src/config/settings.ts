import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables
dotenv.config();

export interface AppSettings {
  // Server Configuration
  nodeEnv: string;
  port: number;
  corsOrigin: string[];
  
  // Database Configuration
  mongodbUri: string;
  redisUrl: string;
  
  // JWT Configuration
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // External Services
  agoraAppId: string;
  agoraAppCert: string;
  
  // AWS S3 Configuration
  s3Bucket: string;
  s3Region: string;
  s3AccessKey: string;
  s3SecretKey: string;
  
  // Payment Gateways
  esewaMerchantId: string;
  esewaSecret: string;
  khaltiPublicKey: string;
  khaltiSecretKey: string;
  stripeSecretKey: string;
  paypalClientId: string;
  paypalClientSecret: string;
  paypalEnvironment: string;
  
  // AI Services
  aiEngineUrl: string;
  aiEngineSecret: string;
  openaiApiKey: string;
  
  // Communication Services
  sendgridApiKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  
  // Timezone
  timezone: string;
  
  // Feature Flags
  features: {
    enableAI: boolean;
    enablePayments: boolean;
    enableNotifications: boolean;
    enableModeration: boolean;
    enableAnalytics: boolean;
  };
  
  // Rate Limiting
  rateLimits: {
    api: { windowMs: number; max: number };
    auth: { windowMs: number; max: number };
    upload: { windowMs: number; max: number };
  };
  
  // Security
  security: {
    bcryptRounds: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

class SettingsManager {
  private settings: AppSettings;
  private validationErrors: string[] = [];

  constructor() {
    this.settings = this.loadSettings();
    this.validateSettings();
  }

  private loadSettings(): AppSettings {
    return {
      // Server Configuration
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '5010'),
      corsOrigin: this.parseCorsOrigin(),
      
      // Database Configuration
      mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz',
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      
      // JWT Configuration
      jwtSecret: process.env.JWT_SECRET || this.generateDefaultSecret(),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      
      // External Services
      agoraAppId: process.env.AGORA_APP_ID || '',
      agoraAppCert: process.env.AGORA_APP_CERT || '',
      
      // AWS S3 Configuration
      s3Bucket: process.env.S3_BUCKET || '',
      s3Region: process.env.S3_REGION || 'us-east-1',
      s3AccessKey: process.env.S3_ACCESS_KEY || '',
      s3SecretKey: process.env.S3_SECRET_KEY || '',
      
      // Payment Gateways
      esewaMerchantId: process.env.ESEWA_MERCHANT_ID || '',
      esewaSecret: process.env.ESEWA_SECRET || '',
      khaltiPublicKey: process.env.KHALTI_PUBLIC_KEY || '',
      khaltiSecretKey: process.env.KHALTI_SECRET_KEY || '',
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
      paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
      paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      paypalEnvironment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
      
      // AI Services
      aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:5020',
      aiEngineSecret: process.env.AI_ENGINE_SECRET || this.generateDefaultSecret(),
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      
      // Communication Services
      sendgridApiKey: process.env.SENDGRID_API_KEY || '',
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      
      // Timezone
      timezone: process.env.TZ || 'Australia/Sydney',
      
      // Feature Flags
      features: {
        enableAI: this.parseBoolean(process.env.ENABLE_AI, true),
        enablePayments: this.parseBoolean(process.env.ENABLE_PAYMENTS, true),
        enableNotifications: this.parseBoolean(process.env.ENABLE_NOTIFICATIONS, true),
        enableModeration: this.parseBoolean(process.env.ENABLE_MODERATION, true),
        enableAnalytics: this.parseBoolean(process.env.ENABLE_ANALYTICS, true),
      },
      
      // Rate Limiting
      rateLimits: {
        api: { windowMs: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
        auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 15 minutes, 5 attempts
        upload: { windowMs: 60 * 60 * 1000, max: 10 }, // 1 hour, 10 uploads
      },
      
      // Security
      security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000'), // 24 hours
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
      },
    };
  }

  private parseCorsOrigin(): string[] {
    const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:19006,http://localhost:3000';
    return corsOrigin.split(',').map(origin => origin.trim());
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private generateDefaultSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private validateSettings(): void {
    this.validationErrors = [];

    // Critical validations
    if (this.settings.nodeEnv === 'production') {
      this.validateProductionSecrets();
    }

    // Database validations
    if (!this.settings.mongodbUri || this.settings.mongodbUri.includes('<user>')) {
      this.validationErrors.push('MONGODB_URI must be set with valid connection string');
    }

    if (!this.settings.redisUrl || this.settings.redisUrl.includes('localhost')) {
      if (this.settings.nodeEnv === 'production') {
        this.validationErrors.push('REDIS_URL must be set for production');
      }
    }

    // JWT validation
    if (this.settings.jwtSecret === 'change_me' || this.settings.jwtSecret.length < 32) {
      this.validationErrors.push('JWT_SECRET must be set to a secure random string (32+ characters)');
    }

    // Payment validations (optional but recommended)
    if (this.settings.features.enablePayments) {
      if (!this.settings.stripeSecretKey && !this.settings.esewaMerchantId && !this.settings.khaltiPublicKey) {
        this.validationErrors.push('At least one payment gateway must be configured when payments are enabled');
      }
    }

    // AI service validations
    if (this.settings.features.enableAI) {
      if (!this.settings.openaiApiKey && !this.settings.aiEngineUrl) {
        this.validationErrors.push('AI services require either OpenAI API key or AI Engine URL');
      }
    }

    // Communication service validations
    if (this.settings.features.enableNotifications) {
      if (!this.settings.sendgridApiKey && !this.settings.twilioAccountSid) {
        this.validationErrors.push('Notifications require either SendGrid or Twilio configuration');
      }
    }

    // Log validation results
    if (this.validationErrors.length > 0) {
      logger.warn('Configuration validation warnings:', this.validationErrors);
      
      if (this.settings.nodeEnv === 'production') {
        logger.error('Production configuration validation failed:', this.validationErrors);
        throw new Error(`Configuration validation failed: ${this.validationErrors.join(', ')}`);
      }
    } else {
      logger.info('Configuration validation passed');
    }
  }

  private validateProductionSecrets(): void {
    const requiredSecrets = [
      'mongodbUri',
      'redisUrl',
      'jwtSecret',
    ];

    const missingSecrets = requiredSecrets.filter(secret => {
      const value = this.settings[secret as keyof AppSettings];
      return !value || value === '' || (typeof value === 'string' && value.includes('change_me'));
    });

    if (missingSecrets.length > 0) {
      this.validationErrors.push(`Production requires: ${missingSecrets.join(', ')}`);
    }
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  public getValidationErrors(): string[] {
    return this.validationErrors;
  }

  public isProduction(): boolean {
    return this.settings.nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.settings.nodeEnv === 'development';
  }

  public getFeatureFlag(feature: keyof AppSettings['features']): boolean {
    return this.settings.features[feature];
  }

  public getRateLimit(type: keyof AppSettings['rateLimits']) {
    return this.settings.rateLimits[type];
  }

  public getSecuritySetting(setting: keyof AppSettings['security']) {
    return this.settings.security[setting];
  }

  public getServiceUrl(service: 'ai' | 'mongodb' | 'redis'): string {
    switch (service) {
      case 'ai':
        return this.settings.aiEngineUrl;
      case 'mongodb':
        return this.settings.mongodbUri;
      case 'redis':
        return this.settings.redisUrl;
      default:
        throw new Error(`Unknown service: ${service}`);
    }
  }

  public getPaymentConfig(provider: 'stripe' | 'esewa' | 'khalti' | 'paypal') {
    switch (provider) {
      case 'stripe':
        return { secretKey: this.settings.stripeSecretKey };
      case 'esewa':
        return { merchantId: this.settings.esewaMerchantId, secret: this.settings.esewaSecret };
      case 'khalti':
        return { publicKey: this.settings.khaltiPublicKey, secretKey: this.settings.khaltiSecretKey };
      case 'paypal':
        return { 
          clientId: this.settings.paypalClientId, 
          clientSecret: this.settings.paypalClientSecret,
          environment: this.settings.paypalEnvironment 
        };
      default:
        throw new Error(`Unknown payment provider: ${provider}`);
    }
  }

  public getCommunicationConfig(provider: 'sendgrid' | 'twilio') {
    switch (provider) {
      case 'sendgrid':
        return { apiKey: this.settings.sendgridApiKey };
      case 'twilio':
        return { 
          accountSid: this.settings.twilioAccountSid,
          authToken: this.settings.twilioAuthToken,
          phoneNumber: this.settings.twilioPhoneNumber
        };
      default:
        throw new Error(`Unknown communication provider: ${provider}`);
    }
  }
}

// Create singleton instance
export const settings = new SettingsManager();

// Export settings for easy access
export const appSettings = settings.getSettings();
export const isProduction = settings.isProduction();
export const isDevelopment = settings.isDevelopment();
