import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectLive(token: string) {
  const apiBase = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';
  socket = io(`${apiBase}/live`, { 
    path: "/ws", 
    transports: ["websocket"], 
    auth: { token } 
  });
  
  return new Promise<void>((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket initialization failed'));
      return;
    }
    
    socket.on("connect", () => {
      console.log('Connected to live realtime layer');
      resolve();
    });
    
    socket.on("connect_error", (error) => {
      console.error('Connection error:', error);
      reject(error);
    });
  });
}

export const joinChannel = (channelName: string, role: "host" | "viewer") => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.emit("join", { channelName, role });
};

export const leaveChannel = (channelName: string) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.emit("leave", { channelName });
};

export const sendChat = (channelName: string, message: string) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.emit("chat:send", { channelName, message });
};

export const announceGift = (channelName: string, giftId: string, qty: number) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.emit("gift:announce", { channelName, giftId, qty });
};

export const sendModerationDecision = (channelName: string, action: "warn" | "mute" | "end", reason?: string) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.emit("mod:decision", { channelName, action, reason });
};

export const sendHeartbeat = (channelName: string) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.emit("heartbeat", { channelName });
};

// Event listeners
export const onPresence = (cb: (data: {
  channelName: string;
  delta: number;
  userId: string;
  username?: string;
  timestamp: number;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("presence:update", cb);
};

export const onChat = (cb: (data: {
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("chat:new", cb);
};

export const onGift = (cb: (data: {
  from: string;
  fromUsername?: string;
  giftId: string;
  qty: number;
  timestamp: number;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("gift:new", cb);
};

export const onSystem = (cb: (data: {
  type: string;
  userId?: string;
  username?: string;
  role?: string;
  timestamp: number;
  [key: string]: any;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("system:event", cb);
};

export const onModeration = (cb: (data: {
  action: "warn" | "mute" | "end";
  by: string;
  byUsername?: string;
  reason?: string;
  targetUserId?: string;
  timestamp: number;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("mod:event", cb);
};

export const onHeartbeatAck = (cb: (data: {
  timestamp: number;
  userId: string;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("heartbeat:ack", cb);
};

export const onMetrics = (cb: (data: {
  channelName: string;
  metrics: any;
  timestamp: number;
}) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("metrics:update", cb);
};

export const onError = (cb: (error: { message: string }) => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("error", cb);
};

export const onDisconnect = (cb: () => void) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  socket.on("disconnect", cb);
};

// Utility functions
export const isConnected = (): boolean => {
  return socket?.connected || false;
};

export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Remove specific event listeners
export const removeListener = (event: string, callback?: Function) => {
  if (!socket) {
    console.warn('Socket not connected');
    return;
  }
  if (callback) {
    socket.off(event, callback);
  } else {
    socket.removeAllListeners(event);
  }
};

// Get socket instance for advanced usage
export const getSocket = (): Socket | null => {
  return socket;
};
