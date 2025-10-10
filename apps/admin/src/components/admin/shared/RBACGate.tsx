'use client';

import { useRBAC } from '@/hooks/useRBAC';

interface RBACGateProps {
  requiredScopes?: string[];
  superAdminOnly?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RBAC Gate component - conditionally renders children based on permissions
 * Used to hide/show UI elements based on admin's role and scopes
 */
export function RBACGate({
  requiredScopes = [],
  superAdminOnly = false,
  children,
  fallback = null,
}: RBACGateProps) {
  const { hasAllScopes, isSuperAdmin } = useRBAC();

  // Check super admin requirement
  if (superAdminOnly && !isSuperAdmin()) {
    return <>{fallback}</>;
  }

  // Check scope requirements
  if (requiredScopes.length > 0 && !hasAllScopes(requiredScopes)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
