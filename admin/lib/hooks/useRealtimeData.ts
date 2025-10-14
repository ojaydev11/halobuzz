import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { wsConfig, realtimeEvents } from '../lib/api-config';

interface RealtimeData {
  users: {
    total: number;
    online: number;
    newToday: number;
  };
  games: {
    totalPlays: number;
    activeGames: number;
    revenue: number;
  };
  system: {
    cpu: number;
    memory: number;
    uptime: number;
  };
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

interface UseRealtimeDataReturn {
  data: RealtimeData;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export const useRealtimeData = (): UseRealtimeDataReturn => {
  const [data, setData] = useState<RealtimeData>({
    users: { total: 0, online: 0, newToday: 0 },
    games: { totalPlays: 0, activeGames: 0, revenue: 0 },
    system: { cpu: 0, memory: 0, uptime: 0 },
    notifications: [],
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = useCallback(() => {
    try {
      const newSocket = io(wsConfig.url, {
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionDelay: wsConfig.reconnectInterval,
        reconnectionAttempts: wsConfig.maxReconnectAttempts,
      });

      newSocket.on('connect', () => {
        console.log('Connected to real-time data stream');
        setIsConnected(true);
        setError(null);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from real-time data stream');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setError(err.message);
        setIsConnected(false);
      });

      // Listen for real-time updates
      newSocket.on(realtimeEvents.ANALYTICS_UPDATE, (updateData: Partial<RealtimeData>) => {
        setData(prev => ({ ...prev, ...updateData }));
      });

      newSocket.on(realtimeEvents.USER_REGISTRATION, (userData: any) => {
        setData(prev => ({
          ...prev,
          users: {
            ...prev.users,
            total: prev.users.total + 1,
            newToday: prev.users.newToday + 1,
          },
          notifications: [
            {
              id: `user-${userData.id}`,
              type: 'user_registration',
              message: `New user registered: ${userData.username}`,
              timestamp: new Date(),
              severity: 'low',
            },
            ...prev.notifications.slice(0, 9), // Keep only last 10 notifications
          ],
        }));
      });

      newSocket.on(realtimeEvents.GAME_PLAY, (gameData: any) => {
        setData(prev => ({
          ...prev,
          games: {
            ...prev.games,
            totalPlays: prev.games.totalPlays + 1,
            revenue: prev.games.revenue + (gameData.entryFee || 0),
          },
        }));
      });

      newSocket.on(realtimeEvents.SYSTEM_ALERT, (alertData: any) => {
        setData(prev => ({
          ...prev,
          notifications: [
            {
              id: `alert-${Date.now()}`,
              type: 'system_alert',
              message: alertData.message,
              timestamp: new Date(),
              severity: alertData.severity || 'medium',
            },
            ...prev.notifications.slice(0, 9),
          ],
        }));
      });

      setSocket(newSocket);
    } catch (err) {
      console.error('Failed to connect to real-time data:', err);
      setError('Failed to connect to real-time data stream');
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    connect();
  }, [socket, connect]);

  useEffect(() => {
    connect();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [connect]);

  return {
    data,
    isConnected,
    error,
    reconnect,
  };
};

export default useRealtimeData;
