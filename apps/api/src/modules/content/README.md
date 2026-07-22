# Module: content

Placeholder — no implementation yet. When this module is built, follow
the flat-file convention every real business module now uses (see
`docs/architecture/domain-module-guide.md` and `modules/catalog/` as the
reference example) — controllers/services live directly at this module's
root (e.g. `content.controller.ts`, `content.service.ts`), with only
`constants/`, `dto/`, `mappers/`, and `repositories/` as subdirectories.
No `entities/`/`controllers/`/`services/` subdirectories: real domain
data comes from Prisma-generated model types, not hand-written entity
classes, and no built module has ever needed a `controllers/`/`services/`
subfolder once it had a second controller/service — they stayed flat.
