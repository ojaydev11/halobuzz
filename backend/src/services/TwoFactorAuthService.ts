import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import twilio from 'twilio';
import { User, IUser } from '../models/User';
import { logger } from '../config/logger';
import crypto from 'crypto';

interface OTPRecord {
  code: string;
  expiresAt: Date;
  attempts: number;
  purpose: 'login' | 'verification' | 'withdrawal' | 'security';
}

export class TwoFactorAuthService {
  private static instance: TwoFactorAuthService;
  private twilioClient: twilio.Twilio | null = null;
  private otpStore = new Map<string, OTPRecord>();
  private readonly MAX_OTP_ATTEMPTS = 3;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly OTP_LENGTH = 6;

  private constructor() {
    // Initialize Twilio if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  static getInstance(): TwoFactorAuthService {
    if (!TwoFactorAuthService.instance) {
      TwoFactorAuthService.instance = new TwoFactorAuthService();
    }
    return TwoFactorAuthService.instance;
  }

  /**
   * Generate TOTP secret for a user
   */
  async generateTOTPSecret(userId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const secret = speakeasy.generateSecret({
        name: `HaloBuzz (${user.email || user.username})`,
        issuer: 'HaloBuzz',
        length: 32
      });

      // Generate QR code
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: encodeURIComponent(`HaloBuzz:${user.email || user.username}`),
        issuer: 'HaloBuzz'
      });

      const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

      return {
        secret: secret.base32,
        qrCodeUrl
      };
    } catch (error) {
      logger.error('Failed to generate TOTP secret:', error);
      throw error;
    }
  }

  /**
   * Enable 2FA for a user
   */
  async enable2FA(userId: string, token: string, totpSecret: string): Promise<boolean> {
    try {
      // Verify the token first
      const isValid = this.verifyTOTPToken(token, totpSecret);
      if (!isValid) {
        throw new Error('Invalid verification token');
      }

      // Save the secret to the user
      await User.findByIdAndUpdate(userId, {
        totpSecret,
        'security.twoFactorEnabled': true,
        'security.twoFactorMethod': 'totp'
      });

      logger.info(`2FA enabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string, password: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Remove TOTP secret
      await User.findByIdAndUpdate(userId, {
        $unset: { totpSecret: 1 },
        'security.twoFactorEnabled': false,
        'security.twoFactorMethod': null
      });

      logger.info(`2FA disabled for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTPToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps before/after for clock skew
    });
  }

  /**
   * Generate and send OTP via SMS
   */
  async sendOTPviaSMS(
    phone: string, 
    purpose: 'login' | 'verification' | 'withdrawal' | 'security' = 'verification'
  ): Promise<void> {
    try {
      // Generate 6-digit OTP
      const otp = this.generateOTP();
      
      // Store OTP with expiry
      const key = `otp:${phone}:${purpose}`;
      this.otpStore.set(key, {
        code: otp,
        expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        purpose
      });

      // Send SMS
      if (this.twilioClient) {
        await this.twilioClient.messages.create({
          body: `Your HaloBuzz ${purpose} code is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: phone
        });
        logger.info(`OTP sent to ${phone} for ${purpose}`);
      } else {
        // Fallback to console log in development
        logger.info(`[DEV] OTP for ${phone}: ${otp}`);
      }

      // Clean up expired OTPs
      this.cleanupExpiredOTPs();
    } catch (error) {
      logger.error('Failed to send OTP:', error);
      throw error;
    }
  }

  /**
   * Send OTP via Email (using SendGrid or similar)
   */
  async sendOTPviaEmail(
    email: string,
    purpose: 'login' | 'verification' | 'withdrawal' | 'security' = 'verification'
  ): Promise<void> {
    try {
      const otp = this.generateOTP();
      
      // Store OTP
      const key = `otp:${email}:${purpose}`;
      this.otpStore.set(key, {
        code: otp,
        expiresAt: new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000),
        attempts: 0,
        purpose
      });

      // TODO: Implement email sending via SendGrid/SES
      // For now, log to console
      logger.info(`[DEV] Email OTP for ${email}: ${otp}`);

      this.cleanupExpiredOTPs();
    } catch (error) {
      logger.error('Failed to send email OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP
   */
  verifyOTP(
    identifier: string,
    otp: string,
    purpose: 'login' | 'verification' | 'withdrawal' | 'security'
  ): boolean {
    const key = `otp:${identifier}:${purpose}`;
    const record = this.otpStore.get(key);

    if (!record) {
      return false;
    }

    // Check if expired
    if (new Date() > record.expiresAt) {
      this.otpStore.delete(key);
      return false;
    }

    // Check attempts
    if (record.attempts >= this.MAX_OTP_ATTEMPTS) {
      this.otpStore.delete(key);
      throw new Error('Maximum OTP attempts exceeded');
    }

    // Increment attempts
    record.attempts++;

    // Verify OTP
    if (record.code === otp) {
      this.otpStore.delete(key);
      return true;
    }

    return false;
  }

  /**
   * Generate backup codes for account recovery
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(
        crypto.randomBytes(4).toString('hex').toUpperCase() + '-' +
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );
    }
    return codes;
  }

  /**
   * Verify 2FA for login
   */
  async verify2FALogin(userId: string, token: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.totpSecret) {
        throw new Error('2FA not enabled for this user');
      }

      return this.verifyTOTPToken(token, user.totpSecret);
    } catch (error) {
      logger.error('2FA verification failed:', error);
      throw error;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async has2FAEnabled(userId: string): Promise<boolean> {
    const user = await User.findById(userId);
    return !!(user && user.totpSecret);
  }

  /**
   * Generate a random OTP
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Clean up expired OTPs from memory
   */
  private cleanupExpiredOTPs(): void {
    const now = new Date();
    for (const [key, record] of this.otpStore.entries()) {
      if (now > record.expiresAt) {
        this.otpStore.delete(key);
      }
    }
  }

  /**
   * Rate limit check for OTP requests
   */
  async checkOTPRateLimit(identifier: string): Promise<boolean> {
    // Implement rate limiting logic
    // For now, return true
    return true;
  }
}

export const twoFactorAuthService = TwoFactorAuthService.getInstance();