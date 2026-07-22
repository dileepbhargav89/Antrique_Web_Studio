# Environment Validation (Phase 1.2B.2)

Companion to `configuration.md` §3's lifecycle diagram — that doc marked
the Validation stage "not built yet"; this doc is the source of truth for
what actually validates `process.env`, why, and how to extend it. Same
relationship `database-schema.md` has to `database.md`.

**Status:** validates the 13 env vars the 8 real config domains
(`app`, `database`, `security`, `logging`, `swagger`, `health`, `cache`,
`queue` — see `configuration.md`) actually read. No feature-specific
variables (IdP, payments, storage, email, observability) — those belong to
config domains that are still placeholders
(`apps/api/src/config/*/README.md`); nothing reads them yet, so nothing
validates them yet. **Reviewed** in a follow-up pass (same phase number as
the original implementation): tightened `PORT`'s error messages, added
de-duplication to `CORS_ALLOWED_ORIGINS` — see §8. **Extended** in Phase
1.2B.3 with 7 new fields for the 6 newly-graduated domains (§2); `main.ts`
also moved off `ConfigService.getOrThrow()` onto the typed-injection
pattern (`app.get(appConfig.KEY)`) that phase adopted project-wide — see
`configuration.md` §4. For troubleshooting steps and worked examples, see
`docs/architecture/configuration-guide.md` (Phase 1.2B.4).

## 1. Library: Zod

Chosen over Joi. Neither was used anywhere in the monorepo before this
phase. Reasons:
- **TS-first inference.** `z.infer<typeof envSchema>` produces a real
  compile-time type for the whole validated env object — no hand-written
  interface to keep in sync with the schema by hand (Joi requires one).
- **No extra `@types` package** — Zod ships its own types.
- **`safeParse()`'s structured error.** `ZodError.issues` is an array of
  `{ path, message, code, ... }` — trivial to format into "which variable,
  why it failed, what to do" (§5 below) without string-parsing an error
  message.
- Not a repo-wide mandate — `packages/shared` has no validation library
  yet either. This is documented as this phase's decision for env
  validation specifically. **Resolved (Phase 1.2D.5):** DTO/HTTP request
  validation uses `class-validator`/`class-transformer`, not Zod —
  the idiomatic NestJS pairing with the built-in `ValidationPipe`
  (`apps/api/src/common/pipes/`), not the "one library end to end"
  option this note once left open. Two libraries for two genuinely
  different concerns (env parsing vs. DTO decoration), not an
  inconsistency.

## 2. Schema

`apps/api/src/config/env.validation.ts` — mirrors the actual code, not a
copy that can drift; read the file for the literal schema. Summary:

| Variable | Type | Required | Default | Notes |
|---|---|---|---|---|
| `NODE_ENV` | enum | no | `development` | `development` \| `test` \| `production` |
| `PORT` | integer | no | `4000` | 1–65535, coerced from string; each constraint (type/int/positive/max) has its own plain-English error message (§8 review) |
| `LOG_LEVEL` | enum | no | `info` | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` — a common cross-library level set; no specific logger is chosen yet (Phase 1.2B+) |
| `CORS_ALLOWED_ORIGINS` | string → string[] | no | `''` → `[]` | comma-separated in `.env`, split/trimmed/filtered/**de-duplicated** once, here |
| `DATABASE_URL` | URL string | **yes** | — | no sensible default for a real connection string |
| `DATABASE_SSL` | `'true'\|'false'` → boolean | no | `false` | see §4 for why this isn't `z.coerce.boolean()` |
| `RATE_LIMIT_WINDOW_MS` | integer | no | `60000` | positive; feeds `security` |
| `RATE_LIMIT_MAX` | integer | no | `100` | positive; feeds `security` |
| `LOG_FORMAT` | enum | no | `json` | `json` \| `pretty`; feeds `logging` (distinct from `app.logLevel`) |
| `SWAGGER_ENABLED` | `'true'\|'false'` → boolean | no | `true` | feeds `swagger`; same boolean-string treatment as `DATABASE_SSL` |
| `SWAGGER_PATH` | string | no | `/api/docs` | feeds `swagger` |
| `HEALTH_PATH` | string | no | `/health` | feeds `health` |
| `REDIS_URL` | URL string | **yes** (Phase 1.2B.3) | — | feeds both `cache` and `queue` — one validation site, two consumers |
| `JWT_ACCESS_SECRET` | string, min 32 chars | **yes** (Phase 1.2D.6) | — | no sensible default for a real cryptographic secret; feeds `jwt` (`apps/api/src/jwt/config/jwt.config.ts`, graduated outside this folder — see `configuration.md` §1) |
| `JWT_ACCESS_TOKEN_TTL` | integer (seconds) | no | `900` | feeds `jwt` |
| `JWT_REFRESH_SECRET` | string, min 32 chars | **yes** (Phase 1.2D.6) | — | distinct from `JWT_ACCESS_SECRET` so a compromised access token can't forge a refresh token; feeds `jwt` |
| `JWT_REFRESH_TOKEN_TTL` | integer (seconds) | no | `2592000` | feeds `jwt` |
| `HASH_MEMORY_COST` | integer (KiB) | no | `19456` | Argon2id memory cost, OWASP-recommended minimum; feeds `hash` (`apps/api/src/password/config/hash.config.ts`, graduated outside this folder — see `configuration.md` §1) |
| `HASH_TIME_COST` | integer (iterations) | no | `2` | Argon2id time cost; feeds `hash` |
| `HASH_PARALLELISM` | integer (threads) | no | `1` | Argon2id parallelism; feeds `hash` |
| `DEFAULT_TENANT_ID` | UUID string | **yes** (Milestone 1) | — | stopgap tenant for `AuthRepository`'s login query; no sensible default for a real tenant identifier; feeds `defaultTenant` (`apps/api/src/modules/auth/config/default-tenant.config.ts`, graduated outside this folder — see `configuration.md` §1) |

*(13 variables total as of Phase 1.2B.3; the first 6 rows are Phase*
*1.2B.2's original set.)*

## 3. Configuration lifecycle (updates `configuration.md` §3)

```
Environment (.env / process.env)
  ↓
