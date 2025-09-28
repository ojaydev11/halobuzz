import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { socialService } from '../services/SocialService';
import { logger } from '../config/logger';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for social features
const socialLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many social requests. Please wait before trying again.'
  }
});

/**
 * POST /social/follow
 * Follow/unfollow a user
 */
router.post('/follow', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const followerId = req.user?.id;
    const { userId, action } = req.body;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        error: 'User ID and action (follow/unfollow) are required'
      });
    }

    if (followerId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (action === 'follow') {
      try {
        await Follow.create({ follower: followerId, following: userId });

        // Update follower/following counts
        await User.findByIdAndUpdate(followerId, { $inc: { following: 1 } });
        await User.findByIdAndUpdate(userId, { $inc: { followers: 1 } });

        res.json({
          success: true,
          message: 'Successfully followed user',
          isFollowing: true
        });
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error - already following
          return res.status(400).json({
            success: false,
            error: 'Already following this user'
          });
        }
        throw error;
      }
    } else if (action === 'unfollow') {
      const deleted = await Follow.findOneAndDelete({
        follower: followerId,
        following: userId
      });

      if (deleted) {
        // Update follower/following counts
        await User.findByIdAndUpdate(followerId, { $inc: { following: -1 } });
        await User.findByIdAndUpdate(userId, { $inc: { followers: -1 } });

        res.json({
          success: true,
          message: 'Successfully unfollowed user',
          isFollowing: false
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Not following this user'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid action. Use "follow" or "unfollow"'
      });
    }
  } catch (error) {
    logger.error('Error in follow/unfollow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process follow/unfollow request'
    });
  }
});

/**
 * GET /social/following/:userId
 * Get list of users that the specified user is following
 */
router.get('/following/:userId', socialLimit, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const following = await Follow.find({ follower: userId })
      .populate('following', 'username avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    res.json({
      success: true,
      following: following.map(f => f.following),
      total: await Follow.countDocuments({ follower: userId })
    });
  } catch (error) {
    logger.error('Error fetching following:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch following list'
    });
  }
});

/**
 * GET /social/followers/:userId
 * Get list of followers for the specified user
 */
router.get('/followers/:userId', socialLimit, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const followers = await Follow.find({ following: userId })
      .populate('follower', 'username avatar isVerified')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    res.json({
      success: true,
      followers: followers.map(f => f.follower),
      total: await Follow.countDocuments({ following: userId })
    });
  } catch (error) {
    logger.error('Error fetching followers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch followers list'
    });
  }
});

/**
 * GET /social/follow-status/:userId
 * Check if current user follows the specified user
 */
router.get('/follow-status/:userId', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const followerId = req.user?.id;
    const { userId } = req.params;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const isFollowing = await Follow.exists({
      follower: followerId,
      following: userId
    });

    res.json({
      success: true,
      isFollowing: !!isFollowing,
      userId
    });
  } catch (error) {
    logger.error('Error checking follow status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check follow status'
    });
  }
});

/**
 * GET /social/friends
 * Get user's friends list
 */
router.get('/friends', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const friends = socialService.getUserFriends(userId);

    res.json({
      success: true,
      friends,
      total: friends.length
    });
  } catch (error) {
    logger.error('Error fetching friends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch friends'
    });
  }
});

/**
 * POST /social/friends/add
 * Add a friend
 */
router.post('/friends/add', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!friendId) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required'
      });
    }

    const success = await socialService.addFriend(userId, friendId);

    if (success) {
      res.json({
        success: true,
        message: 'Friend added successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to add friend'
      });
    }
  } catch (error) {
    logger.error('Error adding friend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add friend'
    });
  }
});

/**
 * DELETE /social/friends/:friendId
 * Remove a friend
 */
router.delete('/friends/:friendId', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const success = await socialService.removeFriend(userId, friendId);

    if (success) {
      res.json({
        success: true,
        message: 'Friend removed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to remove friend'
      });
    }
  } catch (error) {
    logger.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove friend'
    });
  }
});

/**
 * GET /social/guilds
 * Get available guilds
 */
router.get('/guilds', socialLimit, async (req: Request, res: Response) => {
  try {
    const guilds = socialService.getAvailableGuilds();

    res.json({
      success: true,
      guilds,
      total: guilds.length
    });
  } catch (error) {
    logger.error('Error fetching guilds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guilds'
    });
  }
});

