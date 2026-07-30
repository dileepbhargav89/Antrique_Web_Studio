import { callBackendAuth } from '@/lib/auth/backend-auth-client';
import { noStoreJson } from '@/lib/auth/no-store-response';
import { clearSessionCookie, readSessionCookie } from '@/lib/auth/session-cookie';

/**
 * Clears the local session cookie unconditionally — that's the only real logout this
 * frontend can perform. The real `POST /auth/logout` is still a documented no-op
 * placeholder with no server-side token invalidation/blacklist, so it's called best-effort
 * for forward-compatibility only; its failure never blocks the local logout.
 */
export async function POST() {
  const tokens = await readSessionCookie();
  await clearSessionCookie();

  if (tokens) {
    await callBackendAuth({ path: '/auth/logout' }).catch(() => undefined);
  }

  return noStoreJson({ ok: true });
}
