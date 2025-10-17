/**
 * Spectator Mode Service for E-Sports Broadcasting
 * Professional tournament viewing and streaming capabilities
 */

import { gamesAPI } from './GamesAPI';
import { socketManager } from './SocketManager';
import { useAuth } from '@/store/AuthContext';

export interface SpectatorRoom {
  roomId: string;
  tournamentId: string;
  gameId: string;
  players: SpectatorPlayer[];
  spectators: SpectatorUser[];
  maxSpectators: number;
  isLive: boolean;
  streamUrl?: string;
  viewerCount: number;
  chatEnabled: boolean;
  currentRound: number;
  totalRounds: number;
  leaderboard: SpectatorLeaderboardEntry[];
}

export interface SpectatorPlayer {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  rank: number;
  status: 'playing' | 'eliminated' | 'winner';
  stats: PlayerStats;
  cameraView: 'first' | 'third' | 'overview';
}

export interface SpectatorUser {
  userId: string;
  username: string;
  isStreamer: boolean;
  streamerTitle?: string;
  viewerCount?: number;
  platform?: 'twitch' | 'youtube' | 'facebook';
  streamUrl?: string;
}

export interface SpectatorLeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
  change: 'up' | 'down' | 'same';
  stats: PlayerStats;
}

export interface PlayerStats {
  kills?: number;
  deaths?: number;
  assists?: number;
  accuracy?: number;
  reactionTime?: number;
  wins?: number;
  losses?: number;
  streak?: number;
}

export interface BroadcastSettings {
  quality: '720p' | '1080p' | '1440p' | '4K';
  fps: 30 | 60 | 120;
  bitrate: number;
  codec: 'h264' | 'h265' | 'av1';
  audioEnabled: boolean;
  chatOverlay: boolean;
  spectatorHUD: boolean;
  playerTags: boolean;
  minimap: boolean;
}

export interface StreamingConfig {
  platform: 'twitch' | 'youtube' | 'facebook' | 'custom';
  streamKey?: string;
  serverUrl?: string;
  streamTitle?: string;
  streamDescription?: string;
  tags?: string[];
  category?: string;
}

export interface SpectatorChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  isStreamer?: boolean;
  isModerator?: boolean;
  isSubscriber?: boolean;
  badges?: string[];
}

export class SpectatorService {
  private static instance: SpectatorService;
  private spectatorRooms: Map<string, SpectatorRoom> = new Map();
  private activeStreams: Map<string, StreamingConfig> = new Map();
  private viewerCounts: Map<string, number> = new Map();
  private streamBuffers: Map<string, any[]> = new Map();
  
  // OBS/WebRTC integration
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private mediaStreams: Map<string, MediaStream> = new Map();
  
  // Broadcasting settings
  private readonly DEFAULT_SETTINGS: BroadcastSettings = {
    quality: '1080p',
    fps: 60,
    bitrate: 6000,
    codec: 'h264',
    audioEnabled: true,
    chatOverlay: true,
    spectatorHUD: true,
    playerTags: true,
    minimap: true
  };

  private constructor() {
    this.initializeWebRTC();
    this.setupStreamMonitoring();
  }

  static getInstance(): SpectatorService {
    if (!SpectatorService.instance) {
      SpectatorService.instance = new SpectatorService();
    }
    return SpectatorService.instance;
  }

  /**
   * Initialize WebRTC for low-latency streaming
   */
  private async initializeWebRTC() {
    // Set up STUN/TURN servers for NAT traversal
    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Add TURN servers for production
      // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' }
    ];

