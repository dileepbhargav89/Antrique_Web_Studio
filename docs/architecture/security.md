# Security Architecture

Defense in depth — no single control trusted alone. Highest redundancy on the two
existential properties: multi-tenant isolation and the credential/payment boundary.

**Status:** the target-state design below (Layers/Controls) predates real code;
Milestone 13 (Security Hardening) is the first pass that audits the actual,
shipped `apps/api` implementation against it end to end and closes the gaps a
production deployment cannot ship without, while explicitly deferring the
gaps that need infrastructure this milestone's own brief forbids introducing
(a WAF/CDN edge, a secrets vault/KMS, Redis). "Threat Model" through
"Remaining Accepted Risks" below are Milestone 13's own deliverables, written
against the code as it exists after that milestone's changes landed.

## Layers
Edge (WAF/DDoS/TLS/rate-limit/CORS) → Application (authn/authz/JWT/RBAC/validation/
encoding/CSRF/XSS defense/parameterized queries/upload safety) → Data (encryption
at rest+transit, RLS, least-privilege roles, secrets vault) → Operations (logging/
monitoring/backups/DR).

## Controls
- **Auth:** managed IdP (SSO/SAML) OR local email+password (Argon2id,
  Milestone 1 — apps/api/src/modules/auth/README.md), MFA (enforced for
  Admin), short sessions.
- **Authz:** RBAC action gate (`RolesGuard`/`PermissionsGuard`, Milestone
  3 — `apps/api/src/authorization/README.md`, `apps/api/src/common/guards/README.md`)
  + RLS row gate, both server-side; step-up for sensitive; 401/403/404
  discipline — `401` exclusively from `JwtAuthGuard`, `403` exclusively
  from `RolesGuard`/`PermissionsGuard`, never the reverse. Resolved
  *within the caller's real tenant* as of Milestone 4 (previously a fixed
  stopgap tenant) — see **Multi-tenancy** below.
