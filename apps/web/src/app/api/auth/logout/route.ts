import { callBackendAuth } from '@/lib/auth/backend-auth-client';
import { noStoreJson } from '@/lib/auth/no-store-response';
import { clearSessionCookie, readSessionCookie } from '@/lib/auth/session-cookie';

/**
 * Clears the local session cookie unconditionally — that's the only real logout this
 * frontend can perform regardless of backend state. `POST /auth/logout` now revokes the
 * matching `Session` row server-side (Phase 10, Module 4), so the refresh token is passed
 * along; it's still called best-effort — its failure never blocks the local logout.
 */
export async function POST() {
  const tokens = await readSessionCookie();
  await clearSessionCookie();

  if (tokens) {
    await callBackendAuth({
      path: '/auth/logout',
      body: { refreshToken: tokens.refreshToken },
    }).catch(() => undefined);
  }

  return noStoreJson({ ok: true });
}
