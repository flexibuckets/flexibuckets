import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ROUTES } from './lib/routes';

export default async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const nextAuthTokenName = 'next-auth.session-token'
  const cookieExists = request.cookies.has(nextAuthTokenName);

  const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname);

  const isSharedResource = nextUrl.pathname.includes('/shared/');

  if (isPublicRoute || isSharedResource) return NextResponse.next();

  const isAuthPage = nextUrl.pathname.includes('/auth/');

  if (isAuthPage && cookieExists) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!cookieExists && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
