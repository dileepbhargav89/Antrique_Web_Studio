# OrdersModule (Milestone 8 — Order Management & Checkout)

"The orchestration layer that coordinates existing domains rather than
reimplementing their logic" (this milestone's own framing). Two
controller/service/repository triads — Customer, Order — on top of
`Customer`, `CustomerAddress`, `Order`, `OrderItem`, `OrderStatusHistory`,
`PaymentRecord` (placeholder only). Tenant-isolated, RBAC-protected,
transactional order creation/cancellation, immutable append-only status
history.

## What's real here

- `orders.module.ts` — `OrdersModule`, imported into `AppModule`. Not
  `@Global()`. **Imports three other modules** — `CatalogModule`
  (`ProductRepository`, for "Validate product variants"), `BespokeModule`
  (`ProductCustomizationRepository`, for "Validate bespoke
  customization"/"Validate pricing adjustments"), `InventoryModule`
  (`InventoryService`, for "Reserve inventory through InventoryService") —
  the most cross-module-dependent module in this arc. One-directional
  (orders → catalog/bespoke/inventory); none of those three import
  `OrdersModule` — "Zero circular dependencies" holds.

### Customer

Full CRUD — `customer.controller.ts`/`customer.service.ts`/
`repositories/customer.repository.ts` — same shape as catalog's own
`CategoryController`/`CategoryService`/`CategoryRepository`.
`CustomerAddress` has no repository/controller of its own (this
milestone's brief lists only `CustomerRepository`/`OrderRepository`) —
created/replaced only as nested data under `Customer`'s own
create/update (`PATCH` fully replaces the address set when `addresses`
is provided, the same "mutable data, not one-time structure" pattern
inventory's own `SupplierProduct` established). "Duplicate email
handling": a partial unique index on `(tenantId, email)` is the real
backstop, translated to `409 ConflictException` via
`isUniqueConstraintViolation()`. "Default addresses":
`assertAtMostOneDefaultPerType()` rejects more than one
`isDefaultShipping`/`isDefaultBilling` address in the same request array
before it ever reaches the database — service-managed, not a DB
constraint (see `schema.prisma`'s own comment on `CustomerAddress` for
why the lighter-weight approach is proportionate here, unlike
inventory's counters). `userId` (optional link to a portal `User`) is
validated to belong to the caller's tenant via
`CustomerRepository.userBelongsToTenant()`.

### Order (the module's core)

`order.controller.ts`: `POST /orders` (create), `GET /orders` (list),
`GET /orders/:id` (get), `PATCH /orders/:id` (update — top-level fields
only: `shippingAddressId`/`billingAddressId`/`notes`, never `items` or
`status`), `POST /orders/:id/status` (change status — strictly-forward
transitions only), `POST /orders/:id/cancel` (its own, stricter
`orders:cancel` permission — Admin+ only). No plain `DELETE` — Order has
no delete endpoint at all; cancellation is the terminal write action.

`order.service.ts#create()` — this milestone's own "Business Rules,"
each a distinct private assertion run BEFORE the transaction opens (fail
fast, no wasted reservation/rollback for a request that was never going
to succeed): "Validate customer" (`CustomerRepository.findActiveById()`,
plus that any given `shippingAddressId`/`billingAddressId` genuinely
belongs to that customer), "Validate product variants"
(`ProductRepository.findVariantById()`, tenant-scoped), "Validate bespoke
customization" (`ProductCustomizationRepository.findActiveById()`, plus
that it belongs to the SAME product as the variant), "Validate pricing
adjustments" (`computeCustomizationPricing()` — sums matching
`PricingAdjustment`/`MonogramOption` rows for whatever `selectedOptions`
names, rejecting any style-option/monogram id that doesn't belong to the
resolved customization). Then, in ONE `OrderRepository.runInTransaction()`
call: "Reserve inventory through InventoryService"
(`InventoryService.reserveStockForOrder(..., tx, ...)`, once per item) +
"Create Order + OrderItems" + "Record initial status" (a `DRAFT`
`OrderStatusHistory` row, nested in the same create) — "Execute
everything within a single transaction," this milestone's own explicit
requirement.

`changeStatus()`/`cancel()` both write the status update and its
`OrderStatusHistory` row inside the same transaction — "No status
mutation without history," enforced structurally, never optionally.
`changeStatus()` only accepts the single valid forward transition from
the order's current status (`ORDER_FORWARD_TRANSITIONS`,
`constants/orders.constant.ts`) — CANCELLED is reachable only through the
separate `cancel()` endpoint, never through this one. Reaching
`COMPLETED` additionally calls `InventoryService.consumeReservation(...,
tx)` for every item — the reserved stock actually leaving inventory for
good, the real caller Milestone 7's own `consumeReservation()` was built
for but had no controller route to reach yet. `cancel()` — "During
cancellation: Release inventory reservations, Record status transition"
— calls `InventoryService.releaseReservation(..., tx)` for every item
before marking `CANCELLED`, both in the same transaction; only orders in
`ORDER_CANCELLABLE_STATUSES` (`DRAFT`/`PENDING`/`CONFIRMED`/`PROCESSING`)
may be cancelled — `COMPLETED`/`CANCELLED` are both terminal.

`repositories/order.repository.ts` — `Order` is the aggregate root;
`OrderItem`/`OrderStatusHistory` are created only as nested data, no
repository/controller of their own. `runInTransaction()` is the one
genuinely new shape here: it hands a `Prisma.TransactionClient` back to
`OrderService`, which passes that SAME `tx` into every
`InventoryService` call, so the order's own rows and its inventory
side-effects commit or roll back together. Every actual `tx.<model>.<method>()`
call still lives in a named repository method
(`createInTx()`/`addStatusHistoryInTx()`/`updateStatusInTx()`), never
inline in the service.

## Database

6 new tables (`Customer`, `CustomerAddress`, `Order`, `OrderItem`,
`OrderStatusHistory`, `PaymentRecord`), 1 new enum (`OrderStatus`).
Migration: `20260722090000_add_order_management` — same fix classes
every migration since Milestone 5's own: `customers` (soft-deletable)
gets a hand-written **partial** unique index on `(tenantId, email)`;
`order_items(inventory_reservation_id)` is correctly **plain** (not
soft-deletable, and `@unique` — one reservation belongs to at most one
order item). `CHECK` constraints: non-negative `subtotal`/`total` on
`orders`, positive `quantity` and non-negative `unit_price`/`line_total`
on `order_items`, non-negative `amount` on `payment_records`. Full RLS +
all 3 standard policies for every one of the 6 new tables — verified
live (6/6 tables, `rowsecurity = true`, 18/18 policies). `OrderStatusHistory`
is append-only (`createdAt` only, no `updatedAt`/soft-delete/version),
the same shape `InventoryTransaction` already established for an
identical "this table records events, it never edits them" requirement.
Full detail: `docs/architecture/database-schema.md`.

**Workflow re-reading, not a literal chain**: the brief's own diagram
(`Draft → Pending → Confirmed → Processing → Completed → Cancelled`) is
implemented as strictly-forward one-step transitions
(`DRAFT→PENDING→CONFIRMED→PROCESSING→COMPLETED`) with `CANCELLED`
reachable from any non-terminal status via the separate cancel endpoint,
not as a literal sixth sequential step (which would imply cancelling
only ever happens AFTER completion). See `docs/implementation/decisions.md`.

## RBAC

Same `PermissionsGuard` convention as every prior domain module. 6 new
permissions: `customers:read`/`write`/`delete`, `orders:read`/`write`/
`cancel` (`cancel` replaces the usual `delete` tier for Order — there is
no Order delete).

| Tier | Roles | Grants |
|---|---|---|
| Read | `customer`, `manager`, `admin`, `super_admin` | `customers:read`, `orders:read` |
| Write | `manager`, `admin`, `super_admin` | + `customers:write`, `orders:write` |
| Delete (Customer only) | `admin`, `super_admin` | + `customers:delete` |
| Cancel (Order only) | `admin`, `super_admin` | + `orders:cancel` |

`manager` deliberately does NOT get `orders:cancel`/`customers:delete` —
this milestone's own explicit "Cancel: Admin+, Super Admin" tier, one
step more privileged than ordinary write. `admin`/`super_admin` get
every permission automatically (`PERMISSIONS.map(p => p.key)`, unchanged
by this milestone).

## Tenant isolation

Same structural discipline as every prior module: every repository
method takes `tenantId` as an explicit, mandatory, separate parameter,
always merged into the query by the repository itself, never trusted
from client input; `tenantId` always comes from `@Tenant()`. Extended to
every cross-entity reference this milestone introduces:
`CreateOrderDto.customerId`/`shippingAddressId`/`billingAddressId`/
`items[].productVariantId`/`productCustomizationId`/`items[].warehouseId`
— each validated via a repository/service existence check (own-tenant
scoped) before being allowed to reference it.

## Known gap: no audit-column population

Same accepted gap as every prior module — `createdBy`/`updatedBy`/
`deletedBy` are left `null` everywhere in this module too, for the
identical reason (`RequestUser` has no `userId`). See
`docs/implementation/decisions.md`.

## What this module explicitly does NOT do

Payment gateway integration, shipping providers, invoice generation,
refund processing, coupons, promotions, loyalty points, ERP
synchronization, email/SMS notifications — all explicitly out of this
milestone's scope. `PaymentRecord` is a schema anchor only (no
service/controller/repository) for the payment-gateway-integration
milestone this one's own "Do NOT Implement" list explicitly defers. Also
not built: a standalone `CustomerAddress` controller (see "Customer"
above), Order line-item edits after creation (immutable — cancel and
recreate instead), and multi-warehouse auto-fulfillment (the caller
picks the warehouse per line item explicitly). See
`docs/architecture/domain-module-guide.md` for the general standards
this module follows.
