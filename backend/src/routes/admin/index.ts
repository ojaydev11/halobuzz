import { Router } from 'express';
import analyticsRouter from './analytics';
import usersRouter from './users';
import economyRouter from './economy';
import liveRouter from './live';
import gamesRouter from './games';
import moderationRouter from './moderation';

const router = Router();

// Mount all admin routes
router.use('/analytics', analyticsRouter);
router.use('/users', usersRouter);
router.use('/economy', economyRouter);
router.use('/live', liveRouter);
router.use('/reels', liveRouter); // Reels routes are in live router
router.use('/tournaments', gamesRouter);
router.use('/games', gamesRouter);
router.use('/moderation', moderationRouter);

export default router;
