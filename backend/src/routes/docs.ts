import express from 'express';

const router: express.Router = express.Router();

router.get('/provable-fairness', (_req, res) => {
  res.type('text/markdown').send([
    '# Provable Fairness',
    '',
    'For each global game round, the server commits to a secret seed using HMAC:',
    '',
    'seed = HMAC_SHA256(GLOBAL_ROUND_SECRET, `${gameId}:${bucketStartISO}`)',
    'seedHash = SHA256(seed)',
    '',
    'At round start we publish seedHash. After settlement we reveal seed.',
    '',
    'Verification steps:',
    '1. Recompute `seed` using the same `gameId` and `bucketStartISO` with your known secret (not shared publicly).',
    '2. Compute `seedHash = SHA256(seed)` and compare with the published hash.',
    '3. Use the `seed` with the RNG function rand(seed, cursor) to reproduce the outcome.',
    '',
    'RNG:',
    'rand(seed, cursor) = SHA256(seed || uint32be(cursor))[0..3] / 0xffffffff',
    '',
    'Outcomes are defined per game as documented in the API responses.',
  ].join('\n'));
});

export default router;

