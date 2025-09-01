import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

// Security headers middleware
function setSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' " + process.env.NEXT_PUBLIC_API_BASE,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // HSTS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  return response;
}

// CSRF token validation for POST requests
function validateCSRFToken(request: NextRequest): boolean {
  if (request.method !== 'POST') {
    return true; // Only validate POST requests
  }

  const csrfToken = request.headers.get('x-csrf-token') || 
                   request.nextUrl.searchParams.get('csrf_token');
  const sessionToken = request.cookies.get('session-token')?.value;

  if (!csrfToken || !sessionToken) {
    return false;
  }

  try {
    // Verify CSRF token matches session
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) return false;

    const decoded = verify(sessionToken, secret) as any;
    return csrfToken === decoded.csrfToken;
  } catch {
    return false;
  }
}

// Rate limiting (simple in-memory store for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const key = ip;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= limit) {
    return false;
  }
  
  current.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get client IP
  const ip = request.ip || 
             request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900'
        }
      }
    );
  }

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/login', '/api/logout'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Static assets and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    const response = NextResponse.next();
    return setSecurityHeaders(response);
  }

  // Authentication check for protected routes
  if (!isPublicPath) {
    const sessionToken = request.cookies.get('session-token')?.value;
    
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const secret = process.env.ADMIN_JWT_SECRET;
      if (!secret) {
        throw new Error('Admin JWT secret not configured');
      }

      const decoded = verify(sessionToken, secret) as any;
      
      // Check token expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session-token');
        return setSecurityHeaders(response);
      }

      // Check if 2FA is required and completed
      if (process.env.ADMIN_TOTP_REQUIRED === 'true' && !decoded.totpVerified) {
        return NextResponse.redirect(new URL('/login?2fa=required', request.url));
      }

      // Add user info to headers for API routes
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decoded.userId);
      requestHeaders.set('x-user-role', decoded.role);
      requestHeaders.set('x-csrf-token', decoded.csrfToken);

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      return setSecurityHeaders(response);
    } catch (error) {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session-token');
      return setSecurityHeaders(response);
    }
  }

  // CSRF validation for POST requests to API routes
  if (pathname.startsWith('/api/') && !validateCSRFToken(request)) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  const response = NextResponse.next();
  return setSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};