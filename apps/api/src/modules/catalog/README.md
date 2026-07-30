# CatalogModule (Milestone 5 — Product Catalog Foundation)

The Product Catalog — `Category`/`Collection`/`Product`/`ProductVariant`/
`ProductImage` — the first real business module with more than one
controller/service/repository triad. Full CRUD REST APIs for
Categories/Collections/Products, tenant-isolated, RBAC-protected, paginated,
filterable, soft-delete-aware. Base for the future Bespoke Customizer and
ordering system (both explicitly out of scope here — see "Do NOT
Implement" below).

**No product-catalog design guidance exists in `docs/product/`** as of
this milestone — checked before writing any code; those docs model
Antrique purely as a web agency selling services to its own clients, with
no e-commerce/catalog concept anywhere. This module's field names/example
data are therefore a deliberately generic catalog design, not modeled on
a specific product line — flagged here explicitly, not silently assumed
(mirrors `prisma/seed.ts`'s own "Scope gap, flagged rather than silently
resolved" precedent from Phase 1.1B). See
`docs/implementation/decisions.md`.

## What's real here

- `catalog.module.ts` — `CatalogModule`, imported into `AppModule`. Not
  `@Global()`, like every real domain module. Three
  controller/service/repository triads registered as this one module's
  providers/controllers — `ProductService`'s extra dependency on
  `CategoryRepository`/`CollectionRepository` (see below) needs no special
  wiring since all three repositories are providers of this same module.

### Category / Collection

Structurally identical (`category.*`/`collection.*` files mirror each
other exactly):

- `*.controller.ts` — `POST /categories`, `GET /categories`,
  `GET /categories/:id`, `PATCH /categories/:id`,
  `DELETE /categories/:id` (and the same five routes for `/collections`).
  Every route: `@UseGuards(JwtAuthGuard, PermissionsGuard)` +
  `@Permissions('categories:read' | 'categories:write' |
  'categories:delete')` (this milestone's own explicit RBAC tiers —
  Customer+ read, Manager+ write, Admin+ delete — see "RBAC" below).
  `@Tenant()` supplies `tenantId` to every service call. `:id` params use
  `ParseUUIDPipe` — a malformed id now cleanly `400`s instead of
  reaching Postgres and raising a raw "invalid input syntax for type
  uuid" error.
- `*.service.ts` — validation, business rules, mapping. Unique-slug
  violations (Postgres `P2002`, caught via
  `apps/api/src/utils/prisma-error.util.ts`'s `isUniqueConstraintViolation()`)
  become a clean `409 ConflictException`, not a raw DB error — a
  pre-check-then-insert was deliberately not used instead (a
  check-then-act race under concurrent requests; catching the database's
  own constraint is race-free). `update()`/`remove()` both call
  `findActiveById(id, tenantId)` FIRST — this is what makes the
  subsequent plain `where: { id }` mutation safe: a client-supplied `id`
  that doesn't exist, or belongs to a different tenant, is rejected
  before ever reaching a write. `remove()` is a soft delete
  (`deletedAt`), never a real `DELETE`. No manual `version: { increment:
  1 }` on update — the RLS migration's own Postgres trigger
  (`20260717091500_row_level_security`) increments it unconditionally.
  `createdBy`/`updatedBy`/`deletedBy` are deliberately left unset — see
  "Known gap: no audit-column population" below.
- `repositories/*.repository.ts` — data-access only. `findActiveById(id,
  tenantId)` and `findManyPaginated(tenantId, where, orderBy, skip,
  take)` — the latter merges `tenantId`/`deletedAt: null` into the query
  itself (never trusts a caller-assembled `where`), and runs
  `findMany`+`count` inside one `prisma.$transaction([...])` (array
  form) so a paginated page's `total` can't disagree with its `items`
  under concurrent writes — this milestone's own "Transactions where
  appropriate" requirement, applied where it's genuinely needed.

### Product (the richer of the three)

- `product.controller.ts` — same five routes/guard shape as
  Category/Collection, permission keys `products:read`/`write`/`delete`.
- `product.service.ts` — additionally injects `CategoryRepository`/
  `CollectionRepository` (not just its own `ProductRepository`) purely to
  validate that a client-supplied `categoryId`/`collectionId` genuinely
  belongs to the caller's own tenant before letting a Product reference
  it (`assertReferencesBelongToTenant()`). Without this check, Postgres's
  FK constraint alone would happily accept ANY real category id —
  including one belonging to a *different* tenant — since a foreign key
  only requires the referenced row to exist, not that it belongs to the
  same tenant. This is "never trust client-supplied tenant identifiers"
  (this milestone's own requirement) extended to any client-supplied
  *foreign* id, not only an explicit tenant id.
- `repositories/product.repository.ts` — `findActiveById()` includes
  ordered `variants`/`images` (the detail view); `findManyPaginated()`
  deliberately does not (a lighter list/summary view). `createWithRelations()`/
  `updateWithRelations()` exist as separate, explicitly-typed methods —
  **not** routed through `BaseRepository`'s inherited generic
  `create()`/`update()`, whose `ReturnType<TDelegate['create']>`-based
  typing collapses Prisma's `include`-conditional return type to its
  relation-less default (a real TypeScript limitation, confirmed via
  `pnpm typecheck`, not a style preference — see the file's own comment).
  Nested `variants`/`images` are written via Prisma's own nested `create`
  syntax, which Prisma wraps in an implicit transaction — this
  milestone's "transactions where appropriate" for product creation,
  without a bespoke `$transaction` call.
- No `ProductVariantRepository`/controller exists — this milestone's
  brief lists only `CategoryRepository`/`CollectionRepository`/
  `ProductRepository`, and variants get no independent CRUD; they're
  created only as part of `POST /products`, never edited/removed
  individually. Schema'd like `QuotationItem`/`InvoiceItem`
  (`createdAt`/`updatedAt` only, Cascade-deleted with their parent, no
  soft-delete/version) — see `schema.prisma`'s own comment.
- `ProductImage` DID get independent surface, added later — Phase 7's
  `product-image.controller.ts`/`product-image.service.ts`/
  `repositories/product-image.repository.ts`: `POST /products/:id/images`,
  a real multipart upload to S3-compatible storage (`storage/`), reusing
  the existing `products:write` permission. This is genuinely additive —
  the original `POST /products` nested-create path (`url` as a plain
  string) is unchanged; the new route is a second, parallel way to attach
  an image. Still no edit/remove-image route.

## Database

`Category`/`Collection`/`Product`/`ProductVariant`/`ProductImage` (3 new
enums: `CategoryStatus`/`CollectionStatus`/`ProductStatus`) — genuinely
new schema this milestone, unlike Milestones 3/4, which found their
target entities already fully modeled. Migration:
`20260720190000_add_product_catalog` — hand-written from `prisma migrate
diff`'s raw output (not applied verbatim): the auto-diff again proposed
re-adding a plain unique index on `users(tenant_id, email)` (the
`partial_unique_indexes` landmine, dropped entirely — that table isn't
touched by this migration); `Category`/`Collection`/`Product`'s own new
`(tenantId, slug)` unique indexes are hand-written as **partial** (`WHERE
deleted_at IS NULL`), the same treatment `User`/`Role`/`Quotation`/
`Invoice`/`Blog`/`Setting` already have; `ProductVariant`'s
`(tenantId, sku)` unique index is correctly **plain** — that table has no
soft-delete column, so no partial-index landmine applies to it. RLS
enabled + all 3 standard policies (`tenant_isolation`/
`platform_admin_override`/`service_maintenance_override`) added for all 5
new tables, mirroring `20260717091500_row_level_security`'s exact
per-table pattern — every new tenant-scoped table gets RLS, not just the
ones that existed at Phase 1.1B. Non-negative-value `CHECK` constraints
added for `sort_order` (all 5 tables) and `price` (`ProductVariant`),
mirroring `20260717091000_check_constraints`'s existing precedent. Full
detail: `docs/architecture/database-schema.md`.

## RBAC

Every endpoint uses `PermissionsGuard` (not `RolesGuard`) — this
milestone's own "Use the existing RolesGuard and PermissionsGuard" is
read as "these two mechanisms exist, pick the one that fits," and the
brief's own read/write/delete tiers map 1:1 onto
`{resource}:read`/`{resource}:write`/`{resource}:delete` permission keys
(9 new permissions: `categories:*`/`collections:*`/`products:*`), the
existing convention every other business domain in this catalog already
uses — cleaner than hardcoding three role-name lists (`customer`,
`manager`, `admin`, `super_admin`) across nine controller methods across
three controllers. Grants (`prisma/seed.ts`):

| Tier | Roles | Grants |
|---|---|---|
| Read | `customer`, `manager`, `admin`, `super_admin` | `*:read` |
| Write | `manager`, `admin`, `super_admin` | `*:read`, `*:write` |
| Delete | `admin`, `super_admin` | `*:read`, `*:write`, `*:delete` |

`admin`/`super_admin` get every permission automatically (both roles'
`permissionKeys` in seed.ts are `PERMISSIONS.map(p => p.key)`, unchanged
by this milestone). See `docs/implementation/decisions.md`.

## Tenant isolation

Every repository method takes `tenantId` as an explicit, separate,
mandatory parameter, always merged into the query by the repository
itself — never something a caller assembles into an arbitrary `where`
object that could omit or override it (same discipline
`AuthRepository.findActiveByEmail(email, tenantId)`/
`RoleRepository.findRolesForUser(email, tenantId)` already established,
Milestone 4). `tenantId` itself always comes from `@Tenant()` — the
request's already-resolved `TenantContext` (`apps/api/src/tenant/`) —
never from the request body/params, satisfying "never trust
client-supplied tenant identifiers" literally. `ProductService` extends
this same principle to client-supplied `categoryId`/`collectionId` (see
"What's real here" above).

## Known gap: no audit-column population

`createdBy`/`updatedBy`/`deletedBy` are left `null` by every
create/update/soft-delete in this module — a known, accepted gap, not an
oversight. `RequestUser` (Milestone 2, unchanged since) is deliberately
`{ email }` only, with no `userId` anywhere in the request pipeline to
populate these nullable audit columns with. Resolving the caller's
`User.id` from their email on every single write, purely to fill an
optional audit column, was considered and rejected as scope this
milestone's brief never asked for. See
`docs/implementation/decisions.md`.

## What this module explicitly does NOT do

Inventory, pricing engine (variant `price` is a plain stored value — no
computation, no rules, no currency conversion), search indexing/
ElasticSearch (`search` filtering is a plain `contains`/case-insensitive
match, not a search index), recommendations, reviews, wishlist, cart,
orders, Bespoke Customizer, CDN integration (Phase 7 added a real upload
route — see "Product" above — but there's no CDN/image-transform layer in
front of it, and `ProductImage` still has no `storageKey`/`mimeType`/
`sizeBytes` columns like `Document`/`Media` have — the uploaded object's
URL is all that's stored), standalone `ProductVariant` management or
`ProductImage` edit/remove, hierarchical/nested
categories, many-to-many Category/Collection↔Product relationships (both
are simple one-to-many, per this milestone's own "Category → Products"/
"Collection → Products" relationship list), optimistic-lock
version-conflict handling (the RLS trigger increments `version`
unconditionally; nothing yet checks it before an update). See
`docs/architecture/domain-module-guide.md` for the general standards this
module follows and `apps/api/src/utils/README.md` for
`prisma-error.util.ts`, the first real file to graduate that
placeholder folder.
