import { Alert } from 'react-native';
import GameMonetizationService from './GameMonetizationService';
import GameSecurityService from './GameSecurityService';

export interface GameConfig {
  id: string;
  name: string;
  type: 'coin-flip' | 'color' | 'rps' | 'dice' | 'number-guess';
  minStake: number;
  maxStake: number;
  multiplier: number;
  houseEdge: number; // Percentage house edge (e.g., 0.05 = 5%)
  options: string[];
  description: string;
}

export interface GameRound {
  roundId: string;
  gameId: string;
  startTime: string;
  endTime: string;
  status: 'waiting' | 'active' | 'finished';
  timeRemaining: number;
  totalStakes: number;
  winningOption?: number;
  results?: GameResult[];
}

export interface GameResult {
  playerId: string;
  stake: number;
  choice: number;
  result: 'win' | 'loss';
  multiplier: number;
  payout: number;
  timestamp: string;
}

export interface PlayerStake {
  playerId: string;
  stake: number;
  choice: number;
  timestamp: string;
}

class GameEngine {
  private static instance: GameEngine;
  private activeRounds: Map<string, GameRound> = new Map();
  private playerStakes: Map<string, PlayerStake[]> = new Map();
  private monetizationService: GameMonetizationService;
  private securityService: GameSecurityService;

  constructor() {
    this.monetizationService = GameMonetizationService;
    this.securityService = GameSecurityService;
  }

  static getInstance(): GameEngine {
    if (!GameEngine.instance) {
      GameEngine.instance = new GameEngine();
    }
    return GameEngine.instance;
  }

  // Game configurations
  private gameConfigs: GameConfig[] = [
    {
      id: 'coin-flip',
      name: 'Coin Flip',
      type: 'coin-flip',
      minStake: 10,
      maxStake: 1000,
      multiplier: 1.95, // 95% RTP (5% house edge)
      houseEdge: 0.05,
      options: ['Heads', 'Tails'],
      description: 'Flip a coin and win!'
    },
    {
      id: 'color',
      name: 'Color Game',
      type: 'color',
      minStake: 5,
      maxStake: 500,
      multiplier: 2.85, // 95% RTP (5% house edge)
      houseEdge: 0.05,
      options: ['Red', 'Green', 'Blue'],
      description: 'Pick a color and win!'
    },
    {
      id: 'rps',
      name: 'Rock Paper Scissors',
      type: 'rps',
      minStake: 15,
      maxStake: 750,
      multiplier: 2.85, // 95% RTP (5% house edge)
      houseEdge: 0.05,
      options: ['Rock', 'Paper', 'Scissors'],
      description: 'Classic RPS game!'
    },
    // Vendor Games - Moonshot Integration
    {
      id: 'moonshot-slots',
      name: 'Moonshot Slots',
      type: 'number-guess',
      minStake: 20,
      maxStake: 2000,
      multiplier: 3.5,
      houseEdge: 0.03,
      options: ['Cherry', 'Lemon', 'Orange', 'Plum', 'Bell', 'Bar'],
      description: 'Premium slot machine from Moonshot Games'
    },
    {
      id: 'moonshot-blackjack',
      name: 'Moonshot Blackjack',
      type: 'number-guess',
      minStake: 25,
      maxStake: 5000,
      multiplier: 2.0,
      houseEdge: 0.02,
      options: ['Hit', 'Stand', 'Double', 'Split'],
      description: 'Professional blackjack from Moonshot Games'
    },
    {
      id: 'moonshot-roulette',
      name: 'Moonshot Roulette',
      type: 'number-guess',
      minStake: 10,
      maxStake: 10000,
      multiplier: 36.0,
      houseEdge: 0.027,
      options: ['0', '1-36', 'Red', 'Black', 'Even', 'Odd'],
      description: 'European roulette from Moonshot Games'
    },
    // Additional Games
    {
      id: 'lucky-wheel',
      name: 'Lucky Wheel',
      type: 'number-guess',
      minStake: 5,
      maxStake: 1000,
      multiplier: 5.0,
      houseEdge: 0.08,
      options: ['1x', '2x', '5x', '10x', '20x', '50x'],
      description: 'Spin the wheel for big wins!'
    },
    {
      id: 'crash-game',
      name: 'Crash Game',
      type: 'number-guess',
      minStake: 10,
      maxStake: 5000,
      multiplier: 100.0,
      houseEdge: 0.01,
      options: ['1.00x', '1.50x', '2.00x', '5.00x', '10.00x', '100.00x'],
      description: 'Watch the multiplier crash!'
    },
    {
      id: 'plinko',
      name: 'Plinko',
      type: 'number-guess',
      minStake: 5,
      maxStake: 2000,
      multiplier: 8.0,
      houseEdge: 0.06,
      options: ['0.2x', '0.5x', '1x', '2x', '5x', '8x'],
      description: 'Drop the ball and win!'
    },
    {
      id: 'dice-roll',
      name: 'Dice Roll',
      type: 'dice',
      minStake: 10,
      maxStake: 1000,
      multiplier: 6.0,
      houseEdge: 0.05,
      options: ['1', '2', '3', '4', '5', '6'],
      description: 'Roll the dice and predict!'
    },
    {
      id: 'mines',
      name: 'Mines',
      type: 'number-guess',
      minStake: 15,
      maxStake: 3000,
      multiplier: 24.0,
      houseEdge: 0.04,
      options: ['1 Mine', '2 Mines', '3 Mines', '5 Mines', '10 Mines', '24 Mines'],
      description: 'Find the gems, avoid the mines!'
    },
    {
      id: 'tower',
      name: 'Tower',
      type: 'number-guess',
      minStake: 20,
      maxStake: 5000,
      multiplier: 15.0,
      houseEdge: 0.03,
      options: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 5', 'Floor 10', 'Floor 15'],
      description: 'Climb the tower for rewards!'
    }
  ];

