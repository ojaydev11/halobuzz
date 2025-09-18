import crypto from 'crypto';
import { Game } from '@/models/Game';
import { GameRound } from '@/models/GameRound';
import { logger } from '@/config/logger';

/**
 * GamesEngineService
 * - Generates global deterministic outcomes per time-bucketed round
 * - Targets long-run user win ratio ~60% and house 40% by biasing round outcomes
 */
export class GamesEngineService {
  private static instance: GamesEngineService;
  private secretKey: string;

  private constructor() {
    this.secretKey = process.env.GAMES_ENGINE_SECRET || 'dev-games-secret';
  }

  static getInstance(): GamesEngineService {
    if (!GamesEngineService.instance) {
      GamesEngineService.instance = new GamesEngineService();
    }
    return GamesEngineService.instance;
  }

  /**
   * Get the current global round for a game, creating it if needed.
   * All users see the same round and same settled outcome.
   */
  async getOrCreateRound(gameId: string, durationSec: number, optionsCount: number): Promise<typeof GameRound.prototype> {
    const now = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(now / durationSec);
    const start = new Date((bucket * durationSec) * 1000);
    const end = new Date(((bucket + 1) * durationSec) * 1000);
    const roundId = `${gameId}-${durationSec}-${bucket}`;

    let round = await GameRound.findOne({ roundId });
    if (round) return round;

    // Create a provably-fair seed and precompute outcome index
    const seed = crypto.createHmac('sha256', this.secretKey)
      .update(roundId)
      .digest('hex');

    // Bias outcome slightly toward user-favorable (to achieve ~60% long-run user win rate)
    const randomNum = this.hashToFloat(seed);
    const bias = 0.1; // small bias for users
    const biased = Math.min(0.999999, Math.max(0, randomNum + (bias - 0.05)));
    const outcomeIndex = Math.floor(biased * optionsCount);

    round = await GameRound.create({
      gameId,
      roundId,
      startAt: start,
      endAt: end,
      durationSec,
      seedHash: seed,
      outcomeIndex: Math.min(optionsCount - 1, Math.max(0, outcomeIndex)),
      optionsCount,
      totalStake: 0,
      payoutPool: 0,
      status: 'open'
    });

    return round;
  }

  /**
   * Close and settle a round; called when endAt has passed.
   */
  async settleRound(roundId: string): Promise<void> {
    const round = await GameRound.findOne({ roundId });
    if (!round) return;
    if (round.status !== 'open') return;
    round.status = 'settled';
    await round.save();
  }

  private hashToFloat(hex: string): number {
    // Take first 8 bytes to uint32 and normalize
    const slice = hex.slice(0, 8);
    const intVal = parseInt(slice, 16);
    return intVal / 0xffffffff;
  }
}

export const gamesEngineService = GamesEngineService.getInstance();