    // Create peer connection factory
    this.createPeerConnection = (roomId: string) => {
      const pc = new RTCPeerConnection({ iceServers });
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketManager.sendICECandidate(roomId, event.candidate);
        }
      };

      pc.ontrack = (event) => {
        this.handleIncomingStream(roomId, event.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        console.log(`WebRTC connection state: ${pc.connectionState}`);
      };

      this.peerConnections.set(roomId, pc);
      return pc;
    };
  }

  /**
   * Create a new spectator room for tournament broadcasting
   */
  public async createSpectatorRoom(
    tournamentId: string,
    gameId: string,
    maxSpectators: number = 10000
  ): Promise<SpectatorRoom> {
    try {
      const roomId = `spectator_${tournamentId}_${Date.now()}`;
      
      const room: SpectatorRoom = {
        roomId,
        tournamentId,
        gameId,
        players: [],
        spectators: [],
        maxSpectators,
        isLive: false,
        viewerCount: 0,
        chatEnabled: true,
        currentRound: 1,
        totalRounds: 3,
        leaderboard: []
      };

      this.spectatorRooms.set(roomId, room);

      // Set up WebRTC for the room
      this.createPeerConnection(roomId);

      // Notify tournament service
      await gamesAPI.createSpectatorRoom({
        roomId,
        tournamentId,
        gameId,
        maxSpectators
      });

      console.log(`Spectator room created: ${roomId}`);
      return room;

    } catch (error) {
      console.error('Failed to create spectator room:', error);
      throw error;
    }
  }

  /**
   * Join a spectator room as a viewer
   */
  public async joinSpectatorRoom(
    roomId: string,
    userId: string,
    username: string,
    isStreamer: boolean = false
  ): Promise<SpectatorRoom> {
    const room = this.spectatorRooms.get(roomId);
    if (!room) {
      throw new Error('Spectator room not found');
    }

    if (room.spectators.length >= room.maxSpectators) {
      throw new Error('Spectator room is full');
    }

    // Add spectator
    const spectator: SpectatorUser = {
      userId,
      username,
      isStreamer,
      viewerCount: isStreamer ? 0 : undefined
    };

    room.spectators.push(spectator);
    room.viewerCount++;

    // Update viewer count
    this.viewerCounts.set(roomId, room.viewerCount);

    // Set up WebRTC connection
    const pc = this.peerConnections.get(roomId);
    if (pc) {
      await this.setupViewerConnection(roomId, userId, pc);
    }

    // Notify room of new spectator
    socketManager.broadcastSpectatorJoined(roomId, spectator);

    return room;
  }

  /**
   * Set up streaming configuration for content creators
   */
  public async setupStreaming(
    roomId: string,
    userId: string,
    config: StreamingConfig
  ): Promise<StreamingConfig> {
    try {
      // Validate stream key if provided
      if (config.streamKey) {
        const isValid = await this.validateStreamKey(config.platform, config.streamKey);
        if (!isValid) {
          throw new Error('Invalid stream key');
        }
      }

      // Set up RTMP streaming if configured
      if (config.serverUrl) {
        await this.setupRTMPStreaming(roomId, userId, config);
      }

      // Store streaming configuration
      this.activeStreams.set(`${roomId}_${userId}`, config);

      // Update spectator as streamer
      const room = this.spectatorRooms.get(roomId);
      if (room) {
        const spectator = room.spectators.find(s => s.userId === userId);
        if (spectator) {
          spectator.isStreamer = true;
          spectator.platform = config.platform;
          spectator.streamUrl = config.serverUrl;
          spectator.streamerTitle = config.streamTitle;
        }
      }

      console.log(`Streaming configured for ${userId} in room ${roomId}`);
      return config;

    } catch (error) {
      console.error('Failed to setup streaming:', error);
      throw error;
    }
  }

  /**
   * Start broadcasting a game session
   */
  public async startBroadcast(
    roomId: string,
    settings?: Partial<BroadcastSettings>
  ): Promise<MediaStream> {
    try {
      const room = this.spectatorRooms.get(roomId);
      if (!room) {
        throw new Error('Spectator room not found');
      }

      const broadcastSettings = { ...this.DEFAULT_SETTINGS, ...settings };
      
      // Get media stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: this.getResolutionWidth(broadcastSettings.quality),
          height: this.getResolutionHeight(broadcastSettings.quality),
          frameRate: broadcastSettings.fps
        },
        audio: broadcastSettings.audioEnabled
      });

      // Store stream
      this.mediaStreams.set(roomId, stream);

      // Set up WebRTC streaming
      await this.setupWebRTCStreaming(roomId, stream, broadcastSettings);

      // Update room status
      room.isLive = true;
      room.streamUrl = URL.createObjectURL(stream);

      // Set up stream monitoring
      this.monitorStreamQuality(roomId, stream);

      console.log(`Broadcast started for room ${roomId}`);
      return stream;

    } catch (error) {
      console.error('Failed to start broadcast:', error);
      throw error;
    }
  }

  /**
   * Update player statistics for spectators
   */
  public updatePlayerStats(
    roomId: string,
    playerId: string,
    stats: PlayerStats
  ): void {
    const room = this.spectatorRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.userId === playerId);
    if (player) {
      player.stats = { ...player.stats, ...stats };
    }

    // Update leaderboard
    this.updateLeaderboard(roomId);

    // Broadcast update
    socketManager.broadcastPlayerStatsUpdate(roomId, playerId, stats);
  }

  /**
   * Update tournament leaderboard
   */
  private updateLeaderboard(roomId: string): void {
    const room = this.spectatorRooms.get(roomId);
    if (!room) return;

    const leaderboard = room.players
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        userId: player.userId,
        username: player.username,
        score: player.score,
        rank: index + 1,
        change: this.calculateRankChange(player.userId, index + 1, roomId),
        stats: player.stats
      }));

    room.leaderboard = leaderboard;

    // Broadcast leaderboard update
    socketManager.broadcastLeaderboardUpdate(roomId, leaderboard);
  }

  /**
   * Add chat message to spectator room
   */
  public addChatMessage(
    roomId: string,
    userId: string,
    message: string,
    badges: string[] = []
  ): SpectatorChatMessage {
    const room = this.spectatorRooms.get(roomId);
    if (!room || !room.chatEnabled) {
      throw new Error('Chat is disabled for this room');
    }

    const spectator = room.spectators.find(s => s.userId === userId);
    const chatMessage: SpectatorChatMessage = {
      id: `chat_${Date.now()}_${Math.random()}`,
      userId,
      username: spectator?.username || 'Unknown',
      message: this.sanitizeMessage(message),
      timestamp: Date.now(),
      isStreamer: spectator?.isStreamer || false,
      badges
    };

    // Broadcast chat message
    socketManager.broadcastChatMessage(roomId, chatMessage);

    return chatMessage;
  }

  /**
   * Set up WebRTC streaming for low-latency broadcast
   */
  private async setupWebRTCStreaming(
    roomId: string,
    stream: MediaStream,
    settings: BroadcastSettings
  ): Promise<void> {
    const pc = this.peerConnections.get(roomId);
    if (!pc) return;

    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Create offer
    const offer = await pc.createOffer({
      offerToReceiveVideo: false,
      offerToReceiveAudio: false
    });

    await pc.setLocalDescription(offer);

    // Send offer to server for distribution
    socketManager.sendWebRTCOffer(roomId, offer);
  }

  /**
   * Set up RTMP streaming for platforms like Twitch/YouTube
   */
  private async setupRTMPStreaming(
    roomId: string,
    userId: string,
    config: StreamingConfig
  ): Promise<void> {
    try {
      // In a real implementation, this would connect to RTMP servers
      // For now, we'll simulate the connection
      const rtmpUrl = this.buildRTMPUrl(config.platform, config.serverUrl);
      
      console.log(`RTMP streaming configured: ${rtmpUrl}`);
      
      // Store RTMP configuration
      await gamesAPI.setupRTMPStreaming({
        roomId,
        userId,
        rtmpUrl,
        streamKey: config.streamKey,
        quality: '1080p60'
      });

    } catch (error) {
      console.error('Failed to setup RTMP streaming:', error);
      throw error;
    }
  }

  /**
   * Monitor stream quality and performance
   */
  private monitorStreamQuality(roomId: string, stream: MediaStream): void {
    const checkInterval = setInterval(() => {
      if (stream.active) {
        // Check for frozen frames
        this.detectFrozenFrames(roomId, stream);
        
        // Monitor audio levels
        this.monitorAudioLevels(roomId, stream);
        
        // Check connection quality
        this.checkConnectionQuality(roomId);
      } else {
        clearInterval(checkInterval);
        this.handleStreamEnded(roomId);
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Handle incoming WebRTC stream
   */
  private handleIncomingStream(roomId: string, stream: MediaStream): void {
    // Store stream for playback
    this.mediaStreams.set(`viewer_${roomId}`, stream);

    // Notify UI of incoming stream
    socketManager.broadcastStreamUpdate(roomId, {
      type: 'stream_started',
      streamId: stream.id,
      timestamp: Date.now()
    });
  }

  /**
   * Set up viewer connection for WebRTC
   */
  private async setupViewerConnection(
    roomId: string,
    userId: string,
    pc: RTCPeerConnection
  ): Promise<void> {
    // Listen for WebRTC offers
    socketManager.onWebRTCOffer(async (offer) => {
      await pc.setRemoteDescription(offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketManager.sendWebRTCAnswer(roomId, answer);
    });

    // Listen for ICE candidates
    socketManager.onICECandidate(async (candidate) => {
      await pc.addIceCandidate(candidate);
    });
  }

  /**
   * Validate stream key for external platforms
   */
  private async validateStreamKey(platform: string, streamKey: string): Promise<boolean> {
    try {
      const response = await gamesAPI.validateStreamKey(platform, streamKey);
      return response.data.isValid;
    } catch (error) {
      console.error('Stream key validation failed:', error);
      return false;
    }
  }

  /**
   * Build RTMP URL for streaming platforms
   */
  private buildRTMPUrl(platform: string, serverUrl?: string): string {
    if (serverUrl) return serverUrl;

    // Default RTMP URLs for popular platforms
    const rtmpUrls = {
      twitch: 'rtmp://live.twitch.tv/live',
      youtube: 'rtmp://a.rtmp.youtube.com/live2',
      facebook: 'rtmp://live-api-s.facebook.com:80/rtmp',
      custom: 'rtmp://localhost:1935/live'
    };

    return rtmpUrls[platform as keyof typeof rtmpUrls] || rtmpUrls.custom;
  }

  /**
   * Get resolution dimensions
   */
  private getResolutionWidth(quality: string): number {
    const resolutions = {
      '720p': 1280,
      '1080p': 1920,
      '1440p': 2560,
      '4K': 3840
    };
    return resolutions[quality as keyof typeof resolutions] || 1920;
  }

  private getResolutionHeight(quality: string): number {
    const resolutions = {
      '720p': 720,
      '1080p': 1080,
      '1440p': 1440,
      '4K': 2160
    };
    return resolutions[quality as keyof typeof resolutions] || 1080;
  }

  /**
   * Calculate rank change for leaderboard
   */
  private calculateRankChange(userId: string, newRank: number, roomId: string): 'up' | 'down' | 'same' {
    // This would track historical ranks per user
    // For now, return 'same' as default
    return 'same';
  }

  /**
   * Sanitize chat messages
   */
  private sanitizeMessage(message: string): string {
    // Basic profanity filter
    const profanity = ['badword1', 'badword2']; // Add actual profanity list
    let sanitized = message;
    
    profanity.forEach(word => {
      const regex = new RegExp(word, 'gi');
      sanitized = sanitized.replace(regex, '*'.repeat(word.length));
    });

    return sanitized;
  }

  /**
   * Set up stream monitoring
   */
  private setupStreamMonitoring() {
    setInterval(() => {
      this.viewerCounts.forEach((count, roomId) => {
        // Update viewer counts
        socketManager.broadcastViewerCount(roomId, count);
      });
    }, 30000); // Update every 30 seconds
  }

  /**
   * Handle stream ended
   */
  private handleStreamEnded(roomId: string): void {
    const room = this.spectatorRooms.get(roomId);
    if (room) {
      room.isLive = false;
      room.streamUrl = undefined;
    }

    this.mediaStreams.delete(roomId);
    socketManager.broadcastStreamEnded(roomId);
  }

  /**
   * Detect frozen frames in stream
   */
  private detectFrozenFrames(roomId: string, stream: MediaStream): void {
    // Implementation would analyze video frames
    // For now, log the check
    console.log(`Checking for frozen frames in room ${roomId}`);
  }

  /**
   * Monitor audio levels
   */
  private monitorAudioLevels(roomId: string, stream: MediaStream): void {
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      // Implementation would analyze audio levels
      console.log(`Monitoring audio levels for room ${roomId}`);
    }
  }

  /**
   * Check connection quality
   */
  private checkConnectionQuality(roomId: string): void {
    const pc = this.peerConnections.get(roomId);
    if (pc) {
      const stats = pc.getStats();
      // Implementation would analyze connection stats
      console.log(`Connection state: ${pc.connectionState}`);
    }
  }

  /**
   * Get room statistics
   */
  public getRoomStats(roomId: string): any {
    const room = this.spectatorRooms.get(roomId);
    if (!room) return null;

    return {
      viewerCount: room.viewerCount,
      isLive: room.isLive,
      leaderboard: room.leaderboard,
      players: room.players.length,
      spectators: room.spectators.length,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds
    };
  }

  /**
   * Get all active rooms
   */
  public getActiveRooms(): SpectatorRoom[] {
    return Array.from(this.spectatorRooms.values());
  }

  /**
   * Get streaming configuration
   */
  public getStreamingConfig(roomId: string, userId: string): StreamingConfig | undefined {
    return this.activeStreams.get(`${roomId}_${userId}`);
  }
}

// Export singleton instance
export const spectatorService = SpectatorService.getInstance();