# Shared DTOs

`pagination-query.dto.ts`/`paginated-response.dto.ts` (Milestone 5 —
Product Catalog Foundation, the first real content here): `PaginationQueryDto`
(`page`/`limit`, offset-based) and `PaginatedResponseDto<T>`
(`items`/`total`/`page`/`limit`) — extracted here, not duplicated three
times in `modules/catalog/`, because Category/Collection/Product list
endpoints all needed the exact same shape simultaneously — a genuine,
3-way consumer, the same trigger `docs/architecture/domain-module-guide.md`
§14 already uses to justify shared structure ("revisit once a second real
domain module needs to share something concrete"). A future non-catalog
list endpoint extends `PaginationQueryDto` the same way, rather than
inventing its own shape.

Only DTOs genuinely shared across more than one business module belong
here — a DTO used by a single module stays in that module's own `dto/`
folder (see `modules/catalog/dto/`, `modules/auth/dto/`).
