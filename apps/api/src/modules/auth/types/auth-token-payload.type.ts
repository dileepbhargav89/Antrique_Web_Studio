// The shape signed into every access/refresh token AuthService issues
// (Phase 1.2D.8). Deliberately minimal — no `sub`/`tenantId`/`roles` yet,
// since none of those exist without a persisted, tenant-scoped `User`
// lookup, which this phase explicitly does not implement (see
// auth.service.ts's login() comment and mappers/auth-token-payload.mapper.ts,
// the one place this shape is built).
export type AuthTokenPayload = {
  email: string;
};
