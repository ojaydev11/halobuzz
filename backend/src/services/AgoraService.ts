import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

// Enhanced Agora configuration for global scaling
interface AgoraConfig {
  appId: string;
  appCertificate: string;
  regions: AgoraRegion[];
  adaptiveBitrate: boolean;
  globalCDN: boolean;
  autoScaling: boolean;
}

interface AgoraRegion {
  region: string;
  regionCode: string;
  priority: number;
  latency: number;
  capacity: number;
}

interface StreamQuality {
  resolution: string;
  bitrate: number;
  framerate: number;
  codec: string;
}

interface ChannelMetrics {
  channelName: string;
  viewerCount: number;
  publisherCount: number;
  bandwidth: number;
  latency: number;
  quality: StreamQuality;
  region: string;
  lastUpdated: Date;
}

class AgoraService {
  private config: AgoraConfig;
  private regions: Map<string, AgoraRegion>;
  private channelMetrics: Map<string, ChannelMetrics>;

  constructor() {
    this.config = this.initializeConfig();
    this.regions = new Map();
    this.channelMetrics = new Map();
    this.initializeRegions();
  }

  private initializeConfig(): AgoraConfig {
    return {
      appId: process.env.AGORA_APP_ID || '',
      appCertificate: process.env.AGORA_APP_CERTIFICATE || '',
      regions: [],
      adaptiveBitrate: process.env.AGORA_ADAPTIVE_BITRATE === 'true',
      globalCDN: process.env.AGORA_GLOBAL_CDN === 'true',
      autoScaling: process.env.AGORA_AUTO_SCALING === 'true',
    };
  }

  private initializeRegions(): void {
    // Initialize global regions with priority and capacity
    const regionConfigs: AgoraRegion[] = [
      {
        region: 'Asia Pacific',
        regionCode: 'ap-southeast-1',
        priority: 1,
        latency: 50,
        capacity: 10000
      },
      {
        region: 'Europe',
        regionCode: 'eu-west-1',
        priority: 2,
        latency: 80,
        capacity: 8000
      },
      {
        region: 'North America',
        regionCode: 'us-east-1',
        priority: 3,
        latency: 100,
        capacity: 12000
      },
      {
        region: 'South America',
        regionCode: 'sa-east-1',
        priority: 4,
        latency: 120,
        capacity: 5000
      },
      {
        region: 'Africa',
        regionCode: 'af-south-1',
        priority: 5,
        latency: 150,
        capacity: 3000
      }
    ];

    regionConfigs.forEach(region => {
      this.regions.set(region.regionCode, region);
    });
  }

  // Enhanced token generation with region optimization
  async generateToken(
    channelName: string,
    userId: string,
    role: 'publisher' | 'subscriber' = 'publisher',
    region?: string
  ): Promise<{
    success: boolean;
    token?: string;
    uid?: number;
    expiresAt?: number;
    region?: string;
    quality?: StreamQuality;
    error?: string;
  }> {
    try {
      if (!this.config.appId || !this.config.appCertificate) {
        throw new Error('Agora configuration missing');
      }

      // Determine optimal region
      const optimalRegion = region || await this.getOptimalRegion(userId);
      
      // Generate UID based on user ID for consistency
      const uid = this.generateConsistentUID(userId);
      
      // Set token expiration (24 hours)
      const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 24 * 3600;
      
      // Import Agora token library
      const { AgoraToken } = await import('agora-access-token') as any;
      const agoraToken = new AgoraToken(this.config.appId, this.config.appCertificate);
      
      // Set role
      const agoraRole = role === 'publisher' ? AgoraToken.Role.PUBLISHER : AgoraToken.Role.SUBSCRIBER;
      
      // Build token with enhanced privileges
      const token = agoraToken.buildTokenWithUid(channelName, uid, agoraRole, privilegeExpiredTs);
      
      // Cache token for reuse
      await setCache(`agora:token:${channelName}:${userId}`, {
        token,
        uid,
        expiresAt: privilegeExpiredTs,
        region: optimalRegion,
        role
      }, 3600); // 1 hour cache
      
      // Get optimal quality settings
      const quality = await this.getOptimalQuality(channelName, optimalRegion);
      
      logger.info(`Enhanced Agora token generated for channel: ${channelName}, user: ${userId}, region: ${optimalRegion}`);
      
      return {
        success: true,
        token,
        uid,
        expiresAt: privilegeExpiredTs,
        region: optimalRegion,
        quality
      };
      
    } catch (error) {
      logger.error('Enhanced Agora token generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token generation failed'
      };
    }
  }

