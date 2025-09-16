import mongoose from 'mongoose';
import { LinkCast, ILinkCast } from '../models/LinkCast';
import { LiveStream } from '../models/LiveStream';
import { User } from '../models/User';
import { notificationService } from './notificationService';
import { logger } from '../config/logger';
import RtcTokenBuilder from 'agora-access-token';

interface LinkCastRequest {
  primaryHostId: string;
  secondaryHostId: string;
  primaryStreamId: string;
  settings?: {
    splitScreen?: boolean;
    audioMix?: boolean;
    maxDuration?: number;
    revenueShare?: {
      primaryHost: number;
      secondaryHost: number;
    };
  };
}

class LinkCastService {
  private readonly APP_ID = process.env.AGORA_APP_ID || '';
  private readonly APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';
  private readonly TOKEN_EXPIRY = 86400; // 24 hours

  /**
   * Create a new LinkCast invitation
   */
  async createLinkCastInvitation(request: LinkCastRequest): Promise<ILinkCast> {
    try {
      // Validate both hosts exist
      const [primaryHost, secondaryHost] = await Promise.all([
        User.findById(request.primaryHostId),
        User.findById(request.secondaryHostId)
      ]);

      if (!primaryHost || !secondaryHost) {
        throw new Error('One or both hosts not found');
      }

      // Check if primary host is currently streaming
      const primaryStream = await LiveStream.findById(request.primaryStreamId);
      if (!primaryStream || primaryStream.status !== 'live') {
        throw new Error('Primary host must be live to send LinkCast invitation');
      }

      // Check if secondary host is available (not in another LinkCast)
      const existingLinkCast = await LinkCast.findOne({
        $or: [
          { primaryHostId: request.secondaryHostId },
          { secondaryHostId: request.secondaryHostId }
        ],
        status: 'active'
      });

      if (existingLinkCast) {
        throw new Error('Secondary host is already in a LinkCast session');
      }

      // Create LinkCast session
      const linkCast = new LinkCast({
        primaryHostId: request.primaryHostId,
        secondaryHostId: request.secondaryHostId,
        primaryStreamId: request.primaryStreamId,
        crossCountry: {
          primaryCountry: primaryHost.country,
          secondaryCountry: secondaryHost.country
        },
        settings: request.settings || {}
      });

      // Generate Agora tokens for both hosts
      linkCast.agoraTokenPrimary = this.generateAgoraToken(
        linkCast.agoraChannel,
        request.primaryHostId
      );
      linkCast.agoraTokenSecondary = this.generateAgoraToken(
        linkCast.agoraChannel,
        request.secondaryHostId
      );

      await linkCast.save();

      // Send notification to secondary host
      await notificationService.sendNotification(request.secondaryHostId, {
        title: 'LinkCast Invitation',
        body: `${primaryHost.username} wants to go live with you!`,
        data: {
          type: 'linkcast_invitation',
          linkCastId: linkCast._id.toString(),
          primaryHostUsername: primaryHost.username,
          primaryHostAvatar: primaryHost.avatar
        }
      });

      logger.info('LinkCast invitation created', {
        linkCastId: linkCast._id,
        primaryHost: primaryHost.username,
        secondaryHost: secondaryHost.username
      });

      return linkCast;
    } catch (error) {
      logger.error('Failed to create LinkCast invitation', error);
      throw error;
    }
  }

