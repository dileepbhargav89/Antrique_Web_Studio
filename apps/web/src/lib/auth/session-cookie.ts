import { cookies } from 'next/headers';
import { serverEnv } from '@/config/env.server';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** Mirrors the backend's default `JWT_REFRESH_TOKEN_TTL` (30 days, `apps/api`'s
 * `env.validation.ts`). The frontend has no way to read the backend's actual configured
 * value — if that default ever changes there, this constant silently drifts out of sync.
 * See `docs/architecture/application-runtime.md`'s Risks section. */
const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: REFRESH_TOKEN_TTL_SECONDS,
};

/**
 * Reads the one httpOnly session cookie (`serverEnv.SESSION_COOKIE_NAME`). Its value is
 * `{ accessToken, refreshToken }` — both real backend-signed JWTs, so the cookie needs no
 * encryption layer of its own beyond httpOnly + Secure + SameSite=lax; `apps/api` never
 * reads this cookie itself (it's Bearer-only, `credentials: false` in its CORS config) —
 * it exists purely as this Next.js server's own BFF session store.
 */
export async function readSessionCookie(): Promise<SessionTokens | null> {
  const store = await cookies();
  const raw = store.get(serverEnv.SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionTokens>;
    if (!parsed.accessToken || !parsed.refreshToken) return null;
    return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    return null;
  }
}

/** Only callable from a Route Handler / Server Action — Next.js's cookie store is
 * read-only in Server Components (layouts/pages) by design. */
export async function writeSessionCookie(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  store.set(serverEnv.SESSION_COOKIE_NAME, JSON.stringify(tokens), COOKIE_OPTIONS);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(serverEnv.SESSION_COOKIE_NAME);
}
