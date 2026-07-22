import { AuthTokenPayload } from '../types/auth-token-payload.type';

// Pure conversion: an authenticated user's email -> the payload
// TokenService signs. The one place this shape is built, so it can't
// drift between the access and refresh token calls in auth.service.ts's
// login(). Takes a plain `email: string`, not `LoginRequestDto` or the
// Prisma `User` — deliberately decoupled from both, since Milestone 1's
// login() calls this with `user.email` (the verified, canonically-cased
// row from AuthRepository.findActiveByEmail()'s case-insensitive lookup),
// never `dto.email` (the client's raw, possibly differently-cased input)
// — the signed token should reflect who was actually authenticated, not
// what the client happened to type. Never accepts a password parameter —
// never sign a credential into a token.
export function buildAuthTokenPayload(email: string): AuthTokenPayload {
  return { email };
}

// Pure conversion: a decoded, already-verified refresh token -> the fresh
// payload auth.service.ts's refresh() re-signs — the same rebuild every
// successful stateless rotation (Phase 1.2D.10) performs.
// `TokenService.verifyRefreshToken<T>()` is typed to return exactly `T`
// (here `AuthTokenPayload`), but at runtime the decoded object also
// carries the standard JWT claims (`iat`, `exp`) jsonwebtoken merges in
// on every sign — those aren't visible through the `AuthTokenPayload`
// type, but they're really there on the object. Passing that object
// straight back into `signAccessToken()`/`signRefreshToken()` would make
// `jsonwebtoken` throw ("Bad options.expiresIn option the payload
// already has an exp property"), since the two token methods separately
// pass `expiresIn`. Rebuilding a clean `{ email }` object here — the
// same shape `buildAuthTokenPayload()` builds from the login DTO — is
// what makes reissuing tokens safe. No `jti`/nonce/timestamp is added
// here or anywhere else in this module: the payload stays exactly the
// minimal shape `AuthTokenPayload` declares, deterministic same-second
// signing and all — see auth.service.ts's refresh() comment.
export function reissueAuthTokenPayload(decoded: AuthTokenPayload): AuthTokenPayload {
  return { email: decoded.email };
}
