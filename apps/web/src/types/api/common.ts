/**
 * Every Backend v1.0 list endpoint returns this exact shape (confirmed across all seven
 * business modules — `PaginatedResponseDto<T>` in `apps/api/src/common/dto`) — offset
 * pagination only, no cursor pagination anywhere.
 */
export interface PaginatedResponse<T> {
  items: readonly T[];
  total: number;
  page: number;
  limit: number;
}

export type SortDirection = 'asc' | 'desc';
