import { LiveStream, ILiveStream } from '../models/LiveStream';
import { User } from '../models/User';
import { Gift } from '../models/Gift';
import { logger } from '../config/logger';
import { io } from '../config/socket';
import crypto from 'crypto';

interface AnonymousStreamSettings {
  hiddenIdentity?: boolean;
  voiceChanger?: 'none' | 'low' | 'medium' | 'high';
  avatarMask?: string;
  displayName?: string;
  allowDirectMessages?: boolean;
  revealThreshold?: number;
  autoRevealDuration?: number; // in minutes
}

interface RevealIdentityRequest {
  streamId: string;
  viewerId: string;
  giftAmount?: number;
  forceReveal?: boolean; // For host to manually reveal
}

class AnonymousStreamService {
  private readonly DEFAULT_MASKS = [
    'ninja_mask',
    'butterfly_mask',
    'cosmic_mask',
    'mystery_mask',
    'dragon_mask',
    'phoenix_mask',
    'shadow_mask',
    'neon_mask'
  ];

  private readonly ANONYMOUS_NAMES = [
    'Mystery Star',
    'Shadow Streamer',
    'Hidden Gem',
    'Secret Voice',
    'Enigma Host',
    'Phantom Live',
    'Veiled Star',
    'Unknown Artist'
  ];

  /**
   * Create an anonymous stream
   */
  async createAnonymousStream(
    hostId: string,
    streamData: Partial<ILiveStream>,
    anonymousSettings?: AnonymousStreamSettings
  ): Promise<ILiveStream> {
    try {
      const host = await User.findById(hostId);
      if (!host) {
        throw new Error('Host not found');
      }

      // Check if host has permission for anonymous streaming (OG level 3+)
      if (host.ogLevel < 3) {
        throw new Error('Anonymous streaming requires OG Level 3 or higher');
      }

      // Generate anonymous display name and mask
      const displayName = anonymousSettings?.displayName || this.getRandomAnonymousName();
      const avatarMask = anonymousSettings?.avatarMask || this.getRandomMask();

      // Calculate auto-reveal time if specified
      let autoRevealAt;
      if (anonymousSettings?.autoRevealDuration) {
        autoRevealAt = new Date(Date.now() + anonymousSettings.autoRevealDuration * 60 * 1000);
      }

      // Create the stream with anonymous settings
      const stream = new LiveStream({
        ...streamData,
        hostId,
        isAnonymous: true,
        anonymousSettings: {
          hiddenIdentity: anonymousSettings?.hiddenIdentity ?? true,
          voiceChanger: anonymousSettings?.voiceChanger || 'medium',
          avatarMask,
          displayName,
          allowDirectMessages: anonymousSettings?.allowDirectMessages ?? false,
          revealThreshold: anonymousSettings?.revealThreshold || 10000, // Default 10k coins
          autoRevealAt,
          isRevealed: false
        },
        // Override title if not provided
        title: streamData.title || `${displayName} is LIVE!`,
        // Add anonymous tag
        tags: [...(streamData.tags || []), 'anonymous']
      });

      await stream.save();

      logger.info('Anonymous stream created', {
        streamId: stream._id,
        hostId,
        displayName,
        avatarMask
      });

      return stream;
    } catch (error) {
      logger.error('Failed to create anonymous stream', error);
      throw error;
    }
  }

