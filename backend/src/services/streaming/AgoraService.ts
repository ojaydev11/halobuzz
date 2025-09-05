import { RtcTokenBuilder, RtmTokenBuilder, RtcRole } from 'agora-access-token';
import { logger } from '../../config/logger';
import { LiveStream } from '../../models/LiveStream';
import { User } from '../../models/User';
import { v4 as uuidv4 } from 'uuid';

export class AgoraService {
  private appId: string;
  private appCertificate: string;
  private tokenExpireTime: number = 3600; // 1 hour default

  constructor() {
    this.appId = process.env.AGORA_APP_ID!;
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE!;
    
    if (!this.appId || !this.appCertificate) {
      throw new Error('Agora credentials not configured');
    }
  }

  /**
   * Generate RTC token for video/audio streaming
   */
  generateRtcToken(channelName: string, uid: number, role: 'host' | 'viewer'): string {
    const rtcRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + this.tokenExpireTime;
    
    logger.info(`Generating RTC token for ${role} in channel ${channelName}`);
    
    return RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpireTime
    );
  }

  /**
   * Generate RTM token for real-time messaging
   */
  generateRtmToken(userId: string): string {
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + this.tokenExpireTime;
    
    return RtmTokenBuilder.buildToken(
      this.appId,
      this.appCertificate,
      userId,
      privilegeExpireTime
    );
  }

  /**
   * Start a live stream
   */
  async startStream(userId: string, title: string, options: {
    description?: string;
    category?: string;
    isAudioOnly?: boolean;
    isAnonymous?: boolean;
    isPrivate?: boolean;
    tags?: string[];
  } = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Generate unique channel name
      const channelName = `live_${userId}_${Date.now()}`;
      const streamKey = uuidv4();
      
      // Generate host token
      const hostToken = this.generateRtcToken(channelName, parseInt(userId.slice(-6), 16), 'host');
      const rtmToken = this.generateRtmToken(userId);

      // Create stream record
      const stream = new LiveStream({
        hostId: userId,
        title,
        description: options.description || '',
        category: options.category || 'entertainment',
        tags: options.tags || [],
        isAudioOnly: options.isAudioOnly || false,
        isAnonymous: options.isAnonymous || false,
        isPrivate: options.isPrivate || false,
        streamKey,
        agoraChannel: channelName,
        agoraToken: hostToken,
        status: 'live',
        startedAt: new Date(),
        country: user.country,
        language: user.language,
        settings: {
          allowGifts: true,
          allowComments: true,
          allowShares: true,
          minAge: 18,
          maxViewers: 10000,
          autoRecord: true
        }
      });

      await stream.save();

      logger.info(`Stream started: ${stream._id} by user ${userId}`);

      return {
        streamId: stream._id,
        channelName,
        streamKey,
        rtcToken: hostToken,
        rtmToken,
        appId: this.appId,
        uid: parseInt(userId.slice(-6), 16)
      };
    } catch (error) {
      logger.error('Failed to start stream:', error);
      throw error;
    }
  }

  /**
   * Join a live stream as viewer
   */
  async joinStream(userId: string, streamId: string) {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) throw new Error('Stream not found');
      if (stream.status !== 'live') throw new Error('Stream is not live');

      // Generate viewer token
      const viewerToken = this.generateRtcToken(
        stream.agoraChannel, 
        parseInt(userId.slice(-6), 16), 
        'viewer'
      );
      const rtmToken = this.generateRtmToken(userId);

      // Update viewer count
      stream.currentViewers += 1;
      stream.totalViewers += 1;
      if (stream.currentViewers > stream.peakViewers) {
        stream.peakViewers = stream.currentViewers;
      }
      await stream.save();

      logger.info(`User ${userId} joined stream ${streamId}. Current viewers: ${stream.currentViewers}`);

      return {
        streamId: stream._id,
        channelName: stream.agoraChannel,
        rtcToken: viewerToken,
        rtmToken,
        appId: this.appId,
        uid: parseInt(userId.slice(-6), 16),
        hostUid: parseInt(stream.hostId.toString().slice(-6), 16),
        streamInfo: {
          title: stream.title,
          hostId: stream.hostId,
          category: stream.category,
          isAudioOnly: stream.isAudioOnly,
          currentViewers: stream.currentViewers
        }
      };
    } catch (error) {
      logger.error('Failed to join stream:', error);
      throw error;
    }
  }

  /**
   * Leave a live stream
   */
  async leaveStream(userId: string, streamId: string) {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) return;

      // Update viewer count
      stream.currentViewers = Math.max(0, stream.currentViewers - 1);
      await stream.save();

      logger.info(`User ${userId} left stream ${streamId}. Current viewers: ${stream.currentViewers}`);

      return {
        success: true,
        currentViewers: stream.currentViewers
      };
    } catch (error) {
      logger.error('Failed to leave stream:', error);
      throw error;
    }
  }

  /**
   * End a live stream
   */
  async endStream(userId: string, streamId: string) {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) throw new Error('Stream not found');
      if (stream.hostId.toString() !== userId) throw new Error('Unauthorized');

      // Calculate duration
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - stream.startedAt!.getTime()) / 1000);

      // Update stream record
      stream.status = 'ended';
      stream.endedAt = endTime;
      stream.duration = duration;
      stream.currentViewers = 0;
      await stream.save();

      logger.info(`Stream ended: ${streamId}. Duration: ${duration}s, Total viewers: ${stream.totalViewers}`);

      return {
        success: true,
        streamId: stream._id,
        duration,
        totalViewers: stream.totalViewers,
        peakViewers: stream.peakViewers,
        totalGifts: stream.totalGifts,
        totalCoins: stream.totalCoins
      };
    } catch (error) {
      logger.error('Failed to end stream:', error);
      throw error;
    }
  }

  /**
   * Handle stream reconnection
   */
  async handleReconnect(userId: string, streamId: string, role: 'host' | 'viewer') {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream || stream.status !== 'live') {
        throw new Error('Stream not available for reconnection');
      }

      // Generate new token with extended expiry
      const token = this.generateRtcToken(
        stream.agoraChannel,
        parseInt(userId.slice(-6), 16),
        role
      );

      logger.info(`Reconnection handled for ${role} ${userId} in stream ${streamId}`);

      return {
        success: true,
        rtcToken: token,
        channelName: stream.agoraChannel,
        reconnectTime: Date.now()
      };
    } catch (error) {
      logger.error('Failed to handle reconnection:', error);
      throw error;
    }
  }
}

export const agoraService = new AgoraService();