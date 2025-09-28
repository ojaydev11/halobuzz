import { EventEmitter } from 'events';
import axios from 'axios';
import { logger } from '@/config/logger';
import { advancedGamesService, GameSession, AdvancedGame, Player } from './AdvancedGamesService';
import { CoinTransaction } from '@/models/CoinTransaction';
import { CoinWallet } from '@/models/CoinWallet';

export interface ExternalGameProvider {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  isActive: boolean;
  supportedGameTypes: string[];
  commissionRate: number; // Platform commission %
  payoutDelay: number; // Payout delay in hours
  trustLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface CrossPlatformGame {
  providerId: string;
  gameId: string;
  haloBuzzGameId: string;
  name: string;
  category: string;
  minStake: number;
  maxStake: number;
  rtp: number; // Return to Player %
  isActive: boolean;
  integrationMode: 'seamless' | 'redirect' | 'iframe';
  hasCoinSupport: boolean;
  spectatorSupport: boolean;
}

export interface GameLaunchRequest {
  userId: string;
  gameId: string;
  sessionId?: string;
  stake: number;
  currency: 'HBC'; // HaloBuzz Coins
  launchMode: 'seamless' | 'redirect' | 'iframe';
  spectatorMode: boolean;
  metadata?: {
    referrer?: string;
    campaign?: string;
    ogLevel?: number;
    userTier?: string;
  };
}

export interface GameResult {
  sessionId: string;
  userId: string;
  gameId: string;
  providerId: string;
  stake: number;
  payout: number;
  result: 'win' | 'loss' | 'draw';
  gameData: any;
  duration: number;
  timestamp: Date;
}

/**
 * Global Games API Service - Integrates external game providers with HaloBuzz
 * Supports seamless coin-based gaming across multiple platforms
 */
export class GlobalGamesAPIService extends EventEmitter {
  private static instance: GlobalGamesAPIService;
  private providers: Map<string, ExternalGameProvider> = new Map();
  private activeGames: Map<string, CrossPlatformGame> = new Map();
  private activeSessions: Map<string, any> = new Map();

  private constructor() {
    super();
    this.initializeProviders();
    this.startMonitoring();
  }

  static getInstance(): GlobalGamesAPIService {
    if (!GlobalGamesAPIService.instance) {
      GlobalGamesAPIService.instance = new GlobalGamesAPIService();
    }
    return GlobalGamesAPIService.instance;
  }

  /**
   * Initialize external game providers
   */
  private initializeProviders(): void {
    const providers: ExternalGameProvider[] = [
      {
        id: 'pragmatic-play',
        name: 'Pragmatic Play',
        endpoint: 'https://api.pragmaticplay.net/v1',
        apiKey: process.env.PRAGMATIC_API_KEY || '',
        isActive: true,
        supportedGameTypes: ['slots', 'table', 'live'],
        commissionRate: 0.15, // 15%
        payoutDelay: 1, // 1 hour
        trustLevel: 'platinum'
      },
      {
        id: 'evolution',
        name: 'Evolution Gaming',
        endpoint: 'https://api.evolutiongaming.com/v2',
        apiKey: process.env.EVOLUTION_API_KEY || '',
        isActive: true,
        supportedGameTypes: ['live', 'table'],
        commissionRate: 0.12, // 12%
        payoutDelay: 2, // 2 hours
        trustLevel: 'platinum'
      },
      {
        id: 'netent',
        name: 'NetEnt',
        endpoint: 'https://api.netent.com/gaming/v1',
        apiKey: process.env.NETENT_API_KEY || '',
        isActive: true,
        supportedGameTypes: ['slots', 'table'],
        commissionRate: 0.18, // 18%
        payoutDelay: 1, // 1 hour
        trustLevel: 'gold'
      },
      {
        id: 'microgaming',
        name: 'Microgaming',
        endpoint: 'https://api.microgaming.com/v3',
        apiKey: process.env.MICROGAMING_API_KEY || '',
        isActive: true,
        supportedGameTypes: ['slots', 'progressive'],
        commissionRate: 0.16, // 16%
        payoutDelay: 3, // 3 hours
        trustLevel: 'gold'
      },
      {
        id: 'halobuzz-native',
        name: 'HaloBuzz Native',
        endpoint: 'internal://halobuzz/games',
        apiKey: 'internal',
        isActive: true,
        supportedGameTypes: ['battle-royale', 'tournament', 'ai-challenge', 'skill', 'strategy'],
        commissionRate: 0.05, // 5% (internal)
        payoutDelay: 0, // Instant
        trustLevel: 'platinum'
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });

    logger.info(`Initialized ${providers.length} game providers`);
  }

