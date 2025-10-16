import { logger } from '@/config/logger';
import { multiplayerSocketService } from './MultiplayerSocketService';

export interface LeaderboardEntry {
  playerId: string;
  username: string;
  score: number;
  rank: number;
  gamesPlayed: number;
  winRate: number;
  totalWinnings: number;
  level: number;
  avatar?: string;
  country?: string;
  lastPlayed: Date;
  achievements: string[];
  winStreak: number;
  bestRank: number;
}

export interface TournamentEntry {
  id: string;
  name: string;
  gameCode: string;
  startTime: Date;
  endTime: Date;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  registeredPlayers: number;
  status: 'upcoming' | 'registration' | 'active' | 'finished';
  format: 'single-elimination' | 'double-elimination' | 'round-robin' | 'battle-royale';
  rules: string[];
  rewards: {
    first: number;
    second: number;
    third: number;
    participation: number;
  };
}

/**
 * Leaderboard and Tournament Service
 * Manages global leaderboards, tournaments, and competitive features
 */
export class LeaderboardService {
  private static instance: LeaderboardService;
  private globalLeaderboards = new Map<string, LeaderboardEntry[]>();
  private weeklyLeaderboards = new Map<string, LeaderboardEntry[]>();
  private monthlyLeaderboards = new Map<string, LeaderboardEntry[]>();
  private tournaments = new Map<string, TournamentEntry>();
  private seasonalEvents: any[] = [];

  private constructor() {
    this.initializeMockData();
    this.startPeriodicUpdates();
  }

  static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  /**
   * Initialize mock leaderboard data
   */
  private initializeMockData(): void {
    const gameTypes = [
      'crypto-battle-royale',
      'speed-chess',
      'ai-poker',
      'reflex-arena',
      'strategy-empire',
      'trivia-championship'
    ];

    // Generate mock leaderboard entries for each game
    gameTypes.forEach(gameCode => {
      const entries = this.generateMockLeaderboard(gameCode, 100);
      this.globalLeaderboards.set(gameCode, entries);
      this.weeklyLeaderboards.set(gameCode, entries.slice(0, 50));
      this.monthlyLeaderboards.set(gameCode, entries.slice(0, 75));
    });

    // Generate tournaments
    this.generateMockTournaments();

    logger.info('Leaderboard service initialized with mock data');
  }

