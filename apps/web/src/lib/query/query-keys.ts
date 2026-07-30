/**
 * Standard hierarchical query-key factory (the pattern TanStack Query's own docs
 * recommend). One call per feature/entity — no business scopes registered yet, per this
 * phase's own "no business queries" restriction; see `lib/query/README.md` for usage and
 * invalidation conventions.
 *
 * `all` invalidates everything under the scope; `lists()`/`list(filters)` and
 * `details()`/`detail(id)` invalidate more narrowly. Keep `filters`/`id` JSON-serializable
 * — TanStack Query hashes keys structurally, not by reference.
 */
export function createQueryKeys<const TScope extends string>(scope: TScope) {
  return {
    all: [scope] as const,
    lists: () => [scope, 'list'] as const,
    list: (filters?: unknown) => [scope, 'list', filters] as const,
    details: () => [scope, 'detail'] as const,
    detail: (id: string) => [scope, 'detail', id] as const,
  };
}
