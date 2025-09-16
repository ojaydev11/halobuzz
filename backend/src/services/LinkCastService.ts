import { LiveStream } from '../models/LiveStream';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { emitSystem } from '../realtime/emitters';
import crypto from 'crypto';

export interface LinkCastSession {
  id: string;
  primaryHostId: string;
  secondaryHostId?: string;
  primaryStreamId: string;
  secondaryStreamId?: string;
  status: 'pending' | 'active' | 'ended';
  inviteCode: string;
  agoraChannel: string;
  agoraTokenPrimary: string;
  agoraTokenSecondary?: string;
  startTime?: Date;
  endTime?: Date;
  viewers: number;
  settings: {
    splitScreen: boolean;
    audioMixing: boolean;
    crossCountry: boolean;
    maxDuration: number; // in minutes
  };
}

export class LinkCastService {
  private static instance: LinkCastService;
  private activeSessions = new Map<string, LinkCastSession>();
  private inviteCodes = new Map<string, string>(); // inviteCode -> sessionId

  private constructor() {
    logger.info('LinkCast Service initialized');
  }

  static getInstance(): LinkCastService {
    if (!LinkCastService.instance) {
      LinkCastService.instance = new LinkCastService();
    }
    return LinkCastService.instance;
  }

  /**
   * Create a LinkCast session
   */
  async createLinkCastSession(
    primaryHostId: string,
    streamTitle: string,
    settings?: Partial<LinkCastSession['settings']>
  ): Promise<LinkCastSession> {
    try {
      // Verify primary host
      const primaryHost = await User.findById(primaryHostId);
      if (!primaryHost) {
        throw new Error('Primary host not found');
      }

      // Check if host already has active LinkCast
      const existingSession = this.getActiveSessionByHost(primaryHostId);
      if (existingSession) {
        throw new Error('Host already has an active LinkCast session');
      }

      // Generate session details
      const sessionId = this.generateSessionId();
      const inviteCode = this.generateInviteCode();
      const agoraChannel = `linkcast_${sessionId}`;

      // Generate Agora tokens for both hosts
      const { agoraTokenPrimary, agoraTokenSecondary } = await this.generateAgoraTokens(agoraChannel);

      // Create primary host stream
      const primaryStream = new LiveStream({
        hostId: primaryHostId,
        title: `[LinkCast] ${streamTitle}`,
        description: 'Multi-host live stream',
        category: 'entertainment',
        isLinkCast: true,
        linkCastSessionId: sessionId,
        agoraChannel,
        agoraToken: agoraTokenPrimary,
        country: primaryHost.country,
        language: primaryHost.language
      });
      await primaryStream.save();

      // Create session
      const session: LinkCastSession = {
        id: sessionId,
        primaryHostId,
        primaryStreamId: primaryStream._id.toString(),
        status: 'pending',
        inviteCode,
        agoraChannel,
        agoraTokenPrimary,
        agoraTokenSecondary,
        viewers: 0,
        settings: {
          splitScreen: settings?.splitScreen ?? true,
          audioMixing: settings?.audioMixing ?? true,
          crossCountry: settings?.crossCountry ?? true,
          maxDuration: settings?.maxDuration ?? 120 // 2 hours default
        }
      };

      // Store session
      this.activeSessions.set(sessionId, session);
      this.inviteCodes.set(inviteCode, sessionId);

      // Emit event
      emitSystem('linkcast_created', {
        sessionId,
        primaryHostId,
        inviteCode
      });

      logger.info(`LinkCast session created: ${sessionId}`);
      return session;
    } catch (error) {
      logger.error('Failed to create LinkCast session:', error);
      throw error;
    }
  }

