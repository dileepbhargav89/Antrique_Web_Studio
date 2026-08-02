# Resume Development — Setup Guide

For picking this project back up after the 2026-08-03 freeze. Read
`PROJECT_STATUS.md` first for what state things are in; this doc is purely
mechanical "how do I get it running again."

## 1. Required software

- **Node.js 22** (see `.nvmrc`)
- **pnpm 9** — `npm install -g pnpm@9.15.9`, or `corepack enable`
- **git**
- **Docker + Docker Compose** — only needed if you choose the local-
  container path (§3, Option A) instead of pointing at hosted services
  (Option B). On a memory-constrained machine, prefer Option B.

## 2. Required accounts

| Account | Needed for | Notes |
|---|---|---|
| **Supabase** | Postgres database + object storage | Free tier used in production; create a project, grab the pooler connection string and storage credentials |
| **Resend** | Transactional email | Free tier works for low volume; without it, email sends silently no-op |
| **Anthropic** | AI Workspace backend features | Needs a **real credit balance** — the dev key had none at freeze time and every AI call 502s without one |
| Render | Real API hosting (optional — only if resuming the actual production deploy) | Free tier used previously |
| Vercel | Real web hosting (optional, same as above) | |
| Upstash | Managed Redis for real production (optional) | Local dev can use a plain local/Docker Redis instead |
| OpenAI / Google AI / OpenRouter | Alternate AI providers (optional) | Never tested in this repo — treat as unverified if you wire one up |
| Sentry | Error tracking (optional) | `SENTRY_DSN` blank = no-op, safe to skip |

## 3. Environment variables

Copy the templates first:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Full grouped variable reference: `PROJECT_STATUS.md` §7. The two you
cannot skip for a working local `apps/api`:

- `DATABASE_URL` — Postgres connection string.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any string ≥32 chars for
  local dev.

**Option A — local Docker Postgres/Redis** (heavier, needs more RAM):
leave `DATABASE_URL`/`REDIS_URL` at their `.env.example` defaults, they
already point at the `docker-compose.yml` services.

**Option B — hosted free-tier services** (lighter, recommended on a
memory-constrained machine): create a Supabase project (Postgres) and a
Redis instance of your choice (Upstash free tier or similar), then set
`DATABASE_URL`/`REDIS_URL` in `apps/api/.env` to those connection strings.
Skip `docker compose up` entirely and run the apps directly on the host
(§4). Use a project separate from whatever is still serving real
production traffic if that deployment is still live.

## 4. Build / development commands

```bash
pnpm install                 # installs everything, all workspaces

# whole-monorepo commands (fan out via Turbo — heavier)
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# scoped to one app (lighter — prefer this on constrained hardware)
pnpm --filter @antrique/api dev        # http://localhost:4000
pnpm --filter @antrique/api build
pnpm --filter @antrique/api test
pnpm --filter @antrique/web dev        # http://localhost:3000
pnpm --filter @antrique/web build

pnpm generate:api-types      # regenerate apps/web's typed API client from
                              # apps/api's live OpenAPI spec — run this any
                              # time apps/api's routes/DTOs change
```

Or via Docker Compose (Option A above):

```bash
docker compose up            # dev-shaped: hot-reload, host-exposed postgres/redis
docker compose up api        # just the API
docker compose up web        # just the web app
```

## 5. Deployment commands

**Self-host / single VM** (what's documented in-repo,
`docs/architecture/deployment.md`):

```bash
docker compose -f docker-compose.prod.yml up -d
```

Resource-limited, log-rotated, healthchecked, non-root containers. No
automated Postgres backup exists for this path yet — see
`docs/architecture/release.md`.

**Real production** (Render + Vercel + Supabase, see
`docs/architecture/deployment.md` §8 and `PROJECT_STATUS.md` §6):

- API and web both auto-deploy on push to `main` (Render/Vercel webhooks) —
  no manual deploy command needed for code changes.
- **Migrations do NOT run automatically** — Render's free tier has no
  pre-deploy hook. After any new Prisma migration, run manually:
  ```bash
  DATABASE_URL="<supabase-pooler-url>" pnpm --filter @antrique/api exec prisma migrate deploy
  ```
- Never run `apps/api/prisma/seed.ts` against production — it's
  explicitly dev-only (fake credentials, demo data).

## 6. Sanity-check the setup

Once running:
- `GET http://localhost:4000/health/ready` — should return healthy once
  Postgres is reachable.
- `GET http://localhost:4000/api/docs` — Swagger UI, confirms the API
  booted with real routes.
- `http://localhost:3000` — marketing homepage.
- Log in to the portal and open `/crm` — the most reliably working module,
  good first smoke test.
