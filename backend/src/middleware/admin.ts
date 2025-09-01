import { Request, Response, NextFunction } from 'express';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
  };
}

export const adminOnly = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = adminEmails.includes((req.user.email || '').toLowerCase());

    if (!isAdmin) {
      logger.warn(`Admin access denied for user ${req.user.userId} (${req.user.email})`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin RBAC error:', error);
    res.status(500).json({ error: 'RBAC error' });
  }
};


