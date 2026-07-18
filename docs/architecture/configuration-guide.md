# Configuration Developer Guide (Phase 1.2B.4)

Practical companion to `configuration.md` (architecture, conventions,
namespace ownership) and `validation.md` (the Zod schema, error format,
lifecycle). This doc doesn't re-explain either — it's usage examples, a
troubleshooting guide, and the step-by-step extension process, for a
developer who needs to *do* something with the config system today rather
than understand its design.

## 1. Orientation (30 seconds)

- Real, working config domains today: `app`, `database`, `security`,
  `logging`, `swagger`, `health`, `cache`, `queue` (`configuration.md` §1).
- Everything reads through one Zod schema, `apps/api/src/config/
  env.validation.ts` (`validation.md` §2) — no domain parses `process.env`
  itself.
- Access it via `@Inject(xConfig.KEY)` + `ConfigType<typeof xConfig>` in a
  provider, or `app.get(xConfig.KEY)` in `main.ts` (`configuration.md` §4).
  `ConfigService.get('x.key')` still works but isn't the default.

## 2. Usage examples

### 2.1 Creating a new configuration module
Matches exactly what `security`/`cache`/etc. already do — see
`configuration.md` §2 "Adding a new configuration domain" for the full
5-step version. Minimal shape:
```ts
// apps/api/src/config/<domain>/<domain>.config.ts
import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

export default registerAs('<domain>', () => {
  const env = validateEnv();
  return {
    someField: env.SOME_ENV_VAR,
  };
});
```
```ts
// apps/api/src/config/<domain>/index.ts
export { default } from './<domain>.config';
```

### 2.2 Adding a validated environment variable
In `env.validation.ts`'s `envSchema`, following the existing style exactly
(custom messages, the boolean-string helper for booleans, `.default()`
for optional fields, no default for anything that must be explicitly set):
```ts
const envSchema = z.object({
  // ...existing fields...
  SOME_ENV_VAR: z
    .string()
    .min(1)
    .default('a-sensible-default'),
});
```
See §5 below for the full checklist (schema → `.env.example` → config
module → docs → validate → commit) — adding a field is never just the
schema edit alone.

### 2.3 Consuming configuration inside a service
No services exist yet (Phase 1.2B.4 is config-only), but this is the
pattern every future one uses — copy this shape exactly:
```ts
import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { securityConfig } from '../../config';

@Injectable()
export class RateLimitGuard {
  constructor(
    @Inject(securityConfig.KEY)
    private readonly security: ConfigType<typeof securityConfig>,
  ) {}

  getWindowMs(): number {
    return this.security.rateLimitWindowMs; // typed — no magic string, no cast
  }
}
```

### 2.4 Consuming configuration inside bootstrap (`main.ts`)
This is real, current code — not illustrative:
```ts
const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
const { port, nodeEnv } = appCfg;
```
Outside a class, there's no constructor to `@Inject()` into —
`INestApplication.get()` resolves the same provider token directly.

### 2.5 Recommended injection pattern, summarized
| Where | Pattern |
|---|---|
| Any NestJS provider (service, guard, interceptor, etc.) | `@Inject(xConfig.KEY) private readonly x: ConfigType<typeof xConfig>` |
| `main.ts` / anywhere outside DI | `app.get<ConfigType<typeof xConfig>>(xConfig.KEY)` |
| A provider that needs a runtime-computed key across namespaces (rare) | `ConfigService.get('namespace.key')` — documented secondary option, not the default |

## 3. Conventions, and why (see `configuration.md` §2 for the authoritative list)

| Convention | Why |
|---|---|
| `<domain>.config.ts` + `index.ts` per folder | One glance tells you the real file vs. its barrel; every domain looks identical, so "where do I add X" never needs a second thought |
| Namespace name === folder name, lowercase | `registerAs('security', ...)` living in `config/security/` — no translation table to keep in your head |
| `export default registerAs(...)` | Matches `@nestjs/config`'s own convention exactly — no house-specific variant to learn |
| Central barrel (`config/index.ts`) is the only import path *for consumers outside `config/`* | One place to see every real domain at a glance; a domain's internal file layout can change without touching consumers. Files *inside* `config/` (e.g. a `<domain>.config.ts` importing `validateEnv` from `../env.validation`, §2.1) import each other directly — the barrel rule is about the config system's external boundary, not its own internals |
| `validateEnv()` inside every `registerAs()` factory, never raw `process.env` | The one thing this whole system exists to guarantee — an env var is validated *once*, and every consumer sees the same typed, coerced value |
| `@Inject(x.KEY)`/`ConfigType<typeof x>` over `ConfigService.get()` strings | Compile-time shape checking; rename a field and every consumer breaks at `tsc`, not in production |

## 4. Troubleshooting guide

**"My env var isn't being picked up."**
- *Likely causes:* not in the schema; only in `.env.example`, not `.env`;
  read validation, but the domain's factory doesn't return it.
- *Debug:* (1) Is it in `envSchema` (`env.validation.ts`)? (2) Is it in
  `.env` (not just `.env.example`)? `.env` is gitignored; a fresh clone
  needs `cp apps/api/.env.example apps/api/.env`. (3) Does the *domain*
  you expect actually read it? Check that domain's `<domain>.config.ts`
  return object — a field only existing in `envSchema` doesn't
  automatically appear in every namespace.
- *Fix:* whichever of the three is missing — add it there. If none are
  missing and it still doesn't show up, you're adding a new field, not
  debugging an existing one; go to §5.

**"The app won't start / crashes immediately with a wall of text."**
- *Likely cause:* env validation failing — this is the expected shape of
  that failure, not a crash to panic over.
