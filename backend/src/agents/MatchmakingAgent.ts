import { BaseAgent, AgentMessage } from './AgentOrchestrator';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performanceMonitor';

interface PlayerProfile {
  playerId: string;
  gameMode: string;
  mmr: number;
  rank: string;
  skillVariance: number;
  recentPerformance: number[];
  partyId?: string;
  role?: string;
  queueTime: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
  region: string;
  smurfProbability: number;
  consecutiveLosses: number;
}

interface MatchCandidate {
  players: PlayerProfile[];
  gameMode: string;
  averageMmr: number;
  skillBalance: number;
  fairnessScore: number;
  estimatedMatchQuality: number;
  region: string;
}

interface TrueSkillRating {
  mu: number;        // Skill mean (25.0 default)
  sigma: number;     // Skill uncertainty (8.333 default)
  tau: number;       // Dynamics factor (0.083 default)
  beta: number;      // Skill difference factor (4.167 default)
}

interface MatchmakingQueue {
  gameMode: string;
  players: Map<string, PlayerProfile>;
  maxWaitTime: number;
  targetTeamSize: number;
  relaxationRate: number;
}

interface MatchResult {
  matchId: string;
  players: PlayerProfile[];
  gameMode: string;
  serverRegion: string;
  estimatedDuration: number;
  createdAt: number;
}

interface BackfillRequest {
  matchId: string;
  gameMode: string;
  requiredPlayers: number;
  averageMmr: number;
  urgency: 'low' | 'medium' | 'high';
}

export class MatchmakingAgent extends BaseAgent {
  private queues = new Map<string, MatchmakingQueue>();
  private activeMatches = new Map<string, MatchResult>();
  private playerRatings = new Map<string, TrueSkillRating>();
  private matchHistory = new Map<string, any[]>();

  // Game mode configurations
  private gameModeConfig = {
    'halo-royale': { teamSize: 60, teams: 1, maxWaitTime: 30000, fairnessWeight: 0.7 },
    'halo-arena': { teamSize: 5, teams: 2, maxWaitTime: 18000, fairnessWeight: 0.9 },
    'halo-rally': { teamSize: 8, teams: 1, maxWaitTime: 20000, fairnessWeight: 0.6 },
    'halo-raids': { teamSize: 4, teams: 1, maxWaitTime: 25000, fairnessWeight: 0.8 },
    'halo-tactics': { teamSize: 1, teams: 2, maxWaitTime: 15000, fairnessWeight: 0.85 },
  };

  private matchmakingTimer: NodeJS.Timeout | null = null;
  private backfillQueue: BackfillRequest[] = [];

  async initialize(): Promise<void> {
    this.logger.info('Matchmaking & Ranking Agent initializing...');

    // Initialize queues for each game mode
    for (const [gameMode, config] of Object.entries(this.gameModeConfig)) {
      this.queues.set(gameMode, {
        gameMode,
        players: new Map(),
        maxWaitTime: config.maxWaitTime,
        targetTeamSize: config.teamSize,
        relaxationRate: 0.1, // Expand search criteria by 10% per second
      });
    }

    // Start matchmaking processor
    this.startMatchmakingLoop();

    // Load historical ratings
    await this.loadPlayerRatings();

    this.setStatus('idle');
    this.logger.info('Matchmaking Agent initialized with TrueSkill2 system');
  }

  async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
    const startTime = Date.now();
    let success = true;

    try {
      this.setStatus('busy');

      switch (message.data.action) {
        case 'join_queue':
          return await this.handleJoinQueue(message);
        case 'leave_queue':
          return await this.handleLeaveQueue(message);
        case 'update_rating':
          return await this.handleUpdateRating(message);
        case 'get_queue_status':
          return await this.handleGetQueueStatus(message);
        case 'request_backfill':
          return await this.handleBackfillRequest(message);
        case 'player_disconnect':
          return await this.handlePlayerDisconnect(message);
        case 'match_complete':
          return await this.handleMatchComplete(message);
        default:
          throw new Error(`Unknown matchmaking action: ${message.data.action}`);
      }

    } catch (error) {
      success = false;
      this.logger.error('Matchmaking processing error:', error);

      return {
        id: this.generateMessageId(),
        type: 'response',
        from: this.config.id,
        to: message.from,
        data: { error: error.message },
        timestamp: Date.now(),
        correlationId: message.id,
      };

    } finally {
      this.updateMetrics(Date.now() - startTime, success);
      this.setStatus('idle');
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Matchmaking Agent shutting down...');

    if (this.matchmakingTimer) {
      clearInterval(this.matchmakingTimer);
    }

    // Notify all queued players
    for (const queue of this.queues.values()) {
      for (const player of queue.players.values()) {
        this.emit('message', {
          id: this.generateMessageId(),
          type: 'event',
          from: this.config.id,
          to: 'game-client',
          data: {
            event: 'matchmaking_shutdown',
            playerId: player.playerId,
            reason: 'System maintenance',
          },
          timestamp: Date.now(),
        });
      }
    }

    this.setStatus('offline');
  }

