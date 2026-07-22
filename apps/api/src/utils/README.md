# Framework-agnostic utility functions

Pure helper functions with no NestJS DI/decorators (contrast `common/`,
which is Nest-specific cross-cutting concerns — guards, interceptors,
filters, pipes, middleware).

`prisma-error.util.ts` — `isUniqueConstraintViolation(error)` (Milestone
5 — Product Catalog Foundation, the first real file here): a plain type
guard for Prisma's `P2002` unique-constraint error code, used by
`CategoryService`/`CollectionService`/`ProductService`
(`apps/api/src/modules/catalog/`) to translate a slug/sku collision into
a clean `409 ConflictException` instead of letting the raw database
error propagate.
