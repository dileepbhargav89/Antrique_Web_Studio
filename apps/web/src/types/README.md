# Shared TypeScript types

Real, populated.

- `api/schema.ts` — generated via `pnpm generate:api-types` from
  `apps/api/openapi.json` (see `services/README.md` for regeneration
  steps). **Request-body types only** — every response DTO in the real
  backend serializes with empty JSON-schema detail (undecorated
  constructor-parameter-properties the Swagger CLI plugin can't
  introspect, a documented backend limitation), so every generated
  response type here is `Record<string, never>` and isn't usable as-is.
- `api/{admin,bespoke,billing,catalog,common,crm,customers,inventory,
  orders}.ts` — hand-authored response/request types layered on top,
  reverse-engineered directly from the real `apps/api/src/modules/*/dto`
  source (never guessed) — this is what `features/*/api/*.ts` actually
  imports for response typing.
- `common.ts` — `PaginatedResponse<T> = {items, total, page, limit}`
  (confirmed uniform across every paginated list endpoint) and
  `SortDirection`.
- `errors.ts` — `NormalizedError` union consumed by
  `lib/errors/normalize-error.ts`/`error-copy.ts`.
- `navigation.ts` — `NavItem` shape for `config/navigation.ts`.

Never duplicate a backend DTO already covered by a hand-authored type
here — read the real DTO source before adding a new one.
