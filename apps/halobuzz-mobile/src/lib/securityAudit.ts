import { Platform } from 'react-native';
import { SecureStorageManager } from './security';

export interface SecurityAuditResult {
  score: number;
  issues: SecurityIssue[];
  recommendations: string[];
  passed: boolean;
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  recommendation: string;
}

export class SecurityAuditor {
  private secureStorage: SecureStorageManager;

  constructor() {
    this.secureStorage = new SecureStorageManager();
  }

  async performAudit(): Promise<SecurityAuditResult> {
    const issues: SecurityIssue[] = [];
    let score = 100;

    // Check secure storage availability
    const storageIssue = await this.checkSecureStorage();
    if (storageIssue) {
      issues.push(storageIssue);
      score -= storageIssue.severity === 'critical' ? 30 : 
               storageIssue.severity === 'high' ? 20 : 
               storageIssue.severity === 'medium' ? 10 : 5;
    }

    // Check token storage
    const tokenIssue = await this.checkTokenStorage();
    if (tokenIssue) {
      issues.push(tokenIssue);
      score -= tokenIssue.severity === 'critical' ? 25 : 
               tokenIssue.severity === 'high' ? 15 : 
               tokenIssue.severity === 'medium' ? 10 : 5;
    }

    // Check network security
    const networkIssue = this.checkNetworkSecurity();
    if (networkIssue) {
      issues.push(networkIssue);
      score -= networkIssue.severity === 'critical' ? 20 : 
               networkIssue.severity === 'high' ? 15 : 
               networkIssue.severity === 'medium' ? 10 : 5;
    }

    // Check data validation
    const validationIssue = this.checkDataValidation();
    if (validationIssue) {
      issues.push(validationIssue);
      score -= validationIssue.severity === 'critical' ? 15 : 
               validationIssue.severity === 'high' ? 10 : 
               validationIssue.severity === 'medium' ? 5 : 2;
    }

    // Check permissions
    const permissionIssue = this.checkPermissions();
    if (permissionIssue) {
      issues.push(permissionIssue);
      score -= permissionIssue.severity === 'critical' ? 10 : 
               permissionIssue.severity === 'high' ? 8 : 
               permissionIssue.severity === 'medium' ? 5 : 2;
    }

    const recommendations = this.generateRecommendations(issues);
    const passed = score >= 80 && issues.filter(i => i.severity === 'critical').length === 0;

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
      passed,
    };
  }

  private async checkSecureStorage(): Promise<SecurityIssue | null> {
    try {
      const isAvailable = await this.secureStorage.isSecureStoreAvailable();
      if (!isAvailable) {
        return {
          severity: 'high',
          category: 'Storage',
          description: 'Secure storage is not available on this device',
          recommendation: 'Implement fallback encryption for sensitive data',
        };
      }
    } catch (error) {
      return {
        severity: 'critical',
        category: 'Storage',
        description: 'Failed to check secure storage availability',
        recommendation: 'Fix secure storage implementation',
      };
    }
    return null;
  }

  private async checkTokenStorage(): Promise<SecurityIssue | null> {
    try {
      const token = await this.secureStorage.getAuthToken();
      if (token && token.length < 32) {
        return {
          severity: 'medium',
          category: 'Authentication',
          description: 'Auth token appears to be too short',
          recommendation: 'Ensure tokens are properly generated and stored',
        };
      }
    } catch (error) {
      return {
        severity: 'high',
        category: 'Authentication',
        description: 'Failed to retrieve auth token',
        recommendation: 'Fix token storage and retrieval',
      };
    }
    return null;
  }

  private checkNetworkSecurity(): SecurityIssue | null {
    // Check if HTTPS is enforced
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
    if (apiBaseUrl && !apiBaseUrl.startsWith('https://')) {
      return {
        severity: 'critical',
        category: 'Network',
        description: 'API endpoint is not using HTTPS',
        recommendation: 'Use HTTPS for all API communications',
      };
    }

    // Check for hardcoded secrets
    const hasHardcodedSecrets = this.checkForHardcodedSecrets();
    if (hasHardcodedSecrets) {
      return {
        severity: 'high',
        category: 'Secrets',
        description: 'Potential hardcoded secrets detected',
        recommendation: 'Move all secrets to environment variables',
      };
    }

    return null;
  }

  private checkForHardcodedSecrets(): boolean {
    // This would need to be implemented with file scanning
    // For now, return false
    return false;
  }

  private checkDataValidation(): SecurityIssue | null {
    // Check if input validation is implemented
    // This would need to be implemented with code analysis
    return {
      severity: 'medium',
      category: 'Validation',
      description: 'Input validation should be verified',
      recommendation: 'Implement comprehensive input validation',
    };
  }

  private checkPermissions(): SecurityIssue | null {
    // Check if permissions are properly requested
    const requiredPermissions = [
      'CAMERA',
      'RECORD_AUDIO',
      'INTERNET',
      'ACCESS_NETWORK_STATE',
    ];

    // This would need to be implemented with permission checking
    return {
      severity: 'low',
      category: 'Permissions',
      description: 'Permission usage should be audited',
      recommendation: 'Review and minimize permission requests',
    };
  }

  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.category === 'Storage')) {
      recommendations.push('Implement secure storage for all sensitive data');
    }

    if (issues.some(i => i.category === 'Network')) {
      recommendations.push('Enforce HTTPS for all network communications');
    }

    if (issues.some(i => i.category === 'Authentication')) {
      recommendations.push('Implement proper token management and refresh');
    }

    if (issues.some(i => i.category === 'Validation')) {
      recommendations.push('Add comprehensive input validation and sanitization');
    }

    if (issues.some(i => i.category === 'Secrets')) {
      recommendations.push('Move all secrets to secure environment variables');
    }

    if (issues.some(i => i.category === 'Permissions')) {
      recommendations.push('Minimize and properly justify all permission requests');
    }

    // General recommendations
    recommendations.push('Implement certificate pinning for API communications');
    recommendations.push('Add runtime application self-protection (RASP)');
    recommendations.push('Implement proper error handling without exposing sensitive information');
    recommendations.push('Regular security updates and dependency management');

    return recommendations;
  }

  // Security best practices implementation
  static validateInput(input: string, type: 'email' | 'username' | 'password'): boolean {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
      case 'username':
        return /^[a-zA-Z0-9_]{3,20}$/.test(input);
      case 'password':
        return input.length >= 8 && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(input);
      default:
        return false;
    }
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
  }

  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isSecureEnvironment(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
}

export default SecurityAuditor;
