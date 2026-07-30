// The shape signed into every access/refresh token AuthService issues
// (Phase 1.2D.8). Deliberately minimal — no `sub`/`tenantId`/`roles` yet,
// since none of those exist without a persisted, tenant-scoped `User`
// lookup, which this phase explicitly does not implement (see
// auth.service.ts's login() comment and mappers/auth-token-payload.mapper.ts,
// the one place this shape is built).
//
// `jti` (Phase 10, Module 4 — Authentication & Session Security): a
// random per-token identifier, added specifically to close the gap
// refresh()'s own prior comment already flagged — HS256 signing is
// deterministic and `iat`/`exp` only carry second precision, so two
// tokens issued for the same email within the same wall-clock second
// were previously byte-identical. That collision would break Module 4's
// own `Session.refreshTokenHash` unique constraint (session persistence
// needs each issued refresh token to hash to something unique) — `jti`
// guarantees that regardless of timing.
export type AuthTokenPayload = {
  email: string;
  jti: string;
};
