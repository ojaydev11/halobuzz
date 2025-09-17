import crypto from 'node:crypto';
import { GlobalGame, IGlobalGame } from '@/models/GlobalGame';
import { GameRound, IGameRound } from '@/models/GameRound';
import { Play, IPlay } from '@/models/Play';
import { Transaction } from '@/models/Transaction';
import { logger } from '@/config/logger';

const ROUND_LOCK_AHEAD_SEC = parseInt(process.env.ROUND_LOCK_AHEAD_SEC || '5', 10);
const DEFAULT_TARGET_PAYOUT = parseFloat(process.env.TARGET_PAYOUT_RATE || '0.60');
const DRIFT_THRESHOLD = parseFloat(process.env.DRIFT_THRESHOLD || '0.03');

export interface Bucket {
  bucketStart: string;
  bucketEnd: string;
  secondsRemaining: number;
  locked: boolean;
}

function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function sha256Hex(messageHex: string): string {
  return crypto.createHash('sha256').update(Buffer.from(messageHex, 'hex')).digest('hex');
}

function rng(seedHex: string, cursor: number): number {
  const input = Buffer.concat([Buffer.from(seedHex, 'hex'), Buffer.alloc(4)]);
  input.writeUInt32BE(cursor >>> 0, input.length - 4);
  const hash = crypto.createHash('sha256').update(input).digest();
  return hash.readUInt32BE(0) / 0xffffffff;
}

export class GamesEngineService {
  async listGames(): Promise<IGlobalGame[]> {
    return GlobalGame.find({}).sort({ id: 1 });
  }

  getCurrentBucket(game: IGlobalGame): Bucket {
    const now = new Date();
    const duration = game.roundDurationSec;
    const epochSec = Math.floor(now.getTime() / 1000);
    const currentBucketStartSec = Math.floor(epochSec / duration) * duration;
    const bucketStart = new Date(currentBucketStartSec * 1000);
    const bucketEnd = new Date((currentBucketStartSec + duration) * 1000);
    const secondsRemaining = Math.max(0, Math.floor((bucketEnd.getTime() - now.getTime()) / 1000));
    const lockTime = new Date(bucketEnd.getTime() - ROUND_LOCK_AHEAD_SEC * 1000);
    const locked = now >= lockTime;
    return {
      bucketStart: bucketStart.toISOString(),
      bucketEnd: bucketEnd.toISOString(),
      secondsRemaining,
      locked
    };
  }

  private computeSeed(gameId: string, bucketStartISO: string): { seed: string; seedHash: string } {
    const secret = process.env.GLOBAL_ROUND_SECRET || '';
    if (!secret) {
      throw new Error('GLOBAL_ROUND_SECRET not configured');
    }
    const msg = `${gameId}:${bucketStartISO}`;
    const seed = hmacSha256Hex(secret, msg);
    const seedHash = sha256Hex(seed);
    return { seed, seedHash };
  }

  async getOrCreateRound(game: IGlobalGame, bucketStartISO: string): Promise<IGameRound> {
    let round = await GameRound.findOne({ gameId: game.id, bucketStart: bucketStartISO });
    if (round) return round;
    const { seed, seedHash } = this.computeSeed(game.id, bucketStartISO);
    round = await GameRound.create({
      gameId: game.id,
      bucketStart: bucketStartISO,
      seedHash,
      status: 'open',
      totals: { bets: 0, payouts: 0 }
    } as Partial<IGameRound>);
    logger.info('game_round_created', { gameId: game.id, bucketStart: bucketStartISO, seedHash });
    return round;
  }

  async lockIfNeeded(game: IGlobalGame, round: IGameRound): Promise<IGameRound> {
    if (round.status !== 'open') return round;
    const { bucketEnd } = this.getCurrentBucket(game);
    const lockTime = new Date(new Date(bucketEnd).getTime() - ROUND_LOCK_AHEAD_SEC * 1000);
    if (new Date() >= lockTime) {
      await GameRound.updateOne({ _id: (round as any)._id }, { $set: { status: 'locked' } });
      round.status = 'locked';
    }
    return round;
  }

  async submitPlay(game: IGlobalGame, userId: string, betAmount: number, choice?: any): Promise<IPlay> {
    if (betAmount < game.minBet || betAmount > game.maxBet) {
      throw new Error('Bet amount out of bounds');
    }
    const bucket = this.getCurrentBucket(game);
    const round = await this.getOrCreateRound(game, bucket.bucketStart);
    if (round.status !== 'open' || bucket.locked) {
      throw new Error('Round is locked');
    }

    // Record bet transaction (authorization style)
    await Transaction.create({
      userId,
      type: 'game_bet',
      amount: betAmount,
      currency: 'coins',
      status: 'completed',
      description: `Bet on ${game.name}`,
      metadata: { gameId: game.id, bucketStart: round.bucketStart },
      fees: 0,
      netAmount: betAmount
    } as any);

    const play = await Play.create({
      userId,
      gameId: game.id,
      bucketStart: round.bucketStart,
      betAmount,
      choice
    } as Partial<IPlay>);

    // Update totals
    await GameRound.updateOne({ _id: (round as any)._id }, { $inc: { 'totals.bets': betAmount } });

    logger.info('play_recorded', { gameId: game.id, bucketStart: round.bucketStart, userId, betAmount });
    return play;
  }

