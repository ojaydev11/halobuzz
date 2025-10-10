'use client';

import { useAdmin } from './useAdmin';
import { hasAllScopes, hasAnyScope, isSuperAdmin, canAccessRoute } from '@/lib/auth/rbac';

/**
 * Hook for RBAC permission checks
 */
export function useRBAC() {
  const { user } = useAdmin();

  return {
    hasAllScopes: (requiredScopes: string[]) => hasAllScopes(user, requiredScopes),
    hasAnyScope: (requiredScopes: string[]) => hasAnyScope(user, requiredScopes),
    isSuperAdmin: () => isSuperAdmin(user),
    canAccessRoute: (route: string) => canAccessRoute(user, route),
    user,
  };
}