Validation                          ← BUILT (this phase). envSchema.safeParse()
                                       via validateEnv(), passed as
                                       ConfigModule.forRoot()'s `validate`
                                       option — runs once, during
                                       NestFactory.create(), before any
                                       provider (including the HTTP
                                       listener) exists. Throws a single
                                       formatted Error on failure; nothing
                                       downstream ever sees an invalid value.
  ↓
Configuration Loaders                 registerAs() factories — all 8 real
                                       domains as of Phase 1.2B.3 — call
                                       validateEnv() and pluck already-
                                       typed fields; they don't re-parse
                                       process.env themselves.
  ↓
ConfigModule → Application Modules    unchanged from configuration.md §3.
```

**Fail-fast, concretely — and a real finding from live testing, not an
assumption.** `NestConfigModule.forRoot({ validate: validateEnv, ... })` is
evaluated as part of `ConfigModule`'s `@Module()` decorator metadata, which
runs at CommonJS `require()` time — i.e. the instant `main.ts`'s top-level
`import { AppModule } from './app.module'` pulls in `config.module.ts`,
before `bootstrap()`'s own function body executes at all. A validation
failure therefore throws synchronously during module loading, not inside
any `async` code path `main.ts` controls. Two things happen, in this
order, confirmed by capturing real output (§6):
1. Nest's own internal bootstrap error handling logs a clean, formatted
   `[ExceptionHandler]` message — exactly `validateEnv()`'s thrown text,
   no stack trace.
2. Node's default uncaught-exception handler then also prints the same
   message as a raw `Error: ...` block *with* a full stack trace (module-
   loader frames, not application code) — because the throw happened
   during `require()`, outside any try/catch `main.ts` can install.

`main.ts`'s `bootstrap().catch(...)` (added this phase) does **not** fire
for this failure path — confirmed by testing, not assumed; it exists for
errors inside `bootstrap()`'s own `async` body (e.g. `app.listen()`
failing for an unrelated reason), a genuinely different case. Either way,
the process exits with code 1, and `app.listen()` — and therefore "Nest
application successfully started" — never runs. The requirement ("fail
before the app boots, with a clear message") holds; the mechanism is
Nest's + Node's default error handling, not a bespoke handler this phase
built.

## 4. Parsing rules and the boolean gotcha

- **Booleans** (`DATABASE_SSL`): restricted to the literal strings `"true"`
  / `"false"`, transformed explicitly. **Not** `z.coerce.boolean()` — that
  runs JS `Boolean(x)`, which coerces *any non-empty string* to `true`,
  including the literal string `"false"`. Using it here would have
  silently inverted `DATABASE_SSL=false` to `true` — caught during design,
  not in production.
- **Ports**: `z.coerce.number().int().positive().max(65535)`, each
  constraint given its own custom message (§8 review — Zod's default
  message for a failed coercion, "Expected number, received nan", read as
  cryptic to someone debugging a typo'd `.env`). Rejects non-numeric
  strings, non-integers, zero/negative, and out-of-range values, each with
  a distinct plain-English reason. This closes a real gap: Phase 1.2A's
  own verification found `PORT=notanumber` crashed with a raw
  `ERR_SOCKET_BAD_PORT` Node stack trace at `app.listen()`. It now fails
  at the Validation stage instead, before that code path is ever reached
  — see §6 for the captured before/after.
- **Enums** (`NODE_ENV`, `LOG_LEVEL`): `z.enum([...])` — rejects any value
  outside the literal list, with the list itself in the error message.
- **URLs** (`DATABASE_URL`): `z.string().url(...)` — Node's `URL` parser
  accepts any `scheme://...` syntax, not just `http(s)`, so
  `postgresql://...` validates correctly.