  async resolveRound(game: IGlobalGame, bucketStartISO: string): Promise<IGameRound> {
    const round = await this.getOrCreateRound(game, bucketStartISO);
    if (round.status === 'settled') return round;
    // Compute seed and outcome
    const { seed } = this.computeSeed(game.id, round.bucketStart);
    const outcome = this.deriveOutcome(game.id, seed, game.knobs || {});

    // Fetch plays
    const plays = await Play.find({ gameId: game.id, bucketStart: round.bucketStart });
    let totalPayouts = 0;

    for (const p of plays) {
      const { result, payout } = this.settlePlay(game.id, p, outcome, game);
      p.result = result;
      p.payout = payout;
      await p.save();
      if (payout > 0) {
        totalPayouts += payout;
        await Transaction.create({
          userId: p.userId as any,
          type: 'game_payout',
          amount: payout,
          currency: 'coins',
          status: 'completed',
          description: `Payout for ${game.name}`,
          metadata: { gameId: game.id, bucketStart: round.bucketStart, playId: p._id },
          fees: 0,
          netAmount: payout
        } as any);
      }
    }

    await GameRound.updateOne({ _id: (round as any)._id }, { $set: {
      status: 'settled',
      seedRevealed: seed,
      outcome,
      'totals.payouts': totalPayouts
    } });
    round.status = 'settled';
    (round as any).seedRevealed = seed;
    (round as any).outcome = outcome;
    (round as any).totals.payouts = totalPayouts;

    logger.info('round_settled', { gameId: game.id, bucketStart: round.bucketStart, totals: round.totals });
    await this.applyDriftCorrection(game.id);
    return round;
  }

  deriveOutcome(gameId: string, seed: string, knobs: Record<string, number>): any {
    switch (gameId) {
      case 'coin_flip_global': {
        const v = Math.floor(rng(seed, 1) * 2);
        return { result: v === 0 ? 'heads' : 'tails' };
      }
      case 'dice_high_low_global': {
        const v = Math.floor(rng(seed, 2) * 6) + 1;
        return { result: v <= 3 ? 'low' : 'high', dice: v };
      }
      case 'spin_wheel_global': {
        const defaultWeights = [0.26,0.22,0.16,0.12,0.08,0.06,0.04,0.03,0.015,0.015,0.01,0.01];
        const bias = knobs.weightBias ?? 0;
        const biased = defaultWeights.map((w, i) => Math.max(0.001, w + bias * (i < 3 ? 1 : (i > 8 ? -1 : 0))));
        const sum = biased.reduce((a, b) => a + b, 0);
        const weights = biased.map(w => w / sum);
        const r = rng(seed, 3);
        let cum = 0;
        let index = 0;
        for (let i = 0; i < weights.length; i++) {
          cum += weights[i];
          if (r <= cum) { index = i; break; }
        }
        return { index, weights };
      }
      case 'card_high_low_global': {
        const v = Math.floor(rng(seed, 4) * 13) + 1;
        return { drawn: v, result: v >= 8 ? 'high' : (v <= 6 ? 'low' : 'equal') };
      }
      case 'single_card_draw_global': {
        const v = Math.floor(rng(seed, 5) * 52);
        const rank = (v % 13) + 1;
        const suit = ['S','H','D','C'][Math.floor(v / 13)];
        return { rank, suit };
      }
      case 'quick_draw_global': {
        const fireAtMs = Math.floor(2000 + rng(seed, 6) * 3000); // between 2-5s
        const thresholdMs = Math.max(150, Math.min(400, Math.floor((knobs.thresholdMs ?? 250))));
        return { fireAtMs, thresholdMs };
      }
      case 'target_blast_global': {
        const windowMs = Math.floor(150 + rng(seed, 7) * 150);
        const pattern = Array.from({ length: 4 }, (_, i) => Math.floor(rng(seed, 8 + i) * 1000));
        const passProbability = Math.max(0.3, Math.min(0.9, (knobs.passRate ?? 0.6)));
        const pass = rng(seed, 99) < passProbability;
        return { windowMs, pattern, pass };
      }
      case 'color_rush_global': {
        const length = Math.max(3, Math.min(6, Math.floor((knobs.length ?? 4))));
        const seq = Array.from({ length }, (_, i) => ['R','G','B','Y'][Math.floor(rng(seed, 20 + i) * 4)]);
        const passProbability = Math.max(0.3, Math.min(0.9, 0.6));
        const pass = rng(seed, 101) < passProbability;
        return { sequence: seq, pass };
      }
      default:
        return { seed };
    }
  }

