/**
 * Custom Express type definitions for HaloBuzz
 * Extends Express Request/Response with custom properties
 */

import { Request } from 'express';

export interface AuthUser {
  userId: string;
  id: string;
  username: string;
  email: string;
  ogLevel: number;
  isVerified: boolean;
  isBanned: boolean;
  isAdmin?: boolean;
  role?: string; // Added for compatibility
  roles?: string[]; // Array of roles
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  deviceFingerprint?: string;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      userId?: string;
      sessionId?: string;
      deviceFingerprint?: string;
    }
  }
}

export {};
