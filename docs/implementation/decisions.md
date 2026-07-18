# Decisions Log

Lightweight record of choices made DURING the build (bigger architectural ones go
in docs/architecture/adr/). One entry per decision. Newest at top.

Format:
## YYYY-MM-DD — <short title>
- **Decision:** what you chose
- **Why:** the reason
- **Alternatives:** what you rejected
- **Affects:** files/areas

---

## 2026-07-18 — Phase 1.2B RC stabilization: removed tsconfig-paths, recommend one consolidated commit
- **Decision:** Removed the unused `tsconfig-paths` devDependency from
  `apps/api/package.json` (flagged as unused across 4 prior review passes,
  never wired to an actual path alias) rather than deferring it a fifth
  time. Also: reviewed `git log` and found the last real commit predates
  this entire session (DB audit, backend foundation, and all of Phase
  1.2B) — every file `git status` shows uncommitted spans multiple named
  phases, and several files (`main.ts`, `package.json`, `.env.example`)
  were touched cumulatively across phases with no intermediate commits.
  Recommending ONE consolidated commit for everything currently
  uncommitted, with a commit message that honestly describes its full
  scope, rather than a config-only message that would misdescribe what
  `git add .` actually stages.
- **Why:** `tsconfig-paths` — nothing in the repo ever referenced it
  (confirmed by grep); a final RC/stabilization pass is exactly the point
  to resolve a repeatedly-flagged loose end instead of carrying it
  forward again. Commit scope — splitting cleanly into per-phase atomic
  commits now would require interactive hunk-by-hunk staging (`git add
  -p`), which this project's own tooling guidance disallows (`-i` flag
  prohibited) and which is risky to approximate manually across
  cumulatively-edited files without a real risk of mis-splitting a hunk
  into the wrong commit. A single honest commit is safer than a
  dishonest-looking narrow one.
- **Alternatives:** leave `tsconfig-paths` flagged again (rejected — this
  is the designated stabilization checkpoint); attempt manual per-phase
  commit splitting (rejected — unsafe given the interactive-staging
  restriction and the real entanglement in shared files).
- **Affects:** apps/api/package.json, pnpm-lock.yaml,
  docs/architecture/backend.md (stale reference to the now-removed
  dependency also fixed).

## 2026-07-18 — Phase 1.2B.5 final audit: one stale reference survived three prior reviews
- **Decision:** Fixed `backend.md`'s "Config organization: two namespaces
  now, more added on demand" architecture-decision entry — accurate when
  written in Phase 1.2A, never updated as `app`/`database` grew to 8 real
  domains across Phases 1.2B.1–1.2B.3. Reworded to state its original
  Phase-1.2A scope explicitly and point at `configuration.md` §1/§5 for
  the current, authoritative count.
- **Why:** worth calling out specifically — this entry survived the
  1.2B.1, 1.2B.2, and 1.2B.3 review passes undetected, each of which
  checked `backend.md` for staleness and found other real issues each
  time (getOrThrow references, the placeholder-domain list) but missed
  this one. It was found only on this final, dedicated full-file re-read
  of every doc. Confirms the value of a last comprehensive pass rather
  than assuming three prior clean reviews mean nothing is left — nothing
  else has ever come up "clean the first time" in this subsystem's whole
  review history, so a fourth miss would have been the surprising outcome,
  not this one.
- **Affects:** docs/architecture/backend.md only. No source code, no
  runtime behavior.

## 2026-07-18 — Phase 1.2B.4 review: troubleshooting entries needed explicit resolutions
- **Decision:** Restructured all 7 `configuration-guide.md` troubleshooting
  entries into explicit *Likely cause / Debug / Fix* parts (previously
  cause-and-step were merged into prose and the fix was often left
  implied rather than stated). Also fixed a small inaccuracy in
  `app.config.ts`'s comment (referenced a "README" cross-reference for
  `logging/` that no longer exists — `logging/` graduated to a real
  `.config.ts` file in Phase 1.2B.3) and aligned one inline schema comment
  (`// logging`) to the em-dash style every other domain's grouping
  comment already used.
