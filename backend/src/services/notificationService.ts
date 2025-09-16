import { User } from '@/models/User';
import { setupLogger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';

const logger = setupLogger();

export class NotificationService {
  // Send push notification
  static async sendPushNotification(userId: string, notification: {
    title: string;
    body: string;
    data?: any;
    type: 'gift' | 'og' | 'throne' | 'battle' | 'festival' | 'general';
  }): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('deviceTokens preferences');
      if (!user || !user.deviceTokens.length) {
        return false;
      }

      // Check if user has push notifications enabled
      if (!user.preferences.notifications.push) {
        return false;
      }

      // Here you would integrate with FCM/APNs
      // For now, we'll just log the notification
      logger.info('Push notification sent', {
        userId,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        deviceTokens: user.deviceTokens.length
      });

      return true;
    } catch (error) {
      logger.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send in-app notification
  static async sendInAppNotification(userId: string, notification: {
    title: string;
    message: string;
    type: 'gift' | 'og' | 'throne' | 'battle' | 'festival' | 'general';
    data?: any;
    expiresAt?: Date;
  }): Promise<void> {
    try {
      const notificationData = {
        id: Date.now().toString(),
        userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data || {},
        createdAt: new Date(),
        expiresAt: notification.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        read: false
      };

      // Store in cache for real-time access
      const cacheKey = `notifications:${userId}`;
      const existingNotifications = (await getCache(cacheKey) || []) as any[];
      
      existingNotifications.unshift(notificationData);
      
      // Keep only last 50 notifications
      if (existingNotifications.length > 50) {
        existingNotifications.splice(50);
      }

      await setCache(cacheKey, existingNotifications, 3600); // 1 hour

      logger.info('In-app notification sent', {
        userId,
        title: notification.title,
        type: notification.type
      });
    } catch (error) {
      logger.error('Error sending in-app notification:', error);
    }
  }

  // Get user notifications
  static async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const cacheKey = `notifications:${userId}`;
      const notifications = (await getCache(cacheKey) || []) as any[];
      
      return notifications.slice(0, limit);
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  static async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const cacheKey = `notifications:${userId}`;
      const notifications = (await getCache(cacheKey) || []) as any[];
      
      const notificationIndex = notifications.findIndex((n: any) => n.id === notificationId);
      if (notificationIndex > -1) {
        notifications[notificationIndex].read = true;
        await setCache(cacheKey, notifications, 3600);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const cacheKey = `notifications:${userId}`;
      const notifications = (await getCache(cacheKey) || []) as any[];
      
      notifications.forEach((notification: any) => {
        notification.read = true;
      });
      
      await setCache(cacheKey, notifications, 3600);
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  }

  // Send gift notification
  static async sendGiftNotification(senderId: string, recipientId: string, giftName: string, amount: number): Promise<void> {
    try {
      // Send to recipient
      await this.sendInAppNotification(recipientId, {
        title: '🎁 Gift Received!',
        message: `You received ${amount} coins from ${giftName}!`,
        type: 'gift',
        data: { senderId, giftName, amount }
      });

      // Send to sender
      await this.sendInAppNotification(senderId, {
        title: '💝 Gift Sent!',
        message: `You sent ${giftName} to a streamer!`,
        type: 'gift',
        data: { recipientId, giftName, amount }
      });
    } catch (error) {
      logger.error('Error sending gift notification:', error);
    }
  }

  // Send OG level up notification
  static async sendOGLevelUpNotification(userId: string, newLevel: number): Promise<void> {
    try {
      await this.sendInAppNotification(userId, {
        title: '👑 OG Level Up!',
        message: `Congratulations! You've reached OG Level ${newLevel}!`,
        type: 'og',
        data: { newLevel }
      });

      await this.sendPushNotification(userId, {
        title: '👑 OG Level Up!',
        body: `Congratulations! You've reached OG Level ${newLevel}!`,
        type: 'og'
      });
    } catch (error) {
      logger.error('Error sending OG level up notification:', error);
    }
  }

  // Send throne claim notification
  static async sendThroneClaimNotification(userId: string, streamTitle: string): Promise<void> {
    try {
      await this.sendInAppNotification(userId, {
        title: '🪑 Throne Claimed!',
        message: `You claimed the throne in "${streamTitle}"!`,
        type: 'throne',
        data: { streamTitle }
      });
    } catch (error) {
      logger.error('Error sending throne claim notification:', error);
    }
  }

  // Send battle boost notification
  static async sendBattleBoostNotification(userId: string, boostType: string, multiplier: number): Promise<void> {
    try {
      await this.sendInAppNotification(userId, {
        title: '⚡ Battle Boost!',
        message: `${boostType} activated! ${multiplier}x multiplier active!`,
        type: 'battle',
        data: { boostType, multiplier }
      });
    } catch (error) {
      logger.error('Error sending battle boost notification:', error);
    }
  }

  // Send festival notification
  static async sendFestivalNotification(userId: string, festivalName: string): Promise<void> {
    try {
      await this.sendInAppNotification(userId, {
        title: '🎉 Festival Time!',
        message: `${festivalName} festival is now active! Special gifts and skins available!`,
        type: 'festival',
        data: { festivalName }
      });
    } catch (error) {
      logger.error('Error sending festival notification:', error);
    }
  }

  // Get unread notification count
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const cacheKey = `notifications:${userId}`;
      const notifications = (await getCache(cacheKey) || []) as any[];
      
      return notifications.filter((n: any) => !n.read).length;
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Clear expired notifications
  static async clearExpiredNotifications(): Promise<void> {
    try {
      // This would typically be done in a scheduled job
      // For now, we'll just log that it should be implemented
      logger.info('Clear expired notifications job should be implemented');
    } catch (error) {
      logger.error('Error clearing expired notifications:', error);
    }
  }
  
  // Add sendNotification method for compatibility
  static async sendNotification(userId: string, notification: {
    title: string;
    body: string;
    data?: any;
    type?: string;
  }): Promise<boolean> {
    return this.sendPushNotification(userId, {
      ...notification,
      type: (notification.type as any) || 'general'
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService;
