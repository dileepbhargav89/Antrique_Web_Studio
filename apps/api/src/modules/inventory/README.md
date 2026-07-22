# InventoryModule (Milestone 7 — Inventory & Stock Management)

Warehouse-aware stock management for fabrics and finished-goods
(`ProductVariant`) — `Warehouse`, `InventoryItem`, `InventoryTransaction`,
`InventoryReservation`, `Supplier`, `SupplierProduct`. Three controller/
service/repository triads — Warehouse, Inventory, Supplier — tenant-
isolated, RBAC-protected, transactional stock math with an append-only
movement ledger. This module becomes the inventory backbone for a future
Orders module and ERP integration (both explicitly out of scope here).

**No inventory/warehouse/supplier design guidance exists anywhere in the
repo** — checked fresh (not just `docs/product/`); both `catalog/README.md`
and `bespoke/README.md` explicitly disclaim inventory as out of their own
scope, but neither describes what it should look like. This module's
field names/example data are therefore a deliberately generic inventory-
ledger design, not modeled on any specific WMS/ERP's real schema — see
`docs/implementation/decisions.md`.

## What's real here

- `inventory.module.ts` — `InventoryModule`, imported into `AppModule`.
  Not `@Global()`. **Imports nothing** — the only module in this arc with
  zero cross-module imports (contrast `BespokeModule`, which imports
  `CatalogModule`). Its two cross-entity references
  (`ProductVariant.id` from catalog, `Fabric.id` from bespoke) are
  validated via small existence-check methods on `InventoryRepository`/
  `SupplierRepository` that reach `this.prisma.productVariant`/
  `this.prisma.fabric` directly, rather than importing both `CatalogModule`
  and `BespokeModule` purely for two narrow checks — see those
  repositories' own header comments and
  `docs/implementation/decisions.md`.

### Warehouse

Full CRUD — `warehouse.controller.ts`/`warehouse.service.ts`/
`repositories/warehouse.repository.ts` — same shape as catalog's own
`CategoryController`/`CategoryService`/`CategoryRepository`. `remove()`
enforces this milestone's own "Soft delete only when no active inventory
exists": `WarehouseRepository.hasActiveInventory()` checks for any
non-deleted `InventoryItem` in the warehouse with `onHand > 0` or
`reserved > 0`, and `WarehouseService.remove()` throws
`UnprocessableEntityException` (422) if one exists.

### Inventory (the module's core)

`inventory.controller.ts` has **no plain `POST /inventory` (create) and
no `DELETE`** — this milestone's own "Controllers" list for Inventory is
domain-specific operations only: `GET /inventory` (list), `GET
/inventory/transactions` (ledger — **must be routed before** `GET
/inventory/:id`, or Nest's `:id` param would greedily swallow
"transactions"), `GET /inventory/:id` (detail), `POST /inventory/receive`
(find-or-create), `POST /inventory/:id/adjust`, `POST /inventory/:id/reserve`,
`POST /inventory/reservations/:reservationId/release`. An `InventoryItem`
is only ever created implicitly, as a side effect of its first `receive`.

`inventory.service.ts` — every mutating method PRE-CHECKS the resulting
counters before writing (a clear `BadRequestException` for the ordinary
case), with the database's own `CHECK` constraints
(`20260721100000_add_inventory_management`) as the race-free backstop for
a genuine concurrent-write race, translated via
`isCheckConstraintViolation()` (new in `utils/prisma-error.util.ts`, the
`P2004` counterpart to the existing `isUniqueConstraintViolation()`) into
a `409 ConflictException`:
- `receiveStock()` — validates exactly one of `productVariantId`/
  `fabricId` is given, quantity > 0, warehouse/variant/fabric all belong
  to the caller's tenant; finds-or-creates the `InventoryItem`, then logs
  a `RECEIPT`.
- `adjustStock()` — "Prevent negative stock": rejects a delta that would
  push `onHand` below zero before ever writing.
- `reserveStock()` — "Reservation cannot exceed availability": rejects a
  quantity that would push `reserved` past `onHand`.
- `releaseReservation()` — only an `ACTIVE` reservation for the caller's
  tenant can be released; returns the `reserved` quantity to availability
  without touching `onHand`.
- `consumeReservation()` — **no controller route** (see below) — reduces
  both `onHand` and `reserved` together, the reserved stock leaving
  inventory for good.
- `listTransactions()` — filters: inventory item, warehouse (a relation
  filter through `InventoryItem`), transaction type, date range.