  /**
   * Get all available cross-platform games
   */
  async getAvailableGames(userId?: string): Promise<CrossPlatformGame[]> {
    const games: CrossPlatformGame[] = [];

    // Add HaloBuzz native games
    const nativeGames = advancedGamesService.getAvailableGames();
    nativeGames.forEach(game => {
      games.push({
        providerId: 'halobuzz-native',
        gameId: game.code,
        haloBuzzGameId: game.id,
        name: game.name,
        category: game.type,
        minStake: 50, // Default min stake in coins
        maxStake: 10000, // Default max stake in coins
        rtp: 95.0, // 95% RTP for native games
        isActive: true,
        integrationMode: 'seamless',
        hasCoinSupport: true,
        spectatorSupport: true
      });
    });

    // Add external provider games (mock data for demo)
    const externalGames: CrossPlatformGame[] = [
      {
        providerId: 'pragmatic-play',
        gameId: 'gates-of-olympus',
        haloBuzzGameId: 'ext-gates-olympus',
        name: 'Gates of Olympus',
        category: 'slots',
        minStake: 25,
        maxStake: 5000,
        rtp: 96.5,
        isActive: true,
        integrationMode: 'seamless',
        hasCoinSupport: true,
        spectatorSupport: false
      },
      {
        providerId: 'evolution',
        gameId: 'lightning-roulette',
        haloBuzzGameId: 'ext-lightning-roulette',
        name: 'Lightning Roulette',
        category: 'live',
        minStake: 100,
        maxStake: 25000,
        rtp: 97.3,
        isActive: true,
        integrationMode: 'iframe',
        hasCoinSupport: true,
        spectatorSupport: true
      },
      {
        providerId: 'netent',
        gameId: 'starburst',
        haloBuzzGameId: 'ext-starburst',
        name: 'Starburst',
        category: 'slots',
        minStake: 20,
        maxStake: 2000,
        rtp: 96.1,
        isActive: true,
        integrationMode: 'seamless',
        hasCoinSupport: true,
        spectatorSupport: false
      }
    ];

    games.push(...externalGames);

    // Filter based on user eligibility
    if (userId) {
      // TODO: Add user-specific filtering (KYC, region, etc.)
    }

    return games.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Launch a cross-platform game
   */
  async launchGame(request: GameLaunchRequest): Promise<any> {
    const { userId, gameId, stake, launchMode, spectatorMode, metadata } = request;

    // Validate user balance
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet || !wallet.canSpend(stake)) {
      throw new Error('Insufficient balance');
    }

    // Find game configuration
    const game = await this.findGame(gameId);
    if (!game || !game.isActive) {
      throw new Error('Game not available');
    }

    // Validate stake limits
    if (stake < game.minStake || stake > game.maxStake) {
      throw new Error(`Stake must be between ${game.minStake} and ${game.maxStake} coins`);
    }

    const provider = this.providers.get(game.providerId);
    if (!provider || !provider.isActive) {
      throw new Error('Game provider not available');
    }

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Lock user balance
    await this.lockUserBalance(userId, stake, sessionId);

    try {
      let launchResponse;

      if (provider.id === 'halobuzz-native') {
        // Handle native HaloBuzz games
        launchResponse = await this.launchNativeGame(request, sessionId);
      } else {
        // Handle external provider games
        launchResponse = await this.launchExternalGame(request, sessionId, provider, game);
      }

      // Store active session
      this.activeSessions.set(sessionId, {
        userId,
        gameId,
        providerId: game.providerId,
        stake,
        startTime: new Date(),
        status: 'active',
        spectatorMode,
        metadata
      });

      this.emit('gameSessionStarted', {
        sessionId,
        userId,
        gameId,
        stake,
        provider: provider.name
      });

      return {
        sessionId,
        launchUrl: launchResponse.launchUrl || null,
        iframe: launchResponse.iframe || null,
        gameData: launchResponse.gameData || null,
        spectatorUrl: spectatorMode ? launchResponse.spectatorUrl : null
      };

    } catch (error) {
      // Unlock balance on failure
      await this.unlockUserBalance(userId, stake, sessionId);
      throw error;
    }
  }

