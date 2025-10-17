/**
 * Tournament Management System for E-Sports Competition
 * Professional tournament brackets, scheduling, and prize distribution
 */

import { gamesAPI } from './GamesAPI';
import { socketManager } from './SocketManager';
import { useAuth } from '@/store/AuthContext';
import { spectatorService } from './SpectatorService';
import { antiCheatService } from './AntiCheatService';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  gameId: string;
  status: TournamentStatus;
  format: TournamentFormat;
  maxParticipants: number;
  minParticipants: number;
  entryFee: number;
  prizePool: PrizePool;
  schedule: TournamentSchedule;
  participants: TournamentParticipant[];
  brackets: TournamentBracket;
  rules: TournamentRules;
  settings: TournamentSettings;
  statistics: TournamentStatistics;
  sponsors?: Sponsor[];
  streamers?: Streamer[];
}

export type TournamentStatus = 
  | 'draft'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type TournamentFormat = 
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'league';

export interface PrizePool {
  total: number;
  distribution: PrizeDistribution[];
  currency: string;
  guaranteed: boolean;
  bonusPool?: number;
}

export interface PrizeDistribution {
  position: number;
  amount: number;
  percentage: number;
  currency: string;
  bonus?: number;
}

export interface TournamentSchedule {
  registrationStart: Date;
  registrationEnd: Date;
  tournamentStart: Date;
  tournamentEnd: Date;
  checkInStart?: Date;
  checkInEnd?: Date;
  currentRound: number;
  totalRounds: number;
  roundDuration: number; // minutes
  breakDuration: number; // minutes
}

export interface TournamentParticipant {
  userId: string;
  username: string;
  avatar?: string;
  seed: number;
  status: ParticipantStatus;
  checkInStatus: CheckInStatus;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  rank: number;
  statistics: PlayerStatistics;
  team?: string;
  country?: string;
  mmr?: number;
}

export type ParticipantStatus = 
  | 'registered'
  | 'checked_in'
  | 'playing'
  | 'eliminated'
  | 'disqualified'
  | 'withdrawn';

export type CheckInStatus = 
  | 'not_checked_in'
  | 'checked_in'
  | 'late'
  | 'missed';

export interface PlayerStatistics {
  averageScore: number;
  averageReactionTime: number;
  accuracy: number;
  consistency: number;
  winRate: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  streak: number;
  bestStreak: number;
  lastPlayed: Date;
}

export interface TournamentBracket {
  rounds: BracketRound[];
  currentRound: number;
  totalRounds: number;
  matches: BracketMatch[];
  byes: string[];
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: string[];
  status: RoundStatus;
  startTime?: Date;
  endTime?: Date;
}

export type RoundStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface BracketMatch {
  id: string;
  roundNumber: number;
  matchNumber: number;
  player1: MatchPlayer;
  player2: MatchPlayer;
  winner?: string;
  loser?: string;
  score?: MatchScore;
  status: MatchStatus;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  spectators: number;
  streamUrl?: string;
}

export interface MatchPlayer {
  userId: string;
  username: string;
  seed: number;
  score?: number;
  status: PlayerMatchStatus;
}

export type PlayerMatchStatus = 
  | 'waiting'
  | 'ready'
  | 'playing'
  | 'completed'
  | 'disqualified'
  | 'forfeited';

export type MatchStatus = 
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'forfeited';

export interface MatchScore {
  player1: number;
  player2: number;
  details?: ScoreDetails;
}

export interface ScoreDetails {
  rounds?: RoundScore[];
  games?: GameScore[];
  statistics?: MatchStatistics;
}

export interface RoundScore {
  roundNumber: number;
  player1: number;
  player2: number;
  duration: number;
}

export interface GameScore {
  gameNumber: number;
  player1: number;
  player2: number;
  type: string;
}

export interface MatchStatistics {
  accuracy: { player1: number; player2: number };
  reactionTime: { player1: number; player2: number };
  consistency: { player1: number; player2: number };
  powerUps: { player1: number; player2: number };
}

export interface TournamentRules {
  gameMode: string;
  maxRounds: number;
  timeLimit: number; // seconds
  scoringSystem: ScoringSystem;
  tieBreaker: TieBreaker;
  allowedPowerUps: string[];
  bannedStrategies: string[];
  antiCheat: boolean;
  streaming: boolean;
  spectators: boolean;
}

