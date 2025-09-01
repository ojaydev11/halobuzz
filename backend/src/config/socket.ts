import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { setupLogger } from './logger';
import { getCache, setCache } from './redis';
import { LiveStreamService } from '@/services/liveStreamService';
import { ChatService } from '@/services/chatService';
import { NotificationService } from '@/services/notificationService';

const logger = setupLogger();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

export const setupSocketIO = (io: Server): void => {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      
      // Get user data from cache or database
      const userData = await getCache(`user:${decoded.userId}`);
      if (userData) {
        socket.user = userData;
      }
      
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.userId} connected`);

    // Join user to their personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Stream events
    socket.on('stream:join', async (data: { streamId: string }) => {
      try {
        const { streamId } = data;
        
        // Join the live stream room
        socket.join(`stream:${streamId}`);
        
        // Update viewer count
        await LiveStreamService.addViewer(streamId, socket.userId!);
        
        // Broadcast join event to others
        const joinData = {
          userId: socket.userId,
          username: socket.user?.username,
          timestamp: new Date()
        };
        socket.to(`stream:${streamId}`).emit('stream:join', joinData);

        // Send current stream info to the new viewer (use same event name)
        const streamInfo = await LiveStreamService.getStreamInfo(streamId);
        socket.emit('stream:join', streamInfo);

        logger.info(`User ${socket.userId} joined stream ${streamId}`);
      } catch (error) {
        logger.error('Error joining stream:', error);
        socket.emit('error', { message: 'Failed to join stream' });
      }
    });

    socket.on('stream:leave', async (data: { streamId: string }) => {
      try {
        const { streamId } = data;
        
        // Leave the live stream room
        socket.leave(`stream:${streamId}`);
        
        // Update viewer count
        await LiveStreamService.removeViewer(streamId, socket.userId!);
        
        // Broadcast leave event to others
        const leaveData = {
          userId: socket.userId,
          username: socket.user?.username,
          timestamp: new Date()
        };
        socket.to(`stream:${streamId}`).emit('stream:leave', leaveData);

        // Acknowledge to leaver
        socket.emit('stream:leave', leaveData);

        logger.info(`User ${socket.userId} left stream ${streamId}`);
      } catch (error) {
        logger.error('Error leaving stream:', error);
      }
    });

    // Chat events (single canonical event name)
    socket.on('chat:new', async (data: { 
      streamId: string, 
      message: string, 
      type: 'public' | 'private' | 'gift' 
    }) => {
      try {
        const { streamId, message, type } = data;
        
        // Process message through AI moderation
        const moderation = await ChatService.moderateMessage(message);
        if (moderation.blocked) {
          if (moderation.action === 'warn') {
            socket.emit('ai:warning', {
              message: 'Message contains inappropriate content',
              type: 'content_moderation',
              score: moderation.score
            });
          } else if (moderation.action === 'ban') {
            socket.emit('ai:warning', {
              message: 'Severe content detected. You have been temporarily restricted.',
              type: 'content_ban',
              score: moderation.score
            });
          }
          return;
        }

        // Save message to database
        const savedMessage = await ChatService.saveMessage({
          streamId,
          userId: socket.userId!,
          message,
          type,
          timestamp: new Date()
        });

        // Broadcast message to stream room with canonical event name
        const messageData = {
          id: savedMessage._id,
          userId: socket.userId,
          username: socket.user?.username,
          message,
          type,
          timestamp: savedMessage.timestamp,
          userAvatar: socket.user?.avatar
        };

        socket.to(`stream:${streamId}`).emit('chat:new', messageData);
        socket.emit('chat:new', messageData);

        logger.info(`Message sent in stream ${streamId} by user ${socket.userId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Gift events
    socket.on('gift:sent', async (data: { 
      streamId: string, 
      giftId: string, 
      quantity: number 
    }) => {
      try {
        const { streamId, giftId, quantity } = data;
        
        // Process gift transaction
        const giftResult = await LiveStreamService.processGift({
          streamId,
          senderId: socket.userId!,
          giftId,
          quantity
        });

        if (giftResult.success) {
          // Broadcast gift to stream room
          const giftData = {
            senderId: socket.userId,
            senderName: socket.user?.username,
            giftId,
            giftName: giftResult.giftName,
            quantity,
            animation: giftResult.animation,
            timestamp: new Date()
          };

          socket.to(`stream:${streamId}`).emit('gift:sent', giftData);
          socket.emit('gift:sent', giftData);

          logger.info(`Gift sent in stream ${streamId} by user ${socket.userId}`);
        } else {
          socket.emit('error', { message: giftResult.error });
        }
      } catch (error) {
        logger.error('Error sending gift:', error);
        socket.emit('error', { message: 'Failed to send gift' });
      }
    });

    // Throne events
    socket.on('throne:claimed', async (data: { streamId: string }) => {
      try {
        const { streamId } = data;
        
        // Check if user has throne access
        const hasAccess = await LiveStreamService.checkThroneAccess(
          socket.userId!, 
          streamId
        );

        if (hasAccess) {
          socket.join(`throne:${streamId}`);
          
          // Broadcast throne claim
          const throneData = {
            userId: socket.userId,
            username: socket.user?.username,
            timestamp: new Date()
          };
          socket.to(`stream:${streamId}`).emit('throne:claimed', throneData);
          socket.emit('throne:claimed', throneData);

          logger.info(`User ${socket.userId} claimed throne in stream ${streamId}`);
        } else {
          socket.emit('error', { message: 'Throne access required' });
        }
      } catch (error) {
        logger.error('Error claiming throne:', error);
        socket.emit('error', { message: 'Failed to claim throne' });
      }
    });

    // Battle events
    socket.on('battle:boost', async (data: { 
      streamId: string, 
      boostType: string,
      boostAmount: number 
    }) => {
      try {
        const { streamId, boostType, boostAmount } = data;
        
        // Process battle boost
        const boostResult = await LiveStreamService.processBattleBoost({
          streamId,
          userId: socket.userId!,
          boostType,
          boostAmount
        });

        if (boostResult.success) {
          const boostData = {
            userId: socket.userId,
            username: socket.user?.username,
            boostType,
            boostAmount,
            timestamp: new Date()
          };

          socket.to(`stream:${streamId}`).emit('battle:boost', boostData);
          socket.emit('battle:boost', boostData);

          logger.info(`Battle boost in stream ${streamId} by user ${socket.userId}`);
        } else {
          socket.emit('error', { message: boostResult.error });
        }
      } catch (error) {
        logger.error('Error processing battle boost:', error);
        socket.emit('error', { message: 'Failed to process battle boost' });
      }
    });

    // AI events
    socket.on('ai:warning', async (data: { 
      streamId: string, 
      warningType: string,
      message: string 
    }) => {
      try {
        const { streamId, warningType, message } = data;
        
        // Broadcast AI warning to stream room
        const warningData = {
          userId: socket.userId,
          username: socket.user?.username,
          warningType,
          message,
          timestamp: new Date()
        };

        socket.to(`stream:${streamId}`).emit('ai:warning', warningData);
        socket.emit('ai:warning', warningData);

        logger.info(`AI warning in stream ${streamId} for user ${socket.userId}`);
      } catch (error) {
        logger.error('Error sending AI warning:', error);
        socket.emit('error', { message: 'Failed to send AI warning' });
      }
    });

    // OG events
    socket.on('og:changed', async (data: { 
      userId: string,
      oldLevel: string,
      newLevel: string 
    }) => {
      try {
        const { userId, oldLevel, newLevel } = data;
        
        // Broadcast OG level change
        const ogData = {
          userId,
          username: socket.user?.username,
          oldLevel,
          newLevel,
          timestamp: new Date()
        };

        socket.to(`user:${userId}`).emit('og:changed', ogData);
        socket.emit('og:changed', ogData);

        logger.info(`OG level changed for user ${userId} from ${oldLevel} to ${newLevel}`);
      } catch (error) {
        logger.error('Error broadcasting OG change:', error);
        socket.emit('error', { message: 'Failed to broadcast OG change' });
      }
    });

    // Metrics events
    socket.on('metrics:update', async (data: { 
      streamId: string,
      metrics: any 
    }) => {
      try {
        const { streamId, metrics } = data;
        
        // Update stream metrics
        await LiveStreamService.updateStreamMetrics(streamId, metrics);
        
        // Broadcast metrics update to stream room
        const metricsData = {
          streamId,
          metrics,
          timestamp: new Date()
        };

        socket.to(`stream:${streamId}`).emit('metrics:update', metricsData);

        logger.info(`Metrics updated for stream ${streamId}`);
      } catch (error) {
        logger.error('Error updating metrics:', error);
        socket.emit('error', { message: 'Failed to update metrics' });
      }
    });

    // Disconnection handling
    socket.on('disconnect', async () => {
      try {
        logger.info(`User ${socket.userId} disconnected`);
        
        // Clean up any active sessions
        await LiveStreamService.handleUserDisconnect(socket.userId!);
        
        // Remove from all rooms
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
      } catch (error) {
        logger.error('Error handling disconnect:', error);
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  // Global error handling
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
  });
};
