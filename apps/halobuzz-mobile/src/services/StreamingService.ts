import { 
  RtcEngine,
  ChannelProfile,
  ClientRole,
  RtcEngineContext
} from 'react-native-agora';
import { apiService } from './api';
import { logger } from '../utils/logger';
import Config from 'react-native-config';

interface StreamConfig {
  streamId: string;
  channelName: string;
  rtcToken: string;
  rtmToken: string;
  appId: string;
  uid: number;
  hostUid?: number;
}

interface StreamStartResponse {
  streamId: string;
  channelName: string;
  streamKey: string;
  rtcToken: string;
  rtmToken: string;
  appId: string;
  uid: number;
}

class StreamingService {
  private engine: RtcEngine | null = null;
  private currentStream: StreamConfig | null = null;
  private isInitialized: boolean = false;
  
  // Get App ID from environment (safe to expose in mobile)
  private readonly AGORA_APP_ID = Config.AGORA_APP_ID || process.env.AGORA_APP_ID || 'efcf83ef40e74f7a829e46f1f8d85528';

  /**
   * Initialize Agora engine
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized && this.engine) {
        logger.info('Agora engine already initialized');
        return;
      }

      // Validate App ID
      if (!this.AGORA_APP_ID) {
        throw new Error('Agora App ID not configured');
      }

      logger.info('Initializing Agora engine', { 
        appIdPrefix: this.AGORA_APP_ID.substring(0, 8) 
      });

      // Create engine with App ID
      this.engine = await RtcEngine.createWithContext({
        appId: this.AGORA_APP_ID,
        areaCode: 0x00000001, // GLOBAL
      });

      // Enable video and audio
      await this.engine.enableVideo();
      await this.engine.enableAudio();

      // Set channel profile for live broadcasting
      await this.engine.setChannelProfile(ChannelProfile.LiveBroadcasting);

      // Enable beauty effects (optional)
      await this.engine.setBeautyEffectOptions(true, {
        lighteningContrastLevel: 1,
        lighteningLevel: 0.5,
        smoothnessLevel: 0.5,
        rednessLevel: 0.3,
      });

      // Set video encoder configuration
      await this.engine.setVideoEncoderConfiguration({
        dimensions: { width: 720, height: 1280 },
        frameRate: 30,
        bitrate: 2260,
        orientationMode: 0, // Adaptive
      });

      this.isInitialized = true;
      logger.info('Agora engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Agora engine', error);
      throw error;
    }
  }

  /**
   * Start a new stream as host
   * Token is fetched from backend for security
   */
  async startStream(title: string, options: {
    description?: string;
    category?: string;
    isAudioOnly?: boolean;
    isAnonymous?: boolean;
    tags?: string[];
  } = {}): Promise<StreamConfig> {
    try {
      // Ensure engine is initialized
      await this.initialize();

      if (!this.engine) {
        throw new Error('Agora engine not initialized');
      }

      logger.info('Starting stream', { title });

      // Request stream start from backend (gets token securely)
      const response = await apiService.post<StreamStartResponse>('/api/v1/streams/start', {
        title,
        ...options
      });

      const streamData = response.data.data;

      // Verify App ID matches
      if (streamData.appId !== this.AGORA_APP_ID) {
        logger.warn('App ID mismatch', {
          expected: this.AGORA_APP_ID,
          received: streamData.appId
        });
      }

      // Set client role as broadcaster (host)
      await this.engine.setClientRole(ClientRole.Broadcaster);

      // Enable local audio/video based on stream type
      if (options.isAudioOnly) {
        await this.engine.muteLocalVideoStream(true);
      }

      // Join channel with token from backend
      await this.engine.joinChannel(
        streamData.rtcToken,
        streamData.channelName,
        null,
        streamData.uid
      );

      this.currentStream = {
        streamId: streamData.streamId,
        channelName: streamData.channelName,
        rtcToken: streamData.rtcToken,
        rtmToken: streamData.rtmToken,
        appId: streamData.appId,
        uid: streamData.uid
      };

      logger.info('Stream started successfully', {
        streamId: streamData.streamId,
        channelName: streamData.channelName
      });

      return this.currentStream;
    } catch (error) {
      logger.error('Failed to start stream', error);
      throw error;
    }
  }

  /**
   * Join an existing stream as viewer
   * Token is fetched from backend for security
   */
  async joinStream(streamId: string): Promise<StreamConfig> {
    try {
      // Ensure engine is initialized
      await this.initialize();

      if (!this.engine) {
        throw new Error('Agora engine not initialized');
      }

      logger.info('Joining stream', { streamId });

      // Request to join stream from backend (gets token securely)
      const response = await apiService.post('/api/v1/streams/join', {
        streamId
      });

      const joinData = response.data.data;

      // Set client role as audience (viewer)
      await this.engine.setClientRole(ClientRole.Audience);

      // Join channel with token from backend
      await this.engine.joinChannel(
        joinData.rtcToken,
        joinData.channelName,
        null,
        joinData.uid
      );

      this.currentStream = {
        streamId: joinData.streamId,
        channelName: joinData.channelName,
        rtcToken: joinData.rtcToken,
        rtmToken: joinData.rtmToken,
        appId: joinData.appId,
        uid: joinData.uid,
        hostUid: joinData.hostUid
      };

      logger.info('Joined stream successfully', {
        streamId,
        viewerCount: joinData.streamInfo?.currentViewers
      });

      return this.currentStream;
    } catch (error) {
      logger.error('Failed to join stream', error);
      throw error;
    }
  }