export type ScoringSystem = 
  | 'points'
  | 'time'
  | 'elimination'
  | 'ranking';

export type TieBreaker = 
  | 'sudden_death'
  | 'time_based'
  | 'accuracy_based'
  | 'rematch';

export interface TournamentSettings {
  autoStart: boolean;
  autoAdvance: boolean;
  checkInRequired: boolean;
  lateRegistration: boolean;
  reEntryAllowed: boolean;
  teamTournament: boolean;
  regionLocked: boolean;
  skillBasedMatchmaking: boolean;
  antiCheatEnabled: boolean;
  streamingEnabled: boolean;
}

export interface TournamentStatistics {
  totalParticipants: number;
  totalMatches: number;
  completedMatches: number;
  averageMatchDuration: number;
  totalPrizePool: number;
  viewerCount: number;
  peakViewers: number;
  totalBets: number;
  totalBetAmount: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  website: string;
  contribution: number;
  placement: 'title' | 'main' | 'supporting';
}

export interface Streamer {
  userId: string;
  username: string;
  platform: string;
  viewerCount: number;
  streamUrl: string;
  isLive: boolean;
  sponsored: boolean;
}

export interface TournamentRegistration {
  tournamentId: string;
  userId: string;
  username: string;
  entryFee: number;
  registrationTime: Date;
  checkInTime?: Date;
  status: RegistrationStatus;
  seed: number;
  team?: string;
}

export type RegistrationStatus = 
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'cancelled'
  | 'disqualified';

export interface TournamentManagerConfig {
  maxConcurrentTournaments: number;
  defaultFormat: TournamentFormat;
  autoCheckIn: boolean;
  autoDisqualification: boolean;
  streamIntegration: boolean;
  bettingEnabled: boolean;
  antiCheat: boolean;
  regionSupport: boolean[];
}

/**
 * Professional Tournament Management System
 */
export class TournamentManager {
  private static instance: TournamentManager;
  private tournaments: Map<string, Tournament> = new Map();
  private registrations: Map<string, TournamentRegistration[]> = new Map();
  private activeMatches: Map<string, BracketMatch> = new Map();
  private tournamentQueue: string[] = [];
  private tournamentHistory: Tournament[] = [];
  private scheduledTournaments: Tournament[] = [];

  // Tournament configurations
  private readonly CONFIG: TournamentManagerConfig = {
    maxConcurrentTournaments: 50,
    defaultFormat: 'single_elimination',
    autoCheckIn: true,
    autoDisqualification: true,
    streamIntegration: true,
    bettingEnabled: true,
    antiCheat: true,
    regionSupport: ['NA', 'EU', 'ASIA', 'SA', 'OCEANIA']
  };

  // Tournament templates for quick creation
  private readonly TOURNAMENT_TEMPLATES = {
    daily: {
      name: 'Daily Tournament',
      format: 'single_elimination',
      maxParticipants: 64,
      entryFee: 100,
      prizePool: { total: 5000, currency: 'coins', guaranteed: true },
      duration: 2 // hours
    },
    weekly: {
      name: 'Weekly Championship',
      format: 'double_elimination',
      maxParticipants: 256,
      entryFee: 500,
      prizePool: { total: 50000, currency: 'coins', guaranteed: true },
      duration: 6 // hours
    },
    monthly: {
      name: 'Monthly Pro League',
      format: 'swiss',
      maxParticipants: 512,
      entryFee: 1000,
      prizePool: { total: 500000, currency: 'coins', guaranteed: true },
      duration: 12 // hours
    },
    world_cup: {
      name: 'World Cup Championship',
      format: 'double_elimination',
      maxParticipants: 1024,
      entryFee: 5000,
      prizePool: { total: 5000000, currency: 'coins', guaranteed: true },
      duration: 24 // hours
    }
  };

  private constructor() {
    this.initializeTournamentSystem();
    this.setupTournamentScheduler();
    this.setupMatchMonitoring();
  }

  static getInstance(): TournamentManager {
    if (!TournamentManager.instance) {
      TournamentManager.instance = new TournamentManager();
    }
    return TournamentManager.instance;
  }

  /**
   * Initialize tournament system
   */
  private async initializeTournamentSystem() {
    // Load existing tournaments from backend
    try {
      const response = await gamesAPI.getActiveTournaments();
      const activeTournaments = response.data.tournaments;
      
      activeTournaments.forEach((tournament: Tournament) => {
        this.tournaments.set(tournament.id, tournament);
      });

      console.log(`Loaded ${activeTournaments.length} active tournaments`);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }

    // Set up tournament event listeners
    this.setupTournamentEventListeners();
  }

