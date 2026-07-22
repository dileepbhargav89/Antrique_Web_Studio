import { SetMetadata } from '@nestjs/common';

export const CACHE_CONTROL_MAX_AGE_KEY = 'cacheControlMaxAgeSeconds';

// Metadata only — no header-writing logic here, the same discipline
// permissions.decorator.ts/roles.decorator.ts follow.
// CacheControlInterceptor (common/interceptors/cache-control.interceptor.ts)
// reads this via Reflector and sets the actual response header.
//
// Milestone 12 (Performance Engineering) — "Implement... Cache-Control
// headers." Deliberately OPT-IN, per route, not a global default: this
// API is entirely tenant-scoped and RBAC-gated (CLAUDE.md's own non-
// negotiable rules) — most responses are permission-sensitive and must
// never be cached by a SHARED cache (a CDN, a corporate proxy), only by
// the calling client itself. `maxAgeSeconds` is always emitted as
// `Cache-Control: private, max-age=<n>` (see the interceptor) —
// `private` is not a caller-configurable option here, specifically so a
// route can never be annotated in a way that would leak one tenant's
// cached response to another through a shared cache. Applied only to
// routes this milestone's own audit confirmed are read-only and
// genuinely low-churn relative to their own request volume (see
// docs/architecture/performance.md for which routes, and why the rest
// were deliberately left unannotated).
export const CacheControl = (maxAgeSeconds: number): MethodDecorator & ClassDecorator =>
  SetMetadata(CACHE_CONTROL_MAX_AGE_KEY, maxAgeSeconds);
