import express from 'express';
import { body, validationResult } from 'express-validator';
import { GlobalGame } from '@/models/GlobalGame';
import { GameRound } from '@/models/GameRound';
import { gamesEngineService } from '@/services/GamesEngineService';

const router: express.Router = express.Router();

// GET / -> list games + current bucket
router.get('/', async (req, res) => {
  try {
    const games = await gamesEngineService.listGames();
    const data = games.map(g => {
      const b = gamesEngineService.getCurrentBucket(g);
      return {
        id: g.id,
        name: g.name,
        roundDurationSec: g.roundDurationSec,
        timeLeftSec: b.secondsRemaining,
        bucketStart: b.bucketStart,
        minBet: g.minBet,
        maxBet: g.maxBet
      };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list games' });
  }
});

// GET /:id/round -> current round public data
router.get('/:id/round', async (req, res) => {
  try {
    const game = await GlobalGame.findOne({ id: req.params.id });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const bucket = gamesEngineService.getCurrentBucket(game);
    const round = await gamesEngineService.getOrCreateRound(game, bucket.bucketStart);
    const response: any = {
      bucketStart: round.bucketStart,
      status: round.status,
      seedHash: round.seedHash,
      timeLeftSec: bucket.secondsRemaining,
      knobsPublic: game.knobs || {}
    };
    if (round.status === 'settled' && round.seedRevealed) {
      response.seed = round.seedRevealed;
      response.outcome = round.outcome;
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get round' });
  }
});

// POST /:id/play
router.post('/:id/play',
  body('userId').isString(),
  body('betAmount').isNumeric(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { id } = req.params;
      const { userId, betAmount, choice } = req.body;
      const game = await GlobalGame.findOne({ id });
      if (!game) return res.status(404).json({ error: 'Game not found' });
      const play = await gamesEngineService.submitPlay(game, userId, betAmount, choice);
      res.json({ success: true, playId: (play as any)._id });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to submit play' });
    }
});

// GET /:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
    const rounds = await GameRound.find({ gameId: req.params.id, status: 'settled' })
      .sort({ bucketStart: -1 })
      .limit(limit)
      .select('bucketStart seedHash seedRevealed outcome totals');
    res.json(rounds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// GET /verify?gameId=...&bucketStart=...
router.get('/verify', async (req, res) => {
  try {
    const { gameId, bucketStart } = req.query as { gameId: string; bucketStart: string };
    if (!gameId || !bucketStart) return res.status(400).json({ error: 'Missing params' });
    const game = await GlobalGame.findOne({ id: gameId });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    const round = await GameRound.findOne({ gameId, bucketStart });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    const how = {
      seedDerivation: "seed = HMAC_SHA256(GLOBAL_ROUND_SECRET, `${gameId}:${bucketStart}`)",
      seedHash: 'SHA256(seed) hex',
      rng: 'rand(seed, cursor) = floor(SHA256(seed || uint32be(cursor))[0..3] / 0xffffffff * N)'
    };
    res.json({ how, round });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify' });
  }
});

export default router;

