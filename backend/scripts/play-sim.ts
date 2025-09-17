import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import { GlobalGame } from '../src/models/GlobalGame';
import { gamesEngineService } from '../src/services/GamesEngineService';

type Strategy = 'uniform'|'weighted';

async function simulatePlays(gameId: string, rounds: number, strategy: Strategy) {
  const game = await GlobalGame.findOne({ id: gameId });
  if (!game) throw new Error('Game not found');
  let totalBets = 0;
  let totalPayouts = 0;
  for (let i = 0; i < rounds; i++) {
    const bucket = gamesEngineService.getCurrentBucket(game);
    const round = await gamesEngineService.getOrCreateRound(game, bucket.bucketStart);
    // Simulate 20 random players per round
    const plays = Array.from({ length: 20 }, (_, idx) => ({
      userId: `sim_${idx}`,
      betAmount: Math.min(game.maxBet, Math.max(game.minBet, Math.floor(Math.random() * (game.maxBet - game.minBet + 1)) + game.minBet)),
      choice: choiceFor(gameId)
    }));
    for (const p of plays) {
      try { await gamesEngineService.submitPlay(game, p.userId, p.betAmount, p.choice); } catch {}
      totalBets += p.betAmount;
    }
    await gamesEngineService.resolveRound(game, round.bucketStart);
    const latest = await (await import('../src/models/GameRound')).GameRound.findOne({ gameId, bucketStart: round.bucketStart });
    totalPayouts += latest?.totals?.payouts || 0;
  }
  const payoutRate = totalBets > 0 ? totalPayouts / totalBets : 0;
  return { payoutRate, totalBets, totalPayouts };
}

function choiceFor(gameId: string): any {
  switch (gameId) {
    case 'coin_flip_global': return Math.random() < 0.5 ? 'heads' : 'tails';
    case 'dice_high_low_global': return Math.random() < 0.5 ? 'low' : 'high';
    case 'spin_wheel_global': return { index: Math.floor(Math.random() * 12) };
    case 'card_high_low_global': return Math.random() < 0.5 ? 'low' : 'high';
    case 'single_card_draw_global': return Math.random() < 0.5 ? { type: 'range', value: 'low' } : { type: 'suit', value: 'H' };
    case 'quick_draw_global': return { reactionMs: 250 + Math.floor((Math.random() - 0.5) * 50) };
    case 'target_blast_global': return { taps: [0,1,2,3].map(i => ({ t: 200 + i*200 })) };
    case 'color_rush_global': return { sequence: ['R','G','B','Y'] };
    default: return undefined;
  }
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz';
  await mongoose.connect(mongoUri);
  const gameIds = [
    'coin_flip_global','dice_high_low_global','spin_wheel_global','card_high_low_global',
    'single_card_draw_global','quick_draw_global','target_blast_global','color_rush_global'
  ];
  for (const id of gameIds) {
    const r = await simulatePlays(id, 200, 'uniform');
    console.log(`${id}: payoutRate=${r.payoutRate.toFixed(3)} bets=${r.totalBets} payouts=${r.totalPayouts}`);
  }
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

export { simulatePlays };