  private settlePlay(gameId: string, play: IPlay, outcome: any, game: IGlobalGame): { result: 'win'|'lose'; payout: number } {
    const bet = play.betAmount;
    let result: 'win'|'lose' = 'lose';
    let payout = 0;
    switch (gameId) {
      case 'coin_flip_global': {
        const win = outcome.result === play.choice;
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * 1.2, game.maxBet * 10) : 0; // net multiple 1.2x
        break;
      }
      case 'dice_high_low_global': {
        const win = outcome.result === play.choice;
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * 1.2, game.maxBet * 10) : 0;
        break;
      }
      case 'spin_wheel_global': {
        const multipliers = [0.9,0.8,1.0,1.2,1.5,2,3,4,6,8,10,15];
        const pick = play.choice?.index ?? 0;
        const win = pick === outcome.index;
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * multipliers[pick]!, game.maxBet * 20) : 0;
        break;
      }
      case 'card_high_low_global': {
        const expected = outcome.result;
        const pick = play.choice;
        if (expected === 'equal') {
          result = 'lose';
          payout = 0;
        } else {
          const win = expected === pick;
          result = win ? 'win' : 'lose';
          payout = win ? Math.min(bet * 1.1, game.maxBet * 10) : 0;
        }
        break;
      }
      case 'single_card_draw_global': {
        // Low 1–5, Mid 6–10, High 11–13, Suit
        const r = outcome.rank as number;
        const s = outcome.suit as string;
        const choice = play.choice;
        let multiplier = 0;
        if (choice?.type === 'range') {
          if (choice.value === 'low' && r >= 1 && r <= 5) multiplier = 1.0;
          if (choice.value === 'mid' && r >= 6 && r <= 10) multiplier = 1.0;
          if (choice.value === 'high' && r >= 11 && r <= 13) multiplier = 1.0;
        } else if (choice?.type === 'suit') {
          if (choice.value === s) multiplier = 3.0;
        }
        const win = multiplier > 0;
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * multiplier, game.maxBet * 20) : 0;
        break;
      }
      case 'quick_draw_global': {
        const reactionMs = play.choice?.reactionMs ?? 9999;
        const win = reactionMs <= outcome.thresholdMs;
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * 0.6, game.maxBet * 10) : 0; // winners share 0.6 EV simplification
        break;
      }
      case 'target_blast_global': {
        const taps: Array<{ t: number }> = play.choice?.taps || [];
        const win = taps.length === outcome.pattern.length && taps.every((tap: any, i: number) => Math.abs(tap.t - outcome.pattern[i]) <= outcome.windowMs);
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * 1.0, game.maxBet * 10) : 0;
        break;
      }
      case 'color_rush_global': {
        const seq: string[] = outcome.sequence;
        const input: string[] = play.choice?.sequence || [];
        const win = input.length === seq.length && input.every((c, i) => c === seq[i]);
        result = win ? 'win' : 'lose';
        payout = win ? Math.min(bet * 1.2, game.maxBet * 10) : 0;
        break;
      }
      default:
        result = 'lose';
        payout = 0;
    }
    return { result, payout };
  }

  async applyDriftCorrection(gameId: string): Promise<void> {
    try {
      const rounds = await GameRound.find({ gameId, status: 'settled' }).sort({ bucketStart: -1 }).limit(500);
      if (rounds.length < 100) return; // wait until enough history
      const totals = rounds.reduce((acc, r) => ({ bets: acc.bets + (r.totals?.bets || 0), payouts: acc.payouts + (r.totals?.payouts || 0) }), { bets: 0, payouts: 0 });
      if (totals.bets <= 0) return;
      const rate = totals.payouts / totals.bets;
      const drift = rate - (DEFAULT_TARGET_PAYOUT);
      const game = await GlobalGame.findOne({ id: gameId });
      if (!game) return;
      const knobs = { ...(game.knobs || {}) };

      if (Math.abs(drift) > DRIFT_THRESHOLD) {
        // Nudge knobs without affecting live round
        switch (gameId) {
          case 'quick_draw_global': {
            const current = knobs.thresholdMs ?? 250;
            knobs.thresholdMs = Math.max(150, Math.min(400, Math.round(current + (drift > 0 ? -15 : 15))));
            break;
          }
          case 'spin_wheel_global': {
            // scale heavier segments subtly
            // For simplicity, record a drift flag; a real impl would adjust weights
            knobs.weightBias = (knobs.weightBias || 0) + (drift > 0 ? -0.02 : 0.02);
            break;
          }
          case 'color_rush_global': {
            const currentLen = knobs.length ?? 4;
            knobs.length = Math.max(3, Math.min(6, currentLen + (drift > 0 ? -1 : 1)));
            break;
          }
          default: {
            // generic small epsilon knob
            knobs.bias = (knobs.bias || 0) + (drift > 0 ? -0.01 : 0.01);
          }
        }
        await GlobalGame.updateOne({ id: gameId }, { $set: { knobs } });
        logger.info('payout_rate_trailing', { gameId, rate, driftCorrected: true, knobs });
      } else {
        logger.info('payout_rate_trailing', { gameId, rate, driftCorrected: false });
      }
    } catch (err) {
      logger.error('applyDriftCorrection failed', { gameId, err });
    }
  }
}

export const gamesEngineService = new GamesEngineService();

