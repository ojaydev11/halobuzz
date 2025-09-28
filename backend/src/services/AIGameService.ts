import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import mongoose from 'mongoose';
import crypto from 'crypto';

// AI Game interfaces
interface AIGameSession {
  sessionId: string;
  gameId: string;
  players: GamePlayer[];
  gameType: 'single' | 'multiplayer';
  status: 'waiting' | 'playing' | 'completed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  roundNumber: number;
  totalRounds: number;
  aiWinRate: number;
  targetRTP: number; // Return to Player percentage
  houseEdge: number;
  antiCheatData: AntiCheatData;
}

interface GamePlayer {
  userId: string;
  username: string;
  betAmount: number;
  currentScore: number;
  totalWinnings: number;
  isAI: boolean;
  aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  performanceMetrics: PlayerPerformance;
}

interface PlayerPerformance {
  reactionTime: number[];
  accuracy: number;
  consistency: number;
  suspiciousActivity: number;
  lastUpdated: Date;
}

interface AntiCheatData {
  sessionHash: string;
  playerActions: PlayerAction[];
  validationChecks: ValidationCheck[];
  riskScore: number;
  flags: string[];
}

interface PlayerAction {
  playerId: string;
  action: string;
  timestamp: Date;
  data: any;
  hash: string;
}

interface ValidationCheck {
  checkType: 'timing' | 'pattern' | 'score' | 'behavior';
  result: 'pass' | 'fail' | 'suspicious';
  score: number;
  details: string;
  timestamp: Date;
}

interface GameOutcome {
  winners: string[];
  losers: string[];
  aiWins: boolean;
  payoutMultiplier: number;
  totalPayout: number;
  antiCheatResult: 'clean' | 'flagged' | 'blocked';
}

class AIGameService {
  private activeSessions: Map<string, AIGameSession> = new Map();
  private playerPerformance: Map<string, PlayerPerformance> = new Map();
  private aiWinRateHistory: Map<string, number[]> = new Map();

  constructor() {
    this.initializeCleanup();
  }

  // Create a new AI game session
  async createGameSession(
    gameId: string,
    players: Omit<GamePlayer, 'currentScore' | 'totalWinnings' | 'isAI' | 'aiDifficulty' | 'performanceMetrics'>[],
    gameType: 'single' | 'multiplayer' = 'single'
  ): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      const sessionId = this.generateSessionId();
      
      // Initialize AI players if needed
      const gamePlayers: GamePlayer[] = players.map(player => ({
        ...player,
        currentScore: 0,
        totalWinnings: 0,
        isAI: false,
        aiDifficulty: 'medium',
        performanceMetrics: this.getDefaultPerformance()
      }));

      // Add AI opponents for single player games
      if (gameType === 'single') {
        const aiPlayer = this.createAIPlayer(gameId);
        gamePlayers.push(aiPlayer);
      }

      // Calculate AI win rate based on game type and player skill
      const aiWinRate = await this.calculateOptimalWinRate(gameId, gamePlayers);
      
      // Create session
      const session: AIGameSession = {
        sessionId,
        gameId,
        players: gamePlayers,
        gameType,
        status: 'waiting',
        startTime: new Date(),
        roundNumber: 0,
        totalRounds: this.getTotalRounds(gameId),
        aiWinRate,
        targetRTP: 60, // 60% return to player
        houseEdge: 40, // 40% house edge
        antiCheatData: {
          sessionHash: this.generateSessionHash(sessionId),
          playerActions: [],
          validationChecks: [],
          riskScore: 0,
          flags: []
        }
      };

      this.activeSessions.set(sessionId, session);
      
      // Cache session for external access
      await setCache(`ai_game:${sessionId}`, session, 3600); // 1 hour TTL
      
      logger.info(`AI game session created: ${sessionId} with ${gamePlayers.length} players`);
      
