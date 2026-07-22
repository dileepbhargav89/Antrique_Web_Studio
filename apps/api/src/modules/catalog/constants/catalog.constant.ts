// Route segments, matching modules/auth/constants/auth.constant.ts's
// existing "one string, one place" convention.
export const CATEGORY_ROUTE = 'categories';
export const COLLECTION_ROUTE = 'collections';
export const PRODUCT_ROUTE = 'products';

// Shared slug validation — lowercase letters/digits, single hyphens
// between words, no leading/trailing/doubled hyphens
// ("solitaire-ring", not "-solitaire--ring-"). One place so
// Category/Collection/Product DTOs can't drift into three slightly
// different patterns.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_PATTERN_MESSAGE =
  'slug must be lowercase letters, numbers, and single hyphens between words (e.g. "solitaire-ring")';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, since a Prisma `orderBy` field name
// must never come directly from an unvalidated request (this list is
// what `@IsIn()` checks against in each *ListQueryDto).
export const CATEGORY_SORT_FIELDS = ['name', 'createdAt', 'sortOrder'] as const;
export const COLLECTION_SORT_FIELDS = ['name', 'createdAt', 'sortOrder'] as const;
export const PRODUCT_SORT_FIELDS = ['name', 'createdAt', 'sortOrder'] as const;

// Milestone 12 (Performance Engineering) — this module's own
// `@CacheControl(...)` value (common/decorators/cache-control.decorator.ts),
// applied to every Category/Collection/Product GET route. 30 seconds: a
// deliberately short window — long enough to absorb the repeat-request
// bursts a single admin session or a storefront page's own multiple
// catalog calls would otherwise re-issue, short enough that an editor's
// change to a category/product is never stale in a shared client's cache
// for more than half a minute. One shared constant, not three separate
// per-controller literals, so a future decision to change the window
// touches one line, not three.
export const CATALOG_READ_CACHE_MAX_AGE_SECONDS = 30;
