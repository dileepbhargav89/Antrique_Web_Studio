import { NextResponse, type NextRequest } from 'next/server';
import { ROUTES } from '@/config/routes';
import { serverEnv } from '@/config/env.server';
import { isTokenExpired } from '@/lib/auth/jwt';

const PORTAL_PATHS = Object.values(ROUTES.portal);
const AUTH_PATHS = Object.values(ROUTES.auth);

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

interface SessionCookieValue {
  accessToken?: string;
  refreshToken?: string;
}

type SessionCheck = 'valid' | 'expired' | 'missing';

/**
 * Presence/expiry check only — decodes the refresh token's `exp` without verifying its
 * signature (no secret is, or should be, available here; verification is exclusively the
 * backend's `JwtAuthGuard` on every real API call). This is a UX routing shortcut so a
 * signed-out visitor never even renders a portal page before being redirected, not a
 * security boundary — see `docs/architecture/application-runtime.md`'s Risks section.
 *
 * Distinguishes `'expired'` (a cookie was present but its refresh token has lapsed) from
 * `'missing'` (never had one, or it's malformed) so the login redirect can show an honest
 * "your session expired" message only when that's actually what happened.
 */
function checkSession(request: NextRequest): SessionCheck {
  const raw = request.cookies.get(serverEnv.SESSION_COOKIE_NAME)?.value;
  if (!raw) return 'missing';
  try {
    const parsed = JSON.parse(raw) as SessionCookieValue;
    if (!parsed.refreshToken) return 'missing';
    return isTokenExpired(parsed.refreshToken) ? 'expired' : 'valid';
  } catch {
    return 'missing';
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = checkSession(request);

  if (matches(pathname, PORTAL_PATHS) && session !== 'valid') {
    const loginUrl = new URL(ROUTES.auth.login, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    if (session === 'expired') {
      loginUrl.searchParams.set('reason', 'expired');
    }
    return NextResponse.redirect(loginUrl);
  }

  if (matches(pathname, AUTH_PATHS) && session === 'valid') {
    return NextResponse.redirect(new URL(ROUTES.portal.dashboard, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excludes Next internals, this app's own BFF routes (never redirect those), and any
  // request path that looks like a static file (has a dot — favicon.ico, images, etc.).
  matcher: ['/((?!_next/static|_next/image|api|favicon.ico|.*\\..*).*)'],
};
