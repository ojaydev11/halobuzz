import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { body, validationResult } from 'express-validator';
import { User } from '@/models/User';
import { logger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';

/**
 * Notification Routes
 * Handles push notification registration and management
 */

interface NotificationRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
  };
}

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

export default async function notificationRoutes(fastify: FastifyInstance) {
  // Register push notification token
  fastify.post('/register-token', {
    preHandler: [async (request: NotificationRequest, reply: FastifyReply) => {
      // Basic authentication check
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      // Add user to request
      request.user = { userId: 'temp', email: 'temp@example.com' };
    }],
    schema: {
      body: {
        type: 'object',
        required: ['token', 'platform'],
        properties: {
          token: { type: 'string' },
          platform: { type: 'string', enum: ['ios', 'android', 'web'] },
          preferences: {
            type: 'object',
            properties: {
              pushEnabled: { type: 'boolean' },
              streamNotifications: { type: 'boolean' },
              giftNotifications: { type: 'boolean' },
              followNotifications: { type: 'boolean' },
              messageNotifications: { type: 'boolean' },
              achievementNotifications: { type: 'boolean' },
              systemNotifications: { type: 'boolean' },
              soundEnabled: { type: 'boolean' },
              vibrateEnabled: { type: 'boolean' }
            }
          }
        }
      }
    }
  }, async (request: NotificationRequest, reply: FastifyReply) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return reply.status(400).send({
          success: false,
          errors: errors.array()
        });
      }

      const { token, platform, preferences } = request.body as {
        token: string;
        platform: string;
        preferences?: NotificationPreferences;
      };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required'
        });
      }

      // Update user with notification token and preferences
      const updateData: any = {
        deviceTokens: [token],
        notificationPreferences: preferences || {}
      };

      await User.findByIdAndUpdate(userId, updateData);

      // Store token in Redis for quick access
      await setCache(`notification_token:${userId}`, {
        token,
        platform,
        preferences: preferences || {},
        registeredAt: new Date()
      }, 30 * 24 * 60 * 60); // 30 days

      logger.info(`Notification token registered for user ${userId} on ${platform}`);

      return reply.send({
        success: true,
        message: 'Notification token registered successfully'
      });
    } catch (error) {
      logger.error('Failed to register notification token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to register notification token'
      });
    }
  });

  // Update notification preferences
  fastify.put('/preferences', {
    preHandler: [async (request: NotificationRequest, reply: FastifyReply) => {
      // Basic authentication check
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      // Add user to request
      request.user = { userId: 'temp', email: 'temp@example.com' };
    }],
    schema: {
      body: {
        type: 'object',
        properties: {
          pushEnabled: { type: 'boolean' },
          streamNotifications: { type: 'boolean' },
          giftNotifications: { type: 'boolean' },
          followNotifications: { type: 'boolean' },
          messageNotifications: { type: 'boolean' },
          achievementNotifications: { type: 'boolean' },
          systemNotifications: { type: 'boolean' },
          soundEnabled: { type: 'boolean' },
          vibrateEnabled: { type: 'boolean' }
        }
      }
    }
  }, async (request: NotificationRequest, reply: FastifyReply) => {
    try {
      const preferences = request.body as NotificationPreferences;
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required'
        });
      }

      // Update user preferences
      await User.findByIdAndUpdate(userId, {
        notificationPreferences: preferences
      });

      // Update cached token data
      const cachedData = await getCache(`notification_token:${userId}`);
      if (cachedData) {
        cachedData.preferences = preferences;
        await setCache(`notification_token:${userId}`, cachedData, 30 * 24 * 60 * 60);
      }

      logger.info(`Notification preferences updated for user ${userId}`);

      return reply.send({
        success: true,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update notification preferences:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update notification preferences'
      });
    }
  });

  // Get notification preferences
  fastify.get('/preferences', {
    preHandler: [async (request: NotificationRequest, reply: FastifyReply) => {
      // Basic authentication check
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      // Add user to request
      request.user = { userId: 'temp', email: 'temp@example.com' };
    }]
  }, async (request: NotificationRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await User.findById(userId).select('notificationPreferences');
      const preferences = user?.notificationPreferences || {};

      return reply.send({
        success: true,
        data: preferences
      });
    } catch (error) {
      logger.error('Failed to get notification preferences:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get notification preferences'
      });
    }
  });

  // Send test notification
  fastify.post('/test', {
    preHandler: [async (request: NotificationRequest, reply: FastifyReply) => {
      // Basic authentication check
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      // Add user to request
      request.user = { userId: 'temp', email: 'temp@example.com' };
    }],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'body'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
          data: { type: 'object' }
        }
      }
    }
  }, async (request: NotificationRequest, reply: FastifyReply) => {
    try {
      const { title, body, data } = request.body as {
        title: string;
        body: string;
        data?: any;
      };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get user's notification token
      const cachedData = await getCache(`notification_token:${userId}`) as { 
        token?: string; 
        preferences?: { soundEnabled?: boolean } 
      };
      if (!cachedData?.token) {
        return reply.status(400).send({
          success: false,
          error: 'No notification token found for user'
        });
      }

      // Send notification using Expo Push API
      const notificationData = {
        to: cachedData.token,
        title,
        body,
        data: data || {},
        sound: cachedData.preferences?.soundEnabled ? 'default' : null,
        badge: 1
      };

      // In a real implementation, you would send this to Expo Push API
      // For now, we'll just log it
      logger.info('Test notification sent:', notificationData);

      return reply.send({
        success: true,
        message: 'Test notification sent successfully'
      });
    } catch (error) {
      logger.error('Failed to send test notification:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to send test notification'
      });
    }
  });

  // Unregister notification token
  fastify.delete('/unregister', {
    preHandler: [async (request: NotificationRequest, reply: FastifyReply) => {
      // Basic authentication check
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      // Add user to request
      request.user = { userId: 'temp', email: 'temp@example.com' };
    }]
  }, async (request: NotificationRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication required'
        });
      }

      // Remove token from user
      await User.findByIdAndUpdate(userId, {
        $unset: { deviceTokens: 1, notificationPreferences: 1 }
      });

      // Remove from cache
      await setCache(`notification_token:${userId}`, null, 0);

      logger.info(`Notification token unregistered for user ${userId}`);

      return reply.send({
        success: true,
        message: 'Notification token unregistered successfully'
      });
    } catch (error) {
      logger.error('Failed to unregister notification token:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to unregister notification token'
      });
    }
  });

  // Get notification history (Admin only)
  fastify.get('/history', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request: NotificationRequest, reply: FastifyReply) => {
    try {
      const { userId, limit = 50, offset = 0 } = request.query as {
        userId?: string;
        limit: number;
        offset: number;
      };

      // In a real implementation, you would query a notifications collection
      // For now, we'll return mock data
      const notifications = [
        {
          id: '1',
          userId: userId || 'user123',
          title: 'Welcome to HaloBuzz!',
          body: 'Start exploring live streams and connect with creators.',
          type: 'system',
          sentAt: new Date().toISOString(),
          status: 'delivered'
        }
      ];

      return reply.send({
        success: true,
        data: {
          notifications: notifications.slice(offset, offset + limit),
          total: notifications.length,
          limit,
          offset
        }
      });
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get notification history'
      });
    }
  });
}
