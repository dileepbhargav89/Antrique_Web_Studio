# BespokeModule (Milestone 6 — Bespoke Customizer Engine)

The bespoke garment customization engine the catalog module's own
`Product`/`ProductVariant` doc comments named as a forward reference:
`Fabric`/`FabricCategory`/`FabricImage`/`ProductFabric`,
`MeasurementProfile`/`Measurement`, `StyleOptionGroup`/`StyleOption`/
`StyleOptionIncompatibility`, `ProductCustomization`/`PricingAdjustment`/
`MonogramOption`. Four controller/service/repository triads — Fabrics,
Measurement Profiles, Style Options, Product Customization — tenant-
isolated, RBAC-protected, paginated, filterable, soft-delete-aware, built
on top of `CatalogModule`.

**No bespoke-customization design guidance exists in `docs/product/`** —
checked fresh for this milestone (not assumed from Milestone 5's own
finding); those docs still model Antrique purely as a web agency, with
zero mention of fabric/monogram/measurement/style-option concepts beyond
this codebase's own forward-reference comments. This module's field
names/example data are therefore a deliberately generic bespoke-garment
design, not modeled on any specific brand's real customization flow — see
`docs/implementation/decisions.md`.

## What's real here

- `bespoke.module.ts` — `BespokeModule`, imported into `AppModule`. Not
  `@Global()`. Imports `CatalogModule` (which now `exports:
  [ProductRepository]` — see `catalog.module.ts`) so `FabricService`/
  `ProductCustomizationService` can validate a client-supplied `productId`
  belongs to the caller's tenant without a second DI instance of
  `ProductRepository`. One-directional (bespoke → catalog); catalog never
  imports bespoke — zero circular dependencies.

### Naming note: repository/controller names don't all match 1:1

This milestone's own brief names a `MeasurementRepository` (not
`MeasurementProfileRepository`) alongside a "Measurement Profiles"
controller, and a `StyleOptionRepository` alongside a "Style Options"
controller (not "Style Option Groups"). Read literally and applied
consistently:

- **`MeasurementRepository`** targets `MeasurementProfile` as its
  aggregate root, with `Measurement` rows as nested children (same shape
  ProductRepository gave ProductVariant/ProductImage in Milestone 5) — no
  independent `Measurement` repository/controller exists.
