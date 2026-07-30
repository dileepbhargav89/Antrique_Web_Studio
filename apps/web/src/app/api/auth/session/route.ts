import { BackendAuthError, callBackendAuth } from '@/lib/auth/backend-auth-client';
import { decodeJwtPayload, isTokenExpired, type AuthTokenClaims } from '@/lib/auth/jwt';
import { noStoreJson } from '@/lib/auth/no-store-response';
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
  type SessionTokens,
} from '@/lib/auth/session-cookie';

/**
 * The one call `providers/auth-provider.tsx` makes on mount to bootstrap client auth
 * state after a hard refresh (the access token never lives in anything JS-readable, so it
 * doesn't survive a reload on its own). Treats an expired-but-refreshable session as a
 * silent refresh rather than a logout — a valid 30-day session shouldn't force a re-login
 * just because the 15-minute access token happened to lapse between page loads.
 */
export async function GET() {
  const tokens = await readSessionCookie();
  if (!tokens) {
    return noStoreJson({ authenticated: false });
  }

  if (!isTokenExpired(tokens.accessToken, 30)) {
    return sessionResponse(tokens);
  }

  if (isTokenExpired(tokens.refreshToken)) {
    await clearSessionCookie();
    return noStoreJson({ authenticated: false });
  }

  try {
    const refreshed = await callBackendAuth<SessionTokens>({
      path: '/auth/refresh',
      body: { refreshToken: tokens.refreshToken },
    });
    await writeSessionCookie(refreshed);
    return sessionResponse(refreshed);
  } catch (error) {
    await clearSessionCookie();
    if (error instanceof BackendAuthError) {
      return noStoreJson({ authenticated: false });
    }
    return noStoreJson({ authenticated: false }, { status: 502 });
  }
}

function sessionResponse(tokens: SessionTokens) {
  const claims = decodeJwtPayload<AuthTokenClaims>(tokens.accessToken);
  return noStoreJson({
    authenticated: true,
    accessToken: tokens.accessToken,
    email: claims?.email,
    expiresAt: claims?.exp ? claims.exp * 1000 : null,
  });
}
