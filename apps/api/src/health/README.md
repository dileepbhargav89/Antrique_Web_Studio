# Health checks

Real as of Milestone 14 (Production Infrastructure). `GET /health/live`,
`GET /health/ready`, `GET /health/startup` — unauthenticated, unprefixed,
unversioned (see `health.controller.ts`'s own comment for why), `@SkipThrottle()`d.

`live` never checks a dependency (process-alive only). `ready`/`startup`
both check real database connectivity via `PrismaService.isHealthy()`
(built Milestone 12, first real caller here) and return `503` with a
structured `{status, timestamp, checks}` body when unhealthy. See
`health.service.ts`'s own comment for why `ready`/`startup` share the same
check logic today but remain distinct endpoints.
