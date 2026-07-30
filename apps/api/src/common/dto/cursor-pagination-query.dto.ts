import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

// Phase 10, Module 1 (Performance) — additive-only opt-in cursor
// pagination for the two genuinely unbounded, high-growth, append-only
// tables in this API (AuditLog, Notification). `page`/`limit` behavior is
// completely unchanged when `cursor` is absent — every existing client
// keeps working exactly as before; this only adds a new optional
// capability for a client that wants O(1) deep pagination instead of
// `OFFSET`'s O(n) scan cost.
//
// The cursor IS the last item's `id` from the previous page, not an
// opaque/encoded token — both `AuditLog` and `Notification` use
// `@default(uuid(7))` (time-ordered UUIDs), so a plain `id < cursor`
// keyset comparison already gives the same chronological order as
// `createdAt DESC` would, using the existing primary-key index directly —
// no new index needed for cursor mode itself. Cursor mode always orders
// by `id DESC`, ignoring any `sortBy`/`sortDirection` — deep, stable
// pagination on a high-growth ledger is the one use case this exists for,
// not a general-purpose sort.
export class CursorPaginationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
