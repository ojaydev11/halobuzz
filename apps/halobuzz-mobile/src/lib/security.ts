import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Secure storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'halobuzz_auth_token',
  REFRESH_TOKEN: 'halobuzz_refresh_token',
  USER_CREDENTIALS: 'halobuzz_user_creds',
} as const;

// PII patterns for redaction
const PII_PATTERNS = [
  // Email patterns
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone patterns
  /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  // Credit card patterns
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  // Token-like patterns (long alphanumeric strings)
  /\b[A-Za-z0-9]{32,}\b/g,
];

const SENSITIVE_KEYS = [
  'password', 'token', 'auth', 'credential', 'secret', 'key', 'authorization',
  'email', 'phone', 'ssn', 'credit', 'card', 'cvv', 'pin'
];

/**
 * Redacts sensitive data from objects, strings, or errors for safe logging
 */
export function redactSensitiveData(data: any): any {
  if (typeof data === 'string') {
    let redacted = data;
    PII_PATTERNS.forEach(pattern => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  }
  
  if (data && typeof data === 'object') {
    if (data instanceof Error) {
      return {
        name: data.name,
        message: redactSensitiveData(data.message),
        stack: __DEV__ ? redactSensitiveData(data.stack) : '[REDACTED]'
      };
    }
    
    const redacted: any = Array.isArray(data) ? [] : {};
    
    for (const key in data) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey)
      );
      
      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSensitiveData(data[key]);
      }
    }
    
    return redacted;
  }
  
  return data;
}

/**
 * Secure storage manager with fallbacks
 */
export class SecureStorageManager {
  private isSecureStoreAvailable: boolean;
  
  constructor() {
    // Check if SecureStore is available (not in Expo web)
    this.isSecureStoreAvailable = Platform.OS !== 'web' && SecureStore.isAvailableAsync();
  }
  
  async setItem(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
    try {
      if (this.isSecureStoreAvailable) {
        await SecureStore.setItemAsync(key, value, options);
      } else {
        // Fallback to AsyncStorage with warning
        if (__DEV__) {
          console.warn(`🔓 SecureStore not available, using AsyncStorage for ${key}`);
        }
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Failed to store item securely:', redactSensitiveData(error));
      throw error;
    }
  }
  
  async getItem(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null> {
    try {
      if (this.isSecureStoreAvailable) {
        return await SecureStore.getItemAsync(key, options);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Failed to retrieve item securely:', redactSensitiveData(error));
      return null;
    }
  }
  
  async removeItem(key: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
    try {
      if (this.isSecureStoreAvailable) {
        await SecureStore.deleteItemAsync(key, options);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to remove item securely:', redactSensitiveData(error));
      throw error;
    }
  }
  
  // Auth-specific methods
  async setAuthToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token, {
      requireAuthentication: true,
      keychainService: 'halobuzz-auth',
    });
  }
  
  async getAuthToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.AUTH_TOKEN, {
      requireAuthentication: true,
      keychainService: 'halobuzz-auth',
    });
  }
  
  async setRefreshToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token, {
      requireAuthentication: true,
      keychainService: 'halobuzz-auth',
    });
  }
  
  async getRefreshToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.REFRESH_TOKEN, {
      requireAuthentication: true,
      keychainService: 'halobuzz-auth',
    });
  }
  
  async clearAuthTokens(): Promise<void> {
    await Promise.all([
      this.removeItem(STORAGE_KEYS.AUTH_TOKEN),
      this.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      // Also clear from AsyncStorage fallback
      AsyncStorage.multiRemove(['auth_token', 'refresh_token'])
    ]);
  }
}

/**
 * Production-safe logger that automatically redacts sensitive data
 */
export class SecureLogger {
  static log(message: string, data?: any): void {
    if (__DEV__) {
      console.log(message, data ? redactSensitiveData(data) : '');
    }
  }
  
  static warn(message: string, data?: any): void {
    if (__DEV__) {
      console.warn(message, data ? redactSensitiveData(data) : '');
    } else {
      // In production, only log warnings without data
      console.warn(message);
    }
  }
  
  static error(message: string, error?: any): void {
    if (__DEV__) {
      console.error(message, error ? redactSensitiveData(error) : '');
    } else {
      // In production, log errors but redact sensitive data
      console.error(message, error ? redactSensitiveData(error) : '');
    }
  }
  
  static debug(message: string, data?: any): void {
    if (__DEV__) {
      console.log(`🐛 ${message}`, data ? redactSensitiveData(data) : '');
    }
    // Never log debug in production
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  static sanitizeString(input: string): string {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  static validatePhoneNumber(phone: string): boolean {
    // Basic phone validation - adjust based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[-\s\(\)]/g, ''));
  }
  
  static sanitizeUsername(username: string): string {
    // Remove special characters except underscore and hyphen
    return username.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  }
}

/**
 * Screen capture protection (where supported)
 */
export class ScreenProtection {
  static async enableScreenshotProtection(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // Note: This requires custom native module or react-native-screen-capture-secure
        // For now, just log the intent
        if (__DEV__) {
          console.log('📱 Screenshot protection would be enabled on Android');
        }
      } else if (Platform.OS === 'ios') {
        // iOS screenshot protection requires custom implementation
        if (__DEV__) {
          console.log('📱 Screenshot protection would be enabled on iOS');
        }
      }
    } catch (error) {
      SecureLogger.warn('Could not enable screenshot protection', error);
    }
  }
  
  static async disableScreenshotProtection(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('📱 Screenshot protection disabled');
      }
    } catch (error) {
      SecureLogger.warn('Could not disable screenshot protection', error);
    }
  }
}

/**
 * Network security utilities
 */
export class NetworkSecurity {
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // Only allow HTTPS in production
      if (!__DEV__ && urlObj.protocol !== 'https:') {
        return false;
      }
      // Block suspicious domains
      const blockedDomains = ['localhost', '127.0.0.1', '10.0.0.1'];
      if (!__DEV__ && blockedDomains.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  
  static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      // Remove potentially dangerous headers
      if (!['authorization', 'cookie', 'set-cookie'].includes(key.toLowerCase())) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// Export singleton instances
export const secureStorage = new SecureStorageManager();
export const secureLogger = SecureLogger;
export const inputSanitizer = InputSanitizer;
export const screenProtection = ScreenProtection;
export const networkSecurity = NetworkSecurity;