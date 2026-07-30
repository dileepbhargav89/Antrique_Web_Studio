import { randomUUID } from 'node:crypto';
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
  return { email, jti: randomUUID() };
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
// pass `expiresIn`. Rebuilding a clean object here — the same shape
// `buildAuthTokenPayload()` builds from the login DTO — is what makes
// reissuing tokens safe.
//
// A fresh `jti` (Phase 10, Module 4), not `decoded.jti` carried forward:
// this IS a new token issuance (that's the whole point of rotation), so
// it needs its own identity — both to avoid the same-second collision
// this comment used to describe as an accepted gap, and because
// `Session.refreshTokenHash` needs each rotation's refresh token to hash
// to a genuinely distinct value.
export function reissueAuthTokenPayload(decoded: AuthTokenPayload): AuthTokenPayload {
  return { email: decoded.email, jti: randomUUID() };
}
