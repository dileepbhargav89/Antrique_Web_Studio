# Database module — PrismaModule / PrismaService (Phase 1.2B)

Placeholder — describes the purpose of this directory. No implementation.

Distinct from `apps/api/prisma/` (schema, migrations, seed data — the
database infrastructure itself, audited and approved in Phase 1). This
directory will hold the NestJS-side wiring that connects to it: a global
`PrismaModule` and injectable `PrismaService`, reading connection config
from `config/database.config.ts`.
