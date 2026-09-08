import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('vol_auth');
  const roleCookie = request.cookies.get('vol_role');

  // Protect volunteer dashboard
  if (request.nextUrl.pathname.startsWith('/volunteer/dashboard')) {
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/volunteer/login', request.url));
    }
  }

  // Protect admin dashboard - only ADMIN role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/volunteer/login', request.url));
    }
    if (!roleCookie || roleCookie.value !== 'ADMIN') {
      // Volunteers who are not admins get redirected to their dashboard
      return NextResponse.redirect(new URL('/volunteer/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/volunteer/dashboard/:path*', '/admin/:path*'],
};
