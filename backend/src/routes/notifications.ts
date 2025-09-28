import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { User } from '@/models/User';
import { logger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * Notification Routes
 * Handles push notification registration and management
 */

interface NotificationPreferences {
  pushEnabled: boolean;
  streamNotifications: boolean;
  giftNotifications: boolean;
  followNotifications: boolean;
  messageNotifications: boolean;
  achievementNotifications: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrateEnabled: boolean;
}

// Register push notification token
router.post('/register-token', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token, platform, preferences } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Update user's push token
    await User.findByIdAndUpdate(userId, {
      pushToken: token,
      platform: platform,
      notificationPreferences: preferences || {
        pushEnabled: true,
        streamNotifications: true,
        giftNotifications: true,
        followNotifications: true,
        messageNotifications: true,
        achievementNotifications: true,
        systemNotifications: true,
        soundEnabled: true,
        vibrateEnabled: true
      }
    });

    // Cache the token for quick access
    await setCache(`push_token:${userId}`, token, 86400); // 24 hours

    return res.json({
      success: true,
      message: 'Push token registered successfully'
    });
  } catch (error) {
    logger.error('Error registering push token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register push token'
    });
  }
});

// Update notification preferences
router.put('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const preferences = req.body as NotificationPreferences;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    await User.findByIdAndUpdate(userId, {
      notificationPreferences: preferences
    });

    return res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update notification preferences'
    });
  }
});

// Get notification preferences
router.get('/preferences', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId).select('notificationPreferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: user.notificationPreferences || {
        pushEnabled: true,
        streamNotifications: true,
        giftNotifications: true,
        followNotifications: true,
        messageNotifications: true,
        achievementNotifications: true,
        systemNotifications: true,
        soundEnabled: true,
        vibrateEnabled: true
      }
    });
  } catch (error) {
    logger.error('Error getting notification preferences:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification preferences'
    });
  }
});

// Get notification history
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get cached notification history
    const cacheKey = `notifications:${userId}:${limit}:${offset}`;
    const cachedHistory = await getCache(cacheKey);

    if (cachedHistory) {
      return res.json({
        success: true,
        data: JSON.parse(cachedHistory)
      });
    }

    // If not cached, return empty array for now
    // In a real implementation, you would fetch from a notifications collection
    const history = [];

    // Cache the result
    await setCache(cacheKey, JSON.stringify(history), 300); // 5 minutes

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error getting notification history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get notification history'
    });
  }
});

// Mark notification as read
router.put('/mark-read/:notificationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // In a real implementation, you would update the notification status in the database
    logger.info(`Marking notification ${notificationId} as read for user ${userId}`);

    return res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // In a real implementation, you would update all notifications for the user
    logger.info(`Marking all notifications as read for user ${userId}`);

    return res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read'
    });
  }
});

// Get unread notification count
router.get('/unread-count', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get cached unread count
    const cacheKey = `unread_count:${userId}`;
    const cachedCount = await getCache(cacheKey);

    if (cachedCount) {
      return res.json({
        success: true,
        data: {
          count: parseInt(cachedCount)
        }
      });
    }

    // If not cached, return 0 for now
    // In a real implementation, you would count unread notifications from the database
    const count = 0;

    // Cache the result
    await setCache(cacheKey, count.toString(), 60); // 1 minute

    return res.json({
      success: true,
      data: {
        count
      }
    });
  } catch (error) {
    logger.error('Error getting unread notification count:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get unread notification count'
    });
  }
});

export default router;