import { Tournament, ITournament } from '../models/Tournament';
import { PlayerRanking } from '../models/PlayerRanking';
import { logger } from '../config/logger';

/**
 * TournamentService
 * Handles tournament creation, registration, bracket generation, and prize distribution
 */
export class TournamentService {
  private static instance: TournamentService;

  private constructor() {}

  static getInstance(): TournamentService {
    if (!TournamentService.instance) {
      TournamentService.instance = new TournamentService();
    }
    return TournamentService.instance;
  }

  /**
   * Create a new tournament
   */
  async createTournament(params: {
    name: string;
    code: string;
    gameMode: ITournament['gameMode'];
    type: ITournament['type'];
    format: ITournament['format'];
    description: string;
    registrationStart: Date;
    registrationEnd: Date;
    tournamentStart: Date;
    minPlayers: number;
    maxPlayers: number;
    teamSize: number;
    entryFee: number;
    prizePool: number;
    region?: string[];
    createdBy: string;
  }): Promise<ITournament> {
    // Calculate prize distribution
    const distribution = this.calculatePrizeDistribution(
      params.prizePool,
      params.maxPlayers,
      params.format
    );

    const tournament = await Tournament.create({
      ...params,
      schedule: {
        registrationStart: params.registrationStart,
        registrationEnd: params.registrationEnd,
        tournamentStart: params.tournamentStart,
        checkInStart: new Date(params.tournamentStart.getTime() - 30 * 60 * 1000), // 30 min before
        checkInEnd: new Date(params.tournamentStart.getTime() - 5 * 60 * 1000) // 5 min before
      },
      participants: {
        minPlayers: params.minPlayers,
        maxPlayers: params.maxPlayers,
        currentPlayers: 0,
        teamSize: params.teamSize,
        registeredPlayers: [],
        waitlist: []
      },
      prizePool: {
        totalCoins: params.prizePool,
        distribution
      },
      status: 'draft',
      region: params.region || ['global']
    });

    logger.info(`Created tournament: ${tournament.name} (${tournament.code})`);

    return tournament;
  }

  /**
   * Calculate prize distribution based on format
   */
  private calculatePrizeDistribution(
    totalPrize: number,
    maxPlayers: number,
    format: ITournament['format']
  ): { placement: number; coins: number; percentage: number }[] {
    const distribution: { placement: number; coins: number; percentage: number }[] = [];

    if (format === 'battle-royale') {
      // Top 10 places for battle royale
      const percentages = [30, 18, 12, 8, 6, 5, 4, 3, 2, 2]; // Top 10
      percentages.forEach((pct, idx) => {
        distribution.push({
          placement: idx + 1,
          percentage: pct,
          coins: Math.round((totalPrize * pct) / 100)
        });
      });
    } else {
      // Single/double elimination - top 4
      const percentages = [50, 30, 12, 8]; // 1st, 2nd, 3rd-4th
      percentages.forEach((pct, idx) => {
        distribution.push({
          placement: idx + 1,
          percentage: pct,
          coins: Math.round((totalPrize * pct) / 100)
        });
      });
    }

    return distribution;
  }

