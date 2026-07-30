/** The shape signed into every backend-issued token — matches
 * `apps/api/src/modules/auth/types/auth-token-payload.type.ts` (`{ email }`) plus the
 * standard `iat`/`exp` claims `@nestjs/jwt`'s `sign()` adds automatically. */
export interface AuthTokenClaims {
  email: string;
  iat: number;
  exp: number;
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decodes a JWT payload without verifying its signature. Verification is exclusively the
 * backend's job (`TokenService`/`JwtAuthGuard`, HS256) — this is a UX-routing shortcut
 * (read `email`/`exp` to decide what to show or whether to bother refreshing), never a
 * security boundary. Never trust the result for authorization.
 */
export function decodeJwtPayload<T = AuthTokenClaims>(token: string): T | null {
  const segments = token.split('.');
  const payloadSegment = segments[1];
  if (segments.length !== 3 || !payloadSegment) return null;
  try {
    return JSON.parse(base64UrlDecode(payloadSegment)) as T;
  } catch {
    return null;
  }
}

/** `skewSeconds` treats a token as expired slightly before its real `exp` to leave room
 * for request latency (e.g. checking the access token ~30s early avoids a race where it
 * expires mid-flight to the real backend). */
export function isTokenExpired(token: string, skewSeconds = 0): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) return true;
  return Date.now() >= (claims.exp - skewSeconds) * 1000;
}
