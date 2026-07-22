import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Milestone 5 (Product Catalog Foundation) — the first shared query DTO in
// this codebase, extracted here (not duplicated three times in
// modules/catalog/) because Category/Collection/Product list endpoints all
// need the exact same page/limit shape — a genuine, simultaneous 3-way
// consumer, the same trigger domain-module-guide.md §14 already uses to
// justify shared structure ("revisit once a second real domain module
// needs to share something concrete"). A future non-catalog list endpoint
// extends this the same way.
//
// Offset-based (page/limit), not cursor-based — the simpler, standard
// choice for an admin-style catalog listing (bounded result sets, no
// infinite-scroll consumer feed driving this). `@Type(() => Number)` is
// required because query params arrive as strings; the global
// ValidationPipe's `transform: true` (main.ts) is what actually applies
// class-transformer's conversion before validation runs.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
