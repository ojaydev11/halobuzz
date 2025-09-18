import crypto from 'crypto';
import { logger } from '@/config/logger';

export interface GameResult {
  winnerId?: string;
  winnerOption?: number;
  outcome: any;
  multiplier: number;
}

/**
 * Game Implementations
 * Each game has its own logic but uses the global round seed for deterministic outcomes
 */
export class GameImplementations {
  private static instance: GameImplementations;

  static getInstance(): GameImplementations {
    if (!GameImplementations.instance) {
      GameImplementations.instance = new GameImplementations();
    }
    return GameImplementations.instance;
  }

  /**
   * 1. COIN FLIP ARENA - Simple heads or tails
   */
  coinFlip(seedHash: string, userChoice: number): GameResult {
    const outcome = this.hashToInt(seedHash, 2); // 0 = heads, 1 = tails
    const won = userChoice === outcome;
    return {
      winnerOption: outcome,
      outcome: outcome === 0 ? 'heads' : 'tails',
      multiplier: won ? 1.8 : 0 // 80% return on win (60% overall with 50% win chance)
    };
  }

  /**
   * 2. LUCKY DICE - Roll dice, highest number wins
   */
  luckyDice(seedHash: string, players: number): GameResult {
    const rolls = [];
    for (let i = 0; i < players; i++) {
      const playerSeed = `${seedHash}-${i}`;
      rolls.push({
        player: i,
        roll: this.hashToInt(playerSeed, 6) + 1 // 1-6
      });
    }
    rolls.sort((a, b) => b.roll - a.roll);
    return {
      winnerOption: rolls[0].player,
      outcome: rolls,
      multiplier: 1.8 * players // Winner takes most of the pool
    };
  }

  /**
   * 3. WHEEL OF FORTUNE - Spin the wheel with multiple segments
   */
  wheelOfFortune(seedHash: string): GameResult {
    const segments = [
      { value: 0, label: 'Try Again', multiplier: 0 },
      { value: 1, label: '2x', multiplier: 2 },
      { value: 2, label: '1.5x', multiplier: 1.5 },
      { value: 3, label: '3x', multiplier: 3 },
      { value: 4, label: '0.5x', multiplier: 0.5 },
      { value: 5, label: '5x', multiplier: 5 },
      { value: 6, label: '1x', multiplier: 1 },
      { value: 7, label: 'Jackpot 10x', multiplier: 10 }
    ];
    
    // Weighted selection (jackpot is rare)
    const weights = [20, 15, 20, 10, 15, 8, 10, 2];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const random = this.hashToInt(seedHash, totalWeight);
    
    let sum = 0;
    let selected = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random < sum) {
        selected = i;
        break;
      }
    }
    
    return {
      winnerOption: selected,
      outcome: segments[selected],
      multiplier: segments[selected].multiplier
    };
  }

  /**
   * 4. NUMBER PREDICTOR - Guess if next number is higher or lower
   */
  numberPredictor(seedHash: string, currentNumber: number, userGuess: 'higher' | 'lower'): GameResult {
    const nextNumber = this.hashToInt(seedHash, 100) + 1; // 1-100
    const isHigher = nextNumber > currentNumber;
    const won = (userGuess === 'higher' && isHigher) || (userGuess === 'lower' && !isHigher);
    
    return {
      outcome: { current: currentNumber, next: nextNumber, correct: isHigher ? 'higher' : 'lower' },
      multiplier: won ? 1.85 : 0 // Slightly less than 2x to maintain house edge
    };
  }

  /**
   * 5. COLOR RUSH - Pick a color, multiple colors spin
   */
  colorRush(seedHash: string, userColor: number): GameResult {
    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    const winningColor = this.hashToInt(seedHash, colors.length);
    const won = userColor === winningColor;
    
    return {
      winnerOption: winningColor,
      outcome: { winning: colors[winningColor], selected: colors[userColor] },
      multiplier: won ? 5 : 0 // 6 colors, pays 5x for 60% RTP over time
    };
  }

  /**
   * 6. ROCK PAPER SCISSORS ROYALE - Classic game with multiplayer
   */
  rockPaperScissors(seedHash: string, userChoice: number): GameResult {
    const choices = ['rock', 'paper', 'scissors'];
    const houseChoice = this.hashToInt(seedHash, 3);
    
    // 0 = rock, 1 = paper, 2 = scissors
    let result = 'lose';
    let multiplier = 0;
    
    if (userChoice === houseChoice) {
      result = 'draw';
      multiplier = 1; // Return stake
    } else if (
      (userChoice === 0 && houseChoice === 2) || // rock beats scissors
      (userChoice === 1 && houseChoice === 0) || // paper beats rock
      (userChoice === 2 && houseChoice === 1)    // scissors beats paper
    ) {
      result = 'win';
      multiplier = 1.8; // Win pays 1.8x
    }
    
    return {
      outcome: { 
        player: choices[userChoice], 
        house: choices[houseChoice], 
        result 
      },
      multiplier
    };
  }

  /**
   * 7. TREASURE HUNT - Pick boxes to find treasure
   */
  treasureHunt(seedHash: string, boxesPicked: number[]): GameResult {
    const totalBoxes = 9;
    const treasureBoxes = 3;
    
    // Generate treasure positions
    const treasures = new Set<number>();
    for (let i = 0; i < treasureBoxes; i++) {
      const pos = this.hashToInt(`${seedHash}-treasure-${i}`, totalBoxes);
      treasures.add(pos);
    }
    
    // Check how many treasures found
    const found = boxesPicked.filter(box => treasures.has(box)).length;
    const multipliers = [0, 1.5, 3, 6]; // 0, 1, 2, or 3 treasures found
    
    return {
      outcome: { 
        treasurePositions: Array.from(treasures),
        picked: boxesPicked,
        found 
      },
      multiplier: multipliers[found] || 0
    };
  }

  /**
   * 8. SPEED CLICKER - Click as fast as possible in time window
   */
  speedClicker(seedHash: string, clickCount: number, timeWindow: number = 10): GameResult {
    // Generate target threshold based on seed (fair but challenging)
    const baseTarget = 50; // Base clicks in 10 seconds
    const variance = this.hashToInt(seedHash, 20) - 10; // +/- 10 clicks variance
    const target = baseTarget + variance;
    
    const clicksPerSecond = clickCount / timeWindow;
    const targetPerSecond = target / 10;
    
    let multiplier = 0;
    if (clicksPerSecond >= targetPerSecond * 1.5) {
      multiplier = 3; // Exceptional
    } else if (clicksPerSecond >= targetPerSecond * 1.2) {
      multiplier = 2; // Great
    } else if (clicksPerSecond >= targetPerSecond) {
      multiplier = 1.5; // Good
    } else if (clicksPerSecond >= targetPerSecond * 0.8) {
      multiplier = 0.8; // Partial return
    }
    
    return {
      outcome: { 
        clicks: clickCount,
        target,
        clicksPerSecond: clicksPerSecond.toFixed(1),
        performance: multiplier >= 2 ? 'exceptional' : multiplier >= 1.5 ? 'great' : multiplier >= 1 ? 'good' : 'try again'
      },
      multiplier
    };
  }

  /**
   * Helper to convert hash to integer in range [0, max)
   */
  private hashToInt(hash: string, max: number): number {
    const hex = crypto.createHash('sha256').update(hash).digest('hex');
    const slice = hex.slice(0, 8);
    const intVal = parseInt(slice, 16);
    return intVal % max;
  }
}

export const gameImplementations = GameImplementations.getInstance();