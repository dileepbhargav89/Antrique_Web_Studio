# Database — superseded scaffolding

This directory (`migrations/`, `policies/`, `seeds/`) was Sprint 1
placeholder scaffolding, written before Prisma was chosen as the migration
tool (see docs/implementation/decisions.md, 2026-07-16). Prisma requires
its migrations to live under `<schema-directory>/migrations` to function at
all, so the real, implemented database infrastructure lives at:

- Schema: `apps/api/prisma/schema.prisma`
- Migrations (including raw-SQL partial unique indexes, CHECK constraints,
  and RLS policies): `apps/api/prisma/migrations/`
- Seed data: `apps/api/prisma/seed.ts`
- Full design docs: `docs/architecture/database-schema.md` (Phase 1.1A —
  schema design; Phase 1.1B — migrations, RLS, seed strategy, setup)

This directory is intentionally left empty going forward — nothing here is
applied by any tooling.
