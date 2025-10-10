import type { Server, Socket } from 'socket.io';
import { setupLogger } from '@/config/logger';
import { gameRoomService, GameRoomState } from '@/services/GameRoomService';
import { GameSessionService } from '@/services/GameSessionService';
import { AntiCheatService } from '@/services/AntiCheatService';
import { MMRService } from '@/services/MMRService';

const logger = setupLogger();

interface GameSocket extends Socket {
  data: {
    user: {
      userId: string;
      username: string;
      avatar?: string;
    };
  };
}

/**
 * Setup real-time game room handlers
 */
export function setupGameRooms(io: Server) {
  const gameNamespace = io.of('/games');

  gameNamespace.on('connection', (socket: GameSocket) => {
    const user = socket.data.user;

    /**
     * Join a game room
     */
    socket.on('game:join', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        const result = await gameRoomService.joinRoom(roomId, {
          userId: user.userId,
          username: user.username,
          avatar: user.avatar,
          socketId: socket.id
        });

        if (result.success && result.room) {
          // Join Socket.IO room
          socket.join(roomId);

          // Emit to player
          socket.emit('game:joined', {
            room: result.room,
            playerData: result.room.players.find(p => p.userId === user.userId)
          });

          // Broadcast to other players
          socket.to(roomId).emit('game:player_joined', {
            player: result.room.players.find(p => p.userId === user.userId),
            totalPlayers: result.room.players.length
          });

          // Emit room state update
          emitRoomState(gameNamespace, result.room);

          logger.info(`User ${user.userId} joined game room ${roomId}`);
        } else {
          socket.emit('game:error', { message: result.error });
        }
      } catch (error) {
        logger.error('Game join error:', error);
        socket.emit('game:error', { message: 'Failed to join game' });
      }
    });

    /**
     * Leave game room
     */
    socket.on('game:leave', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        await gameRoomService.leaveRoom(roomId, user.userId);
        socket.leave(roomId);

        socket.emit('game:left', { roomId });

        // Broadcast to remaining players
        socket.to(roomId).emit('game:player_left', {
          userId: user.userId,
          username: user.username
        });

        // Get updated room state
        const room = await gameRoomService.getRoom(roomId);
        if (room) {
          emitRoomState(gameNamespace, room);
        }

        logger.info(`User ${user.userId} left game room ${roomId}`);
      } catch (error) {
        logger.error('Game leave error:', error);
        socket.emit('game:error', { message: 'Failed to leave game' });
      }
    });

    /**
     * Set player ready status
     */
    socket.on('game:ready', async (data: { roomId: string; ready: boolean }) => {
      try {
        const { roomId, ready } = data;

        const result = await gameRoomService.setPlayerReady(roomId, user.userId, ready);

        if (result.success && result.room) {
          // Broadcast ready status to all players
          gameNamespace.to(roomId).emit('game:player_ready', {
            userId: user.userId,
            ready,
            allReady: result.room.players.every(p => p.ready)
          });

          // Emit room state update
          emitRoomState(gameNamespace, result.room);

          // Auto-start if all ready and room status is 'ready'
          if (result.room.status === 'ready') {
            setTimeout(async () => {
              const startResult = await gameRoomService.startGame(roomId);
              if (startResult.success && startResult.room) {
                gameNamespace.to(roomId).emit('game:starting', {
                  countdown: 3,
                  startTime: Date.now() + 3000
                });

                // Emit room state update
                setTimeout(async () => {
                  const updatedRoom = await gameRoomService.getRoom(roomId);
                  if (updatedRoom) {
                    emitRoomState(gameNamespace, updatedRoom);
                    gameNamespace.to(roomId).emit('game:started', {
                      gameState: updatedRoom.gameState
                    });
                  }
                }, 3000);
              }
            }, 1000); // 1 second delay before starting countdown
          }

          logger.info(`User ${user.userId} set ready: ${ready} in room ${roomId}`);
        } else {
          socket.emit('game:error', { message: result.error });
        }
      } catch (error) {
        logger.error('Game ready error:', error);
        socket.emit('game:error', { message: 'Failed to set ready status' });
      }
    });

    /**
     * Player action (tap, answer, move, etc.)
     */
    socket.on('game:action', async (data: { roomId: string; type: string; data: any }) => {
      try {
        const { roomId, type, data: actionData } = data;

        // Record action
        const result = await gameRoomService.recordAction(roomId, {
          userId: user.userId,
          type,
          data: actionData
        });

        if (result.success && result.action) {
          // Broadcast action to all players (for real-time feedback)
          gameNamespace.to(roomId).emit('game:action', {
            userId: user.userId,
            type,
            data: actionData,
            timestamp: result.action.timestamp
          });

          // Handle game-specific logic
          await handleGameAction(gameNamespace, roomId, user.userId, type, actionData);

          logger.info(`Action ${type} recorded for user ${user.userId} in room ${roomId}`);
        } else {
          socket.emit('game:error', { message: result.error });
        }
      } catch (error) {
        logger.error('Game action error:', error);
        socket.emit('game:error', { message: 'Failed to record action' });
      }
    });

    /**
     * Update score (server-validated)
     */
    socket.on('game:score_update', async (data: { roomId: string; score: number; metadata?: any }) => {
      try {
        const { roomId, score, metadata } = data;

        // Validate score (anti-cheat)
        const room = await gameRoomService.getRoom(roomId);
        if (!room) {
          socket.emit('game:error', { message: 'Room not found' });
          return;
        }

        const antiCheatService = new AntiCheatService();
        const validation = await antiCheatService.validateScore(
          user.userId,
          room.gameId,
          score,
          metadata
        );

        if (!validation.isValid) {
          socket.emit('game:error', { message: 'Score validation failed' });
          logger.warn(`Score validation failed for user ${user.userId}: ${validation.reason}`);
          return;
        }

        // Update score
        await gameRoomService.updatePlayerScore(roomId, user.userId, score);

        // Broadcast score update
        gameNamespace.to(roomId).emit('game:score_update', {
          userId: user.userId,
          username: user.username,
          score,
          timestamp: Date.now()
        });

        // Emit leaderboard update
        const updatedRoom = await gameRoomService.getRoom(roomId);
        if (updatedRoom) {
          const leaderboard = updatedRoom.players
            .map(p => ({ userId: p.userId, username: p.username, score: p.score }))
            .sort((a, b) => b.score - a.score);

          gameNamespace.to(roomId).emit('game:leaderboard_update', { leaderboard });
        }

        logger.info(`Score updated for user ${user.userId} in room ${roomId}: ${score}`);
      } catch (error) {
        logger.error('Score update error:', error);
        socket.emit('game:error', { message: 'Failed to update score' });
      }
    });

    /**
     * End game (host or auto-end)
     */
    socket.on('game:end', async (data: { roomId: string; reason?: string }) => {
      try {
        const { roomId, reason } = data;

        const room = await gameRoomService.getRoom(roomId);
        if (!room) {
          socket.emit('game:error', { message: 'Room not found' });
          return;
        }

        // Calculate winners and results
        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        const winners = [sortedPlayers[0].userId];
        const losers = sortedPlayers.slice(1).map(p => p.userId);

        const scores: Record<string, number> = {};
        room.players.forEach(p => {
          scores[p.userId] = p.score;
        });

        const duration = room.startedAt ? Date.now() - room.startedAt : 0;

        // End game
        const result = await gameRoomService.endGame(roomId, {
          winners,
          losers,
          scores,
          duration,
          metadata: { reason }
        });

        if (result.success && result.result) {
          // Broadcast game end to all players
          gameNamespace.to(roomId).emit('game:ended', {
            result: result.result,
            winners,
            scores,
            duration
          });

          // Update MMR for ranked games
          if (room.mode === '1v1' && room.metadata.matchId) {
            await updateMMRAfterMatch(room, winners, losers);
          }

          // Create game sessions for all players
          const gameSessionService = new GameSessionService();
          for (const player of room.players) {
            await gameSessionService.endSession(
              `temp_session_${player.userId}`, // Would be created on game start
              player.score,
              {
                gameMode: room.mode,
                opponentIds: room.players.filter(p => p.userId !== player.userId).map(p => p.userId),
                won: winners.includes(player.userId),
                duration
              }
            );
          }

          logger.info(`Game ended in room ${roomId}`);
        } else {
          socket.emit('game:error', { message: result.error });
        }
      } catch (error) {
        logger.error('Game end error:', error);
        socket.emit('game:error', { message: 'Failed to end game' });
      }
    });

    /**
     * Join as spectator
     */
    socket.on('game:spectate', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        const result = await gameRoomService.joinAsSpectator(roomId, user.userId);

        if (result.success) {
          socket.join(`${roomId}:spectators`);

          const room = await gameRoomService.getRoom(roomId);
          socket.emit('game:spectating', { room });

          logger.info(`User ${user.userId} joined as spectator in room ${roomId}`);
        } else {
          socket.emit('game:error', { message: result.error });
        }
      } catch (error) {
        logger.error('Spectate error:', error);
        socket.emit('game:error', { message: 'Failed to join as spectator' });
      }
    });

    /**
     * Get room state
     */
    socket.on('game:get_state', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;

        const room = await gameRoomService.getRoom(roomId);
        if (room) {
          socket.emit('game:state', { room });
        } else {
          socket.emit('game:error', { message: 'Room not found' });
        }
      } catch (error) {
        logger.error('Get state error:', error);
        socket.emit('game:error', { message: 'Failed to get room state' });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async () => {
      try {
        // Find all rooms user was in and handle cleanup
        const rooms = Array.from(socket.rooms);
        for (const room of rooms) {
          if (room.startsWith('room:')) {
            await gameRoomService.leaveRoom(room, user.userId);
            socket.to(room).emit('game:player_disconnected', {
              userId: user.userId,
              username: user.username
            });
          }
        }

        logger.info(`User ${user.userId} disconnected from game rooms`);
      } catch (error) {
        logger.error('Disconnect cleanup error:', error);
      }
    });
  });

  return gameNamespace;
}