  /**
   * Register player for tournament
   */
  async registerPlayer(
    tournamentCode: string,
    userId: string,
    mmr: number,
    teamId?: string
  ): Promise<{
    success: boolean;
    message: string;
    position?: number;
  }> {
    const tournament = await Tournament.findOne({ code: tournamentCode });

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    // Validate registration period
    const now = new Date();
    if (now < tournament.schedule.registrationStart) {
      return { success: false, message: 'Registration not yet open' };
    }
    if (now > tournament.schedule.registrationEnd) {
      return { success: false, message: 'Registration closed' };
    }

    // Check if already registered
    if (tournament.participants.registeredPlayers.some(p => p.userId === userId)) {
      return { success: false, message: 'Already registered' };
    }

    // Check MMR requirements
    if (tournament.requirements.minMMR && mmr < tournament.requirements.minMMR) {
      return { success: false, message: `Minimum MMR required: ${tournament.requirements.minMMR}` };
    }
    if (tournament.requirements.maxMMR && mmr > tournament.requirements.maxMMR) {
      return { success: false, message: `Maximum MMR allowed: ${tournament.requirements.maxMMR}` };
    }

    try {
      const registered = tournament.registerPlayer(userId, mmr, teamId);

      if (registered) {
        await tournament.save();
        const position = tournament.participants.registeredPlayers.length;

        logger.info(
          `User ${userId} registered for tournament ${tournamentCode} (position ${position})`
        );

        return {
          success: true,
          message: 'Successfully registered',
          position
        };
      } else {
        await tournament.save();
        const waitlistPosition = tournament.participants.waitlist.length;

        logger.info(
          `User ${userId} added to waitlist for tournament ${tournamentCode} (position ${waitlistPosition})`
        );

        return {
          success: true,
          message: `Tournament full. Added to waitlist (position ${waitlistPosition})`,
          position: waitlistPosition
        };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Check in player
   */
  async checkInPlayer(
    tournamentCode: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    const tournament = await Tournament.findOne({ code: tournamentCode });

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    // Validate check-in period
    const now = new Date();
    if (!tournament.schedule.checkInStart || now < tournament.schedule.checkInStart) {
      return { success: false, message: 'Check-in not yet open' };
    }
    if (tournament.schedule.checkInEnd && now > tournament.schedule.checkInEnd) {
      return { success: false, message: 'Check-in closed' };
    }

    try {
      tournament.checkInPlayer(userId);
      await tournament.save();

      logger.info(`User ${userId} checked in for tournament ${tournamentCode}`);

      return { success: true, message: 'Successfully checked in' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Start tournament and generate bracket
   */
  async startTournament(tournamentCode: string): Promise<{
    success: boolean;
    message: string;
    bracket?: any;
  }> {
    const tournament = await Tournament.findOne({ code: tournamentCode });

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    if (tournament.status !== 'check-in' && tournament.status !== 'registration') {
      return { success: false, message: 'Tournament already started or completed' };
    }

    const checkedInCount = tournament.participants.registeredPlayers.filter(p => p.checkedIn).length;

    if (checkedInCount < tournament.participants.minPlayers) {
      return {
        success: false,
        message: `Not enough players checked in (${checkedInCount}/${tournament.participants.minPlayers})`
      };
    }

    try {
      tournament.generateBracket();
      tournament.status = 'in-progress';
      await tournament.save();

      logger.info(
        `Started tournament ${tournamentCode} with ${checkedInCount} players, ` +
        `${tournament.bracket.rounds?.length || 0} rounds`
      );

      return {
        success: true,
        message: 'Tournament started',
        bracket: tournament.bracket
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Update match result
   */
  async updateMatchResult(
    tournamentCode: string,
    matchId: string,
    winnerId: string,
    score?: string
  ): Promise<{ success: boolean; message: string }> {
    const tournament = await Tournament.findOne({ code: tournamentCode });

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    // Find and update match
    let matchFound = false;
    for (const round of tournament.bracket.rounds || []) {
      const match = round.matches.find(m => m.matchId === matchId);
      if (match) {
        match.winner = winnerId;
        match.score = score;
        match.status = 'completed';
        match.completedAt = new Date();
        matchFound = true;

        tournament.liveStats.completedMatches++;

        // Advance winner to next round
        this.advanceWinner(tournament, matchId, winnerId);

        break;
      }
    }

    if (!matchFound) {
      return { success: false, message: 'Match not found' };
    }

    await tournament.save();

    // Check if tournament is complete
    if (this.isTournamentComplete(tournament)) {
      await this.completeTournament(tournament);
    }

    logger.info(`Updated match ${matchId} in tournament ${tournamentCode}, winner: ${winnerId}`);

    return { success: true, message: 'Match result updated' };
  }

  /**
   * Advance winner to next round
   */
  private advanceWinner(tournament: ITournament, matchId: string, winnerId: string): void {
    const [, roundStr, matchStr] = matchId.split('-');
    const roundNum = parseInt(roundStr.replace('R', ''));
    const matchNum = parseInt(matchStr.replace('M', ''));

    if (roundNum + 1 < (tournament.bracket.rounds?.length || 0)) {
      const nextRound = tournament.bracket.rounds![roundNum + 1];
      const nextMatchIndex = Math.floor(matchNum / 2);
      const nextMatch = nextRound.matches[nextMatchIndex];

      if (matchNum % 2 === 0) {
        nextMatch.player1 = winnerId;
      } else {
        nextMatch.player2 = winnerId;
      }
    } else {
      // Grand finals
      if (tournament.bracket.grandFinals) {
        if (!tournament.bracket.grandFinals.player1) {
          tournament.bracket.grandFinals.player1 = winnerId;
        } else {
          tournament.bracket.grandFinals.player2 = winnerId;
        }
      }
    }
  }

  /**
   * Check if tournament is complete
   */
  private isTournamentComplete(tournament: ITournament): boolean {
    if (tournament.format === 'battle-royale') {
      return tournament.liveStats.completedMatches === tournament.liveStats.totalMatches;
    }

    // Check if grand finals completed
    if (tournament.bracket.grandFinals && tournament.bracket.grandFinals.winner) {
      return true;
    }

    // Check if all matches completed
    const totalMatches = tournament.bracket.rounds?.reduce(
      (sum, round) => sum + round.matches.length,
      0
    ) || 0;

    return tournament.liveStats.completedMatches >= totalMatches;
  }

  /**
   * Complete tournament and distribute prizes
   */
  async completeTournament(tournament: ITournament): Promise<void> {
    tournament.status = 'completed';
    tournament.schedule.tournamentEnd = new Date();

    // Determine final placements
    const placements = this.calculatePlacements(tournament);

    // Distribute prizes
    for (const placement of placements) {
      const prizeEntry = tournament.prizePool.distribution.find(
        d => d.placement === placement.rank
      );

      if (prizeEntry) {
        tournament.results.push({
          placement: placement.rank,
          userId: placement.userId,
          prizeCoins: prizeEntry.coins,
          performanceScore: 0 // TODO: Calculate from match stats
        });

        tournament.analytics.totalCoinsAwarded += prizeEntry.coins;

        // TODO: Award coins to player
        // await CoinLedgerService.addCoins(placement.userId, prizeEntry.coins, 'tournament_prize');
      }
    }

    await tournament.save();

    logger.info(
      `Completed tournament ${tournament.code}, awarded ${tournament.analytics.totalCoinsAwarded} coins to ${tournament.results.length} players`
    );
  }

  /**
   * Calculate final placements
   */
  private calculatePlacements(tournament: ITournament): { rank: number; userId: string }[] {
    const placements: { rank: number; userId: string }[] = [];

    if (tournament.format === 'battle-royale') {
      // TODO: Implement battle royale placement calculation
      return placements;
    }

    // Single/double elimination
    if (tournament.bracket.grandFinals?.winner) {
      placements.push({ rank: 1, userId: tournament.bracket.grandFinals.winner });

      const loser = tournament.bracket.grandFinals.player1 === tournament.bracket.grandFinals.winner
        ? tournament.bracket.grandFinals.player2
        : tournament.bracket.grandFinals.player1;

      placements.push({ rank: 2, userId: loser });
    }

    // 3rd/4th place (semi-finals losers)
    if (tournament.bracket.rounds && tournament.bracket.rounds.length >= 2) {
      const semiFinals = tournament.bracket.rounds[tournament.bracket.rounds.length - 2];
      let rank = 3;

      for (const match of semiFinals.matches) {
        if (match.winner && match.player1 && match.player2) {
          const loser = match.player1 === match.winner ? match.player2 : match.player1;
          placements.push({ rank, userId: loser });
          rank++;
        }
      }
    }

    return placements;
  }

  /**
   * Get upcoming tournaments
   */
  async getUpcomingTournaments(
    gameMode?: string,
    region?: string,
    limit: number = 10
  ): Promise<ITournament[]> {
    const query: any = {
      status: { $in: ['registration', 'check-in'] },
      'schedule.tournamentStart': { $gte: new Date() }
    };

    if (gameMode) query.gameMode = gameMode;
    if (region) query.region = { $in: [region, 'global'] };

    return Tournament.find(query)
      .sort({ 'schedule.tournamentStart': 1 })
      .limit(limit);
  }

  /**
   * Get player's tournament history
   */
  async getPlayerTournamentHistory(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    const tournaments = await Tournament.find({
      'participants.registeredPlayers.userId': userId,
      status: 'completed'
    })
      .sort({ 'schedule.tournamentEnd': -1 })
      .limit(limit);

    return tournaments.map(t => {
      const result = t.results.find(r => r.userId === userId);
      return {
        tournamentName: t.name,
        gameMode: t.gameMode,
        placement: result?.placement || 0,
        prizeCoins: result?.prizeCoins || 0,
        totalPlayers: t.participants.currentPlayers,
        completedAt: t.schedule.tournamentEnd
      };
    });
  }

  /**
   * Create recurring tournaments automatically
   */
  async createRecurringTournaments(): Promise<number> {
    const recurringTemplates = await Tournament.find({
      isRecurring: true,
      recurrencePattern: { $exists: true }
    });

    let created = 0;

    for (const template of recurringTemplates) {
      if (!template.recurrencePattern) continue;

      const nextDate = this.calculateNextOccurrence(template.recurrencePattern);

      // Check if tournament already exists for this date
      const exists = await Tournament.findOne({
        name: template.name,
        'schedule.tournamentStart': {
          $gte: new Date(nextDate.getTime() - 60 * 60 * 1000),
          $lte: new Date(nextDate.getTime() + 60 * 60 * 1000)
        }
      });

      if (!exists) {
        await this.createTournament({
          name: `${template.name} - ${nextDate.toISOString().split('T')[0]}`,
          code: `${template.code}-${Date.now()}`,
          gameMode: template.gameMode,
          type: template.type,
          format: template.format,
          description: template.description,
          registrationStart: new Date(nextDate.getTime() - 24 * 60 * 60 * 1000),
          registrationEnd: new Date(nextDate.getTime() - 30 * 60 * 1000),
          tournamentStart: nextDate,
          minPlayers: template.participants.minPlayers,
          maxPlayers: template.participants.maxPlayers,
          teamSize: template.participants.teamSize,
          entryFee: template.requirements.entryFee,
          prizePool: template.prizePool.totalCoins,
          region: template.region,
          createdBy: 'system'
        });

        created++;
      }
    }

    logger.info(`Created ${created} recurring tournaments`);

    return created;
  }

  /**
   * Calculate next occurrence for recurring tournament
   */
  private calculateNextOccurrence(pattern: ITournament['recurrencePattern']): Date {
    const now = new Date();
    const [hours, minutes] = pattern!.time.split(':').map(Number);

    if (pattern!.frequency === 'daily') {
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    if (pattern!.frequency === 'weekly' && pattern!.dayOfWeek !== undefined) {
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      const daysUntil = (pattern!.dayOfWeek - now.getDay() + 7) % 7;
      next.setDate(now.getDate() + (daysUntil || 7));
      return next;
    }

    if (pattern!.frequency === 'monthly' && pattern!.dayOfMonth !== undefined) {
      const next = new Date(now.getFullYear(), now.getMonth(), pattern!.dayOfMonth, hours, minutes);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    }

    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default: tomorrow
  }
}

export const tournamentService = TournamentService.getInstance();