- **Comma-separated lists** (`CORS_ALLOWED_ORIGINS`): split, trim, filter
  empty entries — defined once in the schema's `.transform()`, not
  duplicated in `app.config.ts`.

## 5. Error messages

Format (see `env.validation.ts`'s `validateEnv()`) — each line names the
exact variable and why it failed; the closing line points at
`.env.example` as the reference shape rather than repeating it. Multiple
simultaneous failures all appear as separate bullet lines in one message
(Zod's `safeParse()` collects every issue, not just the first). See §6 for
real captured examples, not a hypothetical.

## 6. Real captured validation output

From this phase's own live testing (not illustrative — actual terminal
output, one variable invalidated at a time against the real `.env`):

**`DATABASE_URL` removed:**
```
Invalid environment configuration — refusing to start.
  • DATABASE_URL: Required

Fix the variable(s) above (see apps/api/.env.example for the expected shape) and restart.
```

**`PORT=notanumber`** (the exact case that crashed with a raw
`ERR_SOCKET_BAD_PORT` stack trace before this phase — §4):
```
Invalid environment configuration — refusing to start.
  • PORT: PORT must be a valid port number (e.g. 4000)

Fix the variable(s) above (see apps/api/.env.example for the expected shape) and restart.
```

Both appear twice in the real terminal output — once as a clean Nest
`[ExceptionHandler]` log line, once as Node's default uncaught-exception
printout with a module-loader stack trace — see §3 for why.

**Automated coverage (added Pre-Phase 1.2D stabilization pass):** both
scenarios above, plus every other case in this doc (the boolean gotcha —
§4, all custom error messages — §5, the edge-case sweep — §8, and the
caching behavior — "Best practices" below), are now also exercised by
`apps/api/src/config/env.validation.spec.ts` (16 tests) — this section's
captured output remains the reference for what a real terminal session
looks like, the spec file is what CI actually runs on every change.

## 7. Adding a new validated variable

1. Add the field to `envSchema` in `env.validation.ts` (type, required/
   default, any `.transform()`).
2. If it belongs to one of the 8 real domains, add it to that
   `registerAs()` factory's return object, reading from the
   already-validated `env` object — never `process.env` directly.
3. If it belongs to a still-placeholder domain (e.g. `auth/`), that domain
   graduates from placeholder to real the same way `app`/`database`
   (Phase 1.2B.1) and `security`/`logging`/`swagger`/`health`/`cache`/
   `queue` (Phase 1.2B.3) did — create `<domain>.config.ts`, register it,
   then extend `envSchema` with that domain's variables at the same time.
4. Never validate a variable no config loader reads yet (matches this
   phase's own scope discipline — see the file-header comment in
   `env.validation.ts`).

## Best practices established this phase
- **No `process.env` outside `apps/api/src/config/`.** `env.validation.ts`
  is the only file that reads it directly; every other file (`main.ts`,
  future modules) goes through `ConfigService` or an injected typed config
  namespace.
- **One schema, one cached call.** `validateEnv()` is idempotent and
  memoized — call it as many times as convenient (every `registerAs()`
  factory does); the actual `safeParse()` only runs once per process.
- **Fail fast, fail clear.** A misconfigured environment should never
  reach `app.listen()` — see §3.

## 8. Review pass (same phase number) — findings and the edge-case sweep

Three genuine issues found and fixed; everything else held up:

- **`PORT`'s error messages were technically correct but not
  developer-friendly** — Zod's default messages ("Expected number,
  received nan") expose internal coercion mechanics rather than saying
  what to type instead. Fixed: a custom message on every constraint
  (type/int/positive/max) — see §2, §6.
- **`CORS_ALLOWED_ORIGINS` didn't de-duplicate.** `"a.com,a.com"` parsed
  to `["a.com","a.com"]` — harmless functionally (still just an
  `.includes()` check downstream) but confusing to read/debug. Fixed with
  a `Set` in the transform (§2).
- **`main.ts` silently fell back (`?? 4000` / `?? 'development'`) on
  values `env.validation.ts` already guarantees are defined.** A real
  resolution bug (e.g. a namespace-key typo) would have silently produced
  a *plausible* wrong value instead of surfacing as an error. Fixed by
  switching to `ConfigService.getOrThrow()`, which fails loudly instead —
  behaviorally identical in every case that can currently occur, strictly
  safer in the case that shouldn't. (Superseded in Phase 1.2B.3 by the
  typed-injection pattern, `app.get(appConfig.KEY)` — same fail-loud
  guarantee, now with compile-time shape checking too; see
  `configuration.md` §4.)

