// The controller's route segment — the one place this string is written,
// matching apps/api/src/modules/example-domain/constants/
// example-domain.constant.ts's precedent exactly.
export const AUTH_ROUTE = 'auth';

// Milestone 13 (Security Hardening) — `POST /auth/login`'s own stricter
// `@Throttle()` override (see auth.controller.ts): 5 attempts per
// 60 seconds, per client (ThrottlerGuard's own default tracking key —
// IP address). Fixed security policy, not env-configurable — see the
// controller's own comment for why.
export const LOGIN_THROTTLE_LIMIT = 5;
export const LOGIN_THROTTLE_TTL_MS = 60_000;

// Phase 10, Module 3 (Security Hardening) — `POST /auth/refresh` is
// also a credential-exchange endpoint (a leaked/stolen refresh token
// being brute-forced, or an attacker enumerating tokens, is the same
// class of risk login's own throttle exists for) but previously shared
// only the general 100-req/min app-wide default. Looser than login's
// 5/min — a real client legitimately calls refresh periodically across
// multiple open tabs/sessions, unlike login which a genuine user calls
// once per session.
export const REFRESH_THROTTLE_LIMIT = 10;
export const REFRESH_THROTTLE_TTL_MS = 60_000;
