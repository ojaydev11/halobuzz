/**
 * Socket.IO Authentication with Session Revocation Support
 * Provides secure WebSocket authentication with real-time revocation
 */

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { SessionManager, TokenPayload } from './sessionManager';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
  user?: {
    userId: string;
    email: string;
    role: string;
    sessionId: string;
  };
}

export class SocketAuthManager {
  private io: Server;
  private revokedSessions: Set<string> = new Set();

  constructor(io: Server) {
    this.io = io;
    this.setupRevocationListener();
  }

  /**
   * Setup Socket.IO authentication middleware
   */
  setupAuthentication(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
        
        // Check if token is revoked
        if (await SessionManager.isTokenRevoked(decoded.sessionId)) {
          return next(new Error('Token has been revoked'));
        }

        // Validate session
        const session = await SessionManager.validateSession(decoded.sessionId, socket.request as any);
        if (!session) {
          return next(new Error('Session expired or invalid'));
        }

        // Attach user info to socket
        socket.userId = session.userId;
        socket.sessionId = session.sessionId;
        socket.user = {
          userId: session.userId,
          email: session.email,
          role: session.role,
          sessionId: session.sessionId
        };

        // Join user-specific room for targeted messaging
        socket.join(`user:${session.userId}`);
        
        // Join role-based rooms
        socket.join(`role:${session.role}`);

        logger.info(`Socket authenticated: ${session.userId}`, {
          sessionId: session.sessionId,
          socketId: socket.id,
          ip: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent']
        });

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        
        if (error instanceof jwt.JsonWebTokenError) {
          return next(new Error('Invalid token'));
        }
        
        if (error instanceof jwt.TokenExpiredError) {
          return next(new Error('Token expired'));
        }

        return next(new Error('Authentication failed'));
      }
    });

    // Setup connection handlers
    this.setupConnectionHandlers();
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket connected: ${socket.id}`, {
        userId: socket.userId,
        sessionId: socket.sessionId
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Socket disconnected: ${socket.id}`, {
          userId: socket.userId,
          sessionId: socket.sessionId,
          reason
        });
      });

      // Handle authentication errors
      socket.on('auth_error', (error) => {
        logger.warn(`Socket auth error: ${socket.id}`, {
          userId: socket.userId,
          error: error.message
        });
        socket.disconnect(true);
      });

      // Handle session validation
      socket.on('validate_session', async () => {
        if (!socket.sessionId) {
          socket.emit('session_invalid', { error: 'No session ID' });
          return;
        }

        const isValid = await SessionManager.validateSession(socket.sessionId, socket.request as any);
        if (!isValid) {
          socket.emit('session_invalid', { error: 'Session expired' });
          socket.disconnect(true);
          return;
        }

        socket.emit('session_valid', { sessionId: socket.sessionId });
      });
    });
  }

  /**
   * Setup Redis pub/sub listener for session revocation
   */
  private setupRevocationListener(): void {
    // Listen for session revocation events
    const redis = require('redis');
    const subscriber = redis.createClient({ url: process.env.REDIS_URL });
    
    subscriber.connect().then(() => {
      subscriber.subscribe('session_revoked', (message: string) => {
        try {
          const data = JSON.parse(message);
          const { sessionId, userId } = data;
          
          logger.info(`Session revocation received: ${sessionId}`, { userId });
          
          // Disconnect all sockets for this session
          this.disconnectSessionSockets(sessionId);
          
        } catch (error) {
          logger.error('Session revocation listener error:', error);
        }
      });

      subscriber.subscribe('user_logout', (message: string) => {
        try {
          const data = JSON.parse(message);
          const { userId } = data;
          
          logger.info(`User logout received: ${userId}`);
          
          // Disconnect all sockets for this user
          this.disconnectUserSockets(userId);
          
        } catch (error) {
          logger.error('User logout listener error:', error);
        }
      });
    }).catch((error: any) => {
      logger.error('Redis subscriber connection error:', error);
    });
  }

  /**
   * Disconnect all sockets for a specific session
   */
  private disconnectSessionSockets(sessionId: string): void {
    const sockets = Array.from(this.io.sockets.sockets.values()) as AuthenticatedSocket[];
    
    sockets.forEach(socket => {
      if (socket.sessionId === sessionId) {
        socket.emit('session_revoked', { 
          reason: 'Session has been revoked',
          sessionId 
        });
        socket.disconnect(true);
        
        logger.info(`Socket disconnected due to session revocation: ${socket.id}`, {
          sessionId,
          userId: socket.userId
        });
      }
    });
  }

  /**
   * Disconnect all sockets for a specific user
   */
  private disconnectUserSockets(userId: string): void {
    const sockets = Array.from(this.io.sockets.sockets.values()) as AuthenticatedSocket[];
    
    sockets.forEach(socket => {
      if (socket.userId === userId) {
        socket.emit('user_logout', { 
          reason: 'User has logged out',
          userId 
        });
        socket.disconnect(true);
        
        logger.info(`Socket disconnected due to user logout: ${socket.id}`, {
          userId,
          sessionId: socket.sessionId
        });
      }
    });
  }

  /**
   * Broadcast message to user's sockets
   */
  broadcastToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast message to role-based rooms
   */
  broadcastToRole(role: string, event: string, data: any): void {
    this.io.to(`role:${role}`).emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    const sockets = Array.from(this.io.sockets.sockets.values()) as AuthenticatedSocket[];
    const uniqueUsers = new Set(sockets.map(socket => socket.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string): Promise<AuthenticatedSocket[]> {
    const sockets = Array.from(this.io.sockets.sockets.values()) as AuthenticatedSocket[];
    return sockets.filter(socket => socket.userId === userId);
  }

  /**
   * Setup rate limiting for socket events
   */
  setupRateLimiting(): void {
    const rateLimits = new Map<string, { count: number; resetTime: number }>();

    this.io.use((socket: AuthenticatedSocket, next) => {
      const userId = socket.userId || socket.handshake.address;
      const now = Date.now();
      const windowMs = 60000; // 1 minute
      const maxEvents = 100; // Max events per minute

      const userLimit = rateLimits.get(userId) || { count: 0, resetTime: now + windowMs };

      if (now > userLimit.resetTime) {
        userLimit.count = 0;
        userLimit.resetTime = now + windowMs;
      }

      if (userLimit.count >= maxEvents) {
        logger.warn(`Socket rate limit exceeded for user: ${userId}`, {
          socketId: socket.id,
          count: userLimit.count,
          maxEvents
        });
        return next(new Error('Rate limit exceeded'));
      }

      userLimit.count++;
      rateLimits.set(userId, userLimit);

      next();
    });
  }

  /**
   * Setup event allowlist for security
   */
  setupEventAllowlist(): void {
    const allowedEvents = new Set([
      'join_room',
      'leave_room',
      'send_message',
      'typing_start',
      'typing_stop',
      'heartbeat',
      'validate_session',
      'get_user_info',
      'join_game',
      'leave_game',
      'game_action',
      'stream_join',
      'stream_leave',
      'gift_send',
      'gift_receive'
    ]);

    this.io.use((socket: AuthenticatedSocket, next) => {
      socket.onAny((eventName, ...args) => {
        if (!allowedEvents.has(eventName)) {
          logger.warn(`Blocked unauthorized event: ${eventName}`, {
            socketId: socket.id,
            userId: socket.userId,
            args: args.length
          });
          socket.emit('error', { message: 'Event not allowed' });
          return;
        }
      });
      next();
    });
  }
}

/**
 * Initialize Socket.IO authentication
 */
export function setupSocketAuthentication(io: Server): SocketAuthManager {
  const authManager = new SocketAuthManager(io);
  authManager.setupAuthentication();
  authManager.setupRateLimiting();
  authManager.setupEventAllowlist();
  
  logger.info('Socket.IO authentication configured');
  return authManager;
}
