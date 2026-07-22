# syntax=docker/dockerfile:1.7
# Build from the monorepo root:
#   docker build -f infrastructure/docker/api.Dockerfile \
#     --build-arg APP_VERSION=$(git describe --tags --always) \
#     --build-arg GIT_COMMIT_SHA=$(git rev-parse --short HEAD) \
#     -t antrique-api .
#
# Milestone 14 (Production Infrastructure) — fixed a real bug found during
# this milestone's own audit: the `runtime` stage's CMD pointed at
# `dist/main.js`, which has never existed — `tsconfig.json`'s multi-root
# `include` (`src/**/*.ts`, `tests/**/*.ts`, `prisma/**/*.ts`) makes `tsc`
# emit under `dist/src/`, not `dist/`. `apps/api/package.json`'s own
# `start` script already had this exact fix applied during Phase 1
# production-readiness auditing (see docs/implementation/decisions.md,
# "2026-07-17 — Phase 1 production-readiness audit") — this Dockerfile had
# silently drifted from that fix ever since, undetected because nothing
# had ever actually run this image's `runtime` stage end to end before
# this milestone's own live-boot validation.

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
EXPOSE 4000
CMD ["pnpm", "--filter", "@antrique/api", "dev"]

# ---- build: compile for production ----
FROM deps AS build
COPY . .
RUN pnpm --filter @antrique/api build
RUN pnpm --filter @antrique/api deploy --prod /out

# ---- runtime: minimal production image, no build tooling, non-root ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# Milestone 14 — stamped at build time (see this file's own header
# comment), read by env.validation.ts (APP_VERSION/GIT_COMMIT_SHA) and
# surfaced via the admin-only GET /runtime endpoint
# (modules/admin/runtime.controller.ts) — never introspected from
# package.json at runtime; see env.validation.ts's own comment for why.
ARG APP_VERSION=0.0.0-unknown
ARG GIT_COMMIT_SHA=unknown
ENV APP_VERSION=${APP_VERSION}
ENV GIT_COMMIT_SHA=${GIT_COMMIT_SHA}
WORKDIR /app
# Milestone 14 — "Run as non-root." A dedicated, unprivileged user/group
# (fixed uid/gid, not the image's own default `node` user, so it's
# explicit and reviewable rather than incidental) owns the app directory
# before the app's own files are copied in, so `USER antrique` below can
# actually read/execute them.
RUN addgroup -g 1001 -S antrique && adduser -S antrique -u 1001 -G antrique
COPY --from=build --chown=antrique:antrique /out/dist ./dist
COPY --from=build --chown=antrique:antrique /out/node_modules ./node_modules
COPY --from=build --chown=antrique:antrique /out/package.json ./package.json
USER antrique
EXPOSE 4000
# Milestone 14 — exercises the real liveness endpoint (health/health.controller.ts)
# through the same HTTP path a load balancer/orchestrator would use, not a
# separate synthetic check. A plain Node `http.get` one-liner, not `curl`/
# `wget` — neither is installed in this minimal Alpine runtime image, and
# adding either just for this would grow the image for no other benefit.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/src/main.js"]