- **Why:** the review brief explicitly asked to verify each troubleshooting
  entry has symptoms/causes/debugging-steps/*resolution* — an implied fix
  a reader has to infer isn't the same as one stated as an action to take,
  and the point of a troubleshooting guide is to end at "do this," not
  "here's context, good luck."
- **Affects:** docs/architecture/configuration-guide.md,
  apps/api/src/config/{app/app.config.ts, env.validation.ts} (comments
  only — confirmed via clean rebuild + identical live boot).

## 2026-07-18 — Phase 1.2B.4: a new practical guide, not more architecture doc
- **Decision:** New `docs/architecture/configuration-guide.md` rather than
  expanding `configuration.md`/`validation.md` further — usage examples,
  troubleshooting, and the extension checklist are a different *kind* of
  content (task-oriented, "how do I...") from those two docs'
  architecture/rationale focus, and mixing the two would violate the
  brief's own "do not duplicate information."
- **Why:** each of the 3 existing architecture docs already had a clear,
  distinct job (backend shell, config structure, validation system) — a
  4th doc for "how a developer actually uses this" fills a real gap
  without overlapping any of them, cross-linked from all three instead of
  copied into any of them.
- **Alternatives:** append examples/troubleshooting to `configuration.md`
  (rejected — that doc is already long and architecture-focused; bolting
  on task-oriented content would blur its purpose); split troubleshooting
  into its own doc separate from the examples/extension-guide (rejected —
  overkill for content this size, and a developer debugging a startup
  failure benefits from the examples being one scroll away).
- **Affects:** docs/architecture/configuration-guide.md (new);
  configuration.md/validation.md/backend.md (one cross-link each, added).

## 2026-07-18 — Phase 1.2B.3 review: docs hadn't caught up to the typed-injection switch
- **Decision:** Found and fixed 3 stale references in `docs/architecture/
  backend.md` left over from adopting the typed-injection pattern: the
  startup-flow step still said `main.ts` reads config via
  `ConfigService.get('app.port')` (it now uses
  `app.get(appConfig.KEY)`); the §4 Configuration summary showed the same
  stale example; the folder-structure table still listed `security`/
  `cache`/`queue`/`logging`/`swagger` as placeholders and omitted `health`
  entirely, both wrong after Phase 1.2B.3 graduated 6 domains. Also
  tightened the "Deferred to Phase 1.2B" list's Swagger/health/logging/
  Redis/queue line, which read as "nothing exists" when actually their
  *configuration* is real now, just not their implementation.
- **Why:** code and docs were edited in the same phase but the docs edits
  missed these three spots — exactly the class of drift this session's
  review passes exist to catch (same pattern as the 1.2B.1 review finding
  a wrong placeholder count, and the 1.2B.2 review finding stale phase
  references). No code changes were needed — the implementation itself
  was already correct and live-verified; only the documentation had
  fallen behind it.
- **Affects:** docs/architecture/backend.md only.

## 2026-07-18 — Phase 1.2B.3: new infra env vars over relocation or empty modules; @Inject(x.KEY) as the standard access pattern
- **Decision:** Asked the user directly rather than guessing how to give
  `security`/`logging`/`swagger`/`health` real content, since none of them
  had existing env vars (unlike `cache`/`queue`, which reuse `REDIS_URL`).
  Chose: add a small number of new, minimal, safe-defaulted infra-level env
  vars per domain (`RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`, `LOG_FORMAT`,
  `SWAGGER_ENABLED`/`SWAGGER_PATH`, `HEALTH_PATH`) rather than relocating
  already-shipped fields (`CORS_ALLOWED_ORIGINS`/`LOG_LEVEL` stay under
  `app`) or leaving the domains as hardcoded-only shells. Also formally
  adopted `@Inject(xConfig.KEY)`/`ConfigType<typeof xConfig>` (or
  `app.get(xConfig.KEY)` outside DI) as the one recommended config-access
  pattern project-wide, demonstrated in `main.ts` in place of the previous
  phase's `ConfigService.getOrThrow()` calls.
- **Why:** the new env vars are platform-internal toggles (rate-limit
  thresholds, log format, doc/health paths), not third-party product/
  vendor integrations, so they don't conflict with "no speculative
  configuration for future products" — that exclusion targets things like
  AI providers and payment gateways, not the app's own operational knobs.
  Relocating `CORS_ALLOWED_ORIGINS`/`LOG_LEVEL` was considered and
  rejected: moving already-shipped, working config for naming-purity alone
  is unjustified churn when the two fields have no logical overlap with
  `security`/`logging`'s actual new content anyway. The typed-injection
  pattern was chosen over always-generic `ConfigService<T>` because it
  composes directly with this project's namespace-per-domain design
  (inject exactly the one namespace a provider needs, full compile-time
  shape checking, no magic strings) — and `database.config.ts`'s Phase
  1.2B.1 precedent (real config, zero live consumption yet) justified
  giving `swagger`/`health` genuine typed shapes now even though no
  Swagger UI or health controller exists yet.
- **Alternatives:** hardcoded-only config for all 4 ambiguous domains
  (considered, offered to the user as an option — not chosen); relocating
  CORS/LOG_LEVEL into the newly-real domains (considered, offered as an
  option — not chosen, see above); keeping `ConfigService.get()` as the
  default pattern (rejected — loses type safety for no benefit once every
  domain is namespaced).
- **Affects:** apps/api/src/config/{security,logging,swagger,health,cache,
  queue}/*, apps/api/src/config/env.validation.ts, apps/api/src/main.ts,
  apps/api/.env.example, docs/architecture/{configuration.md,
  validation.md}.

## 2026-07-18 — Phase 1.2B.2 review: PORT messages, CORS dedup, getOrThrow
- **Decision:** Follow-up review of the just-implemented env validation
  found and fixed three genuine issues: (1) `PORT`'s Zod error messages
  exposed internal coercion mechanics ("Expected number, received nan")
  rather than plain-English guidance — added a custom message per
  constraint (type/int/positive/max); (2) `CORS_ALLOWED_ORIGINS` didn't
  de-duplicate repeated origins — added a `Set` in the transform; (3)
  `main.ts` read `configService.get('app.port') ?? 4000` — a silent
  fallback that would mask a real config-resolution bug behind a
  plausible-looking default — switched to `getOrThrow()`, which fails
  loudly instead, since `env.validation.ts` already guarantees these keys
  are defined by the time `main.ts` reads them.
- **Why:** the review's explicit brief asked to check for "incorrect
  defaults... weak error handling... hidden edge cases" — all three are
  exactly that class of issue, found by reading the code adversarially
  rather than re-trusting the prior implementation pass. Verified with a
  12-case edge-case sweep run against the real compiled `validateEnv()`
  (missing/invalid URL/invalid port ×3/invalid enum/invalid boolean/empty
  string/whitespace/duplicate CORS/trailing comma/empty CORS list) — all
  12 behave as intended; full results in
  `docs/architecture/validation.md` §8.
- **Reviewed and deliberately NOT changed:** the double-printed error
  (clean Nest log + separate raw Node stack trace) on a validation
  failure. Root cause: `ConfigModule.forRoot()`'s `validate` option is
  evaluated inside `@Module()` decorator metadata, which runs at
  `require()`-time — before `main.ts`'s `bootstrap()` function body (and
  therefore its `.catch()`) ever executes. The only real fix is splitting
  `main.ts` into a thin entrypoint that registers a process-level
  `uncaughtException` handler *before* importing anything that transitively
  loads `AppModule`/`ConfigModule` — a structural change to the bootstrap
  file layout, explicitly out of scope for a "review and refine, do not
  expand scope" pass. Documented as a real, understood limitation with a
  concrete fix path, not silently left unexplained.
- **Alternatives:** disabling Nest's internal bootstrap error logging
  (rejected — loses real diagnostic value for other future crash types);
  restructuring the entrypoint now anyway (rejected — scope violation,
  no user ask for it, real risk of breaking `pnpm start`/`pnpm dev` for
  marginal cosmetic benefit).
- **Affects:** apps/api/src/config/env.validation.ts, apps/api/src/main.ts,
  docs/architecture/{validation.md, backend.md}.

## 2026-07-18 — Phase 1.2B.2: Zod for env validation; fail-fast is Nest/Node's default handling, not a custom catch
- **Decision:** Chose Zod over Joi for `env.validation.ts` (TS-first
  inference, no extra `@types` package, structured `safeParse()` errors).
  One schema, one cached `validateEnv()` call consumed by both
  `ConfigModule`'s `validate` option and the `app`/`database` `registerAs()`
  factories — no duplicated parsing rules. Added `main.ts`'s
  `bootstrap().catch()` for genuine async bootstrap errors, but documented
  (not assumed) that it does **not** fire for `ConfigModule` validation
  failures specifically — those throw synchronously at `require()`-time
  inside `@Module()` decorator evaluation, before `bootstrap()`'s function
  body runs at all. Nest's own internal error handling + Node's default
  uncaught-exception handler produce the actual fail-fast behavior for
  that path.
- **Why:** live-tested rather than assumed. Initially wrote a `main.ts`
  comment claiming the `.catch()` would produce a clean, stack-trace-free
  error — capturing real output (removing `DATABASE_URL`, then
  `PORT=notanumber`) showed a stack trace appears regardless (Node's
  default handler), and traced it to the decorator-evaluation timing.
  Corrected the comment and `validation.md` to describe what actually
  happens instead of what was assumed to happen — matches this session's
  standing practice of verifying claims against real runs, not code
  review alone.
- **Alternatives:** trying to suppress the stack trace entirely (rejected
  — would mean either disabling Nest's own internal bootstrap error
  logging, which has real diagnostic value, or restructuring
  `ConfigModule.forRoot()` away from the standard `imports: [...]` static
  pattern for no real benefit); leaving the inaccurate comment as
  "close enough" (rejected — the whole point of this phase is no runtime
  surprises, so documentation describing a mechanism that doesn't actually
  fire is exactly the kind of surprise to avoid).
- **Affects:** apps/api/src/{main.ts, config/env.validation.ts,
  config/config.module.ts, config/app/app.config.ts,
  config/database/database.config.ts}, docs/architecture/validation.md.

## 2026-07-18 — Phase 1.2B.1: config domain boundaries (auth/security, cache/queue) + CORS placement
- **Decision:** Split `auth/` (identity: JWT/session/IdP) from `security/`
  (cross-cutting policy: rate limits, hashing, CSP) as two config domains,
  and `cache/` (Redis-as-cache: TTLs/key-prefixes) from `queue/`
  (Redis-as-queue: job retry/backoff) despite both eventually pointing at
  the same Redis instance. Left `corsAllowedOrigins` under the `app`
  namespace (Phase 1.2A's placement) rather than moving it to the new
  `security/` domain.
- **Why:** config-wise, identity and policy are genuinely different
  reader profiles (a JWT guard needs `auth/`, a rate-limit guard needs
  `security/`; forcing one module to import a shared namespace half of
  whose fields it doesn't use is worse than two small namespaces).
  Same logic for cache vs. queue — one Redis connection, two unrelated
  config shapes. CORS stays put because moving it is a *semantic*
  reclassification (is CORS "app-level" or "security policy"?) with zero
  structural benefit, and this phase's brief was explicit: relocate
  structure, don't re-litigate ownership calls that already work — "improve
  only if required, do NOT introduce breaking changes."
- **Alternatives:** one `redis/` domain covering both cache and queue
  (rejected — see above); one `identity/` domain covering both auth and
  security (rejected — same reason); moving CORS to `security/` now
  (rejected — flagged in configuration.md as a deliberately-deferred item
  instead, revisit only if `security/` grows real content).
- **Affects:** apps/api/src/config/{auth,security,cache,queue}/README.md,
  docs/architecture/configuration.md §4.

## 2026-07-18 — Phase 1.2A: placeholder resolution + a real start-script bug
- **Decision:** Where the brief asked to "configure... placeholders" for
  CORS/ValidationPipe/exception filters/interceptors while separately
  forbidding implementing their logic, resolved as clearly-labeled comments
  in `main.ts` at the exact bootstrap point each attaches — not actual
  `app.use*()` calls. Also fixed `apps/api/package.json`'s `start` script
  (`node dist/main` → `node dist/src/main`), which has never actually
  worked: `tsconfig.json`'s multi-root `include` list makes `tsc` emit
  under `dist/src/`, not `dist/`.
- **Why:** the placeholder interpretation matches the convention Phase 0
  already set for `common/`/`jobs/`/`modules/*/` (folder + README + "No
  implementation"), so this phase doesn't invent a second, inconsistent
  meaning of "placeholder." The `start` script fix is a genuine,
  independently-verifiable bug (confirmed by actually running
  `node dist/main` — file not found — then `node dist/src/main` — boots
  correctly) discovered while validating this phase's own bootstrap work;
  leaving a broken `start` script in a phase whose whole point is "make the
  app boot correctly" would defeat the phase.
- **Alternatives:** actually register no-op filter/interceptor/pipe classes
  (rejected — that's implementing them, just with empty bodies, which the
  brief explicitly forbids); leave `start` broken and flag it instead of
  fixing (rejected — same "fix genuine issues discovered along the way"
  precedent as the Phase 1 database audit's seed.ts fix); change
  `tsconfig.json`'s `include`/`rootDir` instead of the `start` script
  (rejected — bigger, unnecessary structural change for a one-line fix,
  and `tsconfig.json`'s current multi-root include is deliberate — it's
  also how `prisma/seed.ts` gets typechecked).
- **Affects:** apps/api/main.ts, apps/api/package.json,
  docs/architecture/backend.md.

## 2026-07-17 — Phase 1 production-readiness audit: fixed a real upsert/partial-index bug
- **Decision:** Replaced `seed.ts`'s `tx.role.upsert()`, `tx.user.upsert()`,
  and `tx.setting.upsert()` calls with explicit find-then-create/update,
  instead of trying to make Prisma's `.upsert()` work against a partial
  unique index (e.g. via a raw-SQL escape hatch or reverting to a
  full-table unique index).
- **Why:** live-database testing (this audit's whole point) surfaced that
  Prisma's generated `ON CONFLICT (col1, col2)` SQL cannot target a partial
  unique index (`WHERE deleted_at IS NULL`) — Postgres error `42P10` on
  every affected table, 100% reproducible, not an edge case. Reverting to a
  full-table unique index would silently reintroduce the exact bug Phase
  1.1B's partial-index migration exists to prevent (blocking email/key
  reuse after a soft delete). A raw-SQL `ON CONFLICT (...) WHERE
  deleted_at IS NULL DO UPDATE ...` escape hatch was considered and
  rejected — it works but re-implements what Prisma's query builder
  already does correctly for `create`/`update`, for marginal benefit over
  a plain find-then-write.
- **Alternatives:** raw-SQL upsert per call site (rejected — needless
  complexity for 3 call sites); revert partial indexes to full-table
  unique indexes (rejected — reopens the soft-delete-blocks-reuse bug this
  migration fixed); leave `seed.ts` broken and flag it for the user to fix
  (rejected — this is squarely "fix genuine issues discovered during the
  audit," not new business logic).
- **Affects:** apps/api/prisma/seed.ts,
  docs/architecture/database-schema.md §8 (new operational note — flagged
  as required reading for Phase 1.2's repository layer, which will hit the
  same landmine on any table with a partial unique index if it uses
  `.upsert()` naively).

## 2026-07-17 — Phase 1.1B: RLS role/policy model
- **Decision:** Two runtime Postgres roles (`antrique_app`, `antrique_service`),
  no passwords committed. Three named policies per tenant table
  (`tenant_isolation`, `platform_admin_override`, `service_maintenance_override`),
  the latter two scoped `TO` their specific role so a session-variable bug in
  one code path can't borrow the other path's cross-tenant access. Append-only
  tables (payments/activity_logs/audit_logs) get UPDATE/DELETE revoked at the
  grant layer instead of relying on a trigger or RLS to prevent mutation.
- **Why:** the brief asked for "Admin policies" and "Service role policies" as
  distinct deliverables; a single BYPASSRLS admin role would have been a
  standing security risk (any compromised credential on that role = instant
  full cross-tenant breach) — session-variable-gated overrides on the existing
  roles, authorized by the app layer's RBAC check *before* the flag is ever
  set, keep RLS as the backstop CLAUDE.md calls for rather than a second,
  parallel authorization system.
- **Alternatives:** a dedicated `antrique_admin` BYPASSRLS role (rejected —
  see above); a single shared override flag for both admin and service paths
  (rejected — would lose the role-scoping defense-in-depth).
- **Affects:** apps/api/prisma/migrations/20260717091500_row_level_security/,
  docs/architecture/database-schema.md §9.

## 2026-07-17 — Phase 1.1B: seed script gap (Services / Blog Categories)
- **Decision:** Did not add `Service` or `BlogCategory` tables to satisfy the
  seed-data brief. Seeded realistic service names into the existing
  `Lead.serviceInterest` free-text array instead; skipped blog categories
  entirely (no field to put them in).
- **Why:** Phase 1.1B's rules say not to modify the approved database design
  without a genuine defect — adding tables to make a seed script's item list
  complete would be a schema change smuggled in sideways, not a seed-data
  decision.
- **Alternatives:** add the tables (rejected — out of this phase's authority);
  silently drop the requirement without flagging it (rejected — the user
  should get to decide whether first-class Service/BlogCategory tables are
  actually wanted, not have that decided for them by omission).
- **Affects:** apps/api/prisma/seed.ts, docs/architecture/database-schema.md §10.

## 2026-07-17 — Phase 1.1A review, second pass
- **Decision:** Re-ran the Phase 1.1A review programmatically instead of
  re-trusting the first pass's manual read; found and fixed 2 small
  remaining gaps — `Session.updatedAt` missing, and `Payment` missing the
  `(tenant_id, status)` index that §4 of database-schema.md already
  documented as schema-wide (doc said it existed; schema didn't have it).
- **Why:** a script that lists every field per model catches gaps a manual
  read misses, even on a schema that was already reviewed once.
- **Alternatives:** treat the first pass as final and skip re-verification
  (rejected — the doc/schema drift on Payment's index wouldn't have
  surfaced otherwise).
- **Affects:** apps/api/prisma/schema.prisma, docs/architecture/database-schema.md.

## 2026-07-16 — Phase 1.1A final database review
- **Decision:** Approved Phase 1.1A after adding explicit `onDelete`
  referential actions to all 62 relations, audit timestamps to
  `QuotationItem`/`InvoiceItem`, and 4 composite indexes (Task/Milestone/
  Invoice `dueDate`, Task `assigneeId+status`). Full report in
  docs/architecture/database-schema.md §7.
- **Why:** `database.md`'s deletion-behavior policy (cascade/restrict/set-
  null per relation) was documented in prose but never actually written
  into `schema.prisma` — the one place in this phase capable of expressing
  it. Left as-is, every FK would have fallen back to Prisma's implicit
  per-relation default instead of the intended policy.
- **Alternatives:** ship Phase 1.1A as-is and catch this in Phase 1.1B's
  migration review instead (rejected — cheaper to fix in the schema DSL now
  than to discover it as a migration diff later).
- **Affects:** apps/api/prisma/schema.prisma, docs/architecture/database-schema.md.

## 2026-07-16 — DB tooling: Prisma
- **Decision:** Prisma (7.8.0) for schema + migrations + client, over
  node-pg-migrate+Kysely or raw pg. Phase 1.1A shipped schema-only
  (`apps/api/prisma/schema.prisma`, 27 models) — see
  docs/architecture/database-schema.md for the full design rationale.
- **Why:** explicit user direction.
- **Alternatives:** node-pg-migrate+Kysely (lighter, more RLS-native, was the
  standing recommendation before this decision — see blockers.md for the
  now-superseded open question it resolves).
- **Affects:** apps/api/prisma/*, future migrations under apps/api/prisma/migrations/.
  Note: Prisma 7 moved the datasource `url` out of schema.prisma into a
  `prisma.config.ts` not yet created — first thing Phase 1.1B needs.

## 2026-07-15 — docs/implementation file contents were mislabeled
- **Decision:** re-mapped each file in docs/implementation/ to match its filename
  (progress.md, blockers.md, decisions.md, README.md, and sprint-01..06.md each
  had another file's content). Added sprint-05.md (was missing; its content was
  sitting in sprint-04.md).
- **Why:** files were untracked and had never been committed correctly; using them
  as-is would have misdirected status tracking and checkbox updates
- **Alternatives:** leave as-is (rejected — defeats the point of these files)
- **Affects:** docs/implementation/*

## 2026-07-14 — Repo layout: monorepo
- **Decision:** single monorepo (pnpm workspaces), apps/web + apps/api + packages/*
- **Why:** shared types between front and back; two-workloads-one-platform
- **Alternatives:** two separate repos (rejected — type drift, coordination cost)
- **Affects:** whole repo

## 2026-07-14 — Named tech = defaults
- **Decision:** Next.js, Node/TS, PostgreSQL, Redis, managed IdP, hosted payments
- **Why:** lean team, India-first, time-to-market; category is the real requirement
- **Alternatives:** documented in docs/architecture/architecture.md
- **Affects:** whole stack

<!-- Add new decisions above this line as you build. -->
