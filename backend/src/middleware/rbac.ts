import { Request, Response, NextFunction } from 'express';
import { setupLogger } from '@/config/logger';
import { AuthUser } from '@/types/express';

const logger = setupLogger();

/**
 * RBAC Middleware - Require specific scopes for access
 * @param requiredScopes - Array of scopes required (user must have at least one)
 */
export const requireScope = (requiredScopes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Super admin has all scopes
      if (req.user.roles?.includes('super_admin')) {
        next();
        return;
      }

      // Admin with admin:read and admin:write scopes
      if (req.user.roles?.includes('admin')) {
        // Check if user has any of the required scopes
        const hasScope = requiredScopes.some(scope => {
          if (scope === 'admin:read') return true;
          if (scope === 'admin:write') return true;
          return false;
        });

        if (hasScope) {
          next();
          return;
        }
      }

      // Check if user has any of the required roles
      if (req.user.roles && Array.isArray(req.user.roles)) {
        const hasRole = requiredScopes.some(scope =>
          req.user!.roles!.includes(scope)
        );

        if (hasRole) {
          next();
          return;
        }
      }

      // No matching scope found
      logger.warn(`Access denied for user ${req.user.userId} (${req.user.email}). Required scopes: ${requiredScopes.join(', ')}`);
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required permission: ${requiredScopes.join(' or ')}`
      });
    } catch (error) {
      logger.error('RBAC scope check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Check if user has admin role
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const isAdmin = req.user.roles?.includes('admin') || req.user.roles?.includes('super_admin') || req.user.isAdmin;
    if (!isAdmin) {
      logger.warn(`Admin access denied for user ${req.user.userId} (${req.user.email})`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Admin role check error:', error);
    res.status(500).json({ error: 'Role check failed' });
  }
};

/**
 * Check if user has super admin role
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!req.user.roles?.includes('super_admin')) {
      logger.warn(`Super admin access denied for user ${req.user.userId} (${req.user.email})`);
      res.status(403).json({ error: 'Super admin access required' });
      return;
    }

    next();
  } catch (error) {
    logger.error('Super admin role check error:', error);
    res.status(500).json({ error: 'Role check failed' });
  }
};