  // Get game configuration
  getGameConfig(gameId: string): GameConfig | undefined {
    return this.gameConfigs.find(config => config.id === gameId);
  }

  // Get all game configurations
  getAllGameConfigs(): GameConfig[] {
    return [...this.gameConfigs];
  }

  // Create a new game round
  createGameRound(gameId: string, duration: number = 30): GameRound {
    const config = this.getGameConfig(gameId);
    if (!config) {
      throw new Error(`Game configuration not found for ${gameId}`);
    }

    const roundId = `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + duration * 1000).toISOString();

    const round: GameRound = {
      roundId,
      gameId,
      startTime,
      endTime,
      status: 'waiting',
      timeRemaining: duration,
      totalStakes: 0,
      results: []
    };

    this.activeRounds.set(roundId, round);
    this.playerStakes.set(roundId, []);

    // Start countdown
    this.startRoundCountdown(roundId);

    return round;
  }

  // Start round countdown
  private startRoundCountdown(roundId: string): void {
    const interval = setInterval(() => {
      const round = this.activeRounds.get(roundId);
      if (!round) {
        clearInterval(interval);
        return;
      }

      round.timeRemaining -= 1;

      if (round.timeRemaining <= 0) {
        clearInterval(interval);
        this.finishRound(roundId);
      }
    }, 1000);
  }

  // Place a stake
  async placeStake(roundId: string, playerId: string, stake: number, choice: number): Promise<{ success: boolean; message?: string }> {
    try {
      const round = this.activeRounds.get(roundId);
      if (!round) {
        return { success: false, message: 'Round not found' };
      }

      if (round.status !== 'waiting' && round.status !== 'active') {
        return { success: false, message: 'Round is not accepting stakes' };
      }

      const config = this.getGameConfig(round.gameId);
      if (!config) {
        return { success: false, message: 'Game configuration not found' };
      }

      // Security validation
      const securityValidation = await this.securityService.validateStake(playerId, stake, round.gameId);
      if (!securityValidation.isValid) {
        return { success: false, message: securityValidation.message };
      }

      // Validate stake
      const validation = this.monetizationService.validateStake(stake, config.minStake, config.maxStake);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // Validate choice
      if (choice < 0 || choice >= config.options.length) {
        return { success: false, message: 'Invalid choice' };
      }

      // Deduct stake
      const stakeSuccess = await this.monetizationService.deductStake(round.gameId, stake, config.name);
      if (!stakeSuccess) {
        return { success: false, message: 'Failed to deduct stake' };
      }

      // Add stake to round
      const playerStake: PlayerStake = {
        playerId,
        stake,
        choice,
        timestamp: new Date().toISOString()
      };

      const stakes = this.playerStakes.get(roundId) || [];
      stakes.push(playerStake);
      this.playerStakes.set(roundId, stakes);

      round.totalStakes += stake;
      round.status = 'active';

      return { success: true };
    } catch (error) {
      console.error('Failed to place stake:', error);
      return { success: false, message: 'Failed to place stake' };
    }
  }

  // Finish a round and determine results
  private async finishRound(roundId: string): Promise<void> {
    try {
      const round = this.activeRounds.get(roundId);
      if (!round) return;

      const config = this.getGameConfig(round.gameId);
      if (!config) return;

      // Generate winning option
      const winningOption = this.generateWinningOption(config);
      round.winningOption = winningOption;

      // Process results
      const stakes = this.playerStakes.get(roundId) || [];
      const results: GameResult[] = [];

      for (const stake of stakes) {
        const isWin = stake.choice === winningOption;
        const result: GameResult = {
          playerId: stake.playerId,
          stake: stake.stake,
          choice: stake.choice,
          result: isWin ? 'win' : 'loss',
          multiplier: isWin ? config.multiplier : 0,
          payout: isWin ? stake.stake * config.multiplier : 0,
          timestamp: new Date().toISOString()
        };

        results.push(result);

        // Process winnings if player won
        if (isWin) {
          await this.monetizationService.addWinnings(
            round.gameId,
            result.payout,
            config.name,
            config.multiplier
          );
        }

        // Update security profile
        await this.securityService.updatePlayerProfile(
          stake.playerId,
          stake.stake,
          isWin,
          result.payout
        );
      }

      round.results = results;
      round.status = 'finished';

      // Clean up after 5 minutes
      setTimeout(() => {
        this.activeRounds.delete(roundId);
        this.playerStakes.delete(roundId);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Failed to finish round:', error);
    }
  }

  // Generate winning option based on game type and house edge
  private generateWinningOption(config: GameConfig): number {
    const random = Math.random();
    
    // Apply house edge - slightly reduce win probability
    const adjustedRandom = random * (1 + config.houseEdge);
    
    // For fair distribution, each option should have equal probability
    // but we apply house edge by slightly reducing win probability
    const optionProbability = (1 - config.houseEdge) / config.options.length;
    
    // Generate winning option
    let cumulativeProbability = 0;
    for (let i = 0; i < config.options.length; i++) {
      cumulativeProbability += optionProbability;
      if (adjustedRandom <= cumulativeProbability) {
        return i;
      }
    }
    
    // Fallback to last option
    return config.options.length - 1;
  }

  // Get current round
  getCurrentRound(gameId: string): GameRound | undefined {
    for (const [roundId, round] of this.activeRounds) {
      if (round.gameId === gameId && (round.status === 'waiting' || round.status === 'active')) {
        return round;
      }
    }
    return undefined;
  }

  // Get round results
  getRoundResults(roundId: string): GameResult[] | undefined {
    const round = this.activeRounds.get(roundId);
    return round?.results;
  }

  // Get player's stake for a round
  getPlayerStake(roundId: string, playerId: string): PlayerStake | undefined {
    const stakes = this.playerStakes.get(roundId) || [];
    return stakes.find(stake => stake.playerId === playerId);
  }

  // Get game statistics
  async getGameStats(gameId: string): Promise<{
    totalRounds: number;
    totalStakes: number;
    totalWinnings: number;
    winRate: number;
    averageStake: number;
  }> {
    try {
      const history = await this.monetizationService.getGameHistory();
      const gameHistory = history.filter(result => result.gameId === gameId);

      const totalRounds = gameHistory.length;
      const totalStakes = gameHistory.reduce((sum, result) => sum + result.stake, 0);
      const totalWinnings = gameHistory.reduce((sum, result) => sum + result.payout, 0);
      const wins = gameHistory.filter(result => result.result === 'win').length;
      const winRate = totalRounds > 0 ? wins / totalRounds : 0;
      const averageStake = totalRounds > 0 ? totalStakes / totalRounds : 0;

      return {
        totalRounds,
        totalStakes,
        totalWinnings,
        winRate,
        averageStake
      };
    } catch (error) {
      console.error('Failed to get game stats:', error);
      return {
        totalRounds: 0,
        totalStakes: 0,
        totalWinnings: 0,
        winRate: 0,
        averageStake: 0
      };
    }
  }

  // Reset engine (for testing)
  reset(): void {
    this.activeRounds.clear();
    this.playerStakes.clear();
  }
}

export default GameEngine.getInstance();

