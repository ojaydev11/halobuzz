// Simple JWT authentication system
import { AdminUser } from './db';

export interface AuthSession {
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
  };
  token: string;
  expiresAt: string;
}

// Simple JWT-like token generation (replace with proper JWT in production)
function generateToken(user: AdminUser): string {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    iat: Date.now(),
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };

  // Simple base64 encoding (NOT secure - use proper JWT in production)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token: string): { user: AdminUser; valid: boolean } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (payload.exp < Date.now()) {
      return null; // Token expired
    }

    return {
      user: {
        id: payload.id,
        username: payload.username,
        email: payload.email,
        passwordHash: '', // Don't include password hash
        roles: payload.roles,
        isActive: true,
        createdAt: '',
        updatedAt: ''
      },
      valid: true
    };
  } catch {
    return null;
  }
}

export class AuthService {
  static createSession(user: AdminUser): AuthSession {
    const token = generateToken(user);
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString();

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      },
      token,
      expiresAt
    };
  }

  static verifySession(token: string): AuthSession | null {
    const result = verifyToken(token);
    if (!result || !result.valid) return null;

    return {
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        roles: result.user.roles
      },
      token,
      expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString()
    };
  }

  static getUserFromToken(token: string): AdminUser | null {
    const result = verifyToken(token);
    return result?.valid ? result.user : null;
  }
}

// Cookie management
export class CookieService {
  static setAuthCookie(response: any, session: AuthSession) {
    const cookieValue = `auth-token=${session.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
    response.setHeader('Set-Cookie', cookieValue);
  }

  static clearAuthCookie(response: any) {
    const cookieValue = `auth-token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
    response.setHeader('Set-Cookie', cookieValue);
  }

  static getAuthToken(request: any): string | null {
    const cookies = request.headers.cookie;
    if (!cookies) return null;

    const match = cookies.match(/auth-token=([^;]+)/);
    return match ? match[1] : null;
  }
}