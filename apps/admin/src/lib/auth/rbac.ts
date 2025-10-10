import { type AdminUser } from '@/types/admin';

/**
 * RBAC (Role-Based Access Control) utilities
 */

/**
 * Check if user has all required scopes
 */
export function hasAllScopes(user: AdminUser | null, requiredScopes: string[]): boolean {
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  // Check if user has all required scopes
  return requiredScopes.every(scope => user.scopes.includes(scope));
}

/**
 * Check if user has any of the required scopes
 */
export function hasAnyScope(user: AdminUser | null, requiredScopes: string[]): boolean {
  if (!user) return false;

  // Super admin has all permissions
  if (user.role === 'super_admin') return true;

  // Check if user has any of the required scopes
  return requiredScopes.some(scope => user.scopes.includes(scope));
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: AdminUser | null): boolean {
  return user?.role === 'super_admin';
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(user: AdminUser | null, route: string): boolean {
  if (!user) return false;

  // Super admin can access everything
  if (user.role === 'super_admin') return true;

  // Define route access rules
  const superAdminOnlyRoutes = [
    '/admin/system',
    '/admin/halo-ai',
    '/admin/economy/config',
  ];

  // Check if route is super admin only
  const isSuperAdminRoute = superAdminOnlyRoutes.some(r => route.startsWith(r));

  if (isSuperAdminRoute) {
    return false; // Only super admins can access, and we already checked above
  }

  // All other /admin routes are accessible to both admin and super_admin
  return route.startsWith('/admin');
}

/**
 * Get user's effective scopes (including role-based defaults)
 */
export function getEffectiveScopes(user: AdminUser | null): string[] {
  if (!user) return [];

  if (user.role === 'super_admin') {
    return [
      'admin:read',
      'admin:write',
      'admin:delete',
      'system:read',
      'system:write',
      'ai:query',
      'ai:action',
    ];
  }

  return user.scopes;
}
