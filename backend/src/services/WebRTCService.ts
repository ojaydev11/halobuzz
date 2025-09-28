import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import AgoraService from './AgoraService';

// WebRTC type definitions
interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
}

interface RTCStats {
  timestamp: number;
  type: string;
  id: string;
  [key: string]: any;
}

interface WebRTCConfig {
  iceServers: RTCIceServer[];
  maxBitrate: number;
  fallbackEnabled: boolean;
  qualityLevels: {
    low: StreamQuality;
    medium: StreamQuality;
    high: StreamQuality;
  };
}

interface StreamQuality {
  resolution: string;
  bitrate: number;
  framerate: number;
}

interface WebRTCPeer {
  peerId: string;
  userId: string;
  streamId: string;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'failed';
  quality: StreamQuality;
  stats: RTCStats;
  lastSeen: Date;
}

interface WebRTCOffer {
  offer: RTCSessionDescriptionInit;
  peerId: string;
  userId: string;
  streamId: string;
  quality: StreamQuality;
}

interface WebRTCAnswer {
  answer: RTCSessionDescriptionInit;
  peerId: string;
  accepted: boolean;
}

export class WebRTCService {
  private readonly logger = logger;
  private readonly config: WebRTCConfig;
  private readonly activePeers: Map<string, WebRTCPeer> = new Map();
  private readonly pendingOffers: Map<string, WebRTCOffer> = new Map();
  private readonly pendingAnswers: Map<string, WebRTCAnswer> = new Map();

  constructor() {
    this.config = this.initializeConfig();
  }