- *Debug:* read the **first** block (`[ExceptionHandler]`, no stack
  trace) — it names the exact variable and why (`validation.md` §6 has
  real captured examples). The second block (raw `Error:` + stack trace)
  is Node's default handler re-printing the same thing; ignore the stack
  frames, they're module-loader internals, not your code (`validation.md`
  §3 explains why both print).
- *Fix:* correct the named variable in `.env` per the message and
  restart. Nothing else in the stack trace needs investigating.

**"Validation failure but I can't tell which variable."**
- *Likely cause:* skimmed past the bullet lines looking for a single
  error, not a list.
- *Debug:* every line in the error is `  • VARIABLE_NAME: reason` — there's
  always at least one such line per failing field, even with multiple
  simultaneous failures (`validation.md` §5).
- *Fix:* fix every bulleted variable, not just the first — `safeParse()`
  reports all of them in one pass, so there's no need to fix-and-rerun
  one at a time.

**"I get a value but it's the wrong type / shape."**
- *Likely cause:* reading `process.env.X` directly somewhere instead of
  the validated value, or expecting the raw string instead of the parsed
  type.
- *Debug:* check `envSchema`'s `.transform()` for that field — several
  fields transform the raw string (`CORS_ALLOWED_ORIGINS` → deduped array,
  `DATABASE_SSL`/`SWAGGER_ENABLED` → real boolean, not the string `"true"`).
- *Fix:* read the value from the domain's `registerAs()` output (via
  `@Inject`/`app.get`, §2.3–2.4), never `process.env` directly outside
  `env.validation.ts` — the transformed value only exists after
  `validateEnv()` runs.

**"`@Inject(xConfig.KEY)` throws / provider not found."**
- *Likely cause:* the domain's `registerAs()` factory was written but
  never registered.
- *Debug:* check `config.module.ts`'s `load: [...]` array — a domain that
  compiles fine but was never added there has no provider token to inject.
- *Fix:* add it to `load: [...]` (and re-export it from `config/index.ts`
  if it's missing there too).

**"I added a field but TypeScript doesn't see it."**
- *Likely cause:* the field was added somewhere other than `envSchema`.
- *Debug:* `EnvVars` (`env.validation.ts`) is inferred from `envSchema` via
  `z.infer<>` — if the field isn't in the schema, it isn't in the type,
  full stop.
- *Fix:* add it to `envSchema`. There's no separate interface to update
  by hand; that's the point of inferring the type instead of writing one.

**"Namespace resolves to `undefined` / empty object."**
- *Likely cause:* a typo in the `registerAs()` namespace string.
- *Debug:* confirm the namespace name passed to `registerAs()` matches
  what you're injecting via `.KEY` — `registerAs('security', ...)`'s key
  is derived from that exact string. A typo (e.g. `'Security'` vs
  `'security'`) creates a second, silently-empty namespace rather than an
  error, since `@nestjs/config` has no way to know you meant an existing
  one.
- *Fix:* correct the string in `registerAs()` so it matches the folder/
  barrel-export name exactly (`configuration.md` §2's naming convention).

## 5. Extension guide — adding a new validated configuration field

The exact, required order — skipping a step is how schema/`.env.example`/
docs drift apart (see `docs/implementation/decisions.md`'s 2026-07-18
entries for two real cases this project already hit and fixed):

1. **Add the environment variable** — decide the name (`SCREAMING_SNAKE_CASE`,
   matching every existing var), a safe default if optional, and whether
   it's genuinely required (no default — reserve this for values with no
   sensible fallback, like connection strings).
2. **Update the Zod schema** (`env.validation.ts`) — add the field to
   `envSchema` with the same custom-message discipline as `PORT`/
   `RATE_LIMIT_*` (name the exact problem, not Zod's generic wording).
3. **Update `.env.example`** — add it under the right section comment,
   mark it `(validated)`, never a real secret.
4. **Update the configuration module** — add it to the owning domain's
   `<domain>.config.ts` return object (or graduate a placeholder domain
   first, per `configuration.md` §2, if it doesn't have a real module yet).
5. **Update documentation** — `validation.md` §2's schema table (new row)
   and, if the domain's shape or ownership rationale changed,
   `configuration.md`'s folder-structure/architecture-decisions sections.
6. **Run validation** — `pnpm --filter @antrique/api lint && pnpm --filter
   @antrique/api typecheck && pnpm --filter @antrique/api build`, then a
   live boot to confirm the new field resolves (see §2.3's pattern, or
   invoke the domain's `registerAs()` factory directly — both this
   project's own review passes used exactly that technique).
7. **Commit** — one commit for the field, its schema entry, its
   `.env.example` entry, its config-module change, and its docs update
   together; not split across commits that could land independently and
   leave the schema and `.env.example` out of sync in between.

## 6. Architecture consistency — reconfirmed, not redesigned

Verified against the current implementation (no changes made — this
phase is documentation only):
- One validation layer (`envSchema.safeParse()`, `env.validation.ts`), one
  parsing layer (the same file's `.transform()`s) — no domain re-parses.
- All 8 real domains use identical `registerAs()` + `validateEnv()` shape.
- Every domain's namespace name matches its folder name exactly.
- Every real domain is re-exported from the central barrel
  (`config/index.ts`) under a consistent `<domain>Config` name.
- `@Inject(x.KEY)`/`ConfigType<typeof x>` is the only pattern used where
  config is actually consumed today (`main.ts`).

## Deferred (explicitly out of scope for this doc)
- Any new configuration domain, environment variable, or runtime behavior
  change — this phase is documentation-only, per its own brief.
- Phase 1.2B.5's full configuration audit.