  /**
   * Attempt to reveal anonymous host identity
   */
  async revealIdentity(request: RevealIdentityRequest): Promise<{
    success: boolean;
    revealed: boolean;
    hostInfo?: {
      username: string;
      avatar: string;
      userId: string;
    };
    message: string;
  }> {
    try {
      const stream = await LiveStream.findById(request.streamId);
      
      if (!stream) {
        throw new Error('Stream not found');
      }

      if (!stream.isAnonymous || !stream.anonymousSettings) {
        throw new Error('This is not an anonymous stream');
      }

      if (stream.anonymousSettings.isRevealed) {
        // Already revealed, return host info
        const host = await User.findById(stream.hostId);
        return {
          success: true,
          revealed: true,
          hostInfo: {
            username: host!.username,
            avatar: host!.avatar || '',
            userId: host!._id.toString()
          },
          message: 'Identity already revealed'
        };
      }

      // Check if it's the host trying to reveal themselves
      if (request.forceReveal && stream.hostId.toString() === request.viewerId) {
        return await this.performReveal(stream);
      }

      // Check if auto-reveal time has passed
      if (stream.anonymousSettings.autoRevealAt && new Date() >= stream.anonymousSettings.autoRevealAt) {
        return await this.performReveal(stream);
      }

      // Check if viewer has sent enough gifts
      if (request.giftAmount) {
        const totalGifts = await this.getTotalGiftsFromViewer(
          stream._id.toString(),
          request.viewerId
        );
        
        const totalAmount = totalGifts + request.giftAmount;
        
        if (totalAmount >= (stream.anonymousSettings.revealThreshold || 10000)) {
          return await this.performReveal(stream);
        } else {
          const remaining = (stream.anonymousSettings.revealThreshold || 10000) - totalAmount;
          return {
            success: false,
            revealed: false,
            message: `${remaining} more coins needed to reveal identity`
          };
        }
      }

      return {
        success: false,
        revealed: false,
        message: 'Identity remains hidden'
      };
    } catch (error: any) {
      logger.error('Failed to reveal identity', error);
      throw error;
    }
  }

  /**
   * Update anonymous stream settings
   */
  async updateAnonymousSettings(
    streamId: string,
    hostId: string,
    settings: Partial<AnonymousStreamSettings>
  ): Promise<ILiveStream> {
    try {
      const stream = await LiveStream.findById(streamId);
      
      if (!stream) {
        throw new Error('Stream not found');
      }

      if (stream.hostId.toString() !== hostId) {
        throw new Error('Unauthorized to update this stream');
      }

      if (!stream.isAnonymous || !stream.anonymousSettings) {
        throw new Error('This is not an anonymous stream');
      }

      // Update settings
      Object.assign(stream.anonymousSettings, settings);
      
      // Update auto-reveal time if duration changed
      if (settings.autoRevealDuration) {
        stream.anonymousSettings.autoRevealAt = new Date(
          Date.now() + settings.autoRevealDuration * 60 * 1000
        );
      }

      await stream.save();

      // Broadcast settings update to viewers
      this.broadcastAnonymousUpdate(stream);

      logger.info('Anonymous settings updated', {
        streamId,
        settings
      });

      return stream;
    } catch (error) {
      logger.error('Failed to update anonymous settings', error);
      throw error;
    }
  }

  /**
   * Get anonymous stream statistics
   */
  async getAnonymousStreamStats(streamId: string): Promise<{
    totalViewers: number;
    totalGifts: number;
    revealProgress: number;
    timeUntilAutoReveal?: string;
    topContributors: Array<{
      username: string;
      contribution: number;
      percentage: number;
    }>;
  }> {
    try {
      const stream = await LiveStream.findById(streamId);
      
      if (!stream || !stream.isAnonymous || !stream.anonymousSettings) {
        throw new Error('Anonymous stream not found');
      }

      const revealThreshold = stream.anonymousSettings.revealThreshold || 10000;
      const revealProgress = Math.min(100, (stream.totalCoins / revealThreshold) * 100);

      let timeUntilAutoReveal;
      if (stream.anonymousSettings.autoRevealAt) {
        const remaining = stream.anonymousSettings.autoRevealAt.getTime() - Date.now();
        if (remaining > 0) {
          const minutes = Math.floor(remaining / 60000);
          const seconds = Math.floor((remaining % 60000) / 1000);
          timeUntilAutoReveal = `${minutes}m ${seconds}s`;
        }
      }

      // Get top contributors (this would need gift tracking implementation)
      const topContributors = stream.analytics?.topGifters?.map(gifter => ({
        username: gifter.username,
        contribution: gifter.totalCoins,
        percentage: (gifter.totalCoins / revealThreshold) * 100
      })) || [];

      return {
        totalViewers: stream.totalViewers,
        totalGifts: stream.totalGifts,
        revealProgress,
        timeUntilAutoReveal,
        topContributors
      };
    } catch (error) {
      logger.error('Failed to get anonymous stream stats', error);
      throw error;
    }
  }

