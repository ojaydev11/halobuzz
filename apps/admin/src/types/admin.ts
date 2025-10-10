/**
 * Admin user type definitions
 */

export type AdminRole = 'super_admin' | 'admin';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  scopes: string[];
  name: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
  twoFactorEnabled: boolean;
}

export interface AdminSession {
  user: AdminUser;
  token: string;
  expiresAt: Date;
}

export interface JWTPayload {
  userId: string;
  role: AdminRole;
  scopes: string[];
  iat: number;
  exp: number;
}
