'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminNav } from '@/components/admin/layout/AdminNav';
import { AdminHeader } from '@/components/admin/layout/AdminHeader';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, setUser, setToken } = useAdmin();
  const router = useRouter();

  // TODO: Remove this mock authentication for production
  // This is temporary for development - replace with actual auth check
  useEffect(() => {
    if (!isAuthenticated) {
      // For now, set a mock super admin user for development
      const mockSuperAdmin = {
        id: 'dev-super-admin',
        email: 'superadmin@halobuzz.com',
        role: 'super_admin' as const,
        scopes: [
          'admin:read',
          'admin:write',
          'admin:delete',
          'system:read',
          'system:write',
          'ai:query',
          'ai:action',
        ],
        name: 'Dev Super Admin',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        twoFactorEnabled: false,
      };

      setUser(mockSuperAdmin);
      setToken('dev-token-super-admin');

      // In production, redirect to login:
      // router.push('/login');
    }
  }, [isAuthenticated, router, setUser, setToken]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <div className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            v1.0.0 • {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
