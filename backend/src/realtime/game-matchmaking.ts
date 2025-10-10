import type { Server, Socket } from 'socket.io';
import { setupLogger } from '@/config/logger';
import { matchmakingService } from '@/services/MatchmakingService';
import { gameRoomService } from '@/services/GameRoomService';
import { MMRService } from '@/services/MMRService';

const logger = setupLogger();

interface MatchmakingSocket extends Socket {
  data: {
    user: {
      userId: string;
      username: string;
      avatar?: string;
    };
  };
}

/**
 * Setup real-time matchmaking handlers
 */
export function setupGameMatchmaking(io: Server) {
  const gameNamespace = io.of('/games');

  gameNamespace.on('connection', (socket: MatchmakingSocket) => {
    const user = socket.data.user;
    logger.info(`User ${user.userId} connected to games namespace`);

    /**
     * Join matchmaking queue
     * Client emits: { gameId: string, mode?: 'ranked' | 'casual' | 'tournament' }
     */
    socket.on('matchmaking:join', async (data: { gameId: string; mode?: 'ranked' | 'casual' | 'tournament' }) => {
      try {
        const { gameId, mode = 'casual' } = data;

        // Get player's MMR for ranked mode
        let mmr = 1000; // Default MMR
        if (mode === 'ranked') {
          const mmrService = new MMRService();
          const rating = await mmrService.getOrCreateRating(user.userId, gameId);
          mmr = rating.mmr;
        }

        const result = await matchmakingService.joinQueue({
          userId: user.userId,
          username: user.username,
          mmr,
          gameId,
          socketId: socket.id,
          preferences: { mode }
        });

        if (result.success) {
          // Join matchmaking room for updates
          socket.join(`matchmaking:${gameId}:${mode}`);

          socket.emit('matchmaking:joined', {
            queuePosition: result.queuePosition,
            estimatedWait: result.estimatedWait,
            mode
          });

          logger.info(`User ${user.userId} joined ${gameId} matchmaking (mode: ${mode}, position: ${result.queuePosition})`);

          // Start polling for matches (this runs in MatchmakingService)
        } else {
          socket.emit('matchmaking:error', { message: result.error });
        }
      } catch (error) {
        logger.error('Matchmaking join error:', error);
        socket.emit('matchmaking:error', { message: 'Failed to join matchmaking' });
      }
    });

    /**
     * Leave matchmaking queue
     */
    socket.on('matchmaking:leave', async () => {
      try {
        await matchmakingService.leaveQueue(user.userId);

        // Leave all matchmaking rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('matchmaking:')) {
            socket.leave(room);
          }
        });

        socket.emit('matchmaking:left', { success: true });
        logger.info(`User ${user.userId} left matchmaking`);
      } catch (error) {
        logger.error('Matchmaking leave error:', error);
        socket.emit('matchmaking:error', { message: 'Failed to leave matchmaking' });
      }
    });

    /**
     * Get queue statistics
     */
    socket.on('matchmaking:stats', async (data: { gameId: string; mode?: string }) => {
      try {
        const stats = await matchmakingService.getQueueStats(data.gameId, data.mode || 'casual');
        socket.emit('matchmaking:stats', stats);
      } catch (error) {
        logger.error('Queue stats error:', error);
        socket.emit('matchmaking:error', { message: 'Failed to get queue stats' });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async () => {
      try {
        // Auto-leave matchmaking on disconnect
        await matchmakingService.leaveQueue(user.userId);
        logger.info(`User ${user.userId} disconnected from games namespace`);
      } catch (error) {
        logger.error('Disconnect cleanup error:', error);
      }
    });
  });

  return gameNamespace;
}

/**
 * Notify players when match is found
 * Called by MatchmakingService when matches are created
 */
export async function notifyMatchFound(io: Server, match: any) {
  const gameNamespace = io.of('/games');

  for (const player of match.players) {
    // Create game room
    const roomResult = await gameRoomService.createRoom({
      gameId: match.gameId,
      mode: '1v1',
      maxPlayers: 2,
      config: {
        allowSpectators: true
      },
      metadata: {
        matchId: match.matchId
      }
    });

    if (roomResult.success && roomResult.room) {
      // Notify both players
      gameNamespace.to(player.socketId).emit('matchmaking:match_found', {
        matchId: match.matchId,
        roomId: roomResult.room.roomId,
        opponent: match.players.find((p: any) => p.userId !== player.userId),
        mode: match.mode,
        estimatedStartTime: Date.now() + 5000 // 5 seconds to accept
      });

      logger.info(`Match found notification sent to ${player.userId}`);
    }
  }
}
