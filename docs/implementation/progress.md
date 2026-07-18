# Progress Dashboard

The single place to see where the build is. Update at the end of every session.
Tell Claude Code: "update docs/implementation/progress.md".

## Current sprint: **Sprint 1 — Foundation**
## Current milestone: none yet → next is ◆ M1 (end of Sprint 3)

## Sprint status
| Sprint | Theme | Status |
|--------|-------|--------|
| 1 | Foundation | 🟨 In progress |
| 2 | Marketing site | ⬜ Not started (task list needs authoring — see blockers.md) |
| 3 | Conversion + CRM ◆ M1 | ⬜ Not started |
| 4 | Portal core | ⬜ Not started |
| 5 | Billing + collab ◆ M2 | ⬜ Not started |
| 6 | Admin + hardening ◆ M3 | ⬜ Not started |

Legend: ⬜ not started · 🟨 in progress · ✅ done

## In progress right now
- Nothing blocked. **Phase 1.2B is fully complete** — configuration
  architecture (1.2B.1), environment validation (1.2B.2), typed
  configuration modules (1.2B.3), configuration developer experience
  (1.2B.4), and the final configuration audit (1.2B.5) all done and
  certified production-ready. Frozen except for future feature-specific
  extensions (new domains graduating alongside their owning module).
  Stopped for approval before Phase 1.2C (Logging & Error Handling).

## Last completed
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
1. Phase 1.2C (Logging & Error Handling) — needs your go-ahead first
   (Phase 1.2B.5 stopped here on purpose, Phase 1.2B now frozen).
   DatabaseModule/PrismaService wiring and real CORS/ValidationPipe/
   exception-filter/interceptor logic still follow after that.
2. Sprint 1 → RBAC model (default roles/permissions are already seeded by
   Phase 1.1B's seed.ts — confirm that satisfies this task or if it needs
   its own pass)
3. Rotate the local Postgres `postgres` role's password — it was shared in
   a prior session's chat to complete live-DB validation, so treat it as no
   longer secret (it was only ever stored in the gitignored
   `apps/api/.env`, never committed).

## Notes for next session
- Confirm the open design decisions before writing the schema (see blockers.md).
- Sprint 2's task list still needs to be authored from docs/product/ — see blockers.md.
- docs/product/*.md has the same swapped-content bug docs/implementation/ had
  — see blockers.md (opened 2026-07-16).
