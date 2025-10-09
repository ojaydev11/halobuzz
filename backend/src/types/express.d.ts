/**
 * Express type extensions for HaloBuzz Backend
 * Unified AuthUser interface and Request augmentation
 */

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authenticated user payload
 * Single source of truth for user auth context
 */
export interface AuthUser {
  /** User MongoDB ObjectId (string representation) */
  userId: string;

  /** Alias for userId (for backward compatibility) */
  id: string;

  /** Username */
  username: string;

  /** Email address */
  email: string;

  /** OG Level (0-10) */
  ogLevel: number;

  /** Email verification status */
  isVerified: boolean;

  /** Ban status */
  isBanned: boolean;

  /** Admin privileges */
  isAdmin?: boolean;

  /** User roles (for RBAC) */
  roles?: string[];

  /** MFA/2FA enabled */
  mfaEnabled?: boolean;

  /** MFA verified in current session */
  mfaVerified?: boolean;

  /** TOTP verified (admin-specific) */
  totpVerified?: boolean;

  /** Device fingerprint for enhanced security */
  deviceFingerprint?: string;

  /** Session ID for tracking */
  sessionId?: string;

  /** Trust score (0-100) for enhanced auth */
  trustScore?: number;

  /** Last login timestamp */
  lastLoginAt?: Date;
}

export {}; // Make this a module
