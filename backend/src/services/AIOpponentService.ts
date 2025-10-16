import { EventEmitter } from 'events';
import { logger } from '@/config/logger';

export interface AIPersonality {
  id: string;
  name: string;
  avatar: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary';
  playstyle: 'aggressive' | 'conservative' | 'balanced' | 'unpredictable' | 'analytical';
  traits: {
    aggression: number; // 0-100
    patience: number; // 0-100
    riskTaking: number; // 0-100
    adaptability: number; // 0-100
    bluffing: number; // 0-100 (for poker-like games)
    precision: number; // 0-100 (for skill-based games)
  };
  specialties: string[]; // Games where this AI excels
  weaknesses: string[]; // Games where this AI is weaker
  catchphrases: string[];
  level: number;
  winRate: number;
  experience: number;
}

export interface AIDecision {
  action: string;
  confidence: number; // 0-100
  reasoning?: string;
  alternativeActions?: Array<{ action: string; probability: number }>;
  metadata?: any;
}

export interface GameState {
  gameCode: string;
  gamePhase: string;
  playerStates: Map<string, any>;
  sharedState: any;
  availableActions: string[];
  timeRemaining?: number;
  roundNumber?: number;
}

export interface AIPlayer {
  id: string;
  personality: AIPersonality;
  currentState: any;
  gameHistory: GameAction[];
  performanceStats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    averageDecisionTime: number;
    strongAgainst: string[];
    weakAgainst: string[];
  };
  isActive: boolean;
  difficulty: number; // Dynamic difficulty adjustment
}

export interface GameAction {
  playerId: string;
  action: string;
  timestamp: Date;
  gameState: any;
  outcome?: string;
  score?: number;
}

export interface BalancingRule {
  condition: string;
  adjustment: {
    type: 'buff' | 'nerf' | 'modify';
    target: string;
    value: number;
    duration?: number;
  };
  priority: number;
}

/**
 * AI Opponent Service
 * Manages intelligent AI opponents with different personalities and adaptive difficulty
 */
export class AIOpponentService extends EventEmitter {
  private static instance: AIOpponentService;
  private aiPersonalities = new Map<string, AIPersonality>();
  private activeAIPlayers = new Map<string, AIPlayer>();
  private gameStrategies = new Map<string, any>();
  private balancingRules = new Map<string, BalancingRule[]>();
  private difficultyAdjustments = new Map<string, number>();

  private constructor() {
    super();
    this.initializeAIPersonalities();
    this.initializeGameStrategies();
    this.initializeBalancingRules();
    this.startPeriodicTasks();
  }

  static getInstance(): AIOpponentService {
    if (!AIOpponentService.instance) {
      AIOpponentService.instance = new AIOpponentService();
    }
    return AIOpponentService.instance;
  }

  /**
   * Get available AI personalities
   */
  getAIPersonalities(): AIPersonality[] {
    return Array.from(this.aiPersonalities.values());
  }

