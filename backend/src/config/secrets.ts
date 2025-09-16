import { setupLogger } from './logger';

const logger = setupLogger();

interface SecretsConfig {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET?: string;
  MONGODB_URI: string;
  REDIS_URL: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AI_ENGINE_SECRET?: string;
  ADMIN_JWT_SECRET?: string;
}

const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'MONGODB_URI',
  'REDIS_URL'
];

const OPTIONAL_SECRETS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AI_ENGINE_SECRET',
  'ADMIN_JWT_SECRET',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'FIREBASE_ADMIN_SDK'
];

export function validateSecrets(): SecretsConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing: string[] = [];
  const weak: string[] = [];

  for (const secret of REQUIRED_SECRETS) {
    const value = process.env[secret];
    
    if (!value) {
      missing.push(secret);
      continue;
    }

    // Check for weak secrets in production
    if (isProduction) {
      if (secret.includes('SECRET') || secret.includes('KEY')) {
        if (value.length < 64) {
          weak.push(`${secret} (length: ${value.length}, minimum: 64)`);
        }
        if (value === 'your-secret-key' || value === 'changeme' || value === 'change_me' || value.includes('test') || value.includes('your-super-secure')) {
          weak.push(`${secret} (appears to be a default/test value)`);
        }
      }
    }
  }

  if (missing.length > 0) {
    logger.error('Missing required secrets:', missing);
    if (isProduction) {
      throw new Error(`Missing required secrets in production: ${missing.join(', ')}`);
    } else {
      logger.warn('Missing secrets in development mode - using defaults where possible');
    }
  }

  if (weak.length > 0 && isProduction) {
    logger.error('Weak secrets detected in production:', weak);
    throw new Error(`Weak secrets detected in production: ${weak.join(', ')}`);
  }

  // Log optional secrets status
  const optionalStatus = OPTIONAL_SECRETS.map(secret => ({
    secret,
    configured: !!process.env[secret]
  }));
  
  logger.info('Optional secrets status:', optionalStatus);

  return {
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    MONGODB_URI: process.env.MONGODB_URI!,
    REDIS_URL: process.env.REDIS_URL!,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AI_ENGINE_SECRET: process.env.AI_ENGINE_SECRET,
    ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET
  };
}

// Validate secrets on module load
export const secrets = validateSecrets();