  /**
   * Set up tournament scheduler for automated tournaments
   */
  private setupTournamentScheduler() {
    // Schedule daily tournaments
    setInterval(() => {
      this.scheduleDailyTournaments();
    }, 86400000); // Every 24 hours

    // Schedule weekly tournaments
    setInterval(() => {
      this.scheduleWeeklyTournaments();
    }, 604800000); // Every 7 days

    // Monitor and start scheduled tournaments
    setInterval(() => {
      this.monitorScheduledTournaments();
    }, 60000); // Every minute
  }

  /**
   * Set up match monitoring
   */
  private setupMatchMonitoring() {
    // Monitor active matches for completion
    setInterval(() => {
      this.monitorActiveMatches();
    }, 30000); // Every 30 seconds

    // Auto-advance tournament rounds
    setInterval(() => {
      this.autoAdvanceTournaments();
    }, 120000); // Every 2 minutes
  }

  /**
   * Create a new tournament
   */
  public async createTournament(tournamentData: Partial<Tournament>): Promise<Tournament> {
    try {
      // Validate tournament data
      this.validateTournamentData(tournamentData);

      // Generate unique tournament ID
      const tournamentId = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate schedule based on format
      const schedule = this.calculateTournamentSchedule(tournamentData.format || this.CONFIG.defaultFormat);
      
      // Create tournament object
      const tournament: Tournament = {
        id: tournamentId,
        name: tournamentData.name || 'Unnamed Tournament',
        description: tournamentData.description || '',
        gameId: tournamentData.gameId || 'default',
        status: 'draft',
        format: tournamentData.format || this.CONFIG.defaultFormat,
        maxParticipants: tournamentData.maxParticipants || 64,
        minParticipants: tournamentData.minParticipants || 8,
        entryFee: tournamentData.entryFee || 100,
        prizePool: tournamentData.prizePool || this.calculatePrizePool(tournamentData.entryFee || 100, tournamentData.maxParticipants || 64),
        schedule,
        participants: [],
        brackets: this.initializeBrackets(tournamentData.format || this.CONFIG.defaultFormat),
        rules: tournamentData.rules || this.getDefaultRules(),
        settings: tournamentData.settings || this.getDefaultSettings(),
        statistics: this.initializeStatistics(),
        sponsors: tournamentData.sponsors || [],
        streamers: tournamentData.streamers || []
      };

      // Save to backend
      const response = await gamesAPI.createTournament(tournament);
      const savedTournament = response.data;

      // Store locally
      this.tournaments.set(tournamentId, savedTournament);

      console.log(`Tournament created: ${tournamentId} - ${tournament.name}`);
      return savedTournament;

    } catch (error) {
      console.error('Failed to create tournament:', error);
      throw error;
    }
  }