  // Get optimal region based on user location and capacity
  private async getOptimalRegion(userId: string): Promise<string> {
    try {
      // Check cached region for user
      const cachedRegion = await getCache(`agora:region:${userId}`);
      if (cachedRegion) {
        return cachedRegion;
      }

      // For now, use a simple heuristic based on user ID
      // In production, this would use geolocation data
      const regions = Array.from(this.regions.values()).sort((a, b) => a.priority - b.priority);
      
      // Select region with lowest latency and available capacity
      const optimalRegion = regions.find(region => region.capacity > 0) || regions[0];
      
      // Cache region selection
      await setCache(`agora:region:${userId}`, optimalRegion.regionCode, 3600);
      
      return optimalRegion.regionCode;
    } catch (error) {
      logger.error('Error determining optimal region:', error);
      return 'ap-southeast-1'; // Default to Asia Pacific
    }
  }

  // Generate consistent UID based on user ID
  private generateConsistentUID(userId: string): number {
    // Create a consistent UID from user ID hash
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000000; // Ensure positive and within Agora limits
  }

  // Get optimal quality settings based on channel metrics
  private async getOptimalQuality(channelName: string, region: string): Promise<StreamQuality> {
    try {
      const metrics = await this.getChannelMetrics(channelName);
      
      if (metrics.viewerCount > 1000) {
        // High viewer count - optimize for bandwidth
        return {
          resolution: '720p',
          bitrate: 1500,
          framerate: 30,
          codec: 'H.264'
        };
      } else if (metrics.viewerCount > 100) {
        // Medium viewer count - balanced quality
        return {
          resolution: '1080p',
          bitrate: 2500,
          framerate: 30,
          codec: 'H.264'
        };
      } else {
        // Low viewer count - high quality
        return {
          resolution: '1080p',
          bitrate: 4000,
          framerate: 60,
          codec: 'H.264'
        };
      }
    } catch (error) {
      logger.error('Error getting optimal quality:', error);
      // Default quality
      return {
        resolution: '720p',
        bitrate: 1500,
        framerate: 30,
        codec: 'H.264'
      };
    }
  }

  // Update channel metrics for auto-scaling
  async updateChannelMetrics(channelName: string, metrics: Partial<ChannelMetrics>): Promise<void> {
    try {
      const existingMetrics = this.channelMetrics.get(channelName) || {
        channelName,
        viewerCount: 0,
        publisherCount: 0,
        bandwidth: 0,
        latency: 0,
        quality: {
          resolution: '720p',
          bitrate: 1500,
          framerate: 30,
          codec: 'H.264'
        },
        region: 'ap-southeast-1',
        lastUpdated: new Date()
      };

      const updatedMetrics: ChannelMetrics = {
        ...existingMetrics,
        ...metrics,
        lastUpdated: new Date()
      };

      this.channelMetrics.set(channelName, updatedMetrics);
      
      // Cache metrics for external access
      await setCache(`agora:metrics:${channelName}`, updatedMetrics, 300); // 5 minutes
      
      // Trigger auto-scaling if enabled
      if (this.config.autoScaling) {
        await this.triggerAutoScaling(channelName, updatedMetrics);
      }
      
      logger.info(`Channel metrics updated for ${channelName}: ${metrics.viewerCount} viewers`);
    } catch (error) {
      logger.error('Error updating channel metrics:', error);
    }
  }

