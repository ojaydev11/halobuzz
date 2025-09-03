import { validateSecrets } from '../../config/secrets';

describe('Secrets Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Required Secrets', () => {
    it('should validate all required secrets are present', () => {
      // Set all required secrets
      process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum';
      process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef_fake_testing_key';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_1234567890abcdef_fake_webhook_key';
      process.env.AWS_ACCESS_KEY_ID = 'AKIA1234567890123456';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key-32-chars-minimum';
      process.env.AI_SERVICE_SECRET = 'test-ai-service-secret-32-chars-minimum';
      process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-32-chars-minimum';

      expect(() => validateSecrets()).not.toThrow();
    });

    it('should throw error for missing required secrets in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      expect(() => validateSecrets()).toThrow('Missing required secrets in production');
    });

    it('should warn for missing secrets in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => validateSecrets()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Secret Strength Validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      // Set all required secrets with valid values
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum';
      process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef_fake_testing_key';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_1234567890abcdef_fake_webhook_key';
      process.env.AWS_ACCESS_KEY_ID = 'AKIA1234567890123456';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key-32-chars-minimum';
      process.env.AI_SERVICE_SECRET = 'test-ai-service-secret-32-chars-minimum';
      process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-32-chars-minimum';
    });

    it('should reject weak secrets (too short)', () => {
      process.env.JWT_SECRET = 'short';

      expect(() => validateSecrets()).toThrow('Weak secrets detected in production');
    });

    it('should reject default/test secrets', () => {
      process.env.JWT_SECRET = 'your-secret-key';

      expect(() => validateSecrets()).toThrow('Weak secrets detected in production');
    });

    it('should reject secrets containing "test" in production', () => {
      process.env.JWT_SECRET = 'test-secret-key-32-chars-minimum';

      expect(() => validateSecrets()).toThrow('Weak secrets detected in production');
    });

    it('should accept strong secrets', () => {
      process.env.JWT_SECRET = 'strong-secret-key-32-chars-minimum-12345';

      expect(() => validateSecrets()).not.toThrow();
    });
  });

  describe('Optional Secrets', () => {
    beforeEach(() => {
      // Set all required secrets
      process.env.JWT_SECRET = 'test-jwt-secret-32-chars-minimum';
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum';
      process.env.DATABASE_URL = 'mongodb://localhost:27017/test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef_fake_testing_key';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_1234567890abcdef_fake_webhook_key';
      process.env.AWS_ACCESS_KEY_ID = 'AKIA1234567890123456';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-access-key-32-chars-minimum';
      process.env.AI_SERVICE_SECRET = 'test-ai-service-secret-32-chars-minimum';
      process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-32-chars-minimum';
    });

    it('should not require optional secrets', () => {
      expect(() => validateSecrets()).not.toThrow();
    });

    it('should log optional secrets status', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      validateSecrets();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Optional secrets status:',
        expect.arrayContaining([
          expect.objectContaining({ secret: 'PAYPAL_CLIENT_ID', configured: false }),
          expect.objectContaining({ secret: 'TWILIO_ACCOUNT_SID', configured: false })
        ])
      );
      
      consoleSpy.mockRestore();
    });
  });
});
