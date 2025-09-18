// Role-Based Access Control (RBAC) System

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: number;
  isSystemRole?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

// Define all available permissions
export const PERMISSIONS: Record<string, Permission> = {
  // User Management
  'users.view': {
    id: 'users.view',
    name: 'View Users',
    description: 'View user profiles and basic information',
    resource: 'users',
    action: 'view'
  },
  'users.create': {
    id: 'users.create',
    name: 'Create Users',
    description: 'Create new user accounts',
    resource: 'users',
    action: 'create'
  },
  'users.edit': {
    id: 'users.edit',
    name: 'Edit Users',
    description: 'Edit user profiles and settings',
    resource: 'users',
    action: 'edit'
  },
  'users.delete': {
    id: 'users.delete',
    name: 'Delete Users',
    description: 'Delete user accounts',
    resource: 'users',
    action: 'delete'
  },
  'users.ban': {
    id: 'users.ban',
    name: 'Ban Users',
    description: 'Ban or suspend user accounts',
    resource: 'users',
    action: 'ban'
  },

  // Content Management
  'content.view': {
    id: 'content.view',
    name: 'View Content',
    description: 'View streams, posts, and other content',
    resource: 'content',
    action: 'view'
  },
  'content.moderate': {
    id: 'content.moderate',
    name: 'Moderate Content',
    description: 'Review and moderate reported content',
    resource: 'content',
    action: 'moderate'
  },
  'content.delete': {
    id: 'content.delete',
    name: 'Delete Content',
    description: 'Delete inappropriate content',
    resource: 'content',
    action: 'delete'
  },

  // Analytics & Reports
  'analytics.view': {
    id: 'analytics.view',
    name: 'View Analytics',
    description: 'Access analytics dashboards and reports',
    resource: 'analytics',
    action: 'view'
  },
  'analytics.export': {
    id: 'analytics.export',
    name: 'Export Analytics',
    description: 'Export analytics data and reports',
    resource: 'analytics',
    action: 'export'
  },

  // Financial Management
  'financial.view': {
    id: 'financial.view',
    name: 'View Financial Data',
    description: 'View revenue, transactions, and financial reports',
    resource: 'financial',
    action: 'view'
  },
  'financial.manage': {
    id: 'financial.manage',
    name: 'Manage Finances',
    description: 'Process refunds, manage payments',
    resource: 'financial',
    action: 'manage'
  },

  // System Management
  'system.view': {
    id: 'system.view',
    name: 'View System Status',
    description: 'View system health and performance metrics',
    resource: 'system',
    action: 'view'
  },
  'system.configure': {
    id: 'system.configure',
    name: 'Configure System',
    description: 'Modify system settings and configurations',
    resource: 'system',
    action: 'configure'
  },

  // Admin Management
  'admin.view': {
    id: 'admin.view',
    name: 'View Admin Panel',
    description: 'Access to admin panel interface',
    resource: 'admin',
    action: 'view'
  },
  'admin.manage': {
    id: 'admin.manage',
    name: 'Manage Admins',
    description: 'Create and manage admin accounts',
    resource: 'admin',
    action: 'manage'
  },

  // AI & Intelligence
  'ai.view': {
    id: 'ai.view',
    name: 'View AI Systems',
    description: 'View AI performance and intelligence metrics',
    resource: 'ai',
    action: 'view'
  },
  'ai.configure': {
    id: 'ai.configure',
    name: 'Configure AI Systems',
    description: 'Modify AI settings and training parameters',
    resource: 'ai',
    action: 'configure'
  },

  // Promotions & Marketing
  'promotions.view': {
    id: 'promotions.view',
    name: 'View Promotions',
    description: 'View campaigns and promotional activities',
    resource: 'promotions',
    action: 'view'
  },
  'promotions.manage': {
    id: 'promotions.manage',
    name: 'Manage Promotions',
    description: 'Create and manage promotional campaigns',
    resource: 'promotions',
    action: 'manage'
  }
};

