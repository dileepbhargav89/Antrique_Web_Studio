# Feature modules

Real, fully built — 8 directories, one per real backend business module:
`admin`, `bespoke`, `billing`, `catalog`, `crm`, `customers`, `inventory`,
`orders`. Each colocates that feature's API calls and hooks
(`CONTRIBUTING.md` §2 — "feature-grouped where it aids cohesion"). Shared/
generic code stays in `components/`, `hooks/`, `services/`, `utils/` instead.

## Convention (consistent across every module)

- `api/<entity>.ts` — plain functions (`listX`, `getX`, `createX`, ...)
  returning typed promises via `apiClient.get/post/put/patch/delete`
  (`@/services/api/client`). Never a duplicate fetch implementation.
- `api/query-keys.ts` — one `createQueryKeys(scope)` call per entity
  (factory in `lib/query/query-keys.ts`), giving `{all, lists(), list(filters),
  details(), detail(id)}`.
- `hooks/use-<entity>.ts` — `useQuery`/`useMutation` wrappers around the
  `api/` functions, with `queryFn: ({signal}) => listX(params, signal)`
  (AbortSignal threaded through) and, for mutations, query invalidation +
  a `sonner` toast on success (errors are handled globally — see
  `config/query.ts`'s `createMutationCache()`).

`app/(portal)/**` pages consume these hooks directly — no page ever imports
`@/services/api/client` or `content/*.ts` directly for business data.
