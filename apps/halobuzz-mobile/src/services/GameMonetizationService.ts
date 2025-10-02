import { apiClient } from '@/lib/api';
import { Alert } from 'react-native';

export interface GameResult {
  gameId: string;
  gameName: string;
  stake: number;
  result: 'win' | 'loss' | 'draw';
  multiplier: number;
  payout: number;
  timestamp: string;
  roundId: string;
  playerChoice?: number;
  winningChoice?: number;
}

export interface WalletTransaction {
  id: string;
  type: 'game_win' | 'game_loss' | 'purchase' | 'withdrawal' | 'deposit';
  amount: number;
  balance: number;
  description: string;
  timestamp: string;
  gameId?: string;
}

export interface GameSession {
  sessionId: string;
  gameId: string;
  stake: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  result?: GameResult;
  startTime: string;
  endTime?: string;
}

class GameMonetizationService {
  private static instance: GameMonetizationService;
  private currentBalance: number = 0;
  private transactionHistory: WalletTransaction[] = [];

  static getInstance(): GameMonetizationService {
    if (!GameMonetizationService.instance) {
      GameMonetizationService.instance = new GameMonetizationService();
    }
    return GameMonetizationService.instance;
  }

  // Get current balance
  async getBalance(): Promise<number> {
    try {
      const response = await apiClient.get('/wallet/balance');
      if (response.success && response.data?.balance !== undefined) {
        this.currentBalance = response.data.balance;
        return this.currentBalance;
      }
    } catch (error) {
      console.warn('Failed to fetch balance from API, using cached value');
    }
    return this.currentBalance;
  }

  // Deduct stake amount
  async deductStake(gameId: string, stake: number, gameName: string): Promise<boolean> {
    try {
      if (this.currentBalance < stake) {
        Alert.alert('Insufficient Balance', `You need ${stake} coins to play this game. Current balance: ${this.currentBalance}`);
        return false;
      }

      // Deduct from local balance immediately for better UX
      this.currentBalance -= stake;

      // Record transaction
      const transaction: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'game_loss',
        amount: -stake,
        balance: this.currentBalance,
        description: `Stake for ${gameName}`,
        timestamp: new Date().toISOString(),
        gameId
      };

      this.transactionHistory.unshift(transaction);

      // Sync with backend
      try {
        await apiClient.post('/wallet/deduct', {
          amount: stake,
          gameId,
          description: `Stake for ${gameName}`
        });
      } catch (error) {
        console.warn('Failed to sync stake deduction with backend');
      }

      return true;
    } catch (error) {
      console.error('Failed to deduct stake:', error);
      return false;
    }
  }

  // Add winnings
  async addWinnings(gameId: string, amount: number, gameName: string, multiplier: number): Promise<void> {
    try {
      // Add to local balance immediately
      this.currentBalance += amount;

      // Record transaction
      const transaction: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'game_win',
        amount: amount,
        balance: this.currentBalance,
        description: `Won ${amount} coins from ${gameName} (${multiplier}x)`,
        timestamp: new Date().toISOString(),
        gameId
      };

      this.transactionHistory.unshift(transaction);

      // Sync with backend
      try {
        await apiClient.post('/wallet/add', {
          amount: amount,
          gameId,
          description: `Won ${amount} coins from ${gameName} (${multiplier}x)`
        });
      } catch (error) {
        console.warn('Failed to sync winnings with backend');
      }

      // Show success notification
      Alert.alert(
        '🎉 Congratulations!',
        `You won ${amount} coins from ${gameName}!`,
        [{ text: 'Awesome!' }]
      );
    } catch (error) {
      console.error('Failed to add winnings:', error);
    }
  }

  // Process game result
  async processGameResult(gameSession: GameSession, result: GameResult): Promise<void> {
    try {
      // Update session
      gameSession.status = 'completed';
      gameSession.result = result;
      gameSession.endTime = new Date().toISOString();

      if (result.result === 'win') {
        await this.addWinnings(result.gameId, result.payout, result.gameName, result.multiplier);
      }

      // Save to backend
      try {
        await apiClient.post('/games/result', {
          sessionId: gameSession.sessionId,
          result: result
        });
      } catch (error) {
        console.warn('Failed to save game result to backend');
      }
    } catch (error) {
      console.error('Failed to process game result:', error);
    }
  }

  // Get transaction history
  getTransactionHistory(): WalletTransaction[] {
    return [...this.transactionHistory];
  }

  // Get game history
  async getGameHistory(): Promise<GameResult[]> {
    try {
      const response = await apiClient.get('/games/history');
      if (response.success && response.data?.history) {
        return response.data.history;
      }
    } catch (error) {
      console.warn('Failed to fetch game history from API');
    }
    return [];
  }

  // Initialize with user data
  async initialize(userId: string): Promise<void> {
    try {
      const [balanceResponse, historyResponse] = await Promise.all([
        this.getBalance(),
        this.getGameHistory()
      ]);

      // Initialize with fallback data if API fails
      if (this.currentBalance === 0) {
        this.currentBalance = 1000; // Starting balance
      }
    } catch (error) {
      console.error('Failed to initialize monetization service:', error);
      this.currentBalance = 1000; // Fallback balance
    }
  }

  // Validate stake amount
  validateStake(stake: number, minStake: number, maxStake: number): { valid: boolean; message?: string } {
    if (stake < minStake) {
      return { valid: false, message: `Minimum stake is ${minStake} coins` };
    }
    if (stake > maxStake) {
      return { valid: false, message: `Maximum stake is ${maxStake} coins` };
    }
    if (stake > this.currentBalance) {
      return { valid: false, message: `Insufficient balance. You have ${this.currentBalance} coins` };
    }
    return { valid: true };
  }

  // Get balance for display
  getCurrentBalance(): number {
    return this.currentBalance;
  }

  // Reset service (for testing)
  reset(): void {
    this.currentBalance = 1000;
    this.transactionHistory = [];
  }
}

export default GameMonetizationService.getInstance();


