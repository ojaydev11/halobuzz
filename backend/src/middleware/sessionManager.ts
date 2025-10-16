/**
 * Enhanced Session Management with Revocation Support
 * Provides secure session tracking with Redis-based revocation
 */

import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { getCache, setCache, delCache } from '../config/redis';
import { logger } from '../config/logger';
import crypto from 'crypto';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  sessionId: string;
  isRevoked: boolean;
  lastActivity: Date;
}

export interface TokenPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly REVOKED_PREFIX = 'revoked:';
  private static readonly SESSION_TTL = 15 * 60 * 1000; // 15 minutes
  private static readonly REFRESH_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Create a new session with access and refresh tokens
   */
  static async createSession(
    userId: string,
    email: string,
    role: string,
    deviceId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.SESSION_TTL);
    const refreshExpiresAt = new Date(now.getTime() + this.REFRESH_TTL);

    const sessionData: SessionData = {
      userId,
      email,
      role,
      deviceId,
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt,
      sessionId,
      isRevoked: false,
      lastActivity: now
    };

    // Store session in Redis
    await setCache(
      `${this.SESSION_PREFIX}${sessionId}`,
      sessionData,
      this.SESSION_TTL / 1000
    );

    // Store user's active sessions
    await this.addUserSession(userId, sessionId);

    // Generate tokens
    const accessToken = jwt.sign(
      { userId, sessionId },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, sessionId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info(`Session created for user ${userId}`, {
      sessionId,
      deviceId,
      ipAddress,
      userAgent: userAgent.substring(0, 100)
    });

    return { accessToken, refreshToken, sessionId };
  }

  /**
   * Validate session and return session data
   */
  static async validateSession(sessionId: string, req: Request): Promise<SessionData | null> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const session = await getCache(sessionKey) as SessionData;

      if (!session) {
        return null;
      }

      // Check if session is revoked
      if (session.isRevoked) {
        await this.cleanupSession(sessionId);
        return null;
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.cleanupSession(sessionId);
        return null;
      }

      // Check device binding if enabled
      const deviceId = req.header('X-Device-ID');
      if (deviceId && session.deviceId !== deviceId) {
        logger.warn(`Device mismatch for session ${sessionId}`, {
          expected: session.deviceId,
          received: deviceId,
          userId: session.userId
        });
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      await setCache(sessionKey, session, this.SESSION_TTL / 1000);

      return session;
    } catch (error) {
      logger.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionId: string, reason: string = 'Manual revocation'): Promise<boolean> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const session = await getCache(sessionKey) as SessionData;

      if (!session) {
        return false;
      }

      // Mark session as revoked
      session.isRevoked = true;
      await setCache(sessionKey, session, this.SESSION_TTL / 1000);

      // Add to revoked sessions list
      await setCache(
        `${this.REVOKED_PREFIX}${sessionId}`,
        { revokedAt: new Date(), reason },
        24 * 60 * 60 // Keep for 24 hours
      );

      // Remove from user's active sessions
      await this.removeUserSession(session.userId, sessionId);

      logger.info(`Session revoked: ${sessionId}`, {
        userId: session.userId,
        reason,
        deviceId: session.deviceId
      });

      return true;
    } catch (error) {
      logger.error('Session revocation error:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user
   */
  static async revokeAllUserSessions(userId: string, reason: string = 'User logout'): Promise<number> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await getCache(userSessionsKey) as string[] || [];

      let revokedCount = 0;
      for (const sessionId of sessionIds) {
        if (await this.revokeSession(sessionId, reason)) {
          revokedCount++;
        }
      }

      // Clear user sessions list
      await delCache(userSessionsKey);

      logger.info(`All sessions revoked for user ${userId}`, {
        revokedCount,
        reason
      });

      return revokedCount;
    } catch (error) {
      logger.error('Revoke all sessions error:', error);
      return 0;
    }
  }

  /**
   * Refresh session and generate new tokens
   */
  static async refreshSession(sessionId: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const session = await getCache(sessionKey) as SessionData;

      if (!session || session.isRevoked) {
        return null;
      }

      // Generate new session ID for rotation
      const newSessionId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.SESSION_TTL);

      // Update session data
      session.sessionId = newSessionId;
      session.expiresAt = expiresAt;
      session.lastActivity = now;

      // Store new session
      await setCache(
        `${this.SESSION_PREFIX}${newSessionId}`,
        session,
        this.SESSION_TTL / 1000
      );

      // Remove old session
      await delCache(sessionKey);

      // Update user sessions
      await this.removeUserSession(session.userId, sessionId);
      await this.addUserSession(session.userId, newSessionId);

      // Generate new tokens
      const accessToken = jwt.sign(
        { userId: session.userId, sessionId: newSessionId },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: session.userId, sessionId: newSessionId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );

      logger.info(`Session refreshed for user ${session.userId}`, {
        oldSessionId: sessionId,
        newSessionId
      });

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Session refresh error:', error);
      return null;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await getCache(userSessionsKey) as string[] || [];

      const sessions: SessionData[] = [];
      for (const sessionId of sessionIds) {
        const session = await getCache(`${this.SESSION_PREFIX}${sessionId}`) as SessionData;
        if (session && !session.isRevoked) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Get user sessions error:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      // This would typically be run as a cron job
      // For now, we rely on Redis TTL to handle cleanup
      return 0;
    } catch (error) {
      logger.error('Session cleanup error:', error);
      return 0;
    }
  }

  /**
   * Add session to user's active sessions list
   */
  private static async addUserSession(userId: string, sessionId: string): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await getCache(userSessionsKey) as string[] || [];
      
      if (!sessionIds.includes(sessionId)) {
        sessionIds.push(sessionId);
        await setCache(userSessionsKey, sessionIds, this.REFRESH_TTL / 1000);
      }
    } catch (error) {
      logger.error('Add user session error:', error);
    }
  }

  /**
   * Remove session from user's active sessions list
   */
  private static async removeUserSession(userId: string, sessionId: string): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await getCache(userSessionsKey) as string[] || [];
      
      const filteredIds = sessionIds.filter(id => id !== sessionId);
      if (filteredIds.length === 0) {
        await delCache(userSessionsKey);
      } else {
        await setCache(userSessionsKey, filteredIds, this.REFRESH_TTL / 1000);
      }
    } catch (error) {
      logger.error('Remove user session error:', error);
    }
  }

  /**
   * Clean up a specific session
   */
  private static async cleanupSession(sessionId: string): Promise<void> {
    try {
      await delCache(`${this.SESSION_PREFIX}${sessionId}`);
    } catch (error) {
      logger.error('Session cleanup error:', error);
    }
  }

  /**
   * Verify if a token is revoked
   */
  static async isTokenRevoked(sessionId: string): Promise<boolean> {
    try {
      const revokedKey = `${this.REVOKED_PREFIX}${sessionId}`;
      const revoked = await getCache(revokedKey);
      return !!revoked;
    } catch (error) {
      logger.error('Token revocation check error:', error);
      return false;
    }
  }
}

/**
 * Enhanced authentication middleware with session revocation
 */
export const enhancedAuthMiddleware = async (req: any, res: any, next: any) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // Check if token is revoked
    if (await SessionManager.isTokenRevoked(decoded.sessionId)) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token has been revoked.' 
      });
    }

    // Validate session
    const session = await SessionManager.validateSession(decoded.sessionId, req);
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Session expired or invalid.' 
      });
    }

    // Attach user info to request
    req.user = {
      userId: session.userId,
      id: session.userId,
      email: session.email,
      username: session.email.split('@')[0], // Fallback
      role: session.role,
      roles: [session.role],
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress
    };

    next();
  } catch (error) {
    logger.error('Enhanced authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token.' 
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired.' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed.' 
    });
  }
};
