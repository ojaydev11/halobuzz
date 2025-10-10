import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { setupLogger } from "@/config/logger";
import { setupGameMatchmaking } from "./game-matchmaking";
import { setupGameRooms } from "./game-rooms";
// Metrics temporarily disabled
// import { 
//   recordConnection, 
//   recordDisconnection, 
//   recordMessage, 
//   recordMessageDuration, 
//   recordPresenceDelta, 
//   recordRateLimitHit, 
//   recordError,
//   updateRoomMetrics
// } from "./metrics";

const logger = setupLogger();

type LiveAuthPayload = { userId: string; username: string; ogLevel?: number; role?: string };

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { messages: number; gifts: number; lastReset: number }>();

export function createRealtime(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    path: "/ws",
    cors: { 
      origin: process.env.CORS_ALLOW?.split(",") ?? ["*"], 
      credentials: true 
    },
    transports: ["websocket", "polling"],
  });

  // Setup /live namespace for streaming
  const nsp = io.of("/live");

  // Setup /games namespace for multiplayer games
  const gamesNsp = io.of("/games");
  
  // Add JWT authentication middleware for games namespace
  gamesNsp.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "")) as string;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as LiveAuthPayload;
      (socket.data as any).user = payload;
      return next();
    } catch (e) { 
      logger.error('Socket authentication error:', e);
      return next(new Error("unauthorized")); 
    }
  });

  // Initialize game matchmaking and room handlers
  setupGameMatchmaking(io);
  setupGameRooms(io);

  // Rate limiting helper
  const checkRateLimit = (userId: string, type: 'messages' | 'gifts'): boolean => {
    const now = Date.now();
    const userLimits = rateLimitStore.get(userId) || { messages: 0, gifts: 0, lastReset: now };
    
    // Reset counters every minute
    if (now - userLimits.lastReset > 60000) {
      userLimits.messages = 0;
      userLimits.gifts = 0;
      userLimits.lastReset = now;
    }
    
    const limit = type === 'messages' ? 30 : 30; // 30 per minute
    if (userLimits[type] >= limit) {
      return false;
    }
    
    userLimits[type]++;
    rateLimitStore.set(userId, userLimits);
    return true;
  };

  // handshake auth (JWT in query or header)
  nsp.use((socket, next) => {
    try {
      const token = (socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace("Bearer ", "")) as string;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as LiveAuthPayload;
      (socket.data as any).user = payload;
      return next();
    } catch (e) { 
      logger.error('Socket authentication error:', e);
      return next(new Error("unauthorized")); 
    }
  });

  nsp.on("connection", (socket) => {
    const user = (socket.data as any).user as LiveAuthPayload;
    logger.info(`User ${user.userId} connected to live namespace`);

    // Record connection metrics
    // recordConnection("/live", "success");

    // Initialize rate limiting for user
    rateLimitStore.set(user.userId, { messages: 0, gifts: 0, lastReset: Date.now() });

    socket.on("join", ({ channelName, role }: { channelName: string; role: "host" | "viewer" }) => {
      const startTime = Date.now();
      const room = `channel:${channelName}`;
      socket.join(room);
      
      // Record metrics
      // recordMessage("/live", "join", "in");
      // recordPresenceDelta("/live", channelName, +1);
      
      // Emit presence update
      nsp.to(room).emit("presence:update", { 
        channelName, 
        delta: +1, 
        userId: user.userId,
        timestamp: Date.now()
      });
      
      // Emit system event
      nsp.to(room).emit("system:event", { 
        type: "join", 
        userId: user.userId, 
        username: user.username, 
        role,
        timestamp: Date.now()
      });
      
      // Optional metrics ping
      nsp.to(room).emit("metrics:ping");
      
      // Record message duration
      // recordMessageDuration("/live", "join", (Date.now() - startTime) / 1000);
      
      logger.info(`User ${user.userId} joined channel ${channelName} as ${role}`);
    });

    socket.on("leave", ({ channelName }: { channelName: string }) => {
      const startTime = Date.now();
      const room = `channel:${channelName}`;
      socket.leave(room);
      
      // Record metrics
      // recordMessage("/live", "leave", "in");
      // recordPresenceDelta("/live", channelName, -1);
      
      // Emit presence update
      nsp.to(room).emit("presence:update", { 
        channelName, 
        delta: -1, 
        userId: user.userId,
        timestamp: Date.now()
      });
      
      // Emit system event
      nsp.to(room).emit("system:event", { 
        type: "leave", 
        userId: user.userId,
        username: user.username,
        timestamp: Date.now()
      });
      
      // Record message duration
      // recordMessageDuration("/live", "leave", (Date.now() - startTime) / 1000);
      
      logger.info(`User ${user.userId} left channel ${channelName}`);
    });

    // chat (rate limited client-side; server also guards)
    socket.on("chat:send", ({ channelName, message }: { channelName: string; message: string }) => {
      const startTime = Date.now();
      const room = `channel:${channelName}`;
      
      // Record metrics
      // recordMessage("/live", "chat", "in");
      
      // Validate message
      if (!message || message.length > 500) {
        // recordError("/live", "invalid_message_length");
        socket.emit("error", { message: "Invalid message length" });
        return;
      }
      
      // Check rate limit
      if (!checkRateLimit(user.userId, 'messages')) {
        // recordRateLimitHit("/live", "messages", user.userId);
        socket.emit("error", { message: "Rate limit exceeded for messages" });
        return;
      }
      
      // Strip HTML and sanitize
      const sanitizedMessage = message.replace(/<[^>]*>/g, '').trim();
      if (!sanitizedMessage) {
        // recordError("/live", "empty_message");
        socket.emit("error", { message: "Message cannot be empty" });
        return;
      }
      
      // Broadcast to room
      nsp.to(room).emit("chat:new", { 
        userId: user.userId, 
        username: user.username, 
        message: sanitizedMessage, 
        timestamp: Date.now() 
      });
      
      // Record outgoing message
      // recordMessage("/live", "chat", "out");
      // recordMessageDuration("/live", "chat", (Date.now() - startTime) / 1000);
      
      logger.info(`Chat message sent in channel ${channelName} by user ${user.userId}`);
    });

    // gift events coming from API (server) should re-broadcast; this listener allows host tools
    socket.on("gift:announce", ({ channelName, giftId, qty }: { channelName: string; giftId: string; qty: number }) => {
      const startTime = Date.now();
      const room = `channel:${channelName}`;
      
      // Record metrics
      // recordMessage("/live", "gift", "in");
      
      // Check rate limit
      if (!checkRateLimit(user.userId, 'gifts')) {
        // recordRateLimitHit("/live", "gifts", user.userId);
        socket.emit("error", { message: "Rate limit exceeded for gifts" });
        return;
      }
      
      // Validate gift data
      if (!giftId || qty <= 0 || qty > 100) {
        // recordError("/live", "invalid_gift_data");
        socket.emit("error", { message: "Invalid gift data" });
        return;
      }
      
      nsp.to(room).emit("gift:new", { 
        from: user.userId, 
        fromUsername: user.username,
        giftId, 
        qty, 
        timestamp: Date.now() 
      });
      
      // Record outgoing message
      // recordMessage("/live", "gift", "out");
      // recordMessageDuration("/live", "gift", (Date.now() - startTime) / 1000);
      
      logger.info(`Gift announced in channel ${channelName} by user ${user.userId}`);
    });

    // moderation pings (admin/AI only)
    socket.on("mod:decision", ({ channelName, action, reason }: { channelName: string; action: "warn" | "mute" | "end"; reason?: string }) => {
      // Check if user has moderation privileges
      if (user.ogLevel !== 5 && user.role !== "admin") {
        socket.emit("error", { message: "Insufficient privileges for moderation" });
        return;
      }
      
      const room = `channel:${channelName}`;
      nsp.to(room).emit("mod:event", { 
        action, 
        by: user.userId, 
        byUsername: user.username,
        reason, 
        timestamp: Date.now() 
      });
      
      logger.info(`Moderation action ${action} in channel ${channelName} by user ${user.userId}`);
    });

    // heartbeat
    socket.on("heartbeat", ({ channelName }: { channelName: string }) => {
      const room = `channel:${channelName}`;
      nsp.to(room).emit("heartbeat:ack", { 
        timestamp: Date.now(),
        userId: user.userId 
      });
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      logger.info(`User ${user.userId} disconnected from live namespace`);
      
      // Record disconnection metrics
      // recordDisconnection("/live", "client_disconnect");
      
      // Clean up rate limiting data
      rateLimitStore.delete(user.userId);
      
      // Note: presence updates are handled by client leave events or timeout
    });

    // Error handling
    socket.on("error", (error) => {
      logger.error(`Socket error for user ${user.userId}:`, error);
    });
  });

  // Global error handling
  nsp.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
  });

  return io;
}