/**
 * Emit room state to all players
 */
function emitRoomState(namespace: any, room: GameRoomState) {
  namespace.to(room.roomId).emit('game:state_update', {
    status: room.status,
    players: room.players.map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      ready: p.ready,
      score: p.score,
      disconnected: p.disconnected
    })),
    spectatorCount: room.spectators.length,
    gameState: room.gameState
  });
}

/**
 * Handle game-specific actions
 */
async function handleGameAction(namespace: any, roomId: string, userId: string, type: string, data: any) {
  const room = await gameRoomService.getRoom(roomId);
  if (!room) return;

  // Game-specific logic
  switch (room.gameId) {
    case 'coin-flip-deluxe':
      if (type === 'flip') {
        const result = Math.random() > 0.5 ? 'heads' : 'tails';
        namespace.to(roomId).emit('game:coin_result', { userId, result });
      }
      break;

    case 'tap-duel':
      if (type === 'tap') {
        // Record tap time and count
        await gameRoomService.updateGameState(roomId, {
          [`taps_${userId}`]: (room.gameState[`taps_${userId}`] || 0) + 1,
          [`lastTap_${userId}`]: Date.now()
        });
      }
      break;

    case 'trivia-royale':
      if (type === 'answer') {
        // Validate answer and award points
        const { questionId, answer, timeMs } = data;
        // Would check against correct answer
        namespace.to(roomId).emit('game:answer_submitted', {
          userId,
          questionId,
          timeMs
        });
      }
      break;

    case 'buzz-runner':
      if (type === 'jump' || type === 'collect') {
        await gameRoomService.updateGameState(roomId, {
          distance: (room.gameState.distance || 0) + (data.distance || 0),
          coinsCollected: (room.gameState.coinsCollected || 0) + (data.coins || 0)
        });
      }
      break;

    case 'stack-storm':
      if (type === 'drop_block') {
        // Record block placement
        await gameRoomService.updateGameState(roomId, {
          height: (room.gameState.height || 0) + 1,
          blocks: [...(room.gameState.blocks || []), data.block]
        });

        namespace.to(roomId).emit('game:block_dropped', {
          userId,
          block: data.block,
          newHeight: (room.gameState.height || 0) + 1
        });
      }
      break;

    case 'buzz-arena':
      if (type === 'fire') {
        // Handle projectile/attack
        namespace.to(roomId).emit('game:projectile', {
          userId,
          lane: data.lane,
          power: data.power
        });
      }
      break;
  }
}

/**
 * Update MMR after match completion
 */
async function updateMMRAfterMatch(room: GameRoomState, winners: string[], losers: string[]) {
  try {
    const mmrService = new MMRService();

    if (room.players.length === 2) {
      // 1v1 match
      const winner = room.players.find(p => winners.includes(p.userId));
      const loser = room.players.find(p => losers.includes(p.userId));

      if (winner && loser) {
        await mmrService.updateAfterMatch(
          winner.userId,
          loser.userId,
          room.gameId,
          'win'
        );

        logger.info(`MMR updated for match: ${winner.userId} (win) vs ${loser.userId} (loss)`);
      }
    }
  } catch (error) {
    logger.error('MMR update error:', error);
  }
}