// Define system roles
export const ROLES: Record<string, Role> = {
  'super-admin': {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    level: 100,
    isSystemRole: true,
    permissions: Object.keys(PERMISSIONS)
  },
  'admin': {
    id: 'admin',
    name: 'Administrator',
    description: 'High-level access for general administration',
    level: 80,
    isSystemRole: true,
    permissions: [
      'users.view', 'users.edit', 'users.ban',
      'content.view', 'content.moderate', 'content.delete',
      'analytics.view', 'analytics.export',
      'financial.view',
      'system.view',
      'admin.view',
      'ai.view',
      'promotions.view', 'promotions.manage'
    ]
  },
  'moderator': {
    id: 'moderator',
    name: 'Content Moderator',
    description: 'Content moderation and user management',
    level: 50,
    isSystemRole: true,
    permissions: [
      'users.view', 'users.ban',
      'content.view', 'content.moderate', 'content.delete',
      'analytics.view',
      'admin.view'
    ]
  },
  'support': {
    id: 'support',
    name: 'Support Agent',
    description: 'Customer support and basic user assistance',
    level: 30,
    isSystemRole: true,
    permissions: [
      'users.view', 'users.edit',
      'content.view',
      'analytics.view',
      'admin.view'
    ]
  },
  'viewer': {
    id: 'viewer',
    name: 'Read-Only Access',
    description: 'View-only access to most admin features',
    level: 10,
    isSystemRole: true,
    permissions: [
      'users.view',
      'content.view',
      'analytics.view',
      'system.view',
      'admin.view',
      'ai.view',
      'promotions.view'
    ]
  }
};

// RBAC utility functions
export class RBACManager {
  static hasPermission(userRoles: string[], permission: string): boolean {
    return userRoles.some(roleId => {
      const role = ROLES[roleId];
      return role && role.permissions.includes(permission);
    });
  }

  static hasAnyPermission(userRoles: string[], permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(userRoles, permission));
  }

  static hasAllPermissions(userRoles: string[], permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(userRoles, permission));
  }

  static getUserLevel(userRoles: string[]): number {
    return Math.max(...userRoles.map(roleId => ROLES[roleId]?.level || 0));
  }

  static canAccessResource(userRoles: string[], resource: string, action?: string): boolean {
    const resourcePermissions = Object.values(PERMISSIONS).filter(p => {
      if (action) {
        return p.resource === resource && p.action === action;
      }
      return p.resource === resource;
    });

    return resourcePermissions.some(permission =>
      this.hasPermission(userRoles, permission.id)
    );
  }

  static getAvailablePermissions(userRoles: string[]): Permission[] {
    const availablePermissionIds = new Set<string>();

    userRoles.forEach(roleId => {
      const role = ROLES[roleId];
      if (role) {
        role.permissions.forEach(permissionId => {
          availablePermissionIds.add(permissionId);
        });
      }
    });

    return Array.from(availablePermissionIds).map(id => PERMISSIONS[id]).filter(Boolean);
  }

  static filterMenuItems(menuItems: any[], userRoles: string[]): any[] {
    return menuItems.filter(item => {
      if (item.requiredPermission) {
        return this.hasPermission(userRoles, item.requiredPermission);
      }
      if (item.requiredRole) {
        return userRoles.includes(item.requiredRole);
      }
      if (item.minLevel) {
        return this.getUserLevel(userRoles) >= item.minLevel;
      }
      return true;
    }).map(item => ({
      ...item,
      children: item.children ? this.filterMenuItems(item.children, userRoles) : undefined
    }));
  }
}

// React hook for RBAC
export function useRBAC(userRoles: string[] = []) {
  return {
    hasPermission: (permission: string) => RBACManager.hasPermission(userRoles, permission),
    hasAnyPermission: (permissions: string[]) => RBACManager.hasAnyPermission(userRoles, permissions),
    hasAllPermissions: (permissions: string[]) => RBACManager.hasAllPermissions(userRoles, permissions),
    canAccess: (resource: string, action?: string) => RBACManager.canAccessResource(userRoles, resource, action),
    userLevel: RBACManager.getUserLevel(userRoles),
    availablePermissions: RBACManager.getAvailablePermissions(userRoles)
  };
}