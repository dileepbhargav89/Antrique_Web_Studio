// Milestone 5 — the shared response envelope every paginated list endpoint
// returns, matching PaginationQueryDto's own "shared once a second real
// consumer exists" reasoning. `total` is the full match count (not just
// `items.length`) so a client can compute total pages
// (`Math.ceil(total / limit)`) without a second request.
export class PaginatedResponseDto<T> {
  constructor(
    readonly items: readonly T[],
    readonly total: number,
    readonly page: number,
    readonly limit: number,
    // Phase 10, Module 1 (Performance) — set only by the two endpoints
    // that support opt-in cursor pagination (AuditLog, Notification).
    // `undefined` for every other endpoint, which `JSON.stringify` omits
    // entirely — existing clients' response bodies are byte-for-byte
    // unchanged. `null` means "cursor mode was used, no further pages."
    readonly nextCursor?: string | null,
  ) {}
}