/**
 * GET /social/guilds/my
 * Get user's guilds
 */
router.get('/guilds/my', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const guilds = socialService.getUserGuilds(userId);

    res.json({
      success: true,
      guilds,
      total: guilds.length
    });
  } catch (error) {
    logger.error('Error fetching user guilds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user guilds'
    });
  }
});

/**
 * POST /social/guilds/:guildId/join
 * Join a guild
 */
router.post('/guilds/:guildId/join', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { guildId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Mock user stats - in production, fetch from database
    const userLevel = 10;
    const userWinRate = 0.65;

    const result = await socialService.joinGuild(userId, guildId, userLevel, userWinRate);

    if (result.success) {
      res.json({
        success: true,
        message: 'Successfully joined guild'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    logger.error('Error joining guild:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join guild'
    });
  }
});

/**
 * POST /social/guilds/:guildId/leave
 * Leave a guild
 */
router.post('/guilds/:guildId/leave', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { guildId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const success = await socialService.leaveGuild(userId, guildId);

    if (success) {
      res.json({
        success: true,
        message: 'Successfully left guild'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to leave guild'
      });
    }
  } catch (error) {
    logger.error('Error leaving guild:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave guild'
    });
  }
});

/**
 * GET /social/chat/history
 * Get chat message history
 */
router.get('/chat/history', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const { roomId = 'global', limit = 50, offset = 0 } = req.query;

    const messages = socialService.getChatMessages(
      roomId as string,
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      messages,
      roomId,
      total: messages.length
    });
  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history'
    });
  }
});

/**
 * POST /social/chat/send
 * Send a chat message
 */
router.post('/chat/send', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { roomId = 'global', message, type = 'text' } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }

    const chatMessage = await socialService.sendChatMessage(
      userId,
      roomId,
      message,
      type
    );

    if (chatMessage) {
      res.json({
        success: true,
        message: chatMessage
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send message'
      });
    }
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

/**
 * GET /social/invites
 * Get user's game invitations
 */
router.get('/invites', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const invites = socialService.getUserGameInvites(userId);

    res.json({
      success: true,
      invites,
      total: invites.length
    });
  } catch (error) {
    logger.error('Error fetching invites:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invites'
    });
  }
});

/**
 * POST /social/invites/send
 * Send a game invitation
 */
router.post('/invites/send', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId, gameCode, gameName, message, stake } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!friendId || !gameCode || !gameName) {
      return res.status(400).json({
        success: false,
        error: 'Friend ID, game code, and game name are required'
      });
    }

    const inviteId = await socialService.sendGameInvite(
      userId,
      friendId,
      gameCode,
      gameName,
      message || 'Join me for a game!',
      stake
    );

    if (inviteId) {
      res.json({
        success: true,
        inviteId,
        message: 'Invitation sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send invitation'
      });
    }
  } catch (error) {
    logger.error('Error sending invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation'
    });
  }
});

/**
 * POST /social/invites/:inviteId/accept
 * Accept a game invitation
 */
router.post('/invites/:inviteId/accept', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;

    const result = await socialService.acceptGameInvite(inviteId);

    if (result.success && result.invite) {
      res.json({
        success: true,
        invite: result.invite,
        message: 'Invitation accepted'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to accept invitation'
      });
    }
  } catch (error) {
    logger.error('Error accepting invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invitation'
    });
  }
});

/**
 * POST /social/invites/:inviteId/decline
 * Decline a game invitation
 */
router.post('/invites/:inviteId/decline', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const { inviteId } = req.params;

    const success = await socialService.declineGameInvite(inviteId);

    if (success) {
      res.json({
        success: true,
        message: 'Invitation declined'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to decline invitation'
      });
    }
  } catch (error) {
    logger.error('Error declining invite:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to decline invitation'
    });
  }
});

/**
 * GET /social/achievements
 * Get user's achievements
 */
router.get('/achievements', authenticateToken, socialLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const achievements = socialService.getUserAchievements(userId);

    res.json({
      success: true,
      achievements,
      total: achievements.length
    });
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
});

export default router;