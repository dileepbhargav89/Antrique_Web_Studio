import { Prisma } from '../../generated/prisma/client';

// The first real file in utils/ (Milestone 5 — Product Catalog
// Foundation) — a pure, framework-agnostic helper, no NestJS DI/
// decorators, per this folder's own placeholder README. Used by
// CategoryService/CollectionService/ProductService to translate a
// unique-constraint violation (P2002 — e.g. a slug/sku collision) into a
// clean domain check rather than each service re-testing
// `error instanceof Prisma.PrismaClientKnownRequestError && error.code
// === 'P2002'` inline. A pre-check-then-insert (`findBySlug()` before
// `create()`) was deliberately not used instead — that has a
// TOCTOU race under concurrent requests; catching the database's own
// constraint violation is the race-free way to enforce uniqueness.
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// Milestone 7 (Inventory & Stock Management) — the same reasoning as
// isUniqueConstraintViolation() above, for a different constraint class:
// P2004 ("A constraint failed on the database") is Prisma's code for a
// raw Postgres CHECK constraint violation — the on_hand/reserved
// non-negative and reserved<=on_hand constraints added in
// `20260721100000_add_inventory_management`. InventoryService's own
// pre-checks catch the ordinary case with a clear message before ever
// reaching the database; this is the race-free backstop for a genuine
// concurrent-write race two simultaneous stock mutations could hit.
export function isCheckConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2004';
}