  /**
   * Join LinkCast session as secondary host
   */
  async joinLinkCast(
    inviteCode: string,
    secondaryHostId: string
  ): Promise<LinkCastSession> {
    try {
      // Get session by invite code
      const sessionId = this.inviteCodes.get(inviteCode);
      if (!sessionId) {
        throw new Error('Invalid invite code');
      }

      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.status !== 'pending') {
        throw new Error('Session is not accepting new hosts');
      }

      if (session.secondaryHostId) {
        throw new Error('Session already has a secondary host');
      }

      // Verify secondary host
      const secondaryHost = await User.findById(secondaryHostId);
      if (!secondaryHost) {
        throw new Error('Secondary host not found');
      }

      // Check if it's the same host
      if (session.primaryHostId === secondaryHostId) {
        throw new Error('Cannot join your own LinkCast session');
      }

      // Create secondary host stream
      const primaryStream = await LiveStream.findById(session.primaryStreamId);
      const secondaryStream = new LiveStream({
        hostId: secondaryHostId,
        title: primaryStream?.title || '[LinkCast] Live Stream',
        description: 'Multi-host live stream (Secondary)',
        category: 'entertainment',
        isLinkCast: true,
        linkCastSessionId: sessionId,
        agoraChannel: session.agoraChannel,
        agoraToken: session.agoraTokenSecondary,
        country: secondaryHost.country,
        language: secondaryHost.language
      });
      await secondaryStream.save();

      // Update session
      session.secondaryHostId = secondaryHostId;
      session.secondaryStreamId = secondaryStream._id.toString();
      session.status = 'active';
      session.startTime = new Date();

      // Update primary stream status
      if (primaryStream) {
        primaryStream.status = 'live';
        await primaryStream.save();
      }

      // Emit events
      emitSystem('linkcast_joined', {
        sessionId,
        primaryHostId: session.primaryHostId,
        secondaryHostId,
        crossCountry: session.settings.crossCountry && 
          (await this.isHostsFromDifferentCountries(session.primaryHostId, secondaryHostId))
      });

      logger.info(`LinkCast session ${sessionId} joined by ${secondaryHostId}`);
      return session;
    } catch (error) {
      logger.error('Failed to join LinkCast:', error);
      throw error;
    }
  }

  /**
   * End LinkCast session
   */
  async endLinkCast(sessionId: string, hostId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Verify host permission
      if (session.primaryHostId !== hostId && session.secondaryHostId !== hostId) {
        throw new Error('Unauthorized to end this session');
      }

      // Update session
      session.status = 'ended';
      session.endTime = new Date();

      // Update streams
      const streams = await LiveStream.find({ linkCastSessionId: sessionId });
      for (const stream of streams) {
        stream.status = 'ended';
        stream.endedAt = new Date();
        await stream.save();
      }

      // Clean up
      this.activeSessions.delete(sessionId);
      this.inviteCodes.delete(session.inviteCode);

      // Emit event
      emitSystem('linkcast_ended', {
        sessionId,
        duration: session.endTime.getTime() - (session.startTime?.getTime() || 0)
      });

      logger.info(`LinkCast session ${sessionId} ended`);
    } catch (error) {
      logger.error('Failed to end LinkCast:', error);
      throw error;
    }
  }

  /**
   * Get active LinkCast session by host
   */
  getActiveSessionByHost(hostId: string): LinkCastSession | undefined {
    for (const session of this.activeSessions.values()) {
      if ((session.primaryHostId === hostId || session.secondaryHostId === hostId) &&
          session.status !== 'ended') {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): LinkCastSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update viewer count
   */
  updateViewerCount(sessionId: string, viewers: number): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.viewers = viewers;
    }
  }

  /**
   * Check if hosts are from different countries
   */
  private async isHostsFromDifferentCountries(
    hostId1: string,
    hostId2: string
  ): Promise<boolean> {
    const [host1, host2] = await Promise.all([
      User.findById(hostId1).select('country'),
      User.findById(hostId2).select('country')
    ]);
    return host1?.country !== host2?.country;
  }

  /**
   * Generate Agora tokens for both hosts
   */
  private async generateAgoraTokens(channelName: string): Promise<{
    agoraTokenPrimary: string;
    agoraTokenSecondary: string;
  }> {
    const agoraAppId = process.env.AGORA_APP_ID!;
    const agoraAppCertificate = process.env.AGORA_APP_CERTIFICATE!;
    
    // Dynamic import to avoid issues if package not installed
    const { AgoraToken } = await import('agora-access-token') as any;
    const agoraToken = new AgoraToken(agoraAppId, agoraAppCertificate);
    
    const role = AgoraToken.Role.PUBLISHER;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 7200; // 2 hours

    // Generate tokens for both hosts with different UIDs
    const agoraTokenPrimary = agoraToken.buildTokenWithUid(channelName, 1, role, privilegeExpiredTs);
    const agoraTokenSecondary = agoraToken.buildTokenWithUid(channelName, 2, role, privilegeExpiredTs);

    return { agoraTokenPrimary, agoraTokenSecondary };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `lc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Generate invite code
   */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.status === 'pending' && session.startTime) {
        const elapsed = now - session.startTime.getTime();
        // Remove pending sessions older than 10 minutes
        if (elapsed > 10 * 60 * 1000) {
          this.activeSessions.delete(sessionId);
          this.inviteCodes.delete(session.inviteCode);
          logger.info(`Cleaned up expired LinkCast session: ${sessionId}`);
        }
      }
    }
  }
}

export const linkCastService = LinkCastService.getInstance();