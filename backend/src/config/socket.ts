import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { setupLogger } from './logger';
import { getCache, setCache } from './redis';
import { LiveStreamService } from '@/services/liveStreamService';
import { ChatService } from '@/services/chatService';
import { NotificationService } from '@/services/notificationService';
import { socketSecurityService } from '@/services/SocketSecurityService';

const logger = setupLogger();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

// Redis adapter setup for multi-instance scaling
export const setupRedisAdapter = async (io: Server): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    const url = new URL(redisUrl);
    const isSecure = url.protocol === 'rediss:' || url.protocol === 'redis+tls:';
    
    logger.info(`Setting up Redis adapter: ${url.protocol}//${url.hostname}:${url.port || (isSecure ? '6380' : '6379')} (SSL: ${isSecure})`);
    
    // Create Redis client configuration with proper SSL handling
    const clientConfig: any = {
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 10000
      }
    };
    
    // Handle SSL/TLS configuration for Redis adapter
    if (isSecure) {
      clientConfig.socket.host = url.hostname;
      clientConfig.socket.port = parseInt(url.port) || 6380;
      clientConfig.socket.tls = {
        rejectUnauthorized: false,
        servername: url.hostname
      };
    } else {
      clientConfig.url = redisUrl;
    }
    
    // Create Redis clients for pub/sub with proper SSL configuration
    const pubClient = createClient(clientConfig);
    const subClient = pubClient.duplicate();

    await Promise.all([
      pubClient.connect(),
      subClient.connect()
    ]);

    // Set up the Redis adapter
    io.adapter(createAdapter(pubClient, subClient));
    
    logger.info('Socket.IO Redis adapter configured successfully');
  } catch (error) {
    logger.error('Failed to setup Redis adapter:', error);
    
    // If SSL connection failed, try without SSL as fallback
    if (redisUrl.includes('rediss://')) {
      try {
        logger.info('Attempting Redis adapter connection without SSL as fallback...');
        const fallbackUrl = redisUrl.replace('rediss://', 'redis://');
        const pubClient = createClient({ url: fallbackUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([
          pubClient.connect(),
          subClient.connect()
        ]);

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter configured successfully without SSL');
        return;
      } catch (fallbackError) {
        logger.error('Redis adapter fallback connection also failed:', fallbackError);
      }
    }
    
    // Continue without Redis adapter in case of failure
    logger.warn('Continuing without Redis adapter - real-time features will be limited to single instance');
  }
};

// Export function to get socket.io instance
export const getSocketIO = (): Server | null => {
  // This would typically return the global io instance
  // For now, return null as it's not set up globally
  return null;
};

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

  io.on('connection', async (socket: AuthenticatedSocket) => {
    try {
      // Check if connection is allowed
      const connectionCheck = await socketSecurityService.canConnect(socket, socket.userId!);
      if (!connectionCheck.allowed) {
        logger.warn(`Connection blocked for user ${socket.userId}: ${connectionCheck.reason}`);
        socket.emit('error', { 
          message: connectionCheck.reason,
          limits: connectionCheck.limits
        });
        socket.disconnect(true);
        return;
      }

      // Register the connection
      socketSecurityService.registerConnection(socket, socket.userId!);
      
      logger.info(`User ${socket.userId} connected`);

      // Join user to their personal room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }
    } catch (error) {
      logger.error('Connection setup error:', error);
      socket.emit('error', { message: 'Connection setup failed' });
      socket.disconnect(true);
      return;
    }

    // Stream events
    socket.on('stream:join', async (data: { streamId: string }) => {
      try {
        const { streamId } = data;
        
        // Check if user can join room
        const roomCheck = await socketSecurityService.canJoinRoom(socket.userId!, `stream:${streamId}`);
        if (!roomCheck.allowed) {
          socket.emit('error', { 
            message: roomCheck.reason,
            limits: roomCheck.limits
          });
          return;
        }
        
        // Join the live stream room
        socket.join(`stream:${streamId}`);
        socketSecurityService.recordRoomJoin(socket.userId!, `stream:${streamId}`);
        
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
        socketSecurityService.recordRoomLeave(socket.userId!, `stream:${streamId}`);
        
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
        
        // Check if message can be sent
        const messageCheck = await socketSecurityService.canSendMessage(socket, socket.userId!, message);
        if (!messageCheck.allowed) {
          socket.emit('error', { 
            message: messageCheck.reason,
            limits: messageCheck.limits
          });
          return;
        }
        
        // Record the message
        socketSecurityService.recordMessage(socket.userId!);
        
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
        
        // Handle socket security cleanup
        socketSecurityService.handleDisconnection(socket.userId!, socket);
        
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