  /**
   * Generate mock leaderboard entries
   */
  private generateMockLeaderboard(gameCode: string, count: number): LeaderboardEntry[] {
    const entries: LeaderboardEntry[] = [];
    const countries = ['US', 'UK', 'DE', 'JP', 'KR', 'CN', 'BR', 'CA', 'AU', 'FR'];
    const achievements = [
      'First Win',
      'Win Streak',
      'Tournament Winner',
      'High Roller',
      'Speed Demon',
      'Perfectionist',
      'Comeback King',
      'Legendary',
      'Undefeated',
      'Master'
    ];

    for (let i = 0; i < count; i++) {
      const username = this.generateRandomUsername();
      const gamesPlayed = Math.floor(Math.random() * 500) + 50;
      const wins = Math.floor(gamesPlayed * (0.3 + Math.random() * 0.4));
      const winRate = wins / gamesPlayed;
      const score = Math.floor((wins * 100) + (winRate * 10000) + (Math.random() * 5000));

      entries.push({
        playerId: `player_${i + 1}`,
        username,
        score,
        rank: i + 1,
        gamesPlayed,
        winRate,
        totalWinnings: Math.floor(score * (1 + Math.random() * 2)),
        level: Math.min(50, Math.floor(score / 1000) + Math.floor(Math.random() * 10)),
        avatar: this.getRandomAvatar(),
        country: countries[Math.floor(Math.random() * countries.length)],
        lastPlayed: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)),
        achievements: achievements.slice(0, Math.floor(Math.random() * 5) + 1),
        winStreak: Math.floor(Math.random() * 15),
        bestRank: Math.max(1, i + 1 - Math.floor(Math.random() * Math.min(10, i)))
      });
    }

    return entries.sort((a, b) => b.score - a.score).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
  }

  /**
   * Generate mock tournaments
   */
  private generateMockTournaments(): void {
    const tournaments: Omit<TournamentEntry, 'id'>[] = [
      {
        name: 'Weekly Battle Royale Championship',
        gameCode: 'crypto-battle-royale',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        entryFee: 100,
        prizePool: 50000,
        maxPlayers: 128,
        registeredPlayers: 95,
        status: 'registration',
        format: 'battle-royale',
        rules: [
          'All players start with equal resources',
          'Zone shrinks every 2 minutes',
          'Last player standing wins',
          'No teaming allowed'
        ],
        rewards: {
          first: 25000,
          second: 12500,
          third: 6250,
          participation: 100
        }
      },
      {
        name: 'Speed Chess Grand Prix',
        gameCode: 'speed-chess',
        startTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        entryFee: 50,
        prizePool: 20000,
        maxPlayers: 64,
        registeredPlayers: 42,
        status: 'registration',
        format: 'single-elimination',
        rules: [
          'Time control: 3+2 (3 minutes + 2 second increment)',
          'FIDE rules apply',
          'Single elimination bracket',
          'No takebacks'
        ],
        rewards: {
          first: 10000,
          second: 5000,
          third: 2500,
          participation: 50
        }
      },
      {
        name: 'AI Poker Masters Cup',
        gameCode: 'ai-poker',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        endTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
        entryFee: 200,
        prizePool: 100000,
        maxPlayers: 32,
        registeredPlayers: 18,
        status: 'upcoming',
        format: 'round-robin',
        rules: [
          'No-limit Texas Hold\'em',
          'Advanced AI opponents',
          'Blinds increase every 10 minutes',
          'Best overall performance wins'
        ],
        rewards: {
          first: 50000,
          second: 25000,
          third: 12500,
          participation: 200
        }
      }
    ];

    tournaments.forEach((tournament, index) => {
      const id = `tournament_${Date.now()}_${index}`;
      this.tournaments.set(id, { ...tournament, id });
    });
  }

  /**
   * Get global leaderboard for a game
   */
  getGlobalLeaderboard(gameCode: string, limit = 50, offset = 0): LeaderboardEntry[] {
    const leaderboard = this.globalLeaderboards.get(gameCode) || [];
    return leaderboard.slice(offset, offset + limit);
  }

  /**
   * Get weekly leaderboard for a game
   */
  getWeeklyLeaderboard(gameCode: string, limit = 50, offset = 0): LeaderboardEntry[] {
    const leaderboard = this.weeklyLeaderboards.get(gameCode) || [];
    return leaderboard.slice(offset, offset + limit);
  }

  /**
   * Get monthly leaderboard for a game
   */
  getMonthlyLeaderboard(gameCode: string, limit = 50, offset = 0): LeaderboardEntry[] {
    const leaderboard = this.monthlyLeaderboards.get(gameCode) || [];
    return leaderboard.slice(offset, offset + limit);
  }

  /**
   * Get player ranking in a specific game
   */
  getPlayerRanking(gameCode: string, playerId: string): LeaderboardEntry | null {
    const leaderboard = this.globalLeaderboards.get(gameCode) || [];
    return leaderboard.find(entry => entry.playerId === playerId) || null;
  }

  /**
   * Update player stats after game completion
   */
  async updatePlayerStats(gameCode: string, playerId: string, gameResult: {
    won: boolean;
    score: number;
    rank: number;
    winnings: number;
  }): Promise<void> {
    try {
      // Update global leaderboard
      const leaderboard = this.globalLeaderboards.get(gameCode) || [];
      let playerEntry = leaderboard.find(entry => entry.playerId === playerId);

      if (!playerEntry) {
        // Create new player entry
        playerEntry = {
          playerId,
          username: `Player_${playerId}`,
          score: 0,
          rank: leaderboard.length + 1,
          gamesPlayed: 0,
          winRate: 0,
          totalWinnings: 0,
          level: 1,
          lastPlayed: new Date(),
          achievements: [],
          winStreak: 0,
          bestRank: 9999
        };
        leaderboard.push(playerEntry);
      }

      // Update stats
      playerEntry.gamesPlayed += 1;
      playerEntry.score += gameResult.score;
      playerEntry.totalWinnings += gameResult.winnings;
      playerEntry.lastPlayed = new Date();

      if (gameResult.won) {
        playerEntry.winStreak += 1;
      } else {
        playerEntry.winStreak = 0;
      }

      playerEntry.winRate = playerEntry.gamesPlayed > 0 ?
        (playerEntry.winStreak + (playerEntry.gamesPlayed - playerEntry.winStreak) * playerEntry.winRate) / playerEntry.gamesPlayed : 0;

      // Recalculate rankings
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
        if (entry.playerId === playerId) {
          entry.bestRank = Math.min(entry.bestRank, entry.rank);
        }
      });

      this.globalLeaderboards.set(gameCode, leaderboard);

      // Broadcast leaderboard update
      multiplayerSocketService.broadcastLeaderboardUpdate(gameCode, leaderboard.slice(0, 10));

      logger.info(`Updated player stats for ${playerId} in ${gameCode}`);
    } catch (error) {
      logger.error('Error updating player stats:', error);
    }
  }

  /**
   * Get all tournaments
   */
  getAllTournaments(): TournamentEntry[] {
    return Array.from(this.tournaments.values());
  }

  /**
   * Get upcoming tournaments
   */
  getUpcomingTournaments(): TournamentEntry[] {
    return Array.from(this.tournaments.values())
      .filter(tournament => tournament.status === 'upcoming' || tournament.status === 'registration')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Register player for tournament
   */
  async registerForTournament(tournamentId: string, playerId: string, playerData: any): Promise<boolean> {
    try {
      const tournament = this.tournaments.get(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      if (tournament.status !== 'registration') {
        throw new Error('Tournament registration is closed');
      }

      if (tournament.registeredPlayers >= tournament.maxPlayers) {
        throw new Error('Tournament is full');
      }

      // In production, this would check wallet balance and deduct entry fee
      tournament.registeredPlayers += 1;
      tournament.prizePool += tournament.entryFee;

      // Send notification to player
      multiplayerSocketService.sendTournamentNotification(playerId, tournament);

      logger.info(`Player ${playerId} registered for tournament ${tournamentId}`);
      return true;
    } catch (error) {
      logger.error('Error registering for tournament:', error);
      return false;
    }
  }

  /**
   * Get cross-game global rankings
   */
  getGlobalPlayerRankings(limit = 100): any[] {
    const allPlayers = new Map<string, any>();

    // Aggregate player data across all games
    for (const [gameCode, leaderboard] of this.globalLeaderboards.entries()) {
      leaderboard.forEach(entry => {
        if (!allPlayers.has(entry.playerId)) {
          allPlayers.set(entry.playerId, {
            playerId: entry.playerId,
            username: entry.username,
            avatar: entry.avatar,
            country: entry.country,
            totalScore: 0,
            totalWinnings: 0,
            totalGames: 0,
            gamesWon: 0,
            achievements: new Set(),
            level: entry.level,
            gameStats: {}
          });
        }

        const player = allPlayers.get(entry.playerId)!;
        player.totalScore += entry.score;
        player.totalWinnings += entry.totalWinnings;
        player.totalGames += entry.gamesPlayed;
        player.gamesWon += Math.floor(entry.gamesPlayed * entry.winRate);
        entry.achievements.forEach(achievement => player.achievements.add(achievement));
        player.level = Math.max(player.level, entry.level);
        player.gameStats[gameCode] = {
          rank: entry.rank,
          score: entry.score,
          winRate: entry.winRate
        };
      });
    }

    // Convert to array and sort by total score
    return Array.from(allPlayers.values())
      .map(player => ({
        ...player,
        achievements: Array.from(player.achievements),
        overallWinRate: player.totalGames > 0 ? player.gamesWon / player.totalGames : 0
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((player, index) => ({ ...player, globalRank: index + 1 }));
  }

  /**
   * Get seasonal events and special tournaments
   */
  getSeasonalEvents(): any[] {
    return [
      {
        id: 'winter_championship',
        name: 'Winter Championship Series',
        description: 'Compete in multiple games for the ultimate prize',
        startDate: new Date('2025-12-15'),
        endDate: new Date('2025-12-31'),
        games: ['crypto-battle-royale', 'speed-chess', 'strategy-empire'],
        totalPrizePool: 1000000,
        status: 'upcoming',
        requirements: {
          minLevel: 15,
          minGamesPlayed: 100
        }
      },
      {
        id: 'spring_festival',
        name: 'Spring Gaming Festival',
        description: 'Special themed tournaments and bonuses',
        startDate: new Date('2025-03-20'),
        endDate: new Date('2025-04-05'),
        games: ['all'],
        totalPrizePool: 500000,
        status: 'upcoming',
        features: ['double_rewards', 'special_skins', 'exclusive_tournaments']
      }
    ];
  }

  /**
   * Start periodic updates for leaderboards
   */
  private startPeriodicUpdates(): void {
    // Update leaderboards every 5 minutes
    setInterval(() => {
      this.updateLeaderboardRankings();
    }, 5 * 60 * 1000);

    // Reset weekly leaderboards every week
    setInterval(() => {
      this.resetWeeklyLeaderboards();
    }, 7 * 24 * 60 * 60 * 1000);

    // Reset monthly leaderboards every month
    setInterval(() => {
      this.resetMonthlyLeaderboards();
    }, 30 * 24 * 60 * 60 * 1000);

    // Check tournament statuses
    setInterval(() => {
      this.updateTournamentStatuses();
    }, 60 * 1000); // Every minute
  }

  /**
   * Update leaderboard rankings
   */
  private updateLeaderboardRankings(): void {
    for (const [gameCode, leaderboard] of this.globalLeaderboards.entries()) {
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });
    }
  }

  /**
   * Reset weekly leaderboards
   */
  private resetWeeklyLeaderboards(): void {
    for (const gameCode of this.globalLeaderboards.keys()) {
      this.weeklyLeaderboards.set(gameCode, []);
    }
    logger.info('Weekly leaderboards reset');
  }

  /**
   * Reset monthly leaderboards
   */
  private resetMonthlyLeaderboards(): void {
    for (const gameCode of this.globalLeaderboards.keys()) {
      this.monthlyLeaderboards.set(gameCode, []);
    }
    logger.info('Monthly leaderboards reset');
  }

  /**
   * Update tournament statuses
   */
  private updateTournamentStatuses(): void {
    const now = new Date();

    for (const tournament of this.tournaments.values()) {
      if (tournament.status === 'upcoming' && now >= new Date(tournament.startTime.getTime() - 60 * 60 * 1000)) {
        tournament.status = 'registration';
      } else if (tournament.status === 'registration' && now >= tournament.startTime) {
        tournament.status = 'active';
        multiplayerSocketService.broadcastGlobalAnnouncement(
          `Tournament "${tournament.name}" has started!`,
          'success'
        );
      } else if (tournament.status === 'active' && now >= tournament.endTime) {
        tournament.status = 'finished';
        multiplayerSocketService.broadcastGlobalAnnouncement(
          `Tournament "${tournament.name}" has finished!`,
          'info'
        );
      }
    }
  }

  /**
   * Helper methods
   */
  private generateRandomUsername(): string {
    const adjectives = ['Swift', 'Mighty', 'Clever', 'Bold', 'Elite', 'Pro', 'Master', 'Legendary', 'Epic', 'Supreme'];
    const nouns = ['Gamer', 'Warrior', 'Champion', 'Hunter', 'Knight', 'Ace', 'Hero', 'Legend', 'Titan', 'Phoenix'];
    const numbers = Math.floor(Math.random() * 999) + 1;

    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${numbers}`;
  }

  private getRandomAvatar(): string {
    const avatars = ['🎮', '⚔️', '🏆', '👑', '💎', '🔥', '⚡', '🚀', '🦄', '🐉'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }
}

export const leaderboardService = LeaderboardService.getInstance();