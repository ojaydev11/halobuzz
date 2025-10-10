import { setupLogger } from '@/config/logger';
import { getCache, setCache, deleteCache } from '@/config/redis';
import { MMRService } from './MMRService';
import { v4 as uuidv4 } from 'uuid';

const logger = setupLogger();

interface MatchmakingPlayer {
  userId: string;
  username: string;
  mmr: number;
  gameId: string;
  socketId: string;
  joinedAt: number;
  preferences?: {
    mode?: 'ranked' | 'casual' | 'tournament';
    region?: string;
  };
}

interface MatchmakingQueue {
  gameId: string;
  players: MatchmakingPlayer[];
  createdAt: number;
  mode: 'ranked' | 'casual' | 'tournament';
}

interface Match {
  matchId: string;
  gameId: string;
  players: MatchmakingPlayer[];
  roomId: string;
  mode: string;
  createdAt: number;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
}

export class MatchmakingService {
  private matchmakingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly MATCHMAKING_INTERVAL = 2000; // Check every 2 seconds
  private readonly QUEUE_TIMEOUT = 120000; // 2 minutes max in queue
  private readonly MMR_RANGES = [50, 100, 150, 200, 300, 500]; // Expanding MMR search ranges

  /**
   * Join matchmaking queue
   */
  async joinQueue(player: MatchmakingPlayer): Promise<{ success: boolean; queuePosition?: number; estimatedWait?: number; error?: string }> {
    try {
      const { gameId, userId, mode } = player;
      const queueKey = `matchmaking:queue:${gameId}:${mode || 'casual'}`;

      // Check if player already in queue
      const existingQueue = await this.getQueue(queueKey);
      if (existingQueue?.players.some(p => p.userId === userId)) {
        return {
          success: false,
          error: 'Already in matchmaking queue'
        };
      }

      // Add player to queue
      const updatedQueue: MatchmakingQueue = existingQueue || {
        gameId,
        players: [],
        createdAt: Date.now(),
        mode: mode || 'casual'
      };

      updatedQueue.players.push({
        ...player,
        joinedAt: Date.now()
      });

      await setCache(queueKey, updatedQueue, 300); // 5 minute TTL

      // Store player's queue reference for quick lookup
      await setCache(`player:queue:${userId}`, queueKey, 300);

      logger.info(`Player ${userId} joined ${gameId} matchmaking queue (position: ${updatedQueue.players.length})`);

      // Start matchmaking process if not already running
      this.startMatchmaking(queueKey);

      return {
        success: true,
        queuePosition: updatedQueue.players.length,
        estimatedWait: this.estimateWaitTime(updatedQueue.players.length, gameId)
      };
    } catch (error) {
      logger.error('Error joining matchmaking queue:', error);
      return {
        success: false,
        error: 'Failed to join queue'
      };
    }
  }

