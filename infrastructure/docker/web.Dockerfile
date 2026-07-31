# syntax=docker/dockerfile:1.7
# Build from the monorepo root:
#   docker build -f infrastructure/docker/web.Dockerfile -t antrique-web .

FROM node:22-alpine AS base
RUN npm install -g pnpm@9.15.9
WORKDIR /repo

# ---- deps: installed once, cached while lockfiles/manifests are unchanged ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/api-contract/package.json packages/api-contract/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# ---- dev: full source, all deps — used by docker-compose.override.yml ----
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["pnpm", "--filter", "@antrique/web", "dev"]

# ---- build: compile for production (standalone Next.js server output) ----
FROM deps AS build
COPY . .
RUN pnpm --filter @antrique/web build

# ---- runtime: minimal production image, no build tooling, non-root ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
# Phase 10, Module 11 (Docker/infra) — same "run as non-root" hardening
# api.Dockerfile already has (Milestone 14); this file was explicitly
# scoped out of that pass ("unchanged by Milestone 14 (backend-only
# scope)" — see infrastructure/docker/README.md) rather than accidentally
# skipped, but that scope boundary doesn't mean the gap should stay open
# indefinitely. Same fixed uid/gid convention as api.Dockerfile, for the
# same reason (explicit and reviewable, not the image's own default `node`
# user).
RUN addgroup -g 1001 -S antrique && adduser -S antrique -u 1001 -G antrique
COPY --from=build --chown=antrique:antrique /repo/apps/web/.next/standalone ./
COPY --from=build --chown=antrique:antrique /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=antrique:antrique /repo/apps/web/public ./apps/web/public
USER antrique
EXPOSE 3000
# Phase 10, Module 11 (Docker/infra) — same reasoning as api.Dockerfile's
# own HEALTHCHECK (see that file's comment): exercises a real HTTP path
# through the same route an orchestrator/load balancer would use, not a
# synthetic check. `/` (the public marketing home page — see
# apps/web/src/middleware.ts, not a portal/auth path so it's never
# redirected) rather than a dedicated health endpoint — apps/web has no
# health-check-shaped route of its own, and Next.js's standalone server
# answers any valid page request once it's actually serving traffic, which
# is exactly what this needs to confirm.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
