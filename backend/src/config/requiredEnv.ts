/**
 * Production Environment Validation
 * Validates critical secrets and configuration on boot
 * Fails fast if production environment is misconfigured
 */

import crypto from 'crypto';

interface EnvValidationRule {
  key: string;
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
  errorMessage?: string;
}

const ENV_RULES: EnvValidationRule[] = [
  {
    key: 'JWT_SECRET',
    required: true,
    minLength: 64,
    errorMessage: 'JWT_SECRET must be at least 64 characters long for security'
  },
  {
    key: 'JWT_REFRESH_SECRET',
    required: true,
    minLength: 64,
    errorMessage: 'JWT_REFRESH_SECRET must be at least 64 characters long for security'
  },
  {
    key: 'ENCRYPTION_KEY',
    required: true,
    customValidator: (value: string) => {
      // Must be 32 bytes (64 hex chars or 44 base64 chars)
      const hexPattern = /^[a-fA-F0-9]{64}$/;
      const base64Pattern = /^[A-Za-z0-9+/]{44}=?$/;
      return hexPattern.test(value) || base64Pattern.test(value);
    },
    errorMessage: 'ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44 base64 chars)'
  },
  {
    key: 'MONGODB_URI',
    required: true,
    pattern: /^mongodb(\+srv)?:\/\//,
    errorMessage: 'MONGODB_URI must be a valid MongoDB connection string'
  },
  {
    key: 'REDIS_URL',
    required: true,
    pattern: /^redis(s)?:\/\//,
    errorMessage: 'REDIS_URL must be a valid Redis connection string'
  },
  {
    key: 'CORS_ORIGIN',
    required: true,
    customValidator: (value: string) => {
      // Must not contain wildcards or localhost in production
      if (process.env.NODE_ENV === 'production') {
        return !value.includes('*') && !value.includes('localhost');
      }
      return true;
    },
    errorMessage: 'CORS_ORIGIN cannot contain wildcards or localhost in production'
  },
  {
    key: 'STRIPE_SECRET_KEY',
    required: true,
    pattern: /^sk_(test_|live_)/,
    errorMessage: 'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_'
  },
  {
    key: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    pattern: /^whsec_/,
    errorMessage: 'STRIPE_WEBHOOK_SECRET must start with whsec_'
  }
];

/**
 * Validates environment variables against security requirements
 * Throws error if validation fails in production
 */
export function validateRequiredEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log(`🔍 Validating environment configuration (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode)...`);

  for (const rule of ENV_RULES) {
    const value = process.env[rule.key];
    
    if (rule.required && !value) {
      const error = `❌ Missing required environment variable: ${rule.key}`;
      errors.push(error);
      continue;
    }

    if (!value) continue; // Skip validation for optional vars

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      const error = `❌ ${rule.key}: ${rule.errorMessage || `Must be at least ${rule.minLength} characters`}`;
      errors.push(error);
      continue;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      const error = `❌ ${rule.key}: ${rule.errorMessage || 'Invalid format'}`;
      errors.push(error);
      continue;
    }

    // Custom validation
    if (rule.customValidator && !rule.customValidator(value)) {
      const error = `❌ ${rule.key}: ${rule.errorMessage || 'Custom validation failed'}`;
      errors.push(error);
      continue;
    }

    // Security warnings for weak values in production
    if (isProduction) {
      if (rule.key.includes('SECRET') && value.length < 32) {
        warnings.push(`⚠️  ${rule.key}: Consider using a longer secret (current: ${value.length} chars)`);
      }
      
      if (rule.key === 'JWT_SECRET' && value === 'change_me') {
        errors.push(`❌ ${rule.key}: Cannot use default value in production`);
      }
    }

    console.log(`✅ ${rule.key}: Valid`);
  }

  // Additional production-specific validations
  if (isProduction) {
    // Check for development defaults
    const devDefaults = [
      { key: 'JWT_SECRET', badValues: ['change_me', 'your-super-secure-jwt-secret', 'secret'] },
      { key: 'JWT_REFRESH_SECRET', badValues: ['change_me', 'your-super-secure-refresh-secret', 'secret'] },
      { key: 'AI_ENGINE_SECRET', badValues: ['change_me_too', 'secret'] }
    ];

    for (const check of devDefaults) {
      const value = process.env[check.key];
      if (value && check.badValues.includes(value)) {
        errors.push(`❌ ${check.key}: Cannot use development default value in production`);
      }
    }

    // Validate CORS origins are HTTPS in production
    const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [];
    for (const origin of corsOrigins) {
      if (origin.trim() && !origin.startsWith('https://')) {
        errors.push(`❌ CORS_ORIGIN: All origins must use HTTPS in production (found: ${origin})`);
      }
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Security Warnings:');
    warnings.forEach(warning => console.warn(warning));
  }

  // Handle errors
  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Failed:');
    errors.forEach(error => console.error(error));
    
    if (isProduction) {
      console.error('\n🚨 PRODUCTION DEPLOYMENT BLOCKED');
      console.error('Fix the above issues before deploying to production.');
      process.exit(1);
    } else {
      console.error('\n⚠️  Development mode: Continuing with warnings');
    }
  } else {
    console.log('\n✅ Environment validation passed');
  }

  // Log security status
  console.log(`\n🔒 Security Status:`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   HTTPS Required: ${isProduction ? 'YES' : 'NO'}`);
  console.log(`   CORS Origins: ${process.env.CORS_ORIGIN?.split(',').length || 0} configured`);
  console.log(`   JWT Secrets: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Encryption Key: ${process.env.ENCRYPTION_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Database: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Redis: ${process.env.REDIS_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '❌ Missing'}`);
}

/**
 * Generates secure random secrets for development
 */
export function generateSecureSecrets(): void {
  console.log('\n🔐 Generating secure secrets for development...');
  
  const secrets = {
    JWT_SECRET: crypto.randomBytes(64).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(64).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
    AI_ENGINE_SECRET: crypto.randomBytes(32).toString('hex')
  };

  console.log('\n📋 Add these to your .env file:');
  Object.entries(secrets).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
  
  console.log('\n⚠️  Keep these secrets secure and never commit them to version control!');
}

/**
 * Validates webhook signatures are properly configured
 */
export function validateWebhookConfiguration(): void {
  const webhookSecrets = [
    'STRIPE_WEBHOOK_SECRET',
    'PAYPAL_WEBHOOK_SECRET',
    'ESEWA_WEBHOOK_SECRET',
    'KHALTI_WEBHOOK_SECRET'
  ];

  const configuredWebhooks = webhookSecrets.filter(secret => process.env[secret]);
  
  console.log(`🔗 Webhook Configuration: ${configuredWebhooks.length}/${webhookSecrets.length} configured`);
  
  if (configuredWebhooks.length === 0) {
    console.warn('⚠️  No webhook secrets configured - payment verification may be disabled');
  }
}

// Auto-run validation on import in production
if (process.env.NODE_ENV === 'production') {
  validateRequiredEnv();
}