  /**
   * Handle game completion and process results
   */
  async processGameResult(result: GameResult): Promise<void> {
    const { sessionId, userId, gameId, providerId, stake, payout, gameData } = result;

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session');
    }

    try {
      // Update user wallet
      const wallet = await CoinWallet.findOne({ userId });
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Calculate platform commission
      const provider = this.providers.get(providerId);
      const commission = provider ? payout * provider.commissionRate : 0;
      const netPayout = Math.max(0, payout - commission);

      // Unlock original stake
      await this.unlockUserBalance(userId, stake, sessionId);

      // Process win/loss
      if (result.result === 'win' && netPayout > 0) {
        await this.creditWallet(userId, netPayout, {
          type: 'game_win',
          gameId,
          sessionId,
          providerId
        });
      }

      // Record transaction
      await this.recordGameTransaction(result, netPayout, commission);

      // Update session status
      session.status = 'completed';
      session.endTime = new Date();
      session.result = result.result;
      session.payout = netPayout;

      this.emit('gameSessionCompleted', {
        sessionId,
        userId,
        gameId,
        result: result.result,
        stake,
        payout: netPayout,
        commission,
        duration: result.duration
      });

      // Clean up session after delay
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 300000); // 5 minutes

    } catch (error) {
      logger.error('Error processing game result:', error);
      session.status = 'error';
      throw error;
    }
  }

  /**
   * Get game statistics and analytics
   */
  async getGameAnalytics(providerId?: string, gameId?: string, days = 30): Promise<any> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const matchStage: any = {
      createdAt: { $gte: since },
      type: { $in: ['game_stake', 'game_win', 'game_loss'] },
      status: 'completed'
    };

    if (providerId) {
      matchStage['context.providerId'] = providerId;
    }

    if (gameId) {
      matchStage['context.gameId'] = gameId;
    }

    const analytics = await CoinTransaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            providerId: '$context.providerId',
            gameId: '$context.gameId'
          },
          totalSessions: { $sum: 1 },
          totalStake: { $sum: '$amount' },
          totalPayout: {
            $sum: {
              $cond: [{ $eq: ['$type', 'game_win'] }, '$amount', 0]
            }
          },
          avgStake: { $avg: '$amount' },
          uniqueUsers: { $addToSet: '$userId' },
          winSessions: {
            $sum: {
              $cond: [{ $eq: ['$type', 'game_win'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
          winRate: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              { $divide: ['$winSessions', '$totalSessions'] },
              0
            ]
          },
          rtp: {
            $cond: [
              { $gt: ['$totalStake', 0] },
              { $divide: ['$totalPayout', '$totalStake'] },
              0
            ]
          }
        }
      },
      { $sort: { totalStake: -1 } }
    ]);

    return analytics;
  }

  /**
   * Launch native HaloBuzz game
   */
  private async launchNativeGame(request: GameLaunchRequest, sessionId: string): Promise<any> {
    const { userId, gameId, stake } = request;

    // Create player object
    const player = {
      id: userId,
      username: `user_${userId}`,
      level: 1,
      avatar: '',
      stake
    };

    // Join the advanced game session
    const gameSession = await advancedGamesService.joinGame(gameId, player);

    return {
      gameData: {
        sessionId: gameSession.sessionId,
        gameId,
        status: gameSession.status,
        players: gameSession.players.size,
        timeRemaining: gameSession.timeRemaining
      }
    };
  }

  /**
   * Launch external provider game
   */
  private async launchExternalGame(
    request: GameLaunchRequest,
    sessionId: string,
    provider: ExternalGameProvider,
    game: CrossPlatformGame
  ): Promise<any> {
    const { userId, stake, launchMode } = request;

    // Mock external API call (replace with actual provider integration)
    const apiEndpoint = `${provider.endpoint}/launch`;

    try {
      const response = await axios.post(apiEndpoint, {
        game_id: game.gameId,
        user_id: userId,
        session_id: sessionId,
        currency: 'HBC',
        amount: stake,
        launch_mode: launchMode,
        return_url: `${process.env.API_BASE_URL}/games/external/return/${sessionId}`,
        webhook_url: `${process.env.API_BASE_URL}/games/external/webhook`
      }, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error(`Failed to launch external game ${game.gameId}:`, error);
      // Return mock response for demo
      return {
        launchUrl: `https://demo.provider.com/game/${game.gameId}?session=${sessionId}`,
        iframe: launchMode === 'iframe'
      };
    }
  }

  /**
   * Lock user balance for game session
   */
  private async lockUserBalance(userId: string, amount: number, sessionId: string): Promise<void> {
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.availableBalance < amount) {
      throw new Error('Insufficient balance');
    }

    wallet.availableBalance -= amount;
    wallet.lockedBalance += amount;
    wallet.isLocked = true;
    wallet.lockedBy = sessionId;

    await wallet.save();

    // Record stake transaction
    await CoinTransaction.create({
      userId,
      type: 'game_stake',
      amount,
      balanceBefore: wallet.availableBalance + amount,
      balanceAfter: wallet.availableBalance,
      source: 'game',
      destination: 'game_pot',
      context: {
        gameSessionId: sessionId
      },
      status: 'completed'
    });
  }

  /**
   * Unlock user balance
   */
  private async unlockUserBalance(userId: string, amount: number, sessionId: string): Promise<void> {
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet) {
      return;
    }

    wallet.availableBalance += amount;
    wallet.lockedBalance = Math.max(0, wallet.lockedBalance - amount);

    if (wallet.lockedBy === sessionId) {
      wallet.isLocked = false;
      wallet.lockedBy = undefined;
    }

    await wallet.save();
  }

  /**
   * Credit wallet with winnings
   */
  private async creditWallet(userId: string, amount: number, context: any): Promise<void> {
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    wallet.availableBalance += amount;
    wallet.totalBalance += amount;
    wallet.balanceBySource.earned += amount;
    wallet.stats.totalEarned += amount;

    if (amount > wallet.stats.biggestWin) {
      wallet.stats.biggestWin = amount;
    }

    await wallet.save();

    // Record win transaction
    await CoinTransaction.create({
      userId,
      type: 'game_win',
      amount,
      balanceBefore: wallet.availableBalance - amount,
      balanceAfter: wallet.availableBalance,
      source: 'game',
      destination: 'wallet',
      context,
      status: 'completed'
    });
  }

  /**
   * Record game transaction for analytics
   */
  private async recordGameTransaction(result: GameResult, netPayout: number, commission: number): Promise<void> {
    await CoinTransaction.create({
      userId: result.userId,
      type: result.result === 'win' ? 'game_win' : 'game_loss',
      amount: result.result === 'win' ? netPayout : result.stake,
      balanceBefore: 0, // Will be updated by wallet operations
      balanceAfter: 0, // Will be updated by wallet operations
      source: 'game',
      destination: result.result === 'win' ? 'wallet' : 'system_fee',
      context: {
        gameId: result.gameId,
        gameSessionId: result.sessionId,
        providerId: result.providerId,
        originalPayout: result.payout,
        commission,
        gameData: JSON.stringify(result.gameData)
      },
      status: 'completed'
    });
  }

  /**
   * Find game by ID across all providers
   */
  private async findGame(gameId: string): Promise<CrossPlatformGame | null> {
    const games = await this.getAvailableGames();
    return games.find(game =>
      game.gameId === gameId ||
      game.haloBuzzGameId === gameId
    ) || null;
  }

  /**
   * Start monitoring and health checks
   */
  private startMonitoring(): void {
    // Monitor provider health every 5 minutes
    setInterval(async () => {
      for (const provider of this.providers.values()) {
        if (provider.id === 'halobuzz-native') continue;

        try {
          // Ping provider health endpoint
          await axios.get(`${provider.endpoint}/health`, {
            headers: { 'Authorization': `Bearer ${provider.apiKey}` },
            timeout: 5000
          });
        } catch (error) {
          logger.warn(`Provider ${provider.name} health check failed:`, error);
          // Could implement auto-disable logic here
        }
      }
    }, 300000); // 5 minutes

    // Clean up expired sessions every hour
    setInterval(() => {
      const now = Date.now();
      const expireTime = 24 * 60 * 60 * 1000; // 24 hours

      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.startTime.getTime() > expireTime) {
          this.activeSessions.delete(sessionId);
          logger.info(`Cleaned up expired session: ${sessionId}`);
        }
      }
    }, 3600000); // 1 hour
  }
}

export const globalGamesAPI = GlobalGamesAPIService.getInstance();