  /**
   * Initialize WebRTC configuration
   */
  private initializeConfig(): WebRTCConfig {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Add TURN servers for production
        ...(process.env.TURN_SERVERS ? JSON.parse(process.env.TURN_SERVERS) : [])
      ],
      maxBitrate: 2500000, // 2.5 Mbps
      fallbackEnabled: process.env.WEBRTC_FALLBACK_ENABLED === 'true',
      qualityLevels: {
        low: {
          resolution: '480p',
          bitrate: 500000,
          framerate: 15
        },
        medium: {
          resolution: '720p',
          bitrate: 1500000,
          framerate: 30
        },
        high: {
          resolution: '1080p',
          bitrate: 2500000,
          framerate: 30
        }
      }
    };
  }

  /**
   * Create WebRTC offer for streaming
   */
  async createOffer(
    userId: string,
    streamId: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<{ success: boolean; offer?: WebRTCOffer; error?: string }> {
    try {
      if (!this.config.fallbackEnabled) {
        return {
          success: false,
          error: 'WebRTC fallback is disabled'
        };
      }

      const peerId = this.generatePeerId(userId, streamId);
      const streamQuality = this.config.qualityLevels[quality];

      // Check if Agora is available first
      const agoraAvailable = await this.checkAgoraAvailability();
      if (agoraAvailable) {
        this.logger.info('Agora is available, using Agora instead of WebRTC');
        return {
          success: false,
          error: 'Agora is available, use Agora instead'
        };
      }

      const offer: WebRTCOffer = {
        offer: {
          type: 'offer',
          sdp: await this.generateSDP(streamQuality)
        },
        peerId,
        userId,
        streamId,
        quality: streamQuality
      };

      // Store pending offer
      this.pendingOffers.set(peerId, offer);

      // Cache offer for retrieval
      await setCache(`webrtc_offer:${peerId}`, offer, 300); // 5 minutes

      this.logger.info(`WebRTC offer created for peer ${peerId}`);

      return {
        success: true,
        offer
      };
    } catch (error) {
      this.logger.error('Error creating WebRTC offer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process WebRTC answer
   */
  async processAnswer(
    peerId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const offer = this.pendingOffers.get(peerId);
      if (!offer) {
        return {
          success: false,
          error: 'Offer not found'
        };
      }

      const webrtcAnswer: WebRTCAnswer = {
        answer,
        peerId,
        accepted: true
      };

      // Store pending answer
      this.pendingAnswers.set(peerId, webrtcAnswer);

      // Create peer connection
      const peer = await this.createPeerConnection(offer, webrtcAnswer);
      this.activePeers.set(peerId, peer);

      // Cache peer info
      await setCache(`webrtc_peer:${peerId}`, peer, 3600); // 1 hour

      this.logger.info(`WebRTC answer processed for peer ${peerId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error processing WebRTC answer:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create peer connection
   */
  private async createPeerConnection(
    offer: WebRTCOffer,
    answer: WebRTCAnswer
  ): Promise<WebRTCPeer> {
    const peer: WebRTCPeer = {
      peerId: offer.peerId,
      userId: offer.userId,
      streamId: offer.streamId,
      connectionState: 'connecting',
      quality: offer.quality,
      stats: {} as RTCStats,
      lastSeen: new Date()
    };

    // Simulate peer connection creation
    // In a real implementation, this would create actual WebRTC connections
    setTimeout(() => {
      peer.connectionState = 'connected';
      this.logger.info(`Peer connection established for ${peer.peerId}`);
    }, 1000);

    return peer;
  }

  /**
   * Generate SDP offer
   */
  private async generateSDP(quality: StreamQuality): Promise<string> {
    // Simulate SDP generation
    // In a real implementation, this would generate actual SDP
    const sdp = `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
a=msid-semantic: WMS
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${this.generateRandomString(8)}
a=ice-pwd:${this.generateRandomString(22)}
a=ice-options:trickle
a=fingerprint:sha-256 ${this.generateRandomString(64)}
a=setup:actpass
a=mid:0
a=sendrecv
a=rtcp-mux
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:98 VP9/90000
a=rtcp-fb:98 goog-remb
a=rtcp-fb:98 transport-cc
a=rtcp-fb:98 ccm fir
a=rtcp-fb:98 nack
a=rtcp-fb:98 nack pli
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 H264/90000
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 transport-cc
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:102 red/90000
a=rtpmap:103 rtx/90000
a=fmtp:103 apt=102
a=ssrc-group:FID 1234567890 1234567891
a=ssrc:1234567890 cname:${this.generateRandomString(16)}
a=ssrc:1234567890 msid:${this.generateRandomString(16)} ${this.generateRandomString(16)}
a=ssrc:1234567890 mslabel:${this.generateRandomString(16)}
a=ssrc:1234567890 label:${this.generateRandomString(16)}
a=ssrc:1234567891 cname:${this.generateRandomString(16)}
a=ssrc:1234567891 msid:${this.generateRandomString(16)} ${this.generateRandomString(16)}
a=ssrc:1234567891 mslabel:${this.generateRandomString(16)}
a=ssrc:1234567891 label:${this.generateRandomString(16)}
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:${this.generateRandomString(8)}
a=ice-pwd:${this.generateRandomString(22)}
a=ice-options:trickle
a=fingerprint:sha-256 ${this.generateRandomString(64)}
a=setup:actpass
a=mid:1
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:106 CN/32000
a=rtpmap:105 CN/16000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:112 telephone-event/16000
a=rtpmap:113 telephone-event/8000
a=rtpmap:126 telephone-event/8000
a=ssrc:1234567892 cname:${this.generateRandomString(16)}
a=ssrc:1234567892 msid:${this.generateRandomString(16)} ${this.generateRandomString(16)}
a=ssrc:1234567892 mslabel:${this.generateRandomString(16)}
a=ssrc:1234567892 label:${this.generateRandomString(16)}`;

    return sdp;
  }

  /**
   * Check Agora availability
   */
  private async checkAgoraAvailability(): Promise<boolean> {
    try {
      // Check if Agora service is available
      const agoraHealth = await AgoraService.getRegionStats();
      return agoraHealth.length > 0;
    } catch (error) {
      this.logger.warn('Agora service unavailable, falling back to WebRTC');
      return false;
    }
  }

  /**
   * Generate peer ID
   */
  private generatePeerId(userId: string, streamId: string): string {
    return `peer_${userId}_${streamId}_${Date.now()}`;
  }

  /**
   * Generate random string
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get peer connection stats
   */
  async getPeerStats(peerId: string): Promise<any> {
    try {
      const peer = this.activePeers.get(peerId);
      if (!peer) {
        return null;
      }

      // Update last seen
      peer.lastSeen = new Date();

      return {
        peerId: peer.peerId,
        userId: peer.userId,
        streamId: peer.streamId,
        connectionState: peer.connectionState,
        quality: peer.quality,
        uptime: Date.now() - peer.lastSeen.getTime(),
        stats: peer.stats
      };
    } catch (error) {
      this.logger.error('Error getting peer stats:', error);
      return null;
    }
  }

  /**
   * Close peer connection
   */
  async closePeerConnection(peerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const peer = this.activePeers.get(peerId);
      if (!peer) {
        return {
          success: false,
          error: 'Peer not found'
        };
      }

      // Update connection state
      peer.connectionState = 'disconnected';

      // Remove from active peers
      this.activePeers.delete(peerId);

      // Remove from pending offers/answers
      this.pendingOffers.delete(peerId);
      this.pendingAnswers.delete(peerId);

      // Remove from cache
      await setCache(`webrtc_peer:${peerId}`, null, 0);
      await setCache(`webrtc_offer:${peerId}`, null, 0);

      this.logger.info(`Peer connection closed for ${peerId}`);

      return { success: true };
    } catch (error) {
      this.logger.error('Error closing peer connection:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all active peers
   */
  async getActivePeers(): Promise<WebRTCPeer[]> {
    return Array.from(this.activePeers.values());
  }

  /**
   * Cleanup inactive peers
   */
  async cleanupInactivePeers(): Promise<void> {
    try {
      const now = new Date();
      const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [peerId, peer] of this.activePeers) {
        if (now.getTime() - peer.lastSeen.getTime() > inactiveThreshold) {
          await this.closePeerConnection(peerId);
          this.logger.info(`Cleaned up inactive peer: ${peerId}`);
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up inactive peers:', error);
    }
  }

  /**
   * Get WebRTC service status
   */
  async getServiceStatus(): Promise<any> {
    return {
      enabled: this.config.fallbackEnabled,
      activePeers: this.activePeers.size,
      pendingOffers: this.pendingOffers.size,
      pendingAnswers: this.pendingAnswers.size,
      config: {
        maxBitrate: this.config.maxBitrate,
        qualityLevels: Object.keys(this.config.qualityLevels),
        iceServers: this.config.iceServers.length
      }
    };
  }
}

export const webRTCService = new WebRTCService();


