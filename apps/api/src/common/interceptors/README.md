# Interceptors

`cache-control.interceptor.ts` (Milestone 12 — Performance Engineering) —
`CacheControlInterceptor`, the first real content here. Registered globally
via `APP_INTERCEPTOR` (`app.module.ts`); reads `@CacheControl(maxAgeSeconds)`
metadata (`common/decorators/cache-control.decorator.ts`) and, only when
present, sets `Cache-Control: private, max-age=<n>` on the response — every
unannotated route is untouched. See that decorator's own comment for why
`private` is not configurable, and `docs/architecture/performance.md` for
which routes are annotated and why.

Response shaping / trace_id propagation (CONTRIBUTING.md §15) remains
unscheduled — see `main.ts`'s bootstrap comment for exactly where it will
register when it lands.
