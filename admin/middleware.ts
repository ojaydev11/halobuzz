import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN_COOKIE = 'hb_admin_token';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get(ADMIN_TOKEN_COOKIE)?.value;
    if (!token) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};