- **JWT:** short-lived access + rotating refresh (reuse detection), verified on
  every guarded request (`JwtAuthGuard`, Milestone 2 —
  `apps/api/src/common/guards/README.md`; applied per-route so far, not yet
  globally), HTTP-only cookies, minimal claims, keys in vault. Deliberately
  carries no tenant claim (Milestone 4's own explicit requirement) — tenant
  resolution is a separate, per-request concern, never baked into the token.
  Algorithm pinned to `HS256` on both sign and verify as of Milestone 13 —
  see **Authentication Flow** below.
- **RBAC:** relational, per-tenant roles, least privilege, grants audited.
  Real as of Milestone 3: `RoleRepository`/`PermissionRepository`
  (`apps/api/src/authorization/`) resolve a user's roles/permissions
  database-driven (no hardcoded role→permission map anywhere), cached only
  within the single request that resolved them (Milestone 3) plus a 60s
  cross-request `CacheService` layer underneath (Milestone 12) — see
  `apps/api/src/authorization/README.md`. Every protected route in the API
  is RBAC-gated as of Milestone 5 onward; the three `example/` routes
  remain the reference demonstration.
- **Multi-tenancy:** real, request-based tenant resolution as of Milestone
  4 (`apps/api/src/tenant/README.md`), replacing the fixed
  `DEFAULT_TENANT_ID` stopgap Milestones 1–3 used. `TenantMiddleware`
  resolves once per request, before any guard/controller runs, priority
  hostname (subdomain-as-`Tenant.slug`) → `X-Tenant-ID` header
  (dev/testing) → `DEFAULT_TENANT_ID` (**development only**, confirmed
  live that `production`/`test` requests reaching this point instead get
  a clean `400`, never a silent default — the cross-tenant data-leak risk
  a silent default would create). Every candidate is independently
  validated against the database (`OrganizationRepository`'s `findActive*`
  methods) before being trusted. No RLS session-variable wiring added —
  the existing application-level `WHERE tenantId = X` filtering (now
  sourced from the resolved tenant instead of a hardcoded constant)
  remains the primary enforcement mechanism; RLS stays the documented
  backstop.
- **Rate limiting:** tiered by risk, protects auth endpoints. Real as of
  Milestone 13 — see **Abuse Protection** below.
- **CSRF:** SameSite cookies + anti-CSRF token on mutations; bearer clients immune.
  Not yet applicable — this API is Bearer-token-only, no cookie-based session
  exists anywhere in the codebase (confirmed, Milestone 13 audit) — see
  **Remaining Accepted Risks**.
- **CORS:** allowlist only, never wildcard-with-credentials. Real as of
  Milestone 13 — `app.enableCors()` in `main.ts`, driven by the
  already-validated `CORS_ALLOWED_ORIGINS` env var, `credentials: false`.
- **XSS:** output encoding + strict CSP + input sanitization + HTTP-only cookies
  (3 independent barriers). This API returns only `application/json`, never
  renders HTML — reflected/stored XSS in the classic browser sense has no
  attack surface here; CSP is still set (`default-src 'none'`) as defense in
  depth in case a client ever mishandles a response. See **Injection Review**.
- **SQLi:** parameterized queries only + boundary validation + least-privilege
  roles + RLS backstop. Confirmed, Milestone 13 audit: every query in the
  codebase goes through Prisma's query builder (parameterized by construction)
  except the two `$queryRaw` calls added in Milestone 12, both of which use
  tagged-template parameter binding (never string concatenation) — see
  **Injection Review**.
- **File upload:** direct-to-storage pre-signed, type/size allowlist, virus scan
  (quarantine on fail), private buckets/tenant keys, content-type enforced.
  Not built — no file-upload endpoint exists anywhere in this codebase as of
  Milestone 13 (confirmed by repo-wide search for `multer`/`@UploadedFile`/
  `FileInterceptor` — zero matches outside `node_modules`). Deferred until a
  real feature needs it.
- **Backups:** managed PITR, encrypted, tested restores documented. Deployment-
  infrastructure concern, out of `apps/api`'s own scope.
- **Secrets:** vault/KMS, never in code/repo, rotated, UI never shows plaintext.
  Confirmed, Milestone 13 audit: no secret is hardcoded anywhere in
  `apps/api/src` — every credential (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
  `DATABASE_URL`, etc.) is read exclusively through the validated `env.validation.ts`
  → per-domain `registerAs()` config chain, never a literal. A real vault/KMS
  is a deployment-infrastructure decision outside this milestone's scope
  ("do not introduce Redis" extends by the same logic to not introducing a new
  external secrets-management dependency) — see **Remaining Accepted Risks**.
- **Logging:** structured, no secrets/PII, immutable audit trail. Confirmed,
  Milestone 13 audit — see **Sensitive Data Review** and **Audit Logging**.
- **Monitoring:** anomaly alerts (failed logins, authz denials, rate-limit),
  synthetic checks, CVE scanning, periodic pen-test of the tenant boundary.
  The *events* this needs now exist in the structured log stream (failed
  logins, authz denials — Milestone 13); wiring them to an actual alerting
  system is a deployment-infrastructure concern, out of scope. CVE scanning:
  `pnpm audit`, run and documented this milestone — see **Dependency Security**.
- **DR:** IaC rebuild, replica + PITR, RPO/RTO targets, rehearsed drills.
  Deployment-infrastructure concern, out of `apps/api`'s own scope.

---

# Milestone 13 — Security Hardening

Scope: "transform the backend from feature-complete to production-secure" —
preserve all existing business functionality, no new business features, no
domain-model redesign, no breaking API changes. Every improvement below is
measurable (a passing test, a live-verified response header/status code, or a
`pnpm audit` line item) and documented with its own reasoning.

## 1. Threat Model

**Assets:** tenant business data (orders, customers, invoices, inventory —
every table carries `tenant_id`); user credentials (password hashes, JWTs);
the audit trail itself (proof of who did what).

**Actors:**
- Anonymous internet client — no credentials, can reach every route the
  network exposes, including ones that should reject them.
- Authenticated user of Tenant A — holds a valid JWT and a real role/permission
  set scoped to Tenant A only.
- A malicious or compromised authenticated user (insider threat, or a stolen
  token) — same capability as above, but intent to exceed their own grant.
- Operator with `pnpm audit`/dependency-supply-chain visibility — not an
  attacker of this app directly, but the surface a supply-chain compromise
  of a dependency would use.

**Trust boundaries:** the HTTP request itself (everything in it — headers,
body, query, path params — is untrusted until validated); the JWT (bears the
user's identity claim, but never a tenant claim — Milestone 4's own
deliberate design — so tenant trust is re-established per request, never
inherited from the token); the database connection (trusted once
established, but every query must still carry an explicit `tenant_id` filter
— RLS is the backstop, not the only gate, per `CLAUDE.md`).

**STRIDE-mapped top risks this milestone targeted, and their disposition:**

| Threat | Vector | Disposition |
|---|---|---|
| Spoofing | Forged/tampered JWT | Signature verification + algorithm pinning (§2) |
| Spoofing | Client-supplied `tenantId` in a request body overriding the resolved tenant | Confirmed DTOs never read a client-supplied tenant field; resolved tenant always comes from `TenantMiddleware`, never the body (§4, live-verified) |
| Tampering | SQL injection via unvalidated input | Parameterized queries only, verified for all raw SQL (§7) |
| Repudiation | No record of a denied access attempt or a login | `AUDIT_LOGGER` wired into login/refresh/permission-denial (§9) |
| Information Disclosure | Stack traces / internal errors in API responses | Verified against actual `BaseExceptionFilter`/Prisma error source (§10) |
| Information Disclosure | Secrets/passwords/tokens leaking into logs | Verified no log call sites serialize request bodies or auth headers (§8) |
| Denial of Service | Unbounded request bodies, credential-stuffing on `/auth/login` | Body-size limit + global + login-specific throttling (§5) |
| Elevation of Privilege | Missing guard on a sensitive route, or a tenant-boundary bypass | Every controller audited (§3), tenant-scoping audited (§4) |

## 2. Authentication Review

**JWT generation/verification.** `TokenService`
(`apps/api/src/jwt/token.service.ts`) wraps `@nestjs/jwt`. Access and refresh
tokens use independent secrets (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`,
both required, no default — `env.validation.ts`), confirmed by an existing
test that a refresh token fails access verification and vice versa. Expiry
is enforced by the library (`expiresIn`, config-driven TTLs) — confirmed by
an existing test asserting `TokenExpiredError` on a token minted with a
negative TTL.

**Algorithm pinning (Milestone 13).** Before this milestone, `sign()`/
`verify()` were called with no explicit `algorithm`/`algorithms` option —
relying entirely on `jsonwebtoken`'s own library defaults. A live regression
test already confirmed the library rejects a hand-crafted `alg: none` token
outright, so this was not an exploitable gap as shipped. It was still made
explicit: `JWT_ALGORITHM = 'HS256' as const` is now passed to every
sign/verify call site, and a new test
(`token.service.spec.ts` — "rejects a token signed with the correct secret
but a different algorithm (HS384)") proves the restriction is real, not
coincidental — a token signed with the *right* secret but HS384 is rejected,
which the library's own defaults alone would **not** have caught (HS384 is
a legitimate HMAC algorithm the library would otherwise accept). Defense in
depth: this makes the algorithm an explicit, reviewable line in this
codebase rather than an implicit property of a dependency's default.

**Replay / reuse.** Refresh-token rotation-with-reuse-detection (the
Controls section's own stated target) is not built — `refresh()` verifies
and reissues but does not track/revoke a used refresh token. This predates
Milestone 13 and remains a known gap — see **Remaining Accepted Risks**
(building it means adding token-family/session-state tracking, which is new
business logic, out of this milestone's "no domain-model redesign" scope).

**Logout.** Still a placeholder (`AuthService.logout()`), unchanged this
milestone — there is no server-side session/token state to invalidate yet,
consistent with the above.

**Password hashing.** Argon2id (`PasswordService`, Milestone 1), confirmed
unchanged and still the only hashing path — no plaintext-password code path
exists anywhere in the codebase (verified by search).

**Brute-force / timing attacks.** `AuthService.login()` was already
confirmed (prior milestones) to run the Argon2 compare against a real hash
even for a nonexistent email (a fixed dummy hash), avoiding a user-enumeration
timing oracle — unchanged. New this milestone: `POST /auth/login` now carries
its own `@Throttle({ default: { limit: 5, ttl: 60_000 } })`, a five-attempts-
per-minute-per-client budget stricter than the app-wide default — see §5.

**Login/refresh audit trail.** New this milestone — see §9.

## 3. Authorization Review

Every controller in the codebase was enumerated and its guard stack checked
against 401/403/404 discipline. Findings:

- Every business-module controller (Catalog, Bespoke, Inventory, Orders,
  Billing, CRM, Admin) is gated `@UseGuards(JwtAuthGuard, PermissionsGuard)`
  or `RolesGuard`, in that order — confirmed no controller anywhere skips
  `JwtAuthGuard` while still requiring identity (`request.user`).
  `AuthController` (`/auth/login`, `/auth/refresh`, `/auth/logout`) is
  correctly the one controller with **no** guard — these are the only routes
  an unauthenticated client is meant to reach.
- `RolesGuard`/`PermissionsGuard` both throw `ForbiddenException` (403) on
  denial, never 401 — confirmed unchanged; `JwtAuthGuard` remains the
  exclusive source of 401. No route was found returning 404 to mask a 403
  (a legitimate hardening pattern for resource-existence leaks, but not one
  this codebase currently uses anywhere, so introducing it now for only some
  routes would be an inconsistent, partial change — not undertaken this
  milestone).
- Privilege escalation via metadata: `@Roles()`/`@Permissions()` are
  `Reflector`-read compile-time decorators, not attacker-influenceable at
  request time — no route parameter or body field feeds into which
  roles/permissions a route requires.
- Permission inheritance: `AuthorizationService.resolvePermissionKeys()`
  resolves a user's actual grants from the database per request (cached, see
  Milestone 12); no code path grants a permission based on anything other
  than that resolved set.

**New this milestone: denial audit logging.** `RolesGuard`/`PermissionsGuard`
now log an `authz.role_denied`/`authz.permission_denied` audit event
(`AUDIT_LOGGER`, structured logs) immediately before throwing
`ForbiddenException`, capturing `actorId` (the caller's email), the resolved
`tenantId`, and both the required and actually-held role/permission sets —
see §9. New tests in both guards' spec files confirm a denial logs exactly
this and an allowed request logs nothing.

## 4. Multi-Tenant Isolation Review

- Every repository method that reads/writes a tenant-scoped table takes an
  explicit `tenantId` parameter and includes it in the `WHERE` clause —
  confirmed unchanged from prior milestones' own audits (Milestones 4–12
  each verified this for their own new module; Milestone 13 re-swept the
  full repository layer, found no new violation).
- `TenantMiddleware` resolves the tenant once, before any guard or
  controller — a controller/service has no code path to accept a
  client-supplied tenant identifier instead. Confirmed by grep: no DTO
  anywhere in `apps/api/src/modules/*/dto/` defines a `tenantId` field —
  every "tenant spoofing" attempt (a client sending `{"tenantId": "<some
  other org's id>"}` in a request body) has nothing to bind to; the field is
  silently dropped by the global `ValidationPipe`'s `whitelist: true` even if
  sent. Live-verified in this milestone's own smoke test (see §12): a
  client-supplied tenant-shaped field in a body is ignored, not trusted.
- Cross-tenant ID references (e.g., an order line's `productId`) are
  independently re-validated against the caller's *resolved* tenant by the
  owning service before use — this predates Milestone 13 (established
  Milestones 5–10, each new module's own cross-tenant-reference check) and
  was spot-re-confirmed, not re-built.
- RLS remains the documented backstop, unchanged this milestone — the
  application-level `WHERE tenant_id = X` filtering (sourced from the
  middleware-resolved tenant) is the primary enforcement layer, per
  `CLAUDE.md`'s "RLS is the backstop, not the only gate."
- Attempted privilege escalation between tenants: exercised live as part of
  this milestone's own validation — a request authenticated as a Tenant-A
  user, with `X-Tenant-ID` explicitly set to a different real tenant's id,
  correctly resolves against Tenant A's own `tenantContext` for RBAC (the
  header only participates in *tenant resolution* for anonymous/dev
  contexts per `TenantMiddleware`'s own priority order — an authenticated
  request's authorization decisions are never a function of a
  client-suppliable header). No cross-tenant data was returned in this test.

## 5. HTTP Security & Abuse Protection

**Helmet** (`apps/api/src/main.ts`), registered first in the middleware
chain so every response — including an early 4xx — carries these headers.
Verified live, header-by-header:

| Header | Value | Source |
|---|---|---|
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Explicit override — tighter than Helmet's own browser-page-oriented default, correct for a JSON-only API that never renders HTML |
| `Strict-Transport-Security` | Helmet default (`max-age=15552000; includeSubDomains`) | Helmet default — effective once TLS terminates upstream in production |
| `X-Content-Type-Options` | `nosniff` | Helmet default |
| `X-Frame-Options` | `SAMEDENY` (Helmet default) | Helmet default |
| `X-DNS-Prefetch-Control` | `off` | Helmet default |
| `Referrer-Policy` | `no-referrer` | Helmet default |
| `Cross-Origin-Opener-Policy` | `same-origin` | Helmet default |
| `Cross-Origin-Resource-Policy` | `same-origin` | Explicit override — this API's responses are never meant to be fetched as a sub-resource by an unrelated origin |
| `Cross-Origin-Embedder-Policy` | *(not set)* | **Deliberately omitted** — enabling it requires every cross-origin resource a future frontend embeds to itself carry a matching CORP header; real coordination cost, no current benefit for a pure JSON API embedding nothing |
| `X-Powered-By` | *(removed)* | Helmet default — avoids advertising the Express/Nest stack fingerprint |

**CORS** (`app.enableCors()`, `main.ts`) — explicit allowlist via
`CORS_ALLOWED_ORIGINS` (already-validated env var, unused before this
milestone). An empty/unconfigured list means **no** cross-origin browser
request is ever allowed — a safe, deny-by-default outcome, not an accidental
wildcard. `methods` is the exact verb set the API actually exposes (repo-wide
sweep confirmed no route uses `PUT`). `credentials: false` — this API is
Bearer-token authenticated only, never cookie-based, so CORS's "credentials"
mode (governing cookies/TLS client certs, not the `Authorization` header) has
nothing to opt into; `Authorization` is listed in `allowedHeaders` regardless.
Live-verified: the configured origin is allowed, an unlisted one is rejected.

**Rate limiting** (`@nestjs/throttler`, in-memory — no Redis introduced, per
this milestone's own explicit constraint). App-wide default via
`ThrottlerModule.forRootAsync()` in `app.module.ts`, driven by the
already-validated-but-previously-unused `RATE_LIMIT_WINDOW_MS`/
`RATE_LIMIT_MAX` env vars (default 100 requests / 60s per client, tracked by
IP — `ThrottlerGuard`'s own default key), registered globally via
`{ provide: APP_GUARD, useClass: ThrottlerGuard }`. `POST /auth/login`
carries a stricter override, `@Throttle({ default: { limit: 5, ttl: 60_000
} })` — hardcoded, not env-configurable, a deliberate fixed security policy
(unlike the general limit, which is a legitimate per-deployment capacity
tuning knob, "5 attempts per minute" is not something a deployment should
need to loosen).

**Request size limits.** `NestFactory.create(AppModule, { bodyParser: false
})` disables Nest's own default body-parser wiring so an explicit limit
governs every request instead of an undocumented library default:
`app.use(json({ limit: '256kb' }))` / `app.use(urlencoded({ extended: true,
limit: '256kb' }))`. `256kb` is a fixed string literal, never computed or
env-driven — deliberately, because the `body-parser` DoS this milestone's own
dependency audit found (`GHSA-v422-hmwv-36x6`) is specifically triggered by
an *invalid* limit value (unparseable string/NaN) silently disabling
enforcement; a fixed literal can never be invalid. Every real DTO body in
this API is a small business object (the largest, a multi-line order create,
is comfortably under 10KB) — 256KB is generous headroom while staying far
below DoS scale. Live-verified: an oversized body is rejected with `413`.

**Timeout handling.** No application-level request timeout exists (relies on
the upstream load balancer / Node's own defaults) — not added this
milestone; see **Remaining Accepted Risks**.

## 6. Input Validation Review

Global `ValidationPipe` (`apps/api/src/common/pipes/validation-pipe.options.ts`,
unchanged this milestone, re-audited): `whitelist: true` (strips any field not
declared on the target DTO), `forbidNonWhitelisted: false` (reviewed this
milestone — kept as-is; flipping it to `true` would turn "extra field silently
dropped" into "extra field rejected with 400," a stricter-but-behavior-changing
default this milestone's own "no breaking API changes" constraint argues
against changing without a product decision), `transform: true`,
`forbidUnknownValues: true`. Nested DTOs and array bodies were spot-checked
across Catalog/Orders/Billing/CRM/Admin — all use `@ValidateNested()` +
`@Type()` correctly (pre-existing, unchanged). Enum fields use
`class-validator`'s `@IsEnum()` throughout — confirmed no free-text field
backs what should be a closed set. No upload-validation section applies —
no upload endpoint exists (§ Controls, "File upload").

## 7. Injection Review

- **SQL injection:** every query goes through Prisma's query builder
  (parameterized by construction) except two `$queryRaw` calls
  (`InventoryRepository`, Milestone 12's own analytics rewrite) — both
  re-read this milestone and confirmed to use `Prisma.sql`/tagged-template
  parameter binding for every dynamic value (tenant id, thresholds), never
  string concatenation. No other raw SQL exists anywhere in `apps/api/src`.
- **NoSQL/command/header injection:** not applicable — no NoSQL store, no
  shell/child-process invocation anywhere in request-handling code, no
  response header is ever built from unsanitized request input (all headers
  set by this app come from Helmet/CORS/Nest's own fixed logic).
- **Response splitting:** not reachable — no code path writes a raw header
  value from user input.
- **Template injection:** no template-rendering engine is used anywhere
  (JSON-only API).
- **Path traversal:** no filesystem read/write is ever driven by request
  input (no upload/download/static-file-serving endpoint exists).
- **Open redirect:** no redirect response is issued anywhere in the codebase.
- **SSRF:** no outbound HTTP call is ever constructed from request input
  anywhere in `apps/api/src` (confirmed by search for `fetch`/`axios`/`http.request`
  outside test/tooling code) — this app makes no server-side requests to
  attacker-influenceable URLs.
- **XXE:** no XML parser is used anywhere (JSON-only API, confirmed by
  dependency tree — no `xml2js`/`fast-xml-parser`/similar in `dependencies`).

## 8. Sensitive Data Review

Verified, call site by call site: `HttpLoggingMiddleware` logs method/path/
status/duration only — never the request body, never headers. Login/refresh
audit events (§9) log `email` (already the user's own identifier, appropriate
for an audit trail) and outcome/metadata, never a password or token value.
`ExceptionLoggingFilter` logs the exception's message/stack, not the
triggering request body — confirmed no DTO's `toString()`/serialization is
ever logged. `LoginResponseDto`/`RefreshResponseDto` return only the issued
tokens and non-sensitive user fields — confirmed the submitted password is
never echoed back (live-verified, §12). No `Authorization` header value, no
raw `DATABASE_URL` (which itself contains a credential), and no JWT secret is
ever passed into any `Logger`/`AuditLogger` call site anywhere in the codebase
(confirmed by grep for the relevant config keys against every `.log(`/
`.error(`/`.warn(` call site).

## 9. Audit Logging

Two intentionally distinct audit mechanisms exist in this codebase, a
Milestone 13 finding worth stating explicitly rather than leaving implicit:

1. **`AUDIT_LOGGER`/`AuditLoggerService`** (`apps/api/src/logging/`, built
   Phase 1.2C.8, structured-log-only — writes to the same log stream as every
   other log call, never persisted to a table). Newly wired this milestone
   into: `user.login` (SUCCESS/FAILURE, `AuthService.login()`), `user.token_refresh`
   (SUCCESS/FAILURE, `AuthService.refresh()`), `authz.role_denied`/
   `authz.permission_denied` (FAILURE, `RolesGuard`/`PermissionsGuard`).
   Deliberately chosen over the DB-persisted mechanism below specifically to
   avoid a backwards dependency: `AuthModule` and the common `guards/`
   package are cross-cutting, imported by nearly every other module, so
   depending on the architecturally-downstream `AdminModule` (which owns the
   DB-persisted audit table) would invert the dependency graph this
   codebase has kept a clean one-directional DAG since Milestone 1.
2. **`AuditLog` (DB table) / `AuditRepository` / `AuditService`** (owned by
   `AdminModule`, built Milestone 11) — append-only (UPDATE/DELETE revoked at
   the database-privilege level), queryable via `GET /audit-logs`. Records
   admin-initiated operations and `notification.retry()` (Milestone 11's own
   one real mutation-with-a-route). Unchanged this milestone.

**These two are not currently unified into one queryable source.** A security
operator investigating "who tried to access what and failed" today needs
the structured log stream for auth/authz events and the `/audit-logs` route
for admin operations — not a single query. This is a deliberate, documented
scope boundary for this milestone (unifying them means either giving
`AuthModule` a dependency on `AdminModule` or moving `AuditLog` persistence
into a lower-level shared module — both a real architectural change, out of
"no domain-model redesign") — see **Remaining Accepted Risks**.

Password change and notification-retry audit coverage: password change has
no route yet (no such endpoint exists in the codebase); notification retry
already wrote an `AuditLog` entry as of Milestone 11, unchanged.

## 10. Error Handling Review

Verified against the actual installed framework source (not assumed):
NestJS's `BaseExceptionFilter.handleUnknownError()` returns a fixed generic
`{"statusCode":500,"message":"Internal server error"}` for any thrown value
that is not an `HttpException`, unless that value has **both** an own
`.statusCode` and `.message` property (its `isHttpError()` duck-type check).
Confirmed by grep that no code anywhere in this app ever attaches a custom
`.statusCode` to a thrown error, and by a throwaway script that Prisma's own
error classes (`PrismaClientKnownRequestError`, etc.) have no `.statusCode`
property either — so a database error thrown and left uncaught can never
leak Prisma's internal error shape or a stack trace into a response body.
`ExceptionLoggingFilter` (Phase 1.2C.6, unchanged) logs the full
exception server-side for every unhandled error while preserving Nest's
default client-facing response shape — the split this milestone confirmed is
correct: full detail in the log, generic detail in the response. Live-verified:
an unknown route returns `404` with no stack trace; a malformed-email login
returns `400` with a validation message only, no internal detail.

## 11. Dependency Security

`pnpm audit` (workspace-wide) reports 16 findings: 3 high, 9 moderate, 4 low.
Every one was individually traced to its dependency path and assessed for
**reachability** in this app's actual runtime code paths — presence in the
tree is not the same question as exploitability:

| Package | Severity | Path | Reachable? | Disposition |
|---|---|---|---|---|
| `glob` (CLI cmd injection) | High | `@nestjs/cli` dev tooling | No — dev-only, and the vulnerable `-c/--cmd` flag is never invoked by this project's own scripts | Deferred — bumping via override would force every `glob` resolution in the tree, including Jest's own deeply-nested `glob@7.2.3` dependents (confirmed via `pnpm list glob --recursive`), a real regression risk for near-zero benefit on a dev-only tool |
| `picomatch` (ReDoS, method injection) | High/Moderate | `@nestjs/cli` → `@angular-devkit/*` dev tooling | No — dev-only build tooling | Deferred, same reasoning |
| `tmp` (path traversal, arbitrary file write) | High/Low | `@nestjs/cli` → `inquirer` dev tooling | No — dev-only, this project's own scripts never invoke the CLI's interactive schematics that use it | Deferred |
| `ajv` (ReDoS via `$data`) | Moderate | `@nestjs/cli` → `@angular-devkit/core` dev tooling | No — dev-only | Deferred |
| `file-type` (infinite loop, zip-bomb DoS) | Moderate | `@nestjs/common` (bundled, for its unused `FileTypeValidator` pipe) | No — no file-upload endpoint exists anywhere in this app; the vulnerable parser is never invoked | Documented, not exploitable |
| `@nestjs/core` (SSE output-neutralization) | Moderate | `@nestjs/core` runtime dependency | No — the vulnerable code path is `SseStream._transform()`; this app has zero `@Sse()` endpoints anywhere | Documented, not exploitable |
| `@hono/node-server` (static-serve middleware bypass) | Moderate | `prisma` → `@prisma/dev` (Prisma's own dev CLI helper) | No — dev-only tooling, not part of the runtime bundle, and this app serves no static files through it | Deferred |
| `uuid` (buffer bounds check) | Moderate | `autocannon` (Milestone 12's own benchmark tooling) → `hyperid` | No — dev-only, used only when manually running `benchmarks/run-benchmarks.js`, never in the shipped app | Deferred |
| `qs` (stringify DoS with `encodeValuesOnly`) | Moderate | `body-parser`/`express` runtime dependency | No — confirmed by search that this app's own code never calls `qs.stringify()`, and body-parsing only ever calls `qs.parse()` (parsing, not the vulnerable stringify path) | Documented, not exploitable |
| `postcss` (XSS in CSS stringify) | Moderate | `apps/web` → `next` (a different workspace app) | Out of scope — not part of `apps/api` | Out of scope for this milestone |
| `webpack` (build-time SSRF via `buildHttp`) ×2 | Low | `@nestjs/cli`/`ts-loader` build tooling | No — build-time only, and this project's webpack config never enables the experimental `buildHttp` feature the advisory requires | Deferred |
| `body-parser` (DoS via invalid `limit` value) | Low | `express`/`@nestjs/platform-express` runtime dependency | Mitigated independently of a version bump — this milestone's own explicit body-size limit (§5) uses a fixed string literal that can never be the invalid/unparseable value this advisory requires, so the vulnerable state is unreachable regardless of the installed `body-parser` version | Mitigated at the application layer |

**Overrides applied** (`pnpm.overrides`, root `package.json`) — the only two
findings judged low-risk enough to force a version bump directly, both
verified via `pnpm why` to resolve to one consistent version tree-wide with
no conflicting parallel install: `multer` → `^2.2.0`, `lodash` → `^4.18.1`.
`glob` was considered and explicitly rejected for the same treatment — see
table above.

**Zero critical findings. Zero high/moderate findings reachable from this
app's actual runtime request-handling code.** Every deferred finding is
dev-only tooling or a build-time-only concern; every runtime-reachable
package's flagged version either doesn't reach the vulnerable code path in
this app's usage, or (body-parser) is already mitigated at the application
layer independent of the library version.

## 12. Validation Results

- `pnpm lint` — clean, zero errors/warnings.
- `pnpm typecheck` — clean, zero errors.
- `pnpm build` — clean production build.
- `pnpm test` — **155 suites / 893 tests, all passing** (up from 155/883 at
  the end of Milestone 12 — 10 new tests: JWT algorithm-pinning regression,
  login/refresh audit-logging coverage in `auth.service.spec.ts`, denial
  audit-logging coverage in both `roles.guard.spec.ts`/
  `permissions.guard.spec.ts`), zero regressions.
- `pnpm audit` — 16 findings, all triaged, zero reachable from runtime code
  (§11).
- Live boot (`node dist/src/main.js`) — zero DI resolution errors, confirmed
  clean startup log.
- Live smoke test, 13/13 checks passed:
  1. Security headers present on every response (Helmet).
  2. CORS allows the configured origin, rejects an unlisted one.
  3. JWT: malformed token rejected with 401.
  4. JWT: token with a tampered signature rejected with 401.
  5. JWT: missing token rejected with 401.
  6. RBAC: customer role forbidden from the admin-only audit-logs route (403).
  7. RBAC: admin role allowed on the audit-logs route (200).
  8. Tenant isolation: a client-supplied tenantId-shaped field in a request
     body is ignored, not trusted.
  9. Request size limit: an oversized body is rejected with 413.
  10. Input validation: a malformed email on login is rejected with 400.
  11. Input validation: unknown extra fields are silently stripped
      (whitelist), not smuggled through.
  12. Error handling: an unknown route (404) reveals no stack trace.
  13. Sensitive data: the login response never echoes the submitted password.

### OWASP Top 10 (2021) mapping

| Category | Status | Where |
|---|---|---|
| A01 Broken Access Control | Addressed | §3, §4 — guard audit, tenant isolation, live-verified |
| A02 Cryptographic Failures | Addressed | Argon2id passwords, HS256-pinned JWTs (§2); TLS terminates upstream (deploy topology, unchanged) |
| A03 Injection | Addressed | §7 — SQL/command/template/XXE/SSRF reviewed, no reachable vector found |
| A04 Insecure Design | Addressed | §1 Threat Model; tenant-resolution-never-from-client-input is an explicit design invariant (§4) |
| A05 Security Misconfiguration | Addressed | §5 — Helmet headers, explicit CORS allowlist, explicit body-size limit (all previously either absent or implicit-default) |
| A06 Vulnerable/Outdated Components | Addressed | §11 — full `pnpm audit` triage, 2 overrides applied, rest reachability-analyzed and documented |
| A07 Identification & Authentication Failures | Addressed | §2 — algorithm pinning, login throttling; refresh-token reuse detection remains a documented gap (Remaining Accepted Risks) |
| A08 Software & Data Integrity Failures | Partially addressed | Dependency integrity via `pnpm`'s lockfile + `pnpm audit`; no code-signing/SRI concern exists (server-side API, no client assets served) |
| A09 Security Logging & Monitoring Failures | Addressed | §9 — login/refresh/authz-denial audit events now real; alerting/anomaly-detection wiring remains a deployment-infrastructure concern (Remaining Accepted Risks) |
| A10 Server-Side Request Forgery | Addressed | §7 — no outbound request is ever constructed from request input anywhere in the codebase |

## 13. Remaining Accepted Risks

Explicitly deferred, with reasoning, rather than silently left unstated:

- ~~**No refresh-token rotation/reuse detection.**~~ **Closed by Phase 10,
  Module 4** (§17) — `refresh()` now looks up a persisted `Session` row,
  rotates on every call, and revokes the whole session family on a
  detected replay.
- **No CSRF protection.** Not applicable today (Bearer-token-only API, no
  cookie-based session anywhere), but would become a real gap the moment any
  future feature introduces cookie-based auth — flagged so that feature
  doesn't ship without revisiting this.
- **The two audit-logging mechanisms (structured-log vs. DB-persisted) are
  not unified.** See §9 — a real operational gap for anyone trying to build
  one holistic security-event view, deliberately not fixed this milestone to
  avoid inverting the module dependency graph or moving `AuditLog` ownership.
- **No application-level request timeout.** Relies entirely on the upstream
  load balancer / Node defaults; a slow-loris-style connection-holding attack
  isn't defended at the application layer.
- **No secrets vault/KMS.** Secrets are read from environment variables
  (validated, never hardcoded — §"Secrets" above) but not rotated
  automatically or stored in a dedicated secrets-management system —
  consistent with this milestone's "do not introduce Redis"-style constraint
  against adding new infrastructure dependencies, but a real gap versus the
  target-state Controls section at the top of this document.
- **Nine dependency-audit findings deferred** (glob/picomatch/tmp/ajv/
  @hono-node-server/uuid — all dev-only tooling; webpack ×2 — build-time
  only). None reachable at runtime (§11), but they remain present in the
  dependency tree and should be revisited whenever `@nestjs/cli`/`prisma`
  itself is next upgraded (their own transitive versions will likely move
  together).
- **MFA, managed-IdP/SSO, and WAF/CDN-edge protections** from the
  target-state Controls section remain unbuilt — all are deployment/product
  decisions outside `apps/api`'s own code, unchanged by this milestone.

## 14. Milestone 14 dependency delta (Production Infrastructure)

Milestone 14 added `@nestjs/swagger`/`swagger-ui-express` as real, production
(not dev-only) dependencies — `pnpm audit` accordingly grew from 16 findings
(§11) to 20: three new `js-yaml` findings (`GHSA-52cp-r559-cp3m`, high —
quadratic-CPU merge-key chains; `GHSA-mh29-5h37-fv8m`/`GHSA-h67p-54hq-rp68`,
both moderate — prototype pollution and a related quadratic-complexity DoS
via merge, all three via `@nestjs/swagger`'s own `js-yaml@4.1.0`
dependency) plus one more `@hono/node-server` finding
(`GHSA-frvp-7c67-39w9`, moderate — path traversal via encoded backslash;
same `prisma` dev-tooling chain already documented in §11 as dev-only).
Applying the same
reachability discipline §11 established: `@nestjs/swagger` only ever calls
`js-yaml`'s `dump()` (serializing its own internally-generated OpenAPI
document to the `/api/docs-yaml` route) — never `load()`/`safeLoad()`, the
function both `js-yaml` findings require, on any request-supplied input. No
route anywhere in this codebase parses attacker-supplied YAML. Combined with
Swagger itself being off by default outside `SWAGGER_ENABLED=true` (and
double-gated in production — §5/§6), this is a dependency-tree presence, not
an exploitable path, under the same standard §11's table already applies.
Not re-triaged as a full table here — see §11 for the methodology; this is a
delta note, not a restatement.

## 15. Automated dependency/container vulnerability gating (engineering polish pass)

Two mechanisms now enforce this section's own findings in CI, rather than
relying on someone re-reading this document before every merge:

- **Dependency audit:** `apps/api/audit-allowlist.json` is the
  machine-checked index of every finding in §11/§14 (keyed by GHSA id, with
  a short reachability reason and a pointer back to the relevant section
  here) — `apps/api/scripts/check-audit-allowlist.js` runs `pnpm audit
  --json`, diffs every current finding against that list, and fails CI
  (`.github/workflows/ci.yml`'s `dependency-audit` job) only on a finding
  that ISN'T already documented there. A genuinely new vulnerability fails
  the build with the full finding detail printed; the 20 already-accepted
  ones never cause noise.
- **Container image scanning:** Trivy (`.github/workflows/ci.yml`'s
  `container-security-scan` job, part of `docker-build`) scans the actual
  built `runtime` image — OS packages and application dependencies both —
  failing only on HIGH/CRITICAL findings; a full, unfiltered report
  (including LOW/MEDIUM) is still printed for visibility. Accepted
  container-level findings, if any are found and triaged, go in
  `.trivyignore` (currently empty — no scan has run against a real build
  in this development environment, since Docker itself isn't available
  here; the first real CI run is what populates this list, following the
  exact same reachability-first discipline this document already
  established for `pnpm audit`). See `docs/architecture/container.md`
  "Container security scanning."

## 16. Phase 10, Module 3 — Security Hardening (2026-07-30)

Audited the full module brief (CSP, HSTS, CSRF, rate limiting, secure
cookies, XSS, SQL injection, input sanitization, file upload/MIME
validation, secure headers, OWASP coverage) plus the RLS gap flagged in
Module 1's own blockers.md entry.

### 16.1 RLS `SET LOCAL` wiring — closed

**The gap:** `database-schema.md`'s own documented RLS contract
(`SET LOCAL app.current_tenant_id`, inside the same transaction as every
query) was never actually issued anywhere in application code — the app
layer's own `WHERE tenantId = ...` scoping (confirmed present on every
query) was doing 100% of real enforcement; RLS itself was a dormant
backstop.

**The fix:** `PrismaService` (`apps/api/src/database/prisma.service.ts`)
now:
- Wraps every model-delegate call in a transaction that issues
  `SELECT set_config('app.current_tenant_id', $tenantId, true)` first,
  via a `$extends` `$allOperations` query hook, monkey-patching this
  instance's own model-delegate properties so every existing repository
  call site (including `BaseRepository`'s early-captured `delegate`)
  gets this treatment with zero repository file changes.
- Overrides the interactive `$transaction()` form so application code's
  own `repository.runInTransaction(async (tx) => {...})` calls
  (Order/Invoice/Payment/Lead/FollowUp/Quotation) get the same
  `set_config` at the top of their existing transaction — one call per
  transaction, not one per statement inside it.
- `tenantId` comes from a new `TenantRlsContextService`
  (`AsyncLocalStorage`, mirroring `logging/request-context.service.ts`'s
  established pattern), seeded by `TenantMiddleware` — the same
  `run()`-wraps-`next()` propagation pattern `HttpLoggingMiddleware`
  already uses.

**Two real design risks found and resolved before shipping** (see
decisions.md's 2026-07-30 RLS entry for the full account — summarized
here):
1. A naive version opened the wrapping transaction on `this`/`super`
   (the same, already-patched client instance) — confirmed via two
   throwaway spikes and then a LIVE regression that every request
   (including `login`) failed with Prisma's own "Unable to start a
   transaction in the given time" (P2028): the `tx` an interactive
   transaction hands back inherits whatever client instance opened
   it, so a `tx` derived from an already-patched `this` ALSO carries
   the patched (hook-triggering) model delegates — any
   `tx.someModel.method()` call inside re-triggered the same hook,
   which opened ANOTHER transaction, recursing until the connection
   pool was exhausted. Fixed with a second, entirely separate,
   never-patched `PrismaClient` instance (`rawTxClient`, own
   adapter/pool) used ONLY to open these transactions — verified live
   (login + 30 sequential list-endpoint requests, zero errors) after
   the fix.
2. `BaseRepository.findManyAndCount()`'s array-form
   `$transaction([findMany, count])` (exists so both queries share one
   snapshot) now has each array member independently open its own
   SET-LOCAL transaction when RLS context is active — a deliberate,
   documented trade-off (near-simultaneous rather than truly shared
   snapshots; `total` could theoretically disagree with `items` by one
   row under a rare concurrent write) judged acceptable against the
   actual security value of RLS coverage on every read. See that
   method's own comment.

**Verified live** (compiled build, real local Postgres, `LOG_LEVEL=debug`):
`set_config` calls visibly firing per request, correct real data
returned from `/leads`/`/orders`, zero errors across a 30-request
stress test. Not yet tested against the actual `antrique_app`/
`antrique_service` least-privileged roles (no local password configured
for them — deliberately, per the RLS migration's own comment) — the
current dev `DATABASE_URL` uses the owner role, which bypasses RLS
regardless of session variables, so this wiring is a verified-safe
no-op in the default dev configuration and only becomes protective once
a deployment's `DATABASE_URL` points at the least-privileged role, per
`database-schema.md`'s own existing production guidance.
`isPlatformAdmin`/`isServiceContext` (the other two RLS session
variables) are intentionally NOT wired — no live caller needs them yet
(no cross-tenant admin endpoint, no DB-touching scheduled job) — see
`TenantRlsContextService`'s own comment for how a future one would seed
them.

### 16.2 apps/web security headers — closed, with a real near-miss

`apps/api`'s Helmet setup only ever covered its own JSON responses —
`apps/web`'s pages/assets had zero security headers. Added a `headers()`
block to `next.config.mjs`: CSP, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
HSTS.

**A genuine near-miss, caught only by live browser verification:** the
first CSP version (`script-src 'self'`, no `'unsafe-inline'`) shipped a
completely blank app — every route, zero visible content, ZERO console
errors of any kind (no CSP violation message either). `next build`,
`tsc`, and `curl` all reported success (the server-rendered HTML
contained real, substantial content — the blank was 100% client-side).
Root cause: the App Router streams RSC payloads and Suspense-reveal
calls via inline `<script>self.__next_f.push(...)</script>` tags on
every page; blocking inline scripts silently breaks the hydration/
streaming-reveal mechanism, leaving the root wrapper's `hidden=""`
attribute never removed. Diagnosed by systematically ruling out other
causes (fresh tab, non-canvas page, a known-good external site, an A/B
test with headers fully disabled) before finding the actual CSP
directive at fault. Fixed by adding `'unsafe-inline'` to `script-src`
too (same trade-off already accepted for `style-src`) — a nonce-based
strict CSP is the tighter alternative but needs per-request nonce
plumbing this app doesn't have today, tracked as a follow-up. Re-verified
live (marketing homepage + portal login page, fresh tabs, zero CSP
violations, real visible content) after the fix.

**Why this matters beyond this one fix:** `next build`/`tsc`/`curl` all
passed against the broken version — none of them execute client-side
JavaScript. This is the concrete case for why `CLAUDE.md`'s own "start
the dev server and use the feature in a browser" rule exists, not a
formality — a CSP change is exactly the class of regression static
checks cannot catch.

### 16.3 Auth endpoint throttling — extended

`POST /auth/refresh` (a credential-exchange endpoint, same risk class as
login) previously shared only the general 100-req/min app-wide default.
Now has its own `@Throttle` override, 10/min — looser than login's 5/min
since a real client legitimately calls refresh periodically across
multiple open tabs, unlike login. `POST /auth/logout` was left on the
general default — a genuine placeholder with no server-side session
state to protect (see that route's own comment), no credential-exchange
risk to throttle against.

### 16.4 File upload — MIME verification fixed, virus-scan extension point added

- **MIME verification gap closed:** `ProductImageService.upload()`
  previously stored the object in S3 with the CLIENT-CLAIMED
  `Content-Type` multipart header, not the sniffed real type — the
  controller's `FileTypeValidator` already sniffs real magic bytes to
  enforce the allowed-type allowlist, but didn't expose the detected
  type back to the service layer for reuse. Now re-sniffed via
  `file-type`'s own `fileTypeFromBuffer()` (dynamic `import()` — the
  package ships ESM-only) and used for the stored object's
  `Content-Type`, falling back to the client-supplied value only if
  sniffing returns nothing. Verified live against real storage: a file
  uploaded with a deliberately mismatched multipart `Content-Type`
  (`image/jpeg` claimed, real PNG bytes) was stored and served back with
  `Content-Type: image/png` — the sniffed type, not the claimed one.
- **Virus-scanning extension point** (`apps/api/src/utils/
  malware-scan.util.ts`) — a documented no-op, not a real scanner (no
  ClamAV daemon/cloud scanning API is provisioned; standing one up is
  its own infrastructure decision outside this module's scope). Every
  upload call site already calls it, in the right place (after size/
  MIME-allowlist validation, before the file reaches object storage) —
  wiring a real scanner later means implementing this one function's
  body, not finding and adding a new call site to every upload path.

### 16.5 CSRF — audited, no code change; reasoning now documented

No CSRF token/middleware exists anywhere, which looked like a gap until
tracing the actual cookie/auth architecture: `apps/api` is Bearer-token-
only (`credentials: false` in CORS config, confirmed — see §5 above) and
never reads cookies for authentication. The only ambient cookie in the
whole system is `apps/web`'s own httpOnly session cookie
(`lib/auth/session-cookie.ts`, `SameSite: 'lax'`), consumed exclusively
by that same app's own same-origin Route Handlers (`/api/auth/*`) — a
cross-site request has no ambient credential to ride on against either
app. Residual, accepted risk: `SameSite=lax` still permits the cookie on
top-level cross-site GET navigations, but no route here changes state on
GET. Not a gap to close — the architecture itself already prevents the
attack CSRF tokens exist to stop; this section exists so that reasoning
is explicit rather than implicit.

### 16.6 SQL injection — audited, confirmed clean

Every raw-SQL call site in `apps/api/src` (the inventory-repository
aggregate queries from Milestone 12, this module's own new
`set_config()` calls) uses either Prisma's tagged-template `$queryRaw`
(auto-parameterized) or `$executeRawUnsafe` with genuine placeholder
arguments (`$1`, `$2`, ...), never string-interpolating untrusted input
directly into SQL text. The one hardcoded `$executeRawUnsafe` call
(`prisma/seed.ts`) takes a fixed literal string, no interpolation at
all. No injection risk found.

### Validation

`pnpm --filter @antrique/api typecheck`/`lint`/`test` clean — 187 suites
(+1 new: `product-image.service.spec.ts`), 1086 tests (+5). `pnpm
--filter @antrique/web typecheck`/`lint`/`build` clean. Live-verified:
RLS wiring (compiled API build, real Postgres, 30-request stress test),
CSP fix (real browser, marketing + portal pages, zero console
violations), file-upload MIME fix (real multipart upload against real
S3-compatible storage, verified served `Content-Type`).

## 17. Phase 10, Module 4 — Authentication & Session Security (2026-07-30)

Audited the full module brief (session management, refresh-token
rotation/reuse detection, account lockout, concurrent-session limits,
MFA, password policy, JWT hardening) against the actual `AuthService`/
`AuthController` code and the previously-unused `Session` model in
`schema.prisma` (doc-commented "rotating refresh, reuse detection" since
it was first added, never wired up).

### 17.1 Refresh-token rotation + reuse detection — closed

**The gap:** `refresh()` was stateless — it verified a submitted refresh
token's signature/expiry and reissued a fresh pair, but never checked
whether that specific token had already been used. A leaked refresh
token stayed valid for its full 30-day TTL with no way to invalidate it
early, and the same token could be replayed indefinitely.

**The fix:** every `login()`/`refresh()` call now persists a `Session`
row (`SessionRepository`, new) keyed by the SHA-256 hash of the issued
refresh token (never the raw token — same "never store the credential
itself" reasoning as password hashing). `refresh()` looks the presented
token up by hash:
- No matching session → plain `401` (unknown/never-issued token).
- Session found but `revokedAt` is already set → the token has already
  been rotated away and is being replayed. Treated as a theft signal:
  `401`, AND every other active session for that user is revoked
  (`revokeAllActiveForUser()`) — a blunt "kill the whole family" rather
  than trying to walk just the specific rotation chain, the safer
  default when one token in a user's history is confirmed compromised.
- Session found, active, but past its own `expiresAt` → `401`.
- Otherwise: the presented session is marked rotated
  (`revokedAt` + `replacedBySessionId`) and a new session is created for
  the freshly-signed pair.

`logout()` is now real too — revokes the session matching the given
`LogoutRequestDto.refreshToken` (optional, for backward compatibility
with the previous no-body contract; a no-op success without one,
deliberately idempotent for an already-revoked/invalid token). New
`GET /auth/sessions`/`DELETE /auth/sessions/:id` (JWT-guarded, scoped to
the caller's own sessions only) give users real device/session
management ("sign out this device").

### 17.2 Account lockout — closed

**The gap:** no defense against a sustained password-guessing attack
beyond the existing per-IP login throttle (`@Throttle`, 5/min, Module
3) — an attacker distributing attempts across IPs (or simply waiting
out the throttle window) could brute-force a weak password
indefinitely.

**The fix:** `User.failedLoginAttempts`/`lockedUntil` (new columns,
migration `20260730180000_add_account_lockout`). A wrong password
increments the counter; hitting `MAX_FAILED_LOGIN_ATTEMPTS` (5) sets
`lockedUntil` 15 minutes out (`ACCOUNT_LOCKOUT_DURATION_MS`). A locked
account is rejected before any password comparison runs (same
short-circuit-before-`compare()` shape the existing "no such
user"/"no password hash" paths already used). A successful login resets
both fields. This is a second, independent layer from the per-IP
throttle — one is per-account, the other per-client — deliberately
redundant, not a replacement for either.

### 17.3 Concurrent session limit — closed

A user logging in for the 6th simultaneous time now evicts their oldest
still-active session (`MAX_CONCURRENT_SESSIONS` = 5,
`findOldestActiveForUser()` + `revoke()`) rather than accumulating
sessions without bound.

### 17.4 JWT `jti` — closed

Both `buildAuthTokenPayload()`/`reissueAuthTokenPayload()`
(`mappers/auth-token-payload.mapper.ts`) now mint a fresh `randomUUID()`
`jti` claim on every call — closes the token-collision risk those
functions' own comments had flagged since Phase 1.2D.9 (two tokens
signed for the same email in the same second would otherwise be
byte-identical once `iat`/`exp` also collide at one-second resolution).
Not used as a revocation-list key anywhere — revocation is handled at
the session layer (§17.1), not via a `jti` blacklist.

### 17.5 MFA and password policy — audited, out of scope, documented

**MFA:** no real implementation exists. A documented no-op extension
point (`mfa-verification.util.ts`'s `verifyMfaIfEnrolled()`) is called
from `login()` at the point a real check would run, so wiring a real
provider later is additive (no `login()` restructuring needed) rather
than requiring this module's control flow to change again.

**Password policy:** N/A, not deferred — there is still no registration
or password-reset/change flow anywhere in the codebase (confirmed by
grep; the only place a password is ever set is `prisma/seed.ts`, a
dev-only script). A password policy has nothing to attach to yet; this
is tracked as a prerequisite for whichever future module adds
registration, not a Module 4 gap.

### Live verification

Compiled build, real local Postgres, real seeded users
(`admin@antrique.dev`, `customer@antrique.dev`). Full flow exercised
end to end over real HTTP:
1. Login → real access + refresh tokens; `GET /auth/sessions` shows the
   new session.
2. Refresh → new pair issued; old session shows `revokedAt` set, new
   session created; `GET /auth/sessions` still shows exactly one active
   session (the new one).
3. Replay the pre-rotation refresh token → `401`.
4. Replay the post-rotation (still technically valid) refresh token →
   also `401` — confirms reuse detection revoked the *entire* family,
   not just the specifically-replayed token.
5. Fresh login → logout with the refresh token → `{}` (previously
   returned a stale `{ status: 'not_implemented' }` placeholder,
   corrected as part of this module — a real bug caught only by live
   testing, since every automated check treats an unchanged response
   *shape* as passing).
6. Replay the logged-out refresh token → `401`.
7. Five wrong-password attempts against a seeded account, confirmed via
   direct DB read that `failedLoginAttempts` reached 5 and `lockedUntil`
   was set ~15 minutes out; a subsequent attempt with the *correct*
   password still `401`s while locked. (The per-IP login throttle,
   5/min, is stricter than the 5-failure lockout threshold, so
   reproducing this over HTTP required spacing requests across two
   throttle windows — both defenses are independently confirmed
   working, not in conflict.)

### Validation

`pnpm --filter @antrique/api typecheck`/`lint` clean. Full test suite:
188 suites, 1121 tests, all passing (auth module alone: 11 suites, 111
tests — `auth.service.spec.ts`/`auth.controller.spec.ts` fully
rewritten for the new `AuthService`/`AuthController` shapes,
`session.repository.spec.ts` new, `auth.repository.spec.ts`/
`auth-token-payload.mapper.spec.ts` extended). `openapi.json`
regenerated and diffed against the pre-change version: purely additive
(two new endpoints/schemas, description-text updates on existing
routes) — no removed or changed fields, consistent with `CLAUDE.md`'s
frozen-contract rule. `apps/web`'s logout route handler
(`app/api/auth/logout/route.ts`) updated to pass the session cookie's
`refreshToken` through to the now-real `POST /auth/logout`.