  /**
   * Get AI personality by difficulty level
   */
  getAIByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'legendary'): AIPersonality[] {
    return Array.from(this.aiPersonalities.values())
      .filter(ai => ai.difficulty === difficulty);
  }

  /**
   * Create AI opponent for a game
   */
  createAIOpponent(gameCode: string, requestedDifficulty?: string, personalityId?: string): AIPlayer {
    let personality: AIPersonality;

    if (personalityId && this.aiPersonalities.has(personalityId)) {
      personality = this.aiPersonalities.get(personalityId)!;
    } else {
      // Select appropriate AI based on game and difficulty
      const suitableAIs = this.selectSuitableAI(gameCode, requestedDifficulty);
      personality = suitableAIs[Math.floor(Math.random() * suitableAIs.length)];
    }

    const aiPlayer: AIPlayer = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      personality,
      currentState: this.initializeAIState(gameCode, personality),
      gameHistory: [],
      performanceStats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        averageDecisionTime: 1000 + Math.random() * 2000, // 1-3 seconds
        strongAgainst: [],
        weakAgainst: []
      },
      isActive: true,
      difficulty: this.calculateBaseDifficulty(personality.difficulty)
    };

    this.activeAIPlayers.set(aiPlayer.id, aiPlayer);

    logger.info(`Created AI opponent: ${personality.name} (${personality.difficulty}) for game ${gameCode}`);
    return aiPlayer;
  }

  /**
   * Make AI decision for a game action
   */
  async makeAIDecision(aiPlayerId: string, gameState: GameState): Promise<AIDecision> {
    const aiPlayer = this.activeAIPlayers.get(aiPlayerId);
    if (!aiPlayer) {
      throw new Error('AI player not found');
    }

    const strategy = this.gameStrategies.get(gameState.gameCode);
    if (!strategy) {
      throw new Error('Game strategy not found');
    }

    // Simulate thinking time based on AI personality and difficulty
    const thinkingTime = this.calculateThinkingTime(aiPlayer, gameState);
    await this.sleep(thinkingTime);

    // Apply difficulty adjustments
    const adjustedDifficulty = this.getDynamicDifficulty(aiPlayerId, gameState.gameCode);

    // Make decision based on game type
    let decision: AIDecision;

    switch (gameState.gameCode) {
      case 'crypto-battle-royale':
        decision = await this.makeBattleRoyaleDecision(aiPlayer, gameState, adjustedDifficulty);
        break;
      case 'speed-chess':
        decision = await this.makeChessDecision(aiPlayer, gameState, adjustedDifficulty);
        break;
      case 'ai-poker':
        decision = await this.makePokerDecision(aiPlayer, gameState, adjustedDifficulty);
        break;
      case 'reflex-arena':
        decision = await this.makeReflexDecision(aiPlayer, gameState, adjustedDifficulty);
        break;
      case 'strategy-empire':
        decision = await this.makeStrategyDecision(aiPlayer, gameState, adjustedDifficulty);
        break;
      default:
        decision = await this.makeGenericDecision(aiPlayer, gameState, adjustedDifficulty);
    }

    // Record the decision
    this.recordAIAction(aiPlayer, {
      playerId: aiPlayerId,
      action: decision.action,
      timestamp: new Date(),
      gameState: gameState.sharedState
    });

    this.emit('aiDecisionMade', { aiPlayerId, decision, gameState });
    return decision;
  }

  /**
   * Update AI performance after game completion
   */
  updateAIPerformance(aiPlayerId: string, gameResult: {
    won: boolean;
    score: number;
    opponentTypes: string[];
    gameLength: number;
    difficulty: string;
  }): void {
    const aiPlayer = this.activeAIPlayers.get(aiPlayerId);
    if (!aiPlayer) return;

    const stats = aiPlayer.performanceStats;
    stats.gamesPlayed++;

    if (gameResult.won) {
      stats.wins++;
    } else {
      stats.losses++;
    }

    // Update AI difficulty based on performance
    this.adjustAIDifficulty(aiPlayerId, gameResult);

    // Learn from opponents
    this.updateAILearning(aiPlayer, gameResult);

    logger.info(`Updated AI performance for ${aiPlayer.personality.name}: ${stats.wins}W/${stats.losses}L`);
  }

  /**
   * Get AI opponent suggestions for matchmaking
   */
  suggestAIOpponents(gameCode: string, playerLevel: number, playerSkill: number): AIPersonality[] {
    const suitableAIs = Array.from(this.aiPersonalities.values())
      .filter(ai => ai.specialties.includes(gameCode) || ai.specialties.includes('all'))
      .map(ai => {
        const skillDifference = Math.abs(ai.level - playerLevel);
        const difficultyScore = this.calculateMatchmakingScore(ai, playerLevel, playerSkill);
        return { ai, skillDifference, difficultyScore };
      })
      .sort((a, b) => a.difficultyScore - b.difficultyScore)
      .slice(0, 5)
      .map(item => item.ai);

    return suitableAIs;
  }

  /**
   * Private methods for AI decision making
   */
  private async makeBattleRoyaleDecision(aiPlayer: AIPlayer, gameState: GameState, difficulty: number): Promise<AIDecision> {
    const personality = aiPlayer.personality;
    const actions = ['move', 'attack', 'defend', 'use_item', 'hide'];

    // Consider AI traits
    const actionWeights: { [key: string]: number } = {
      move: 30 + personality.traits.aggression * 0.3,
      attack: 20 + personality.traits.aggression * 0.5,
      defend: 15 + personality.traits.patience * 0.4,
      use_item: 20 + personality.traits.adaptability * 0.3,
      hide: 15 + (100 - personality.traits.aggression) * 0.2
    };

    // Adjust based on game state
    const playerState = gameState.playerStates.get(aiPlayer.id);
    if (playerState?.health < 30) {
      actionWeights.defend *= 2;
      actionWeights.hide *= 1.5;
      actionWeights.attack *= 0.5;
    }

    // Apply difficulty scaling
    const selectedAction = this.weightedRandomSelection(actionWeights, difficulty);

    return {
      action: selectedAction,
      confidence: 70 + difficulty * 0.3,
      reasoning: `${personality.playstyle} approach based on current situation`,
      alternativeActions: this.getAlternativeActions(actionWeights, selectedAction)
    };
  }

  private async makeChessDecision(aiPlayer: AIPlayer, gameState: GameState, difficulty: number): Promise<AIDecision> {
    const personality = aiPlayer.personality;

    // Simulate chess engine thinking
    const moveTypes = ['opening', 'middle_game', 'endgame'];
    const currentPhase = gameState.gamePhase || 'middle_game';

    // Adjust move quality based on difficulty and traits
    const moveQuality = (difficulty / 100) * personality.traits.precision;
    const thinkingDepth = Math.floor(moveQuality / 10) + 1; // 1-10 moves ahead

    // Mock chess move generation
    const possibleMoves = this.generateChessMoves(gameState, thinkingDepth);
    const bestMove = possibleMoves[0]; // In production, use actual chess engine

    return {
      action: bestMove,
      confidence: Math.min(95, 60 + moveQuality),
      reasoning: `Analyzed ${thinkingDepth} moves ahead in ${currentPhase}`,
      metadata: { depth: thinkingDepth, evaluation: moveQuality }
    };
  }

  private async makePokerDecision(aiPlayer: AIPlayer, gameState: GameState, difficulty: number): Promise<AIDecision> {
    const personality = aiPlayer.personality;
    const actions = ['fold', 'call', 'raise', 'all_in'];

    // Calculate hand strength (mock)
    const handStrength = Math.random(); // 0-1
    const potOdds = this.calculatePotOdds(gameState.sharedState);

    let actionWeights: { [key: string]: number } = {};

    if (handStrength > 0.7) {
      // Strong hand
      actionWeights = {
        fold: 5,
        call: 20,
        raise: 60 + personality.traits.aggression * 0.3,
        all_in: 15 + personality.traits.riskTaking * 0.2
      };
    } else if (handStrength > 0.3) {
      // Moderate hand
      actionWeights = {
        fold: 30 - personality.traits.patience * 0.2,
        call: 50 + personality.traits.patience * 0.3,
        raise: 15 + personality.traits.bluffing * 0.1,
        all_in: 5
      };
    } else {
      // Weak hand
      const bluffChance = personality.traits.bluffing * (difficulty / 100);
      actionWeights = {
        fold: 70 - bluffChance * 0.5,
        call: 20,
        raise: bluffChance * 0.3,
        all_in: bluffChance * 0.1
      };
    }

    const selectedAction = this.weightedRandomSelection(actionWeights, difficulty);

    return {
      action: selectedAction,
      confidence: 50 + handStrength * 40 + (difficulty * 0.1),
      reasoning: `Hand strength: ${(handStrength * 100).toFixed(0)}%, pot odds consideration`,
      metadata: { handStrength, potOdds, bluffProbability: personality.traits.bluffing }
    };
  }

  private async makeReflexDecision(aiPlayer: AIPlayer, gameState: GameState, difficulty: number): Promise<AIDecision> {
    const personality = aiPlayer.personality;

    // Reflex games are about timing and precision
    const reactionTime = this.calculateReactionTime(personality, difficulty);
    const accuracy = (difficulty / 100) * personality.traits.precision;

    // Simulate target hitting decision
    const targetDifficulty = gameState.sharedState?.targetDifficulty || 0.5;
    const hitProbability = Math.min(0.95, accuracy * (1 - targetDifficulty * 0.3));

    const shouldHit = Math.random() < hitProbability;

    return {
      action: shouldHit ? 'hit_target' : 'miss',
      confidence: hitProbability * 100,
      reasoning: `Reaction time: ${reactionTime}ms, target difficulty: ${(targetDifficulty * 100).toFixed(0)}%`,
      metadata: { reactionTime, accuracy, hitProbability }
    };
  }

  private async makeStrategyDecision(aiPlayer: AIPlayer, gameState: GameState, difficulty: number): Promise<AIDecision> {
    const personality = aiPlayer.personality;
    const actions = ['build', 'research', 'attack', 'defend', 'expand', 'trade'];

    // Strategic AI considers multiple factors
    const gamePhase = gameState.gamePhase || 'early';
    const resources = gameState.playerStates.get(aiPlayer.id)?.resources || {};

    let actionWeights: { [key: string]: number } = {};

    switch (gamePhase) {
      case 'early':
        actionWeights = {
          build: 40 + personality.traits.patience * 0.3,
          research: 25 + personality.traits.adaptability * 0.2,
          expand: 20,
          attack: 10 + personality.traits.aggression * 0.1,
          defend: 15,
          trade: 10
        };
        break;
      case 'middle':
        actionWeights = {
          build: 25,
          research: 20,
          attack: 30 + personality.traits.aggression * 0.4,
          defend: 15,
          expand: 20,
          trade: 15
        };
        break;
      case 'late':
        actionWeights = {
          attack: 50 + personality.traits.aggression * 0.3,
          defend: 30,
          build: 10,
          research: 5,
          expand: 5,
          trade: 10
        };
        break;
    }

    // Adjust based on resources
    if (resources.military < resources.economy * 0.3) {
      actionWeights.build *= 1.5; // Need more military
    }

    const selectedAction = this.weightedRandomSelection(actionWeights, difficulty);

    return {
      action: selectedAction,
      confidence: 60 + difficulty * 0.4,
      reasoning: `Strategic decision for ${gamePhase} game phase`,
      metadata: { gamePhase, resources }
    };
  }

  private async makeGenericDecision(aiPlayer: AIPlayer, gameState: GameState, difficulty: number): Promise<AIDecision> {
    const availableActions = gameState.availableActions;
    if (availableActions.length === 0) {
      return { action: 'wait', confidence: 100 };
    }

    // Generic decision making based on personality
    const selectedAction = availableActions[Math.floor(Math.random() * availableActions.length)];

    return {
      action: selectedAction,
      confidence: 50 + difficulty * 0.3,
      reasoning: 'Generic decision based on available options'
    };
  }

  /**
   * Helper methods
   */
  private initializeAIPersonalities(): void {
    const personalities: AIPersonality[] = [
      {
        id: 'novice_newbie',
        name: 'Newbie Nick',
        avatar: '🤖',
        difficulty: 'beginner',
        playstyle: 'conservative',
        traits: { aggression: 20, patience: 80, riskTaking: 15, adaptability: 40, bluffing: 10, precision: 30 },
        specialties: ['all'],
        weaknesses: ['speed-chess', 'reflex-arena'],
        catchphrases: ['Learning as I go!', 'Oops, did I do that?', 'Still figuring this out...'],
        level: 5,
        winRate: 0.25,
        experience: 100
      },
      {
        id: 'strategic_sarah',
        name: 'Strategic Sarah',
        avatar: '🧠',
        difficulty: 'intermediate',
        playstyle: 'analytical',
        traits: { aggression: 40, patience: 90, riskTaking: 30, adaptability: 85, bluffing: 20, precision: 70 },
        specialties: ['speed-chess', 'strategy-empire'],
        weaknesses: ['reflex-arena'],
        catchphrases: ['Let me think about this...', 'Calculating optimal move...', 'Strategy over speed!'],
        level: 15,
        winRate: 0.65,
        experience: 2500
      },
      {
        id: 'aggressive_alex',
        name: 'Aggressive Alex',
        avatar: '⚔️',
        difficulty: 'advanced',
        playstyle: 'aggressive',
        traits: { aggression: 95, patience: 20, riskTaking: 85, adaptability: 60, bluffing: 75, precision: 60 },
        specialties: ['crypto-battle-royale', 'ai-poker'],
        weaknesses: ['strategy-empire'],
        catchphrases: ['Attack is the best defense!', 'Go big or go home!', 'No mercy!'],
        level: 25,
        winRate: 0.72,
        experience: 7500
      },
      {
        id: 'precision_pete',
        name: 'Precision Pete',
        avatar: '🎯',
        difficulty: 'expert',
        playstyle: 'balanced',
        traits: { aggression: 60, patience: 70, riskTaking: 40, adaptability: 80, bluffing: 50, precision: 95 },
        specialties: ['reflex-arena', 'speed-chess'],
        weaknesses: [],
        catchphrases: ['Accuracy is everything', 'Perfect timing!', 'Measured and precise'],
        level: 35,
        winRate: 0.78,
        experience: 15000
      },
      {
        id: 'master_ming',
        name: 'Master Ming',
        avatar: '🐉',
        difficulty: 'legendary',
        playstyle: 'unpredictable',
        traits: { aggression: 70, patience: 85, riskTaking: 60, adaptability: 95, bluffing: 90, precision: 90 },
        specialties: ['all'],
        weaknesses: [],
        catchphrases: ['Expect the unexpected', 'Ancient wisdom guides me', 'You cannot predict my moves'],
        level: 50,
        winRate: 0.85,
        experience: 50000
      }
    ];

    personalities.forEach(personality => {
      this.aiPersonalities.set(personality.id, personality);
    });
  }

  private initializeGameStrategies(): void {
    // Game-specific strategy configurations
    this.gameStrategies.set('crypto-battle-royale', {
      phases: ['early', 'mid', 'late'],
      strategies: {
        aggressive: { attack: 0.6, defend: 0.2, hide: 0.1, move: 0.1 },
        conservative: { attack: 0.2, defend: 0.4, hide: 0.3, move: 0.1 },
        balanced: { attack: 0.3, defend: 0.3, hide: 0.2, move: 0.2 }
      }
    });

    this.gameStrategies.set('ai-poker', {
      handRanges: {
        tight: { playableHands: 0.15 },
        loose: { playableHands: 0.35 },
        balanced: { playableHands: 0.25 }
      },
      bluffFrequency: {
        low: 0.1,
        medium: 0.2,
        high: 0.35
      }
    });
  }

  private initializeBalancingRules(): void {
    const battleRoyaleRules: BalancingRule[] = [
      {
        condition: 'player_winrate_too_high',
        adjustment: { type: 'nerf', target: 'ai_accuracy', value: -10 },
        priority: 1
      },
      {
        condition: 'player_winrate_too_low',
        adjustment: { type: 'buff', target: 'ai_reaction_time', value: 200 },
        priority: 1
      }
    ];

    this.balancingRules.set('crypto-battle-royale', battleRoyaleRules);
  }

  private selectSuitableAI(gameCode: string, requestedDifficulty?: string): AIPersonality[] {
    let suitableAIs = Array.from(this.aiPersonalities.values())
      .filter(ai => ai.specialties.includes(gameCode) || ai.specialties.includes('all'));

    if (requestedDifficulty) {
      suitableAIs = suitableAIs.filter(ai => ai.difficulty === requestedDifficulty);
    }

    return suitableAIs.length > 0 ? suitableAIs : [Array.from(this.aiPersonalities.values())[0]];
  }

  private calculateBaseDifficulty(difficulty: string): number {
    const difficultyMap = {
      'beginner': 20,
      'intermediate': 45,
      'advanced': 65,
      'expert': 80,
      'legendary': 95
    };
    return difficultyMap[difficulty as keyof typeof difficultyMap] || 50;
  }

  private calculateThinkingTime(aiPlayer: AIPlayer, gameState: GameState): number {
    const baseTime = 500; // 0.5 seconds
    const personalityFactor = aiPlayer.personality.traits.patience / 100;
    const complexityFactor = gameState.availableActions.length * 100;

    return baseTime + (personalityFactor * complexityFactor);
  }

  private getDynamicDifficulty(aiPlayerId: string, gameCode: string): number {
    const basedifficulty = this.activeAIPlayers.get(aiPlayerId)?.difficulty || 50;
    const adjustment = this.difficultyAdjustments.get(`${aiPlayerId}_${gameCode}`) || 0;

    return Math.max(10, Math.min(95, basedifficulty + adjustment));
  }

  private weightedRandomSelection(weights: { [key: string]: number }, difficultyMultiplier: number): string {
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((sum, [_, weight]) => sum + weight, 0);

    // Apply difficulty scaling to make better choices more likely at higher difficulties
    const adjustedWeights = entries.map(([action, weight]) => {
      const adjustedWeight = weight * (1 + (difficultyMultiplier / 100));
      return [action, adjustedWeight];
    });

    const random = Math.random() * adjustedWeights.reduce((sum, [_, weight]) => sum + (weight as number), 0);
    let currentWeight = 0;

    for (const [action, weight] of adjustedWeights) {
      currentWeight += weight as number;
      if (random <= currentWeight) {
        return action as string;
      }
    }

    return entries[0][0]; // Fallback
  }

  private getAlternativeActions(weights: { [key: string]: number }, selectedAction: string): Array<{ action: string; probability: number }> {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    return Object.entries(weights)
      .filter(([action]) => action !== selectedAction)
      .map(([action, weight]) => ({
        action,
        probability: (weight / totalWeight) * 100
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 2);
  }

  private initializeAIState(gameCode: string, personality: AIPersonality): any {
    return {
      gameCode,
      personality: personality.id,
      lastActions: [],
      performance: { recentWins: 0, recentGames: 0 }
    };
  }

  private recordAIAction(aiPlayer: AIPlayer, action: GameAction): void {
    aiPlayer.gameHistory.push(action);

    // Keep only last 50 actions
    if (aiPlayer.gameHistory.length > 50) {
      aiPlayer.gameHistory = aiPlayer.gameHistory.slice(-50);
    }
  }

  private adjustAIDifficulty(aiPlayerId: string, gameResult: any): void {
    const currentAdjustment = this.difficultyAdjustments.get(aiPlayerId) || 0;

    if (gameResult.won) {
      // AI won, might need to make it slightly easier for player
      this.difficultyAdjustments.set(aiPlayerId, currentAdjustment - 1);
    } else {
      // AI lost, might need to make it slightly harder
      this.difficultyAdjustments.set(aiPlayerId, currentAdjustment + 1);
    }

    // Cap adjustments
    const adjustment = Math.max(-20, Math.min(20, this.difficultyAdjustments.get(aiPlayerId) || 0));
    this.difficultyAdjustments.set(aiPlayerId, adjustment);
  }

  private updateAILearning(aiPlayer: AIPlayer, gameResult: any): void {
    // Update AI's knowledge about what works against different opponent types
    gameResult.opponentTypes.forEach((opponentType: string) => {
      if (gameResult.won) {
        if (!aiPlayer.performanceStats.strongAgainst.includes(opponentType)) {
          aiPlayer.performanceStats.strongAgainst.push(opponentType);
        }
      } else {
        if (!aiPlayer.performanceStats.weakAgainst.includes(opponentType)) {
          aiPlayer.performanceStats.weakAgainst.push(opponentType);
        }
      }
    });
  }

  private calculateMatchmakingScore(ai: AIPersonality, playerLevel: number, playerSkill: number): number {
    const levelDifference = Math.abs(ai.level - playerLevel);
    const skillDifference = Math.abs(ai.winRate * 100 - playerSkill);

    return levelDifference * 0.6 + skillDifference * 0.4;
  }

  private generateChessMoves(gameState: GameState, depth: number): string[] {
    // Mock chess move generation - in production, use actual chess engine
    const mockMoves = ['e4', 'Nf3', 'Bb5', 'O-O', 'Re1', 'd4', 'c4', 'Bg5'];
    return mockMoves.slice(0, Math.min(mockMoves.length, depth));
  }

  private calculatePotOdds(gameState: any): number {
    // Mock pot odds calculation
    const potSize = gameState?.pot || 100;
    const betSize = gameState?.currentBet || 20;
    return betSize / (potSize + betSize);
  }

  private calculateReactionTime(personality: AIPersonality, difficulty: number): number {
    const baseReactionTime = 200; // milliseconds
    const personalityFactor = (100 - personality.traits.precision) * 10;
    const difficultyFactor = (100 - difficulty) * 5;

    return baseReactionTime + personalityFactor + difficultyFactor + (Math.random() * 100);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startPeriodicTasks(): void {
    // Clean up inactive AI players every hour
    setInterval(() => {
      this.cleanupInactiveAI();
    }, 60 * 60 * 1000);

    // Adjust global AI difficulty based on player feedback every 10 minutes
    setInterval(() => {
      this.adjustGlobalDifficulty();
    }, 10 * 60 * 1000);
  }

  private cleanupInactiveAI(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const toRemove: string[] = [];

    for (const [aiId, aiPlayer] of this.activeAIPlayers.entries()) {
      if (!aiPlayer.isActive) {
        toRemove.push(aiId);
      }
    }

    toRemove.forEach(aiId => {
      this.activeAIPlayers.delete(aiId);
      // Also clean up difficulty adjustments
      Array.from(this.difficultyAdjustments.keys())
        .filter(key => key.startsWith(aiId))
        .forEach(key => this.difficultyAdjustments.delete(key));
    });

    if (toRemove.length > 0) {
      logger.info(`Cleaned up ${toRemove.length} inactive AI players`);
    }
  }

  private adjustGlobalDifficulty(): void {
    // Analyze global AI performance and adjust difficulty curves
    // This would be based on aggregate player feedback and win rates
    logger.info('Performing global AI difficulty analysis');
  }
}

export const aiOpponentService = AIOpponentService.getInstance();