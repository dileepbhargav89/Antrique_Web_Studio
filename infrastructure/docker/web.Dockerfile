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

# ---- runtime: minimal production image, no build tooling ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
