/**
 * RBAC (Role-Based Access Control) type definitions
 */

export type Permission = string;

export interface RBACRule {
  resource: string;
  action: string;
  requiredScopes: string[];
  allowedRoles: ('super_admin' | 'admin')[];
}

/**
 * Scope definitions aligned with backend
 */
export const AdminScopes = {
  // Read permissions
  ADMIN_READ: 'admin:read',

  // Write permissions
  ADMIN_WRITE: 'admin:write',

  // Delete permissions
  ADMIN_DELETE: 'admin:delete',

  // System permissions (Super Admin only)
  SYSTEM_READ: 'system:read',
  SYSTEM_WRITE: 'system:write',

  // AI permissions (Super Admin only)
  AI_QUERY: 'ai:query',
  AI_ACTION: 'ai:action',
} as const;

export type AdminScope = typeof AdminScopes[keyof typeof AdminScopes];
