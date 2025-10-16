import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '@/models/User';
import { logger } from '../config/logger';
import { setCache, getCache } from '@/config/redis';
import { secrets } from '@/config/secrets';
import { EmailService } from './emailService';
import { SMSService } from './smsService';
import { AIService } from './aiService';

export interface LoginCredentials {
  email?: string;
  phone?: string;
  username?: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  phone?: string;
  password: string;
  country: string;
  language?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
}

export interface SocialLoginData {
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  email: string;
  name?: string;
  avatar?: string;
}

export interface AuthResponse {
  user: Partial<IUser>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: data.email.toLowerCase() },
          { username: data.username },
          ...(data.phone ? [{ phone: data.phone }] : [])
        ]
      });

      if (existingUser) {
        throw new Error('User already exists with this email, username, or phone');
      }

      // Validate age (must be 13+)
      if (data.dateOfBirth) {
        const age = this.calculateAge(data.dateOfBirth);
        if (age < 13) {
          throw new Error('User must be at least 13 years old');
        }
      }

      // Create new user
      const user = new User({
        username: data.username,
        email: data.email.toLowerCase(),
        phone: data.phone,
        password: data.password,
        country: data.country,
        language: data.language || 'en',
        dateOfBirth: data.dateOfBirth,
        gender: data.gender
      });

      await user.save();

      // Cache user data
      await setCache(`user:${user._id}`, user.toJSON(), 3600); // 1 hour

      // Generate tokens
      const tokens = await this.generateTokens((user._id as any).toString());

      // Send welcome email with verification
      const verificationToken = jwt.sign(
        { userId: user._id, type: 'email_verification' },
        process.env.JWT_SECRET as string,
        { expiresIn: '24h' }
      );
      const verificationLink = `${process.env.FRONTEND_URL || 'https://halobuzz.com'}/verify-email?token=${verificationToken}`;
      await EmailService.sendWelcomeEmail(user.email, user.username);

      // Send verification SMS if phone provided
      if (data.phone) {
        await this.sendVerificationSMS(data.phone);
      }

      logger.info(`New user registered: ${user.username} (${user.email})`);

      return {
        user: user.toJSON() as Partial<IUser>,
        ...tokens
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user with email/phone/username and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Find user with timeout handling
      const user = await User.findOne({
        $or: [
          { email: credentials.email?.toLowerCase() },
          { phone: credentials.phone },
          { username: credentials.username }
        ]
      }).maxTimeMS(5000); // 5 second timeout

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is banned
      if (user.isBanned) {
        if (user.banExpiresAt && new Date() < user.banExpiresAt) {
          throw new Error(`Account banned: ${user.banReason}`);
        } else {
          // Unban user if ban has expired
          user.isBanned = false;
          user.banReason = undefined as any;
          user.banExpiresAt = undefined as any;
          await user.save();
        }
      }

      // Verify password
      const isValidPassword = await user.comparePassword(credentials.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last active
      user.lastActiveAt = new Date();
      await user.save();

      // Cache user data
      await setCache(`user:${user._id}`, user.toJSON(), 3600);

      // Generate tokens
      const tokens = await this.generateTokens((user._id as any).toString());

      logger.info(`User logged in: ${user.username} (${user.email})`);

      return {
        user: user.toJSON() as Partial<IUser>,
        ...tokens
      };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Social login (Google, Facebook, Apple)
   */
  static async socialLogin(data: SocialLoginData): Promise<AuthResponse> {
    try {
      // Find existing user by social login
      const existingUser = await User.findOne({
        [`socialLogin.${data.provider}.id`]: data.providerId
      });

      if (existingUser) {
        // Update last active
        existingUser.lastActiveAt = new Date();
        await existingUser.save();

        // Cache user data
        await setCache(`user:${existingUser._id}`, existingUser.toJSON(), 3600);

        // Generate tokens
        const tokens = await this.generateTokens((existingUser._id as any).toString());

        logger.info(`Social login: ${existingUser.username} via ${data.provider}`);

        return {
          user: existingUser.toJSON(),
          ...tokens
        };
      }

      // Check if email already exists
      const userWithEmail = await User.findOne({ email: data.email.toLowerCase() });
      if (userWithEmail) {
        // Link social account to existing user
        userWithEmail.socialLogin = {
          ...userWithEmail.socialLogin,
          [data.provider]: {
            id: data.providerId,
            email: data.email
          }
        };
        userWithEmail.lastActiveAt = new Date();
        await userWithEmail.save();

        // Cache user data
        await setCache(`user:${userWithEmail._id}`, userWithEmail.toJSON(), 3600);

        // Generate tokens
        const tokens = await this.generateTokens((userWithEmail._id as any).toString());

        logger.info(`Social account linked: ${userWithEmail.username} via ${data.provider}`);

        return {
          user: userWithEmail.toJSON(),
          ...tokens
        };
      }

      // Create new user with social login
      const username = await this.generateUniqueUsername(data.name || data.email?.split('@')[0] || 'user');
      
      const newUser = new User({
        username,
        email: data.email.toLowerCase(),
        password: await this.generateRandomPassword(),
        country: 'NP', // Default to Nepal
        language: 'en',
        avatar: data.avatar,
        socialLogin: {
          [data.provider]: {
            id: data.providerId,
            email: data.email
          }
        },
        isVerified: true // Social login users are pre-verified
      });

      await newUser.save();

      // Cache user data
      await setCache(`user:${newUser._id}`, newUser.toJSON(), 3600);

      // Generate tokens
      const tokens = await this.generateTokens((newUser._id as any).toString());

      logger.info(`New social user created: ${newUser.username} via ${data.provider}`);

      return {
        user: newUser.toJSON(),
        ...tokens
      };
    } catch (error) {
      logger.error('Social login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user is banned
      if (user.isBanned) {
        throw new Error('Account is banned');
      }

      // Generate new tokens
      const tokens = await this.generateTokens((user._id as any).toString());

      logger.info(`Token refreshed for user: ${user.username}`);

      return {
        user: user.toJSON() as Partial<IUser>,
        ...tokens
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string): Promise<void> {
    try {
      // Remove user from cache
      await setCache(`user:${userId}`, null, 1);

      // Add token to blacklist (implement if needed)
      // await this.blacklistToken(token);

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Send verification SMS
   */
  static async sendVerificationSMS(phone: string): Promise<void> {
    try {
      const verificationCode = this.generateVerificationCode();
      
      // Cache verification code
      await setCache(`verification:${phone}`, verificationCode, 300); // 5 minutes

      // Send SMS
      await SMSService.sendVerificationCode(phone, verificationCode);

      logger.info(`Verification SMS sent to: ${phone}`);
    } catch (error) {
      logger.error('SMS verification error:', error);
      throw error;
    }
  }

  /**
   * Verify SMS code
   */
  static async verifySMSCode(phone: string, code: string): Promise<boolean> {
    try {
      const cachedCode = await getCache<string>(`verification:${phone}`);
      
      if (cachedCode === code) {
        // Remove cached code
        await setCache(`verification:${phone}`, null, 1);
        
        // Update user verification status
        await User.findOneAndUpdate(
          { phone },
          { isVerified: true }
        );

        logger.info(`Phone verified: ${phone}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('SMS verification error:', error);
      throw error;
    }
  }

  /**
   * Submit KYC documents
   */
  static async submitKYC(userId: string, documents: {
    idCard: string;
    selfie: string;
  }): Promise<void> {
    try {
      // Process documents with AI
      const aiVerification = await AIService.verifyKYC(documents);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      user.kycStatus = (aiVerification as any).isValid ? 'verified' : 'rejected';
      user.kycDocuments = {
        idCard: documents.idCard,
        selfie: documents.selfie,
        verificationDate: new Date()
      };

      await user.save();

      // Cache updated user data
      await setCache(`user:${user._id}`, user.toJSON(), 3600);

      logger.info(`KYC submitted for user: ${user.username}, status: ${user.kycStatus}`);
    } catch (error) {
      logger.error('KYC submission error:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens
   */
  private static async generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const accessToken = jwt.sign(
      { userId },
      secrets.JWT_SECRET as string,
      { expiresIn: this.ACCESS_TOKEN_EXPIRES_IN } as any
    );

    const refreshToken = jwt.sign(
      { userId },
      secrets.JWT_REFRESH_SECRET as string,
      { expiresIn: this.REFRESH_TOKEN_EXPIRES_IN } as any
    );

    const expiresIn = jwt.decode(accessToken) as any;
    const expiresInSeconds = expiresIn.exp - Math.floor(Date.now() / 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds
    };
  }

  /**
   * Generate unique username
   */
  private static async generateUniqueUsername(baseUsername: string): Promise<string> {
    const username = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    let counter = 1;
    let finalUsername = username;

    while (await User.findOne({ username: finalUsername })) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    return finalUsername;
  }

  /**
   * Generate random password for social login users
   */
  private static async generateRandomPassword(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }

  /**
   * Generate verification code
   */
  private static generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calculate age from date of birth
   */
  private static calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
}
