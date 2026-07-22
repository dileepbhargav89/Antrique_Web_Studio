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
