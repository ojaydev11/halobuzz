import { Server } from "socket.io";
import { setupLogger } from "@/config/logger";

const logger = setupLogger();

let ioRef: Server | null = null;

export const setIo = (io: Server) => {
  ioRef = io;
  logger.info('Socket.IO reference set for emitters');
};

export const emitGift = (channel: string, payload: {
  from: string;
  fromUsername?: string;
  giftId: string;
  qty: number;
  timestamp?: number;
}) => {
  if (!ioRef) {
    logger.warn('Socket.IO not initialized, cannot emit gift');
    return;
  }
  
  try {
    ioRef.of("/live").to(`channel:${channel}`).emit("gift:new", {
      ...payload,
      timestamp: payload.timestamp || Date.now()
    });
    logger.info(`Gift emitted to channel ${channel}:`, payload);
  } catch (error) {
    logger.error('Error emitting gift:', error);
  }
};

export const emitPresence = (channel: string, delta: number, userId: string, username?: string) => {
  if (!ioRef) {
    logger.warn('Socket.IO not initialized, cannot emit presence');
    return;
  }
  
  try {
    ioRef.of("/live").to(`channel:${channel}`).emit("presence:update", { 
      channelName: channel, 
      delta, 
      userId,
      username,
      timestamp: Date.now()
    });
    logger.info(`Presence update emitted to channel ${channel}: delta=${delta}, userId=${userId}`);
  } catch (error) {
    logger.error('Error emitting presence:', error);
  }
};

export const emitSystem = (channel: string, type: string, extra: any = {}) => {
  if (!ioRef) {
    logger.warn('Socket.IO not initialized, cannot emit system event');
    return;
  }
  
  try {
    ioRef.of("/live").to(`channel:${channel}`).emit("system:event", { 
      type, 
      ...extra, 
      timestamp: Date.now() 
    });
    logger.info(`System event emitted to channel ${channel}: type=${type}`);
  } catch (error) {
    logger.error('Error emitting system event:', error);
  }
};

export const emitChat = (channel: string, payload: {
  userId: string;
  username: string;
  message: string;
  timestamp?: number;
}) => {
  if (!ioRef) {
    logger.warn('Socket.IO not initialized, cannot emit chat');
    return;
  }
  
  try {
    ioRef.of("/live").to(`channel:${channel}`).emit("chat:new", {
      ...payload,
      timestamp: payload.timestamp || Date.now()
    });
    logger.info(`Chat message emitted to channel ${channel}:`, payload);
  } catch (error) {
    logger.error('Error emitting chat:', error);
  }
};

export const emitModeration = (channel: string, payload: {
  action: "warn" | "mute" | "end";
  by: string;
  byUsername?: string;
  reason?: string;
  targetUserId?: string;
}) => {
  if (!ioRef) {
    logger.warn('Socket.IO not initialized, cannot emit moderation event');
    return;
  }
  
  try {
    ioRef.of("/live").to(`channel:${channel}`).emit("mod:event", {
      ...payload,
      timestamp: Date.now()
    });
    logger.info(`Moderation event emitted to channel ${channel}:`, payload);
  } catch (error) {
    logger.error('Error emitting moderation event:', error);
  }
};

export const emitMetrics = (channel: string, metrics: any) => {
  if (!ioRef) {
    logger.warn('Socket.IO not initialized, cannot emit metrics');
    return;
  }
  
  try {
    ioRef.of("/live").to(`channel:${channel}`).emit("metrics:update", {
      channelName: channel,
      metrics,
      timestamp: Date.now()
    });
    logger.info(`Metrics emitted to channel ${channel}`);
  } catch (error) {
    logger.error('Error emitting metrics:', error);
  }
};

// Helper function to get current viewer count for a channel
export const getChannelViewerCount = async (channel: string): Promise<number> => {
  if (!ioRef) {
    return 0;
  }
  
  try {
    const room = ioRef.of("/live").adapter.rooms.get(`channel:${channel}`);
    return room ? room.size : 0;
  } catch (error) {
    logger.error('Error getting channel viewer count:', error);
    return 0;
  }
};

// Helper function to check if a user is in a channel
export const isUserInChannel = async (userId: string, channel: string): Promise<boolean> => {
  if (!ioRef) {
    return false;
  }
  
  try {
    const sockets = await ioRef.of("/live").fetchSockets();
    return sockets.some(socket => 
      socket.rooms.has(`channel:${channel}`) && 
      (socket.data as any).user?.userId === userId
    );
  } catch (error) {
    logger.error('Error checking if user is in channel:', error);
    return false;
  }
};
