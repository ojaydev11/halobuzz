/**
 * Security Utilities Tests
 * Tests PII redaction, secure storage, and other security utilities
 */

import {
  redactSensitiveData,
  SecureStorageManager,
  SecureLogger,
  InputSanitizer,
  NetworkSecurity
} from '../lib/security';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' }
}));

describe('Security Utilities', () => {
  describe('PII Redaction', () => {
    it('should redact email addresses', () => {
      const input = 'User email is test@example.com and backup is user123@gmail.com';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('User email is [REDACTED] and backup is [REDACTED]');
    });

    it('should redact phone numbers', () => {
      const input = 'Contact me at +1-555-123-4567 or (555) 987-6543';
      const result = redactSensitiveData(input);
      
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('555-123-4567');
    });

    it('should redact long tokens', () => {
      const input = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = redactSensitiveData(input);
      
      expect(result).toBe('Token: [REDACTED]');
    });

    it('should redact sensitive object keys', () => {
      const input = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'secretpassword',
        token: 'abc123',
        publicInfo: 'this should remain'
      };
      
      const result = redactSensitiveData(input);
      
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDRACTED]');
      expect(result.publicInfo).toBe('this should remain');
    });

    it('should handle Error objects safely', () => {
      const error = new Error('Database connection failed for user test@example.com');
      const result = redactSensitiveData(error);
      
      expect(result.name).toBe('Error');
      expect(result.message).toContain('[REDACTED]');
      expect(result.message).not.toContain('test@example.com');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          profile: {
            email: 'nested@example.com',
            phone: '555-1234'
          },
          credentials: {
            password: 'secret123'
          }
        },
        logs: ['User logged in with token abc123def456']
      };
      
      const result = redactSensitiveData(input);
      
      expect(result.user.profile.email).toBe('[REDACTED]');
      expect(result.user.credentials.password).toBe('[REDACTED]');
      expect(result.logs[0]).toContain('[REDACTED]');
    });
  });

  describe('SecureStorageManager', () => {
    let secureStorage: SecureStorageManager;

    beforeEach(() => {
      secureStorage = new SecureStorageManager();
      jest.clearAllMocks();
    });

    it('should store and retrieve auth tokens', async () => {
      const mockToken = 'test-auth-token';
      
      // Mock successful storage
      jest.spyOn(secureStorage, 'setItem').mockResolvedValue();
      jest.spyOn(secureStorage, 'getItem').mockResolvedValue(mockToken);

      await secureStorage.setAuthToken(mockToken);
      const retrievedToken = await secureStorage.getAuthToken();

      expect(secureStorage.setItem).toHaveBeenCalledWith(
        'halobuzz_auth_token',
        mockToken,
        expect.objectContaining({
          requireAuthentication: true,
          keychainService: 'halobuzz-auth'
        })
      );
      expect(retrievedToken).toBe(mockToken);
    });

    it('should handle storage errors gracefully', async () => {
      const storageError = new Error('Keychain access denied');
      jest.spyOn(secureStorage, 'setItem').mockRejectedValue(storageError);

      await expect(secureStorage.setAuthToken('test-token'))
        .rejects.toThrow('Keychain access denied');
    });

    it('should clear all auth tokens', async () => {
      jest.spyOn(secureStorage, 'removeItem').mockResolvedValue();

      await secureStorage.clearAuthTokens();

      expect(secureStorage.removeItem).toHaveBeenCalledWith('halobuzz_auth_token');
      expect(secureStorage.removeItem).toHaveBeenCalledWith('halobuzz_refresh_token');
    });
  });

  describe('SecureLogger', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should redact sensitive data in logs', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com'
      };

      SecureLogger.log('User data', sensitiveData);

      expect(console.log).toHaveBeenCalledWith(
        'User data',
        expect.objectContaining({
          username: 'testuser',
          password: '[REDACTED]',
          email: '[REDACTED]'
        })
      );
    });

    it('should only log debug in development', () => {
      // Mock __DEV__ as false
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;

      SecureLogger.debug('Debug message', { data: 'test' });

      expect(console.log).not.toHaveBeenCalled();

      // Restore __DEV__
      (global as any).__DEV__ = originalDev;
    });
  });

  describe('InputSanitizer', () => {
    it('should remove script tags from input', () => {
      const maliciousInput = 'Hello <script>alert("XSS")</script> World';
      const sanitized = InputSanitizer.sanitizeString(maliciousInput);
      
      expect(sanitized).toBe('Hello  World');
      expect(sanitized).not.toContain('<script>');
    });

    it('should validate email addresses', () => {
      expect(InputSanitizer.validateEmail('test@example.com')).toBe(true);
      expect(InputSanitizer.validateEmail('invalid-email')).toBe(false);
      expect(InputSanitizer.validateEmail('test@')).toBe(false);
      expect(InputSanitizer.validateEmail('@example.com')).toBe(false);
    });

    it('should validate phone numbers', () => {
      expect(InputSanitizer.validatePhoneNumber('+15551234567')).toBe(true);
      expect(InputSanitizer.validatePhoneNumber('(555) 123-4567')).toBe(true);
      expect(InputSanitizer.validatePhoneNumber('555-123-4567')).toBe(true);
      expect(InputSanitizer.validatePhoneNumber('invalid-phone')).toBe(false);
      expect(InputSanitizer.validatePhoneNumber('123')).toBe(false);
    });

    it('should sanitize usernames', () => {
      expect(InputSanitizer.sanitizeUsername('Test@User#123')).toBe('testuser123');
      expect(InputSanitizer.sanitizeUsername('user_name-123')).toBe('user_name-123');
      expect(InputSanitizer.sanitizeUsername('UPPERCASE')).toBe('uppercase');
    });
  });

  describe('NetworkSecurity', () => {
    it('should validate HTTPS URLs in production', () => {
      // Mock production environment
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;

      expect(NetworkSecurity.validateUrl('https://api.example.com')).toBe(true);
      expect(NetworkSecurity.validateUrl('http://api.example.com')).toBe(false);

      // Restore __DEV__
      (global as any).__DEV__ = originalDev;
    });

    it('should allow HTTP in development', () => {
      // Mock development environment
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      expect(NetworkSecurity.validateUrl('http://localhost:3000')).toBe(true);
      expect(NetworkSecurity.validateUrl('https://api.example.com')).toBe(true);

      // Restore __DEV__
      (global as any).__DEV__ = originalDev;
    });

    it('should block suspicious domains in production', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;

      expect(NetworkSecurity.validateUrl('https://localhost:3000')).toBe(false);
      expect(NetworkSecurity.validateUrl('https://127.0.0.1:8080')).toBe(false);
      expect(NetworkSecurity.validateUrl('https://api.example.com')).toBe(true);

      (global as any).__DEV__ = originalDev;
    });

    it('should sanitize dangerous headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
        'X-Custom-Header': 'safe-value',
        'Cookie': 'session=abc123',
        'User-Agent': 'MyApp/1.0'
      };

      const sanitized = NetworkSecurity.sanitizeHeaders(headers);

      expect(sanitized['Content-Type']).toBe('application/json');
      expect(sanitized['X-Custom-Header']).toBe('safe-value');
      expect(sanitized['User-Agent']).toBe('MyApp/1.0');
      expect(sanitized['Authorization']).toBeUndefined();
      expect(sanitized['Cookie']).toBeUndefined();
    });
  });
});