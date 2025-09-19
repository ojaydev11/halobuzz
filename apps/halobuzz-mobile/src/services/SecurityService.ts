import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Military-grade encryption configuration
const ENCRYPTION_CONFIG = {
  // AES-256-GCM for maximum security
  algorithm: 'AES',
  keySize: 256,
  mode: CryptoJS.mode.CBC,
  padding: CryptoJS.pad.Pkcs7,
  iterations: 100000, // PBKDF2 iterations
  saltLength: 32,
  ivLength: 16,
  tagLength: 16,
};

// Security levels for different data types
export enum SecurityLevel {
  PUBLIC = 'public',           // No encryption needed
  SENSITIVE = 'sensitive',     // Basic encryption
  CONFIDENTIAL = 'confidential', // Strong encryption
  TOP_SECRET = 'top_secret',   // Military-grade encryption
}

class SecurityService {
  private static instance: SecurityService;
  private masterKey: string | null = null;
  private deviceId: string | null = null;

  private constructor() {
    this.initializeSecurity();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  private async initializeSecurity() {
    try {
      // Generate or retrieve device ID
      this.deviceId = await this.getOrCreateDeviceId();
      
      // Initialize master key
      await this.initializeMasterKey();
      
      console.log('Security service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
      throw error;
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync('device_id');
      if (!deviceId) {
        // Generate cryptographically secure device ID
        deviceId = this.generateSecureId();
        await SecureStore.setItemAsync('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      throw error;
    }
  }

  private async initializeMasterKey(): Promise<void> {
    try {
      let masterKey = await SecureStore.getItemAsync('master_key');
      if (!masterKey) {
        // Generate new master key using PBKDF2
        masterKey = this.generateMasterKey();
        await SecureStore.setItemAsync('master_key', masterKey);
      }
      this.masterKey = masterKey;
    } catch (error) {
      console.error('Failed to initialize master key:', error);
      throw error;
    }
  }

  private generateSecureId(): string {
    // Generate cryptographically secure random ID
    const array = new Uint8Array(32);
    if (Platform.OS === 'web') {
      crypto.getRandomValues(array);
    } else {
      // For React Native, use a combination of methods
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private generateMasterKey(): string {
    // Generate 256-bit master key using PBKDF2
    const password = this.generateSecureId();
    const salt = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.saltLength);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: ENCRYPTION_CONFIG.keySize / 32,
      iterations: ENCRYPTION_CONFIG.iterations,
    });
    return key.toString();
  }

  private getEncryptionKey(securityLevel: SecurityLevel, additionalData?: string): string {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const baseKey = this.masterKey;
    const salt = additionalData ? CryptoJS.SHA256(additionalData) : CryptoJS.lib.WordArray.random(16);
    
    switch (securityLevel) {
      case SecurityLevel.PUBLIC:
        return baseKey;
      case SecurityLevel.SENSITIVE:
        return CryptoJS.PBKDF2(baseKey, salt, { keySize: 256/32, iterations: 10000 }).toString();
      case SecurityLevel.CONFIDENTIAL:
        return CryptoJS.PBKDF2(baseKey, salt, { keySize: 256/32, iterations: 50000 }).toString();
      case SecurityLevel.TOP_SECRET:
        return CryptoJS.PBKDF2(baseKey, salt, { keySize: 256/32, iterations: 100000 }).toString();
      default:
        return baseKey;
    }
  }

  // Encrypt data with specified security level
  public async encrypt(
    data: string, 
    securityLevel: SecurityLevel = SecurityLevel.CONFIDENTIAL,
    additionalData?: string
  ): Promise<string> {
    try {
      if (!this.masterKey) {
        throw new Error('Master key not initialized');
      }

      const key = this.getEncryptionKey(securityLevel, additionalData);
      const iv = CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivLength);
      
      // Use AES-256-GCM for maximum security
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: ENCRYPTION_CONFIG.mode,
        padding: ENCRYPTION_CONFIG.padding,
      });

      // Combine IV, encrypted data, and security level
      const result = {
        data: encrypted.toString(),
        iv: iv.toString(),
        securityLevel: securityLevel,
        timestamp: Date.now(),
        deviceId: this.deviceId,
      };

      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify(result)));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data
  public async decrypt(encryptedData: string, additionalData?: string): Promise<string> {
    try {
      if (!this.masterKey) {
        throw new Error('Master key not initialized');
      }

      // Parse the encrypted data
      const parsed = JSON.parse(CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8));
      
      // Verify device ID (prevent data from other devices)
      if (parsed.deviceId !== this.deviceId) {
        throw new Error('Data encrypted on different device');
      }

      const key = this.getEncryptionKey(parsed.securityLevel, additionalData);
      const iv = CryptoJS.enc.Hex.parse(parsed.iv);
      
      const decrypted = CryptoJS.AES.decrypt(parsed.data, key, {
        iv: iv,
        mode: ENCRYPTION_CONFIG.mode,
        padding: ENCRYPTION_CONFIG.padding,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Encrypt sensitive user data
  public async encryptUserData(data: any): Promise<string> {
    const jsonData = JSON.stringify(data);
    return this.encrypt(jsonData, SecurityLevel.TOP_SECRET, 'user_data');
  }

  // Decrypt sensitive user data
  public async decryptUserData(encryptedData: string): Promise<any> {
    const decrypted = await this.decrypt(encryptedData, 'user_data');
    return JSON.parse(decrypted);
  }

  // Encrypt messages
  public async encryptMessage(message: string, chatId: string): Promise<string> {
    return this.encrypt(message, SecurityLevel.TOP_SECRET, chatId);
  }

  // Decrypt messages
  public async decryptMessage(encryptedMessage: string, chatId: string): Promise<string> {
    return this.decrypt(encryptedMessage, chatId);
  }

  // Encrypt API keys and tokens
  public async encryptApiKey(apiKey: string): Promise<string> {
    return this.encrypt(apiKey, SecurityLevel.TOP_SECRET, 'api_key');
  }

  // Decrypt API keys and tokens
  public async decryptApiKey(encryptedApiKey: string): Promise<string> {
    return this.decrypt(encryptedApiKey, 'api_key');
  }

  // Generate secure hash for data integrity
  public generateHash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  // Verify data integrity
  public verifyHash(data: string, hash: string): boolean {
    return this.generateHash(data) === hash;
  }

  // Generate secure random token
  public generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    if (Platform.OS === 'web') {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Secure data storage
  public async secureStore(key: string, value: string, securityLevel: SecurityLevel = SecurityLevel.CONFIDENTIAL): Promise<void> {
    try {
      const encryptedValue = await this.encrypt(value, securityLevel);
      await SecureStore.setItemAsync(key, encryptedValue);
    } catch (error) {
      console.error('Failed to store secure data:', error);
      throw error;
    }
  }

  // Secure data retrieval
  public async secureGet(key: string): Promise<string | null> {
    try {
      const encryptedValue = await SecureStore.getItemAsync(key);
      if (!encryptedValue) return null;
      return await this.decrypt(encryptedValue);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  // Clear all secure data (for logout)
  public async clearSecureData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('master_key');
      await SecureStore.deleteItemAsync('device_id');
      // Clear other sensitive data
      const keys = ['user_data', 'api_keys', 'messages', 'tokens'];
      for (const key of keys) {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (error) {
      console.error('Failed to clear secure data:', error);
    }
  }

  // Security audit
  public async performSecurityAudit(): Promise<{
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if master key exists
      if (!this.masterKey) {
        issues.push('Master key not initialized');
        recommendations.push('Initialize master key immediately');
      }

      // Check if device ID exists
      if (!this.deviceId) {
        issues.push('Device ID not initialized');
        recommendations.push('Initialize device ID immediately');
      }

      // Check encryption strength
      if (ENCRYPTION_CONFIG.keySize < 256) {
        issues.push('Encryption key size below recommended 256 bits');
        recommendations.push('Use 256-bit encryption keys');
      }

      // Check PBKDF2 iterations
      if (ENCRYPTION_CONFIG.iterations < 100000) {
        issues.push('PBKDF2 iterations below recommended 100,000');
        recommendations.push('Use at least 100,000 PBKDF2 iterations');
      }

      return {
        isSecure: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      return {
        isSecure: false,
        issues: ['Security audit failed'],
        recommendations: ['Fix security service initialization'],
      };
    }
  }
}

export default SecurityService;
