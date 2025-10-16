/**
 * Enhanced Role-Based Access Control (RBAC) Middleware
 * Provides comprehensive role and permission management
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

// Define role hierarchy and permissions
export const ROLE_HIERARCHY = {
  'super_admin': 4,
  'admin': 3,
  'moderator': 2,
  'user': 1
} as const;

export const PERMISSIONS = {
  // User management
  'users:read': ['admin', 'moderator', 'super_admin'],
  'users:write': ['admin', 'super_admin'],
  'users:delete': ['super_admin'],
  
  // Gift management
  'gifts:read': ['user', 'moderator', 'admin', 'super_admin'],
  'gifts:write': ['user', 'moderator', 'admin', 'super_admin'],
  'gifts:moderate': ['moderator', 'admin', 'super_admin'],
  'gifts:delete': ['admin', 'super_admin'],
  
  // Stream management
  'streams:read': ['user', 'moderator', 'admin', 'super_admin'],
  'streams:write': ['user', 'moderator', 'admin', 'super_admin'],
  'streams:moderate': ['moderator', 'admin', 'super_admin'],
  'streams:delete': ['admin', 'super_admin'],
  
  // Game management
  'games:read': ['user', 'moderator', 'admin', 'super_admin'],
  'games:write': ['user', 'moderator', 'admin', 'super_admin'],
  'games:moderate': ['moderator', 'admin', 'super_admin'],
  'games:admin': ['admin', 'super_admin'],
  
  // Admin functions
  'admin:read': ['admin', 'super_admin'],
  'admin:write': ['admin', 'super_admin'],
  'admin:system': ['super_admin'],
  
  // Analytics
  'analytics:read': ['moderator', 'admin', 'super_admin'],
  'analytics:write': ['admin', 'super_admin'],
  
  // Monitoring
  'monitoring:read': ['admin', 'super_admin'],
  'monitoring:write': ['super_admin'],
  
  // GDPR functions
  'gdpr:export': ['admin', 'super_admin'],
  'gdpr:delete': ['super_admin'],
  
  // Financial
  'financial:read': ['admin', 'super_admin'],
  'financial:write': ['super_admin'],
  
  // Security
  'security:read': ['admin', 'super_admin'],
  'security:write': ['super_admin']
} as const;

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
    role: string;
    roles: string[];
    isAdmin: boolean;
    permissions?: string[];
  };
}

export class RBACService {
  private static instance: RBACService;

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Check if user has required permission
   */
  hasPermission(userRole: string, permission: string): boolean {
    const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
    if (!allowedRoles) {
      logger.warn(`Unknown permission: ${permission}`);
      return false;
    }

    return allowedRoles.includes(userRole as any);
  }

  /**
   * Check if user role is higher than or equal to required role
   */
  hasRoleLevel(userRole: string, requiredRole: string): boolean {
    const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
    
    return userLevel >= requiredLevel;
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: string): string[] {
    const permissions: string[] = [];
    
    Object.entries(PERMISSIONS).forEach(([permission, allowedRoles]) => {
      if (allowedRoles.includes(role as any)) {
        permissions.push(permission);
      }
    });
    
    return permissions;
  }

  /**
   * Get user permissions from database
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await User.findById(userId).select('role').lean();
      if (!user) {
        return [];
      }

      return this.getRolePermissions(user.role || 'user');
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Log permission check for audit
   */
  async logPermissionCheck(
    userId: string, 
    permission: string, 
    granted: boolean, 
    resource?: string,
    req?: Request
  ): Promise<void> {
    try {
      await AuditLog.create({
        admin: userId,
        action: `permission.${granted ? 'granted' : 'denied'}`,
        resource: resource || 'permission',
        resourceId: permission,
        details: {
          permission,
          granted,
          timestamp: new Date()
        },
        ip: req?.ip,
        userAgent: req?.get('user-agent')
      });
    } catch (error) {
      logger.error('Error logging permission check:', error);
    }
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance();

/**
 * Require specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const hasPermission = rbacService.hasPermission(req.user.role, permission);
      
      // Log permission check
      await rbacService.logPermissionCheck(
        req.user.userId,
        permission,
        hasPermission,
        req.route?.path,
        req
      );

      if (!hasPermission) {
        logger.warn(`Permission denied for user ${req.user.userId}: ${permission}`);
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required permission: ${permission}`,
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Require specific role level
 */
export const requireRole = (requiredRole: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      const hasRole = rbacService.hasRoleLevel(req.user.role, requiredRole);
      
      if (!hasRole) {
        logger.warn(`Role level insufficient for user ${req.user.userId}: ${req.user.role} < ${requiredRole}`);
        res.status(403).json({
          success: false,
          error: 'Insufficient role level',
          message: `Required role: ${requiredRole} or higher`,
          code: 'ROLE_INSUFFICIENT'
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Role check failed',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
};

/**
 * Require admin role
 */
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  return requireRole('admin')(req, res, next);
};

/**
 * Require super admin role
 */
export const requireSuperAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  return requireRole('super_admin')(req, res, next);
};

/**
 * Require moderator or higher
 */
export const requireModerator = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  return requireRole('moderator')(req, res, next);
};

/**
 * Check if user can access resource (owner or admin)
 */
export const requireOwnershipOrAdmin = (resourceUserIdField: string = 'userId') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Admin can access anything
      if (rbacService.hasRoleLevel(req.user.role, 'admin')) {
        next();
        return;
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (resourceUserId === req.user.userId) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only access your own resources',
        code: 'OWNERSHIP_REQUIRED'
      });
    } catch (error) {
      logger.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Ownership check failed',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware to add user permissions to request
 */
export const addUserPermissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      const permissions = await rbacService.getUserPermissions(req.user.userId);
      req.user.permissions = permissions;
    }
    next();
  } catch (error) {
    logger.error('Error adding user permissions:', error);
    next();
  }
};

/**
 * Get user role information
 */
export const getUserRoleInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      const permissions = await rbacService.getUserPermissions(req.user.userId);
      
      res.json({
        success: true,
        data: {
          role: req.user.role,
          permissions,
          isAdmin: req.user.isAdmin,
          roleLevel: ROLE_HIERARCHY[req.user.role as keyof typeof ROLE_HIERARCHY] || 0
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
  } catch (error) {
    logger.error('Error getting user role info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get role information'
    });
  }
};

/**
 * Validate role assignment (only super admin can assign roles)
 */
export const validateRoleAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const { role } = req.body;
    const targetUserId = req.params.userId;

    // Only super admin can assign roles
    if (!rbacService.hasRoleLevel(req.user.role, 'super_admin')) {
      res.status(403).json({
        success: false,
        error: 'Only super admins can assign roles'
      });
      return;
    }

    // Validate role exists
    if (!Object.keys(ROLE_HIERARCHY).includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: `Valid roles: ${Object.keys(ROLE_HIERARCHY).join(', ')}`
      });
      return;
    }

    // Prevent self-demotion
    if (targetUserId === req.user.userId && !rbacService.hasRoleLevel(role, req.user.role)) {
      res.status(400).json({
        success: false,
        error: 'Cannot demote yourself'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Role assignment validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Role assignment validation failed'
    });
  }
};

// Export all middleware functions
export {
  requirePermission,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireModerator,
  requireOwnershipOrAdmin,
  addUserPermissions,
  getUserRoleInfo,
  validateRoleAssignment
};