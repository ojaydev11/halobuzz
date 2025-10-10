'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AdminUser } from '@/types/admin';

interface AdminStore {
  user: AdminUser | null;
  token: string | null;
  setUser: (user: AdminUser | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

/**
 * Zustand store for admin session management
 */
export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        set({ token });
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('admin_token', token);
          } else {
            localStorage.removeItem('admin_token');
          }
        }
      },
      logout: () => {
        set({ user: null, token: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
        }
      },
    }),
    {
      name: 'admin-session',
    }
  )
);

/**
 * Hook to access admin session
 */
export function useAdmin() {
  const { user, token, setUser, setToken, logout } = useAdminStore();

  const isAuthenticated = !!user && !!token;
  const isSuperAdmin = user?.role === 'super_admin';

  return {
    user,
    token,
    isAuthenticated,
    isSuperAdmin,
    setUser,
    setToken,
    logout,
  };
}
