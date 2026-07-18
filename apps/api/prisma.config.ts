// Prisma 7 config. Prisma 7 removed the `url` field from schema.prisma's
// `datasource` block — connection strings now live here, read at CLI/Client
// runtime instead of being declared in the schema file (see schema.prisma's
// top-of-file comment and docs/architecture/database-schema.md "A Prisma 7
// architectural note worth flagging").
//
// Prisma's own config loader deliberately does NOT read .env files (it
// disables dotenv when loading prisma.config.ts, to avoid a second,
// competing env-loading mechanism) — so this file loads .env itself, the
// same way `apps/api/src/main.ts` will once NestJS wiring lands (Phase 1.2+).
import path from 'node:path';
import { defineConfig } from 'prisma/config';

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // No .env file — fine in CI/production, where DATABASE_URL etc. are
  // injected directly into the process environment instead.
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    // Runs on `prisma db seed` / automatically after `migrate dev` and `migrate reset`.
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // Deliberately NOT using the `env()` helper from `prisma/config` — it
    // throws synchronously if the var is unset, at config-load time, for
    // *every* command including `generate`/`validate`/`format`, none of
    // which touch a real database. A placeholder keeps those commands (and
    // `postinstall`) working on a fresh clone before `.env` exists; commands
    // that do need a real connection (`migrate dev`, `db push`, `studio`)
    // then fail with an honest "connection refused" instead of a config error.
    url:
      process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
    // Optional — only consulted by `migrate dev`'s shadow-DB diffing, not by
    // `migrate deploy`. Omit the env var entirely to let Prisma manage a
    // throwaway shadow DB automatically (requires CREATEDB on DATABASE_URL's role).
    shadowDatabaseUrl: process.env.DATABASE_SHADOW_URL,
  },
});