  /**
   * Register for a tournament
   */
  public async registerForTournament(
    tournamentId: string,
    userId: string,
    username: string,
    team?: string
  ): Promise<TournamentRegistration> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration_open') {
      throw new Error('Tournament registration is closed');
    }

    if (tournament.participants.length >= tournament.maxParticipants) {
      throw new Error('Tournament is full');
    }

    // Check if already registered
    const existingRegistration = tournament.participants.find(p => p.userId === userId);
    if (existingRegistration) {
      throw new Error('Already registered for this tournament');
    }

    // Check entry fee balance
    const balance = await this.checkUserBalance(userId, tournament.entryFee);
    if (balance < tournament.entryFee) {
      throw new Error('Insufficient balance for entry fee');
    }

    // Deduct entry fee
    await this.deductEntryFee(userId, tournament.entryFee);

    // Create registration
    const registration: TournamentRegistration = {
      tournamentId,
      userId,
      username,
      entryFee: tournament.entryFee,
      registrationTime: new Date(),
      status: 'confirmed',
      seed: tournament.participants.length + 1,
      team
    };

    // Add participant to tournament
    const participant: TournamentParticipant = {
      userId,
      username,
      seed: registration.seed,
      status: 'registered',
      checkInStatus: 'not_checked_in',
      score: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      rank: 0,
      statistics: this.initializePlayerStatistics()
    };

    tournament.participants.push(participant);

    // Store registration
    if (!this.registrations.has(tournamentId)) {
      this.registrations.set(tournamentId, []);
    }
    this.registrations.get(tournamentId)!.push(registration);

    // Update tournament statistics
    tournament.statistics.totalParticipants = tournament.participants.length;

    console.log(`User ${username} registered for tournament ${tournament.name}`);
    return registration;
  }

  /**
   * Start a tournament
   */
  public async startTournament(tournamentId: string): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration_closed') {
      throw new Error('Tournament cannot be started');
    }

    if (tournament.participants.length < tournament.minParticipants) {
      throw new Error('Insufficient participants');
    }

    // Generate tournament brackets
    tournament.brackets = this.generateBrackets(tournament);
    
    // Update status
    tournament.status = 'in_progress';
    tournament.schedule.currentRound = 1;
    tournament.schedule.tournamentStart = new Date();

    // Create spectator room for streaming
    const spectatorRoom = await spectatorService.createSpectatorRoom(
      tournamentId,
      tournament.gameId,
      10000 // Max 10,000 spectators
    );

    // Set up anti-cheat monitoring
    if (tournament.settings.antiCheatEnabled) {
      await this.setupAntiCheatMonitoring(tournamentId);
    }

    // Notify all participants
    await this.notifyTournamentStart(tournament);

    console.log(`Tournament started: ${tournament.name}`);
  }

  /**
   * Report match result
   */
  public async reportMatchResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    score?: MatchScore,
    statistics?: MatchStatistics
  ): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const match = tournament.brackets.matches.find(m => m.id === matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Update match result
    match.winner = winnerId;
    match.loser = winnerId === match.player1.userId ? match.player2.userId : match.player1.userId;
    match.score = score;
    match.status = 'completed';
    match.endTime = new Date();

    // Update player statistics
    await this.updatePlayerStatistics(tournament, match, winnerId);

    // Check for anti-cheat violations
    if (statistics) {
      await this.analyzeMatchForCheating(tournamentId, matchId, statistics);
    }

    // Advance tournament if round is complete
    if (this.isRoundComplete(tournament, match.roundNumber)) {
      await this.advanceTournamentRound(tournament);
    }

    console.log(`Match ${matchId} completed. Winner: ${winnerId}`);
  }

  /**
   * Get tournament bracket visualization
   */
  public getTournamentBracket(tournamentId: string): TournamentBracket {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament.brackets;
  }

  /**
   * Get tournament leaderboard
   */
  public getTournamentLeaderboard(tournamentId: string): TournamentParticipant[] {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament.participants
      .sort((a, b) => {
        // Sort by points first, then by wins, then by score
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.score - a.score;
      })
      .map((participant, index) => ({
        ...participant,
        rank: index + 1
      }));
  }

  /**
   * Get upcoming matches for a player
   */
  public getUpcomingMatches(
    tournamentId: string,
    userId: string
  ): BracketMatch[] {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament.brackets.matches.filter(match => {
      const isScheduled = match.status === 'scheduled';
      const isPlayerInMatch = match.player1.userId === userId || 
                           match.player2.userId === userId;
      return isScheduled && isPlayerInMatch;
    });
  }

  /**
   * Get tournament statistics
   */
  public getTournamentStatistics(tournamentId: string): TournamentStatistics {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    return tournament.statistics;
  }

  /**
   * Get all active tournaments
   */
  public getActiveTournaments(): Tournament[] {
    return Array.from(this.tournaments.values()).filter(t => 
      t.status === 'in_progress' || t.status === 'registration_open'
    );
  }

  /**
   * Get upcoming tournaments
   */
  public getUpcomingTournaments(): Tournament[] {
    return this.scheduledTournaments.filter(t => 
      t.status === 'draft' || t.status === 'registration_open'
    );
  }

  /**
   * Create tournament from template
   */
  public async createTournamentFromTemplate(
    template: keyof typeof TournamentManager.prototype.TOURNAMENT_TEMPLATES,
    customizations?: Partial<Tournament>
  ): Promise<Tournament> {
    const templateData = this.TOURNAMENT_TEMPLATES[template];
    
    const tournamentData: Partial<Tournament> = {
      name: templateData.name,
      format: templateData.format,
      maxParticipants: templateData.maxParticipants,
      entryFee: templateData.entryFee,
      prizePool: {
        total: templateData.prizePool.total,
        currency: templateData.prizePool.currency,
        guaranteed: templateData.prizePool.guaranteed,
        distribution: this.calculatePrizeDistribution(templateData.prizePool.total)
      },
      ...customizations
    };

    return this.createTournament(tournamentData);
  }

  /**
   * Calculate optimal prize pool distribution
   */
  private calculatePrizePool(entryFee: number, participants: number): PrizePool {
    const totalPool = entryFee * participants;
    const houseCut = totalPool * 0.1; // 10% house cut
    const prizePool = totalPool - houseCut;

    return {
      total: prizePool,
      currency: 'coins',
      guaranteed: true,
      distribution: this.calculatePrizeDistribution(prizePool)
    };
  }

  /**
   * Calculate prize distribution
   */
  private calculatePrizeDistribution(totalPrize: number): PrizeDistribution[] {
    // Standard e-sports distribution: 50%, 30%, 15%, 5% for top 4
    const distribution = [
      { position: 1, percentage: 0.5 },
      { position: 2, percentage: 0.3 },
      { position: 3, percentage: 0.15 },
      { position: 4, percentage: 0.05 }
    ];

    return distribution.map(dist => ({
      position: dist.position,
      amount: Math.floor(totalPrize * dist.percentage),
      percentage: dist.percentage,
      currency: 'coins'
    }));
  }

  /**
   * Generate tournament brackets based on format
   */
  private generateBrackets(tournament: Tournament): TournamentBracket {
    const format = tournament.format;
    const participants = tournament.participants;

    switch (format) {
      case 'single_elimination':
        return this.generateSingleEliminationBrackets(participants);
      case 'double_elimination':
        return this.generateDoubleEliminationBrackets(participants);
      case 'round_robin':
        return this.generateRoundRobinBrackets(participants);
      case 'swiss':
        return this.generateSwissBrackets(participants);
      default:
        throw new Error(`Unsupported tournament format: ${format}`);
    }
  }

  /**
   * Generate single elimination brackets
   */
  private generateSingleEliminationBrackets(participants: TournamentParticipant[]): TournamentBracket {
    const totalParticipants = participants.length;
    const rounds = Math.ceil(Math.log2(totalParticipants));
    const matches: BracketMatch[] = [];
    
    // Create first round matches
    for (let i = 0; i < totalParticipants; i += 2) {
      const match: BracketMatch = {
        id: `match_${i}_${Date.now()}`,
        roundNumber: 1,
        matchNumber: Math.floor(i / 2) + 1,
        player1: {
          userId: participants[i]?.userId || 'BYE',
          username: participants[i]?.username || 'BYE',
          seed: participants[i]?.seed || 999,
          status: 'waiting'
        },
        player2: {
          userId: participants[i + 1]?.userId || 'BYE',
          username: participants[i + 1]?.username || 'BYE',
          seed: participants[i + 1]?.seed || 999,
          status: 'waiting'
        },
        status: 'scheduled',
        spectators: 0
      };
      matches.push(match);
    }

    return {
      rounds: this.createBracketRounds(rounds),
      currentRound: 1,
      totalRounds: rounds,
      matches,
      byes: []
    };
  }

  /**
   * Create bracket rounds
   */
  private createBracketRounds(totalRounds: number): BracketRound[] {
    const rounds: BracketRound[] = [];
    
    for (let i = 1; i <= totalRounds; i++) {
      rounds.push({
        roundNumber: i,
        name: this.getRoundName(i, totalRounds),
        matches: [],
        status: 'pending'
      });
    }

    return rounds;
  }

  /**
   * Get round name based on position
   */
  private getRoundName(roundNumber: number, totalRounds: number): string {
    const fromEnd = totalRounds - roundNumber + 1;
    
    switch (fromEnd) {
      case 1: return 'Final';
      case 2: return 'Semi-Final';
      case 3: return 'Quarter-Final';
      default: return `Round ${roundNumber}`;
    }
  }

  /**
   * Validate tournament data
   */
  private validateTournamentData(data: Partial<Tournament>): void {
    if (data.maxParticipants && data.maxParticipants > 1024) {
      throw new Error('Maximum participants cannot exceed 1024');
    }

    if (data.entryFee && data.entryFee < 0) {
      throw new Error('Entry fee cannot be negative');
    }

    if (data.format && !this.isValidFormat(data.format)) {
      throw new Error(`Invalid tournament format: ${data.format}`);
    }
  }

  /**
   * Check if format is valid
   */
  private isValidFormat(format: string): boolean {
    const validFormats: TournamentFormat[] = [
      'single_elimination',
      'double_elimination',
      'round_robin',
      'swiss',
      'league'
    ];
    return validFormats.includes(format as TournamentFormat);
  }

  /**
   * Calculate tournament schedule
   */
  private calculateTournamentSchedule(format: TournamentFormat): TournamentSchedule {
    const now = new Date();
    const registrationStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const registrationEnd = new Date(registrationStart.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const tournamentStart = new Date(registrationEnd.getTime() + 1 * 60 * 60 * 1000); // 1 hour after registration
    
    return {
      registrationStart,
      registrationEnd,
      tournamentStart,
      tournamentEnd: new Date(tournamentStart.getTime() + 6 * 60 * 60 * 1000), // 6 hours duration
      currentRound: 0,
      totalRounds: this.calculateTotalRounds(format),
      roundDuration: 30, // 30 minutes per round
      breakDuration: 10 // 10 minutes break between rounds
    };
  }

  /**
   * Calculate total rounds based on format
   */
  private calculateTotalRounds(format: TournamentFormat): number {
    switch (format) {
      case 'single_elimination': return 10; // log2(1024) = 10
      case 'double_elimination': return 15;
      case 'round_robin': return 10;
      case 'swiss': return 9;
      default: return 10;
    }
  }

  /**
   * Get default tournament rules
   */
  private getDefaultRules(): TournamentRules {
    return {
      gameMode: 'standard',
      maxRounds: 5,
      timeLimit: 300, // 5 minutes
      scoringSystem: 'points',
      tieBreaker: 'sudden_death',
      allowedPowerUps: ['speed', 'shield', 'multiplier'],
      bannedStrategies: ['teaming', 'exploiting', 'ghosting'],
      antiCheat: true,
      streaming: true,
      spectators: true
    };
  }

  /**
   * Get default tournament settings
   */
  private getDefaultSettings(): TournamentSettings {
    return {
      autoStart: true,
      autoAdvance: true,
      checkInRequired: true,
      lateRegistration: false,
      reEntryAllowed: false,
      teamTournament: false,
      regionLocked: false,
      skillBasedMatchmaking: true,
      antiCheatEnabled: true,
      streamingEnabled: true
    };
  }

  /**
   * Initialize tournament statistics
   */
  private initializeStatistics(): TournamentStatistics {
    return {
      totalParticipants: 0,
      totalMatches: 0,
      completedMatches: 0,
      averageMatchDuration: 0,
      totalPrizePool: 0,
      viewerCount: 0,
      peakViewers: 0,
      totalBets: 0,
      totalBetAmount: 0
    };
  }

  /**
   * Initialize player statistics
   */
  private initializePlayerStatistics(): PlayerStatistics {
    return {
      averageScore: 0,
      averageReactionTime: 0,
      accuracy: 0,
      consistency: 0,
      winRate: 0,
      totalGames: 0,
      totalWins: 0,
      totalLosses: 0,
      streak: 0,
      bestStreak: 0,
      lastPlayed: new Date()
    };
  }

  /**
   * Generate double elimination brackets
   */
  private generateDoubleEliminationBrackets(participants: TournamentParticipant[]): TournamentBracket {
    const totalParticipants = participants.length;
    const rounds = Math.ceil(Math.log2(totalParticipants));
    const matches: BracketMatch[] = [];
    
    // Create winners bracket (same as single elimination)
    for (let i = 0; i < totalParticipants; i += 2) {
      const match: BracketMatch = {
        id: `winners_${i}_${Date.now()}`,
        roundNumber: 1,
        matchNumber: Math.floor(i / 2) + 1,
        player1: {
          userId: participants[i]?.userId || 'BYE',
          username: participants[i]?.username || 'BYE',
          seed: participants[i]?.seed || 999,
          status: 'waiting'
        },
        player2: {
          userId: participants[i + 1]?.userId || 'BYE',
          username: participants[i + 1]?.username || 'BYE',
          seed: participants[i + 1]?.seed || 999,
          status: 'waiting'
        },
        status: 'scheduled',
        spectators: 0
      };
      matches.push(match);
    }

    // Create losers bracket matches
    for (let i = 0; i < Math.ceil(totalParticipants / 2); i++) {
      const losersMatch: BracketMatch = {
        id: `losers_${i}_${Date.now()}`,
        roundNumber: 1,
        matchNumber: Math.floor(i / 2) + 1,
        player1: { userId: 'TBD', username: 'TBD', seed: 999, status: 'waiting' },
        player2: { userId: 'TBD', username: 'TBD', seed: 999, status: 'waiting' },
        status: 'scheduled',
        spectators: 0
      };
      matches.push(losersMatch);
    }

    return {
      rounds: this.createBracketRounds(rounds * 2), // Double elimination has more rounds
      currentRound: 1,
      totalRounds: rounds * 2,
      matches,
      byes: []
    };
  }

  /**
   * Generate round robin brackets
   */
  private generateRoundRobinBrackets(participants: TournamentParticipant[]): TournamentBracket {
    const matches: BracketMatch[] = [];
    const totalParticipants = participants.length;
    const rounds = totalParticipants % 2 === 0 ? totalParticipants - 1 : totalParticipants;

    // Create round robin matches using circle method
    for (let round = 1; round <= rounds; round++) {
      for (let i = 0; i < Math.floor(totalParticipants / 2); i++) {
        const player1Index = i;
        const player2Index = totalParticipants - 1 - i;
        
        const match: BracketMatch = {
          id: `rr_${round}_${i}_${Date.now()}`,
          roundNumber: round,
          matchNumber: (round - 1) * Math.floor(totalParticipants / 2) + i + 1,
          player1: {
            userId: participants[player1Index]?.userId || 'BYE',
            username: participants[player1Index]?.username || 'BYE',
            seed: participants[player1Index]?.seed || 999,
            status: 'waiting'
          },
          player2: {
            userId: participants[player2Index]?.userId || 'BYE',
            username: participants[player2Index]?.username || 'BYE',
            seed: participants[player2Index]?.seed || 999,
            status: 'waiting'
          },
          status: 'scheduled',
          spectators: 0
        };
        matches.push(match);
      }
    }

    return {
      rounds: this.createBracketRounds(rounds),
      currentRound: 1,
      totalRounds: rounds,
      matches,
      byes: []
    };
  }

  /**
   * Generate Swiss system brackets
   */
  private generateSwissBrackets(participants: TournamentParticipant[]): TournamentBracket {
    const matches: BracketMatch[] = [];
    const totalParticipants = participants.length;
    const rounds = Math.min(9, Math.ceil(Math.log2(totalParticipants))); // Max 9 rounds

    // Create first round pairings based on seeding
    const sortedParticipants = participants.sort((a, b) => a.seed - b.seed);
    
    for (let i = 0; i < totalParticipants; i += 2) {
      const match: BracketMatch = {
        id: `swiss_${i}_${Date.now()}`,
        roundNumber: 1,
        matchNumber: Math.floor(i / 2) + 1,
        player1: {
          userId: sortedParticipants[i]?.userId || 'BYE',
          username: sortedParticipants[i]?.username || 'BYE',
          seed: sortedParticipants[i]?.seed || 999,
          status: 'waiting'
        },
        player2: {
          userId: sortedParticipants[i + 1]?.userId || 'BYE',
          username: sortedParticipants[i + 1]?.username || 'BYE',
          seed: sortedParticipants[i + 1]?.seed || 999,
          status: 'waiting'
        },
        status: 'scheduled',
        spectators: 0
      };
      matches.push(match);
    }

    return {
      rounds: this.createBracketRounds(rounds),
      currentRound: 1,
      totalRounds: rounds,
      matches,
      byes: []
    };
  }

  /**
   * Placeholder methods for various tournament operations
   */
  private async checkUserBalance(userId: string, amount: number): Promise<number> {
    // Implementation would check user balance
    return 10000; // Mock balance
  }

  private async deductEntryFee(userId: string, amount: number): Promise<void> {
    // Implementation would deduct entry fee
    console.log(`Deducted ${amount} coins from user ${userId}`);
  }

  private async updatePlayerStatistics(
    tournament: Tournament,
    match: BracketMatch,
    winnerId: string
  ): Promise<void> {
    // Implementation would update player statistics
    const winner = tournament.participants.find(p => p.userId === winnerId);
    if (winner) {
      winner.wins++;
      winner.points += 3; // 3 points for win
    }

    const loserId = match.player1.userId === winnerId ? 
                   match.player2.userId : match.player1.userId;
    const loser = tournament.participants.find(p => p.userId === loserId);
    if (loser) {
      loser.losses++;
    }
  }

  private async analyzeMatchForCheating(
    tournamentId: string,
    matchId: string,
    statistics: MatchStatistics
  ): Promise<void> {
    // Implementation would analyze match for cheating
    const isCheating = await antiCheatService.analyzePlayerBehavior(
      'player_id',
      { 
        reactionTimes: [statistics.reactionTime.player1, statistics.reactionTime.player2],
        accuracyHistory: [statistics.accuracy.player1, statistics.accuracy.player2]
      }
    );

    if (isCheating.isCheating) {
      console.log(`Cheating detected in match ${matchId}`);
    }
  }

  private isRoundComplete(tournament: Tournament, roundNumber: number): boolean {
    const roundMatches = tournament.brackets.matches.filter(m => m.roundNumber === roundNumber);
    return roundMatches.every(match => match.status === 'completed');
  }

  private async advanceTournamentRound(tournament: Tournament): Promise<void> {
    tournament.schedule.currentRound++;
    
    if (tournament.schedule.currentRound > tournament.schedule.totalRounds) {
      // Tournament is complete
      await this.completeTournament(tournament.id);
    } else {
      // Start next round
      await this.startNextRound(tournament);
    }
  }

  private async completeTournament(tournamentId: string): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    tournament.status = 'completed';
    tournament.schedule.tournamentEnd = new Date();

    // Distribute prizes
    await this.distributePrizes(tournament);

    console.log(`Tournament completed: ${tournament.name}`);
  }

  private async distributePrizes(tournament: Tournament): Promise<void> {
    const leaderboard = this.getTournamentLeaderboard(tournament.id);
    
    for (const prize of tournament.prizePool.distribution) {
      const winner = leaderboard[prize.position - 1];
      if (winner) {
        await this.awardPrize(winner.userId, prize.amount);
        console.log(`Awarded ${prize.amount} coins to ${winner.username} for position ${prize.position}`);
      }
    }
  }

  private async awardPrize(userId: string, amount: number): Promise<void> {
    // Implementation would award prize to user
    console.log(`Awarded ${amount} coins to user ${userId}`);
  }

  private async startNextRound(tournament: Tournament): Promise<void> {
    // Implementation would start the next round
    console.log(`Starting round ${tournament.schedule.currentRound} for tournament ${tournament.name}`);
  }

  private async setupAntiCheatMonitoring(tournamentId: string): Promise<void> {
    // Implementation would set up anti-cheat monitoring
    console.log(`Anti-cheat monitoring enabled for tournament ${tournamentId}`);
  }

  private async notifyTournamentStart(tournament: Tournament): Promise<void> {
    // Implementation would notify all participants
    console.log(`Notifying ${tournament.participants.length} participants about tournament start`);
  }

  private scheduleDailyTournaments(): void {
    // Implementation would schedule daily tournaments
    console.log('Scheduling daily tournaments');
  }

  private scheduleWeeklyTournaments(): void {
    // Implementation would schedule weekly tournaments
    console.log('Scheduling weekly tournaments');
  }

  private monitorScheduledTournaments(): void {
    // Implementation would monitor scheduled tournaments
    // and start them when ready
  }

  private monitorActiveMatches(): void {
    // Implementation would monitor active matches
    // and handle timeouts/disconnections
  }

  private autoAdvanceTournaments(): void {
    // Implementation would automatically advance tournaments
    // when matches are completed
  }

  private setupTournamentEventListeners(): void {
    // Implementation would set up event listeners
    // for tournament events
  }

  private initializeBrackets(format: TournamentFormat): TournamentBracket {
    return {
      rounds: [],
      currentRound: 0,
      totalRounds: this.calculateTotalRounds(format),
      matches: [],
      byes: []
    };
  }

  private calculatePrizeDistribution(prizePool: number): PrizeDistribution[] {
    // Default implementation - would be customized per tournament
    return [
      { position: 1, amount: Math.floor(prizePool * 0.5), percentage: 0.5, currency: 'coins' },
      { position: 2, amount: Math.floor(prizePool * 0.3), percentage: 0.3, currency: 'coins' },
      { position: 3, amount: Math.floor(prizePool * 0.15), percentage: 0.15, currency: 'coins' },
      { position: 4, amount: Math.floor(prizePool * 0.05), percentage: 0.05, currency: 'coins' }
    ];
  }
}

// Export singleton instance
export const tournamentManager = TournamentManager.getInstance();