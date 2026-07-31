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

// Phase 10, Module 9 (DB Reliability) — the shape of the "real" driver-level
// error underneath a Prisma 7 (`@prisma/adapter-pg`, client-engine-runtime)
// failure. Live-verified against a real Postgres (not assumed from generic
// Prisma docs, which describe an older architecture's error codes —
// P2034/P1001/P1017 were tried first and confirmed, live, to NOT be what
// this version actually throws): forcing a real deadlock (both via a raw
// `$executeRawUnsafe` advisory-lock test and via two genuine
// `role.update()` calls inside concurrent `$transaction()`s), a real
// `statement_timeout` cancellation, a real admin-terminated connection, and
// a real total-connection-failure all surfaced as either:
//   (a) an unwrapped `DriverAdapterError` (model-delegate operations, e.g.
//       `tx.someModel.update(...)`) with a `.cause` object carrying the
//       real Postgres SQLSTATE as `.code`, or a non-SQL `.kind` (e.g.
//       `"DatabaseNotReachable"`) when nothing ever reached Postgres; or
//   (b) a `PrismaClientKnownRequestError` with the generic code `P2010`
//       ("Raw query failed" — every raw `$queryRaw`/`$executeRawUnsafe`
//       driver-level failure gets this SAME code regardless of what
//       actually went wrong) whose `.meta.driverAdapterError` nests the
//       identical `.cause` shape as (a).
// Neither path ever produced a dedicated top-level P-code for a
// deadlock/write-conflict or a connection drop in this Prisma version —
// the real signal is always this nested cause, never `error.code` alone.
interface DriverAdapterErrorCause {
  readonly code?: string;
  readonly kind?: string;
}

function extractDriverAdapterErrorCause(error: unknown): DriverAdapterErrorCause | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const e = error as Record<string, unknown>;

  if (e.name === 'DriverAdapterError' && typeof e.cause === 'object' && e.cause !== null) {
    return e.cause as DriverAdapterErrorCause;
  }

  if (e.code === 'P2010' && typeof e.meta === 'object' && e.meta !== null) {
    const driverAdapterError = (e.meta as Record<string, unknown>).driverAdapterError;
    if (
      typeof driverAdapterError === 'object' &&
      driverAdapterError !== null &&
      typeof (driverAdapterError as Record<string, unknown>).cause === 'object' &&
      (driverAdapterError as Record<string, unknown>).cause !== null
    ) {
      return (driverAdapterError as Record<string, unknown>).cause as DriverAdapterErrorCause;
    }
  }

  return undefined;
}

// A raw, unwrapped driver error shape — checked only as a defensive
// fallback below, never as the primary signal, in case an error somehow
// reaches this function without going through Prisma's own translation
// layer at all (e.g. a future Prisma version, or a non-Prisma caller).
function hasRawErrorCode(error: unknown, codes: readonly string[]): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    codes.includes((error as { code: string }).code)
  );
}

// SQLSTATE 40001 (serialization failure) / 40P01 (deadlock detected) —
// concurrent-transaction conflicts more likely now that Phase 10 Module 3's
// RLS rewrite made a transaction the default path for every model call.
// Safe to retry the whole transaction from scratch: by Postgres's own
// definition of these SQLSTATEs, nothing committed.
const RETRYABLE_CONFLICT_SQLSTATES = new Set(['40001', '40P01']);
// SQLSTATE 57P01 — server-terminated connection mid-query (e.g. an admin
// command, a restart) — a network-level blip, not a structural problem.
const RETRYABLE_CONNECTION_SQLSTATES = new Set(['57P01']);
// No SQLSTATE at all — the connection was never established (live-verified:
// a totally unreachable host produces this `cause.kind`, no `.code`).
const RETRYABLE_CAUSE_KINDS = new Set(['DatabaseNotReachable']);

// Phase 10, Module 9 (DB Reliability) — identifies a transaction failure
// that's safe to retry (see the SQLSTATE sets above for exactly which).
// Deliberately NOT retryable: constraint violations (P2002/P2004/P2003 —
// these keep their own dedicated top-level P-code, never routed through
// P2010, so `extractDriverAdapterErrorCause()` correctly returns
// `undefined` for them — retrying would just fail identically every time
// anyway), RLS/permission errors, and P2028 (transaction-API error) — the
// exact code this codebase's own PrismaService constructor comment ties to
// a documented recursion bug in the RLS `$allOperations` hook; retrying
// that blindly would mask a structural bug as a transient one.
export function isRetryableTransactionError(error: unknown): boolean {
  const cause = extractDriverAdapterErrorCause(error);
  if (cause) {
    if (
      typeof cause.code === 'string' &&
      (RETRYABLE_CONFLICT_SQLSTATES.has(cause.code) ||
        RETRYABLE_CONNECTION_SQLSTATES.has(cause.code))
    ) {
      return true;
    }
    if (typeof cause.kind === 'string' && RETRYABLE_CAUSE_KINDS.has(cause.kind)) {
      return true;
    }
    return false;
  }
  return hasRawErrorCode(error, ['40001', '40P01', '57P01', 'ECONNRESET']);
}

// Phase 10, Module 9 (DB Reliability) — identifies a query cancelled by
// Postgres's own `statement_timeout` (SQLSTATE 57014, live-verified above).
// Kept separate from isRetryableTransactionError() above because it's the
// opposite signal: retrying an already-too-slow query just repeats the same
// timeout, so a caller uses this to log/label the failure distinctly, never
// to retry it.
export function isStatementTimeoutError(error: unknown): boolean {
  const cause = extractDriverAdapterErrorCause(error);
  if (cause) {
    return cause.code === '57014';
  }
  return hasRawErrorCode(error, ['57014']);
}
