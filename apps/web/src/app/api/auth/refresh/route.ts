import { BackendAuthError, callBackendAuth } from '@/lib/auth/backend-auth-client';
import { decodeJwtPayload, type AuthTokenClaims } from '@/lib/auth/jwt';
import { noStoreJson } from '@/lib/auth/no-store-response';
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
  type SessionTokens,
} from '@/lib/auth/session-cookie';

/**
 * Rotates the session: reads the current refresh token from the httpOnly cookie, exchanges
 * it for a fresh pair via the real `POST /auth/refresh`, and rewrites the cookie. Called
 * directly by `services/api/request.ts`'s 401-retry path (never by `GET /api/auth/session`,
 * which handles its own refresh-on-read inline — see that route for why the two don't
 * share this handler).
 */
export async function POST() {
  const tokens = await readSessionCookie();
  if (!tokens) {
    return noStoreJson({ statusCode: 401, message: 'No active session' }, { status: 401 });
  }

  try {
    const refreshed = await callBackendAuth<SessionTokens>({
      path: '/auth/refresh',
      body: { refreshToken: tokens.refreshToken },
    });
    await writeSessionCookie(refreshed);
    const claims = decodeJwtPayload<AuthTokenClaims>(refreshed.accessToken);
    return noStoreJson({
      accessToken: refreshed.accessToken,
      email: claims?.email,
      expiresAt: claims?.exp ? claims.exp * 1000 : null,
    });
  } catch (error) {
    await clearSessionCookie();
    if (error instanceof BackendAuthError) {
      return noStoreJson(error.body, { status: error.statusCode });
    }
    return noStoreJson(
      { statusCode: 502, message: 'Upstream authentication service unreachable' },
      { status: 502 },
    );
  }
}