      return { success: true, sessionId };
      
    } catch (error) {
      logger.error('Error creating AI game session:', error);
      return { success: false, error: 'Failed to create game session' };
    }
  }

  // Start the game session
  async startGameSession(sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'waiting') {
        return { success: false, error: 'Session already started or completed' };
      }

      // Update session status
      session.status = 'playing';
      session.startTime = new Date();
      
      // Initialize anti-cheat monitoring
      await this.initializeAntiCheat(session);
      
      // Cache updated session
      await setCache(`ai_game:${sessionId}`, session, 3600);
      
      logger.info(`AI game session started: ${sessionId}`);
      
      return { success: true };
      
    } catch (error) {
      logger.error('Error starting game session:', error);
      return { success: false, error: 'Failed to start game session' };
    }
  }

  // Process a game round with AI win rate control
  async processGameRound(
    sessionId: string,
    playerActions: { playerId: string; action: any }[]
  ): Promise<{
    success: boolean;
    outcome?: GameOutcome;
    error?: string;
  }> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'playing') {
        return { success: false, error: 'Session not in playing state' };
      }

      // Validate player actions with anti-cheat
      const antiCheatResult = await this.validatePlayerActions(session, playerActions);
      if (antiCheatResult.result === 'blocked') {
        return { success: false, error: 'Game blocked due to suspicious activity' };
      }

      // Record actions for anti-cheat
      playerActions.forEach(action => {
        session.antiCheatData.playerActions.push({
          playerId: action.playerId,
          action: JSON.stringify(action.action),
          timestamp: new Date(),
          data: action.action,
          hash: this.hashAction(action)
        });
      });

      // Calculate round outcome with AI win rate control
      const outcome = await this.calculateRoundOutcome(session, playerActions);
      
      // Update player scores and winnings
      await this.updatePlayerResults(session, outcome);
      
      // Increment round
      session.roundNumber++;
      
      // Check if game is complete
      if (session.roundNumber >= session.totalRounds) {
        session.status = 'completed';
        session.endTime = new Date();
      }

      // Update AI win rate history
      await this.updateAIWinRateHistory(session.gameId, outcome.aiWins);
      
      // Cache updated session
      await setCache(`ai_game:${sessionId}`, session, 3600);
      
      logger.info(`Game round processed: ${sessionId} - Round ${session.roundNumber}/${session.totalRounds}`);
      
      return { success: true, outcome };
      
    } catch (error) {
      logger.error('Error processing game round:', error);
      return { success: false, error: 'Failed to process game round' };
    }
  }

  // Calculate optimal AI win rate based on player skill and game type
  private async calculateOptimalWinRate(gameId: string, players: GamePlayer[]): Promise<number> {
    try {
      // Base win rate (45% - within 35-55% range)
      let baseWinRate = 45;
      
      // Adjust based on player skill levels
      const humanPlayers = players.filter(p => !p.isAI);
      if (humanPlayers.length > 0) {
        const averageSkill = humanPlayers.reduce((sum, player) => {
          const performance = this.playerPerformance.get(player.userId);
          return sum + (performance?.accuracy || 0.5);
        }, 0) / humanPlayers.length;
        
        // Adjust win rate based on player skill (better players = higher AI win rate)
        baseWinRate += (averageSkill - 0.5) * 10; // ±5% adjustment
      }
      
      // Ensure win rate stays within bounds
      baseWinRate = Math.max(35, Math.min(55, baseWinRate));
      
      // Add some randomness to prevent predictable patterns
      const randomAdjustment = (Math.random() - 0.5) * 2; // ±1%
      baseWinRate += randomAdjustment;
      
      return Math.round(baseWinRate * 100) / 100; // Round to 2 decimal places
      
    } catch (error) {
      logger.error('Error calculating optimal win rate:', error);
      return 45; // Default fallback
    }
  }

  // Calculate round outcome with AI win rate control
  private async calculateRoundOutcome(
    session: AIGameSession,
    playerActions: { playerId: string; action: any }[]
  ): Promise<GameOutcome> {
    try {
      // Calculate base outcome probabilities
      const aiWinProbability = session.aiWinRate / 100;
      const playerWinProbability = 1 - aiWinProbability;
      
      // Generate deterministic but random outcome
      const randomSeed = this.generateDeterministicSeed(session.sessionId, session.roundNumber);
      const randomValue = this.seededRandom(randomSeed);
      
      const aiWins = randomValue < aiWinProbability;
      
      // Determine winners and losers
      const humanPlayers = session.players.filter(p => !p.isAI);
      const aiPlayers = session.players.filter(p => p.isAI);
      
      let winners: string[] = [];
      let losers: string[] = [];
      
      if (aiWins) {
        winners = aiPlayers.map(p => p.userId);
        losers = humanPlayers.map(p => p.userId);
      } else {
        winners = humanPlayers.map(p => p.userId);
        losers = aiPlayers.map(p => p.userId);
      }
      
      // Calculate payout
      const totalBetAmount = session.players.reduce((sum, player) => sum + player.betAmount, 0);
      const payoutMultiplier = aiWins ? 0 : (1 + session.targetRTP / 100);
      const totalPayout = totalBetAmount * payoutMultiplier;
      
      return {
        winners,
        losers,
        aiWins,
        payoutMultiplier,
        totalPayout,
        antiCheatResult: 'clean' // Will be updated by anti-cheat validation
      };
      
    } catch (error) {
      logger.error('Error calculating round outcome:', error);
      throw error;
    }
  }

  // Validate player actions with anti-cheat
  private async validatePlayerActions(
    session: AIGameSession,
    playerActions: { playerId: string; action: any }[]
  ): Promise<ValidationCheck> {
    try {
      const checks: ValidationCheck[] = [];
      
      // Timing validation
      const timingCheck = await this.validateTiming(session, playerActions);
      checks.push(timingCheck);
      
      // Pattern validation
      const patternCheck = await this.validatePatterns(session, playerActions);
      checks.push(patternCheck);
      
      // Score validation
      const scoreCheck = await this.validateScores(session, playerActions);
      checks.push(scoreCheck);
      
      // Behavior validation
      const behaviorCheck = await this.validateBehavior(session, playerActions);
      checks.push(behaviorCheck);
      
      // Calculate overall risk score
      const riskScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
      
      // Determine result
      let result: 'pass' | 'fail' | 'suspicious' = 'pass';
      if (riskScore > 0.8) {
        result = 'fail';
      } else if (riskScore > 0.5) {
        result = 'suspicious';
      }
      
      // Update session anti-cheat data
      session.antiCheatData.validationChecks.push(...checks);
      session.antiCheatData.riskScore = riskScore;
      
      if (result !== 'pass') {
        session.antiCheatData.flags.push(`Risk score: ${riskScore.toFixed(2)}`);
      }
      
      return {
        checkType: 'behavior',
        result,
        score: riskScore,
        details: `Overall risk assessment: ${riskScore.toFixed(2)}`,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Error validating player actions:', error);
      return {
        checkType: 'behavior',
        result: 'fail',
        score: 1.0,
        details: 'Validation error',
        timestamp: new Date()
      };
    }
  }

  // Validate timing patterns
  private async validateTiming(
    session: AIGameSession,
    playerActions: { playerId: string; action: any }[]
  ): Promise<ValidationCheck> {
    try {
      // Check for impossibly fast actions
      const suspiciousActions = playerActions.filter(action => {
        const player = session.players.find(p => p.userId === action.playerId);
        if (!player) return false;
        
        const performance = this.playerPerformance.get(action.playerId);
        if (!performance) return false;
        
        // Check if action timing is suspiciously fast
        const averageReactionTime = performance.reactionTime.reduce((a, b) => a + b, 0) / performance.reactionTime.length;
        return action.action.timing < averageReactionTime * 0.5; // 50% faster than average
      });
      
      const suspiciousRatio = suspiciousActions.length / playerActions.length;
      
      return {
        checkType: 'timing',
        result: suspiciousRatio > 0.3 ? 'suspicious' : 'pass',
        score: suspiciousRatio,
        details: `${suspiciousActions.length} suspicious timing patterns detected`,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Error validating timing:', error);
      return {
        checkType: 'timing',
        result: 'fail',
        score: 1.0,
        details: 'Timing validation error',
        timestamp: new Date()
      };
    }
  }

  // Validate action patterns
  private async validatePatterns(
    session: AIGameSession,
    playerActions: { playerId: string; action: any }[]
  ): Promise<ValidationCheck> {
    try {
      // Check for repetitive patterns that might indicate automation
      const patternGroups = new Map<string, number>();
      
      playerActions.forEach(action => {
        const pattern = JSON.stringify(action.action);
        patternGroups.set(pattern, (patternGroups.get(pattern) || 0) + 1);
      });
      
      const maxRepetition = Math.max(...patternGroups.values());
      const repetitionRatio = maxRepetition / playerActions.length;
      
      return {
        checkType: 'pattern',
        result: repetitionRatio > 0.7 ? 'suspicious' : 'pass',
        score: repetitionRatio,
        details: `Max pattern repetition: ${maxRepetition}/${playerActions.length}`,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Error validating patterns:', error);
      return {
        checkType: 'pattern',
        result: 'fail',
        score: 1.0,
        details: 'Pattern validation error',
        timestamp: new Date()
      };
    }
  }

  // Validate scores
  private async validateScores(
    session: AIGameSession,
    playerActions: { playerId: string; action: any }[]
  ): Promise<ValidationCheck> {
    try {
      // Check for impossibly high scores
      const suspiciousScores = playerActions.filter(action => {
        if (!action.action.score) return false;
        
        // Check if score is suspiciously high
        return action.action.score > 1000; // Arbitrary threshold
      });
      
      const suspiciousRatio = suspiciousScores.length / playerActions.length;
      
      return {
        checkType: 'score',
        result: suspiciousRatio > 0.2 ? 'suspicious' : 'pass',
        score: suspiciousRatio,
        details: `${suspiciousScores.length} suspicious scores detected`,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Error validating scores:', error);
      return {
        checkType: 'score',
        result: 'fail',
        score: 1.0,
        details: 'Score validation error',
        timestamp: new Date()
      };
    }
  }

  // Validate behavior
  private async validateBehavior(
    session: AIGameSession,
    playerActions: { playerId: string; action: any }[]
  ): Promise<ValidationCheck> {
    try {
      // Check for human-like behavior patterns
      let humanLikeScore = 0;
      let totalChecks = 0;
      
      playerActions.forEach(action => {
        const player = session.players.find(p => p.userId === action.playerId);
        if (!player || player.isAI) return;
        
        // Check for natural variation in actions
        if (action.action.variation && action.action.variation > 0.1) {
          humanLikeScore += 1;
        }
        totalChecks++;
        
        // Check for realistic timing variations
        if (action.action.timingVariation && action.action.timingVariation > 0.05) {
          humanLikeScore += 1;
        }
        totalChecks++;
      });
      
      const humanLikeRatio = totalChecks > 0 ? humanLikeScore / totalChecks : 0;
      
      return {
        checkType: 'behavior',
        result: humanLikeRatio < 0.3 ? 'suspicious' : 'pass',
        score: 1 - humanLikeRatio,
        details: `Human-like behavior score: ${humanLikeRatio.toFixed(2)}`,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Error validating behavior:', error);
      return {
        checkType: 'behavior',
        result: 'fail',
        score: 1.0,
        details: 'Behavior validation error',
        timestamp: new Date()
      };
    }
  }

  // Create AI player
  private createAIPlayer(gameId: string): GamePlayer {
    const difficulties = ['easy', 'medium', 'hard', 'expert'] as const;
    const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
    
    return {
      userId: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: `AI_${difficulty.toUpperCase()}`,
      betAmount: 100, // Default AI bet
      currentScore: 0,
      totalWinnings: 0,
      isAI: true,
      aiDifficulty: difficulty,
      performanceMetrics: this.getAIPerformance(difficulty)
    };
  }

  // Get default performance metrics
  private getDefaultPerformance(): PlayerPerformance {
    return {
      reactionTime: [],
      accuracy: 0.5,
      consistency: 0.5,
      suspiciousActivity: 0,
      lastUpdated: new Date()
    };
  }

  // Get AI performance based on difficulty
  private getAIPerformance(difficulty: 'easy' | 'medium' | 'hard' | 'expert'): PlayerPerformance {
    const basePerformance = {
      easy: { accuracy: 0.3, consistency: 0.4 },
      medium: { accuracy: 0.5, consistency: 0.6 },
      hard: { accuracy: 0.7, consistency: 0.8 },
      expert: { accuracy: 0.9, consistency: 0.95 }
    };
    
    const perf = basePerformance[difficulty];
    
    return {
      reactionTime: [200 + Math.random() * 300], // 200-500ms
      accuracy: perf.accuracy,
      consistency: perf.consistency,
      suspiciousActivity: 0,
      lastUpdated: new Date()
    };
  }

  // Generate session ID
  private generateSessionId(): string {
    return `ai_game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate session hash
  private generateSessionHash(sessionId: string): string {
    return crypto.createHash('sha256').update(sessionId + Date.now()).digest('hex');
  }

  // Hash action for integrity
  private hashAction(action: { playerId: string; action: any }): string {
    return crypto.createHash('sha256').update(JSON.stringify(action)).digest('hex');
  }

  // Generate deterministic seed
  private generateDeterministicSeed(sessionId: string, roundNumber: number): number {
    const data = `${sessionId}_${roundNumber}_${Math.floor(Date.now() / 1000)}`;
    return crypto.createHash('sha256').update(data).digest('hex').substr(0, 8).charCodeAt(0);
  }

  // Seeded random number generator
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Get total rounds for game
  private getTotalRounds(gameId: string): number {
    // Default to 5 rounds, can be customized per game
    return 5;
  }

  // Update player results
  private async updatePlayerResults(session: AIGameSession, outcome: GameOutcome): Promise<void> {
    try {
      session.players.forEach(player => {
        if (outcome.winners.includes(player.userId)) {
          player.currentScore += 100; // Base score for winning
          player.totalWinnings += player.betAmount * outcome.payoutMultiplier;
        } else {
          player.currentScore += 10; // Small score for participation
        }
      });
    } catch (error) {
      logger.error('Error updating player results:', error);
    }
  }

  // Update AI win rate history
  private async updateAIWinRateHistory(gameId: string, aiWon: boolean): Promise<void> {
    try {
      const history = this.aiWinRateHistory.get(gameId) || [];
      history.push(aiWon ? 1 : 0);
      
      // Keep only last 100 games
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      this.aiWinRateHistory.set(gameId, history);
    } catch (error) {
      logger.error('Error updating AI win rate history:', error);
    }
  }

  // Initialize anti-cheat monitoring
  private async initializeAntiCheat(session: AIGameSession): Promise<void> {
    try {
      // Initialize performance tracking for human players
      session.players.filter(p => !p.isAI).forEach(player => {
        if (!this.playerPerformance.has(player.userId)) {
          this.playerPerformance.set(player.userId, this.getDefaultPerformance());
        }
      });
    } catch (error) {
      logger.error('Error initializing anti-cheat:', error);
    }
  }

  // Initialize cleanup process
  private initializeCleanup(): void {
    // Clean up old sessions every hour
    setInterval(async () => {
      try {
        await this.cleanupOldSessions();
      } catch (error) {
        logger.error('Error in session cleanup:', error);
      }
    }, 3600000); // 1 hour
  }

  // Clean up old sessions
  private async cleanupOldSessions(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      for (const [sessionId, session] of this.activeSessions) {
        if (session.startTime < oneHourAgo && session.status === 'completed') {
          this.activeSessions.delete(sessionId);
        }
      }
      
      logger.info('AI game session cleanup completed');
    } catch (error) {
      logger.error('Error in cleanup:', error);
    }
  }

  // Get session by ID
  async getSession(sessionId: string): Promise<AIGameSession | null> {
    try {
      // Check active sessions first
      const activeSession = this.activeSessions.get(sessionId);
      if (activeSession) {
        return activeSession;
      }

      // Check cache
      const cachedSession = await getCache(`ai_game:${sessionId}`);
      if (cachedSession) {
        return cachedSession;
      }

      return null;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  // Get session statistics
  async getSessionStatistics(): Promise<{
    activeSessions: number;
    totalPlayers: number;
    averageWinRate: number;
    antiCheatFlags: number;
  }> {
    try {
      const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.status === 'playing').length;
      const totalPlayers = Array.from(this.activeSessions.values()).reduce((sum, s) => sum + s.players.length, 0);
      
      const allWinRates = Array.from(this.aiWinRateHistory.values()).flat();
      const averageWinRate = allWinRates.length > 0 ? 
        allWinRates.reduce((sum, rate) => sum + rate, 0) / allWinRates.length : 0;
      
      const antiCheatFlags = Array.from(this.activeSessions.values()).reduce((sum, s) => sum + s.antiCheatData.flags.length, 0);
      
      return {
        activeSessions,
        totalPlayers,
        averageWinRate: averageWinRate * 100, // Convert to percentage
        antiCheatFlags
      };
    } catch (error) {
      logger.error('Error getting session statistics:', error);
      return {
        activeSessions: 0,
        totalPlayers: 0,
        averageWinRate: 0,
        antiCheatFlags: 0
      };
    }
  }
}

// Export singleton instance
export const aiGameService = new AIGameService();
export default aiGameService;
