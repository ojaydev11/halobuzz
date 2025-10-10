/**
 * MMRService
 * Elo-based MMR Ranking System
 *
 * Implements:
 * - Matchmaking rating calculations
 * - Rank progression
 * - Seasonal resets
 * - Leaderboards
 */

import { MMRRating, IMMRRating } from '@/models/MMRRating';
import { logger } from '@/config/logger';

export interface MatchResult {
  winnerId: string;
  loserId: string;
  isDraw?: boolean;
}

export class MMRService {
  private static instance: MMRService;

  // K-factor for Elo calculation (higher = more volatile)
  private readonly K_FACTOR = 32;

  // Current season
  private readonly CURRENT_SEASON = '2025-Q4';

  static getInstance(): MMRService {
    if (!MMRService.instance) {
      MMRService.instance = new MMRService();
    }
    return MMRService.instance;
  }

  /**
   * Get or create MMR rating for a player
   */
  async getOrCreateRating(userId: string, gameId: string): Promise<IMMRRating> {
    try {
      let rating = await MMRRating.findOne({
        userId,
        gameId,
        season: this.CURRENT_SEASON,
      });

      if (!rating) {
        // Create new rating for this season
        rating = await MMRRating.create({
          userId,
          gameId,
          season: this.CURRENT_SEASON,
          seasonStartDate: new Date(),
          mmr: 1000,
          peakMmr: 1000,
          startingMmr: 1000,
          wins: 0,
          losses: 0,
          draws: 0,
          currentWinStreak: 0,
          currentLossStreak: 0,
          longestWinStreak: 0,
          rank: 'Unranked',
          division: 5,
          gamesPlayed: 0,
          placementMatchesRemaining: 5,
          placementMatchesPlayed: 0,
        });
      }

      return rating;
    } catch (error) {
      logger.error('Failed to get/create MMR rating:', error);
      throw error;
    }
  }

  /**
   * Update MMR after a match
   */
  async updateAfterMatch(gameId: string, result: MatchResult): Promise<{
    winner: { mmr: number; change: number; rank: string };
    loser: { mmr: number; change: number; rank: string };
  }> {
    try {
      const { winnerId, loserId, isDraw = false } = result;

      // Get ratings
      const winnerRating = await this.getOrCreateRating(winnerId, gameId);
      const loserRating = await this.getOrCreateRating(loserId, gameId);

      // Calculate MMR changes using Elo formula
      const expectedWinner = this.calculateExpectedScore(winnerRating.mmr, loserRating.mmr);
      const expectedLoser = this.calculateExpectedScore(loserRating.mmr, winnerRating.mmr);

      let winnerChange: number;
      let loserChange: number;

      if (isDraw) {
        // Draw: both get half a win
        winnerChange = Math.round(this.K_FACTOR * (0.5 - expectedWinner));
        loserChange = Math.round(this.K_FACTOR * (0.5 - expectedLoser));
      } else {
        // Win/Loss
        winnerChange = Math.round(this.K_FACTOR * (1 - expectedWinner));
        loserChange = Math.round(this.K_FACTOR * (0 - expectedLoser));
      }

      // Apply changes
      winnerRating.mmr += winnerChange;
      loserRating.mmr += loserChange;

      // Ensure MMR doesn't go negative
      winnerRating.mmr = Math.max(0, winnerRating.mmr);
      loserRating.mmr = Math.max(0, loserRating.mmr);

      // Update stats
      winnerRating.gamesPlayed++;
      loserRating.gamesPlayed++;

      if (isDraw) {
        winnerRating.draws++;
        loserRating.draws++;
        winnerRating.currentWinStreak = 0;
        winnerRating.currentLossStreak = 0;
        loserRating.currentWinStreak = 0;
        loserRating.currentLossStreak = 0;
      } else {
        winnerRating.wins++;
        loserRating.losses++;

        // Update streaks
        winnerRating.currentWinStreak++;
        winnerRating.currentLossStreak = 0;
        if (winnerRating.currentWinStreak > winnerRating.longestWinStreak) {
          winnerRating.longestWinStreak = winnerRating.currentWinStreak;
        }

        loserRating.currentLossStreak++;
        loserRating.currentWinStreak = 0;
      }

      // Update placement matches
      if (winnerRating.placementMatchesRemaining > 0) {
        winnerRating.placementMatchesRemaining--;
        winnerRating.placementMatchesPlayed++;
      }
      if (loserRating.placementMatchesRemaining > 0) {
        loserRating.placementMatchesRemaining--;
        loserRating.placementMatchesPlayed++;
      }

      // Update ranks
      (winnerRating as any).updateRankFromMmr();
      (loserRating as any).updateRankFromMmr();

      // Update last match time
      winnerRating.lastMatchAt = new Date();
      loserRating.lastMatchAt = new Date();

      // Save
      await winnerRating.save();
      await loserRating.save();

      logger.info('MMR updated after match', {
        gameId,
        winnerId,
        loserId,
        isDraw,
        winnerChange,
        loserChange,
        winnerNewMmr: winnerRating.mmr,
        loserNewMmr: loserRating.mmr,
      });

      return {
        winner: {
          mmr: winnerRating.mmr,
          change: winnerChange,
          rank: `${winnerRating.rank} ${winnerRating.division}`,
        },
        loser: {
          mmr: loserRating.mmr,
          change: loserChange,
          rank: `${loserRating.rank} ${loserRating.division}`,
        },
      };
    } catch (error) {
      logger.error('Failed to update MMR:', error);
      throw error;
    }
  }

