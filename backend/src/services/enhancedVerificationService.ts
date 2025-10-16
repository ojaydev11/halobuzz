/**
 * Enhanced Email/SMS Verification Service
 * Provides comprehensive verification with rate limiting and security
 */

import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface VerificationConfig {
  emailVerificationExpiry: number; // seconds
  smsVerificationExpiry: number; // seconds
  maxAttempts: number;
  cooldownPeriod: number; // seconds
  rateLimitWindow: number; // seconds
  rateLimitMax: number;
}

interface VerificationAttempt {
  attempts: number;
  lastAttempt: number;
  cooldownUntil: number;
  verified: boolean;
}

export class EnhancedVerificationService {
  private static instance: EnhancedVerificationService;
  private redisClient = getRedisClient();
  private config: VerificationConfig;

  private constructor() {
    this.config = {
      emailVerificationExpiry: 15 * 60, // 15 minutes
      smsVerificationExpiry: 5 * 60, // 5 minutes
      maxAttempts: 3,
      cooldownPeriod: 15 * 60, // 15 minutes
      rateLimitWindow: 60 * 60, // 1 hour
      rateLimitMax: 5 // 5 verification attempts per hour
    };
  }

  static getInstance(): EnhancedVerificationService {
    if (!EnhancedVerificationService.instance) {
      EnhancedVerificationService.instance = new EnhancedVerificationService();
    }
    return EnhancedVerificationService.instance;
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(email: string, userId: string): Promise<string> {
    try {
      // Check rate limits
      await this.checkRateLimit(email, 'email');

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const payload = {
        email,
        userId,
        type: 'email_verification',
        iat: Math.floor(Date.now() / 1000)
      };

      const signedToken = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: this.config.emailVerificationExpiry
      });

      // Store verification data in Redis
      const verificationData = {
        email,
        userId,
        token,
        createdAt: Date.now(),
        attempts: 0,
        verified: false
      };

      await this.redisClient.setex(
        `email_verification:${email}`,
        this.config.emailVerificationExpiry,
        JSON.stringify(verificationData)
      );

      // Store token for verification
      await this.redisClient.setex(
        `verification_token:${token}`,
        this.config.emailVerificationExpiry,
        JSON.stringify(payload)
      );

      logger.info(`Email verification token generated for ${email}`);
      return signedToken;

    } catch (error) {
      logger.error('Email verification token generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify email token
   */
  async verifyEmailToken(token: string): Promise<{ success: boolean; email?: string; userId?: string; error?: string }> {
    try {
      // Decode and verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      if (decoded.type !== 'email_verification') {
        return { success: false, error: 'Invalid token type' };
      }

      // Get verification data from Redis
      const verificationDataStr = await this.redisClient.get(`email_verification:${decoded.email}`);
      if (!verificationDataStr) {
        return { success: false, error: 'Verification token expired or invalid' };
      }

      const verificationData = JSON.parse(verificationDataStr);

      // Check attempts
      if (verificationData.attempts >= this.config.maxAttempts) {
        return { success: false, error: 'Maximum verification attempts exceeded' };
      }

      // Increment attempts
      verificationData.attempts += 1;
      await this.redisClient.setex(
        `email_verification:${decoded.email}`,
        this.config.emailVerificationExpiry,
        JSON.stringify(verificationData)
      );

      // Mark as verified
      verificationData.verified = true;
      await this.redisClient.setex(
        `email_verification:${decoded.email}`,
        24 * 60 * 60, // Keep for 24 hours after verification
        JSON.stringify(verificationData)
      );

      // Clean up token
      await this.redisClient.del(`verification_token:${decoded.token}`);

      logger.info(`Email verified successfully for ${decoded.email}`);
      return { 
        success: true, 
        email: decoded.email, 
        userId: decoded.userId 
      };

    } catch (error) {
      logger.error('Email verification failed:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: 'Invalid or expired token' };
      }
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Generate SMS verification code
   */
  async generateSMSVerificationCode(phoneNumber: string, userId: string): Promise<string> {
    try {
      // Check rate limits
      await this.checkRateLimit(phoneNumber, 'sms');

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store verification data in Redis
      const verificationData = {
        phoneNumber,
        userId,
        code,
        createdAt: Date.now(),
        attempts: 0,
        verified: false
      };

      await this.redisClient.setex(
        `sms_verification:${phoneNumber}`,
        this.config.smsVerificationExpiry,
        JSON.stringify(verificationData)
      );

      // Send SMS (placeholder - integrate with SMS provider)
      await this.sendSMS(phoneNumber, `Your HaloBuzz verification code is: ${code}`);

      logger.info(`SMS verification code generated for ${phoneNumber}`);
      return code; // Return for testing purposes

    } catch (error) {
      logger.error('SMS verification code generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(phoneNumber: string, code: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Get verification data from Redis
      const verificationDataStr = await this.redisClient.get(`sms_verification:${phoneNumber}`);
      if (!verificationDataStr) {
        return { success: false, error: 'Verification code expired or invalid' };
      }

      const verificationData = JSON.parse(verificationDataStr);

      // Check attempts
      if (verificationData.attempts >= this.config.maxAttempts) {
        return { success: false, error: 'Maximum verification attempts exceeded' };
      }

      // Increment attempts
      verificationData.attempts += 1;
      await this.redisClient.setex(
        `sms_verification:${phoneNumber}`,
        this.config.smsVerificationExpiry,
        JSON.stringify(verificationData)
      );

      // Verify code
      if (verificationData.code !== code) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Mark as verified
      verificationData.verified = true;
      await this.redisClient.setex(
        `sms_verification:${phoneNumber}`,
        24 * 60 * 60, // Keep for 24 hours after verification
        JSON.stringify(verificationData)
      );

      logger.info(`SMS verified successfully for ${phoneNumber}`);
      return { 
        success: true, 
        userId: verificationData.userId 
      };

    } catch (error) {
      logger.error('SMS verification failed:', error);
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Check rate limits for verification attempts
   */
  private async checkRateLimit(identifier: string, type: 'email' | 'sms'): Promise<void> {
    const key = `verification_rate_limit:${type}:${identifier}`;
    const current = await this.redisClient.get(key);
    
    if (current) {
      const attempts = parseInt(current);
      if (attempts >= this.config.rateLimitMax) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      await this.redisClient.incr(key);
    } else {
      await this.redisClient.setex(key, this.config.rateLimitWindow, 1);
    }
  }

  /**
   * Send SMS (placeholder implementation)
   */
  private async sendSMS(phoneNumber: string, message: string): Promise<void> {
    // In production, integrate with SMS provider like Twilio, AWS SNS, etc.
    logger.info(`SMS sent to ${phoneNumber}: ${message}`);
    
    // Placeholder for actual SMS sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] SMS to ${phoneNumber}: ${message}`);
    }
  }

  /**
   * Resend verification email
   */
  async resendEmailVerification(email: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check cooldown period
      const cooldownKey = `verification_cooldown:email:${email}`;
      const cooldown = await this.redisClient.get(cooldownKey);
      
      if (cooldown) {
        const cooldownUntil = parseInt(cooldown);
        if (Date.now() < cooldownUntil) {
          const remainingTime = Math.ceil((cooldownUntil - Date.now()) / 1000 / 60);
          return { 
            success: false, 
            error: `Please wait ${remainingTime} minutes before requesting another verification email` 
          };
        }
      }

      // Set cooldown
      await this.redisClient.setex(
        cooldownKey,
        this.config.cooldownPeriod,
        (Date.now() + this.config.cooldownPeriod * 1000).toString()
      );

      // Generate new token
      await this.generateEmailVerificationToken(email, userId);

      return { success: true };

    } catch (error) {
      logger.error('Resend email verification failed:', error);
      return { success: false, error: 'Failed to resend verification email' };
    }
  }

  /**
   * Resend SMS verification code
   */
  async resendSMSVerification(phoneNumber: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check cooldown period
      const cooldownKey = `verification_cooldown:sms:${phoneNumber}`;
      const cooldown = await this.redisClient.get(cooldownKey);
      
      if (cooldown) {
        const cooldownUntil = parseInt(cooldown);
        if (Date.now() < cooldownUntil) {
          const remainingTime = Math.ceil((cooldownUntil - Date.now()) / 1000 / 60);
          return { 
            success: false, 
            error: `Please wait ${remainingTime} minutes before requesting another verification code` 
          };
        }
      }

      // Set cooldown
      await this.redisClient.setex(
        cooldownKey,
        this.config.cooldownPeriod,
        (Date.now() + this.config.cooldownPeriod * 1000).toString()
      );

      // Generate new code
      await this.generateSMSVerificationCode(phoneNumber, userId);

      return { success: true };

    } catch (error) {
      logger.error('Resend SMS verification failed:', error);
      return { success: false, error: 'Failed to resend verification code' };
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email: string): Promise<boolean> {
    try {
      const verificationDataStr = await this.redisClient.get(`email_verification:${email}`);
      if (!verificationDataStr) {
        return false;
      }

      const verificationData = JSON.parse(verificationDataStr);
      return verificationData.verified === true;

    } catch (error) {
      logger.error('Email verification check failed:', error);
      return false;
    }
  }

  /**
   * Check if phone number is verified
   */
  async isPhoneVerified(phoneNumber: string): Promise<boolean> {
    try {
      const verificationDataStr = await this.redisClient.get(`sms_verification:${phoneNumber}`);
      if (!verificationDataStr) {
        return false;
      }

      const verificationData = JSON.parse(verificationDataStr);
      return verificationData.verified === true;

    } catch (error) {
      logger.error('Phone verification check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const verificationService = EnhancedVerificationService.getInstance();