  /**
   * Leave current stream
   */
  async leaveStream(): Promise<void> {
    try {
      if (!this.engine || !this.currentStream) {
        logger.warn('No active stream to leave');
        return;
      }

      const streamId = this.currentStream.streamId;

      // Notify backend about leaving
      await apiService.post('/api/v1/streams/leave', {
        streamId
      });

      // Leave Agora channel
      await this.engine.leaveChannel();

      logger.info('Left stream successfully', { streamId });

      this.currentStream = null;
    } catch (error) {
      logger.error('Failed to leave stream', error);
      throw error;
    }
  }

  /**
   * End stream (for hosts only)
   */
  async endStream(): Promise<void> {
    try {
      if (!this.currentStream) {
        throw new Error('No active stream to end');
      }

      const streamId = this.currentStream.streamId;

      // Leave channel first
      if (this.engine) {
        await this.engine.leaveChannel();
      }

      // Notify backend to end stream
      await apiService.post('/api/v1/streams/end', {
        streamId
      });

      logger.info('Stream ended successfully', { streamId });

      this.currentStream = null;
    } catch (error) {
      logger.error('Failed to end stream', error);
      throw error;
    }
  }

  /**
   * Handle stream reconnection
   */
  async reconnect(): Promise<void> {
    try {
      if (!this.currentStream) {
        throw new Error('No stream to reconnect to');
      }

      const { streamId } = this.currentStream;
      const role = this.engine?.isBroadcaster ? 'host' : 'viewer';

      logger.info('Reconnecting to stream', { streamId, role });

      // Request new token from backend
      const response = await apiService.post('/api/v1/streams/reconnect', {
        streamId,
        role
      });

      const { rtcToken, channelName } = response.data.data;

      // Leave current channel if connected
      await this.engine?.leaveChannel();

      // Rejoin with new token
      await this.engine?.joinChannel(
        rtcToken,
        channelName,
        null,
        this.currentStream.uid
      );

      // Update token
      this.currentStream.rtcToken = rtcToken;

      logger.info('Reconnected successfully');
    } catch (error) {
      logger.error('Failed to reconnect', error);
      throw error;
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    try {
      await this.engine?.switchCamera();
      logger.info('Camera switched');
    } catch (error) {
      logger.error('Failed to switch camera', error);
      throw error;
    }
  }

  /**
   * Toggle local audio
   */
  async toggleAudio(mute: boolean): Promise<void> {
    try {
      await this.engine?.muteLocalAudioStream(mute);
      logger.info(`Audio ${mute ? 'muted' : 'unmuted'}`);
    } catch (error) {
      logger.error('Failed to toggle audio', error);
      throw error;
    }
  }

  /**
   * Toggle local video
   */
  async toggleVideo(mute: boolean): Promise<void> {
    try {
      await this.engine?.muteLocalVideoStream(mute);
      logger.info(`Video ${mute ? 'disabled' : 'enabled'}`);
    } catch (error) {
      logger.error('Failed to toggle video', error);
      throw error;
    }
  }

  /**
   * Set video quality
   */
  async setVideoQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      const configs = {
        low: { width: 480, height: 640, bitrate: 680, frameRate: 15 },
        medium: { width: 720, height: 1280, bitrate: 1130, frameRate: 24 },
        high: { width: 1080, height: 1920, bitrate: 2260, frameRate: 30 }
      };

      const config = configs[quality];
      
      await this.engine?.setVideoEncoderConfiguration({
        dimensions: { width: config.width, height: config.height },
        frameRate: config.frameRate,
        bitrate: config.bitrate,
        orientationMode: 0
      });

      logger.info(`Video quality set to ${quality}`);
    } catch (error) {
      logger.error('Failed to set video quality', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    try {
      if (this.currentStream) {
        await this.leaveStream();
      }

      if (this.engine) {
        await this.engine.destroy();
        this.engine = null;
      }

      this.isInitialized = false;
      logger.info('Streaming service destroyed');
    } catch (error) {
      logger.error('Failed to destroy streaming service', error);
    }
  }

  /**
   * Get current stream info
   */
  getCurrentStream(): StreamConfig | null {
    return this.currentStream;
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.currentStream !== null;
  }

  /**
   * Get Agora App ID (safe to expose)
   */
  getAppId(): string {
    return this.AGORA_APP_ID;
  }
}

// Export singleton instance
export const streamingService = new StreamingService();

// Export types
export type { StreamConfig, StreamStartResponse };