  /**
   * Calculate expected score using Elo formula
   */
  private calculateExpectedScore(playerRating: number, opponentRating: number): number {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  }

  /**
   * Find a suitable opponent for matchmaking
   */
  async findOpponent(userId: string, gameId: string): Promise<IMMRRating | null> {
    try {
      const playerRating = await this.getOrCreateRating(userId, gameId);

      // Search range expands over time
      const searchRanges = [50, 100, 150, 200, 300]; // MMR ranges

      for (const range of searchRanges) {
        const opponent = await MMRRating.findOne({
          gameId,
          season: this.CURRENT_SEASON,
          userId: { $ne: userId },
          mmr: {
            $gte: playerRating.mmr - range,
            $lte: playerRating.mmr + range,
          },
          // Optionally: not currently in a match
        })
          .sort({ lastMatchAt: 1 }) // Prioritize players who haven't played recently
          .limit(1);

        if (opponent) {
          logger.info('Opponent found for matchmaking', {
            userId,
            opponentId: opponent.userId,
            playerMmr: playerRating.mmr,
            opponentMmr: opponent.mmr,
            range,
          });
          return opponent;
        }
      }

      logger.warn('No opponent found for matchmaking', {
        userId,
        gameId,
        playerMmr: playerRating.mmr,
      });

      return null;
    } catch (error) {
      logger.error('Failed to find opponent:', error);
      return null;
    }
  }

  /**
   * Get leaderboard for a game
   */
  async getLeaderboard(gameId: string, limit: number = 100): Promise<any[]> {
    try {
      const leaderboard = await MMRRating.find({
        gameId,
        season: this.CURRENT_SEASON,
        gamesPlayed: { $gte: 5 }, // Minimum 5 games to appear on leaderboard
      })
        .sort({ mmr: -1 })
        .limit(limit)
        .populate('userId', 'username avatar displayName')
        .lean();

      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        mmr: entry.mmr,
        tier: `${entry.rank} ${entry.division}`,
        wins: entry.wins,
        losses: entry.losses,
        winRate: entry.winRate,
        gamesPlayed: entry.gamesPlayed,
      }));
    } catch (error) {
      logger.error('Failed to get leaderboard:', error);
      return [];
    }
  }

  /**
   * Get player's rank and position
   */
  async getPlayerRank(userId: string, gameId: string): Promise<{
    mmr: number;
    rank: string;
    division: number;
    leaderboardPosition: number;
    percentile: number;
  } | null> {
    try {
      const playerRating = await this.getOrCreateRating(userId, gameId);

      // Count players above this player
      const playersAbove = await MMRRating.countDocuments({
        gameId,
        season: this.CURRENT_SEASON,
        mmr: { $gt: playerRating.mmr },
        gamesPlayed: { $gte: 5 },
      });

      // Total ranked players
      const totalPlayers = await MMRRating.countDocuments({
        gameId,
        season: this.CURRENT_SEASON,
        gamesPlayed: { $gte: 5 },
      });

      const leaderboardPosition = playersAbove + 1;
      const percentile = totalPlayers > 0 ? ((totalPlayers - leaderboardPosition) / totalPlayers) * 100 : 0;

      return {
        mmr: playerRating.mmr,
        rank: playerRating.rank,
        division: playerRating.division,
        leaderboardPosition,
        percentile: Math.round(percentile),
      };
    } catch (error) {
      logger.error('Failed to get player rank:', error);
      return null;
    }
  }

  /**
   * Reset seasonal MMR (called at season end)
   */
  async resetSeason(newSeason: string): Promise<void> {
    try {
      // Soft reset: MMR = (currentMMR + 1000) / 2
      // This keeps top players ahead but compresses the range

      const allRatings = await MMRRating.find({
        season: this.CURRENT_SEASON,
      });

      logger.info(`Resetting season: ${this.CURRENT_SEASON} -> ${newSeason}`, {
        playersAffected: allRatings.length,
      });

      // Create new season ratings
      for (const oldRating of allRatings) {
        const newMmr = Math.floor((oldRating.mmr + 1000) / 2);

        await MMRRating.create({
          userId: oldRating.userId,
          gameId: oldRating.gameId,
          season: newSeason,
          seasonStartDate: new Date(),
          mmr: newMmr,
          peakMmr: newMmr,
          startingMmr: newMmr,
          wins: 0,
          losses: 0,
          draws: 0,
          currentWinStreak: 0,
          currentLossStreak: 0,
          longestWinStreak: 0,
          rank: 'Unranked',
          division: 5,
          gamesPlayed: 0,
          placementMatchesRemaining: 5,
          placementMatchesPlayed: 0,
        });
      }

      logger.info('Season reset complete');
    } catch (error) {
      logger.error('Failed to reset season:', error);
    }
  }
}

export const mmrService = MMRService.getInstance();