  /**
   * Generate anonymous link for sharing
   */
  async generateAnonymousLink(streamId: string): Promise<string> {
    try {
      const stream = await LiveStream.findById(streamId);
      
      if (!stream || !stream.isAnonymous) {
        throw new Error('Anonymous stream not found');
      }

      // Generate a unique anonymous link token
      const token = crypto.randomBytes(16).toString('hex');
      
      // Store token in stream metadata (would need to add this field)
      // For now, return a formatted link
      const baseUrl = process.env.APP_URL || 'https://halobuzz.com';
      const anonymousLink = `${baseUrl}/live/anonymous/${stream.streamKey}?t=${token}`;

      logger.info('Anonymous link generated', {
        streamId,
        link: anonymousLink
      });

      return anonymousLink;
    } catch (error) {
      logger.error('Failed to generate anonymous link', error);
      throw error;
    }
  }

  /**
   * Get list of active anonymous streams
   */
  async getActiveAnonymousStreams(limit: number = 20): Promise<ILiveStream[]> {
    try {
      return await LiveStream.find({
        status: 'live',
        isAnonymous: true,
        'anonymousSettings.isRevealed': false
      })
        .select('-hostId') // Don't expose host ID
        .sort({ currentViewers: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('Failed to get active anonymous streams', error);
      throw error;
    }
  }

  /**
   * Perform the actual reveal
   */
  private async performReveal(stream: ILiveStream): Promise<any> {
    const host = await User.findById(stream.hostId);
    
    if (!host) {
      throw new Error('Host not found');
    }

    // Update stream to mark as revealed
    stream.anonymousSettings!.isRevealed = true;
    await stream.save();

    // Broadcast reveal to all viewers
    this.broadcastIdentityReveal(stream, host);

    logger.info('Anonymous identity revealed', {
      streamId: stream._id,
      hostId: host._id,
      username: host.username
    });

    return {
      success: true,
      revealed: true,
      hostInfo: {
        username: host.username,
        avatar: host.avatar || '',
        userId: host._id.toString()
      },
      message: 'Identity revealed!'
    };
  }

  /**
   * Get total gifts from a viewer for a stream
   */
  private async getTotalGiftsFromViewer(
    streamId: string,
    viewerId: string
  ): Promise<number> {
    // This would need to be implemented with gift tracking
    // For now, return a placeholder
    return 0;
  }

  /**
   * Get random anonymous name
   */
  private getRandomAnonymousName(): string {
    const index = Math.floor(Math.random() * this.ANONYMOUS_NAMES.length);
    const suffix = Math.floor(Math.random() * 9999);
    return `${this.ANONYMOUS_NAMES[index]}_${suffix}`;
  }

  /**
   * Get random mask
   */
  private getRandomMask(): string {
    const index = Math.floor(Math.random() * this.DEFAULT_MASKS.length);
    return this.DEFAULT_MASKS[index];
  }

  /**
   * Broadcast anonymous settings update
   */
  private broadcastAnonymousUpdate(stream: ILiveStream): void {
    io.to(stream.agoraChannel).emit('anonymousSettingsUpdate', {
      streamId: stream._id,
      settings: {
        voiceChanger: stream.anonymousSettings?.voiceChanger,
        avatarMask: stream.anonymousSettings?.avatarMask,
        displayName: stream.anonymousSettings?.displayName
      }
    });
  }

  /**
   * Broadcast identity reveal
   */
  private broadcastIdentityReveal(stream: ILiveStream, host: any): void {
    io.to(stream.agoraChannel).emit('identityRevealed', {
      streamId: stream._id,
      hostInfo: {
        username: host.username,
        avatar: host.avatar,
        userId: host._id.toString(),
        followers: host.followers,
        ogLevel: host.ogLevel
      },
      message: '🎭 Identity Revealed! 🎭'
    });
  }
}

export const anonymousStreamService = new AnonymousStreamService();