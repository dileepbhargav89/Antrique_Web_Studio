# Cross-cutting concerns — guards, decorators, interceptors, filters, pipes, middleware, dto

`filters/`, `pipes/`, `middleware/`, `guards/`/`decorators/` (since
Milestone 2), and `interceptors/` (since Milestone 12 —
`CacheControlInterceptor`) all have real content now. `dto/` (Milestone 5)
holds request/response shapes shared across more than one business
module — `PaginationQueryDto`/`PaginatedResponseDto<T>`, so far. See each
subdirectory's own README for what's real and why.
