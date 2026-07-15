# syntax=docker/dockerfile:1.7
# Build from the monorepo root:
#   docker build -f infrastructure/docker/api.Dockerfile -t antrique-api .

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

# ---- runtime: minimal production image, no build tooling ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/dist ./dist
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
EXPOSE 4000
CMD ["node", "dist/main.js"]