  // Core matchmaking handlers
  private async handleJoinQueue(message: AgentMessage): Promise<AgentMessage> {
    const { playerId, gameMode, partyId, role, region = 'us-east' } = message.data;

    // Get or initialize player rating
    let rating = this.playerRatings.get(playerId);
    if (!rating) {
      rating = this.initializeTrueSkillRating();
      this.playerRatings.set(playerId, rating);
    }

    // Calculate MMR and detect smurfs
    const mmr = this.calculateMMR(rating);
    const smurfProbability = this.detectSmurfProbability(playerId, mmr);

    const playerProfile: PlayerProfile = {
      playerId,
      gameMode,
      mmr,
      rank: this.calculateRank(mmr),
      skillVariance: rating.sigma,
      recentPerformance: this.getRecentPerformance(playerId),
      partyId,
      role,
      queueTime: Date.now(),
      connectionQuality: this.assessConnectionQuality(playerId),
      region,
      smurfProbability,
      consecutiveLosses: this.getConsecutiveLosses(playerId),
    };

    // Add to appropriate queue
    const queue = this.queues.get(gameMode);
    if (!queue) {
      throw new Error(`Invalid game mode: ${gameMode}`);
    }

    queue.players.set(playerId, playerProfile);

    this.logger.info(`Player ${playerId} joined ${gameMode} queue (MMR: ${mmr}, Rank: ${playerProfile.rank})`);

    // Check for immediate matches
    await this.attemptMatching(gameMode);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: {
        success: true,
        queuePosition: queue.players.size,
        estimatedWait: this.estimateWaitTime(gameMode, mmr),
        playerProfile,
      },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleLeaveQueue(message: AgentMessage): Promise<AgentMessage> {
    const { playerId, gameMode } = message.data;

    const queue = this.queues.get(gameMode);
    if (queue && queue.players.has(playerId)) {
      queue.players.delete(playerId);
      this.logger.info(`Player ${playerId} left ${gameMode} queue`);
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleUpdateRating(message: AgentMessage): Promise<AgentMessage> {
    const { matchResult } = message.data;

    // Update TrueSkill ratings based on match outcome
    const updatedRatings = this.updateTrueSkillRatings(matchResult);

    // Store updated ratings
    for (const [playerId, newRating] of updatedRatings) {
      this.playerRatings.set(playerId, newRating);
    }

    // Update match history
    this.updateMatchHistory(matchResult);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true, updatedRatings: Array.from(updatedRatings.entries()) },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleBackfillRequest(message: AgentMessage): Promise<AgentMessage> {
    const backfillRequest: BackfillRequest = message.data.backfillRequest;

    this.backfillQueue.push(backfillRequest);
    this.backfillQueue.sort((a, b) => this.getUrgencyScore(b.urgency) - this.getUrgencyScore(a.urgency));

    // Try to fulfill backfill immediately
    const backfillResult = await this.attemptBackfill(backfillRequest);

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true, backfillResult },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  // Core matchmaking algorithms
  private startMatchmakingLoop(): void {
    this.matchmakingTimer = setInterval(() => {
      this.processAllQueues();
    }, 1000); // Run every second
  }

  private async processAllQueues(): Promise<void> {
    PerformanceMonitor.markStart('matchmaking_cycle');

    for (const gameMode of this.queues.keys()) {
      await this.attemptMatching(gameMode);
    }

    // Process backfill queue
    await this.processBackfillQueue();

    PerformanceMonitor.markEnd('matchmaking_cycle');
  }

  private async attemptMatching(gameMode: string): Promise<void> {
    const queue = this.queues.get(gameMode);
    const config = this.gameModeConfig[gameMode as keyof typeof this.gameModeConfig];

    if (!queue || !config) return;

    const players = Array.from(queue.players.values());
    const requiredPlayers = config.teamSize * config.teams;

    if (players.length < requiredPlayers) return;

    // Group players by parties
    const partyGroups = this.groupPlayersByParty(players);

    // Find best match combination
    const matchCandidates = this.generateMatchCandidates(partyGroups, gameMode, requiredPlayers);

    if (matchCandidates.length === 0) return;

    // Select best match based on fairness and wait time
    const bestMatch = this.selectBestMatch(matchCandidates);

    if (bestMatch && this.isMatchAcceptable(bestMatch, gameMode)) {
      await this.createMatch(bestMatch);
    }
  }

  private generateMatchCandidates(
    partyGroups: PlayerProfile[][],
    gameMode: string,
    requiredPlayers: number
  ): MatchCandidate[] {
    const candidates: MatchCandidate[] = [];
    const config = this.gameModeConfig[gameMode as keyof typeof this.gameModeConfig];

    // Generate all possible combinations
    const combinations = this.generatePlayerCombinations(partyGroups, requiredPlayers);

    for (const playerSet of combinations) {
      if (playerSet.length !== requiredPlayers) continue;

      const averageMmr = playerSet.reduce((sum, p) => sum + p.mmr, 0) / playerSet.length;
      const skillBalance = this.calculateSkillBalance(playerSet, config.teams);
      const fairnessScore = this.calculateFairnessScore(playerSet, skillBalance);
      const matchQuality = this.estimateMatchQuality(playerSet, fairnessScore);

      // Check regional compatibility
      const regionCounts = this.countPlayersByRegion(playerSet);
      const dominantRegion = this.getDominantRegion(regionCounts);

      candidates.push({
        players: playerSet,
        gameMode,
        averageMmr,
        skillBalance,
        fairnessScore,
        estimatedMatchQuality: matchQuality,
        region: dominantRegion,
      });
    }

    return candidates.sort((a, b) => b.estimatedMatchQuality - a.estimatedMatchQuality);
  }

  private selectBestMatch(candidates: MatchCandidate[]): MatchCandidate | null {
    if (candidates.length === 0) return null;

    // Weight factors: fairness, wait time, connection quality
    let bestCandidate = candidates[0];
    let bestScore = 0;

    for (const candidate of candidates) {
      const waitTimePenalty = this.calculateWaitTimePenalty(candidate.players);
      const connectionQualityBonus = this.calculateConnectionQualityBonus(candidate.players);
      const regionCompatibilityBonus = this.calculateRegionCompatibilityBonus(candidate.players);

      const score =
        candidate.estimatedMatchQuality * 0.5 +
        (1 - waitTimePenalty) * 0.25 +
        connectionQualityBonus * 0.15 +
        regionCompatibilityBonus * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private async createMatch(matchCandidate: MatchCandidate): Promise<void> {
    const matchId = this.generateMatchId();
    const serverRegion = matchCandidate.region;

    // Remove players from queues
    const queue = this.queues.get(matchCandidate.gameMode)!;
    for (const player of matchCandidate.players) {
      queue.players.delete(player.playerId);
    }

    // Create match result
    const matchResult: MatchResult = {
      matchId,
      players: matchCandidate.players,
      gameMode: matchCandidate.gameMode,
      serverRegion,
      estimatedDuration: this.estimateMatchDuration(matchCandidate.gameMode),
      createdAt: Date.now(),
    };

    this.activeMatches.set(matchId, matchResult);

    // Notify Game Director about new match
    this.emit('message', {
      id: this.generateMessageId(),
      type: 'event',
      from: this.config.id,
      to: 'game-director',
      data: {
        event: 'match_created',
        matchResult,
        fairnessScore: matchCandidate.fairnessScore,
        estimatedQuality: matchCandidate.estimatedMatchQuality,
      },
      timestamp: Date.now(),
    });

    // Notify Netcode Agent for server allocation
    this.emit('message', {
      id: this.generateMessageId(),
      type: 'command',
      from: this.config.id,
      to: 'netcode',
      data: {
        action: 'allocate_server',
        matchId,
        gameMode: matchCandidate.gameMode,
        playerCount: matchCandidate.players.length,
        region: serverRegion,
      },
      timestamp: Date.now(),
    });

    this.logger.info(`Match created: ${matchId} (${matchCandidate.gameMode}, ${matchCandidate.players.length} players, Quality: ${matchCandidate.estimatedMatchQuality.toFixed(2)})`);
  }

  // TrueSkill2 Implementation
  private initializeTrueSkillRating(): TrueSkillRating {
    return {
      mu: 25.0,      // Initial skill mean
      sigma: 8.333,  // Initial uncertainty
      tau: 0.083,    // Dynamics factor
      beta: 4.167,   // Skill difference factor (σ/2)
    };
  }

  private calculateMMR(rating: TrueSkillRating): number {
    // Conservative estimate: μ - 3σ
    return Math.max(0, rating.mu - (3 * rating.sigma));
  }

  private updateTrueSkillRatings(matchResult: any): Map<string, TrueSkillRating> {
    const updatedRatings = new Map<string, TrueSkillRating>();

    // Simplified TrueSkill update (real implementation would be more complex)
    for (const playerResult of matchResult.playerResults) {
      const currentRating = this.playerRatings.get(playerResult.playerId) || this.initializeTrueSkillRating();

      const performance = playerResult.performance || 0; // KDA, damage, objectives, etc.
      const won = playerResult.won || false;

      // Update based on performance and outcome
      let muChange = 0;
      let sigmaChange = 0;

      if (won) {
        muChange = Math.max(0.5, performance * 0.3);
        sigmaChange = -0.1; // Reduce uncertainty
      } else {
        muChange = Math.min(-0.5, -performance * 0.2);
        sigmaChange = -0.05; // Still reduce uncertainty but less
      }

      const newRating: TrueSkillRating = {
        mu: Math.max(0, currentRating.mu + muChange),
        sigma: Math.max(0.5, currentRating.sigma + sigmaChange),
        tau: currentRating.tau,
        beta: currentRating.beta,
      };

      updatedRatings.set(playerResult.playerId, newRating);
    }

    return updatedRatings;
  }

  // Utility methods
  private calculateRank(mmr: number): string {
    if (mmr >= 3000) return 'Champion';
    if (mmr >= 2500) return 'Master';
    if (mmr >= 2000) return 'Diamond';
    if (mmr >= 1500) return 'Platinum';
    if (mmr >= 1000) return 'Gold';
    if (mmr >= 500) return 'Silver';
    return 'Bronze';
  }

  private detectSmurfProbability(playerId: string, mmr: number): number {
    const history = this.matchHistory.get(playerId) || [];

    if (history.length < 5) {
      // New players with high performance might be smurfs
      const recentPerformance = this.getRecentPerformance(playerId);
      const avgPerformance = recentPerformance.reduce((sum, p) => sum + p, 0) / recentPerformance.length;

      if (avgPerformance > 2.0 && mmr < 1000) {
        return 0.7; // 70% chance of smurf
      }
    }

    return Math.max(0, (mmr - 1500) / 3000); // Higher MMR = lower smurf probability
  }

  private calculateSkillBalance(players: PlayerProfile[], teamCount: number): number {
    if (teamCount === 1) return 1.0; // No team balance needed

    // Split players into teams and calculate MMR variance
    const teamSize = players.length / teamCount;
    const teams: PlayerProfile[][] = [];

    for (let i = 0; i < teamCount; i++) {
      teams.push(players.slice(i * teamSize, (i + 1) * teamSize));
    }

    const teamMmrs = teams.map(team =>
      team.reduce((sum, p) => sum + p.mmr, 0) / team.length
    );

    const avgMmr = teamMmrs.reduce((sum, mmr) => sum + mmr, 0) / teamMmrs.length;
    const variance = teamMmrs.reduce((sum, mmr) => sum + Math.pow(mmr - avgMmr, 2), 0) / teamMmrs.length;

    // Convert variance to balance score (lower variance = higher balance)
    return Math.max(0, 1 - (variance / 10000));
  }

  private groupPlayersByParty(players: PlayerProfile[]): PlayerProfile[][] {
    const parties = new Map<string, PlayerProfile[]>();
    const soloPlayers: PlayerProfile[] = [];

    for (const player of players) {
      if (player.partyId) {
        if (!parties.has(player.partyId)) {
          parties.set(player.partyId, []);
        }
        parties.get(player.partyId)!.push(player);
      } else {
        soloPlayers.push(player);
      }
    }

    const result = Array.from(parties.values());
    soloPlayers.forEach(player => result.push([player]));

    return result;
  }

  private generatePlayerCombinations(partyGroups: PlayerProfile[][], requiredPlayers: number): PlayerProfile[][] {
    // Simplified combination generation - in production would use more sophisticated algorithm
    const combinations: PlayerProfile[][] = [];

    // For now, just try to fill with available groups
    const flattened = partyGroups.flat();
    if (flattened.length >= requiredPlayers) {
      combinations.push(flattened.slice(0, requiredPlayers));
    }

    return combinations;
  }

  private estimateWaitTime(gameMode: string, mmr: number): number {
    const queue = this.queues.get(gameMode);
    if (!queue) return 30000;

    const playersInQueue = queue.players.size;
    const config = this.gameModeConfig[gameMode as keyof typeof this.gameModeConfig];
    const requiredPlayers = config.teamSize * config.teams;

    // Base wait time calculation
    const baseWait = Math.max(0, (requiredPlayers - playersInQueue) * 2000);

    // MMR penalty for extreme ratings
    const mmrPenalty = Math.abs(mmr - 1500) * 10;

    return Math.min(config.maxWaitTime, baseWait + mmrPenalty);
  }

  // Helper methods with stub implementations
  private getRecentPerformance(playerId: string): number[] {
    return this.matchHistory.get(playerId)?.slice(-10).map(m => m.performance) || [1.0];
  }

  private getConsecutiveLosses(playerId: string): number {
    const history = this.matchHistory.get(playerId) || [];
    let losses = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].won) break;
      losses++;
    }
    return losses;
  }

  private assessConnectionQuality(playerId: string): 'excellent' | 'good' | 'poor' {
    // Stub - would integrate with network monitoring
    return 'good';
  }

  private calculateFairnessScore(players: PlayerProfile[], skillBalance: number): number {
    const waitTimePenalty = this.calculateWaitTimePenalty(players);
    const smurfPenalty = players.reduce((sum, p) => sum + p.smurfProbability, 0) / players.length;

    return skillBalance * 0.6 + (1 - waitTimePenalty) * 0.3 + (1 - smurfPenalty) * 0.1;
  }

  private estimateMatchQuality(players: PlayerProfile[], fairnessScore: number): number {
    const avgSkillVariance = players.reduce((sum, p) => sum + p.skillVariance, 0) / players.length;
    const uncertaintyPenalty = Math.min(1, avgSkillVariance / 5);

    return fairnessScore * (1 - uncertaintyPenalty * 0.2);
  }

  private calculateWaitTimePenalty(players: PlayerProfile[]): number {
    const now = Date.now();
    const maxWaitTime = Math.max(...players.map(p => now - p.queueTime));
    return Math.min(1, maxWaitTime / 60000); // Normalize to 1 minute
  }

  private calculateConnectionQualityBonus(players: PlayerProfile[]): number {
    const qualityScore = players.reduce((sum, p) => {
      switch (p.connectionQuality) {
        case 'excellent': return sum + 1;
        case 'good': return sum + 0.7;
        case 'poor': return sum + 0.3;
        default: return sum + 0.5;
      }
    }, 0) / players.length;

    return qualityScore;
  }

  private calculateRegionCompatibilityBonus(players: PlayerProfile[]): number {
    const regions = new Set(players.map(p => p.region));
    return regions.size === 1 ? 1.0 : 1.0 / regions.size;
  }

  private countPlayersByRegion(players: PlayerProfile[]): Record<string, number> {
    return players.reduce((counts, player) => {
      counts[player.region] = (counts[player.region] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private getDominantRegion(regionCounts: Record<string, number>): string {
    return Object.entries(regionCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private isMatchAcceptable(match: MatchCandidate, gameMode: string): boolean {
    const config = this.gameModeConfig[gameMode as keyof typeof this.gameModeConfig];
    return match.fairnessScore >= config.fairnessWeight;
  }

  private async processBackfillQueue(): Promise<void> {
    for (let i = 0; i < this.backfillQueue.length; i++) {
      const request = this.backfillQueue[i];
      const result = await this.attemptBackfill(request);

      if (result.success) {
        this.backfillQueue.splice(i, 1);
        i--;
      }
    }
  }

  private async attemptBackfill(request: BackfillRequest): Promise<{ success: boolean; players?: PlayerProfile[] }> {
    // Find suitable players from queues
    const suitablePlayers: PlayerProfile[] = [];

    for (const queue of this.queues.values()) {
      if (queue.gameMode !== request.gameMode) continue;

      for (const player of queue.players.values()) {
        if (Math.abs(player.mmr - request.averageMmr) <= 300) {
          suitablePlayers.push(player);
          if (suitablePlayers.length >= request.requiredPlayers) break;
        }
      }

      if (suitablePlayers.length >= request.requiredPlayers) break;
    }

    if (suitablePlayers.length >= request.requiredPlayers) {
      // Remove players from their queues
      for (const player of suitablePlayers.slice(0, request.requiredPlayers)) {
        const queue = this.queues.get(player.gameMode)!;
        queue.players.delete(player.playerId);
      }

      return { success: true, players: suitablePlayers.slice(0, request.requiredPlayers) };
    }

    return { success: false };
  }

  private getUrgencyScore(urgency: 'low' | 'medium' | 'high'): number {
    switch (urgency) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  private updateMatchHistory(matchResult: any): void {
    for (const playerResult of matchResult.playerResults) {
      const playerId = playerResult.playerId;
      if (!this.matchHistory.has(playerId)) {
        this.matchHistory.set(playerId, []);
      }

      const history = this.matchHistory.get(playerId)!;
      history.push({
        matchId: matchResult.matchId,
        gameMode: matchResult.gameMode,
        won: playerResult.won,
        performance: playerResult.performance,
        timestamp: Date.now(),
      });

      // Keep only last 50 matches
      if (history.length > 50) {
        history.shift();
      }
    }
  }

  private estimateMatchDuration(gameMode: string): number {
    const durations = {
      'halo-royale': 1200000,    // 20 minutes
      'halo-arena': 900000,     // 15 minutes
      'halo-rally': 600000,     // 10 minutes
      'halo-raids': 1800000,    // 30 minutes
      'halo-tactics': 480000,   // 8 minutes
    };

    return durations[gameMode as keyof typeof durations] || 900000;
  }

  private async loadPlayerRatings(): Promise<void> {
    // Stub - would load from database
    this.logger.info('Player ratings loaded from database');
  }

  private async handleGetQueueStatus(message: AgentMessage): Promise<AgentMessage> {
    const queueStatus = Array.from(this.queues.entries()).map(([gameMode, queue]) => ({
      gameMode,
      playerCount: queue.players.size,
      averageWaitTime: this.calculateAverageWaitTime(queue),
      longestWaitTime: this.calculateLongestWaitTime(queue),
    }));

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { queueStatus, activeMatches: this.activeMatches.size },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handlePlayerDisconnect(message: AgentMessage): Promise<AgentMessage> {
    const { playerId, matchId } = message.data;

    // Remove from queues
    for (const queue of this.queues.values()) {
      queue.players.delete(playerId);
    }

    // Handle active match disconnect
    if (matchId && this.activeMatches.has(matchId)) {
      // Trigger backfill request
      const match = this.activeMatches.get(matchId)!;
      const backfillRequest: BackfillRequest = {
        matchId,
        gameMode: match.gameMode,
        requiredPlayers: 1,
        averageMmr: match.players.reduce((sum, p) => sum + p.mmr, 0) / match.players.length,
        urgency: 'high',
      };

      this.backfillQueue.push(backfillRequest);
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private async handleMatchComplete(message: AgentMessage): Promise<AgentMessage> {
    const { matchId } = message.data;

    if (this.activeMatches.has(matchId)) {
      this.activeMatches.delete(matchId);
      this.logger.info(`Match completed: ${matchId}`);
    }

    return {
      id: this.generateMessageId(),
      type: 'response',
      from: this.config.id,
      to: message.from,
      data: { success: true },
      timestamp: Date.now(),
      correlationId: message.id,
    };
  }

  private calculateAverageWaitTime(queue: MatchmakingQueue): number {
    if (queue.players.size === 0) return 0;

    const now = Date.now();
    const totalWaitTime = Array.from(queue.players.values())
      .reduce((sum, player) => sum + (now - player.queueTime), 0);

    return totalWaitTime / queue.players.size;
  }

  private calculateLongestWaitTime(queue: MatchmakingQueue): number {
    if (queue.players.size === 0) return 0;

    const now = Date.now();
    return Math.max(...Array.from(queue.players.values())
      .map(player => now - player.queueTime));
  }

  private generateMatchId(): string {
    return `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}