- **`StyleOptionRepository`**/**`StyleOptionController`** target
  `StyleOption` directly. `StyleOptionGroup` has no repository/controller
  of its own — it's created only as nested data under
  `ProductCustomization`'s own `POST` (see below).

### Fabric

- `fabric.controller.ts` — `POST/GET/GET :id/PATCH/DELETE /fabrics`.
  Permission keys `fabrics:read`/`write`/`delete`.
- `fabric.service.ts` — validates a client-supplied `fabricCategoryId`
  only structurally (a plain scalar FK; no cross-tenant lookup needed —
  `FabricCategory` has no controller of its own this milestone, see
  below). Validates every `productIds` entry (the `ProductFabric`
  many-to-many link) genuinely belongs to the caller's tenant via the
  injected `ProductRepository` — "Fabrics belong to the current tenant,"
  applied to the *other* side of the relationship.
- `repositories/fabric.repository.ts` — `findActiveById()`/
  `createWithRelations()`/`updateWithRelations()` include ordered
  `images` (same `include`-typing-gotcha workaround as
  `product.repository.ts`). `setProductLinks()` full-replaces
  (delete-then-create, one transaction) a fabric's `ProductFabric` rows.
- No `FabricCategory` controller — it's a real, tenant-scoped, soft-
  deletable table (seeded via `prisma/seed.ts`, same "registered but
  unwired" treatment `Permission` gets), referenced by Fabric's optional
  `fabricCategoryId` and this milestone's own "Filtering: Fabric
  category" requirement — just not independently CRUD-managed yet.
- `ProductFabric` (the Product ↔ Fabric many-to-many join) is not named
  in this milestone's "Core entities" list but is structurally required —
  a fabric like "Navy Wool Twill" is meant to be reusable across many
  products, which a single scalar FK can't express. Pure join table
  (hard-delete, `addedAt`/`addedBy`), same shape as `UserRole`/
  `ProjectMember`.

### Measurement Profile

- `measurement-profile.controller.ts` — `POST/GET/GET :id/PATCH/DELETE
  /measurement-profiles`. Permission keys
  `measurement_profiles:read`/`write`/`delete`.
- `measurement.service.ts` — enforces this milestone's own "Measurement
  names are unique within a profile" business rule TWICE: a pre-check
  over the request's own `measurements` array
  (`assertUniqueMeasurementNames()`, a clear single-request error) and
  the database's own `@@unique([measurementProfileId, name])` constraint
  (the real backstop, translated to `409` the same way slug conflicts
  are elsewhere). Validates an optional `userId` belongs to the caller's
  tenant via `MeasurementRepository.userBelongsToTenant()`.
- Unlike catalog's own `ProductVariant`/`ProductImage` (immutable after
  create), `PATCH /measurement-profiles/:id` **does** accept a new
  `measurements` array — a person's measurements genuinely change over
  time, unlike a product's structural variant list. When provided, it
  FULLY REPLACES the existing set (delete-then-create, one transaction —
  `MeasurementRepository.replaceMeasurements()`); omitting the field
  leaves existing measurements untouched.
- `userId` (on `MeasurementProfile`) is not explicitly named in this
  milestone's "Relationships" list — added as the minimal necessary field
  for a profile to be a meaningful, listable resource at all (a
  measurement profile with no owner would be unfindable except by raw
  id). See `docs/implementation/decisions.md`.

### Style Option

- `style-option.controller.ts` — `POST/GET/GET :id/PATCH/DELETE
  /style-options`. Permission keys `style_options:read`/`write`/`delete`.
- `style-option.service.ts` — two of this milestone's own "Business
  Rules" live here:
  - **"Style options belong to the selected product"** —
    `assertGroupBelongsToTenant()` validates a client-supplied
    `styleOptionGroupId`, and
    `assertIncompatibleOptionsBelongToSameProduct()` validates every
    `incompatibleStyleOptionIds` entry resolves to a style option in the
    SAME product's customization — a cross-product "incompatibility"
    would be meaningless (a customer only ever configures one product at
    a time).
  - **"Incompatible style combinations are rejected"** — modeled as
    admin-configured metadata (`StyleOptionIncompatibility`, a pure join
    table not named in "Core entities" but structurally required — see
    `schema.prisma`'s own comment), stored one-directionally
    (`styleOptionAId < styleOptionBId`, enforced by
    `StyleOptionRepository.setIncompatibilities()`, not the schema). A
    self-reference is rejected outright.
- `repositories/style-option.repository.ts` — `findGroupById()`/
  `setIncompatibilities()`/`findIncompatibilities()` reach
  `this.prisma.styleOptionGroup`/`this.prisma.styleOptionIncompatibility`
  directly (neither has its own repository) — the same kind of minimal,
  deliberate exception `product.repository.ts`'s nested-write handling
  already establishes.
- List rows omit `incompatibleStyleOptionIds` (would need a
  `findIncompatibilities()` round-trip per row) — the same "list is a
  lighter summary than detail" convention catalog's own
  `ProductResponseDto` established. `GET /style-options/:id` always
  includes it.

### Product Customization

- `product-customization.controller.ts` — `POST/GET/GET :id/PATCH
  /product-customizations`. **No `DELETE` route** — this milestone's own
  "Controllers" section lists Create/Update/Get/List only. Permission
  keys `product_customizations:read`/`write` (no `:delete` key exists to
  grant).
- `product-customization.service.ts`:
  - `create()` validates `productId` belongs to the caller's tenant
    (reusing `ProductRepository`, same pattern as `FabricService`), then
    creates the customization with nested `StyleOptionGroups` (each with
    its own initial `StyleOptions`) via Prisma's nested-write `create` —
    structural, set once (new options can still be added later via the
    standalone `StyleOption` endpoint). Any `pricingAdjustments[].styleOptionId`
    given at create time is rejected outright — a nested create can't
    forward-reference a sibling row's not-yet-assigned id within the same
    request, so per-option pricing rules can only be attached via
    `PATCH`, once the style option genuinely exists (see
    `dto/create-pricing-adjustment.dto.ts`'s own comment).
  - `update()` accepts NO `styleOptionGroups` (immutable after create,
    same discipline Milestone 5 gave `Product.update()` not touching
    variants/images) but DOES accept `pricingAdjustments`/
    `monogramOptions` — full replace when given (delete-then-create, one
    transaction), the same "mutable data, not one-time structure"
    reasoning `MeasurementProfile.measurements` gets. Any `styleOptionId`
    given here is validated to belong to THIS SAME customization
    (`assertStyleOptionBelongsToCustomization()`) — "Style options belong
    to the selected product," applied again.
  - Duplicate customization creation for the same product is translated
    from Postgres `P2002` into a `409 ConflictException`.
- `repositories/product-customization.repository.ts` — unlike catalog's
  own list/detail split, **list rows here are fully populated** with the
  deep nested include (`styleOptionGroups.styleOptions`,
  `pricingAdjustments`, `monogramOptions`) — a customization without its
  configuration is a near-useless summary, unlike a Product without its
  secondary variants/images.
- `MonogramOption`/`PricingAdjustment` are both line-item shaped
  (`createdAt`/`updatedAt` only, no soft-delete/version, Cascade-deleted
  with their parent) — no standalone controller for either.

## Database

12 new tables (10 named "Core entities" + `ProductFabric` +
`StyleOptionIncompatibility`, both structurally necessary joins not
individually named — see each one's own doc comment in `schema.prisma`)
+ 5 new enums (`FabricCategoryStatus`, `FabricStatus`, `MeasurementUnit`,
`StyleOptionStatus`, `PricingAdjustmentType`). Migration:
`20260720200000_add_bespoke_customizer` — hand-written from `prisma
migrate diff`'s raw output, same two classes of fix as Milestone 5's own
migration: the auto-diff's spurious `users(tenant_id, email)` re-add
dropped outright; `fabric_categories`/`fabrics`/`measurements`/
`product_customizations`'s own new unique indexes hand-written as
**partial** (`WHERE deleted_at IS NULL`) where the table is soft-
deletable (`product_customizations`' is on `product_id` alone — a true
1:1 relation Prisma's own relation validator requires — not
`(tenant_id, product_id)`, since a Product already belongs to exactly one
tenant). RLS enabled + all 3 standard policies for all 12 new tables,
including the two join tables (`20260720190000_add_product_catalog`'s own
header comment already extended this to join tables like
`user_roles`/`project_members`). New `CHECK` constraints beyond
non-negative `sort_order`: `measurements.value > 0`,
`monogram_options.max_characters > 0`, and a conditional bound on
`pricing_adjustments` (`PERCENTAGE` adjustments must be between -100 and
500) — "Pricing adjustments are valid"/"Monogram rules are enforced,"
this milestone's own business rules, enforced at the database level too.
Deliberately **not** constrained to `>= 0`:
`fabrics`/`style_options`/`monogram_options`' `price_adjustment` and
`pricing_adjustments.amount` — these are DELTAS (unlike
`ProductVariant.price`, an absolute price), and a negative delta is a
legitimate discount. Full detail: `docs/architecture/database-schema.md`.

## RBAC

Same `PermissionsGuard` convention as `CatalogModule` — read/write/delete
tiers map onto `{resource}:read`/`{resource}:write`/`{resource}:delete`
permission keys (11 new permissions:
`fabrics:*`/`measurement_profiles:*`/`style_options:*` [3 each] +
`product_customizations:read`/`write` [2, no delete]). Grants
(`prisma/seed.ts`):

| Tier | Roles | Grants |
|---|---|---|
| Read | `customer`, `manager`, `admin`, `super_admin` | `*:read` |
| Write | `manager`, `admin`, `super_admin` | `*:read`, `*:write` |
| Delete (Fabric/MeasurementProfile/StyleOption only) | `admin`, `super_admin` | `*:read`, `*:write`, `*:delete` |

`admin`/`super_admin` get every permission automatically
(`PERMISSIONS.map(p => p.key)`, unchanged by this milestone).

## Tenant isolation

Same structural discipline as `CatalogModule`: every repository method
takes `tenantId` as an explicit, mandatory, separate parameter, always
merged into the query by the repository itself; `tenantId` always comes
from `@Tenant()` (the request's resolved `TenantContext`), never the
request body/params. Extended to every cross-entity reference this
milestone introduces: `Fabric.productIds` (via `ProductRepository`),
`MeasurementProfile.userId` (via
`MeasurementRepository.userBelongsToTenant()`), `StyleOption`'s group/
incompatibility references (via `StyleOptionRepository.findGroupById()`),
`ProductCustomization.productId` (via `ProductRepository`).

## Known gap: no audit-column population

Same accepted gap as `CatalogModule` — `createdBy`/`updatedBy`/
`deletedBy` are left `null` everywhere in this module too, for the
identical reason (`RequestUser` has no `userId`). See
`docs/implementation/decisions.md`.

## What this module explicitly does NOT do

3D visualization, AI recommendations, image generation, inventory
reservation, cart integration, orders, payment, shipping, ERP
integration, file storage/CDN (`FabricImage.url` is a plain string
reference, same as `ProductImage`), public storefront UI — all
explicitly out of this milestone's scope. Also not built: standalone
`FabricCategory`/`StyleOptionGroup`/`PricingAdjustment`/`MonogramOption`
CRUD (see "Naming note" and each resource's own section above), a
customer-facing "select your configuration and see the total price"
calculation endpoint (pricing deltas are stored data, not a computed
quote — no pricing *engine* exists, same "data, not logic" distinction
`ProductVariant.price` already draws), and any validation of
customer-entered monogram TEXT against a `MonogramOption`'s rules (there
is no customer selection/order entity yet to validate against — that's
Cart/Orders, explicitly excluded). See
`docs/architecture/domain-module-guide.md` for the general standards
this module follows.
