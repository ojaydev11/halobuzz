import { Socket } from 'socket.io';
import { getCache, setCache } from '../config/redis';
import { setupLogger } from '../config/logger';

const logger = setupLogger();

export interface SocketLimits {
  maxMessagesPerMinute: number;
  maxConnectionsPerIP: number;
  maxRoomsPerUser: number;
  messageCooldownMs: number;
  connectionCooldownMs: number;
  maxMessageLength: number;
}

export interface SocketSession {
  userId: string;
  ip: string;
  connectedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  rooms: Set<string>;
  violations: number;
}

export class SocketSecurityService {
  private static instance: SocketSecurityService;
  private activeSessions: Map<string, SocketSession> = new Map();
  private ipConnections: Map<string, number> = new Map();
  private defaultLimits: SocketLimits = {
    maxMessagesPerMinute: 30,
    maxConnectionsPerIP: 5,
    maxRoomsPerUser: 10,
    messageCooldownMs: 1000, // 1 second
    connectionCooldownMs: 5000, // 5 seconds
    maxMessageLength: 500
  };

  public static getInstance(): SocketSecurityService {
    if (!SocketSecurityService.instance) {
      SocketSecurityService.instance = new SocketSecurityService();
    }
    return SocketSecurityService.instance;
  }

  /**
   * Check if a new connection is allowed
   */
  async canConnect(socket: Socket, userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    limits?: SocketLimits;
  }> {
    try {
      const ip = this.getClientIP(socket);
      
      // Check IP connection limit
      const currentConnections = this.ipConnections.get(ip) || 0;
      if (currentConnections >= this.defaultLimits.maxConnectionsPerIP) {
        return {
          allowed: false,
          reason: 'Too many connections from this IP',
          limits: this.defaultLimits
        };
      }

      // Check if user already has an active session
      const existingSession = this.activeSessions.get(userId);
      if (existingSession) {
        const timeSinceLastConnection = Date.now() - existingSession.connectedAt.getTime();
        if (timeSinceLastConnection < this.defaultLimits.connectionCooldownMs) {
          return {
            allowed: false,
            reason: 'Connection cooldown active',
            limits: this.defaultLimits
          };
        }
      }

      // Check for violations
      if (existingSession && existingSession.violations > 3) {
        return {
          allowed: false,
          reason: 'Too many violations. Connection blocked.',
          limits: this.defaultLimits
        };
      }

      return { allowed: true, limits: this.defaultLimits };
    } catch (error) {
      logger.error('Socket connection check failed:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Register a new socket connection
   */
  registerConnection(socket: Socket, userId: string): void {
    const ip = this.getClientIP(socket);
    
    // Update IP connection count
    const currentConnections = this.ipConnections.get(ip) || 0;
    this.ipConnections.set(ip, currentConnections + 1);

    // Create or update session
    const session: SocketSession = {
      userId,
      ip,
      connectedAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
      rooms: new Set(),
      violations: this.activeSessions.get(userId)?.violations || 0
    };
    
    this.activeSessions.set(userId, session);
    
    logger.info(`Socket connection registered for user ${userId} from IP ${ip}`);
  }

  /**
   * Check if a message can be sent
   */
  async canSendMessage(socket: Socket, userId: string, message: string): Promise<{
    allowed: boolean;
    reason?: string;
    limits?: SocketLimits;
  }> {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        return { allowed: false, reason: 'No active session' };
      }

      // Check message length
      if (message.length > this.defaultLimits.maxMessageLength) {
        this.recordViolation(userId, 'message_too_long');
        return {
          allowed: false,
          reason: 'Message too long',
          limits: this.defaultLimits
        };
      }

      // Check message cooldown
      const timeSinceLastMessage = Date.now() - session.lastMessageAt.getTime();
      if (timeSinceLastMessage < this.defaultLimits.messageCooldownMs) {
        this.recordViolation(userId, 'message_cooldown');
        return {
          allowed: false,
          reason: 'Message cooldown active',
          limits: this.defaultLimits
        };
      }

      // Check message rate limit
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000);
      
      if (session.lastMessageAt > oneMinuteAgo) {
        if (session.messageCount >= this.defaultLimits.maxMessagesPerMinute) {
          this.recordViolation(userId, 'message_rate_limit');
          return {
            allowed: false,
            reason: 'Message rate limit exceeded',
            limits: this.defaultLimits
          };
        }
      } else {
        // Reset message count if more than a minute has passed
        session.messageCount = 0;
      }

      return { allowed: true, limits: this.defaultLimits };
    } catch (error) {
      logger.error('Socket message check failed:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Record a message being sent
   */
  recordMessage(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.messageCount++;
      session.lastMessageAt = new Date();
    }
  }

  /**
   * Check if user can join a room
   */
  async canJoinRoom(userId: string, roomName: string): Promise<{
    allowed: boolean;
    reason?: string;
    limits?: SocketLimits;
  }> {
    try {
      const session = this.activeSessions.get(userId);
      if (!session) {
        return { allowed: false, reason: 'No active session' };
      }

      // Check room limit
      if (session.rooms.size >= this.defaultLimits.maxRoomsPerUser) {
        this.recordViolation(userId, 'room_limit');
        return {
          allowed: false,
          reason: 'Maximum rooms per user exceeded',
          limits: this.defaultLimits
        };
      }

      return { allowed: true, limits: this.defaultLimits };
    } catch (error) {
      logger.error('Socket room join check failed:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Record user joining a room
   */
  recordRoomJoin(userId: string, roomName: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.rooms.add(roomName);
    }
  }

  /**
   * Record user leaving a room
   */
  recordRoomLeave(userId: string, roomName: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.rooms.delete(roomName);
    }
  }

  /**
   * Record a security violation
   */
  private recordViolation(userId: string, violationType: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.violations++;
      logger.warn(`Socket security violation for user ${userId}: ${violationType} (violations: ${session.violations})`);
      
      // Store violation in Redis for persistence
      setCache(`socket_violation:${userId}:${Date.now()}`, {
        userId,
        violationType,
        timestamp: new Date(),
        ip: session.ip
      }, 86400); // 24 hours
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(userId: string, socket: Socket): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      const ip = this.getClientIP(socket);
      
      // Update IP connection count
      const currentConnections = this.ipConnections.get(ip) || 0;
      if (currentConnections > 0) {
        this.ipConnections.set(ip, currentConnections - 1);
      }
      
      // Remove session
      this.activeSessions.delete(userId);
      
      logger.info(`Socket disconnection handled for user ${userId} from IP ${ip}`);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(socket: Socket): string {
    return socket.handshake.address || 
           socket.handshake.headers['x-forwarded-for'] as string || 
           socket.handshake.headers['x-real-ip'] as string || 
           'unknown';
  }

  /**
   * Get socket limits
   */
  getLimits(): SocketLimits {
    return { ...this.defaultLimits };
  }

  /**
   * Update socket limits (admin only)
   */
  updateLimits(newLimits: Partial<SocketLimits>): void {
    this.defaultLimits = { ...this.defaultLimits, ...newLimits };
    logger.info('Socket limits updated:', newLimits);
  }

  /**
   * Get active sessions (admin only)
   */
  getActiveSessions(): SocketSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get IP connection counts (admin only)
   */
  getIPConnections(): Record<string, number> {
    return Object.fromEntries(this.ipConnections);
  }

  /**
   * Force disconnect a user (admin only)
   */
  forceDisconnect(userId: string): boolean {
    return this.activeSessions.delete(userId);
  }

  /**
   * Clear violations for a user (admin only)
   */
  clearViolations(userId: string): boolean {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.violations = 0;
      return true;
    }
    return false;
  }

  /**
   * Get violation history for a user
   */
  async getViolationHistory(userId: string): Promise<any[]> {
    try {
      // This would typically query Redis for stored violations
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get violation history:', error);
      return [];
    }
  }
}

export const socketSecurityService = SocketSecurityService.getInstance();
