# Progress Dashboard

The single place to see where the build is. Update at the end of every session.
Tell Claude Code: "update docs/implementation/progress.md".

## Current status: **Backend v1.0 Review — Phase 5 (Testing & Documentation Review) in progress**

**Note on the sections below:** `apps/api` backend work stopped being tracked
against the Sprint table directly partway through Sprint 1 and has been
tracked ever since via a separate **Milestone** system (M1–M14, all
implemented, validated, and now formally reviewed) and, since Milestone 14,
a **Backend v1.0 Review** phase sequence (Phase 1 Architecture, Phase 2 Code
Quality, Phase 3 API Contract/Freeze, Phase 4 Frontend Readiness — all
complete and approved; Phase 5 Testing & Documentation in progress; see the
"In progress right now" log below for the authoritative, detailed record of
every milestone and phase). The Sprint table immediately below is the
project's ORIGINAL full-platform plan (marketing site + portal + admin, per
CLAUDE.md's scope) and still accurately tracks the parts of that plan
untouched by the backend Milestone work — `apps/web` (marketing site,
Sprint 2; portal, Sprint 4) has genuinely not been started. Do not read the
table below as "nothing has shipped" — the backend (`apps/api`) is a
complete, production-ready, API-frozen modular monolith; see the log below
for what that means concretely.

## Sprint status (original full-platform plan — apps/web scope not yet started; see note above for apps/api)
| Sprint | Theme | Status |
|--------|-------|--------|
| 1 | Foundation | 🟨 In progress (backend scope superseded by the Milestone system below; infra-as-code/Terraform specifically not yet done) |
| 2 | Marketing site | ⬜ Not started (task list needs authoring — see blockers.md) |
| 3 | Conversion + CRM ◆ M1 | ⬜ Not started (unrelated to "Milestone 1" in the M1–M14 backend system below — same "M1" label, two different numbering schemes, see note above) |
| 4 | Portal core | ⬜ Not started |
| 5 | Billing + collab ◆ M2 | ⬜ Not started |
| 6 | Admin + hardening ◆ M3 | ⬜ Not started |

Legend: ⬜ not started · 🟨 in progress · ✅ done

## Completed work log (newest first)
- **Backend v1.0 Review — Phase 5 (Testing & Documentation Review)** — NOT
  a milestone; the fifth of five planned review phases, auditing test
  coverage and every documentation artifact across the now API-frozen,
  frontend-reviewed backend. Zero new endpoints/DTOs/schema/auth/business-
  logic changes. Testing: inventoried all 162 spec files across every
  category (28 controller/38 service/30 repository/46 DTO/3 guard/2
  middleware/5 decorator/1 filter/1 mapper specs, plus jobs/jwt/cache/
  logging/config), confirmed genuinely strong coverage of RBAC denial +
  audit logging (guards), tenant isolation + soft-delete (repositories,
  spot-checked), and every named critical workflow (auth, order create/
  status/cancel, inventory receive/adjust/reserve/release, invoice/
  payment lifecycle, lead lifecycle/conversion, follow-up lifecycle,
  admin reports/dashboard/notifications/audit) via direct inspection of
  each spec file's `describe`/`it` structure, not assumed from file
  presence alone. Found and fixed one genuine coverage gap: `invoice.
  service.spec.ts` had zero tests for the invoice-number collision-retry
  path (`generateInvoiceNumber()`'s bounded retry loop, documented in
  Phase 3 as throwing `ConflictException` after 5 attempts) — added two
  tests (retry-then-succeed, exhaust-then-ConflictException). Measured
  real coverage via `--coverage`: 85.37% statements / 68.1% branches /
  76.73% functions / 85.75% lines; broke it down by top-level directory
  and confirmed the lowest figures are expected/by-design (`main.ts`/
  `app.module.ts`/`bootstrap/` at 0% — bootstrap/wiring code validated by
  live-boot smoke tests across every prior milestone, not unit tests) or
  a deliberate, previously-established architectural choice (`database/`
  at 44.4% branch — `PrismaService` itself has no spec file; its
  `isHealthy()`/slow-query-logging/fail-fast-connect logic is validated
  via live boot + Milestone 14's CI `migration-validation` job against a
  real Postgres container, matching this codebase's own consistent
  "mock at the repository boundary, validate real DB behavior via live
  integration" convention — documented as a deliberate, not-fixed gap
  rather than adding deep Prisma-internals mocking that would contradict
  that convention). Documentation: found the progress dashboard's own
  header ("Current sprint: Sprint 1 — Foundation," "next is Milestone 1")
  flatly contradicted its own body (14 completed Milestones + 4 approved
  review phases) — corrected, and clarified the two coexisting, unrelated
  numbering schemes ("Milestone 1–14" for backend engineering vs. the
  original plan's "◆ M1/M2/M3" business-release markers). Also found the
  "In progress right now" heading was inaccurate (nothing under it was
  actually in progress — all listed milestones/phases are complete) and
  a stray, decade-out-of-place "## Last completed" heading mid-log — both
  fixed by treating the whole milestone/phase history as one continuous,
  clearly-labeled log. Rewrote the long-stale "Next 3 tasks"/"Notes for
  next session" tail (previously still referencing the Phase 1.2C logging
  roadmap as "next," from very early in the project) to reflect real
  current status.

- **Backend v1.0 Review — Phase 4 (Frontend Readiness Review)** — NOT a
  milestone; the fourth of four planned review phases, evaluating the
  already-API-frozen backend (Phases 1–3, below) exclusively from a
  frontend engineering perspective. Zero new endpoints/DTOs/schema/auth/
  business-logic changes — reviewed all 26 business feature areas plus
  Auth/Health/Swagger infrastructure for workflow completeness, screen
  readiness, and API usability. The single most significant finding:
  before this phase, the generated OpenAPI spec had **zero** documented
  success (2xx) responses anywhere — `@nestjs/swagger`'s CLI plugin only
  auto-generates schema from class-validator-decorated properties, and
  every response DTO in this codebase (by original, deliberate design —
  see every `*-response.dto.ts` file) uses undecorated constructor-
  parameter-properties, which the plugin cannot introspect at all;
  verified empirically (`components.schemas` contained 50 request-DTO
  entries and 0 response-DTO entries pre-fix). Fixed with two new,
  reusable Swagger decorators — `ApiPaginatedResponse(model)` (`src/
  common/decorators/api-paginated-response.decorator.ts`, the standard
  `@nestjs/swagger` `ApiExtraModels` + `allOf` generic-wrapper composition
  pattern) and standard `@ApiOkResponse`/`@ApiCreatedResponse`/
  `@ApiNoContentResponse` type references — applied across all ~90
  controller methods in 26 controllers via a verified, hand-mapped
  script (every method's HTTP status/DTO pairing individually confirmed
  against its own source before the script ran, not inferred). Result:
  121 of 124 endpoints now have a documented 2xx response (up from 0);
  the 3 deliberately excluded are `POST /payments/:id/refund` (always
  501, genuinely has no success case) and `/health/{ready,startup}`
  (return a plain TS interface, not a decoratable class — infra
  consumers, not frontend engineers). Field-level detail within each
  response schema remains a known, DELIBERATELY UNFIXED limitation
  (`{ type: 'object', properties: {} }` for every response DTO) — fixing
  it properly requires converting every response DTO from constructor-
  parameter-properties to field declarations, which, despite being
  wire-format-identical, is a broad structural rewrite this phase's own
  "do not redesign" rule puts out of scope; flagged as an explicit,
  separately-scoped follow-up recommendation, not silently attempted.
  Also added a precise validation-error-shape explanation (the exact
  `{ statusCode, message: string[], error }` body, and that `message`
  entries are human-readable sentences, not `{ field, reason }` pairs) to
  the top-level Swagger description (`src/bootstrap/swagger-document.ts`)
  — the previous text only said "ValidationPipe-shaped body" without
  specifics. Two real, structural (not fixable without an API-breaking
  change) frontend-friction findings documented: (1) there is no `/me` /
  profile / permissions endpoint anywhere in the API — `RequestUser` is
  `{ email }` only (a deliberate Milestone 2 constraint) and the JWT
  payload itself carries nothing beyond `email`, so a frontend cannot
  fetch the current user's id/name/role/permissions after login without
  either decoding non-existent claims or hardcoding UI-gating logic
  separately from the backend's real RBAC; (2) product variant stock
  isn't included in any Catalog response (`ProductVariantResponseDto`
  has no stock field — inventory is a fully separate module, correctly,
  per the architecture), so a Product Listing screen showing live stock
  requires one `GET /inventory?productVariantId=X` call per variant (no
  bulk multi-id filter exists) — a genuine N+1-shaped frontend request
  pattern for any storefront screen. Full validation: `pnpm lint`/
  `typecheck`/`build`/`test` all clean (162 suites/931 tests, unchanged —
  confirms zero behavior change), `generate:openapi` re-run and the 2xx-
  coverage improvement verified by direct inspection of the generated
  spec's `components.schemas`/`paths`.

- **Backend v1.0 Review — Phase 3 (API Contract Review & API Freeze)** — NOT
  a milestone; the third of three planned review phases over the
  already-complete Milestone 1–14 backend, following Phase 1
  (Architecture) and Phase 2 (Code Quality), both below. Zero endpoints
  added/removed/renamed, zero DTO/response-field/business-logic/auth
  changes — audited every route across all 16 controllers-with-business-
  routes (Auth, Catalog×3, Bespoke×4, Inventory×3, Orders×2, Billing×3,
  CRM×5, Admin×5, Health) for route consistency, request validation,
  response consistency, HTTP status codes, error handling, pagination/
  filtering/sorting, authorization, and Swagger documentation. Confirmed
  100%-consistent: soft-delete via `deletedAt` on every DELETE route,
  `PaginationQueryDto`/`PaginatedResponseDto<T>` on every list route,
  DELETE→204/action-verbs→200-via-explicit-`@HttpCode`/create→201 status
  codes (one deliberate exception, `inventory/receive`→201 via
  find-or-create reasoning, confirmed accurate against its own service
  code), tenant-scoped `@Tenant()` sourcing on every query. Added
  `@ApiOperation` + a new shared `ApiStandardAuthErrors()`/
  `ApiValidationError()`/`ApiNotFoundError()`/`ApiConflictError()`
  decorator bundle (`src/common/decorators/api-standard-responses.decorator.ts`,
  built via `applyDecorators()`) across all 27 real controllers — pure
  additive Swagger metadata, zero behavior change. Caught and fixed 6
  genuine Swagger-accuracy defects via an exhaustive final cross-check of
  every `grep -rln "new ConflictException" src/modules --include=
  "*.service.ts"` result (13 files) against every controller's
  `@ApiConflictError` placement: 1 fabrication removed
  (`tax-rate.controller.ts` claimed a conflict its service never throws),
  5 real gaps added (`lead.controller.ts` create/update — a duplicate-
  active-lead check neither had documented, convert already did;
  `product-customization.controller.ts` create; `invoice.controller.ts`
  create; `inventory.controller.ts` adjust/reserve/receive — reserve and
  receive were still missing after an earlier pass only covered adjust).
  Full validation: `pnpm lint`/`typecheck`/`build`/`test` all clean (162
  suites/931 tests, unchanged from Phase 2 — confirming zero behavior
  change), `generate:openapi` re-run and spot-checked that all 6 newly-
  added 409 responses serialize correctly with their real messages.

