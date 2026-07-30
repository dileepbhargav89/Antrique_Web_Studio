import { z } from 'zod';
import { BackendAuthError, callBackendAuth } from '@/lib/auth/backend-auth-client';
import { decodeJwtPayload, type AuthTokenClaims } from '@/lib/auth/jwt';
import { noStoreJson } from '@/lib/auth/no-store-response';
import { writeSessionCookie, type SessionTokens } from '@/lib/auth/session-cookie';

const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * BFF login: proxies to the real `POST /auth/login` server-to-server, then sets the
 * httpOnly session cookie — the browser never sees `refreshToken` at all. Returns the
 * access token in the JSON body so the client can hold it in memory
 * (`store/auth-store.ts`) for the tab's lifetime; see
 * `docs/architecture/application-runtime.md` for the full flow.
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = loginBodySchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson(
      { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  try {
    const tokens = await callBackendAuth<SessionTokens>({ path: '/auth/login', body: parsed.data });
    await writeSessionCookie(tokens);
    const claims = decodeJwtPayload<AuthTokenClaims>(tokens.accessToken);
    return noStoreJson({
      accessToken: tokens.accessToken,
      email: claims?.email ?? parsed.data.email,
      expiresAt: claims?.exp ? claims.exp * 1000 : null,
    });
  } catch (error) {
    if (error instanceof BackendAuthError) {
      return noStoreJson(error.body, { status: error.statusCode });
    }
    return noStoreJson(
      { statusCode: 502, message: 'Upstream authentication service unreachable' },
      { status: 502 },
    );
  }
}
