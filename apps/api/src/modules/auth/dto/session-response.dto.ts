// Response DTO for GET /auth/sessions (Phase 10, Module 4 — Authentication
// & Session Security) — "Device/session management." Never exposes
// `refreshTokenHash` (a hash, not the raw token, but still no reason to
// return it) — just enough for a user to recognize/distinguish their own
// active sessions to decide which to revoke.
export class SessionResponseDto {
  constructor(
    readonly id: string,
    readonly userAgent: string | null,
    readonly ipAddress: string | null,
    readonly issuedAt: Date,
    readonly lastUsedAt: Date | null,
    readonly expiresAt: Date,
  ) {}
}