  /**
   * Accept a LinkCast invitation
   */
  async acceptInvitation(linkCastId: string, userId: string): Promise<ILinkCast> {
    try {
      const linkCast = await LinkCast.findById(linkCastId);
      
      if (!linkCast) {
        throw new Error('LinkCast invitation not found');
      }

      if (linkCast.secondaryHostId.toString() !== userId) {
        throw new Error('Unauthorized to accept this invitation');
      }

      if (linkCast.status !== 'pending') {
        throw new Error('Invitation is no longer valid');
      }

      // Check if invitation has expired (10 minutes)
      const expiryTime = new Date(linkCast.invitedAt.getTime() + 10 * 60 * 1000);
      if (new Date() > expiryTime) {
        linkCast.status = 'rejected';
        linkCast.rejectionReason = 'Invitation expired';
        await linkCast.save();
        throw new Error('Invitation has expired');
      }

      // Accept the invitation
      linkCast.acceptInvitation();
      await linkCast.save();

      // Create a secondary stream for the second host
      const secondaryStream = new LiveStream({
        hostId: linkCast.secondaryHostId,
        title: `LinkCast with ${await this.getHostUsername(linkCast.primaryHostId)}`,
        category: 'entertainment',
        isAudioOnly: false,
        streamKey: `linkcast_secondary_${linkCast.linkCode}`,
        agoraChannel: linkCast.agoraChannel,
        agoraToken: linkCast.agoraTokenSecondary,
        status: 'live',
        startedAt: new Date()
      });

      await secondaryStream.save();
      
      linkCast.secondaryStreamId = secondaryStream._id as any;
      await linkCast.save();

      // Notify primary host
      await notificationService.sendNotification(linkCast.primaryHostId.toString(), {
        title: 'LinkCast Accepted',
        body: `${await this.getHostUsername(linkCast.secondaryHostId)} joined your LinkCast!`,
        data: {
          type: 'linkcast_accepted',
          linkCastId: linkCast._id.toString()
        }
      });

      logger.info('LinkCast invitation accepted', {
        linkCastId: linkCast._id,
        secondaryHostId: userId
      });

      return linkCast;
    } catch (error) {
      logger.error('Failed to accept LinkCast invitation', error);
      throw error;
    }
  }

  /**
   * Reject a LinkCast invitation
   */
  async rejectInvitation(linkCastId: string, userId: string, reason?: string): Promise<void> {
    try {
      const linkCast = await LinkCast.findById(linkCastId);
      
      if (!linkCast) {
        throw new Error('LinkCast invitation not found');
      }

      if (linkCast.secondaryHostId.toString() !== userId) {
        throw new Error('Unauthorized to reject this invitation');
      }

      if (linkCast.status !== 'pending') {
        throw new Error('Invitation is no longer valid');
      }

      linkCast.rejectInvitation(reason || 'User declined');
      await linkCast.save();

      // Notify primary host
      await notificationService.sendNotification(linkCast.primaryHostId.toString(), {
        title: 'LinkCast Declined',
        body: `${await this.getHostUsername(linkCast.secondaryHostId)} declined your LinkCast invitation`,
        data: {
          type: 'linkcast_rejected',
          linkCastId: linkCast._id.toString()
        }
      });

      logger.info('LinkCast invitation rejected', {
        linkCastId: linkCast._id,
        secondaryHostId: userId,
        reason
      });
    } catch (error) {
      logger.error('Failed to reject LinkCast invitation', error);
      throw error;
    }
  }

  /**
   * End a LinkCast session
   */
  async endLinkCast(linkCastId: string, userId: string): Promise<void> {
    try {
      const linkCast = await LinkCast.findById(linkCastId);
      
      if (!linkCast) {
        throw new Error('LinkCast session not found');
      }

      // Check if user is one of the hosts
      const isPrimaryHost = linkCast.primaryHostId.toString() === userId;
      const isSecondaryHost = linkCast.secondaryHostId.toString() === userId;
      
      if (!isPrimaryHost && !isSecondaryHost) {
        throw new Error('Unauthorized to end this LinkCast');
      }

      if (linkCast.status !== 'active') {
        throw new Error('LinkCast is not active');
      }

      // End the session
      linkCast.endSession();
      await linkCast.save();

      // End both streams if they exist
      if (linkCast.primaryStreamId) {
        const primaryStream = await LiveStream.findById(linkCast.primaryStreamId);
        if (primaryStream && primaryStream.status === 'live') {
          primaryStream.endStream();
          await primaryStream.save();
        }
      }

      if (linkCast.secondaryStreamId) {
        const secondaryStream = await LiveStream.findById(linkCast.secondaryStreamId);
        if (secondaryStream && secondaryStream.status === 'live') {
          secondaryStream.endStream();
          await secondaryStream.save();
        }
      }

      // Notify both hosts
      const otherHostId = isPrimaryHost ? 
        linkCast.secondaryHostId.toString() : 
        linkCast.primaryHostId.toString();

      await notificationService.sendNotification(otherHostId, {
        title: 'LinkCast Ended',
        body: 'Your LinkCast session has ended',
        data: {
          type: 'linkcast_ended',
          linkCastId: linkCast._id.toString()
        }
      });

      logger.info('LinkCast session ended', {
        linkCastId: linkCast._id,
        endedBy: userId
      });
    } catch (error) {
      logger.error('Failed to end LinkCast session', error);
      throw error;
    }
  }