`repositories/inventory.repository.ts` is where "Inventory math must
remain transactional" actually lives — `applyStockChange()`/
`reserveStock()`/`releaseReservation()`/`consumeReservation()` each run
inside ONE `prisma.$transaction(async (tx) => ...)` callback, writing the
`InventoryItem` counter update and the `InventoryTransaction` ledger row
together — neither is ever written without the other. Counter updates use
Prisma's atomic `{ increment }`/`{ decrement }` (a single `SET on_hand =
on_hand + $delta` Postgres statement against the CURRENT row value at
write time), not a read-then-write in application code — this is what
makes concurrent stock mutations race-free without explicit row locking.

**Why "Consume reservation" has a service method but no route**: this
milestone's own "Service Layer" section lists it as a required
capability, but its own "Controllers" section does NOT list a "Consume
reservation" endpoint (only "Release reservation" does). Read literally:
releasing a hold is an admin action exposed now; consuming one is
naturally triggered by order fulfillment, which doesn't exist yet (Orders
are explicitly out of this milestone's scope) — `InventoryService.consumeReservation()`
exists, callable and unit-tested, for that future caller. See
`docs/implementation/decisions.md`.

### Supplier

Full CRUD — `supplier.controller.ts`/`supplier.service.ts`/
`repositories/supplier.repository.ts`. `SupplierProduct` has no
repository/controller of its own this milestone (this milestone's brief
lists only `WarehouseRepository`/`InventoryRepository`/
`SupplierRepository` for 6 entities) — created as nested data under
`Supplier`'s own `POST`, and fully replaceable (delete-then-create) via
`PATCH` — same "mutable data, not one-time structure" reasoning
`bespoke/dto/update-measurement-profile.dto.ts`'s own `measurements` field
established. Each `SupplierProduct` references exactly one of
`productVariantId`/`fabricId` (XOR — same pattern as `InventoryItem`, see
below), validated to belong to the caller's tenant.

## Database

6 new tables (`Warehouse`, `InventoryItem`, `InventoryTransaction`,
`InventoryReservation`, `Supplier`, `SupplierProduct`), 4 new enums.
Migration: `20260721100000_add_inventory_management` — hand-written from
`prisma migrate diff`'s raw output, same fix classes every migration
since Milestone 5's own: `warehouses`/`suppliers` (soft-deletable) get
hand-written **partial** unique indexes; `inventory_items` needs **two**
partial unique indexes, one per side of its variant/fabric XOR (neither
was proposed by the auto-diff at all — Prisma's schema DSL can express
neither a filtered index nor one scoped to "the non-null side of an XOR
pair"). `InventoryItem`/`SupplierProduct` both reference EITHER a
`ProductVariant` OR a `Fabric`, never both — mirrors the existing
`Quotation.leadId`/`clientId` XOR precedent exactly (a hand-written
cross-column `CHECK` constraint), extended to a variant-vs-fabric choice.
New `CHECK` constraints beyond the XOR: `on_hand >= 0`, `reserved >= 0`,
`reserved <= on_hand` (which, combined with "Available = OnHand −
Reserved," implies `Available >= 0` too), `quantity > 0` on reservations,
non-negative `cost`/`lead_time_days` on supplier products — "OnHand ≥ 0" /
"Reserved ≤ OnHand" / "Reservation cannot exceed availability," this
milestone's own business rules, enforced at the database level as the
real backstop behind `InventoryService`'s own pre-checks. `InventoryTransaction`
is the one genuinely append-only table in this schema — `createdAt` only,
no `updatedAt`/soft-delete/version — "Transactions are append-only," this
milestone's own business rule, enforced structurally, not by convention.
Full RLS + all 3 standard policies for every one of the 6 new tables.
Full detail: `docs/architecture/database-schema.md`.

## RBAC

Same `PermissionsGuard` convention as every prior domain module —
read/write/delete tiers map onto `{resource}:read`/`{resource}:write`/
`{resource}:delete` permission keys (8 new permissions:
`warehouses:*`/`suppliers:*` [3 each] + `inventory:read`/`write` [2, no
delete — this milestone's own brief lists no delete operation for
`InventoryItem`]). Grants (`prisma/seed.ts`):

| Tier | Roles | Grants |
|---|---|---|
| Read | `customer`, `manager`, `admin`, `super_admin` | `*:read` |
| Write | `manager`, `admin`, `super_admin` | `*:read`, `*:write` |
| Delete (Warehouse/Supplier only) | `admin`, `super_admin` | `*:read`, `*:write`, `*:delete` |

`admin`/`super_admin` get every permission automatically
(`PERMISSIONS.map(p => p.key)`, unchanged by this milestone).

## Tenant isolation

Same structural discipline as every prior module: every repository
method takes `tenantId` as an explicit, mandatory, separate parameter,
always merged into the query by the repository itself; `tenantId` always
comes from `@Tenant()`. Extended to every cross-entity reference this
milestone introduces: `ReceiveStockDto.warehouseId`/`productVariantId`/
`fabricId`, `SupplierProduct.productVariantId`/`fabricId` — each
validated via a repository existence check before being allowed to
reference it, the same cross-entity tenant-ownership pattern
`ProductService.assertReferencesBelongToTenant()` established in
Milestone 5.

## Known gap: no audit-column population

Same accepted gap as every prior module — `createdBy`/`updatedBy`/
`deletedBy` are left `null` everywhere in this module too, for the
identical reason (`RequestUser` has no `userId`). See
`docs/implementation/decisions.md`.

## What this module explicitly does NOT do

Purchase Orders, Sales Orders, Manufacturing, barcode scanning, ERP
synchronization, Shipping, Accounting, Forecasting, AI demand planning —
all explicitly out of this milestone's scope. Also not built: a
`WarehouseZone`/bin-location hierarchy (a `Warehouse` is a single flat
location), standalone `SupplierProduct` CRUD (see "Supplier" above), a
`Consume reservation` REST endpoint (see "Inventory" above — the service
method exists, unused by any controller yet), and any validation of a
reservation's `reference` against a real Order/Cart entity (there is
none yet — Orders are explicitly out of scope). See
`docs/architecture/domain-module-guide.md` for the general standards this
module follows.
