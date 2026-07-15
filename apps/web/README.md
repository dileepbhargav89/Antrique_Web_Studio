# Frontend — Next.js (marketing SSG/ISR + authenticated portal)

Two workloads, one Next.js app: the indexable marketing site (SSG/ISR) and the
authenticated client portal (SSR). They must never cross-import — see
`CONTRIBUTING.md` §2 and `docs/architecture/architecture.md`.

## Run

```bash
cp .env.local.example .env.local   # from the repo root: apps/web/.env.local.example
pnpm --filter @antrique/web dev      # watch mode, http://localhost:3000
pnpm --filter @antrique/web build    # production build (standalone output)
pnpm --filter @antrique/web start    # run the production build
pnpm --filter @antrique/web lint
pnpm --filter @antrique/web typecheck
```

Or via Docker Compose from the repo root: `docker compose up web`.

## Structure

```
src/
  app/
    (marketing)/    SSG/ISR route group — indexed
    (portal)/       SSR route group — auth-gated, never indexed
    layout.tsx, robots.ts, sitemap.ts
  components/
  hooks/
  lib/seo/          SEO metadata contract + robots/sitemap rules
  services/         API client layer
  styles/           Design tokens (tokens.css, components.css)
```

Route groups are currently empty scaffolds — only the root layout, SEO
file-convention routes, and a placeholder home page exist so far; feature
pages have not been built.