  /**
   * Leave matchmaking queue
   */
  async leaveQueue(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get player's current queue
      const queueKey = await getCache(`player:queue:${userId}`) as string;
      if (!queueKey) {
        return { success: true }; // Already not in queue
      }

      // Remove player from queue
      const queue = await this.getQueue(queueKey);
      if (queue) {
        queue.players = queue.players.filter(p => p.userId !== userId);

        if (queue.players.length > 0) {
          await setCache(queueKey, queue, 300);
        } else {
          // Queue empty, delete it
          await deleteCache(queueKey);
          this.stopMatchmaking(queueKey);
        }
      }

      // Clean up player reference
      await deleteCache(`player:queue:${userId}`);

      logger.info(`Player ${userId} left matchmaking queue`);
      return { success: true };
    } catch (error) {
      logger.error('Error leaving matchmaking queue:', error);
      return {
        success: false,
        error: 'Failed to leave queue'
      };
    }
  }

  /**
   * Find match for players in queue (MMR-based)
   */
  async findMatches(queueKey: string): Promise<Match[]> {
    try {
      const queue = await this.getQueue(queueKey);
      if (!queue || queue.players.length < 2) {
        return [];
      }

      const matches: Match[] = [];
      const matchedPlayers = new Set<string>();

      // Sort players by join time (FIFO)
      const sortedPlayers = [...queue.players].sort((a, b) => a.joinedAt - b.joinedAt);

      for (const player of sortedPlayers) {
        if (matchedPlayers.has(player.userId)) continue;

        // Find suitable opponent based on MMR
        const waitTime = Date.now() - player.joinedAt;
        const mmrRange = this.getMmrRange(waitTime);

        const opponent = sortedPlayers.find(p =>
          p.userId !== player.userId &&
          !matchedPlayers.has(p.userId) &&
          Math.abs(p.mmr - player.mmr) <= mmrRange &&
          p.gameId === player.gameId
        );

        if (opponent) {
          // Create match
          const match: Match = {
            matchId: uuidv4(),
            gameId: player.gameId,
            players: [player, opponent],
            roomId: `game:${player.gameId}:${uuidv4()}`,
            mode: queue.mode,
            createdAt: Date.now(),
            status: 'pending'
          };

          matches.push(match);
          matchedPlayers.add(player.userId);
          matchedPlayers.add(opponent.userId);

          // Store match data
          await setCache(`match:${match.matchId}`, match, 600); // 10 minutes

          logger.info(`Match found: ${player.userId} vs ${opponent.userId} (MMR: ${player.mmr} vs ${opponent.mmr})`);
        }
      }

      // Update queue - remove matched players
      if (matchedPlayers.size > 0) {
        queue.players = queue.players.filter(p => !matchedPlayers.has(p.userId));

        if (queue.players.length > 0) {
          await setCache(queueKey, queue, 300);
        } else {
          await deleteCache(queueKey);
          this.stopMatchmaking(queueKey);
        }

        // Clean up player references for matched players
        for (const userId of matchedPlayers) {
          await deleteCache(`player:queue:${userId}`);
        }
      }

      return matches;
    } catch (error) {
      logger.error('Error finding matches:', error);
      return [];
    }
  }

  /**
   * Get match details
   */
  async getMatch(matchId: string): Promise<Match | null> {
    try {
      const match = await getCache(`match:${matchId}`) as Match;
      return match || null;
    } catch (error) {
      logger.error('Error getting match:', error);
      return null;
    }
  }

  /**
   * Update match status
   */
  async updateMatchStatus(matchId: string, status: Match['status']): Promise<void> {
    try {
      const match = await this.getMatch(matchId);
      if (match) {
        match.status = status;
        await setCache(`match:${matchId}`, match, 600);
        logger.info(`Match ${matchId} status updated to ${status}`);
      }
    } catch (error) {
      logger.error('Error updating match status:', error);
    }
  }

  /**
   * Cancel match
   */
  async cancelMatch(matchId: string): Promise<void> {
    try {
      const match = await this.getMatch(matchId);
      if (match) {
        // Re-add players to queue if match was pending/ready
        if (match.status === 'pending' || match.status === 'ready') {
          for (const player of match.players) {
            await this.joinQueue(player);
          }
        }

        await deleteCache(`match:${matchId}`);
        logger.info(`Match ${matchId} cancelled`);
      }
    } catch (error) {
      logger.error('Error cancelling match:', error);
    }
  }

  /**
   * Clean up expired queue entries
   */
  async cleanupExpiredQueues(): Promise<void> {
    try {
      // This would iterate through all active queues and remove expired players
      // For now, TTL on Redis handles most cleanup
      logger.info('Queue cleanup completed');
    } catch (error) {
      logger.error('Error cleaning up queues:', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(gameId: string, mode: string = 'casual'): Promise<{
    playersInQueue: number;
    averageWaitTime: number;
    matchesCreatedToday: number;
  }> {
    try {
      const queueKey = `matchmaking:queue:${gameId}:${mode}`;
      const queue = await this.getQueue(queueKey);

      return {
        playersInQueue: queue?.players.length || 0,
        averageWaitTime: queue ? this.estimateWaitTime(queue.players.length, gameId) : 0,
        matchesCreatedToday: 0 // Would query from database
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return {
        playersInQueue: 0,
        averageWaitTime: 0,
        matchesCreatedToday: 0
      };
    }
  }

  // ============ PRIVATE HELPERS ============

  private async getQueue(queueKey: string): Promise<MatchmakingQueue | null> {
    try {
      const queue = await getCache(queueKey) as MatchmakingQueue;
      return queue || null;
    } catch (error) {
      return null;
    }
  }

  private getMmrRange(waitTime: number): number {
    // Expand MMR range the longer player waits
    const minutes = Math.floor(waitTime / 60000);
    if (minutes >= 5) return this.MMR_RANGES[5]; // 500 MMR range after 5 min
    if (minutes >= 4) return this.MMR_RANGES[4]; // 300 MMR range after 4 min
    if (minutes >= 3) return this.MMR_RANGES[3]; // 200 MMR range after 3 min
    if (minutes >= 2) return this.MMR_RANGES[2]; // 150 MMR range after 2 min
    if (minutes >= 1) return this.MMR_RANGES[1]; // 100 MMR range after 1 min
    return this.MMR_RANGES[0]; // 50 MMR range initially
  }

  private estimateWaitTime(queuePosition: number, gameId: string): number {
    // Simple estimation: 30 seconds per position for 1v1 games
    const baseWait = 30000;
    const positionMultiplier = Math.ceil(queuePosition / 2);
    return baseWait * positionMultiplier;
  }

  private startMatchmaking(queueKey: string): void {
    if (this.matchmakingIntervals.has(queueKey)) {
      return; // Already running
    }

    const interval = setInterval(async () => {
      const matches = await this.findMatches(queueKey);

      // Matches are emitted via Socket.IO in the game-rooms handler
      // This service just creates the matches

      if (matches.length === 0) {
        const queue = await this.getQueue(queueKey);
        if (!queue || queue.players.length === 0) {
          this.stopMatchmaking(queueKey);
        }
      }
    }, this.MATCHMAKING_INTERVAL);

    this.matchmakingIntervals.set(queueKey, interval);
    logger.info(`Matchmaking started for queue: ${queueKey}`);
  }

  private stopMatchmaking(queueKey: string): void {
    const interval = this.matchmakingIntervals.get(queueKey);
    if (interval) {
      clearInterval(interval);
      this.matchmakingIntervals.delete(queueKey);
      logger.info(`Matchmaking stopped for queue: ${queueKey}`);
    }
  }
}

export const matchmakingService = new MatchmakingService();
