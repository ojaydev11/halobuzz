import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { setupLogger } from './logger';
import { getCache, setCache, deleteCache } from './redis';
import { LiveStreamService } from '@/services/liveStreamService';
import { ChatService } from '@/services/chatService';
import { NotificationService } from '@/services/notificationService';
import { socketSecurityService } from '@/services/SocketSecurityService';
import { messagePersistenceService } from '@/services/MessagePersistenceService';
import { giftTransactionService } from '@/services/GiftTransactionService';

const logger = setupLogger();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

// Enhanced Redis adapter setup for massive scaling (10K+ connections)
export const setupRedisAdapter = async (io: Server): Promise<void> => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    const url = new URL(redisUrl);
    const isSecure = url.protocol === 'rediss:' || url.protocol === 'redis+tls:';
    
    // Extract password from URL if present, otherwise use environment variable
    const password = url.password || process.env.REDIS_PASSWORD || undefined;
    
    logger.info(`Setting up enhanced Redis adapter for massive scaling: ${url.protocol}//${url.hostname}:${url.port || (isSecure ? '6380' : '6379')} (SSL: ${isSecure})`);
    
    // Enhanced Redis client configuration for high-performance scaling
    const clientConfig: any = {
      password: password,
      socket: {
        connectTimeout: 5000, // Reduced timeout for faster failover
        lazyConnect: true, // Lazy connection for better performance
        keepAlive: true,
        keepAliveInitialDelay: 0
      },
      // Connection pooling for high concurrency
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: null, // Disable retries for pub/sub
      // Performance optimizations
      lazyConnect: true,
      // Memory optimization
      maxmemoryPolicy: 'allkeys-lru'
    };
    
    // Handle SSL/TLS configuration for Redis adapter
    if (isSecure) {
      clientConfig.socket.host = url.hostname;
      clientConfig.socket.port = parseInt(url.port) || 6380;
      clientConfig.socket.tls = {
        rejectUnauthorized: false,
        servername: url.hostname,
        // Enhanced TLS settings for performance
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384',
        secureProtocol: 'TLSv1_2_method'
      };
    } else {
      clientConfig.url = redisUrl;
    }
    
    // Create Redis clients for pub/sub with enhanced configuration
    const pubClient = createClient(clientConfig);
    const subClient = pubClient.duplicate();

    // Enhanced connection handling with retries
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await Promise.all([
          pubClient.connect(),
          subClient.connect()
        ]);
        break;
      } catch (error) {
        retryCount++;
        logger.warn(`Redis connection attempt ${retryCount} failed:`, error);
        if (retryCount >= maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Set up the Redis adapter with enhanced configuration
    const adapter = createAdapter(pubClient, subClient, {
      // Enhanced adapter options for massive scaling
      key: 'socket.io', // Namespace for Redis keys
      requestsTimeout: 5000, // Timeout for requests
      heartbeatInterval: 1000, // Heartbeat interval
      heartbeatTimeout: 5000, // Heartbeat timeout
      // Performance optimizations
      requestsTimeout: 5000,
      heartbeatInterval: 1000,
      heartbeatTimeout: 5000
    });
    
    io.adapter(adapter);
    
    // Add connection monitoring
    pubClient.on('error', (error) => {
      logger.error('Redis pub client error:', error);
    });
    
    subClient.on('error', (error) => {
      logger.error('Redis sub client error:', error);
    });
    
    // Monitor connection health
    pubClient.on('connect', () => {
      logger.info('Redis pub client connected successfully');
    });
    
    subClient.on('connect', () => {
      logger.info('Redis sub client connected successfully');
    });
    
    logger.info('Enhanced Socket.IO Redis adapter configured successfully for massive scaling');
  } catch (error) {
    logger.error('Failed to setup enhanced Redis adapter:', error);
    
    // If SSL connection failed, try without SSL as fallback
    if (redisUrl.includes('rediss://')) {
      try {
        logger.info('Attempting enhanced Redis adapter connection without SSL as fallback...');
        const fallbackUrl = redisUrl.replace('rediss://', 'redis://');
        const pubClient = createClient({ 
          url: fallbackUrl,
          socket: {
            connectTimeout: 5000,
            lazyConnect: true,
            keepAlive: true
          }
        });
        const subClient = pubClient.duplicate();

        await Promise.all([
          pubClient.connect(),
          subClient.connect()
        ]);

        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Enhanced Socket.IO Redis adapter configured successfully without SSL');
        return;
      } catch (fallbackError) {
        logger.error('Enhanced Redis adapter fallback connection also failed:', fallbackError);
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

// Enhanced room sharding for massive scale
export const getShardId = async (userId: string): Promise<number> => {
  // Simple hash-based sharding for consistent room distribution
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash) % 10; // 10 shards
};

// Initialize rate limiting for socket
export const initializeSocketRateLimit = async (socket: AuthenticatedSocket): Promise<void> => {
  const userId = socket.userId!;
  const socketId = socket.id;
  
  // Initialize rate limit counters
  await Promise.all([
    setCache(`rate:${socketId}:messages`, 0, 60), // 1 minute window
    setCache(`rate:${socketId}:gifts`, 0, 60),
    setCache(`rate:${socketId}:joins`, 0, 60),
    setCache(`rate:${userId}:global`, 0, 60) // Global user rate limit
  ]);
};

// Check and update rate limits
export const checkRateLimit = async (
  socket: AuthenticatedSocket, 
  action: 'messages' | 'gifts' | 'joins' | 'global',
  limit: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
  const userId = socket.userId!;
  const socketId = socket.id;
  
  const key = action === 'global' ? `rate:${userId}:global` : `rate:${socketId}:${action}`;
  const current = await getCache(key) || 0;
  
  if (current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000 // 1 minute from now
    };
  }
  
  // Increment counter
  await setCache(key, current + 1, 60);
  
  return {
    allowed: true,
    remaining: limit - current - 1,
    resetTime: Date.now() + 60000
  };
};

// Enhanced room management with sharding
export const joinRoomWithSharding = async (
  socket: AuthenticatedSocket, 
  roomId: string, 
  roomType: 'stream' | 'game' | 'chat'
): Promise<{ success: boolean; shardId?: number; error?: string }> => {
  try {
    const userId = socket.userId!;
    
    // Check rate limit for room joins
    const rateCheck = await checkRateLimit(socket, 'joins', 5);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.resetTime - Date.now()) / 1000)} seconds`
      };
    }
    
    // Get shard for this room
    const shardId = await getShardId(roomId);
    const shardedRoom = `${roomType}:${roomId}:shard:${shardId}`;
    
    // Join the sharded room
    await socket.join(shardedRoom);
    
    // Also join the main room for backward compatibility
    await socket.join(`${roomType}:${roomId}`);
    
    // Update room metadata
    await setCache(`room:${roomId}:metadata`, {
      shardId,
      roomType,
      createdAt: new Date().toISOString(),
      memberCount: await getRoomMemberCount(shardedRoom)
    }, 3600);
    
    return { success: true, shardId };
  } catch (error) {
    logger.error('Error joining room with sharding:', error);
    return { success: false, error: 'Failed to join room' };
  }
};

// Get room member count (approximate for Redis adapter)
export const getRoomMemberCount = async (roomId: string): Promise<number> => {
  try {
    // This would typically use the Redis adapter to get room size
    // For now, return a cached value or estimate
    const cached = await getCache(`room:${roomId}:count`);
    return cached || 0;
  } catch (error) {
    logger.error('Error getting room member count:', error);
    return 0;
  }
};

// Enhanced message broadcasting with rate limiting
export const broadcastToRoom = async (
  io: Server,
  roomId: string,
  event: string,
  data: any,
  excludeSocket?: string
): Promise<{ success: boolean; recipients: number; error?: string }> => {
  try {
    // Get all shards for this room
    const shards = Array.from({ length: 10 }, (_, i) => i);
    let totalRecipients = 0;
    
    for (const shardId of shards) {
      const shardedRoom = `${roomId}:shard:${shardId}`;
      const roomSize = await getRoomMemberCount(shardedRoom);
      
      if (roomSize > 0) {
        io.to(shardedRoom).emit(event, data);
        totalRecipients += roomSize;
      }
    }
    
    return { success: true, recipients: totalRecipients };
  } catch (error) {
    logger.error('Error broadcasting to room:', error);
    return { success: false, recipients: 0, error: 'Broadcast failed' };
  }
};

export const setupSocketIO = (io: Server): void => {
  // Enhanced authentication middleware with connection limits
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.userId = decoded.userId;
      
      // Enhanced user data caching with TTL
      const userData = await getCache(`user:${decoded.userId}`);
      if (userData) {
        socket.user = userData;
      } else {
        // Cache miss - fetch from database and cache for 5 minutes
        // This would typically fetch from User model
        const user = { id: decoded.userId, username: `user_${decoded.userId}` };
        socket.user = user;
        await setCache(`user:${decoded.userId}`, user, 300); // 5 minutes TTL
      }
      
      // Check connection limits per user (max 5 concurrent connections)
      const connectionCount = await getCache(`connections:${decoded.userId}`) || 0;
      if (connectionCount >= 5) {
        logger.warn(`User ${decoded.userId} exceeded connection limit`);
        return next(new Error('Maximum concurrent connections exceeded'));
      }
      
      // Increment connection count
      await setCache(`connections:${decoded.userId}`, connectionCount + 1, 3600); // 1 hour TTL
      
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
      
      // Mark user as online and deliver offline messages
      const offlineMessages = await messagePersistenceService.markUserOnline(socket.userId!);
      
      logger.info(`User ${socket.userId} connected with ${offlineMessages.length} offline messages`);

      // Join user to their personal room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Send offline messages to user
      if (offlineMessages.length > 0) {
        socket.emit('offline_messages', {
          messages: offlineMessages,
          count: offlineMessages.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Connection setup error:', error);
      socket.emit('error', { message: 'Connection setup failed' });
      socket.disconnect(true);
      return;
    }

    // Enhanced stream events with sharding and rate limiting
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

        // Use enhanced room joining with sharding
        const joinResult = await joinRoomWithSharding(socket, streamId, 'stream');
        if (!joinResult.success) {
          socket.emit('error', { message: joinResult.error });
          return;
        }
        
        socketSecurityService.recordRoomJoin(socket.userId!, `stream:${streamId}`);
        
        // Update viewer count
        await LiveStreamService.addViewer(streamId, socket.userId!);
        
        // Broadcast join event using enhanced broadcasting
        const joinData = {
          userId: socket.userId,
          username: socket.user?.username,
          timestamp: new Date(),
          shardId: joinResult.shardId
        };
        await broadcastToRoom(io, `stream:${streamId}`, 'stream:join', joinData, socket.id);

        // Send current stream info to the new viewer with shard info
        const streamInfo = await LiveStreamService.getStreamInfo(streamId);
        socket.emit('stream:join', {
          ...streamInfo,
          shardId: joinResult.shardId,
          roomSize: await getRoomMemberCount(`stream:${streamId}`)
        });

        logger.info(`User ${socket.userId} joined stream ${streamId} on shard ${joinResult.shardId}`);
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

    // Enhanced chat events with advanced rate limiting
    socket.on('chat:new', async (data: { 
      streamId: string, 
      message: string, 
      type: 'public' | 'private' | 'gift' 
    }) => {
      try {
        const { streamId, message, type } = data;
        
        // Enhanced rate limiting for messages
        const rateCheck = await checkRateLimit(socket, 'messages', 30); // 30 messages per minute
        if (!rateCheck.allowed) {
          socket.emit('error', { 
            message: `Rate limit exceeded. Try again in ${Math.ceil((rateCheck.resetTime - Date.now()) / 1000)} seconds`,
            remaining: rateCheck.remaining,
            resetTime: rateCheck.resetTime
          });
          return;
        }
        
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

        // Persist message for offline users
        await messagePersistenceService.persistMessage({
          id: savedMessage._id,
          userId: socket.userId!,
          channelId: streamId,
          channelType: 'stream',
          message,
          messageType: type === 'gift' ? 'gift' : 'text',
          timestamp: savedMessage.timestamp,
          metadata: {
            moderationScore: moderation.score
          }
        });

        // Add user to channel for offline message delivery
        await messagePersistenceService.addUserToChannel(socket.userId!, streamId, 'stream');

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

        // Use enhanced broadcasting
        await broadcastToRoom(io, `stream:${streamId}`, 'chat:new', messageData, socket.id);
        socket.emit('chat:new', messageData);

        logger.info(`Message sent and persisted in stream ${streamId} by user ${socket.userId}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Enhanced gift events with atomic transactions and rate limiting
    socket.on('gift:sent', async (data: { 
      streamId: string, 
      giftId: string, 
      quantity: number 
    }) => {
      try {
        const { streamId, giftId, quantity } = data;
        
        // Enhanced rate limiting for gifts (10 per minute)
        const rateCheck = await checkRateLimit(socket, 'gifts', 10);
        if (!rateCheck.allowed) {
          socket.emit('error', { 
            message: `Gift rate limit exceeded. Try again in ${Math.ceil((rateCheck.resetTime - Date.now()) / 1000)} seconds`,
            remaining: rateCheck.remaining,
            resetTime: rateCheck.resetTime
          });
          return;
        }
        
        // Process gift transaction with atomic operations
        const giftResult = await giftTransactionService.processGiftTransaction(
          socket.userId!,
          streamId, // Using streamId as receiverId for now
          streamId,
          giftId,
          quantity
        );

        if (giftResult.success && giftResult.giftData) {
          // Persist gift message
          await messagePersistenceService.persistMessage({
            id: giftResult.transactionId!,
            userId: socket.userId!,
            channelId: streamId,
            channelType: 'stream',
            message: `Sent ${quantity} ${giftResult.giftData.giftName}`,
            messageType: 'gift',
            timestamp: new Date(),
            metadata: {
              giftId: giftResult.giftData.giftId,
              giftQuantity: quantity
            }
          });

          // Broadcast gift using enhanced broadcasting
          const giftData = {
            senderId: socket.userId,
            senderName: socket.user?.username,
            giftId: giftResult.giftData.giftId,
            giftName: giftResult.giftData.giftName,
            quantity,
            animation: giftResult.giftData.animation,
            timestamp: new Date(),
            transactionId: giftResult.transactionId,
            rarity: giftResult.giftData.rarity,
            coinCost: giftResult.giftData.coinCost
          };

          await broadcastToRoom(io, `stream:${streamId}`, 'gift:sent', giftData, socket.id);
          socket.emit('gift:sent', giftData);

          logger.info(`Gift sent in stream ${streamId} by user ${socket.userId} (txn: ${giftResult.transactionId})`);
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

    // Enhanced disconnection handling with cleanup
    socket.on('disconnect', async (reason) => {
      try {
        logger.info(`User ${socket.userId} disconnected (reason: ${reason})`);
        
        // Decrement connection count
        const connectionCount = await getCache(`connections:${socket.userId}`) || 0;
        if (connectionCount > 0) {
          await setCache(`connections:${socket.userId}`, connectionCount - 1, 3600);
        }
        
        // Clean up socket metadata
        await deleteCache(`socket:${socket.id}`);
        
        // Mark user as offline
        await messagePersistenceService.markUserOffline(socket.userId!);
        
        // Handle socket security cleanup
        socketSecurityService.handleDisconnection(socket.userId!, socket);
        
        // Clean up any active sessions
        await LiveStreamService.handleUserDisconnect(socket.userId!);
        
        // Enhanced room cleanup with sharding
        const roomsToLeave = Array.from(socket.rooms);
        for (const room of roomsToLeave) {
          if (room !== socket.id) {
            socket.leave(room);
            
            // Update room metadata
            const roomMetadata = await getCache(`room:${room}:metadata`);
            if (roomMetadata) {
              roomMetadata.memberCount = Math.max(0, (roomMetadata.memberCount || 1) - 1);
              await setCache(`room:${room}:metadata`, roomMetadata, 3600);
            }
          }
        }
        
        // Clean up rate limiting data
        await Promise.all([
          deleteCache(`rate:${socket.id}:messages`),
          deleteCache(`rate:${socket.id}:gifts`),
          deleteCache(`rate:${socket.id}:joins`)
        ]);
        
        logger.info(`Enhanced cleanup completed for user ${socket.userId}`);
      } catch (error) {
        logger.error('Error handling enhanced disconnect:', error);
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
