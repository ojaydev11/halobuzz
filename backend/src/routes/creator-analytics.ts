import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { authMiddleware } from '@/middleware/auth';

const router = Router();

// STUB: Creator Analytics temporarily disabled for deployment
router.all('*', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.status(501).json({
    success: false,
    error: 'Creator Analytics features are temporarily unavailable'
  });
});

export default router;