**Reviewed and confirmed correct, not changed:** empty-string vs.
absent-key handling (Zod's `.default()` only applies to `undefined`, so an
explicitly-set-but-empty var like `NODE_ENV=` fails loudly with an enum
error instead of silently using the default — confirmed this is the
*desired* behavior, not a gap, via the edge-case sweep below); the
double-printed error (clean message + separate raw stack trace) on a
`require()`-time validation failure — a real Node/Nest mechanism (§3), not
fixable from `main.ts` without splitting the entry point into two files to
register a process-level `uncaughtException` handler before `AppModule`
loads, which is a structural change out of this review's scope (see
`docs/implementation/decisions.md` for the full reasoning).

**Edge-case sweep** — every case run against the real compiled
`validateEnv()`, one invalid variable at a time, baseline otherwise valid:

| Case | Input | Result |
|---|---|---|
| Missing required variable | `DATABASE_URL` absent | ❌ `DATABASE_URL: Required` |
| Invalid URL | `DATABASE_URL=not-a-valid-url` | ❌ `DATABASE_URL: DATABASE_URL must be a valid connection string URL` |
| Invalid port (non-numeric) | `PORT=notanumber` | ❌ `PORT: PORT must be a valid port number (e.g. 4000)` |
| Invalid port (out of range) | `PORT=99999` | ❌ `PORT: PORT must be 65535 or less` |
| Invalid port (negative) | `PORT=-5` | ❌ `PORT: PORT must be greater than 0` |
| Invalid enum | `NODE_ENV=staging` | ❌ `NODE_ENV: Invalid enum value. Expected 'development' \| 'test' \| 'production', received 'staging'` |
| Invalid boolean | `DATABASE_SSL=yes` | ❌ `DATABASE_SSL: Invalid enum value. Expected 'true' \| 'false', received 'yes'` |
| Empty string (explicit, not absent) | `NODE_ENV=` | ❌ `NODE_ENV: ... received ''` — confirmed: does NOT silently fall back to the default |
| Whitespace-only value | `DATABASE_URL="   "` | ❌ same URL error as above |
| Duplicate CORS origins | `http://a.com,http://a.com,http://b.com` | ✅ `["http://a.com","http://b.com"]` — deduped |
| Trailing comma in CORS list | `http://a.com,http://b.com,` | ✅ `["http://a.com","http://b.com"]` — empty trailing entry dropped |
| Empty / whitespace-only CORS list | `""` / `"   "` | ✅ `[]` |

All 12 match intended behavior. Full terminal output captured in the
Phase 1.2B.2 review report (not duplicated here — see
`docs/implementation/decisions.md`'s 2026-07-18 entry for this review).

## Deferred (explicitly out of scope for this doc)
- Feature-specific validation (auth, payments, storage, email,
  observability, and the other 10 still-placeholder domains) — added when
  each domain graduates from placeholder, per §7. Redis (`cache`/`queue`)
  already graduated in Phase 1.2B.3 — no longer in this list.
- `ValidationPipe`/DTO-level request validation — real as of Phase
  1.2D.5 (`apps/api/src/common/pipes/`), using `class-validator`, not
  Zod (see §1's closing note) — an unrelated layer from this doc's own
  scope (HTTP request bodies, not process startup config), so no longer
  in this list but not covered here either.
