import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import { logger } from '../config/logger';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for user operations
const userLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many user requests. Please wait before trying again.'
  }
});

/**
 * POST /users/:userId/follow
 * Follow/unfollow a user
 */
router.post('/:userId/follow', authenticateToken, userLimit, async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user?.id;
    const { userId } = req.params;
    const { action } = req.body;

    if (!followerId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
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

    const currentlyFollowing = await Follow.exists({
      follower: followerId,
      following: userId
    });

    let newFollowState: boolean;

    if (action === 'follow' && !currentlyFollowing) {
      await Follow.create({ follower: followerId, following: userId });
      await User.findByIdAndUpdate(followerId, { $inc: { following: 1 } });
      await User.findByIdAndUpdate(userId, { $inc: { followers: 1 } });
      newFollowState = true;
    } else if (action === 'unfollow' && currentlyFollowing) {
      await Follow.findOneAndDelete({
        follower: followerId,
        following: userId
      });
      await User.findByIdAndUpdate(followerId, { $inc: { following: -1 } });
      await User.findByIdAndUpdate(userId, { $inc: { followers: -1 } });
      newFollowState = false;
    } else {
      // Toggle behavior - if no action specified, toggle current state
      if (currentlyFollowing) {
        await Follow.findOneAndDelete({
          follower: followerId,
          following: userId
        });
        await User.findByIdAndUpdate(followerId, { $inc: { following: -1 } });
        await User.findByIdAndUpdate(userId, { $inc: { followers: -1 } });
        newFollowState = false;
      } else {
        await Follow.create({ follower: followerId, following: userId });
        await User.findByIdAndUpdate(followerId, { $inc: { following: 1 } });
        await User.findByIdAndUpdate(userId, { $inc: { followers: 1 } });
        newFollowState = true;
      }
    }

    res.json({
      success: true,
      isFollowing: newFollowState,
      message: newFollowState ? 'Successfully followed user' : 'Successfully unfollowed user'
    });

  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error - already following
      return res.status(400).json({
        success: false,
        error: 'Already following this user'
      });
    }

    logger.error('Error in follow/unfollow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process follow/unfollow request'
    });
  }
});

/**
 * GET /users/:userId/follow-status
 * Check if current user follows the specified user
 */
router.get('/:userId/follow-status', authenticateToken, userLimit, async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user?.id;
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
 * GET /users/:userId/followers
 * Get list of followers for the specified user
 */
router.get('/:userId/followers', userLimit, async (req: Request, res: Response) => {
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
 * GET /users/:userId/following
 * Get list of users that the specified user is following
 */
router.get('/:userId/following', userLimit, async (req: Request, res: Response) => {
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
 * GET /users/:userId/profile
 * Get user profile information
 */
router.get('/:userId/profile', userLimit, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user?.id;

    const user = await User.findById(userId).select('-password -email -phone -backupCodes -totpSecret');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== userId) {
      isFollowing = !!(await Follow.exists({
        follower: currentUserId,
        following: userId
      }));
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        country: user.country,
        isVerified: user.isVerified,
        followers: user.followers,
        following: user.following,
        totalLikes: user.totalLikes,
        totalViews: user.totalViews,
        ogLevel: user.ogLevel,
        isFollowing,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

export default router;