import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_ROUTES } from './lib/routes';

// --- Define which routes are protected by API keys ---
const API_KEY_ROUTES_PREFIX = '/api/v1/';

export default async function middleware(request: NextRequest) {
  const { nextUrl, headers } = request;
  const requestHeaders = new Headers(request.headers); // We will add to this

  // --- START API KEY HANDLING ---
  // This block no longer validates. It just extracts.
  const isApiKeyRoute = nextUrl.pathname.startsWith(API_KEY_ROUTES_PREFIX);
  if (isApiKeyRoute) {
    const authHeader = headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const plainTextKey = authHeader.substring(7);
      // Attach the *plaintext* key to be validated by the API route
      requestHeaders.set('x-api-key', plainTextKey);
    }
  }
  // --- END API KEY HANDLING ---

  // --- Your existing NextAuth Session Logic ---
  const isProduction = process.env.NODE_ENV === 'production';
  const nextAuthTokenName = isProduction
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';
  const cookieExists = request.cookies.has(nextAuthTokenName);

  const isPublicRoute = PUBLIC_ROUTES.includes(nextUrl.pathname);
  const isSharedResource = nextUrl.pathname.includes('/shared/');

  if (isPublicRoute || isSharedResource) {
    // Pass on the headers (which might include x-api-key)
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const isAuthPage = nextUrl.pathname.includes('/auth/');

  if (isAuthPage && cookieExists) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check if an API key was attached by our logic above
  const apiKeyExists = requestHeaders.has('x-api-key');

  if (!cookieExists && !isAuthPage && !apiKeyExists) {
    // No session, not auth page, AND no API key? NOW we can redirect.
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Allow the request to proceed with our new headers
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // This matcher is correct (from our last step)
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};