  // Get channel metrics
  async getChannelMetrics(channelName: string): Promise<ChannelMetrics> {
    try {
      // Check cache first
      const cachedMetrics = await getCache(`agora:metrics:${channelName}`);
      if (cachedMetrics) {
        return cachedMetrics;
      }

      // Return default metrics if not found
      return {
        channelName,
        viewerCount: 0,
        publisherCount: 0,
        bandwidth: 0,
        latency: 0,
        quality: {
          resolution: '720p',
          bitrate: 1500,
          framerate: 30,
          codec: 'H.264'
        },
        region: 'ap-southeast-1',
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting channel metrics:', error);
      throw error;
    }
  }

  // Trigger auto-scaling based on metrics
  private async triggerAutoScaling(channelName: string, metrics: ChannelMetrics): Promise<void> {
    try {
      const region = this.regions.get(metrics.region);
      if (!region) return;

      // Scale up if capacity is high
      if (metrics.viewerCount > region.capacity * 0.8) {
        logger.info(`Auto-scaling triggered for channel ${channelName}: ${metrics.viewerCount} viewers`);
        
        // In production, this would trigger infrastructure scaling
        // For now, we'll just log and update capacity
        region.capacity = Math.min(region.capacity * 1.5, 50000);
        
        // Update quality settings for better performance
        if (metrics.viewerCount > 5000) {
          await this.updateChannelMetrics(channelName, {
            quality: {
              resolution: '720p',
              bitrate: 1200,
              framerate: 30,
              codec: 'H.264'
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error in auto-scaling:', error);
    }
  }

  // Refresh token with enhanced features
  async refreshToken(
    channelName: string,
    userId: string,
    role: 'publisher' | 'subscriber' = 'publisher'
  ): Promise<{
    success: boolean;
    token?: string;
    uid?: number;
    expiresAt?: number;
    region?: string;
    quality?: StreamQuality;
    error?: string;
  }> {
    try {
      // Check if we have a cached token
      const cachedToken = await getCache(`agora:token:${channelName}:${userId}`);
      if (cachedToken && cachedToken.expiresAt > Date.now() / 1000 + 3600) {
        // Token is still valid for more than 1 hour
        return {
          success: true,
          token: cachedToken.token,
          uid: cachedToken.uid,
          expiresAt: cachedToken.expiresAt,
          region: cachedToken.region,
          quality: await this.getOptimalQuality(channelName, cachedToken.region)
        };
      }

      // Generate new token
      return await this.generateToken(channelName, userId, role);
    } catch (error) {
      logger.error('Error refreshing Agora token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  // Get all active channels
  async getActiveChannels(): Promise<ChannelMetrics[]> {
    try {
      const channels: ChannelMetrics[] = [];
      
      for (const [channelName, metrics] of this.channelMetrics) {
        if (metrics.viewerCount > 0) {
          channels.push(metrics);
        }
      }
      
      return channels.sort((a, b) => b.viewerCount - a.viewerCount);
    } catch (error) {
      logger.error('Error getting active channels:', error);
      return [];
    }
  }

  // Get region statistics
  async getRegionStats(): Promise<{ region: string; capacity: number; activeChannels: number }[]> {
    try {
      const stats: { region: string; capacity: number; activeChannels: number }[] = [];
      
      for (const [regionCode, region] of this.regions) {
        const activeChannels = Array.from(this.channelMetrics.values())
          .filter(metrics => metrics.region === regionCode && metrics.viewerCount > 0)
          .length;
        
        stats.push({
          region: region.region,
          capacity: region.capacity,
          activeChannels
        });
      }
      
      return stats.sort((a, b) => b.activeChannels - a.activeChannels);
    } catch (error) {
      logger.error('Error getting region stats:', error);
      return [];
    }
  }
}

// Export singleton instance
export const agoraService = new AgoraService();
export default agoraService;