- **Backend v1.0 Review — Phase 2 (Code Quality & Technical Debt Review)**
  — NOT a milestone; safe, non-behavior-changing refinements only, per
  this phase's own explicit no-redesign framing. Reviewed dead code,
  duplicate code, readability, consistency, technical debt, performance
  hygiene, documentation across the whole backend. Removed `export` from
  9 line-item mapper helper functions across 7 files (bespoke/billing/
  catalog/inventory/orders) after verifying zero external/spec-file usage
  each; removed `export` from `API_GLOBAL_PREFIX`
  (`src/bootstrap/api-routing.ts`) for the same reason. Deliberately did
  NOT un-export several candidates judged as legitimate — `PermissionKey`/
  `RoleKey` (companion types), `EnvVars`, `HealthCheckStatus`,
  `RecordAuditEventParams`/`RecordSystemEventParams`/
  `CreateNotificationParams` (documented placeholder methods, "no route
  yet" per their own services' comments), `TenantResolutionSource`/
  `ResolvedTenant` (return types of externally-consumed methods).

- **Backend v1.0 Review — Phase 1 (Architecture Review)** — NOT a
  milestone; module design, dependency structure, repository/service/
  controller layers, project structure, and code organization reviewed
  across the whole backend with the same no-redesign constraint. Added
  `BaseRepository.findManyAndCount()` (`src/database/base.repository.ts`)
  — a transaction-capable client passed as a call-time parameter, not a
  constructor dependency, keeping `BaseRepository` framework-agnostic —
  and consolidated the repeated `$transaction([findMany, count])`
  pagination pattern into it across 22 repository files (21 via a scripted
  literal-string transform, `category.repository.ts` done manually as the
  prototype). One repository (`product-customization.repository.ts`) was
  deliberately reverted to its original explicit form after consolidating
  it broke Prisma's argument-dependent return-type inference for its
  `include`-shaped query. Removed 22 empty scaffold directories (git never
  tracked them, so zero effect on tracked history) across auth/billing/
  crm/content/projects. Fixed stale documentation in `src/common/
  README.md`, `src/shared/README.md`, `src/modules/content/README.md`,
  `src/modules/projects/README.md`. See the ad hoc "Module Dependency
  Diagram" delivered in-conversation (not persisted to a file) for the
  foundational/orchestration/leaf/infrastructure module categorization.

- **Engineering Polish Pass (Pre-Backend v1.0 Review)** — NOT a milestone
  (this task's own explicit framing); a tooling/CI/documentation
  refinement pass over the already-complete, already-approved Milestone
  14 infrastructure, ahead of a formal Backend v1.0 architecture review.
  Zero business logic, schema, API contract, or application behavior
  changed — verified by re-running the full test suite unchanged (162
  suites/929 tests, identical count to the end of Milestone 14) and a
  live-boot smoke test confirming the refactored bootstrap produces
  byte-identical routing/Swagger behavior. Nine tasks: (1) OpenAPI is now
  a generated CI artifact — `main.ts`'s own Swagger/routing config was
  extracted into `src/bootstrap/{api-routing,swagger-document}.ts` so a
  new `scripts/generate-openapi.ts` (boots the real `AppModule`, writes
  `openapi.json`, never hand-maintained) shares the identical
  configuration with the live-served copy, satisfying "never duplicate
  Swagger configuration" while guaranteeing the artifact can't drift from
  the real backend; (2) Trivy container scanning added to CI's
  `docker-build` job — a full-severity informational pass plus a
  HIGH/CRITICAL-only gating pass, `.trivyignore` for accepted risk
  (currently empty — no real scan has run yet, Docker isn't available in
  this dev environment); (3) `apps/api/audit-allowlist.json` +
  `scripts/check-audit-allowlist.js` turn the prose-only dependency audit
  from Milestones 13/14 into a CI-enforced gate — 20 already-triaged
  findings pass silently, anything new fails the build with full detail
  (also caught and fixed a real undercount from Milestone 14's own
  security.md §14: 3 new `js-yaml` findings, not 2); (4)
  `deploy-staging.yml`/`deploy-production.yml` rebuilt as real templates
  — `workflow_dispatch` with a `deploy`/`rollback` action choice, a real
  Docker build step, and clearly-labeled placeholders (never
  fake-success) for the push/rollout/health-verification steps still
  blocked on real hosting infrastructure; (5) a new `release-artifacts`
  CI job bundles the compiled build + generated OpenAPI spec + version/
  commit/timestamp metadata into one 90-day-retention archive; (6)
  `docs/architecture/release.md` gained a Production Verification
  Checklist, a consolidated Operational Limitations list, a Future
  Operational Roadmap, and a Release Tagging Strategy; (7) new
  `docs/architecture/container.md` (Docker build/compose/versioning/
  health/lifecycle/troubleshooting/production recommendations/security
  scanning); (8) new `docs/architecture/cicd.md` (every CI job,
  execution order, quality gates, artifact retention, where frontend
  developers obtain the OpenAPI spec); (9) full validation re-run
  (lint/typecheck/build/test all clean, `generate:openapi` and
  `audit:check` both verified working against the real local database,
  live boot re-confirmed identical Swagger/health/routing behavior post-
  refactor) — Docker build and the Trivy scan itself could not be
  executed locally (no Docker in this development environment); both are
  now CI-gated and will run for real on the next push. See
  `docs/architecture/{deployment,container,cicd,release,security,
  operations}.md` for full detail; `decisions.md` for the specific
  engineering trade-offs made.

- Milestone 14 (Production Infrastructure, DevOps & Deployment)
  implementation is done and fully validated, awaiting its review pass.
  "This milestone completes the backend" (this milestone's own framing) —
  no new business module, zero business-logic/schema/breaking-API changes.
  Full production-readiness audit (Configuration/Deployment/Docker/CI-CD/
  Logging/Observability/Health/API-docs/Startup/Shutdown/Runtime-
  validation/Background-jobs/Release/Backup/Rollback) found and fixed
  several genuinely placeholder or drifted pieces. Configuration:
  `env.validation.ts` gained a `.superRefine()` cross-field layer —
  production boot now fails fast if Swagger is enabled without a
  deliberate second opt-in (`SWAGGER_ALLOW_IN_PRODUCTION`), if
  `DATABASE_SSL` is false, or if either JWT secret still equals
  `.env.example`'s literal placeholder value; `ConfigModule` gained a
  duplicate-config-namespace assertion. OpenAPI/Swagger: `@nestjs/swagger`
  v7 (the Nest-10-compatible line — v11 requires Nest 11, a peer mismatch
  caught and corrected before installing) wired into `main.ts`, gated
  behind config; DTO/response schemas come from the CLI plugin
  (`nest-cli.json`, introspecting class-validator decorators — confirmed
  live that real constraints like `minLength` show up in the generated
  schema) rather than hand-written annotations; 25 controllers bulk-
  tagged (`@ApiTags`/`@ApiBearerAuth`) via one scripted pass, `AuthController`
  deliberately excluded from `@ApiBearerAuth` (its routes are
  unauthenticated). Health checks: new `HealthModule` —
  `GET /health/{live,ready,startup}`, unauthenticated, `@SkipThrottle()`d,
  excluded from both the global `/api` prefix and URI versioning
  (`VERSION_NEUTRAL` + `setGlobalPrefix`'s own `exclude` option) so
  infrastructure probe config never needs updating on an API version
  bump; `ready`/`startup` call `PrismaService.isHealthy()` (built
  Milestone 12, zero callers until now — the same "build the capability,
  wire it up later" pattern this codebase keeps repeating). Observability:
  confirmed by reading the actual source that correlation ids were ALREADY
  fully propagated through Middleware → Controllers → Services →
  Repositories → Prisma → Audit logging (Phase 1.2C.4's own
  `RequestContextService`/`AsyncLocalStorage` design) — the one real gap
  was that `X-Request-Id`/`X-Correlation-Id` were never echoed back to the
  calling client; now set synchronously in `HttpLoggingMiddleware` before
  `next()`. Explicit startup/shutdown log lines added around `main.ts`'s
  bootstrap and `enableShutdownHooks()` (additive `process.on(SIGTERM/
  SIGINT)` listeners that only log, never call `app.close()` themselves —
  exactly one real shutdown sequence, not two racing ones). Background job
  infrastructure: new `apps/api/src/jobs/` — `Job<T>`/`JobContext`/
  `JobResult`/`JobStatus`, `JobRunner` (in-process, exponential-backoff
  retry via a plain `RetryPolicy` value object, `DEAD_LETTER_STORE` swap-
  point token with `InMemoryDeadLetterStore` the one real implementation)
  — infrastructure only, zero scheduled jobs, zero Redis/BullMQ/RabbitMQ,
  per this milestone's own explicit constraint; a likely first real
  consumer (`NotificationRetryJob`, built against Milestone 11's own
  already-`FAILED`-state-tracking `Notification` model) is named in
  `jobs/README.md` but not built. Runtime validation: new `GET /runtime`
  (`AdminModule`, gated by a new `system:read` permission — Admin/Super
  Admin only, the same tier `audit_logs:read` already established, granted
  automatically via those two roles' existing full-permission-set seed
  grant) surfaces `APP_VERSION`/`GIT_COMMIT_SHA` (CI/Docker-stamped, never
  introspected from `package.json` — a build-output-layout-independent
  value, deliberately, matching how `DATABASE_URL`/JWT secrets are already
  supplied rather than derived), `nodeEnv`, `uptimeSeconds`, live database
  connectivity. Docker: found and fixed a real, previously-undetected bug
  in `infrastructure/docker/api.Dockerfile`'s `runtime` stage — `CMD`
  pointed at `dist/main.js`, which has never existed (the exact
  `dist/src/` bug `apps/api/package.json`'s own `start` script already had
  fixed during the Phase 1 production-readiness audit, silently
  reintroduced here and undetected because nothing had ever run this
  image's `runtime` stage end to end before this milestone's own live-
  boot validation); added a non-root user (`addgroup`/`adduser`, fixed
  uid/gid) and a real `HEALTHCHECK` (a Node one-liner against
  `/health/live` — no `curl`/`wget` in this minimal Alpine image, and
  adding either just for this would grow it for no other benefit); new
  root `.dockerignore` (keeps `.env`/secrets and rebuildable artifacts out
  of every Dockerfile's build context) and `docker-compose.prod.yml` (a
  genuinely production-shaped stack — no host-exposed postgres/redis
  ports, `restart: unless-stopped`, `env_file` `required: true` — distinct
  from the existing dev-oriented root `docker-compose.yml`). CI: extended
  the existing `ci.yml` with a build-artifact upload appended to the
  existing job, a new `migration-validation` job (a real, throwaway
  Postgres service container — every existing test suite mocks its own
  repositories, so no prior CI job had ever exercised a real migration;
  applies every committed migration then confirms a clean `migrate
  status`), and a new `docker-build` job (builds the exact `runtime`
  target both compose files reference, catching exactly the `CMD` bug
  above had it still existed). Full validation: `pnpm lint`/`typecheck`/
  `build`/`test` all clean (162 suites/929 tests, up from 155/893 at the
  end of Milestone 13 — 7 new suites: health service/controller, jobs
  retry-policy/dead-letter-store/job-runner, admin runtime service/
  controller), zero regressions. `pnpm audit` grew from 16 to 20 findings
  purely from the new `@nestjs/swagger` dependency (two `js-yaml`
  findings, one more `@hono/node-server` finding) — re-applied the same
  reachability discipline Milestone 13 established: `@nestjs/swagger` only
  ever calls `js-yaml`'s `dump()` (serializing its own generated OpenAPI
  document), never `load()`/`safeLoad()` on any request-supplied input,
  so the vulnerable parse path is unreachable regardless of Swagger being
  gated off by default in production anyway (`security.md` §14). Live
  boot confirmed zero DI issues; a full live smoke test covered health
  endpoints (live/ready/startup all `200`, real database check), Swagger
  UI (`200`) and JSON generation (confirmed real DTO schema introspection
  — `LoginRequestDto`'s `minLength`/`required` constraints present in the
  generated OpenAPI document), correlation-id response headers, versioned
  (`/api/v1/runtime`, `401` unauthenticated) vs. unversioned/unprefixed
  (`/health/*`) routing both resolving correctly, and structured JSON logs
  showing the same `requestId`/`correlationId` threading through a
  `Slow database query` warning, an `HTTP request completed` entry, and an
  `Unhandled exception` entry for the same request — direct, live
  confirmation of the observability chain this milestone's own audit
  found already correct by reading source. New
  `docs/architecture/deployment.md`, `environment.md`, `runbook.md`,
  `release.md` (all new); `operations.md`/`backend.md`/`architecture.md`/
  `security.md` updated; `domain-module-guide.md` §25 (three reusable
  production-readiness patterns: an unrun code path drifts silently, a
  peer-dependency mismatch needs active resolution not silent acceptance,
  "infrastructure exists" and "infrastructure is proven load-bearing" are
  different claims); `apps/api/README.md` brought back in line with
  reality (previously still described every module as an "empty
  scaffold," stale since well before Milestone 5).

- Milestone 13 (Security Hardening) implementation is done and fully
  validated, awaiting its review pass. "Transform the backend from
  feature-complete to production-secure" (this milestone's own framing) —
  no new business module, zero feature/API/schema/domain-model changes.
  Full layered audit (Configuration/HTTP/Authentication/Authorization/
  Multi-Tenant/Validation/Database/Logging/Error-Handling/Dependencies) with
  every finding — fixed or deliberately deferred — documented in the new
  `docs/architecture/security.md` (Threat Model, full audit table, OWASP Top
  10 mapping, Remaining Accepted Risks) plus a new `docs/architecture/
  operations.md` runbook (config knobs, dependency-audit cadence, secret-
  rotation procedure, incident-response signals). Real gaps closed: Helmet
  security headers (`main.ts`, explicit CSP `default-src 'none'`/CORP
  `same-origin` overrides, everything else Helmet's own defaults), registered
  first in the bootstrap chain so every response carries them; CORS
  (`app.enableCors()`) wired to the already-validated-but-previously-unused
  `CORS_ALLOWED_ORIGINS` env var, explicit allowlist, `credentials: false`;
  app-wide rate limiting (`@nestjs/throttler`, in-memory — "do not introduce
  Redis" this milestone's own explicit constraint) via
  `ThrottlerModule.forRootAsync()` driven by the already-validated
  `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX` env vars, registered globally via
  `APP_GUARD`, plus a stricter hardcoded 5-attempts/60s `@Throttle()`
  override on `POST /auth/login`; explicit request body-size limiting
  (`NestFactory.create(AppModule, { bodyParser: false })` + manual
  `json()`/`urlencoded()` middleware with a fixed `'256kb'` string literal,
  deliberately never computed/env-driven — the exact shape needed to keep
  the `body-parser` DoS CVE this milestone's own dependency audit found
  (`GHSA-v422-hmwv-36x6`, triggered only by an invalid/unparseable limit
  value) permanently unreachable regardless of installed version); JWT
  signing/verification explicitly pinned to `HS256`
  (`TokenService`/`token.service.ts`, `JWT_ALGORITHM = 'HS256' as const` on
  every sign/verify call) — defense in depth beyond `jsonwebtoken`'s own
  already-safe defaults (confirmed live pre-existing that `alg: none` was
  already rejected), proven by a new regression test asserting a
  correctly-secreted-but-HS384 token is now rejected too; audit-trail
  logging for `user.login`/`user.token_refresh` (SUCCESS/FAILURE,
  `AuthService`) and `authz.role_denied`/`authz.permission_denied`
  (`RolesGuard`/`PermissionsGuard`), wired into the pre-existing,
  previously-zero-call-sites `AUDIT_LOGGER` structured-log mechanism
  (Phase 1.2C.8) rather than the DB-persisted `AuditLog` table `AdminModule`
  owns — deliberately, to avoid a backwards dependency from cross-cutting
  auth/authz code onto the architecturally-downstream `AdminModule`; the two
  audit mechanisms remain intentionally distinct and NOT unified into one
  queryable source, documented as a real gap in `security.md` §9/§13 rather
  than silently left implicit. Full dependency audit: `pnpm audit` returned
  16 findings (3 high, 9 moderate, 4 low); every one individually traced to
  its dependency path and assessed for REACHABILITY in this app's actual
  runtime code (not just tree presence) — zero were found reachable (all
  either dev-only tooling — `@nestjs/cli`'s own build chain, `autocannon`'s
  benchmark tooling, `prisma`'s dev server — or runtime code paths this app
  never exercises, e.g. `@nestjs/core`'s SSE-stream finding against an app
  with zero `@Sse()` routes, or `qs.stringify()`'s DoS finding against an
  app confirmed to never call `qs.stringify()`). Two low-risk findings
  (`multer`, `lodash`) fixed via `pnpm.overrides` (root `package.json`),
  each verified via `pnpm why` to resolve to one consistent version
  tree-wide first; `glob` was considered for the same treatment and
  explicitly rejected (would force-upgrade Jest's own deeply-nested
  `glob@7.2.3` dependents for a dev-only-tool CVE); full per-finding
  reachability table in `security.md` §11. Error-response safety was
  verified against the actual installed `BaseExceptionFilter`/Prisma
  error-class source (via a throwaway script, deleted after use) rather than
  assumed — confirmed no thrown value anywhere in this codebase can produce
  anything but NestJS's own fixed generic 500 response for an unhandled
  error. Full validation: `pnpm lint`/`typecheck`/`build`/`test` all clean
  (155 suites/893 tests, up from 155/883 at the end of Milestone 12 — 10 new
  tests: JWT algorithm-pinning regression, login/refresh audit-logging
  coverage, denial audit-logging coverage in both `roles.guard.spec.ts`/
  `permissions.guard.spec.ts`), zero regressions. Live boot with zero DI
  issues, and a 13-check live HTTP smoke test, all passed: security headers
  present on every response; CORS allows the configured origin and rejects
  an unlisted one; malformed/tampered/missing JWTs all rejected with 401;
  RBAC correctly forbids/allows the admin-only audit-logs route; a
  client-supplied tenantId-shaped body field is ignored, not trusted; an
  oversized body is rejected with 413; a malformed login email is rejected
  with 400; unknown extra body fields are silently stripped, not smuggled
  through; an unknown route (404) reveals no stack trace; the login response
  never echoes the submitted password. New `docs/architecture/security.md`
  (the full audit — Threat Model, layer-by-layer review, OWASP Top 10
  mapping, Remaining Accepted Risks) and `domain-module-guide.md` §24
  (three reusable hardening patterns: prefer an already-existing
  cross-cutting mechanism over a backwards dependency, verify security
  claims against real installed source rather than assumed library
  behavior, and treat "present in the dependency tree" and "reachable by
  this app's own code" as two different questions when triaging an audit).

- Milestone 12 (Performance Engineering) implementation is done and fully
  validated, awaiting its review pass. "Optimize the current
  implementation only" (this milestone's own framing) — no new business
  module, zero feature/API/schema changes, zero business-rule changes.
  Full audit across every named module (Auth/Authz/Multi-Tenant/Catalog/
  Bespoke/Inventory/Orders/CRM/Billing/Admin) found and fixed: two real
  N+1s (`InvoiceService.createFromOrder()`/`OrderService.create()` each
  ran one `findVariantById()` per order line — new
  `ProductRepository.findVariantsByIds()` batches them into one query;
  `FabricService.assertProductsBelongToTenant()` ran one full-detail
  `findActiveById()` per product id — new `ProductRepository.
  findExistingIds()` batches into one minimal `select: { id: true }`
  query); `SupplierService`'s own per-item existence-check loop
  parallelized via `Promise.all()` (same query count, concurrent not
  serial). `InventoryRepository`'s own Milestone 11 "Stock valuation"/
  "Low stock items" analytics — previously `findMany()` + application-code
  reduce/filter over every candidate row — rewritten to single `$queryRaw`
  aggregate/filtered queries, confirmed live that Prisma 7's
  `@prisma/adapter-pg` driver adapter returns genuine `Prisma.Decimal`/
  `Date` instances from raw queries (zero precision risk, no mapper
  changes needed), backed by one new hand-written partial index
  (`inventory_items(tenant_id, reorder_point) WHERE reorder_point IS NOT
  NULL AND deleted_at IS NULL`, migration
  `20260722130000_add_performance_indexes` — the ONLY new index this
  milestone added; the rest of the schema was found already densely
  indexed by every prior milestone's own discipline, per "never create
  duplicate indexes, add only necessary"). New `CacheService`
  (`apps/api/src/cache/`, `@Global()`, the first genuinely new
  infrastructure module since `TenantModule` in Milestone 4) — in-memory,
  TTL-based, `get`/`set`/`delete`/`deleteByPrefix`/`clear`/`getOrLoad`
  (read-through) — fronting `AuthorizationService`'s own per-request role/
  permission resolution with a 60s cross-request cache, since it ran on
  EVERY `PermissionsGuard`/`RolesGuard`-protected request (most routes in
  this API by now) despite grants changing extremely rarely; the
  pre-existing per-request `AuthorizationCache` (Milestone 3) is
  completely unchanged, this is a second layer underneath it. Evaluated
  and deliberately did NOT cache `TaxRate`/`PaymentMethod`/`LeadSource`/
  `NotificationTemplate` — `TaxRate` specifically already has a live write
  endpoint this milestone didn't wire real invalidation into, and a
  TTL-only cache on a live write path is a correctness risk, not an
  optimization. API layer: response compression (`compression`
  middleware, gzip/deflate, registered first in the bootstrap chain);
  confirmed LIVE that ETag generation + conditional-GET (304) already
  worked via Express's own default behavior with zero code needed (a
  genuine audit finding, not a build task); new opt-in `@CacheControl
  (maxAgeSeconds)` decorator + `CacheControlInterceptor` (the first real
  content in the previously-placeholder `common/interceptors/`),
  registered via `APP_INTERCEPTOR`, applied ONLY to Category/Collection/
  Product `GET` routes (30s, always `private` — never `public`, since
  every response in this API is tenant/RBAC-scoped and a shared cache
  serving one tenant's response to another would be a data leak, not an
  optimization) — deliberately not applied to Orders/Inventory/Dashboard/
  Notifications/Audit/Billing/CRM. Pagination confirmed already capped
  (`@Max(100)`, Milestone 5, unchanged); streaming evaluated, not
  applicable (no bulk-export/large-payload endpoint exists anywhere in
  this API). Instrumentation: `PrismaService` now subscribes to Prisma's
  own `$on('query', ...)` event, logging every query at `debug` (Prisma's
  own measured duration) and anything over 100ms additionally at `warn`;
  `HttpLoggingMiddleware` now also logs a `warn` "Slow HTTP request" past
  1000ms, alongside its existing unchanged `info` completion log;
  `PerformanceLogger` (built Phase 1.2C.7, ZERO real call sites anywhere
  until this milestone) now wraps `DashboardService.overview()` — this
  codebase's own heaviest service-layer fan-out — the first real
  demonstration of a fully-built, fully-tested capability that had sat
  unused for nine milestones. Reproducible `autocannon` load benchmarks
  (`apps/api/benchmarks/run-benchmarks.js`, Node-native — chosen over `k6`,
  which would need a separate Go-binary toolchain this environment
  doesn't have) covering login/catalog/orders/dashboard/billing/CRM, run
  against both a development-mode and a `NODE_ENV=production` boot (the
  latter needed an explicit `X-Tenant-ID` header — confirmed live that
  `TenantResolver`'s own `DEFAULT_TENANT_ID` fallback is gated to
  development only, Milestone 4's own deliberate design, working exactly
  as intended). Caught and fixed a real bug in the benchmark script
  itself before trusting any result: autocannon's own `path` option
  REPLACES a `url`'s existing path segment rather than appending to it —
  the first run silently measured 404-handling latency on every scenario
  (100% non-2xx), not the real endpoints. Zero errors/timeouts/non-2xx
  responses across every scenario once fixed — full results in
  `docs/architecture/performance.md` §8. Full validation: `pnpm lint`/
  `typecheck`/`build`/`test` all clean (155 suites/883 tests, up from
  153/858 — 2 new suites (`cache.service.spec.ts`,
  `cache-control.interceptor.spec.ts`), 25 new tests total, including
  targeted additions to every existing repository/service/middleware spec
  whose underlying method changed). Live boot with zero DI issues, and a
  full live
  HTTP smoke test (7 checks, all passed) covering: real `Cache-Control`+
  `ETag` headers on an annotated route and their absence on an
  unannotated one; the rewritten inventory raw-SQL queries returning
  correct real numbers (0 low-stock items from seed data, matching manual
  verification); order creation exercising the new batched variant lookup
  end to end; invoice creation from that order exercising the SAME
  batched lookup in a second module; the cross-request authorization
  cache continuing to enforce RBAC correctly after repeated requests (no
  cross-role/cross-tenant bleed); Milestone 11's own Notification list
  route, unregressed. New `docs/architecture/performance.md` (the full
  audit — every finding fixed AND every finding deliberately left
  unfixed, with reasoning for each) and `domain-module-guide.md` §23
  (three reusable optimization patterns: batch a per-item loop, push a
  predicate into raw SQL only when the query builder can't express it,
  cache only what tolerates staleness and say so).

- Milestone 11 (Admin Platform, Analytics & Notifications) implementation
  is done and fully validated, awaiting its review pass. "This module
  provides operational visibility. It does not own business
  transactions" (this milestone's own framing) — the seventh real
  business module, and the most cross-module-dependent one in this arc.
  Architecture audit found `Notification`/`AuditLog` already fully
  modeled since Phase 1.1B with ZERO application-layer consumers — the
  same "schema exists, first real consumer" situation Milestones 3, 9,
  and 10 already found. `AuditLog` needed ZERO schema changes at all
  (pure reuse — its own pre-existing `UPDATE`/`DELETE` revoke already
  enforced this milestone's own "Immutable audit history"); `Notification`
  gained an additive DELIVERY-state lifecycle it never had (`status`/
  `sentAt`/`failedAt`/`retryCount`/`lastError` — the pre-existing columns
  only tracked recipient interaction via `readAt`/`dismissedAt`). A new
  `AdminModule` (`apps/api/src/modules/admin/`) provides four
  controller/service/repository triads — Notification, Audit (covering
  BOTH `AuditLog` and the new `SystemEvent` — the same "one repository,
  two line-item-shaped entities" precedent `PaymentRepository`'s own
  handling of `PaymentAllocation` established), Dashboard, Report (a 4th
  repository beyond this milestone's own named 3-repository list, added
  because `ScheduledReport` would otherwise be dead schema — the same
  judgment call `CustomerTagRepository` made in Milestone 9). Tenant-
  isolated, RBAC-protected via `PermissionsGuard`. Reused the
  ALREADY-EXISTING `audit_logs:read` permission (Phase 1.1B, never
  granted beyond `admin`/`super_admin` — zero seed changes needed to
  already match this milestone's own "Audit: Admin, Super Admin" tier)
  but deliberately did NOT reuse the pre-existing, differently-scoped
  `notifications:read` ("view own notifications," broadly granted to
  Sales/Client/Customer/Manager from Phase 1.1B — reusing it for this
  milestone's admin-wide List/Get/Retry surface would have silently
  over-granted it); 4 new permissions instead (`notifications:manage`,
  `dashboard:read`, `reports:read`/`write`, all Manager+). Imports FIVE
  other modules — `OrdersModule` (`OrderRepository`, new
  `getRevenueSummary()`), `InventoryModule` (`InventoryService`, new
  `getStockValuation()`/`getLowStockItems()`), `BillingModule`
  (`InvoiceRepository`, now `exports: [InvoiceRepository]` — new this
  milestone — new `getOutstandingSummary()`/`getCollectionSummary()`),
  `CrmModule` (`LeadRepository`/`FollowUpRepository`, now `exports:
  [LeadRepository, FollowUpRepository]` — new this milestone, both
  consumed via inherited `BaseRepository.count()`, no new method needed
  on either), `CatalogModule` (`ProductRepository`, already exported
  since Milestone 6) — one for each of this milestone's own explicitly
  named analytics targets (Orders/Inventory/Billing/CRM), plus a 5th,
  `catalog` (published product count), added so `DASHBOARD_KPI_MODULES`'s
  own literal 5-entry allowlist constant has no named-but-unimplemented
  module — the same "don't leave a named capability unreachable"
  discipline generalized in `domain-module-guide.md`'s new §22.
  One-directional, zero circular dependencies — still a clean DAG even
  at five imports. `DashboardService` computes one KPI summary per
  aggregated module by reaching ONLY the already-exported artifact of
  each source module, never a second export or a direct cross-module
  `PrismaService` reach-around; `ReportingService.generate()` computes
  its own snapshot via the SAME `DashboardService.getKpis()` call rather
  than re-implementing any aggregate query — "Never duplicate
  calculations already available elsewhere," this milestone's own
  explicit instruction, now `domain-module-guide.md` §22's second
  corollary. `notification.retry()` is the ONE publicly-routed mutation
  this milestone builds (`create()`/`queue()`/`markSent()`/
  `markFailed()` stay real, tested, and route-less — the same "no route
  because no real caller exists yet" precedent Milestone 7's own
  `consumeReservation()` established, since real notifications will be
  triggered by FUTURE business events not yet built); `retry()` also
  records an `AuditLog` entry for itself (action `notification.retry`,
  the request body's own `note` field folded into `after`) — CLAUDE.md's
  own non-negotiable "every feature ships with... audit logging" rule,
  applied concretely to this milestone's one real mutation-with-a-route.
  `DashboardService.overview()` also surfaces a lightweight system-health
  signal (`systemErrorCount24h` — ERROR-severity `SystemEvent` rows in
  the trailing 24 hours, via a new `AuditRepository.
  countSystemEventsBySeverity()`) alongside the per-module KPIs and the
  tenant's own active `DashboardWidget` set. Removed the stale, empty
  Phase 0 `apps/api/src/modules/notifications/` scaffold folder (a
  placeholder README + empty subdirs, zero real files, never referenced
  by any source file) — this milestone's own brief names the module
  `AdminModule`, covering four areas, not just Notifications, so the
  real feature was built under `admin/` instead, leaving that scaffold
  empty and actively misleading; its one referencing comment
  (`apps/api/src/config/notifications/README.md`) updated to point at
  `admin/` instead. 4 new tables (`NotificationTemplate`, `SystemEvent`,
  `DashboardWidget`, `ScheduledReport`), 4 new enums, plus additive
  columns on the existing `notifications` table; migration
  `20260722120000_add_admin_platform_analytics_notifications`. Full RLS
  (enable + all 3 standard policies) added for all 4 new tables —
  verified live via direct `pg_tables`/`pg_policies`/
  `information_schema.role_table_grants` queries (4/4 tables,
  `rowsecurity = true`, 12/12 policies; `system_events`/
  `scheduled_reports` grants confirmed limited to `INSERT`+`SELECT`
  only for `antrique_app`/`antrique_service`, matching `payments`/
  `audit_logs`/`payment_allocations`'s own append-only treatment), not
  assumed from the migration file alone. Seed data: 3
  `NotificationTemplate` rows, 3 `DashboardWidget` rows (one per real
  aggregated-module consumer with a natural KPI story), 2 sample
  `Notification` rows on the Milestone 8 Jordan order/invoice — one
  `SENT`, one `FAILED` (the `FAILED` one is what "Retry placeholder" has
  something real to act on), 2 `AuditLog` rows, 2 `SystemEvent` rows
  (one `WARNING`, one `ERROR` — the same row `systemErrorCount24h` picks
  up live), and 1 `ScheduledReport` (`SALES_SUMMARY`, computed from the
  same live order data) — idempotency re-verified (ran the seed script
  twice, identical resulting row counts both times). Full validation:
  `pnpm lint`/`typecheck`/`build`/`test` all clean (153 suites/858 tests,
  up from 135/778 — 18 new suites, 80 new tests: 6 DTO, 4 repository, 4
  service, 4 controller spec files). Live boot with zero DI issues (all
  Milestone 11 routes correctly mapped), and a full live HTTP smoke test
  (18 checks, all passed) covering RBAC (customer forbidden from
  Notifications/Dashboard/Reports entirely — Manager+ only; manager
  forbidden from Audit — Admin+ only), notification retry resetting
  `FAILED` → `PENDING` with `retryCount` incremented and a matching
  `AuditLog` entry immediately visible via `GET /audit-logs?search=...`,
  a second retry attempt correctly rejected (no longer `FAILED`),
  dashboard overview returning all 5 modules + 3 widgets +
  `systemErrorCount24h` >= 1 (the seeded `ERROR` `SystemEvent`),
  per-module KPI endpoints returning real computed numbers (not seed-data
  literals), an unknown module cleanly rejected with `400`, report
  generation producing a real snapshot from live order data, and report
  list/download-metadata both reflecting it.

- Milestone 10 (Payments & Billing Foundation) implementation is done
  and fully validated, awaiting its review pass. "This module owns
  financial records only. It must not become a payment gateway
  implementation" (this milestone's own framing) — the sixth real
  business module. Architecture audit (run before writing any code, per
  this milestone's own explicit "Before Implementation" requirement)
  found `Invoice`/`InvoiceItem`/`Payment`/`Quotation`/`QuotationItem`
  already fully modeled since Phase 1.1A/1.1B with ZERO application-
  layer consumers — the same "schema exists, first real consumer"
  situation Milestones 3 and 9 already found — and, notably, that the
  existing schema had ALREADY anticipated two of this milestone's own
  business rules at the database level before any application code
  existed: `invoices_amount_paid_check`
  (`20260717091000_check_constraints`, "amount_paid >= 0 AND amount_paid
  <= total_amount") already enforced "Paid amount never exceeds invoice
  total," and `payments` already had `UPDATE`/`DELETE` revoked at the
  database-privilege level (`20260717091500_row_level_security`)
  already enforcing append-only payment records. A new `BillingModule`
  (`apps/api/src/modules/billing/`) provides three controller/service/
  repository triads — Invoice, Payment, Tax — tenant-isolated, RBAC-
  protected via `PermissionsGuard`. Reused the ALREADY-EXISTING
  `invoices:read`/`invoices:write`/`payments:read` permissions (Phase
  1.1B) rather than defining new ones — only extended their grants
  (`manager` gains `invoices:write` [already had `invoices:read`],
  `manager`/`customer` both gain `payments:read` [previously granted to
  nobody at all]); 6 new permissions for the genuinely new tiers
  (`invoices:void`/`payments:refund` [Admin+-only, mirroring Milestone
  8's own `orders:cancel`], `payments:write`, `tax_rates:read`/`write`/
  `delete`). Imports TWO other modules — `OrdersModule` (now `exports:
  [CustomerRepository, OrderRepository]` — `OrderRepository` was
  deliberately NOT exported at Milestone 9, since no CRM business rule
  read Order data; this milestone is the real consumer that scoping
  note anticipated) for "Invoices belong to Orders," and `CatalogModule`
  (exported `ProductRepository`) to resolve invoice line-item
  descriptions from the originating order line's own product variant
  SKU — the SAME repository `OrdersModule` itself already imports for
  an identical reason. Deliberately does NOT import `CrmModule` — "CRM
  remains independent," this milestone's own explicit instruction.
  `Invoice`/`Payment` are reused wholesale but genuinely extended, not
  left untouched: `Invoice.clientId` (the pre-existing, still-unconsumed
  agency-billing path → `Client`) relaxed from required to nullable,
  gaining NEW `customerId`/`orderId` (→ Milestone 8's `Customer`/
  `Order`) and `taxRateId` — kept deliberately SEPARATE from `clientId`,
  the same "two independent paths on one shared entity" pattern
  Milestone 9 established for `Lead.convertedCustomerId` vs.
  `convertedClientId`, now generalized into `domain-module-guide.md`
  §21 ("relaxing a required column to nullable is additive precisely
  when zero consumers ever depended on it being non-null"). Two new
  `CHECK` constraints back this: `invoices_client_xor_customer_check`
  (mirroring `quotations_lead_xor_client_check` exactly) and
  `invoices_order_requires_customer_check`. `Payment.invoiceId`/
  `provider`/`providerRef` (the pre-existing gateway-webhook-event
  shape) similarly relaxed to nullable, gaining NEW `paymentMethodId`/
  `method`/`reference` for this milestone's own manually-RECORDED-
  payment flow — "Record payment" and "Allocate payment" are separate
  business responsibilities specifically so a payment can exist before
  it's tied to any invoice; the new `PaymentAllocation` table is the
  actual invoice-by-invoice ledger, used even for the common
  single-invoice case, and gets the SAME database-privilege-level
  `UPDATE`/`DELETE` revoke `payments` already has (a fresh `REVOKE`
  statement in this migration, not an edit to the earlier one).
  Genuinely new capability beyond every prior milestone's scope:
  `PaymentService.record()`/`allocate()` both re-verify "Payment
  allocations cannot exceed payment amount" (summed inside the
  transaction) and "Paid amount never exceeds invoice total" (the
  pre-existing `invoices_amount_paid_check` is the real backstop)
  inside the SAME transaction as the `PaymentAllocation` write, flipping
  the invoice to `PAID` automatically once `amountPaid` reaches
  `totalAmount`. `InvoiceService.createFromOrder()` generates invoice
  numbers via a per-tenant-per-year count + bounded retry-on-collision
  loop (proportionate for this milestone's own low-concurrency
  admin-driven flow — the existing partial unique index on
  `(tenantId, invoiceNumber)` is the race-free backstop regardless).
  `PATCH /invoices/:id` ("Update draft invoice") was added beyond this
  milestone's own literal "Controllers" list — the same "don't leave a
  named Service capability permanently unreachable" reasoning already
  applied to `LEAD_CREATED`'s own reachability gap in Milestone 9.
  `TaxRateController` is full CRUD (this milestone's own explicit "Tax —
  CRUD" Controllers entry); `PaymentMethod` gets none — the same
  asymmetry class as Milestone 9's `CustomerTag`/`LeadSource`
  (`Payment.method`'s own required free-text fallback already satisfies
  everything a `PaymentMethod` write path would, the way `Lead.source`
  did for `LeadSource`). "Refund placeholder" is a genuine stub —
  validates the payment exists, then throws `NotImplementedException`
  (`501`) explaining real refund processing needs gateway integration,
  rather than silently no-oping or pretending to succeed (there's no row
  it could mutate anyway — `payments` has `UPDATE`/`DELETE` revoked).
  3 new tables, migration
  `20260722110000_add_payments_billing_foundation`. Full RLS (enable +
  all 3 standard policies) added for all 3 new tables — verified live
  via direct `pg_tables`/`pg_policies` queries (3/3 tables, `rowsecurity
  = true`, 9/9 policies), not assumed from the migration file alone.
  Seed data: 2 `TaxRate` rows (GST 18%, No Tax), 3 `PaymentMethod` rows
  (Cash, Bank Transfer, Cheque), and a real `Invoice` → `Payment` →
  `PaymentAllocation` chain against the Milestone 8 Jordan order —
  created `DRAFT`, issued, then paid off via TWO payments (one partial
  via bank transfer, one completing it via cash), demonstrating "Partial
  payment"/"Multiple payments"/"Mark invoice paid" live in seed data —
  idempotency re-verified (ran the seed script twice, identical
  resulting row counts both times). Full validation: `pnpm lint`/
  `typecheck`/`build`/`test` all clean (135 suites/778 tests, up from
  121/696 — 14 new suites, 82 new tests: 5 DTO, 3 repository, 3 service,
  3 controller spec files). Live boot with zero DI issues (all Milestone
  10 routes correctly mapped), and a full live HTTP smoke test (30
  checks, all passed) covering RBAC (customer read-only including the
  reused `invoices:read`/newly-granted `payments:read`, manager
  write-but-not-void/refund), the full invoice lifecycle (create from
  order with server-computed tax → update draft → issue → immutability
  after issuance), two-payment partial-then-full settlement with
  automatic `PAID` marking, explicit unallocated-payment recording +
  later allocation, over-allocation rejection, void-then-reject-payment
  behavior, double-void rejection, the refund placeholder's real `501`,
  tax rate CRUD with Admin+-only delete, tenant-scoped filtering, and a
  missing token (401).

- Milestone 9 (CRM & Customer Operations) implementation is done and
  fully validated, awaiting its review pass. "The CRM module owns
  customer engagement and sales activities. It must not duplicate
  customer, order, or authentication logic" (this milestone's own
  framing) — the fifth real business module. Architecture audit (this
  milestone's own explicit "Before Implementation" requirement, run
  before writing any code) found `Lead` (plus `Client`/`ContactRequest`)
  already fully modeled since Phase 1.1A with ZERO application-layer
  consumers — no `LeadRepository`/`LeadService`/`LeadController` existed
  anywhere, the same "schema exists, this is its first real consumer"
  situation Milestone 3 found for Role/Permission — reused wholesale,
  not duplicated. A new `CrmModule` (`apps/api/src/modules/crm/`)
  provides five controller/service/repository triads — Lead,
  CustomerNote, CustomerActivity (read-only — "Timeline, List" only,
  every row written internally), FollowUp, and CustomerTag (a 5th triad
  beyond this milestone's own named "Repository Layer"/"Service Layer"/
  "Controllers" lists, added because `CustomerTag`/`CustomerTagAssignment`
  are named in "Core entities" and the "Tags" filter requires them —
  without a write path they'd be permanently dead schema; `LeadSource`,
  also unnamed, got NO controller since its own brief provides a
  built-in fallback, the legacy free-text `source` column — see
  `docs/implementation/decisions.md`), tenant-isolated, RBAC-protected
  via `PermissionsGuard`. Reused the ALREADY-EXISTING `leads:read`/
  `leads:write` permissions (Phase 1.1B's original agency-CRM seed)
  rather than defining new ones — only extended their grants (`manager`
  gains `leads:write`, `customer` gains `leads:read`); 10 new
  permissions for the four genuinely new entities
  (`customer_notes:*`/`follow_up_tasks:*`/`customer_tags:*` [3 each] +
  `customer_activities:read` [1, no write]). Imports ONE other module —
  `OrdersModule`, now `exports: [CustomerRepository]` (additive; its own
  `OrderRepository` deliberately NOT exported — unused by any Milestone
  9 business rule) — for "Use: CustomerRepository," reused directly for
  "Convert Lead → Customer" rather than duplicated. `Lead` gained
  exactly two additive nullable columns: `convertedCustomerId` (→ the
  NEW `Customer`, Milestone 8's e-commerce entity — a conversion path
  kept deliberately SEPARATE from the pre-existing `convertedClientId` →
  `Client`, the agency's own B2B path from the original CRM funnel — see
  `docs/implementation/decisions.md` for the full reasoning on why these
  coexist rather than one replacing the other) and `leadSourceId` (→ new
  `LeadSource` lookup, additive alongside the existing free-text
  `source` column), plus `LeadStatus.ARCHIVED`. Genuinely new capability
  beyond every prior milestone's scope: `LeadService.convert()` threads
  ONE transaction across the `OrdersModule` boundary — the same shape
  Milestone 8's own `domain-module-guide.md` §19 established for order
  creation, now documented generalized as §20 for reusing a previously-
  unconsumed entity across a milestone boundary — finds-or-creates a
  `Customer` (via two new `CustomerRepository` tx-taking variants,
  `findActiveByEmailInTx()`/`createWithRelationsInTx()`, purely
  additive — `OrdersModule`'s own `CustomerService` is unaffected),
  updates the Lead's own status, and writes a `LEAD_CONVERTED`
  `CustomerActivity`, all atomically. A real defect was caught and fixed
  BEFORE anything downstream depended on it: `CustomerActivity.customerId`
  was initially modeled required (matching its own "Customer"-prefixed
  naming), which made this milestone's own "automatic activity creation
  for lead creation" trigger impossible to satisfy (no Customer exists
  yet when a lead is first created) — caught during implementation, the
  already-applied migration was rolled back live, the column made
  nullable, `CustomerActivityType` trimmed from 6 speculative values
  down to exactly the 3 this milestone's own trigger list names, and the
  corrected migration re-applied — confirmed via a fresh `pg_tables`/
  `pg_policies` check afterward, not assumed. A second gap was caught
  during the live smoke test itself (not by inspection): a `LEAD_CREATED`
  activity (`customerId: null`) is structurally invisible to the
  customer-scoped `timeline()` endpoint — fixed by adding a `leadId`
  filter to the general `list()` endpoint (mapping to the already-
  indexed `relatedLeadId` column) so it stays reachable through this
  milestone's own second named read surface. `FollowUpTask` references
  EITHER a `Lead` OR a `Customer`, never both — a hand-written
  cross-column `CHECK` constraint (`follow_up_tasks_lead_xor_customer_check`)
  mirroring the existing `Quotation`/`InventoryItem` lead-vs-client XOR
  precedent, extended to a lead-vs-customer choice — "Due-date
  validation" additionally rejects a `dueAt` in the past on
  create/update. "Prevent duplicate active leads" is a service-level
  check only (`LeadRepository.findActiveByEmail()`, scoped to
  non-terminal statuses), not a DB constraint — the same "proportionate,
  not maximal" judgment call Milestone 8 made for "default addresses."
  6 new tables, 2 new enums, migration
  `20260722100000_add_crm_customer_operations`. Full RLS (enable + all 3
  standard policies) added for all 6 new tables — verified live via
  direct `pg_tables`/`pg_policies` queries (6/6 tables, `rowsecurity =
  true`, 18/18 policies), not assumed from the migration file alone.
  Seed data: 5 `LeadSource` rows, 1 additional Lead ("Morgan Ellis")
  demonstrating the new `convertedCustomerId` path end-to-end with its
  own resulting Customer (the pre-existing `LEAD_CONVERTED_ID` lead
  still demonstrates the old `convertedClientId` path, untouched), 2
  `CustomerNote`/3 `CustomerActivity`/2 `FollowUpTask` (one Customer-
  scoped `COMPLETED`, one Lead-scoped `PENDING` — both sides of the XOR)/
  2 `CustomerTag` rows with 1 assignment — idempotency re-verified (ran
  the seed script twice, identical resulting row counts both times).
  Full validation: `pnpm lint`/`typecheck`/`build`/`test` all clean (121
  suites/696 tests, up from 100/576 — 21 new suites, 120 new tests: 6
  DTO, 5 repository, 5 service, 5 controller spec files). Live boot with
  zero DI issues (all Milestone 9 routes correctly mapped, including
  confirming `GET /customer-activities/timeline` is declared ahead of
  the module's own general list route), a fresh `pnpm db seed` run
  confirmed idempotent, and a full live HTTP smoke test (28 checks, all
  passed) covering RBAC (customer read-only including the reused
  `leads:read`, manager write including the reused `leads:write`),
  duplicate-active-lead rejection (409), the full lead create →
  duplicate-rejected → convert → immutability lifecycle, the follow-up
  create → complete → edit-rejected → reopen → cancel lifecycle, tag
  create/assign/unassign/re-unassign-404, lead archive → update-rejected
  immutability, the `leadId`-filtered activity reachability fix itself,
  tenant-scoped filtering, and a missing token (401).

- Milestone 8 (Order Management & Checkout) implementation is done and
  fully validated, awaiting its review pass. The orchestration layer
  that coordinates existing domains rather than reimplementing their
  logic, and the fourth real business module — the most cross-module-
  dependent one in this arc, importing THREE other modules
  (`CatalogModule` for `ProductRepository`, `BespokeModule` for
  `ProductCustomizationRepository`, `InventoryModule` for
  `InventoryService`). A new `OrdersModule`
  (`apps/api/src/modules/orders/`) provides two controller/service/
  repository triads — Customer (full CRUD) and Order (create/update/
  cancel/get/list/change-status) — for `Customer`, `CustomerAddress`,
  `Order`, `OrderItem`, `OrderStatusHistory`, `PaymentRecord`
  (placeholder only — no service/controller/repository of its own,
  purely a schema anchor for the payment-gateway-integration milestone
  this one's own "Do NOT Implement" list explicitly defers), tenant-
  isolated, RBAC-protected via `PermissionsGuard` (6 new permissions —
  `customers:read`/`write`/`delete` + `orders:read`/`write`/`cancel`,
  `cancel` replacing the usual `delete` tier since Order has no delete
  endpoint, its own stricter Admin+-only permission), paginated,
  filterable, sortable. Genuinely new schema (6 tables, 1 enum,
  migration `20260722090000_add_order_management`). Genuinely new
  capability beyond every prior milestone's scope: threading ONE
  transaction across a module boundary — `OrderService.create()`
  validates customer/variant/customization/pricing BEFORE opening a
  transaction (fail fast), then opens `OrderRepository.runInTransaction()`
  and passes that SAME `Prisma.TransactionClient` into every
  `InventoryService` call it makes (`reserveStockForOrder()`,
  `releaseReservation()`, `consumeReservation()` — all three gained an
  explicit `tx` parameter this milestone), so an order's own rows and
  its inventory side-effects commit or roll back together — see
  `docs/architecture/domain-module-guide.md` §19 for the fuller
  reasoning on why this is the first milestone where a transaction
  boundary genuinely crosses a module import, and why threading the
  client through (rather than two separately-opened transactions) is
  what makes the combined operation atomic. "No status mutation without
  history" is enforced structurally, not by convention: `changeStatus()`/
  `cancel()` both write the status update and its `OrderStatusHistory`
  row inside the same transaction as any inventory side-effect (consuming
  reservations on reaching `COMPLETED`, releasing them on `CANCELLED`).
  `changeStatus()` only accepts the single valid forward transition from
  the order's current status (`ORDER_FORWARD_TRANSITIONS`) — `CANCELLED`
  is reachable only through the separate, more-privileged `cancel()`
  endpoint, a deliberate re-reading of the brief's own literal
  Draft→Pending→Confirmed→Processing→Completed→Cancelled diagram as
  realistic e-commerce semantics rather than a strict sixth sequential
  step (see `docs/implementation/decisions.md`). Reaching `COMPLETED`
  calls `InventoryService.consumeReservation()` — the real caller
  Milestone 7's own version of that method was built for but had no
  controller route to reach yet (Milestone 7's own README flagged this
  explicitly as a predicted future caller). Full RLS (enable + all 3
  standard policies) added for all 6 new tables — verified live via
  direct `pg_tables`/`pg_policies` queries (6/6 tables, `rowsecurity =
  true`, 18/18 policies), not assumed from the migration file alone.
  Seed data: 6 new permissions, `manager`/`customer` grants extended
  (`manager` deliberately NOT granted `orders:cancel` — this milestone's
  own explicit Admin+-only tier), plus 1 customer (with 1 default
  shipping+billing address) and 1 order (1 item against the seeded
  solitaire ring variant, with its own inventory reservation feeding
  Milestone 7's own reserved count, and an initial `DRAFT`
  `OrderStatusHistory` row) — idempotency re-verified (ran the seed
  script twice, identical resulting row counts both times). Full
  validation: `pnpm lint`/`typecheck`/`build`/`test` all clean (100
  suites/576 tests, up from 94/527 — 6 new suites, 49 new tests: 3 DTO
  (`create-order`/`create-customer`/`order-list-query`), 1 service
  (`order.service.spec.ts` — the module's most business-logic-dense file,
  previously with zero coverage), 2 controller spec files
  (`order.controller.spec.ts`/`customer.controller.spec.ts`, also
  previously uncovered) — `customer.service.spec.ts`/
  `order.repository.spec.ts`/`customer.repository.spec.ts` already
  existed from this milestone's own implementation phase). Live boot with zero
  DI issues (all Milestone 8 routes correctly mapped), a fresh `pnpm db
  seed` run confirmed idempotent, and a full live HTTP smoke test (17
  checks, all passed) covering RBAC (customer 200 on read/403 on
  customer-write, manager 201 on customer/order create, manager 403 on
  cancel, admin 200 on cancel), the full DRAFT→PENDING→CANCELLED
  lifecycle with correct `OrderStatusHistory` ordering, a rejected skip-
  ahead status transition (400), a rejected double-cancel (400), a real
  inventory reservation created on order create and released back on
  cancel (confirmed via `GET /inventory/:id`'s own `reserved` counter
  before/after), a missing token (401), and status filtering on `GET
  /orders`. `docs/architecture/backend.md`/`database-schema.md`/
  `domain-module-guide.md` (new §19) and
  `apps/api/src/modules/orders/README.md` all updated; Milestone 7's own
  review pass is still separately pending (unrelated to this milestone's
  own scope) — see below.

- Milestone 7 (Inventory & Stock Management) implementation is done,
  awaiting its review pass. The third real business module, and the
  first with zero cross-module imports: a new `InventoryModule`
  (`apps/api/src/modules/inventory/`) provides three controller/service/
  repository triads — Warehouse (full CRUD), Inventory (domain-specific
  stock operations, no plain create/delete), Supplier (full CRUD, nested
  `SupplierProduct`) — for `Warehouse`/`InventoryItem`/
  `InventoryTransaction`/`InventoryReservation`/`Supplier`/
  `SupplierProduct`, tenant-isolated, RBAC-protected via
  `PermissionsGuard` (8 new permissions — `warehouses:*`/`suppliers:*`
  [3 each] + `inventory:read`/`write` [2, no delete — the brief lists no
  delete operation for InventoryItem]), paginated, filterable, sortable,
  soft-delete-aware. Genuinely new schema (6 tables, 4 enums, migration
  `20260721100000_add_inventory_management`). New business-rule surface
  beyond every prior milestone's CRUD-only scope — real transactional
  stock math: `InventoryRepository.applyStockChange()`/`reserveStock()`/
  `releaseReservation()`/`consumeReservation()` each run inside one
  `prisma.$transaction()` callback, using Prisma's atomic `{ increment
  }`/`{ decrement }` (not a read-then-write in application code) so
  concurrent stock mutations are race-free without explicit row locking,
  with the counter mutation and its `InventoryTransaction` ledger row
  always written together ("Stock changes always create transaction
  records"). Every mutating `InventoryService` method pre-checks the
  resulting counters before writing ("Prevent negative stock"/"Prevent
  over-reservation"/"Reservation cannot exceed availability"), with a new
  `isCheckConstraintViolation()` helper (`utils/prisma-error.util.ts`,
  the P2004 counterpart to the existing P2002
  `isUniqueConstraintViolation()`) translating a genuine concurrent-write
  CHECK-constraint race into a clean 409 as the backstop.
  `InventoryItem`/`SupplierProduct` both reference EITHER a
  `ProductVariant` OR a `Fabric` via the same lead-vs-client XOR pattern
  `Quotation` already established in Phase 1.1B — a hand-written
  cross-column `CHECK` constraint, plus (a genuinely new landmine no
  prior migration hit) TWO partial unique indexes on `InventoryItem`, one
  per side of the XOR, since Prisma's auto-diff proposed neither at all.
  Unlike Milestone 6's "export a module's repository, import the module"
  pattern, this module validates its two cross-module references
  (`ProductVariant` from catalog, `Fabric` from bespoke) via direct
  existence-check methods on its own repositories instead — importing
  both `CatalogModule` and `BespokeModule` for two narrow checks was
  judged not worth the coupling, especially since `ProductVariant` has no
  repository of its own to import in the first place (see
  `domain-module-guide.md` §18 for the "when to reuse an export vs.
  check directly" reasoning). "Soft delete only when no active inventory
  exists" is enforced on `Warehouse.remove()` (422 if any
  `InventoryItem` in that warehouse still has on-hand or reserved stock)
  — `InventoryItem` itself has no delete endpoint at all this milestone.
  `InventoryService.consumeReservation()` exists and is unit-tested but
  has no controller route — the brief's own "Controllers" list has no
  "Consume reservation" entry even though "Service Layer" lists it as a
  required capability; read literally as "releasing a hold is an admin
  action exposed now, consuming one is naturally triggered by order
  fulfillment, which doesn't exist yet." No design guidance existed in
  `docs/product/` for inventory/warehouse/supplier either — checked
  fresh, and confirmed both `catalog/README.md`/`bespoke/README.md`
  explicitly disclaim inventory as out of their own prior scope without
  ever describing its shape. Milestones 1–6 (the user's own labels for
  those deliverables — distinct from the roadmap's "◆ M1" sprint
  milestone above) all went straight from implementation to the next
  milestone without an intervening review pass — a consistent user
  workflow choice across this arc, not an oversight; each one's own
  implementation report is the only record of that work's validation so
  far. Next up: Milestone 7's review pass.

  **Environment note:** the host machine's C: drive filled to 0 bytes
  free during Phase 1.2D.4 (unrelated to this project) and has fluctuated
  24MB → 322MB → 3.9GB free across every phase and review since; every
  validation step in each of them was re-verified against current free
  space rather than assumed to succeed. ~1.0GB free as of this milestone
  — noticeably lower than Milestone 6's 3.2GB, re-verified before every
  disk-touching step in this milestone rather than assumed safe from an
  earlier reading.

- Sprint 1 → Auth integration, Milestone 7 implementation (Inventory &
  Stock Management): built a new `InventoryModule` with three
  controller/service/repository triads —
  `WarehouseController`/`WarehouseService`/`WarehouseRepository`,
  `InventoryController`/`InventoryService`/`InventoryRepository`,
  `SupplierController`/`SupplierService`/`SupplierRepository`.
  Investigated first: `schema.prisma` had none of the 6 named entities,
  and a fresh repo-wide search found zero design guidance for inventory/
  warehouse/supplier anywhere — both `catalog/README.md`'s and
  `bespoke/README.md`'s own "What this module explicitly does NOT do"
  sections disclaim inventory by name, but neither describes its shape —
  proceeded with a deliberately generic inventory-ledger design, flagged
  explicitly. `InventoryItem`/`SupplierProduct` reference EITHER a
  `ProductVariant` OR a `Fabric`, mirrored exactly on the existing
  `Quotation.leadId`/`clientId` XOR precedent
  (`20260717091000_check_constraints`'s own "Cross-column" section) — a
  hand-written cross-column `CHECK` constraint, plus two hand-written
  partial unique indexes on `InventoryItem` (one per side of the XOR)
  that NEITHER Prisma's auto-diff NOR any prior migration's own template
  anticipated, since expressing "unique per warehouse+variant, but only
  when variant is the non-null side" needs a filtered index scoped to a
  specific column being non-null, not just `deleted_at IS NULL`.
  Migration `20260721100000_add_inventory_management` — hand-written,
  same fix classes as every migration since Milestone 5's own: the
  auto-diff's spurious `users(tenant_id, email)` re-add dropped outright;
  `warehouses`/`suppliers` (soft-deletable) get partial unique indexes.
  New `CHECK` constraint class beyond every prior migration's non-
  negative/positive-value checks: `reserved <= on_hand`, referencing two
  columns of the SAME row — the database-level backstop behind
  `InventoryService`'s own pre-checks for "Prevent negative stock"/
  "Prevent over-reservation." Full RLS (enable + all 3 standard policies)
  added for all 6 new tables — verified live via direct `pg_tables`/
  `pg_indexes`/`pg_constraint`/`pg_policies` queries (6/6 tables, 18/18
  policies, all 8 CHECK constraints, correct partial-vs-plain unique
  indexes), not assumed from the migration file alone. Genuinely new
  service-layer capability beyond every prior milestone's CRUD-only
  scope: `InventoryRepository.applyStockChange()`/`reserveStock()`/
  `releaseReservation()`/`consumeReservation()` each run inside one
  `prisma.$transaction(async (tx) => ...)` callback, using Prisma's
  atomic `{ increment }`/`{ decrement }` (a single `SET on_hand = on_hand
  + $delta` Postgres statement against the CURRENT row value at write
  time) rather than reading the row then writing a computed value back in
  application code — this is what makes concurrent stock mutations
  race-free without explicit row locking, and it composes correctly with
  the CHECK constraints (a concurrent double-decrement that would push a
  counter invalid still correctly fails on whichever transaction commits
  second). Added `isCheckConstraintViolation()` to
  `utils/prisma-error.util.ts` (the P2004 counterpart to the existing
  P2002 `isUniqueConstraintViolation()`) as the race-free backstop
  translation for `InventoryService`'s own optimistic pre-checks. A
  deliberate departure from Milestone 6's own "export a module's
  repository, import the module" cross-module pattern:
  `InventoryModule` imports NOTHING, validating its two external
  references (`ProductVariant` from catalog — which has no repository of
  its own to import in the first place — and `Fabric` from bespoke) via
  small existence-check methods reaching `this.prisma.productVariant`/
  `this.prisma.fabric` directly from its own repositories, rather than
  importing two whole modules for two narrow checks — documented as a
  new decision in `domain-module-guide.md` §18 rather than silently
  diverging from the established pattern. Seed data: 8 new permissions,
  `manager`/`customer` grants extended, plus 1 warehouse, 2 inventory
  items (one Fabric-based, one ProductVariant-based — demonstrating both
  sides of the XOR against the fabrics/ring variant seeded in Milestones
  5–6), 3 inventory transactions forming a ledger consistent with the
  items' own counters, 1 active reservation, and 1 supplier with 1
  supplier product — idempotency re-verified (ran the seed script twice,
  identical resulting row counts and ledger both times). Full validation:
  `pnpm lint`/`typecheck`/`build`/`test` all clean (91 suites/507 tests,
  up from 76/421 — 15 new suites, 86 new tests: 8 DTO, 3 repository, 3
  service, 3 controller spec files, plus 4 new tests for
  `isCheckConstraintViolation()`), live boot with zero DI issues (all
  Milestone 7 routes correctly mapped, including confirming
  `GET /inventory/transactions` is declared ahead of `GET /inventory/:id`
  so Nest's route matching doesn't swallow the literal path as an id
  param).

- Sprint 1 → Auth integration, Milestone 6 implementation (Bespoke
  Customizer Engine): built on top of Milestone 5's `CatalogModule`, a new
  `BespokeModule` with four controller/service/repository triads —
  `FabricController`/`FabricService`/`FabricRepository`,
  `MeasurementProfileController`/`MeasurementService`/
  `MeasurementRepository` (targets `MeasurementProfile` as its aggregate
  root, per the brief's own naming — see `domain-module-guide.md` §16),
  `StyleOptionController`/`StyleOptionService`/`StyleOptionRepository`,
  `ProductCustomizationController`/`ProductCustomizationService`/
  `ProductCustomizationRepository` (no `DELETE` route — the brief lists
  Create/Update/Get/List only). Investigated first: `schema.prisma` had
  none of the 10 named entities, and a fresh repo-wide search (not just
  `docs/product/`) found zero design guidance for "Bespoke Customizer"
  beyond Milestone 5's own forward-reference doc comments on
  `Product`/`ProductVariant` — proceeded with a deliberately generic
  bespoke-garment design, flagged explicitly. Added, beyond the brief's
  10 named entities, two structurally-required join tables not
  individually named: `ProductFabric` (Product ↔ Fabric many-to-many —
  a fabric like "Navy Wool Twill" is meant to be reusable across many
  products, which a single scalar FK can't express) and
  `StyleOptionIncompatibility` (needed to make "Incompatible style
  combinations are rejected" expressible at all). Migration
  `20260720200000_add_bespoke_customizer` — hand-written from `prisma
  migrate diff`'s raw output, same two classes of fix Milestone 5's own
  migration established: the auto-diff's spurious `users(tenant_id,
  email)` re-add dropped outright; `fabric_categories`/`fabrics`/
  `measurements`/`product_customizations`'s own new unique indexes
  hand-written as **partial** (`WHERE deleted_at IS NULL`) where
  soft-deletable (`product_customizations`' is on `product_id` alone — a
  true 1:1 relation Prisma's own relation validator requires, caught by
  `prisma format` mid-build, not discovered later — `@@unique([tenantId,
  productId])` doesn't satisfy that validator for a 1:1). New `CHECK`
  constraints beyond non-negative `sort_order`:
  `measurements.value > 0`, `monogram_options.max_characters > 0`, and a
  conditional bound on `pricing_adjustments` (`PERCENTAGE` between -100
  and 500) — enforcing "Pricing adjustments are valid"/"Monogram rules
  are enforced" at the database level too. Full RLS (enable + all 3
  standard policies) added for all 12 new tables, including both join
  tables — verified live via direct `pg_tables`/`pg_indexes`/
  `pg_constraint`/`pg_policies` queries (12/12 tables, 36/36 policies, all
  8 CHECK constraints, correct partial-vs-plain unique indexes),
  not assumed from the migration file alone. During schema work, a stray
  auto-inserted `fabric`/`fabricId` relation on `PricingAdjustment` (left
  over from an earlier design iteration where `Fabric` had a
  now-removed back-relation) caused a live `P2022` "column does not
  exist" error on first seed run — traced to `prisma format`'s relation
  auto-completion, fixed by removing both sides of the stray relation,
  re-verified via a fresh `prisma migrate diff` showing zero unexpected
  drift beyond the already-known `users` landmine. Seed data: 11 new
  permissions, `manager`/`customer` grants extended, plus one distinct
  garment product ("Made-to-Measure Oxford Shirt" — the existing jewelry
  catalog has no natural fabric/measurement/style-option story) with 2
  fabric categories, 2 fabrics, 1 fabric image, 1 measurement profile (3
  measurements, linked to the seeded `customer@antrique.dev` user), 1
  product customization (2 style option groups, 4 style options, 1
  incompatibility pair, 1 pricing adjustment, 1 monogram option) —
  idempotency re-verified (ran the seed script twice, identical resulting
  row counts both times). Full validation: `pnpm lint`/`typecheck`/
  `build`/`test` all clean (76 suites/421 tests, up from 57/328 — 19 new
  suites, 93 new tests: 8 DTO, 4 repository, 4 service, 4 controller
  spec files), live boot with zero DI issues (all Milestone 6 routes
  correctly mapped), and a full live HTTP smoke test covering RBAC
  (customer 403/manager 201/manager-delete 403), validation failures
  (bad slug 400, duplicate slug 409, duplicate measurement names 400,
  self-incompatibility rejection, cross-product incompatibility
  rejection 400, styleOptionId-at-create rejection 400, duplicate
  customization 409), soft delete (204 then 404), filtering, pagination,
  and a genuine second-tenant cross-tenant-isolation check (empty lists,
  direct cross-tenant id access 404s, no leak) — all passed; test
  artifacts cleaned up afterward.

- Sprint 1 → Auth integration, Milestone 5 implementation (Product
  Catalog Foundation): built this codebase's first real, full CRUD
  business module (Category/Collection/Product) on top of Milestones
  2–4's authentication/RBAC/tenant-resolution foundation. Investigated
  first: `schema.prisma` had NO product-catalog entities at all — unlike
  Milestones 3/4, which each found their target entities already fully
  modeled, this milestone genuinely needed new schema (`Category`,
  `Collection`, `Product`, `ProductVariant`, `ProductImage`, 3 new
  enums). Also checked `docs/product/*.md` for design guidance before
  choosing field names — found none (those docs model Antrique purely as
  a web agency selling services to its own clients, no e-commerce
  concept anywhere); proceeded with a deliberately generic catalog
  design, flagged explicitly in both `schema.prisma`'s own comment and
  `apps/api/src/modules/catalog/README.md`, mirroring
  `prisma/seed.ts`'s own "Scope gap, flagged rather than silently
  resolved" precedent from Phase 1.1B, rather than guessing at a
  specific product line. Migration `20260720190000_add_product_catalog`
  — hand-written from `prisma migrate diff`'s raw output (not applied
  verbatim): the auto-diff again proposed re-adding a plain unique index
  on `users(tenant_id, email)` (dropped outright — that table isn't
  touched here); `Category`/`Collection`/`Product`'s own new
  `(tenantId, slug)` unique indexes are hand-written as **partial**
  (`WHERE deleted_at IS NULL`), the same landmine/treatment
  `User`/`Role`/`Quotation`/`Invoice`/`Blog`/`Setting` already have;
  `ProductVariant`'s `(tenantId, sku)` index is correctly **plain** —
  that table has no soft-delete column. Non-negative `CHECK` constraints
  (`sort_order` on all 5 tables, `price` on `ProductVariant`) and full
  RLS (enable + all 3 standard policies) added for every one of the 5
  new tables, extending Phase 1.1B's own pattern to schema added after
  it rather than letting RLS coverage silently lag new tables — verified
  live via direct `pg_tables`/`pg_indexes`/`pg_constraint`/`pg_policies`
  queries after applying, not assumed from the migration file alone.
  Repository layer: `CategoryRepository`/`CollectionRepository`/
  `ProductRepository`, each with `findActiveById(id, tenantId)` and
  `findManyPaginated(tenantId, where, orderBy, skip, take)` — the latter
  merges `tenantId`/`deletedAt: null` into the query itself (never
  trusts a caller-assembled `where`) and runs `findMany`+`count` inside
  one `prisma.$transaction([...])` (array form) so a page's `total`
  can't disagree with its `items` under concurrent writes — this
  milestone's own "Transactions where appropriate" requirement, applied
  where genuinely needed. This required adding `count()` to
  `BaseRepository` itself (Phase 1.2D.3 infrastructure, extended for the
  first time since) — a genuine, simultaneous 3-repository need, the
  same "second/third real consumer" trigger this project's discipline
  already uses elsewhere. A real, non-obvious TypeScript limitation was
  found and fixed, not routed around: `BaseRepository`'s inherited
  `create()`/`update()` are typed via `ReturnType<TDelegate['create']>`,
  which cannot preserve Prisma's `include`-conditional return type
  through a still-generic method signature — confirmed live via
  `pnpm typecheck` that `product.variants` didn't exist on the inferred
  type despite existing at runtime. Fixed by adding plain, explicitly
  named methods (`ProductRepository.createWithRelations()`/
  `updateWithRelations()`) that call `this.delegate.create({ data,
  include })` directly with a literal args object, letting TypeScript's
  normal generic inference (which works correctly for an actual call
  expression, unlike a `ReturnType<>` type-level operation) resolve the
  real, relation-including type — documented in
  `docs/architecture/domain-module-guide.md` §16 as a standing lesson
  for any future repository needing `include`/`select`. Service layer:
  unique-constraint violations (`P2002`) translated to a clean `409` via
  a new `isUniqueConstraintViolation()` helper
  (`apps/api/src/utils/prisma-error.util.ts` — the first real file in
  the `utils/` placeholder folder, graduating it) rather than a
  pre-check-then-insert (which would race under concurrent requests);
  `update()`/`remove()` both call `findActiveById(id, tenantId)` first,
  which is what makes the subsequent plain `where: { id }` mutation
  tenant-safe. `ProductService` additionally injects
  `CategoryRepository`/`CollectionRepository` (not just its own
  `ProductRepository`) specifically to validate that a client-supplied
  `categoryId`/`collectionId` genuinely belongs to the caller's own
  tenant before letting a Product reference it — without this check, a
  real category belonging to a *different* tenant would pass Postgres's
  FK constraint (which only requires the referenced row to exist, not
  that it belongs to the same tenant), a genuine cross-tenant reference
  leak this milestone's "never trust client-supplied tenant identifiers"
  requirement extends to any client-supplied *foreign* id, not just an
  explicit tenant id — confirmed live with a fake-but-real-looking
  categoryId, correctly rejected with `400`. `createdBy`/`updatedBy`/
  `deletedBy` deliberately left unset everywhere in this module — a
  known, accepted gap: `RequestUser` (Milestone 2, still unchanged) is
  `{ email }` only, with no `userId` anywhere in the request pipeline to
  populate these nullable audit columns with; resolving it via an extra
  query per write, purely to fill an optional column, was rejected as
  scope this milestone's brief never asked for. RBAC design: used
  `PermissionsGuard` exclusively (not `RolesGuard`, despite the brief
  naming both) — the brief's own read/write/delete tiers map 1:1 onto
  `{resource}:read`/`write`/`delete` permission keys, the existing
  convention every other business domain in this catalog already uses,
  cleaner than hardcoding three role-name lists across nine controller
  methods across three controllers; 9 new permissions granted to
  `manager`(read+write)/`admin`+`super_admin`(read+write+delete)/
  `customer`(read only) in `prisma/seed.ts`, purely additively —
  `admin`/`super_admin` already had every permission automatically via
  `PERMISSIONS.map(p => p.key)`, unchanged. Discovered and fixed a real,
  latent test-infrastructure gap while writing this milestone's DTO
  specs (not introduced by this milestone): `@Type()` (class-transformer,
  used by the new `PaginationQueryDto`/nested `CreateProductDto.variants`)
  requires `reflect-metadata`'s global polyfill, which nothing in this
  codebase's Jest config ever loaded — no prior DTO used `@Type()`, so
  this never surfaced; fixed by adding `"setupFiles": ["reflect-metadata"]`
  to `package.json`'s `jest` config, the standard fix for this exact
  NestJS+Jest+class-transformer combination. Full validation:
  lint/typecheck/build/test all clean (328 tests passing across 57
  suites, up from 244/36 — 84 new, across 21 new spec files: 11 DTO, 3
  repository, 3 service, 3 controller, 1 utility). Live boot confirmed clean
  `CatalogModule dependencies initialized`, zero DI errors, all 15
  catalog routes mapped. Live `fetch` matrix logged in as all 4 seeded
  RBAC tiers, confirmed the complete validation surface: all tiers read
  (200), Customer blocked from write (403), Manager can write but not
  delete (403), Admin can delete (204, soft-deleted row then 404),
  validation failures return clean `400`s with field-level messages,
  duplicate slug returns `409`, product detail includes nested
  variants/images while list omits them, category/status/search
  filtering and page/limit pagination both work correctly, nested
  variant/image creation succeeds atomically (Prisma's own decimal
  `Decimal.toJSON()` confirmed serializing `price` as a string, not a
  float), a nonexistent categoryId is rejected with `400`, and a
  missing token still gets `401`.
- Sprint 1 → Auth integration, Milestone 4 implementation (Organization &
  Multi-Tenant Foundation): replaced the fixed `DEFAULT_TENANT_ID`
  bootstrap with real, request-based tenant resolution, preserving
  everything Milestones 1–3 built on top of it. Investigated first, before
  writing any code: `schema.prisma` has no separate `Organization`
  entity — `Tenant` (Phase 1.1A) already IS the platform's own
  multi-tenancy isolation boundary, so `OrganizationRepository` is a
  thin, purpose-named wrapper over it, not a new table (this milestone's
  own "Do NOT Implement: Organization CRUD" confirms this reading); a
  `User` belongs to exactly one `Tenant` via a direct FK, not a
  many-to-many membership table, so "user organization membership" is
  satisfied by the existing tenant-scoped `WHERE tenantId = X` filter,
  not a new join table. `TenantResolver`
  (`apps/api/src/tenant/tenant-resolver.service.ts`) implements the
  requested 3-priority chain — hostname (a ≥3-label, non-IP hostname's
  leftmost label, matched against `Tenant.slug`; no dedicated
  hostname/domain column exists, so this is subdomain-matching against
  the existing `slug`, not a schema change) → `X-Tenant-ID` header
  (dev/testing) → `DEFAULT_TENANT_ID` — with the critical safety property
  gated explicitly, not just documented: the dev fallback checks
  `nodeEnv === 'development'` before ever querying it, so a
  `production`/`test` request that resolves nothing gets a `400`, never
  a silent cross-tenant default. Every candidate (including the fallback
  itself) is independently validated against the database — a candidate
  that isn't a real active tenant is treated exactly like "no candidate."
  `TenantMiddleware` calls `TenantResolver` exactly once per request and
  attaches two frozen views — `TenantContext` (`{ tenantId }`, minimal,
  for query-scoping) and `OrganizationContext` (`{ id, name, slug }`,
  richer, for display) — satisfying "tenant resolution occurs once per
  request" and "request context is immutable after resolution" as literal
  runtime properties (`Object.freeze()`, not just TypeScript `readonly`),
  the same discipline `JwtAuthGuard`'s `request.user` already established.
  A real, non-obvious integration risk was identified and verified live,
  not assumed: `TenantMiddleware` is registered via `TenantModule`'s own
  `NestModule.configure()` + `MiddlewareConsumer.forRoutes('*')` —
  deliberately NOT `main.ts`'s raw `app.use()` pattern
  `HttpLoggingMiddleware` uses — because a thrown `BadRequestException`
  needs to reach Nest's own exception-filter pipeline
  (`ExceptionLoggingFilter`) to produce a clean `400` JSON response
  instead of a hang (Express 4, this app's platform, does not
  automatically catch a rejected promise from middleware — `use()` uses
  an explicit `try`/`catch` + `next(error)`, not a bare `await`).
  Confirmed by booting with `NODE_ENV=production` and no hostname/header
  hint: the response was exactly
  `{"message":"Tenant could not be resolved","error":"Bad
  Request","statusCode":400}`, and the SAME `requestId`/`correlationId`
  appeared in both `ExceptionLoggingFilter`'s log line and
  `HttpLoggingMiddleware`'s completion log, proving the whole pipeline
  genuinely connects, not just that *a* response came back.
  `AuthRepository`/`RoleRepository`/`PermissionRepository` all stopped
  injecting the fixed `defaultTenant` config directly and now take
  `tenantId` as a plain method parameter instead — `AuthController.login()`
  reads it via a new `@Tenant()` decorator (mirroring `@CurrentUser()`'s
  exact shape); `RolesGuard`/`PermissionsGuard` read
  `request.tenantContext` directly (guards run before a param-decorator
  would resolve). `refresh()`/`logout()` deliberately untouched — neither
  looks up a user by email. The `defaultTenant` config itself relocated
  from `modules/auth/config/` to the new `tenant/config/` — Milestone 3's
  own decision record had explicitly declined to relocate it when a
  second consumer appeared, reasoning that sharing one
  `ConfigModule.forFeature()` factory across two modules was normal and
  relocating for two would be premature; this milestone changes that
  calculus by removing all three of the old direct-injection consumers,
  leaving `TenantResolver` as the one genuine, non-cosmetic owner — this
  supersedes, not overwrites, that earlier reasoning, and is called out
  in this milestone's own decision entry rather than silently reversing
  it. `AuthTokenPayload`/`RequestUser`/`JwtAuthGuard` are genuinely
  untouched (confirmed via `find -newer`) — tenant never becomes a JWT
  claim, this milestone's own explicit requirement; the same "resolve by
  a request-scoped signal, not a token claim" shape Milestone 3 already
  used for RBAC. `GET /example/organization` (new) demonstrates
  `@Tenant()`/`@Organization()`, guarded by `JwtAuthGuard` only — no
  RBAC layered on top, this milestone's own explicit ask. Proactively
  fixed a genuine documentation drift found during the pass, not
  introduced by it: `database-schema.md`'s multi-tenant-strategy section
  claimed tenant_id propagation came "from the same JWT tenant claim
  used for everything else" — never true after this milestone's own
  explicit "no tenant in the JWT" requirement, corrected in place. Full
  validation: lint/typecheck/build/test all clean (244 tests passing
  across 36 suites, up from 218/31 — 26 new; two mechanical relative-
  import-depth mistakes in new files (`../../generated/prisma/enums`
  instead of `../../../generated/prisma/enums`), caught immediately by
  typecheck and fixed before ever reaching test/build; one guard-spec
  authoring bug from Milestone 3 was NOT reintroduced — the fixed
  `createReflector()`-returns-the-instance-passed-to-the-guard pattern
  from that review carried forward correctly into this milestone's
  rewritten guard specs). Live boot confirmed clean
  `TenantModule dependencies initialized` with zero DI errors, all three
  example routes mapped. Live `fetch`/`curl` matrix confirmed: default
  dev fallback, `X-Tenant-ID` header resolution, an unknown header value
  correctly falling through to the dev default, real hostname resolution
  (`Host: antrique.example.app` → resolved via the seeded tenant's own
  `slug`), `GET /example/organization` returning the correct
  `tenantId`/`organization`, RBAC still fully functional under real
  tenant resolution (Admin `200`/`200`, Customer `403` on the
  role-guarded route), refresh unchanged, JWT payload still exactly
  `email`/`iat`/`exp`, wrong-password login still `401` — and, in a
  separate `NODE_ENV=production` boot, the dev-fallback rejection and
  clean-exception-response properties above.
- Sprint 1 → Auth integration, Milestone 3 implementation (Role &
  Permission Foundation): built this codebase's first RBAC layer on top
  of Milestone 2's authentication. Investigated first, before writing any
  code: `Role`/`Permission`/`UserRole`/`RolePermission` already existed in
  `schema.prisma` in full (Phase 1.1A) and were already seeded (34
  permissions, 4 roles) — the brief's "create Role entity/Permission
  entity/UserRole relation/RolePermission relation" items were already
  satisfied, so this milestone added zero schema changes and zero
  migrations, only application-layer consumers. `RoleRepository`/
  `PermissionRepository` (`apps/api/src/authorization/repositories/`, new
  `@Global()` `AuthorizationModule`) are data-access only — one real
  method each: `findRolesForUser(email)` (a single query joining
  `Role → UserRole → User` via a nested Prisma relation filter, tenant-
  scoped on both sides) and `findPermissionsForRoles(roleIds)` (joining
  `Permission → RolePermission`, tenant-scoped through the join since
  `Permission` itself has no `tenantId` — it's a global catalog).
  Resolving by *email* rather than adding a `userId` claim to the JWT
  payload was a deliberate design choice, not an oversight: it keeps
  `AuthTokenPayload`/`RequestUser`/`login()`/`refresh()` genuinely
  byte-for-byte unchanged (confirmed via `find -newer`), avoiding a
  second architectural change to already-approved, already-tested token
  infrastructure in the same milestone that also touches guards. Even
  though the query resolves by email, `AuthorizationService` still
  correctly satisfies CLAUDE.md's tenant-scoping rule — every underlying
  query is tenant-scoped, only the *lookup key into that scope* is email
  instead of a pre-resolved id. `AuthorizationService` is a stateless
  singleton — "cache resolution within a request only, no Redis" is
  achieved by every method taking the *caller's* `AuthorizationCache`
  (`apps/api/src/types/authorization-cache.type.ts`) rather than holding
  a cache as its own instance field, which would have leaked one caller's
  roles/permissions into a concurrent, unrelated request; `RolesGuard`/
  `PermissionsGuard` create `request.authorizationCache ??= {}` on first
  use, the same place `request.user` already lives. `RolesGuard`
  (`common/guards/roles.guard.ts`)/`PermissionsGuard`
  (`permissions.guard.ts`) read `@Roles()`/`@Permissions()` metadata
  (`common/decorators/`, plain `SetMetadata()` wrappers with zero
  authorization logic of their own) via `Reflector`, delegate the actual
  question to `AuthorizationService`, and throw `ForbiddenException`
  (`403`) on failure — neither ever verifies a JWT or returns `401`;
  `JwtAuthGuard` keeps that job exclusively, and both new guards *trust*
  guard-array execution order (`@UseGuards(JwtAuthGuard, RolesGuard)`)
  rather than defensively re-checking it. `@Roles()` uses OR semantics
  (any listed role is sufficient), `@Permissions()` uses AND (every
  listed permission is required) — a deliberate asymmetry, documented in
  both decorators' own comments. Reused
  `modules/auth/config/default-tenant.config.ts` directly (a second
  `ConfigModule.forFeature()` registration, not a relocation) rather than
  moving it out of `modules/auth/` — a plain, stateless config factory
  supporting two consumers doesn't need a new home, and relocating a
  working, already-documented Milestone 1 file for a purely cosmetic gain
  would have been unnecessary churn. Seed data (`prisma/seed.ts`)
  reconciled the brief's requested role names ("Super Admin, Admin,
  Manager, Customer") against the already-seeded, differently-named roles
  ("admin, project_manager, sales, client") purely additively: added
  `super_admin` (same grant set as `admin` — this schema has no
  platform-vs-tenant-admin distinction to differentiate them on yet),
  `manager` (same grants as `project_manager`), `customer` (same grants
  as `client`); renamed `admin`'s *display name* only ("Administrator" →
  "Admin", same `key`, so the existing row updates rather than
  duplicating); left `project_manager`/`sales`/`client` untouched rather
  than renamed, avoiding any risk of orphaning a real dev database's
  existing `UserRole`/`RolePermission` rows for zero benefit (nothing
  programmatic referenced those keys before this milestone introduced
  RBAC enforcement). Generalized the seed's single admin-user block into
  a loop over 4 users (`admin@antrique.dev`, `superadmin@antrique.dev`,
  `manager@antrique.dev`, `customer@antrique.dev`), one per RBAC tier,
  each with a real Argon2id password so every tier could be live-tested
  end to end via actual login. Two example endpoints demonstrate the two
  guards: `GET /example/ping` gained `RolesGuard`
  (`@Roles('admin', 'super_admin')`) on top of its existing
  `JwtAuthGuard`; a new `GET /example/permission-ping` demonstrates
  `PermissionsGuard` (`@Permissions('projects:write')`) — both reuse the
  same `ExampleDomainService.ping()`/`PingResponseDto`, since the guard
  stacked on each route is the entire difference being shown, not the
  response shape. `ROLE`/`PERMISSION` constants
  (`modules/auth/constants/role.constant.ts`/`permission.constant.ts`)
  hold only the keys real code actually references — role/permission
  lookup itself stays database-driven, per this milestone's own
  requirement, not a hardcoded map. Proactively fixed cross-cutting
  documentation drift during implementation (not left for a review pass):
  `common/guards/README.md`/`common/decorators/README.md` (both claimed
  "no RBAC" — false the moment these guards/decorators existed),
  `modules/auth/README.md` (needed precision — RBAC is real now, but
  lives entirely outside this module), `modules/example-domain/README.md`
  and `types/README.md`, `docs/architecture/security.md`'s "Authz"/"RBAC"
  lines (previously described RBAC as aspirational), and
  `docs/architecture/database-schema.md` §10 (seed counts). Full
  validation: lint/typecheck/build/test all clean (218 tests passing
  across 31 suites, up from 188/24 — 30 new; one genuine test-authoring
  bug caught and fixed before it shipped — see `docs/implementation/decisions.md`).
  `pnpm db:seed` re-run against the real dev database confirmed live via
  direct Prisma queries: 7 roles (4 original + 3 new), all 4 test users
  correctly role-assigned. Live boot confirmed clean
  `AuthorizationModule dependencies initialized` with zero DI errors, both
  new routes mapped (`GET /example/ping`, `GET /example/permission-ping`).
  Live `curl`/`fetch` matrix logging in as all 4 seeded tiers against both
  guarded endpoints confirmed the complete validation matrix: Super Admin
  `200`/`200`, Admin `200`/`200`, Manager `403`/`200` (no
  `admin`/`super_admin` role, but does hold `projects:write`), Customer
  `403`/`403` (neither); missing token `401`, invalid token `401`, wrong
  password login `401`, garbage refresh token `401` — `login`/`refresh`
  confirmed unchanged.
- Sprint 1 → Auth integration, Milestone 2 implementation (Authorization
  Foundation): built this codebase's first request-authorization layer
  on top of Milestone 1's authentication. `JwtAuthGuard`
  (`apps/api/src/common/guards/jwt-auth.guard.ts`) — a hand-written
  `CanActivate`, deliberately not `@nestjs/passport` — extracts a Bearer
  token from the `Authorization` header
  (`extractBearerToken()`, exported standalone so the header-parsing
  edge cases — missing header, wrong scheme, empty token, non-string
  duplicated header — are unit-testable without a full `ExecutionContext`
  mock every time) and verifies it exclusively through
  `TokenService.verifyAccessToken()` — never `@nestjs/jwt`'s `JwtService`
  directly, never `verifyRefreshToken()`. A refresh token presented here
  is rejected for the identical structural reason `AuthService.refresh()`
  already rejects an access token in the reverse direction: signed with
  the wrong secret, fails the same signature check, no special-cased
  detection needed — confirmed live, not assumed. On success, attaches a
  genuinely frozen (`Object.freeze()`, not only TypeScript
  `readonly`-typed — confirmed live that a mutation attempt throws
  `TypeError`) minimal `RequestUser` (`{ email }`,
  `apps/api/src/types/request-user.type.ts`, plus the Express `Request`
  module augmentation making `request.user` type-check everywhere) to
  `request.user`, rebuilt from the decoded token rather than the raw
  decoded object passed through — the same "never leak `iat`/`exp` into
  the clean shape" discipline `reissueAuthTokenPayload()` already
  established. `CurrentUser`
  (`apps/api/src/common/decorators/current-user.decorator.ts`) reads it
  back out; its raw extraction logic (`extractCurrentUser()`) is exported
  separately from the `createParamDecorator()`-wrapped version, since
  Nest's param-decorator factories aren't callable directly the way a
  plain function is — `@CurrentUser()` itself is proven through a real
  controller and a live HTTP round trip instead. Applied per-route via
  `@UseGuards()`, not globally (`APP_GUARD`) — `POST /auth/{login,
  refresh,logout}` stay unauthenticated by simply not having the
  decorator, no `@Public()` exemption mechanism needed since nothing
  requires one yet. **`GET /example/ping` is the one route protected**
  (Milestone 2's own explicit ask, not scope creep) — the first
  deliberate change to that previously-always-byte-for-byte-unchanged
  reference endpoint across every phase through Phase 1.2D.10;
  `PingResponseDto` gained an `authenticatedAs` field (demonstrative
  only, not a permanent product field) specifically so the full guard →
  decorator → controller chain is verifiable via a live HTTP response,
  not only via the guard's/decorator's own isolated unit tests. **A real,
  non-obvious NestJS testing behavior was discovered and documented, not
  just worked around:** referencing `JwtAuthGuard` via `@UseGuards()`
  metadata pulls it into a `Test.createTestingModule()`'s DI graph even
  when a test never exercises the guard directly — Nest eagerly
  instantiates every injectable a compiled `TestingModule` can reach —
  so `example-domain.controller.spec.ts` needed a `TokenService` mock
  provider purely for `.compile()` to succeed; noted in
  `common/guards/README.md` as a testing note future protected
  controllers' own specs will need too. Proactively fixed cross-cutting
  documentation drift this arc's last three reviews kept finding
  reactively: `jwt/README.md`/`token.service.ts`'s own comments (claimed
  `verifyAccessToken()` had no caller — false the moment `JwtAuthGuard`
  existed), `modules/auth/README.md` (its "no guards" claim needed
  precision — true for `AuthController`'s own routes, no longer true
  codebase-wide), `modules/example-domain/README.md` and
  `docs/architecture/domain-module-guide.md` §15 (both described `ping()`
  as permanently unauthenticated) — all fixed during implementation this
  time, not left for the review pass to catch. Full validation:
  lint/typecheck/build/test all clean (188 tests passing across 24
  suites, up from 174/22 — 14 new). Live boot confirmed clean
  `AuthModule`/`ExampleDomainModule dependencies initialized` with zero
  DI errors — `JwtAuthGuard` resolved automatically through Nest's own
  DI container with no explicit provider registration anywhere, exactly
  as designed. Live `curl` against the real running server confirmed: a
  valid access token reaches the protected endpoint and the response
  genuinely reflects the authenticated identity
  (`{"authenticatedAs":"admin@antrique.dev","status":"ok"}`); a missing
  token, an invalid/malformed token, a refresh token presented as an
  access token, and a wrong auth scheme (`Basic` instead of `Bearer`)
  all `401`; `login`/`refresh`/`logout` all confirmed unchanged and
  still fully unauthenticated. Confirmed via `find -newer` that
  `auth.service.ts`/`auth.controller.ts`/`AuthRepository` are
  byte-for-byte untouched by this milestone. Expired-token rejection is
  unit-tested (a `-1`-TTL `TokenService`, the same precedent
  `token.service.spec.ts`/`auth.service.spec.ts` already established for
  this exact case) rather than live-waited-for, since the real access
  token TTL is 900 seconds.
- Sprint 1 → Auth integration, Milestone 1 implementation (Real
  Authentication): `POST /auth/login` performs genuine database-backed
  authentication for the first time in this arc. Two architectural
  conflicts were surfaced during investigation, before any code was
  written, and resolved with the user via explicit questions rather than
  guessed: (1) `schema.prisma`'s `User` model had no password field at
  all — its own comment and `docs/architecture/security.md`'s "Auth"
  line both said credential exchange lives entirely with a managed
  IdP — resolved by adding a nullable `passwordHash` column and making
  `idpSubject` nullable too (both credential paths now coexist), a new
  hand-written migration (`20260720095236_add_password_hash_to_users`),
  and updating `security.md`'s "Auth" line to document both paths. Prisma's
  own auto-diff (`prisma migrate diff`) also proposed re-adding a plain,
  non-partial unique index on `(tenant_id, email)` that would have
  collided with the existing case-insensitive partial index from the
  `partial_unique_indexes` migration — exactly the documented landmine
  that migration's own header comment warns every future migration
  touching `users` to check for; caught by inspection before applying,
  not by trial and error. (2) The brief excluded "Multi-tenancy" but
  CLAUDE.md's non-negotiable "tenant scope on EVERY query" rule still
  applies to any `User` query — resolved via a new, required
  `DEFAULT_TENANT_ID` env var and a `defaultTenant` config namespace
  (graduated the same way `jwt`/`hash` were, outside the frozen
  `config.module.ts`), an explicit stopgap until real multi-tenant
  resolution (subdomain/header parsing) exists, not a workaround for
  skipping the rule. `AuthRepository.findActiveByEmail()` (new) is
  tenant-scoped, case-insensitive (matching the database's own
  `LOWER(email)` uniqueness constraint — a user could otherwise be
  locked out by typing their own email in different case than however
  it was stored), and excludes soft-deleted rows. `AuthService.login()`
  now: looks up the user → `401` if none or no `passwordHash` set (an
  IdP-only account) → `PasswordService.compare()` (finally called, no
  longer "registered but unwired" since Phase 1.2D.7) → `401` on
  mismatch → real tokens signed from the verified `user.email` (not the
  raw, possibly differently-cased request input — `buildAuthTokenPayload()`
  changed from taking `LoginRequestDto` to a plain `email: string` for
  exactly this reason). Both failure paths throw the identical
  `UnauthorizedException`, so the response never reveals which was
  wrong; documented, not fixed, one known gap: response *timing* alone
  could theoretically distinguish the two failure paths for a precise
  enough attacker, since the early-return path is faster than a real
  `compare()` call — a real but lower-severity concern than a
  differently-*shaped* response, deliberately not closed with a
  speculative constant-time decoy this milestone didn't ask for.
  `prisma/seed.ts`'s seeded `admin@antrique.dev` user now gets a real
  Argon2id `passwordHash` (dev-only password, hashed directly via
  `@node-rs/argon2` since the seed script has no NestJS DI to inject
  `PasswordService` with), always re-set on every seed run so the
  dev credential reliably works after reseeding. `refresh()`/`logout()`
  are unchanged. Full validation: lint/typecheck/build/test all clean
  (174 tests passing across 22 suites, up from 164/22 — 10 new). Live
  boot confirmed clean `AuthModule dependencies initialized` with zero
  DI errors; live `curl` against the real seeded admin account confirmed
  a valid login succeeds with real, decodable tokens (payload correctly
  shows the canonical `admin@antrique.dev`, not whatever case was typed
  — tested with `ADMIN@ANTRIQUE.DEV`), an unknown email `401`s, and the
  correct email with a wrong password `401`s; `refresh`/`logout`/
  `GET /api/v1/example/ping` all confirmed unchanged; confirmed via
  `find -newer` that `example-domain/` and the JWT module's core files
  have no changes from this milestone. Directly verified at the database
  level (not just through the app) that the migration applied correctly
  and the existing case-insensitive partial index on `users` was left
  intact.
- Sprint 1 → Auth integration, Phase 1.2D.10 review (production-grade
  review of the stateless rotation layer, not new functionality): no
  issues found — the only review in this arc so far with a genuinely
  clean outcome (not manufactured; every checklist item independently
  re-verified). Re-argued the "document, don't add jti" decision from
  scratch rather than re-affirming it, weighing the strongest
  counter-argument seriously (a future revocation mechanism naively
  keyed on token identity could be confused by same-second collisions)
  and concluding the current design still wins: no revocation exists
  yet to be confused, adding `jti` now would violate the phase's own
  explicit prohibition and the minimal-payload property multiple tests
  enforce, and the risk is already pre-empted by documentation pointing
  a future implementer at exactly what they'd need to add. Independently
  re-verified, not re-trusted, both load-bearing claims with a fresh
  script against the real (built) `TokenService`: same-instant signs are
  byte-identical, signs genuinely differ once ≥1.1s elapses, and
  signing a decoded payload directly throws `Bad "options.expiresIn"
  option the payload already has an "exp" property` exactly as claimed.
  Confirmed clean, no fix needed: every successful refresh performs a
  real new signing operation, the flow is fully stateless (reuse of an
  already-used refresh token still succeeds, re-verified live), the
  payload stays exactly `{ email }`, no `jti`/nonce/random field
  anywhere (grepped — only comments discussing why not), no direct
  `JwtService` usage outside `jwt/` (the one match outside it is test
  setup, the same established precedent), no circular dependencies
  (import trace: neither `jwt/` nor `password/` imports from
  `modules/auth/`), `auth/README.md`/`backend.md`/`progress.md`/
  `decisions.md` all accurate, and — checked specifically, since two
  prior reviews in this arc found exactly this class of gap —
  `jwt/README.md`/`password/README.md` still accurate too (Phase
  1.2D.10 changed no caller relationship either file describes, so
  there was nothing for them to drift out of sync with).
  `lint`/`typecheck`/`build`/`test` clean (164 tests, unchanged — a
  code-change-free review); live boot re-confirmed
  `AuthModule dependencies initialized` with zero DI errors; a fresh
  live probe (independent of the implementation phase's own) confirmed
  a real refresh produces a new access token, and reusing an
  already-used refresh token still succeeds with `200`;
  `login`/`logout`/`GET /api/v1/example/ping` all unchanged.
- Sprint 1 → Auth integration, Phase 1.2D.10 implementation (Stateless
  Refresh Token Rotation): formalized `refresh()`'s existing behavior as
  rotation — zero production-code logic changes, since Phase 1.2D.9's
  `refresh()` already always signed a genuinely fresh access + refresh
  pair on every successful call. Confirmed and hardened with new tests
  in `auth.service.spec.ts`: a spy on `TokenService.signAccessToken()`/
  `signRefreshToken()` proving each is called exactly once per
  `refresh()` call with the rebuilt payload (not reused from the
  submitted token); a statelessness test proving the same refresh token
  can be submitted more than once, each time succeeding with a fresh
  pair (no reuse detection exists — a real, accepted gap, not an
  oversight); a multi-hop chain test proving a newly issued refresh
  token is itself usable to refresh again; and a real-wall-clock-delay
  test (≥1.1s, following `performance-logger.service.spec.ts`'s own
  precedent for real-timing assertions) proving genuinely distinct
  tokens once the second boundary crosses — documenting, not "fixing,"
  the same-second-determinism property Phase 1.2D.9's review already
  found, per this phase's explicit instruction not to add `jti`/nonce/
  timestamp/random fields. Confirmed live over real HTTP: a 3-hop
  rotation chain (login → refresh → refresh, ≥1s apart) produced three
  genuinely distinct token pairs; reusing the very first hop's refresh
  token after it had already been used to advance the chain still
  succeeded with a fresh pair, confirming statelessness end-to-end, not
  just at the unit level. `mappers/auth-token-payload.mapper.ts` needed
  no changes — `reissueAuthTokenPayload()` already returned exactly the
  minimal shape rotation requires. Updated `auth.service.ts`'s and
  `auth/README.md`'s comments to name this behavior "stateless rotation"
  explicitly. `login()`/`logout()` unchanged; `AuthRepository`/
  `PasswordService` remain unwired for the same unresolved persistence
  blocker. Full validation: lint/typecheck/build/test all clean (164
  tests passing across 22 suites, up from 160/22 — 4 new, all in
  `auth.service.spec.ts`'s `refresh()` describe block), live boot
  confirmed clean `AuthModule dependencies initialized` with zero DI
  errors; confirmed via `find -newer` that `example-domain/` has no
  files touched by this phase.
- Sprint 1 → Auth integration, Phase 1.2D.9 review (production-grade
  review of the refresh-token verification layer, not new
  functionality): no code defects found. Re-verified live, not assumed,
  that reusing the decoded refresh-token payload directly (rather than
  rebuilding it via `reissueAuthTokenPayload()`) genuinely does throw —
  wrote a throwaway script against the real `@nestjs/jwt` `JwtService`
  confirming `Bad "options.expiresIn" option the payload already has an
  "exp" property` fires exactly as the implementation phase's own
  comment claimed, independent confirmation rather than trusting the
  prior reasoning. **Found one genuine, non-security runtime property
  worth documenting, not fixing:** two token issuances for the same
  email within the same wall-clock second (e.g. a login immediately
  followed by a refresh) produce byte-identical tokens — HS256 signing
  is deterministic and `iat`/`exp` carry only second precision.
  Confirmed live (identical bytes within the same second; genuinely
  different tokens once ≥1s elapsed). Harmless today — no
  revocation/rotation exists yet to be confused by it — but documented
  in `auth.service.ts`'s `refresh()` comment and `auth/README.md` as a
  known property a future revocation/rotation phase will need a `jti`
  claim to address, deliberately not added now since it would grow the
  payload past the required minimal `{ email }`. Confirmed clean, no fix
  needed: refresh-token verification uses `TokenService` exclusively (no
  direct `JwtService` usage outside test setup, the same precedent
  `token.service.spec.ts` already established), access-token-as-refresh
  correctly falls through the same signature-check path with no special
  case, uniform undifferentiated `401` for every failure mode, no
  circular dependencies (import trace: neither `jwt/` nor `password/`
  imports from `modules/auth/`), no persistence introduced, `login()`/
  `logout()` byte-for-byte unchanged. `lint`/`typecheck`/`build`/`test`
  clean (160 tests, unchanged from the implementation phase — the one
  code change this review made was a comment). Live boot re-confirmed
  `AuthModule dependencies initialized` with zero DI errors; a fresh
  adversarial probe (independent of the implementation phase's own)
  confirmed valid refresh → 200 with fresh tokens, access-token-as-
  refresh → 401, a non-JWT garbage string → 401, a signature-tampered
  real token → 401, and a payload-tampered real token → 401; empty
  refresh token still `400`s via existing DTO validation;
  `login`/`logout`/`GET /api/v1/example/ping` all unchanged.
- Sprint 1 → Auth integration, Phase 1.2D.9 implementation (Refresh
  Token Verification): `AuthService.refresh()` now verifies
  `RefreshRequestDto.refreshToken` via `TokenService.verifyRefreshToken()`
  and, on success, reissues a completely fresh access + refresh pair —
  rebuilding a clean `{ email }` payload via the mapper's new
  `reissueAuthTokenPayload()` (the decoded token carries `iat`/`exp` at
  runtime that would make `jsonwebtoken` throw if re-signed unstripped).
  Any verification failure — invalid signature, expired, malformed, or
  an access token submitted as a refresh token (rejected by the same
  signature check, no separate branch needed) — is caught in one
  blanket `catch` and rethrown as `UnauthorizedException`, deliberately
  not distinguished in the response. `RefreshResponseDto` now extends
  `TokenResponseDto` (previously `{ status: 'not_implemented' }`).
  `login()`/`logout()` are unchanged; `AuthRepository`/`PasswordService`
  remain unwired for the same unresolved persistence blocker. Confirmed
  live over real HTTP, not just unit tests: a valid refresh token
  succeeds with fresh tokens; an access token submitted as a refresh
  token, a garbage string, and a single-character-tampered real refresh
  token all `401`; an empty refresh token still `400`s via the existing
  `RefreshRequestDto` validation (unchanged). Full validation:
  lint/typecheck/build/test all clean (160 tests passing across 22
  suites, up from 151/22 — 9 new: 2 in `auth-token-payload.mapper.spec.ts`
  for `reissueAuthTokenPayload()`, 6 added to `auth.service.spec.ts`'s
  new `refresh()` describe block, 1 added to `auth.controller.spec.ts`
  for the 401-propagation path), live boot confirmed clean
  `AuthModule dependencies initialized` with zero DI errors; confirmed
  via `find -newer` that `example-domain/` has no files touched by this
  phase.

- Sprint 1 → Auth integration, Phase 1.2D.8 review (production-grade
  review of the authentication token issuance layer, not new
  functionality): found and fixed cross-cutting documentation drift no
  single phase's own review would have caught. `jwt/token.service.ts`'s
  header comment and `jwt/README.md` still said "not called anywhere in
  apps/api/src/modules/auth/ yet" / "AuthController/AuthService...
  unchanged from Phase 1.2D.5" — both false since Phase 1.2D.8 wired
  `login()` into `signAccessToken()`/`signRefreshToken()`; corrected both
  to describe sign as having a real caller while verify still doesn't.
  `password/README.md` had the identical drift (claimed `AuthService`
  "unchanged... still `{ status: 'not_implemented' }`") plus one more
  subtle inaccuracy: its own "independence" claim — "`PasswordService`
  has no dependency on `AuthService`... and nothing in `auth/`/`jwt/`
  depends on it either" — became false the moment `AuthService`
  constructor-injected `PasswordService` this phase; corrected to state
  the dependency now runs one direction only (`AuthService` → 
  `PasswordService`, never the reverse), not "no dependency at all."
  Re-argued the Phase 1.2D.8 design decision (inject `PasswordService`
  without calling it) from scratch rather than re-affirming it by
  default: confirmed this is honest temporary architecture, not fake
  verification — the alternatives (a self-verifying round trip that
  always succeeds, or a hardcoded demo credential) would both be worse.
  Confirmed clean, no fix needed: `auth/README.md`/`backend.md`
  (accurate and self-consistent), login flow, JWT payload minimality,
  DTO/mapper design, DI (`PasswordService`/`TokenService` both singleton,
  no circular dependencies — confirmed by import trace: neither `jwt/`
  nor `password/` imports anything from `modules/auth/`), no hardcoded
  credentials anywhere (grepped), no direct `JwtService` usage outside
  `jwt/` (the one match in `auth.service.spec.ts` constructs a real
  `TokenService` for testing, the same pattern `token.service.spec.ts`
  already established — not a violation), `refresh()`/`logout()` still
  byte-for-byte placeholders. `lint`/`typecheck`/`build`/`test` clean
  (151 tests, unchanged from the implementation phase — a pure
  documentation-only review); live boot re-confirmed
  `AuthModule dependencies initialized` with zero DI errors; a fresh live
  probe (independent of the implementation phase's own) confirmed the
  access token signed for one login is rejected with "invalid signature"
  when verified as a refresh token and vice versa, invalid login input
  still `400`s, and `refresh`/`logout`/`GET /api/v1/example/ping` are
  all unchanged.
- Sprint 1 → Auth integration, Phase 1.2D.8 implementation (Authentication
  Token Issuance): `AuthService.login()` builds a minimal JWT payload
  (`{ email }` only, never the password —
  `mappers/auth-token-payload.mapper.ts` → `types/auth-token-payload.type.ts`,
  new real content graduating both folders from placeholder, their old
  `README.md`s deleted matching `repositories/`'s precedent) and signs it
  twice via `TokenService` (Phase 1.2D.6), once per token type — genuinely
  real: confirmed live over HTTP that the returned tokens decode to
  exactly `{ email, iat, exp }` (no `sub`/`tenantId`/extra claims) and
  that an access token fails refresh verification and vice versa
  (different secrets). New `dto/token-response.dto.ts` — shared
  `TokenResponseDto` (`accessToken`/`refreshToken`), `LoginResponseDto`
  now extends it instead of the old `{ status: 'not_implemented' }`
  placeholder. **A genuine design ambiguity was resolved with the user
  before writing any code, not guessed:** with persistence explicitly
  out of scope, there's no persisted password hash for a real user to
  compare against, so `PasswordService.compare()` has nothing meaningful
  to verify. Presented three options — (a) constructor-inject
  `PasswordService` but leave it uncalled, mirroring `AuthRepository`'s
  already-approved "registered but unwired" treatment; (b) a
  self-consistent `hash()`-then-`compare()`-against-itself round trip
  that always succeeds by construction; (c) a fixed hardcoded demo
  password gating login, a real accept/reject path but a bypass
  credential embedded in source — user chose (a). `refresh()`/`logout()`
  are untouched placeholders; `AuthRepository` stays registered and
  unwired for the identical reason it already was. Full validation:
  lint/typecheck/build/test all clean (151 tests passing across 22
  suites, up from 145/21 — 6 new: 2 in `auth-token-payload.mapper.spec.ts`,
  4 added to `auth.service.spec.ts`), live boot confirmed clean
  `AuthModule dependencies initialized` with zero DI errors; live `curl`
  against all four routes confirmed: `login` returns real tokens (decoded
  and verified), `refresh`/`logout` unchanged
  `200 {"status":"not_implemented"}`, `GET /api/v1/example/ping`
  unchanged — zero regressions. Confirmed via `find -newer` that
  `example-domain/`, `jwt/`, and `password/` have no files touched by
  this phase.

- Sprint 1 → Auth integration, Phase 1.2D.7 implementation (Password
  Hashing Infrastructure): `PasswordService`/`PasswordModule`
  (`apps/api/src/password/`) wrap `@node-rs/argon2` with `hash(plaintext)`/
  `compare(plaintext, hashed)`, both genuinely functional and tested —
  random salt per call, argon2id-encoded output, config-driven
  memoryCost/timeCost/parallelism (via the new `hash` namespace,
  graduated outside the frozen `config.module.ts` the same way
  `jwt.config.ts` did), and the variant itself hardcoded to argon2id (not
  config-driven), mirroring the JWT signing algorithm's fixed-HS256
  treatment. `PasswordModule` is `@Global()` and imported into
  `AppModule`; confirmed via a live DI-graph resolution (not just the
  unit test) that the real config values (19456/2/1 from `.env`) are
  actually applied. Switched from the `argon2` npm package to
  `@node-rs/argon2` after a live, evidenced install failure (node-gyp
  needs a C++ toolchain this machine doesn't have) — see decisions.md.
  Zero changes to `AuthService`/`AuthController`/`AuthRepository`/
  `TokenService`/`TokenModule` — independence confirmed by diff, not
  assumed. Full validation: lint/typecheck/build/test all clean (145
  tests passing across 21 suites, including 6 new in
  `password.service.spec.ts` and 4 new in `env.validation.spec.ts`), live
  boot confirmed clean `PasswordModule dependencies initialized` with
  zero DI errors and zero regressions to any other module's boot line.
- Sprint 1 → Auth integration, Phase 1.2D.7 implementation (Password
  Hashing Infrastructure): `PasswordService`/`PasswordModule`
  (`apps/api/src/password/`) wrap `@node-rs/argon2` with `hash(plaintext)`/
  `compare(plaintext, hashed)`, both genuinely functional and tested —
  random salt per call, argon2id-encoded output, config-driven
  memoryCost/timeCost/parallelism (via the new `hash` namespace,
  graduated outside the frozen `config.module.ts` the same way
  `jwt.config.ts` did), and the variant itself hardcoded to argon2id (not
  config-driven), mirroring the JWT signing algorithm's fixed-HS256
  treatment. `PasswordModule` is `@Global()` and imported into
  `AppModule`; confirmed via a live DI-graph resolution (not just the
  unit test) that the real config values (19456/2/1 from `.env`) are
  actually applied. Switched from the `argon2` npm package to
  `@node-rs/argon2` after a live, evidenced install failure (node-gyp
  needs a C++ toolchain this machine doesn't have) — see decisions.md.
  Zero changes to `AuthService`/`AuthController`/`AuthRepository`/
  `TokenService`/`TokenModule` — independence confirmed by diff, not
  assumed. Full validation: lint/typecheck/build/test all clean (145
  tests passing across 21 suites, including 6 new in
  `password.service.spec.ts` and 4 new in `env.validation.spec.ts`), live
  boot confirmed clean `PasswordModule dependencies initialized` with
  zero DI errors and zero regressions to any other module's boot line.

- Sprint 1 → Auth integration, Phase 1.2D.6 review (production-grade
  architecture review of the JWT foundation, not new functionality):
  no defects found. Directly resolved the scope-ambiguity this phase's
  own report flagged ("was implementing working sign/verify acceptable
  architectural preparation or scope creep?") — concluded **acceptable
  preparation, not scope creep**: the brief's own positive requirements
  ("JwtService wrapper," named "Access token configuration"/"Refresh
  token configuration" as separate deliverables, "reusable
  infrastructure") are hard to satisfy meaningfully with an inert stub,
  and the actual security boundary that matters — is this reachable by a
  real HTTP request — holds regardless (`AuthController`/`AuthService`
  confirmed still byte-for-byte unchanged). Considered and rejected one
  counter-argument (a future phase might carelessly wire this in without
  also verifying credentials) as a process risk for a *later* phase to
  get right, not a defect in what *this* phase built. **Live-tested a
  security property the implementation phase hadn't**: crafted a
  hand-made `alg: none` token (the classic JWT algorithm-confusion
  forgery) and confirmed `@nestjs/jwt`'s `verify()` correctly rejects it;
  also confirmed signing defaults to `HS256`, not an attacker-selectable
  algorithm. Added both as permanent regression tests
  (`token.service.spec.ts`, 6 → 8 tests) and documented in
  `jwt/README.md`. Re-verified clean: no `process.env` usage, no
  hardcoded secrets, no `Scope.REQUEST`, no circular dependencies,
  `AuthController`/`AuthService` unchanged. `lint`/`typecheck`/`build`/
  `test` clean at both `@antrique/api` (20 suites / 135 tests, up from
  133) and workspace level; live boot re-confirmed `TokenModule
  dependencies initialized` (distinct from `@nestjs/jwt`'s own
  `JwtModule` line) with zero DI errors; live smoke test confirmed
  `POST /auth/login` and `GET /api/v1/example/ping` both unchanged —
  zero regressions.
- Sprint 1 → Auth integration, Phase 1.2D.6 (JWT infrastructure
  foundation only — no token generation/verification wired into any
  controller or service, no refresh logic, no guards, no Passport, no
  RBAC, no sessions, no OAuth, no MFA, no registration, no password
  hashing, no user authentication, explicitly not started per this
  phase's own brief): `apps/api/src/jwt/config/jwt.config.ts` — the
  `jwt` namespace (`accessSecret`/`accessTokenTtl`/`refreshSecret`/
  `refreshTokenTtl`), registered via `ConfigModule.forFeature()` inside
  `token.module.ts`, not the frozen `config.module.ts` — the same
  graduation path `logging/config/logger-options.config.ts` already
  established. Added `JWT_ACCESS_SECRET`/`JWT_ACCESS_TOKEN_TTL`/
  `JWT_REFRESH_SECRET`/`JWT_REFRESH_TOKEN_TTL` to `env.validation.ts`
  (secrets required, minimum 32 characters — a genuine security
  constraint, not speculative; TTLs optional with the defaults
  `.env.example` already scaffolded) and to `.env.example`/`.env`
  (secrets generated via `crypto.randomBytes`, not literal
  placeholders, since these are now enforced). `apps/api/src/jwt/
  token.module.ts` — `TokenModule`, `@Global()` (matching `ConfigModule`/
  `LoggingModule`/`DatabaseModule`), configures `@nestjs/jwt`'s own
  `JwtModule` via `registerAsync()`. `token.service.ts` — `TokenService`,
  constructor-injects `@nestjs/jwt`'s `JwtService` and the validated
  `jwt` config; four genuinely functional methods
  (`signAccessToken`/`signRefreshToken`/`verifyAccessToken`/
  `verifyRefreshToken`), access and refresh tokens using different
  secrets so one can never be verified as the other — confirmed live in
  6 new tests, not just asserted, including an expired-token rejection
  test. **Found and fixed one naming issue during implementation, before
  it reached review:** the module was originally also named `JwtModule`,
  colliding with `@nestjs/jwt`'s own class of the same name — confirmed
  live via two identical "JwtModule dependencies initialized" boot log
  lines — renamed to `TokenModule` (mirroring `TokenService`'s own
  already-avoided collision with `@nestjs/jwt`'s `JwtService`), file
  renamed `jwt.module.ts` → `token.module.ts`, all doc references
  updated, re-verified live that the log now shows one `JwtModule` line
  (the real library module) and one `TokenModule` line (this one).
  Added `@nestjs/jwt` as a new `apps/api` dependency. Neither
  `AuthController` nor `AuthService` were touched — both remain exactly
  as Phase 1.2D.5 left them. `docs/architecture/{backend.md,
  configuration.md, validation.md}` and `apps/api/src/config/auth/README.md`
  updated (the `jwt` namespace is distinct from the still-placeholder
  `auth` config domain, which stays reserved for managed IdP settings).
  `lint`/`typecheck`/`build`/`test` clean at both `@antrique/api` (20
  suites / 133 tests, up from 19/121) and workspace level; live boot
  confirmed `TokenModule dependencies initialized` with zero DI errors,
  and a live smoke test confirmed `POST /auth/login` and
  `GET /api/v1/example/ping` both unchanged — zero regressions.
- Sprint 1 → Auth integration, Phase 1.2D.5 (authentication validation
  layer only — no JWT, password hashing, token generation, guards,
  Passport, RBAC, sessions, OAuth, MFA, registration, password reset,
  email verification, or user profile, explicitly not started per this
  phase's own brief): wired the global `ValidationPipe` every DTO in
  this codebase has been written against since Phase 1.2D.4, finally
  making `main.ts`'s multi-phase-old "comment, not a call" real.
  `apps/api/src/common/pipes/validation-pipe.options.ts` —
  `VALIDATION_PIPE_OPTIONS` (`whitelist: true` — unknown fields silently
  stripped, not rejected; `transform: true` — controllers receive a real
  DTO instance), registered via `app.useGlobalPipes(new
  ValidationPipe(VALIDATION_PIPE_OPTIONS))` in `main.ts`, right after
  prefix/versioning setup. Zero controller/service changes — no
  per-route `@UsePipes()` anywhere, matching this phase's own explicit
  verification criterion. `ExceptionLoggingFilter` (Phase 1.2C.6) needed
  zero changes either: it already logs and preserves Nest's default
  response shape for any `HttpException`, and `ValidationPipe`'s
  `BadRequestException` is exactly that — confirmed live, not assumed.
  4 new tests (`validation-pipe.options.spec.ts`) — 2 asserting the
  options themselves, 2 exercising the pipe's own `.transform()` method
  directly (rejecting invalid input, returning a real DTO instance for
  valid input) without needing a live HTTP server. Updated every DTO/doc
  that previously said "correct but not yet HTTP-enforced"
  (`login-request.dto.ts`, `refresh-request.dto.ts`,
  `login-request.dto.spec.ts`, `auth/README.md`) plus `backend.md`
  (§1's `common/pipes/` entry, §2's startup-flow step list, the
  "Deferred" list) and `validation.md` (resolved its own open question
  about whether DTO validation would reuse Zod — it uses
  `class-validator` instead, the idiomatic NestJS/`ValidationPipe`
  pairing). `lint`/`typecheck`/`build`/`test` clean at both
  `@antrique/api` (19 suites / 121 tests, up from 18/117) and workspace
  level. Live boot clean; live `curl` against all three auth endpoints
  confirmed: invalid input (bad email, empty password, empty
  refreshToken) → real `400` with per-field messages; valid input →
  unchanged `200 {"status":"not_implemented"}`; valid input plus unknown
  extra fields (`isAdmin`, `extraField`) → still `200`, silently
  stripped, not rejected; `GET /api/v1/example/ping` unaffected. Server
  logs confirmed `ExceptionLoggingFilter` correctly logged each `400` as
  a `BadRequestException`, proving the integration end to end with zero
  new wiring in that filter.
- Sprint 1 → Auth integration, Phase 1.2D.4 review (production-grade
  architecture review of the auth foundation, not new functionality):
  found and fixed one genuine, serious issue. `AuthService.login()`
  called `AuthRepository.findMany({ where: { email: dto.email } })`
  with no `tenantId` in the filter — an unscoped query against the
  multi-tenant `User` table, violating CLAUDE.md's non-negotiable
  "tenant scope on EVERY query; RLS is the backstop, not the only gate"
  rule. Confirmed there is genuinely no way to fix this correctly yet:
  grepped the whole backend for `tenantId` and found it exists only as
  a documented, explicitly-unpopulated reserved field on `LogContext`
  ("tenantId/userId still need auth, later still") — no tenant-
  resolution mechanism (subdomain, header, JWT claim) exists anywhere.
  Removed the call entirely rather than attempting to scope it
  incorrectly; `AuthRepository` stays registered in `AuthModule` as a
  proven-resolvable DI dependency (live boot), the same "registered but
  unwired" pattern `example-domain/repositories/example.repository.ts`
  already established for an identical underlying reason. Updated
  `auth.service.spec.ts`'s login test into a regression guard
  (`expect(repository.findMany).not.toHaveBeenCalled()`), and corrected
  every doc that described the old behavior:
  `apps/api/src/modules/auth/{README.md, auth.service.ts,
  repositories/auth.repository.ts}`'s own comments, and
  `docs/architecture/backend.md`. Confirmed clean, no fix needed:
  controller thinness, DTO organization, DI configuration, no direct
  Prisma usage outside repositories elsewhere in the backend, no
  circular dependencies. `lint`/`typecheck`/`build`/`test` clean at
  both `@antrique/api` (18 suites / 117 tests, unchanged) and workspace
  level; live boot re-confirmed `AuthModule dependencies initialized`
  with zero DI errors, all three routes still mapped and returning
  `200 {"status":"not_implemented"}` with no query-related log noise
  for `login`, and `GET /api/v1/example/ping` unchanged — zero
  regressions.
- Sprint 1 → Auth integration, Phase 1.2D.4 (authentication module
  foundation only — no JWT, tokens, password hashing, guards, Passport,
  RBAC, sessions, email verification, OAuth, MFA, registration, password
  reset, or user profile, explicitly not started per this phase's own
  brief): the first real (non-reference) business module, built exactly
  on `modules/example-domain/`'s template.
  `apps/api/src/modules/auth/auth.module.ts` — `AuthModule`, imported
  into `AppModule` after `ExampleDomainModule`. `auth.controller.ts` —
  `AuthController`: `POST /auth/login`, `/refresh`, `/logout`, each
  `@HttpCode(HttpStatus.OK)` (Nest's `@Post()` default is `201`, wrong
  for routes that create nothing — caught live during this phase's own
  validation, not assumed). `auth.service.ts` — `AuthService`, depends
  only on `AuthRepository` (constructor injection), never `PrismaService`
  directly. `login()` calls `AuthRepository.findMany({ where: { email }
  })` to prove the full `Controller → Service → Repository →
  PrismaService` chain end-to-end against a real table — deliberately
  `findMany` on `email` alone, not `findUnique` on the `(tenantId,
  email)` compound key, which sits behind a PARTIAL unique index (`WHERE
  deleted_at IS NULL`) added via raw SQL in Phase 1.1B that
  `schema.prisma`'s own `@@unique([tenantId, email])` declaration
  doesn't accurately represent (see `schema.prisma`'s `User` model
  comment and `prisma/seed.ts`'s header comment for the landmine, which
  specifically affects `.upsert()`'s `ON CONFLICT` arbiter selection, not
  a plain filter read) — sidesteps the landmine entirely rather than
  risking it with no real credential check to justify that risk yet.
  `refresh()`/`logout()` are pure placeholders — nothing to verify or
  invalidate without tokens/sessions. `repositories/auth.repository.ts`
  — `AuthRepository extends BaseRepository<PrismaService['user']>`,
  zero custom query methods. `dto/` — `LoginRequestDto`
  (`@IsEmail()`/`@IsString() @MinLength(1)`), `RefreshRequestDto`
  (`@IsString() @MinLength(1)`), and one response DTO per action
  (`{ status: 'not_implemented' }` each) — no `LogoutRequestDto`, no
  session/token to reference yet. Added `class-validator`/
  `class-transformer` as new `apps/api` dependencies for this — rules
  are correct but not yet HTTP-enforced (no global `ValidationPipe`
  wired in `main.ts`, unchanged "comment, not a call" since Phase 1.2A,
  a cross-cutting decision bigger than this module); verified directly
  via `class-validator`'s own `validate()` in `dto/*.spec.ts` instead.
  `entities/`, `interfaces/`, `types/`, `exceptions/`, `validators/`,
  `mappers/` are documented placeholders, matching `example-domain/`'s
  precedent exactly (no data, no swap point, no failure case yet since
  every endpoint always returns its placeholder response). 22 new tests
  across `auth.service.spec.ts`, `auth.controller.spec.ts` (DI-resolved
  via `Test.createTestingModule`), `repositories/auth.repository.spec.ts`,
  and `dto/login-request.dto.spec.ts`/`dto/refresh-request.dto.spec.ts`.
  `backend.md` updated (status, folder structure, dependency graph —
  `AuthModule` moved from "anticipated" to real-but-placeholder).
  `lint`/`typecheck`/`build`/`test` clean at both `@antrique/api` (18
  suites / 117 tests, up from 13/102) and workspace level; live boot
  confirmed `AuthModule dependencies initialized` with zero DI errors,
  all three routes mapped, and a real Postgres connection; live `curl`
  against all three endpoints confirmed `200 {"status":"not_implemented"}`
  each, plus a regression check that `GET /api/v1/example/ping` still
  works. This phase's implementation was interrupted mid-way by the host
  environment's C: drive filling to 0 bytes free — see "In progress
  right now" above for how that was handled; every validation step was
  re-run after resuming rather than assumed to have carried over.
- Sprint 1 → Auth integration, Phase 1.2D.3 review (production-grade
  architecture review of the repository foundation, not new
  functionality): no defects found in `BaseRepository`'s design or the
  Service ↔ Repository boundary — re-verified by grep that zero services
  inject `PrismaService` directly, and by import trace that `database/`
  has no circular dependencies. **Live-tested the "Type safety" review
  criterion rather than taking the design's own claim on faith:** wrote
  a throwaway file calling `ExampleRepository.findOne()`/`.create()`
  with fields that don't exist on `Setting` and confirmed `tsc` actually
  rejects them with real, model-specific Prisma error messages (not just
  structural acceptance from the generic `any`-based constraint) —
  turned that verification into a permanent regression test
  (`example.repository.spec.ts`, a compile-time-only `@ts-expect-error`
  check, matching `audit-logger.service.spec.ts`'s existing precedent
  for `AuditEvent`'s immutability). Found and fixed one small, genuine
  documentation drift: `domain-module-guide.md` §15 claimed "four spec
  files" for the example module when there are three (controller,
  service, repository — the `.module.ts` itself has none, like every
  other module in this codebase); corrected, and updated both
  `domain-module-guide.md` §16 and the module's own `README.md` to
  describe the new compile-time test. `lint`/`typecheck`/`build`/`test`
  clean at both `@antrique/api` (13 suites / 102 tests, up from 101) and
  workspace level; live boot re-confirmed `ExampleDomainModule
  dependencies initialized` with zero DI errors and
  `GET /api/v1/example/ping` unchanged at `200 {"status":"ok"}` — zero
  regressions.
- Sprint 1 → Auth integration, Phase 1.2D.3 (repository layer foundation
  only — no domain-specific repositories, no transactions, no query
  builders, no caching, no business logic, explicitly not started per
  this phase's own brief): `apps/api/src/database/base.repository.ts` —
  `BaseRepository<TDelegate>`, generic `findOne`/`findMany`/`create`/
  `update`/`delete` CRUD infrastructure every future repository extends.
  Depends only on the delegate object passed to its constructor, never
  on `PrismaService`/Nest's DI directly — a concrete subclass is what's
  `@Injectable()` and injects `PrismaService`. Uses
  `Parameters<>`/`ReturnType<>` against a maximally-permissive
  `(...args: any[]) => any` constraint (one scoped, justified
  `eslint-disable` block) to recover each real model's actual
  argument/return types from whatever concrete delegate a subclass
  provides — verified against a REAL Prisma delegate type
  (`PrismaService['setting']`), not just a mock. 5 new tests
  (`base.repository.spec.ts`) using a plain mock delegate — no real
  Postgres involved, consistent with this codebase's standing "no live
  external dependency in a unit test" discipline.
  `apps/api/src/modules/example-domain/repositories/example.repository.ts`
  — `ExampleRepository extends BaseRepository<PrismaService['setting']>`,
  registered as a provider in `ExampleDomainModule` (proving DI
  resolution at boot) but deliberately **not** wired into
  `ExampleDomainService` — a ping endpoint has nothing to persist, so
  forcing an unused dependency would be speculative; targets `Setting`
  (the least "business-domain" model in the schema) purely to prove the
  pattern against a real delegate type, not a real settings feature.
  2 new tests using a fake `PrismaService` exposing only `.setting`.
  New "Repository layer" section (`domain-module-guide.md` §16) —
  where repositories live (`modules/<domain>/repositories/`, never in
  `database/` itself), the enforced rule that **services never inject
  `PrismaService` directly** (checked by grep across `apps/api/src`:
  confirmed true), what belongs/never belongs in a repository, and why
  `BaseRepository` stays free of transactions/query
  builders/caching/model-specific helpers until a genuine multi-repository
  need justifies one. `backend.md` and both READMEs
  (`database/README.md`, `modules/example-domain/README.md`) updated to
  match. Fixed one incidental stale comment noticed along the way
  (`config/database/database.config.ts` still said "Phase 1.2B" for a
  consumer that became real in Phase 1.2D.2). `lint`/`typecheck`/`build`/
  `test` clean at both `@antrique/api` (13 suites / 101 tests, up from
  11/94) and workspace level; live boot confirmed
  `ExampleDomainModule dependencies initialized` with zero DI errors
  (proving both `ExampleDomainService` and `ExampleRepository` resolve)
  and `GET /api/v1/example/ping` unchanged at `200 {"status":"ok"}`.
- Sprint 1 → Auth integration, Phase 1.2D.2 review (production-grade
  architecture review of the database foundation, not new
  functionality): found and fixed one genuine, serious bug.
  `PrismaService.onModuleInit()` called only `$connect()`, documented
  everywhere as "fail-fast" — live-tested with a deliberately invalid
  `DATABASE_URL` (bad credentials, unreachable port) and the app logged
  `"Database connection established"` and served requests normally
  anyway. Root cause: `@prisma/adapter-pg` wraps a lazy `pg.Pool` that
  opens no real socket until first use, so `$connect()` alone resolves
  regardless of whether the connection string is valid. Fixed by adding
  a real `await this.$queryRaw\`SELECT 1\`` in `onModuleInit()` — the
  same query pattern `isHealthy()` already used correctly, since that
  method was never affected by this bug. Re-tested with the same bad
  `DATABASE_URL`: now logs `"Database connection failed"` with the real
  Prisma/pg error and exits with code 1 before ever reaching "Nest
  application successfully started." Re-confirmed the happy path,
  `GET /api/v1/example/ping`, and graceful shutdown (`app.close()`, same
  method as the implementation phase) all still work unchanged.
  Corrected `database/README.md` and `backend.md`'s `database/` folder
  entry, which both stated the false "fail-fast via `$connect()`" claim.
  Confirmed clean, no fix needed: singleton behavior (one `PrismaService`
  instance, registered once, in a module imported once), DI configuration
  (constructor injection only, config read via the validated
  `databaseConfig.KEY`, zero direct `process.env` access — confirmed by
  grep), module boundaries (`DatabaseModule` exports `PrismaService`
  only, no repositories/business logic/model-specific helpers), no
  circular dependencies (confirmed by import trace). `lint`/`typecheck`/
  `build`/`test` clean at both `@antrique/api` (11 suites / 94 tests,
  unchanged) and workspace level after the fix — zero regressions.
- Sprint 1 → Auth integration, Phase 1.2D.2 (database module foundation
  only — no repositories, no transactions, no additional services, no
  business logic, no caching, no auth, explicitly not started per this
  phase's own brief): `apps/api/src/database/prisma.service.ts` —
  `PrismaService extends PrismaClient`, the single database access layer
  every future repository will inject. Constructs its `@prisma/adapter-pg`
  driver adapter (Prisma 7's required pattern, matching
  `prisma.config.ts`/`prisma/seed.ts`'s own precedent) from the
  already-validated `database` config namespace (`url`, `ssl`) via
  constructor injection — never `process.env` directly. Connects eagerly
  in `onModuleInit()` (fail-fast, matching `env.validation.ts`'s own
  philosophy) and disconnects in `onModuleDestroy()`, which fires
  automatically on `main.ts`'s existing `app.enableShutdownHooks()`
  (Phase 1.2A, unchanged). `isHealthy()` — a plain `SELECT 1` liveness
  check, no model-specific query — has no current caller yet (`health/`
  is still config-only), matching the established "build the capability
  before its first real consumer" pattern (`RequestContextService`,
  `PerformanceLogger`). `database.module.ts` — `DatabaseModule`,
  `@Global()` (matching `ConfigModule`/`LoggingModule`'s precedent),
  exports `PrismaService` only. Registered in `app.module.ts` ahead of
  `ExampleDomainModule`, matching the ordering already anticipated in a
  prior phase's comment. `docs/architecture/backend.md` updated (status
  line, `database/` folder entry, dependency graph — moved from
  "anticipated, not built" to real; "Deferred to Phase 1.2B" list
  corrected). **Deliberately shipped no `.spec.ts` for `PrismaService`**
  (documented in `database/README.md`): `$connect`/`$queryRaw`/
  `$disconnect` only mean something against a real Postgres connection,
  and no other test in this codebase depends on a live external
  resource — verified instead via live boot, the same way Phase 1's
  database work always was. `lint`/`typecheck`/`build`/`test` clean at
  both `@antrique/api` (11 suites / 94 tests, unchanged) and workspace
  level. Live boot against the real local Postgres confirmed
  `DatabaseModule dependencies initialized` with zero DI errors and
  `"Database connection established"` logged; `GET /api/v1/example/ping`
  still returns `200 {"status":"ok"}` with `DatabaseModule` in the graph
  (no regression). **Graceful shutdown verified against the real
  connection**, worked around a genuine Windows environment limitation:
  `taskkill /PID <pid>` (non-forceful) refuses on a console-less
  background process ("can only be terminated forcefully"), and Node's
  cross-process `process.kill()` on Windows force-kills regardless of
  signal name — neither exercises `OnModuleDestroy` the way a real
  POSIX SIGTERM would on Linux/prod. Instead booted the real `AppModule`
  via a throwaway script and called `app.close()` (the same
  `OnModuleDestroy` lifecycle `app.enableShutdownHooks()`'s real
  SIGTERM/SIGINT handlers trigger internally) — confirmed
  `"Database connection closed"` logged and the process exited cleanly
  with no hang or error.
- Sprint 1 → Auth integration, Phase 1.2D.1 review (production-grade
  architecture review of the module template, not new functionality):
  found and fixed two genuine issues. (1) The new `constants/` file was
  named `example-domain.constants.ts` (plural), inconsistent with
  `logging/constants/log-level-severity.constant.ts`'s existing singular
  precedent and with the guide's own other five suffixes — renamed to
  `example-domain.constant.ts`, corrected
  `docs/architecture/domain-module-guide.md`'s suffix list and §9
  heading. (2) DI wiring itself (whether `ExampleDomainController`
  actually resolves `ExampleDomainService` through Nest's container) had
  no automated test — only the service's own logic was unit-tested, and
  only a manual `curl` (not a CI-repeatable check) had verified the
  controller. Added `example-domain.controller.spec.ts` using
  `Test.createTestingModule` — this backend's first controller-level
  test, establishing the pattern for every future one. Also corrected two
  smaller documentation inaccuracies in the same pass (a wrong file count
  in the guide's §15, an overclaiming "nothing depends on it" in §11).
  Confirmed clean, no fix needed: module independence, no hidden
  coupling, no premature abstractions, controller/service boundary
  discipline (thin controller, service owns behavior only), DTO
  request/response separation, all six placeholder folders' rationale,
  every cross-reference in `domain-module-guide.md`/`backend.md`/the
  module's own README. `lint`/`typecheck`/`build`/`test` clean at both
  `@antrique/api` (11 suites / 94 tests, up from 93) and workspace level;
  live boot re-confirmed `ExampleDomainModule dependencies initialized`
  with zero DI errors after the rename; live `curl` against the rebuilt
  app confirmed `GET /api/v1/example/ping` still returns
  `200 {"status":"ok"}` — zero regressions from the fixes. **The domain
  module template is approved as the canonical architecture for all
  future business modules; the project is approved to proceed to Phase
  1.2D.2.**
- Sprint 1 → Auth integration, Phase 1.2D.1 (core domain module
  foundation only — no business logic, no database access, no auth,
  explicitly not started per this phase's own brief): established
  `apps/api/src/modules/example-domain/` as the reference template every
  real future domain module (Auth, Users, Organizations, ...) will copy.
  Real content: `ExampleDomainModule` (scoped, not `@Global()`, imported
  into `AppModule`), `ExampleDomainController` (`GET /example/ping`,
  `/api/v1/example/ping` once the global prefix/versioning apply),
  `ExampleDomainService` (one placeholder method, constructor-injected,
  no DI token — no swap point exists), `PingResponseDto`
  (`{ status: 'ok' }`, `dto/`), `EXAMPLE_DOMAIN_ROUTE` (`constants/`).
  `entities/`, `interfaces/`, `types/`, `exceptions/`, `validators/`,
  `mappers/` are documented placeholders (each with its own README) —
  genuinely empty, since a ping endpoint has no data, no failure case,
  and no conversion to perform. One test
  (`example-domain.service.spec.ts`) per CLAUDE.md's standing
  "every feature ships with tests" rule. New
  `docs/architecture/domain-module-guide.md` — the full folder-by-folder
  standard (what belongs where, DTO request/response separation, entity/
  interface/mapper/validator placement, exception hierarchy, constants
  organization, DI rules, import/export rules, extension steps for a
  real module) — companion to `backend.md` the same way
  `configuration-guide.md`/`logging-guide.md` companion their subsystems.
  `backend.md` updated (title, status, folder structure, dependency
  graph) to include the new module and doc, avoiding the exact kind of
  drift the Pre-1.2D stabilization pass just finished fixing elsewhere.
  **Deliberately did not create a `CommonModule`:** nothing cross-domain
  exists yet to share (see `domain-module-guide.md` §14) — documented as
  a decision, not left silently undone. `lint`/`typecheck`/`build`/`test`
  clean at both `@antrique/api` and workspace level (93 tests / 10 suites,
  up from 92/9); live boot confirmed
  `ExampleDomainModule dependencies initialized` with zero DI errors and
  the route mapped (`RoutesResolver`/`RouterExplorer` logs); live `curl`
  against the compiled build confirmed `GET /api/v1/example/ping` →
  `200 {"status":"ok"}`, with `HttpLoggingMiddleware`'s completion log
  firing for the new route with zero extra wiring, proving the module
  template integrates cleanly with the existing cross-cutting logging
  infrastructure.
- Sprint 1 → Auth integration, Pre-Phase 1.2D stabilization & architecture
  freeze (2026-07-19; audit/hardening pass across Phases 1.1–1.2C treated
  as one integrated system — explicitly not a feature phase, no Phase
  1.2D work started): full architecture/codebase/documentation/
  dependency/security/performance/testing/DX audit. Confirmed clean, no
  fix needed: whole-backend circular-dependency graph (traced every
  relative import across `config/`, `logging/`, `common/`, and the
  placeholder folders — strictly layered, acyclic); DI/provider scope
  (no `Scope.REQUEST`, no duplicate tokens, no orphaned providers);
  per-domain `config/*/index.ts` barrels and `EnvironmentMode`'s
  currently-zero consumers (both looked like dead scaffolding at first
  read, but both are pre-existing, explicitly documented decisions —
  `configuration.md`'s "every domain is reachable both directly and via
  its own barrel" convention, and Phase 1.2C.1's decision log entry
  grouping `LogLevel`/`LogFormat`/`EnvironmentMode` as one deliberate
  three-type mirror — verified against the docs before concluding neither
  needed touching); stack-trace handling in `ExceptionLoggingFilter`
  (confirmed server-side-log-only, never reaches the HTTP response);
  tsconfig/ESLint/Prettier/Husky/commitlint/lint-staged consistency
  across the monorepo; Prisma schema/migrations/seed (no drift, no dead
  code). **Two genuine issues found and fixed:** (1) zero test coverage
  existed for `apps/api/src/config/env.validation.ts` despite non-trivial
  Zod validation logic and a documented history of real bugs found there
  across Phase 1.2B's own review passes (the `PORT=notanumber` crash, the
  `z.coerce.boolean()` string-coercion trap) — added
  `env.validation.spec.ts` (16 tests: required-field enforcement, PORT
  coercion/range errors with the exact historical regressions, the
  `DATABASE_SSL` boolean-trap avoidance, `CORS_ALLOWED_ORIGINS`
  split/trim/dedupe, URL validation, multi-error aggregation, and the
  module-level cache behavior), bringing the suite to **92 tests / 9
  suites** (was 76/8 as of Phase 1.2C.9); (2)
  `common/middleware/README.md` claimed `HttpLoggingMiddleware` is
  "Registered globally in `app.module.ts`'s `configure()`" — false since
  Phase 1.2C.5 deliberately moved registration to raw `app.use()` in
  `main.ts` after discovering `configure()`'s prefix-scoping bug; `main.ts`
  itself already documented the real mechanism correctly, only this one
  README had drifted — corrected. `lint`/`typecheck`/`build`/`test` clean
  at both the `@antrique/api` and workspace (`turbo run`) level; live boot
  clean (all providers resolve, zero DI errors); live end-to-end smoke
  test against the compiled `dist/` build confirmed
  `HttpLoggingMiddleware`/`ExceptionLoggingFilter` both fire correctly on
  a real request and the client-facing 404 response body stays Nest's
  untouched default shape. `apps/web`'s workspace `build` still fails
  locally with the pre-existing Windows-only Next.js standalone-output
  `EPERM`/symlink issue (see Phase 1 production-readiness audit entry
  below) — unrelated to any Phase 1.1–1.2C backend code, unchanged by
  this pass, out of scope. Full report in the session that ran this audit.
- Sprint 1 → Auth integration, Phase 1.2C.9 (logging module integration &
  developer experience — no new logging capability, per this phase's own
  brief): a whole-subsystem audit pass, not another single-phase review.
  Inspected every consumer outside `apps/api/src/logging/`
  (`common/middleware/`, `common/filters/`, `app.module.ts`, `main.ts`)
  and confirmed all of them import exclusively through the public barrel
  — no direct reach-ins anywhere; confirmed the export surface itself
  (`LoggerService`/`JsonLogFormatter`/`ConsoleLogTransport`/
  `AuditLoggerService` internal, `RequestContextService`/`PerformanceLogger`
  exported, `LOG_FORMATTER`/`LOG_TRANSPORT` internal wiring only,
  `LOGGER`/`AUDIT_LOGGER` exported) was already correct with no changes
  needed. **Found real cross-cutting documentation staleness no
  individual phase's own review would have caught:**
  `docs/architecture/backend.md`'s §3 "Dependency graph" showed only
  `AppModule → ConfigModule` — `LoggingModule` (imported into `AppModule`
  since Phase 1.2C.1) was entirely absent from the diagram, and neither
  `HttpLoggingMiddleware` (`main.ts`'s `app.use()`) nor
  `ExceptionLoggingFilter` (`APP_FILTER`) appeared at all; fixed with an
  accurate current-state diagram that also distinguishes module imports
  from provider/middleware registrations. The doc's "Deferred to Phase
  1.2B" list still claimed "a structured logging framework... but nothing
  consumes it yet" — false, since the framework is real and has two real
  consumers; corrected. The doc's title and opening "Status" line still
  described bare Phase 1.2A state with no acknowledgment of the fully-
  built logging subsystem; both updated. `apps/api/src/logging/index.ts`'s
  own header comment omitted `AuditLoggerService` from its internal-
  classes list (added Phase 1.2C.8, never reflected in the barrel's own
  comment) — fixed. **New `docs/architecture/logging-guide.md`** — usage
  examples (injecting `LOGGER`/`AUDIT_LOGGER`/`PerformanceLogger` into a
  provider, worked snippets for each), a best-practice guidelines table,
  and extension pointers — split out from the architecture-focused
  `logging/README.md` the same way `configuration-guide.md` was split from
  `configuration.md` in Phase 1.2B.4 (explicit precedent: "usage
  examples... are a different kind of content... from architecture/
  rationale focus"), not a new pattern invented for this phase.
  Cross-linked from both `logging/README.md` and `backend.md`'s
  `logging/` folder entry. `lint`/`typecheck`/`build`/`test` (76 passing —
  identical count to Phase 1.2C.8, confirming zero behavior change) all
  clean; live boot unchanged.
- Sprint 1 → Auth integration, Phase 1.2C.8 (audit logging foundation
  only — no auth/authorization integration, no user lookup/JWT parsing,
  no current-user resolution, no database persistence/audit tables/
  querying/dashboards, no sensitive-data masking, no external SIEM/
  OpenTelemetry, no business-module integration, no automatic audit
  generation): `apps/api/src/logging/audit-logger.service.ts` —
  `AuditLoggerService implements AuditLogger`, finally bound to the
  `AUDIT_LOGGER` token every prior 1.2C phase has documented as
  "unbound... until Phase 1.2C.8." Internal — never exported from the
  public barrel, unlike `RequestContextService`/`PerformanceLogger`:
  `AUDIT_LOGGER` is a genuine swap-point token (same category as
  `LOGGER`/`LOG_FORMATTER`/`LOG_TRANSPORT`), so consumers inject the token
  and depend on the `AuditLogger` interface, never this concrete class.
  Injects only `LOGGER` — never `RequestContextService` — relying purely
  on `LoggerService`'s existing automatic context merge, identical
  reasoning to `ExceptionLoggingFilter`/`PerformanceLogger`.
  **`AuditEvent` was redesigned, not patched onto Phase 1.2C.1's original
  guess:** that type (`actorUserId?`, `resourceType`, `before?`/`after?`,
  `ipAddress?`/`userAgent?`) was an architecture-only attempt at mirroring
  the `AuditLog` Prisma model's columns, written before this phase's real
  requirements existed — and this phase explicitly excludes database
  persistence, so targeting a DB model's shape no longer made sense. New
  shape: `event`, `action`, `resource`, `resourceId?`, `actorType?`,
  `actorId?`, `outcome: 'SUCCESS' | 'FAILURE'` (new `types/audit-outcome.type.ts`),
  `metadata?` — all `readonly` ("immutable audit event objects").
  `ipAddress?`/`userAgent?` dropped entirely (duplicates what
  `RequestContext`'s auto-merge already supplies); `before?`/`after?`
  dropped (business-logic diffing, out of scope); `actorUserId?` replaced
  by the more generic `actorType?`/`actorId?` (an actor might be a user, a
  service account, or the system itself — no user-entity assumption).
  `AuditLogger.record()` renamed to `log()` — the brief's own explicit
  naming ask, superseding Phase 1.2C.1's placeholder guess from an
  architecture-only phase with no real consumer to validate it against.
  No `logAsync()` — every `Logger` method is synchronous, this phase
  excludes persistence, so there's no actual async work to justify a
  second method with no behavioral difference from `log()` (documented as
  a deliberate, justified omission, not an oversight — same "only if
  justified" judgment `PerformanceLogger`'s `measure`/`measureAsync` split
  already established a precedent for). `event.metadata` nests as its own
  key in the logged object rather than flat-merging — unlike
  `PerformanceLogger`'s genuinely-arbitrary caller metadata, `metadata`
  here is one named field of the `AuditEvent` schema itself. One
  consistent `.info()` level regardless of `outcome`, matching the
  precedent `HttpLoggingMiddleware`/`PerformanceLogger` already set
  against status/success-based level branching. 8 new tests
  (`audit-logger.service.spec.ts`) — schema/optional-field-omission,
  metadata nesting, outcome-level-consistency, no-duplicate-context-fields,
  `RequestContext` inheritance (real `RequestContextService`, mock
  `Logger` capturing `getContext()` at call time), and a compile-time
  (`@ts-expect-error`) immutability check. `lint`/`typecheck`/`build`/`test`
  (76 passing) all clean; live boot unchanged; directly resolved
  `AUDIT_LOGGER` from a live Nest app instance and logged both a
  full-fields `SUCCESS` event and a minimal-fields `FAILURE` event —
  confirmed correct schema, correct optional-field omission, and correct
  `metadata` nesting in the real JSON output.
- Sprint 1 → Auth integration, Phase 1.2C.7 (performance logging only — no
  metrics aggregation/Prometheus/OpenTelemetry/histograms/percentiles/
  distributed tracing, no controller/repository instrumentation, no
  decorators/interceptors, no audit/external-monitoring logging):
  `apps/api/src/logging/performance-logger.service.ts` — `PerformanceLogger`,
  a reusable, DI-injectable timing utility with no current call site (same
  "build the capability before its first real consumer" pattern every
  earlier 1.2C phase followed). No DI token — a single concrete class with
  no interface to swap it behind, injected by class reference and exported
  from the public barrel, same treatment as `RequestContextService`, not
  `LoggerService`/`LOGGER`. Two manual, unguarded primitives —
  `startTimer(operation, { category? })` (captures a plain
  `PerformanceTimer` handle: `{ operation, start: process.hrtime.bigint(),
  category? }`, nothing to leak or clean up on its own) and
  `endTimer(timer, { success?, metadata? })` (computes `durationMs`, logs
  once via `logger.info('Performance measurement', ...)`) — plus two
  exception-safe wrappers, `measure()`/`measureAsync()`, whose own
  try/catch/finally always logs exactly once (flipping `success` to
  `false` on a caught error) and always rethrows the original error
  afterward, never swallowing it — this is what actually provides
  "timer cleanup on failure," not the manual pair. Caller-supplied
  `metadata` spreads *before* the fixed fields
  (`operation`/`durationMs`/`success`/`category`) in the log call, so it
  can never accidentally clobber them even if a key collides. Never
  touches `RequestContextService` — "automatically inherit RequestContext
  whenever one exists" and "work independently of HTTP middleware" are
  both satisfied by doing nothing special: `logger.info()` already
  auto-merges whatever context is active (Phase 1.2C.4), exactly like
  `ExceptionLoggingFilter`; this is also what makes "zero context leakage"
  hold by construction (no shared context-related state in the class at
  all, only a `Logger` reference). One consistent log level (`.info()`)
  regardless of `success`, matching Phase 1.2C.5's own precedent against
  status-based level branching. 13 new tests
  (`performance-logger.service.spec.ts`) — sync/async happy-path and
  exception-rethrow cases, metadata-collision-safety, a real
  (`setTimeout`-based) duration lower-bound check, and two tests proving
  context inheritance/no-leak using the real `RequestContextService`
  (mock `Logger` capturing `getContext()` at call time, same pattern
  established for the HTTP middleware and exception filter tests).
  `lint`/`typecheck`/`build`/`test` (65 passing) all clean; live boot
  unchanged; directly resolved `PerformanceLogger` from a live Nest app
  instance and exercised `measure()`/`measureAsync()` for both success and
  a deliberately-thrown error — confirmed the error was caught, logged
  with `success: false`, and correctly rethrown to the caller (not
  swallowed).
- Sprint 1 → Auth integration, Phase 1.2C.6 (exception logging only — no
  audit/performance logging, no OpenTelemetry, no external monitoring, no
  retry/alerting, no sensitive-data masking, no custom exception
  hierarchy): `apps/api/src/common/filters/exception-logging.filter.ts` —
  `ExceptionLoggingFilter extends BaseExceptionFilter`, the first real
  content in the `common/filters/` placeholder. Registered via
  `{ provide: APP_FILTER, useClass: ExceptionLoggingFilter }` in
  `app.module.ts` — Nest's own DI-native global-filter mechanism, chosen
  over `app.useGlobalFilters()` in `main.ts` because it needs no manual
  `app.get()`/`app.use()` workaround (exception filters aren't
  route-matched at all, so there's no equivalent to Phase 1.2C.5's
  `MiddlewareConsumer` prefix-scoping bug here — confirmed by testing
  anyway, given that exact prior lesson). `catch()` logs via `LOGGER.error()`
  then calls `super.catch(exception, host)`, so Nest's default HTTP
  response (body and status) reaches the client completely unchanged.
  A `describeException()` helper classifies every thrown value safely,
  in a specific branch order (`AggregateError extends Error`, so it's
  checked *before* the generic `Error` branch, or its nested `.errors`
  would silently vanish into the generic case): `HttpException` → real
  `message`/`type`/`statusCode`/`stack`; `AggregateError` → `message`/
  `type`/`stack` plus `errors: exception.errors.map(describeException)`
  (each nested error/value recursively safe, including a nested non-Error
  or circular member); plain `Error` → same minus `statusCode`; anything
  else (string, number, plain object, circular-reference object) →
  `typeof`-based `type`, a safe `String()`/`message: 'Non-Error value
  thrown'` summary, and — post-review-fix, for objects specifically — a
  `details` field holding a JSON round-trip clone (a safe, fully plain
  deep copy when serializable, or `'[Unserializable value]'` when not),
  so a plain thrown object stays queryable as nested structure instead of
  a double-JSON-encoded string; logging itself can never throw, even on a
  deliberately circular thrown object. `requestId`/`correlationId`/`ip`/
  `userAgent` are never re-extracted or duplicated into metadata — they
  reach the log via `LoggerService`'s existing automatic context merge
  (Phase 1.2C.4), exactly like every other `Logger` call site; the filter
  itself never touches `RequestContextService`. Metadata is
  `{ method, path, exceptionType, message, statusCode?, stack?, errors?,
  details? }`. Corrected
  a stale assumption along the way: `main.ts`'s original bootstrap comment
  (from Phase 1.2A) named the eventual filter `AllExceptionsFilter` and
  described it as reshaping responses into RFC 9457 Problem Details —
  this phase's filter deliberately does the opposite (preserves the
  default shape), so it's named `ExceptionLoggingFilter` instead; the RFC
  9457 response-shaping filter remains separate, unscheduled work, and the
  stale comment (plus the matching stale line in `backend.md`) was
  corrected to say so. 9 new tests
  (`exception-logging.filter.spec.ts`), covering every exception category
  including `AggregateError` and circular references, `super.catch()`
  stubbed via `jest.spyOn(BaseExceptionFilter.prototype, 'catch')` (no
  real `HttpAdapterHost` needed — that's Nest's own tested responsibility,
  not this phase's to re-verify), plus one test proving the filter logs
  from within a genuinely active `RequestContextService` context.
  `lint`/`typecheck`/`build`/`test` (51 passing) all clean; live boot
  unchanged; live `curl` against an unmatched route (Nest's own automatic
  `NotFoundException`, a real `HttpException` — no custom controller
  needed) confirmed: the client still receives Nest's byte-identical
  default 404 JSON body; exactly one `"Unhandled exception"` log line
  appears in addition to (not instead of) the existing `"HTTP request
  completed"` line for the same request; both share the same
  `requestId`/`correlationId`.
- Sprint 1 → Auth integration, Phase 1.2C.5 (HTTP logging only — no
  exception filters, no audit/performance logging, no OpenTelemetry, no
  auth integration): `apps/api/src/common/middleware/http-logging.middleware.ts`
  — the first real call site for `LOGGER`/`RequestContextService`, and the
  first real content in the `common/middleware/` placeholder. Per request:
  generates `requestId`/`correlationId` (reusing incoming `x-request-id`/
  `x-correlation-id` headers when present, else `crypto.randomUUID()`),
  establishes a `RequestContext` (`requestId`, `correlationId`, `req.ip`
  — respects the existing production `trust proxy` setting —, `user-agent`)
  via `RequestContextService.run()`, and logs one `"HTTP request completed"`
  entry via `LOGGER` once `res` emits `'finish'` (not `'close'` — correct
  `statusCode`, fires only after the response actually completes). Duration
  measured via `process.hrtime.bigint()` (monotonic, immune to system-clock
  adjustments), converted to fractional `durationMs`. Deliberately does not
  duplicate `requestId`/`correlationId`/`ip`/`userAgent` into the log's
  `metadata` — those already reach the same line via `LoggerService`'s
  existing `context` auto-merge (Phase 1.2C.4); only `method`/`path`
  (query-string-free, per "no query logging")/`statusCode`/`durationMs`
  are passed as `metadata`. **Found and fixed a genuine bug during live
  verification, not just unit testing:** `AppModule implements
  NestModule`/`configure()`/`MiddlewareConsumer.forRoutes('*')` — the
  originally-planned registration mechanism — silently scoped middleware
  matching to `app.setGlobalPrefix()`'s `/api` prefix; `curl` against
  unprefixed paths (`/`, `/health`) produced zero log output while
  `/api/v1/*` paths worked fine. Root-caused via direct `curl` testing
  against a live server, not assumed from docs. Fixed by registering the
  middleware via raw `app.use()` in `main.ts` instead (resolved from the
  DI container via `app.get()`), which runs for every request regardless
  of prefix — verified live afterward against both prefixed and unprefixed
  paths. Also found and fixed a real test-design flaw while writing
  `http-logging.middleware.spec.ts`: a hand-rolled plain-object fake
  `Response` with manual `.on()`/`.emit()` does NOT get Node's
  `async_hooks` instrumentation, so `AsyncLocalStorage` context appeared
  lost by the time a manually-triggered `'finish'` fired — not a bug in
  the middleware, but a test mock that didn't faithfully reproduce how a
  real Express response's `'finish'` event (genuinely async_hooks-tracked
  through Node's real socket/stream internals) propagates context; fixed
  by scheduling the fake `'finish'` callback via `setImmediate` at
  registration time, a real async boundary. 9 new tests, real
  `RequestContextService` + a mocked `Logger` (never the internal
  `LoggerService`, which is deliberately not exported from the public
  barrel). `lint`/`typecheck`/`build`/`test` (41 passing) all clean; live
  boot unchanged; live `curl` verification confirmed: unprefixed and
  prefixed paths both log exactly once; incoming `x-request-id`/
  `x-correlation-id` headers are echoed back verbatim, not regenerated;
  two genuinely concurrent `curl` requests each produced their own,
  uncontaminated `requestId` in their log line.
- Sprint 1 → Auth integration, Phase 1.2C.4 (request context only — no
  middleware, no ID generation, no interceptors): `RequestContextService`
  (`apps/api/src/logging/request-context.service.ts`) wraps Node's
  `AsyncLocalStorage<RequestContext>` with two methods —
  `run<T>(context, callback): T` and `getContext(): RequestContext |
  undefined` — no DI token (a plain provider; unlike `LOGGER`/
  `LOG_FORMATTER`/`LOG_TRANSPORT`, there's no interface to swap it behind)
  and no `.clear()` method (`AsyncLocalStorage`'s own scoping already
  makes "cleared" the natural resting state outside any `run()`). New
  `types/request-context.type.ts` (`requestId`/`correlationId` required,
  `traceId`/`userId`/`sessionId`/`ip`/`userAgent` optional) is structurally
  assignable directly to the existing `LogContext` type (extended this
  phase with the same four new optional fields) — so `LoggerService`
  merges an active context into `LogEntry.context` with zero mapping
  function, just `context: requestContext`. `LoggerService`'s constructor
  now also injects `RequestContextService`; `write()` reads
  `getContext()` and conditionally includes `context`, same "omit the key
  entirely when absent" convention `metadata` already used — when no
  context is active (true for every call today, since nothing calls
  `.run()` yet), output is byte-identical to Phase 1.2C.3.
  `RequestContextService` is exported from both `logging.module.ts`
  (provider + export) and the public `logging/index.ts` barrel — unlike
  `LoggerService`/`JsonLogFormatter`/`ConsoleLogTransport`, which stay
  internal, since a future middleware outside `apps/api/src/logging/`
  will need to inject it. 7 new tests
  (`request-context.service.spec.ts`) cover the two properties that
  actually justify `AsyncLocalStorage` over a plain module variable:
  context survives a real async boundary (`setTimeout` inside the
  callback) and two concurrent `run()` calls never leak into each other
  (proven via staggered `Promise.all`); 2 new tests added to
  `logger.service.spec.ts` for the merge behavior. `lint`/`typecheck`/
  `build`/`test` (33 passing) all clean; live boot unchanged; manual
  verification against the compiled `dist/` confirmed all three required
  behaviors: no-context calls unchanged, an active context merges in
  correctly, and two staggered concurrent contexts never cross-contaminate.
- Sprint 1 → Auth integration, Phase 1.2C.3 review (production-grade
  review, not new functionality): found and fixed two genuine issues past
  the original implementation. (1) `JsonLogFormatter`'s plain
  `JSON.stringify` silently rendered any `Error` in `metadata` as `"{}"`
  (Error's own properties are non-enumerable) — a near-certain occurrence
  the moment any call site does `logger.error('X failed', { error: err })`;
  fixed with a `JSON.stringify` replacer that special-cases `Error`
  instances (name/message/stack), including nested ones. (2) Zero test
  coverage existed anywhere in `apps/api` despite Jest being fully
  configured and CLAUDE.md's standing "every feature ships with tests"
  rule — added `logger.service.spec.ts`, `json-log-formatter.spec.ts`,
  `console-log-transport.spec.ts` (22 tests total, later 31 after Phase
  1.2C.4's additions). `lint`/`typecheck`/`test` all clean after fixes.
- Sprint 1 → Auth integration, Phase 1.2C.3 (structured logger only — no
  middleware, no correlation IDs, no audit logging, no third-party
  library): the logging subsystem's first concrete implementation.
  `LoggerService` (implements `Logger`, bound to `LOGGER`) reads
  `loggerOptions.level` and level-filters against a new
  `constants/log-level-severity.constant.ts` (`LOG_LEVEL_SEVERITY`,
  fatal=0..trace=5, mirroring `env.validation.ts`'s enum order) before
  building a `LogEntry` at all. `JsonLogFormatter`/`ConsoleLogTransport`
  each bound to their own new `LOG_FORMATTER`/`LOG_TRANSPORT` tokens
  (`tokens/logging.tokens.ts`) — `ConsoleLogTransport` injects
  `LOG_FORMATTER` and routes by severity to `console.error`/`.warn`/`.log`;
  `LoggerService` injects only `LOG_TRANSPORT`, never the formatter
  directly, since formatting is the transport's concern per
  `LogTransport.write(entry): void`'s existing signature. Deliberately not
  environment-gated — a transport that silently drops every log line
  outside development, with no replacement configured, would be a worse
  outcome than one that logs everywhere; a production-grade transport is
  later, unscoped work. `loggerOptions.format === 'pretty'` has no
  consumer yet (only `JsonLogFormatter` exists) — documented as an honest
  gap, not silently ignored. `LogEntry.context` stays threaded through the
  pipeline but never populated (needs `AsyncLocalStorage`, Phase 1.2C.4).
  Neither the new formatter/transport classes nor `LoggerService` itself
  are exported from the public `logging/index.ts` barrel — consumers only
  ever get `LOGGER`/`Logger`, never a concrete class. `logging/README.md`
  and `backend.md` updated; one incidental stale-comment fix in
  `types/log-context.type.ts` (said "Phase 1.2C.2+ (correlation IDs)",
  corrected to "Phase 1.2C.4+" since 1.2C.2 turned out to be
  configuration, not correlation IDs). `lint`/`typecheck`/`build` all
  clean; live boot shows `LoggingModule dependencies initialized` with no
  DI resolution errors; direct invocation of the resolved `LOGGER` against
  the real `.env` confirmed: `.debug()`/`.trace()` calls (below the
  configured `info` threshold) produce no output at all; `.info()`
  through `.fatal()` produce clean JSON lines; a call with `metadata`
  includes it, a call without omits the key entirely; `.info()` lands on
  stdout, `.warn()`/`.error()`/`.fatal()` on stderr.
- Sprint 1 → Auth integration, Phase 1.2C.2 (logging configuration only —
  no logger implementation, no middleware, no third-party library):
  `apps/api/src/logging/config/logger-options.config.ts` — a
  `registerAs('loggerOptions', ...)` factory assembling `LoggerOptions`
  (`{ level, format }`) from the already-validated `LOG_LEVEL`
  (`app.config.ts`) and `LOG_FORMAT` (`config/logging/logging.config.ts`)
  — no new env var, no `env.validation.ts` change, no re-validation. Filed
  under `apps/api/src/logging/` rather than the frozen
  `apps/api/src/config/`, since this is a config concern owned by and
  graduating alongside the Logging module, not a general-purpose domain —
  registered via `LoggingModule`'s new `ConfigModule.forFeature(...)`
  import rather than touching the frozen `config.module.ts`'s
  `forRoot()` call. `logging/README.md` and
  `docs/architecture/configuration.md` updated to document the new
  namespace and why it lives outside the usual `config/` folder.
  `lint`/`typecheck`/`build` all clean; live boot still shows
  `LoggingModule dependencies initialized`; direct invocation of the new
  factory against the real `.env` resolves `{ level: 'info', format:
  'json' }`, matching `app.config.ts`'s `logLevel` and
  `config/logging/logging.config.ts`'s `format` exactly.
- Sprint 1 → Auth integration, Phase 1.2C.1 (logging architecture only —
  interfaces/types/tokens/an empty module, zero logging behavior):
  `apps/api/src/logging/` — `Logger`/`LogTransport`/`LogFormatter`/
  `AuditLogger` interfaces; `LogLevel`/`LogFormat`/`EnvironmentMode` types
  that deliberately mirror config's already-validated `LOG_LEVEL`/
  `LOG_FORMAT`/`NODE_ENV` enums rather than inventing a second vocabulary;
  `LogEntry`/`LogContext`/`LogMetadata`/`AuditEvent`/`LoggerOptions` data
  shapes; `LOGGER`/`AUDIT_LOGGER` Symbol-based DI tokens; an empty
  `@Global() LoggingModule` wired into `AppModule` (zero behavior change —
  live-boot-confirmed identical). `AuditLogger` kept distinct from
  `Logger` on purpose, mirroring Phase 1's immutable `AuditLog` Prisma
  model and CLAUDE.md's audit-logging mandate. `decorators/`, `utils/`,
  and `constants/` deliberately not created — nothing non-speculative
  belongs in any of them yet (documented in `logging/README.md`, same
  "document the gap, don't fill it with placeholders" discipline as every
  other subsystem this project has built). `lint`/`typecheck`/`build` all
  clean; live boot shows `LoggingModule dependencies initialized` in the
  DI graph with no circular-dependency errors. **Explicitly not started
  Phase 1.2C.2+** (no logger implementation, no middleware, no correlation
  IDs, no third-party library) per this phase's own instruction —
  architecture awaited review/approval first (now complete, see Phase
  1.2C.2 above).
- Sprint 1 → Auth integration, Phase 1.2B.5 (final configuration audit —
  certification only, no new functionality): comprehensive re-review of
  the entire config subsystem (env.validation.ts, config.module.ts,
  config/index.ts, all 8 real namespaces, .env.example, and all 4
  architecture docs) against every prior phase's own review findings.
  Found one genuine issue that had survived all 3 previous review
  passes: `backend.md`'s Phase-1.2A-era "two namespaces now" decision
  entry was never updated as the domain count grew to 8 across
  1.2B.1–1.2B.3 — fixed, with its original scope made explicit. Verified
  live: full app boot identical to every prior phase; all 8 namespaces
  resolve correctly via direct `registerAs()` invocation (including
  `appConfig.KEY` resolving to a valid DI token, confirming the
  typed-injection pattern is genuinely viable, not just type-checked);
  re-ran the missing-`DATABASE_URL` and malformed-`PORT` fail-fast cases
  from earlier phases with identical results — zero regression across
  environment validation, typed configuration, typed injection,
  documentation, extension workflow, troubleshooting guide, or runtime
  startup. `lint`/`typecheck`/`build` all clean. **Phase 1.2B is
  certified complete and frozen** except for future feature-specific
  extensions.
- Sprint 1 → Auth integration, Phase 1.2B.4 (configuration DX,
  documentation only — zero runtime behavior change): new
  `docs/architecture/configuration-guide.md` — usage examples (new
  module, new validated var, consuming in a service/bootstrap), a
  conventions-with-rationale table, a 7-scenario troubleshooting guide,
  and the 7-step extension process, cross-linked from
  `configuration.md`/`validation.md`/`backend.md`. Found and fixed one
  real inconsistency while reviewing code comments (§7 of the brief):
  every real config domain except `app.config.ts` had an explanatory
  comment — added one, matching the others' style. Also tightened
  `env.validation.ts`'s terse `// security` label to match its siblings'
  level of detail. No new env vars, no new domains, no source-code
  behavior change — confirmed via clean rebuild + identical live-boot log
  before and after. `lint`/`typecheck`/`build` all clean.
- Sprint 1 → Auth integration, Phase 1.2B.3 (typed configuration modules):
  graduated 6 config domains from placeholder to real —
  `security` (rateLimitWindowMs, rateLimitMax), `logging` (format —
  LOG_LEVEL itself stays under `app`), `swagger` (enabled, path — config
  only, no UI wired up), `health` (path — config only, new
  `config/health/`, distinct from the existing `apps/api/src/health/`
  placeholder), `cache`/`queue` (both `redisUrl`, same validated
  `REDIS_URL` source, two namespaces). Added 7 new fields to
  `env.validation.ts` (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`,
  `LOG_FORMAT`, `SWAGGER_ENABLED`, `SWAGGER_PATH`, `HEALTH_PATH`,
  `REDIS_URL` — the last now required, same treatment as `DATABASE_URL`).
  Confirmed with the user first: these are minimal, safe-defaulted
  platform-internal toggles, not speculative third-party product config,
  so they don't conflict with the "no speculative vendor config" rule; 10
  domains remain untouched placeholders (auth, storage, email,
  notifications, payments, ai, search, analytics, feature-flags,
  monitoring). Adopted one project-wide typed access pattern —
  `@Inject(xConfig.KEY)`/`ConfigType<typeof xConfig>` for providers,
  `app.get(xConfig.KEY)` outside DI — and demonstrated it in `main.ts`,
  replacing the previous phase's `ConfigService.getOrThrow()` calls.
  `configuration.md`/`validation.md` updated (folder table, new §4 typed-
  access-pattern section, schema table, several stale cross-references
  from the 1.2B.2 review fixed along the way). `lint`/`typecheck`/`build`
  clean; live boot confirmed identical startup log; spot-checked that the
  new required `REDIS_URL` is genuinely enforced (not just coincidentally
  present in `.env`).
- Sprint 1 → Auth integration, Phase 1.2B.2 (environment validation only):
  one Zod schema (`apps/api/src/config/env.validation.ts`) validates the 6
  env vars the implemented config layer actually reads (`NODE_ENV`, `PORT`,
  `LOG_LEVEL`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, `DATABASE_SSL`),
  wired into `ConfigModule.forRoot()`'s `validate` option so a malformed
  or missing value aborts startup before any provider (or the HTTP
  listener) exists. `app.config.ts`/`database.config.ts` now read the
  validated result instead of parsing `process.env` themselves — no
  duplicated parsing logic. **Real finding from live testing:** the
  validation failure throws synchronously at `require()`-time (inside
  `ConfigModule`'s `@Module()` decorator), before `main.ts`'s own
  `bootstrap()` function body ever runs — so the `bootstrap().catch()`
  added this phase does NOT catch it (confirmed, not assumed); Nest's own
  internal error handling + Node's default uncaught-exception handler
  produce the fail-fast behavior instead. Documented accurately in
  `docs/architecture/validation.md` §3 rather than left as an inaccurate
  code comment. Live-verified: valid `.env` boots clean; `DATABASE_URL`
  removed → clean `DATABASE_URL: Required` error, exit 1, never reaches
  "Nest application successfully started"; restored `.env` boots clean
  again; `PORT=notanumber` (which crashed with a raw `ERR_SOCKET_BAD_PORT`
  stack trace in Phase 1.2A's own verification) now fails cleanly with
  `PORT: Expected number, received nan` instead — a previously-flagged gap
  actually closed. New `docs/architecture/validation.md`;
  `configuration.md`'s lifecycle diagram updated from "not built yet" to
  point at it. `lint`/`typecheck`/`build` all clean.
- Sprint 1 → Auth integration, Phase 1.2B.1 (configuration architecture
  only, no validation/feature values yet): reorganized `apps/api/src/config/`
  from Phase 1.2A's two flat files into a per-domain folder architecture —
  `app/` and `database/` hold the two real namespaces (relocated,
  byte-identical content — verified via a clean rebuild + live boot
  producing the exact same startup log as before the move), plus 15
  README-only placeholder domains (`auth`, `security`, `cache`, `queue`,
  `storage`, `email`, `notifications`, `payments`, `ai`, `search`,
  `analytics`, `feature-flags`, `monitoring`, `logging`, `swagger`). Added
  a central `config/index.ts` barrel — `app.module.ts` now imports
  `ConfigModule` from `./config`, not the file directly. New
  docs/architecture/configuration.md (folder structure, naming/export/
  ownership conventions, config lifecycle diagram, architecture decisions
  — why CORS stays under `app`, why `cache`/`queue` split despite sharing
  Redis, why `auth`/`security` split); `backend.md` §4 trimmed to a pointer
  at it instead of duplicating. `lint`/`typecheck`/`build` all clean; no
  new env vars, no validation (still Phase 1.2B.2), no breaking changes —
  registered namespace keys and shapes are unchanged from 1.2A.
- Sprint 1 → Auth integration, Phase 1.2A (backend foundation only, no auth
  logic yet): NestJS application shell — `main.ts` (API prefix `/api`,
  URI versioning → `/api/v1/...`, graceful shutdown hooks, production
  `trust proxy`, startup log), `app.module.ts` (imports the new global
  `ConfigModule`), `apps/api/src/config/` (real `@nestjs/config` wiring,
  two namespaces: `app`, `database` — the latter is connection-string data
  only, no Prisma import, no client, `apps/api/prisma/` untouched per this
  phase's "no database files" constraint). Added placeholder folders
  (README-only, matching Phase 0's existing convention) for `database/`,
  `health/`, `shared/`, `types/`, `utils/`, and `common/{filters,
  interceptors,guards,pipes,middleware}/`. New
  docs/architecture/backend.md (folder structure, startup flow, dependency
  graph, architecture decisions). **Found and fixed one real pre-existing
  bug while validating:** `apps/api/package.json`'s `start` script pointed
  at `dist/main`, but `tsconfig.json`'s multi-root `include`
  (`src/`+`tests/`+`prisma/`) makes `tsc` emit under `dist/src/main.js` —
  `node dist/main` has never actually worked. Fixed to `node dist/src/main`;
  verified the built app now boots and listens for real (confirmed via
  `curl` against the running process). `lint`/`typecheck`/`build` all clean.
- Sprint 1 → Database foundation, Phase 1 production-readiness audit
  (2026-07-17): closed the one real gap Phase 1.1B left open — migrations
  had never been run against a live Postgres. Ran the full pipeline for
  real against a native PostgreSQL 18 instance: all 4 migrations applied
  clean, `prisma validate`/`format`/`generate` clean, workspace
  `lint`/`typecheck`/`test`/`build` clean (apps/api; apps/web has a
  pre-existing Windows-only Next.js standalone-output symlink issue,
  unrelated to the database layer — not fixed, out of scope). **Found and
  fixed one genuine bug in the process:** `seed.ts`'s `.upsert()` calls on
  `role`/`user`/`setting` failed with Postgres error 42P10 — Prisma's
  generated `ON CONFLICT` SQL can't target the partial unique indexes
  Phase 1.1B added (`WHERE deleted_at IS NULL`), a defect invisible to
  schema-only review. Fixed by switching those 3 call sites to
  find-then-create/update, and documented the landmine prominently in
  docs/architecture/database-schema.md §8 for Phase 1.2's repository
  layer to avoid repeating it. Also live-verified RLS actually enforces
  tenant isolation (not just "the SQL looks right") — fails closed with no
  tenant set, correct/incorrect tenant visibility, role-scoped admin/
  service overrides, append-only grant revokes, and the optimistic-lock
  version trigger — all connected as `antrique_app`/`antrique_service`,
  not the owner role. Fixed a doc/code drift (seed permissions count: docs
  said 30, `seed.ts` actually seeds 34). Added two documentation sections
  the audit brief required and that were genuinely missing: Production
  Deployment and Recovery Procedures (§14–§15). Full report with scores in
  the session that ran this audit; database-schema.md §13 has the
  before/after validation table.
- Sprint 1 → Database schema + migrations, Phase 1.1B: prisma.config.ts
  (Prisma 7 config + driver-adapter wiring), 4 migrations (baseline +
  partial unique indexes + CHECK constraints + RLS), antrique_app/
  antrique_service roles with tenant/admin/service RLS policies on all 25
  tenant tables, a version-auto-increment trigger, idempotent seed.ts
  (tenant/permissions/roles/admin user/settings/sample clients+leads+
  projects), all `db:*` scripts. Schema itself unchanged except the
  generator block (switched to the `prisma-client` generator + driver
  adapters, which Prisma 7's client generation actually requires — see
  docs/architecture/database-schema.md §13). Flagged one scope gap rather
  than resolving it unilaterally: the seed brief asked for "Services" and
  "Blog Categories," neither of which are modeled entities in the approved
  schema (see seed.ts header + database-schema.md §10).
- Sprint 1 → Database schema + migrations, Phase 1.1A final review (2nd
  pass): re-verified the whole schema programmatically (required-field
  checklist per model, Float/enum/naming/PK-strategy scans) rather than
  re-trusting the first pass. Found 2 more small gaps: `Session.updatedAt`
  was missing (had version + semantic timestamps but no generic
  last-touched field) and `Payment` was missing the `(tenant_id, status)`
  index that the docs already claimed it had (doc/schema drift). Both
  fixed, re-validated + reformatted clean.
- Sprint 1 → Database schema + migrations, Phase 1.1A final review (1st
  pass): added explicit `onDelete` referential actions to all 62 relations
  (previously none — database.md's deletion-behavior policy wasn't actually
  encoded in schema.prisma), added missing createdAt/updatedAt to
  QuotationItem/InvoiceItem, added composite indexes (Task/Milestone/
  Invoice dueDate, Task assignee+status), expanded the Phase 1.1B
  CHECK-constraint worklist. See docs/architecture/database-schema.md §3.1, §7.
- Sprint 1 → Monorepo + tooling (pnpm workspaces, Turbo, TS strict, ESLint/Prettier,
  Husky + lint-staged + commitlint) — verified and committed
- Sprint 1 → Shared types + OpenAPI skeleton (packages/shared, packages/api-contract)
- Fixed docs/implementation/ files that had swapped/mismatched content (see decisions.md)
- Phase 0 audit (monorepo/tooling/infra/CI) — all green, one small nginx.conf
  comment fix
- Phase 1.1A: apps/api/prisma/schema.prisma — see docs/architecture/database-schema.md

## Next 3 tasks
1. Backend v1.0 Review Phase 5 (Testing & Documentation Review, this
   entry) is complete — awaiting review and approval before Phase 6, per
   its own brief's closing instruction. Nothing else is blocked on it.
2. Candidate follow-up work surfaced by Phases 3–4 but explicitly deferred
   (each is a new endpoint/DTO change, out of scope for a review phase —
   needs its own scoped task): (a) a `/me`/profile/permissions endpoint —
   currently no API response anywhere returns the logged-in user's id/
   name/role/permissions, a real gap for any frontend login flow; (b) a
   bulk `productVariantId[]` filter on `GET /inventory` — Catalog list
   responses carry no stock field, so a Product Listing screen showing
   live stock needs one inventory call per variant today; (c) converting
   response DTOs from constructor-parameter-properties to field
   declarations so `@nestjs/swagger` can generate real field-level schema
   detail (currently every response schema is a named-but-empty object —
   see decisions.md's 2026-07-23 entry for why this wasn't done inline).
3. `apps/web` (marketing site / portal) work has not started — the
   original Sprint 2/4 task lists still need authoring once the
   docs/product/ content-recovery blocker (below) is resolved.

## Notes for next session
- Confirm the open design decisions before writing the schema (see blockers.md).
- Sprint 2's task list still needs to be authored from docs/product/ — see blockers.md.
- docs/product/*.md has the same swapped-content bug docs/implementation/ had
  — see blockers.md (opened 2026-07-16).
- The `apps/api` backend itself needs no further "next session" setup —
  it's complete, tested (162 suites/931 tests), documented, and API-frozen
  as of Phase 3. Anyone picking this up should start by reading this
  file's "Completed work log" (newest first) and the Phase 1–5 reports
  referenced there, not by re-deriving status from the Sprint table above.