  /**
   * Get active LinkCast sessions
   */
  async getActiveLinkCasts(limit: number = 20): Promise<ILinkCast[]> {
    try {
      return await LinkCast.findActive();
    } catch (error) {
      logger.error('Failed to get active LinkCast sessions', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<ILinkCast[]> {
    try {
      return await LinkCast.findPendingInvitations(userId);
    } catch (error) {
      logger.error('Failed to get pending LinkCast invitations', error);
      throw error;
    }
  }

  /**
   * Update LinkCast analytics
   */
  async updateAnalytics(linkCastId: string, analytics: Partial<ILinkCast['analytics']>): Promise<void> {
    try {
      const linkCast = await LinkCast.findById(linkCastId);
      
      if (!linkCast) {
        throw new Error('LinkCast session not found');
      }

      Object.assign(linkCast.analytics, analytics);
      
      // Update peak viewers
      if (analytics.totalViewers && analytics.totalViewers > linkCast.analytics.peakViewers) {
        linkCast.analytics.peakViewers = analytics.totalViewers;
      }

      await linkCast.save();

      logger.debug('LinkCast analytics updated', {
        linkCastId,
        analytics
      });
    } catch (error) {
      logger.error('Failed to update LinkCast analytics', error);
      throw error;
    }
  }

  /**
   * Process gift for LinkCast session
   */
  async processGift(linkCastId: string, giftCoins: number): Promise<void> {
    try {
      const linkCast = await LinkCast.findById(linkCastId);
      
      if (!linkCast) {
        throw new Error('LinkCast session not found');
      }

      linkCast.analytics.totalGifts++;
      linkCast.analytics.totalCoins += giftCoins;
      
      // Calculate earnings split
      const earnings = linkCast.calculateEarnings(linkCast.analytics.totalCoins);
      
      await linkCast.save();

      // Update host wallets
      await Promise.all([
        User.findByIdAndUpdate(linkCast.primaryHostId, {
          $inc: {
            'coins.balance': earnings.primary,
            'coins.totalEarned': earnings.primary
          }
        }),
        User.findByIdAndUpdate(linkCast.secondaryHostId, {
          $inc: {
            'coins.balance': earnings.secondary,
            'coins.totalEarned': earnings.secondary
          }
        })
      ]);

      logger.debug('LinkCast gift processed', {
        linkCastId,
        giftCoins,
        earnings
      });
    } catch (error) {
      logger.error('Failed to process LinkCast gift', error);
      throw error;
    }
  }

  /**
   * Helper method to get host username
   */
  private async getHostUsername(hostId: mongoose.Types.ObjectId): Promise<string> {
    const host = await User.findById(hostId);
    return host?.username || 'Unknown';
  }

  /**
   * Generate Agora token
   */
  private generateAgoraToken(channelName: string, userId: string): string {
    if (!this.APP_ID || !this.APP_CERTIFICATE) {
      logger.warn('Agora credentials not configured');
      return 'test_token';
    }

    const role = RtcTokenBuilder.RtcRole.PUBLISHER;
    const privilegeExpiry = Math.floor(Date.now() / 1000) + this.TOKEN_EXPIRY;
    const uid = parseInt(userId.slice(-6), 16) || 0; // Convert last 6 chars of userId to number

    return RtcTokenBuilder.RtcTokenBuilder.buildTokenWithUid(
      this.APP_ID,
      this.APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiry
    );
  }
}

export const linkCastService = new LinkCastService();