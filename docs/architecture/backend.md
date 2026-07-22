# Backend Architecture (Phase 1.2A → Milestone 14) — NestJS Foundation

Companion to `architecture.md`'s one-line backend summary ("modular monolith
... Modules: auth, projects, billing, crm, notifications, content +
cross-cutting common layer") — this doc is the source of truth for *what got
built* in `apps/api/src`. Same relationship `database-schema.md` has to
`database.md`.

**Status:** bootstrap, module structure, and global config from Phase
1.2A; a complete logging subsystem (`LOGGER`, `AUDIT_LOGGER`,
`RequestContextService`, `PerformanceLogger`, HTTP completion logging,
exception logging — Phases 1.2C.1–1.2C.9, full detail:
`apps/api/src/logging/README.md` / `docs/architecture/logging-guide.md`);
the domain-module template and its one reference route,
`GET /api/v1/example/ping` (Phase 1.2D.1, full detail:
`docs/architecture/domain-module-guide.md`); a real database connection
(`PrismaService`/`DatabaseModule`, Phase 1.2D.2) and a generic repository
layer (`BaseRepository`, Phase 1.2D.3); the first real business module,
`AuthModule` (Phase 1.2D.4 — `POST /auth/{login,refresh,logout}`, every
endpoint a placeholder at the time, full detail:
`apps/api/src/modules/auth/README.md`);
a global request-validation layer (`ValidationPipe`, Phase 1.2D.5, full
detail: `apps/api/src/common/pipes/README.md`); JWT infrastructure
(`TokenService`/`TokenModule`, Phase 1.2D.6, full detail:
`apps/api/src/jwt/README.md`) — genuinely functional (sign/verify
round-trips tested); password hashing infrastructure
(`PasswordService`/`PasswordModule`, Phase 1.2D.7, full detail:
`apps/api/src/password/README.md`) — genuinely functional (Argon2id
hash/compare round-trips tested); real authentication token issuance
(Phase 1.2D.8) — `POST /auth/login` issues real, verifiable
access + refresh tokens via `TokenService`, built from a minimal
(`{ email }`-only) JWT payload; real refresh-token verification (Phase
1.2D.9) — `POST /auth/refresh` verifies the submitted refresh token via
the same `TokenService` and reissues a fresh access + refresh pair,
returning `401` for an invalid signature, an expired token, a malformed
token, or an access token submitted as a refresh token; stateless
refresh-token rotation (Phase 1.2D.10) — formalizes that same behavior
(every successful `refresh()` call signs a genuinely new pair, proven by
spying on the sign calls, not just decoding the result) with zero
production-code changes, since Phase 1.2D.9 already always reissued.
Confirmed same-wall-clock-second issuances are byte-identical (HS256
determinism) and genuinely distinct once ≥1s elapses — documented, not
"fixed" with a `jti`/nonce, which that phase's brief explicitly forbade
to preserve the minimal `{ email }` payload; real, database-backed
authentication (**Milestone 1**) — `POST /auth/login` now looks up the
submitted email via a real, tenant-scoped `AuthRepository.findActiveByEmail()`
query and verifies the password against a stored Argon2id hash via
`PasswordService.compare()` (finally called — no longer "registered but
unwired"), returning `401` for no such user, an IdP-only account (no
password set), or a wrong password, all identically. Two schema changes
made this possible: `User.passwordHash` (new, nullable) and
`User.idpSubject` (now nullable, was required) — the original schema was
IdP-only; `docs/architecture/security.md`'s "Auth" line now documents
both credential paths. Real multi-tenant resolution still doesn't exist
(explicitly out of this milestone's scope too) — every query is scoped
to one fixed `DEFAULT_TENANT_ID` (a new, validated, required env var),
satisfying CLAUDE.md's non-negotiable "tenant scope on EVERY query" rule
honestly rather than skipping it. `POST /auth/logout` remains a
`{ status: 'not_implemented' }` placeholder; an authorization foundation
(**Milestone 2**) — `JwtAuthGuard` (`apps/api/src/common/guards/`), a
hand-written `CanActivate` (not Passport), verifies the
`Authorization: Bearer` header exclusively via
`TokenService.verifyAccessToken()` and attaches a frozen, minimal
`RequestUser` (`{ email }`, `apps/api/src/types/request-user.type.ts`)
to `request.user`; `@CurrentUser()` (`apps/api/src/common/decorators/`)
reads it back out for a controller. Applied per-route via
`@UseGuards()`, not globally — `POST /auth/{login,refresh,logout}` stay
unauthenticated. `GET /example/ping` is the one route protected so far,
now returning `{ status: 'ok', authenticatedAs }` — the first deliberate
change to that previously-always-unchanged reference endpoint (see
`modules/example-domain/README.md`). No roles/permissions/tenant/profile
fields on `RequestUser` yet, no RBAC, no policy engine — this milestone
is authentication-gating only, the foundation future authorization
builds on; a real role & permission foundation (**Milestone 3**) —
a new `@Global()` `AuthorizationModule` (`apps/api/src/authorization/`,
mirroring `TokenModule`/`PasswordModule`'s exact precedent) provides
`AuthorizationService`, which resolves a user's roles/permissions
database-driven via `RoleRepository`/`PermissionRepository` (both new,
querying the already-existing `Role`/`Permission`/`UserRole`/
`RolePermission` schema — no migration needed, schema unchanged since
Phase 1.1A). Resolved by the caller's *email* (`request.user.email`, via
a single nested-relation Prisma query joining `Role → UserRole → User`),
not a new JWT claim — `AuthTokenPayload`/`RequestUser`/`login()`/
`refresh()` remain genuinely untouched. `RolesGuard`/`PermissionsGuard`
(`apps/api/src/common/guards/`) read `@Roles()`/`@Permissions()` metadata
(`common/decorators/`, `SetMetadata()`-based, no logic of their own) and
return `403` on a failed check — `401` stays `JwtAuthGuard`'s exclusive
job, enforced by guard-array ordering
(`@UseGuards(JwtAuthGuard, RolesGuard)`) that both new guards trust
rather than re-verify. "Cache within a request only, no Redis" is
achieved by storing the cache on `request.authorizationCache`
(`apps/api/src/types/authorization-cache.type.ts`), not as
`AuthorizationService`'s own instance state — that service is a
singleton, so an instance field would leak across concurrent requests.
`GET /example/ping` gained `RolesGuard` (`admin`/`super_admin`, OR
semantics) on top of its existing `JwtAuthGuard`; a new
`GET /example/permission-ping` demonstrates `PermissionsGuard`
(`projects:write`, AND semantics) — both reuse the same `PingResponseDto`.
Seed data (`prisma/seed.ts`) gained 3 roles (`super_admin`, `manager`,
`customer`, additive alongside the original 4) and 3 more test users, one
per RBAC tier; real, request-based multi-tenant resolution (**Milestone
4 — Organization & Multi-Tenant Foundation**) — replaces the fixed
`DEFAULT_TENANT_ID` stopgap every prior milestone used. A new (not
`@Global()`) `TenantModule` (`apps/api/src/tenant/`) registers
`TenantMiddleware` application-wide via its own `NestModule.configure()`
(deliberately not raw `app.use()` like `HttpLoggingMiddleware` — see
below), resolving a tenant once per request, before any guard/controller
runs, priority hostname (leftmost label of a ≥3-label, non-IP hostname,
matched against `Tenant.slug` — no dedicated hostname column exists, no
schema change this milestone) → `X-Tenant-ID` header (dev/testing) →
`DEFAULT_TENANT_ID` (**development only**, confirmed live that
`production`/`test` requests get a clean `400`, never a silent default).
Each candidate is validated against the database
(`OrganizationRepository`, a thin wrapper over the already-existing
`Tenant` model — "Organization" is this milestone's name for what the
schema calls `Tenant`; no new entity). Attaches two frozen views to the
request in one pass — `TenantContext` (`{ tenantId }`, for query-scoping,
read via `@Tenant()`) and `OrganizationContext` (`{ id, name, slug }`,
for display, read via `@Organization()`) — both new
`common/decorators/`. `AuthRepository`/`RoleRepository`/
`PermissionRepository` all stopped injecting the fixed `defaultTenant`
config directly and now take `tenantId` as a plain method parameter
instead, sourced from the resolved context (`AuthController.login()`
reads `@Tenant()`; `RolesGuard`/`PermissionsGuard` read
`request.tenantContext` directly). The `defaultTenant` config itself
relocated from `modules/auth/config/` to `apps/api/src/tenant/config/` —
a genuine single owner now (`TenantResolver`'s dev-only fallback), not
the two-consumer sharing arrangement Milestone 3 deliberately left in
place. `GET /example/organization` (new) demonstrates both decorators,
guarded by `JwtAuthGuard` only — no RBAC layered on top. Deliberately
unchanged: `JwtAuthGuard` itself, and the JWT payload — tenant never
becomes a token claim, both this milestone's own explicit requirements.
Still no registration, no password reset, no email verification, no
refresh-token storage/revocation/blacklist, no reuse detection (the same
refresh token can be submitted more than once), no sessions, no OAuth,
no MFA, no permission-management API, no wildcard/hierarchical
permissions, no organization CRUD/invitation system/tenant-creation API,
no RLS session-variable wiring, no other business modules RBAC-gated
yet; the Product Catalog Foundation (**Milestone 5**) — the first real
business module with more than one controller/service/repository triad.
A new `CatalogModule` (`apps/api/src/modules/catalog/`) provides full
CRUD REST APIs for `Category`/`Collection`/`Product` (`ProductVariant`/
`ProductImage` ride along as nested writes under `Product`, no
independent endpoints), tenant-isolated (every repository method takes
`tenantId` as an explicit, structurally-enforced parameter, sourced from
`@Tenant()`, never a client-supplied value), paginated (offset-based —
new shared `PaginationQueryDto`/`PaginatedResponseDto<T>`,
`common/dto/`), filterable (category/collection/status/search on
products), sortable (an allowlisted `sortBy`, never a raw client field
name passed to Prisma's `orderBy`), and soft-delete-aware. RBAC via
`PermissionsGuard` exclusively (not `RolesGuard`) — 9 new permissions
(`categories:*`/`collections:*`/`products:*`) matching this milestone's
own read/write/delete tiers (Customer+ read, Manager+ write, Admin+
delete) exactly. Genuinely new schema this milestone (5 new tables, 3 new
enums, migration `20260720190000_add_product_catalog`) — unlike
Milestones 3/4, which found their target entities already modeled; full
RLS + CHECK constraints extended to all 5 new tables, matching Phase
1.1B's own established pattern. `BaseRepository` gained a `count()`
method (all three new repositories needed one simultaneously for
paginated-list totals) and a documented gotcha: a repository method
passing `include`/`select` must bypass `BaseRepository`'s inherited
generic `create()`/`update()` (their `ReturnType<>`-based typing silently
drops relation fields) in favor of a plain custom method calling
`this.delegate.create({ ... })` directly — see
`docs/architecture/domain-module-guide.md` §16. `utils/` and
`common/dto/` both graduated from placeholder to real content this
milestone. No design guidance existed in `docs/product/` for this
domain — flagged, not silently assumed. See
`apps/api/src/modules/catalog/README.md`, `apps/api/src/authorization/README.md`,
`apps/api/src/tenant/README.md`.

The Bespoke Customizer Engine (**Milestone 6**) — the second real
business module, built on top of `CatalogModule`. A new `BespokeModule`
(`apps/api/src/modules/bespoke/`) provides four controller/service/
repository triads — Fabrics, Measurement Profiles, Style Options, Product
Customization — for 10 named "core entities" plus 2 structurally-required
join tables (`ProductFabric`, `StyleOptionIncompatibility`) not
individually named in the brief. Same tenant-isolation/pagination/
filtering/soft-delete/`PermissionsGuard` conventions as `CatalogModule`
(11 new permissions: `fabrics:*`/`measurement_profiles:*`/
`style_options:*` [3 each] + `product_customizations:read`/`write` [2,
no delete — this milestone's own brief lists no Delete endpoint for
Product Customization]). Imports `CatalogModule` (now `exports:
[ProductRepository]`) for cross-module tenant-ownership validation —
one-directional, zero circular dependencies. Genuinely new business-rule
surface beyond Milestone 5's CRUD-only scope: "Measurement names are
unique within a profile" (DB constraint + service pre-check), "Style
options belong to the selected product" (cross-entity validation
extended to a THIRD level — group → customization → product, not just a
direct FK), "Incompatible style combinations are rejected" (a new
admin-configured self-referential join,
`StyleOptionIncompatibility`), "Pricing adjustments are valid"/"Monogram
rules are enforced" (new conditional/bounded `CHECK` constraints). 12 new
tables, 5 new enums, migration `20260720200000_add_bespoke_customizer`;
full RLS + CHECK constraints on all 12, including the two join tables.
No design guidance existed in `docs/product/` for this domain either —
checked fresh, not assumed from Milestone 5's own finding. See
`apps/api/src/modules/bespoke/README.md`.

Inventory & Stock Management (**Milestone 7**) — the third real business
module, and the first with NO cross-module imports at all. A new
`InventoryModule` (`apps/api/src/modules/inventory/`) provides three
controller/service/repository triads — Warehouse (full CRUD), Inventory
(domain-specific stock operations, no plain create/delete), Supplier
(full CRUD, with nested `SupplierProduct`) — for `Warehouse`,
`InventoryItem`, `InventoryTransaction`, `InventoryReservation`,
`Supplier`, `SupplierProduct`. Same tenant-isolation/pagination/
filtering/soft-delete/`PermissionsGuard` conventions as every prior
module (8 new permissions: `warehouses:*`/`suppliers:*` [3 each] +
`inventory:read`/`write` [2, no delete]). Its two cross-entity references
(`ProductVariant` from catalog, `Fabric` from bespoke) are validated via
direct existence-check methods on its own repositories rather than
importing `CatalogModule`/`BespokeModule` — a deliberate departure from
Milestone 6's own "import the module, reuse its repository" pattern (see
`docs/implementation/decisions.md` for why). Genuinely new capability
beyond every prior milestone's CRUD-only scope: transactional stock math
— `InventoryRepository`'s `applyStockChange()`/`reserveStock()`/
`releaseReservation()`/`consumeReservation()` each run inside one
`prisma.$transaction()` callback, using Prisma's atomic `{ increment }`/
`{ decrement }` (not read-then-write) for race-free concurrent counter
updates, with the counter mutation and its `InventoryTransaction` ledger
row always written together. A new `isCheckConstraintViolation()` helper
(`utils/prisma-error.util.ts`, the `P2004` counterpart to the existing
`isUniqueConstraintViolation()`) translates a genuine concurrent-write
CHECK-constraint race into a clean `409`, backing up
`InventoryService`'s own optimistic pre-checks for "Prevent negative
stock"/"Prevent over-reservation." `InventoryItem`/`SupplierProduct` both
reference EITHER a `ProductVariant` OR a `Fabric` via the same
lead-vs-client XOR pattern `Quotation` already established in Phase
1.1B. 6 new tables, 4 new enums, migration
`20260721100000_add_inventory_management`; full RLS on all 6. No design
guidance existed in `docs/product/` for this domain either. See
`apps/api/src/modules/inventory/README.md` and "Deferred to Phase 1.2B"
at the end.

Order Management & Checkout (**Milestone 8**) — the orchestration layer
that coordinates existing domains rather than reimplementing their
logic, and the most cross-module-dependent module in this arc. A new
`OrdersModule` (`apps/api/src/modules/orders/`) provides two
controller/service/repository triads — Customer (full CRUD) and Order
(create/update/cancel/get/list/change-status) — for `Customer`,
`CustomerAddress`, `Order`, `OrderItem`, `OrderStatusHistory`,
`PaymentRecord` (placeholder only, no service/controller/repository of
its own — the payment-gateway-integration milestone this one explicitly
defers). Same tenant-isolation/pagination/filtering/soft-delete/
`PermissionsGuard` conventions as every prior module (6 new permissions:
`customers:read`/`write`/`delete` + `orders:read`/`write`/`cancel` —
`cancel` is its own, stricter Admin+-only tier, replacing the usual
`delete` tier since Order has no delete endpoint). Imports THREE other
modules — `CatalogModule` (`ProductRepository`, "Validate product
variants"), `BespokeModule` (`ProductCustomizationRepository`, "Validate
bespoke customization"/"Validate pricing adjustments"), `InventoryModule`
(`InventoryService`, "Reserve inventory through InventoryService") —
one-directional, zero circular dependencies. Genuinely new capability
beyond every prior milestone's CRUD-only scope: `OrderService.create()`
validates customer/variant/customization/pricing BEFORE opening a
transaction (fail fast), then reserves inventory + creates
Order/OrderItems/initial `DRAFT` status history all inside ONE
`OrderRepository.runInTransaction()` call — the same `Prisma.TransactionClient`
is threaded into every `InventoryService` call (`reserveStockForOrder()`/
`releaseReservation()`/`consumeReservation()`, all now accepting an
optional/required `tx` parameter added this milestone), so an order's own
rows and its inventory side-effects commit or roll back together.
`changeStatus()`/`cancel()` both write the status update and its
`OrderStatusHistory` row in the same transaction — "No status mutation
without history," enforced structurally. `changeStatus()` only accepts
the single valid forward transition (`ORDER_FORWARD_TRANSITIONS`);
`CANCELLED` is reachable only via the separate `cancel()` endpoint, which
also releases every item's inventory reservation before marking the
order cancelled. Reaching `COMPLETED` consumes reservations via
`InventoryService.consumeReservation()` — the real caller Milestone 7's
own version of that method was built for but had no controller route to
reach yet. 6 new tables, 1 new enum, migration
`20260722090000_add_order_management`; full RLS on all 6 (verified live:
6/6 tables, 18/18 policies). See `apps/api/src/modules/orders/README.md`.

CRM & Customer Operations (**Milestone 9**) — "The CRM module owns
customer engagement and sales activities. It must not duplicate
customer, order, or authentication logic" (this milestone's own
framing). Architecture audit found `Lead` (plus `Client`/`ContactRequest`)
already fully modeled since Phase 1.1A with ZERO application-layer
consumers — this is its first real repository/service/controller, the
same situation Milestone 3 found for Role/Permission. A new `CrmModule`
(`apps/api/src/modules/crm/`) provides five controller/service/repository
triads — Lead, CustomerNote, CustomerActivity (read-only — "Timeline,
List" only, every row written internally), FollowUp, and CustomerTag (a
5th triad beyond this milestone's own named list, added because
`CustomerTag`/`CustomerTagAssignment` would otherwise be dead schema with
an unsatisfiable "Tags" filter — see `docs/implementation/decisions.md`).
Same tenant-isolation/pagination/filtering/soft-delete/`PermissionsGuard`
conventions as every prior module; reuses the ALREADY-EXISTING
`leads:read`/`leads:write` permissions (Phase 1.1B) rather than defining
new ones, only extending their grants (10 new permissions for the four
genuinely new entities: `customer_notes:*`/`follow_up_tasks:*`/
`customer_tags:*` [3 each] + `customer_activities:read` [1, no write —
every row written internally]). Imports ONE other module —
`OrdersModule` (now `exports: [CustomerRepository]`) — for "Use:
CustomerRepository," reusing it directly for "Convert Lead → Customer"
rather than duplicating customer-creation logic; one-directional, zero
circular dependencies. `Lead` gains two additive nullable columns only —
`convertedCustomerId` (→ the NEW `Customer`, Milestone 8's e-commerce
entity — a conversion path deliberately kept separate from the
pre-existing `convertedClientId` → `Client`, the agency's own B2B path)
and `leadSourceId` (→ new `LeadSource` lookup, additive alongside the
existing free-text `source` column). Genuinely new capability beyond
every prior milestone's scope: `LeadService.convert()` threads ONE
transaction across the `OrdersModule` boundary (the same shape
`domain-module-guide.md` §19 established for order creation) — finds-or-
creates a `Customer` (via new `CustomerRepository.findActiveByEmailInTx()`/
`createWithRelationsInTx()` tx-taking variants), updates the Lead's own
status, and writes a `LEAD_CONVERTED` `CustomerActivity`, all atomically.
`CustomerActivity` (the customer engagement timeline — "Timeline
remains append-only," no `updatedAt`/soft-delete/version, same shape
`InventoryTransaction`/`OrderStatusHistory` already established) has a
NULLABLE `customerId` — "lead creation" fires before any Customer
exists, so that trigger's own row is anchored by `relatedLeadId` alone;
caught and fixed before any code depended on the wrong (required)
shape — see decisions.md. `FollowUpTask` targets EITHER a `Lead` OR a
`Customer` via the same lead-vs-client XOR pattern `Quotation`/
`InventoryItem` already established, extended to a lead-vs-customer
choice. 6 new tables, 2 new enums, plus 2 additive columns + 1 new enum
value on the existing `leads` table; migration
`20260722100000_add_crm_customer_operations`; full RLS on all 6
(verified live: 6/6 tables, 18/18 policies). See
`apps/api/src/modules/crm/README.md`.

Payments & Billing Foundation (**Milestone 10**) — "This module owns
financial records only. It must not become a payment gateway
implementation" (this milestone's own framing). Architecture audit found
`Invoice`/`InvoiceItem`/`Payment`/`Quotation`/`QuotationItem` already
fully modeled since Phase 1.1A/1.1B with ZERO application-layer
consumers — notably, the existing schema had ALREADY anticipated two of
this milestone's own business rules at the database level:
`invoices_amount_paid_check` (already enforcing "Paid amount never
exceeds invoice total") and `payments` already having `UPDATE`/`DELETE`
revoked at the database-privilege level (already enforcing append-only
records), both from Phase 1.1A/1.1B, before any application code
existed. A new `BillingModule` (`apps/api/src/modules/billing/`)
provides three controller/service/repository triads — Invoice, Payment,
Tax. Same tenant-isolation/pagination/filtering/soft-delete/
`PermissionsGuard` conventions as every prior module; reuses the
ALREADY-EXISTING `invoices:read`/`invoices:write`/`payments:read`
permissions (Phase 1.1B) rather than defining new ones (6 new
permissions: `invoices:void`/`payments:refund` [Admin+-only, mirroring
Milestone 8's own `orders:cancel`], `payments:write`, `tax_rates:read`/
`write`/`delete`). Imports TWO other modules — `OrdersModule` (now
`exports: [CustomerRepository, OrderRepository]`) for "Invoices belong
to Orders," and `CatalogModule` (exported `ProductRepository`) to
resolve invoice line-item descriptions from the originating order line's
own product variant SKU; deliberately does NOT import `CrmModule` —
"CRM remains independent," this milestone's own explicit instruction.
`Invoice`/`Payment` are reused wholesale but genuinely extended, not
left untouched: `Invoice.clientId` (the pre-existing, still-unconsumed
agency-billing path → `Client`) relaxed to nullable, gaining NEW
`customerId`/`orderId` (→ Milestone 8's `Customer`/`Order`) and
`taxRateId` — the same "two independent paths on one shared entity"
pattern Milestone 9 established for `Lead.convertedCustomerId` vs.
`convertedClientId`. `Payment.invoiceId`/`provider`/`providerRef` (the
pre-existing gateway-webhook-event shape) relaxed to nullable, gaining
NEW `paymentMethodId`/`method`/`reference` for this milestone's own
manually-RECORDED-payment flow — "Record payment" and "Allocate
payment" are separate business responsibilities specifically so a
payment can exist before it's tied to any invoice; the new
`PaymentAllocation` table is the actual invoice-by-invoice ledger,
used even for the common single-invoice case. Genuinely new capability:
`PaymentService.record()`/`allocate()` both re-verify "Payment
allocations cannot exceed payment amount" and "Paid amount never
exceeds invoice total" inside the SAME transaction as the
`PaymentAllocation` write, flipping the invoice to `PAID` automatically
once `amountPaid` reaches `totalAmount`. `PATCH /invoices/:id` ("Update
draft invoice") was added beyond this milestone's own literal
"Controllers" list — the same "don't leave a named Service capability
permanently unreachable" reasoning already applied to `LEAD_CREATED`'s
own reachability gap in Milestone 9. `TaxRateController` is full CRUD;
`PaymentMethod` gets none (same asymmetry class as Milestone 9's
`CustomerTag`/`LeadSource` — `Payment.method`'s own free-text fallback
already satisfies everything a `PaymentMethod` write path would). 3 new
tables, plus additive changes to the existing `invoices`/`payments`
tables; migration `20260722110000_add_payments_billing_foundation`;
full RLS on all 3 new tables (verified live: 3/3 tables, 9/9 policies),
with `payment_allocations` getting the same database-privilege-level
`UPDATE`/`DELETE` revoke `payments` already has. See
`apps/api/src/modules/billing/README.md`.

Admin Platform, Analytics & Notifications (**Milestone 11**) — "This
module provides operational visibility. It does not own business
transactions" (this milestone's own framing), and the most cross-module-
dependent module in this arc. Architecture audit found `Notification`/
`AuditLog` already fully modeled since Phase 1.1B with ZERO application-
layer consumers — the same "schema exists, first real consumer"
situation Milestones 3/9/10 already found; `AuditLog` needed zero schema
changes (pure reuse), `Notification` gained an additive DELIVERY-state
lifecycle (`status`/`sentAt`/`failedAt`/`retryCount`/`lastError` — the
pre-existing model only tracked recipient interaction). A new
`AdminModule` (`apps/api/src/modules/admin/`) provides four controller/
service/repository triads — Notification, Audit (covering BOTH
`AuditLog` and the new `SystemEvent`, the same "one repository, two
line-item-shaped entities" precedent `PaymentRepository`/
`PaymentAllocation` established), Dashboard, Report. Same tenant-
isolation/`PermissionsGuard` conventions as every prior module; reuses
the ALREADY-EXISTING `audit_logs:read` permission (Phase 1.1B, never
granted beyond Admin/Super Admin — zero seed changes needed) but
deliberately does NOT reuse the pre-existing `notifications:read` (a
narrower, differently-scoped "view own notifications" key never meant
for this milestone's admin-wide surface — reusing it would have over-
granted Sales/Client/Customer); 4 new permissions instead
(`notifications:manage`, `dashboard:read`, `reports:read`/`write`).
Imports FIVE other modules — `OrdersModule` (`OrderRepository`),
`InventoryModule` (`InventoryService`), `BillingModule`
(`InvoiceRepository`), `CrmModule` (`LeadRepository`/
`FollowUpRepository`), `CatalogModule` (`ProductRepository`) — one for
each of this milestone's own named analytics targets (Orders/Inventory/
Billing/CRM) plus a 5th, `catalog` (published product count), added so
`DASHBOARD_KPI_MODULES`'s own literal module list has no
named-but-unimplemented entry; one-directional, zero circular
dependencies. `DashboardService` computes one KPI summary per aggregated
module by reaching ONLY the already-exported artifact of each source
module — a repository where that's what's exported, a service where
only the service is exported — "Never duplicate calculations already
available elsewhere" (this milestone's own explicit instruction, also
governing `ReportingService`, which computes its own snapshots via the
SAME `DashboardService.getKpis()` call rather than a second aggregate
implementation). `notification.retry()` is the one publicly-routed
mutation this milestone builds (`create()`/`queue()`/`markSent()`/
`markFailed()` stay real, tested, and route-less — the same "no route
because no real caller exists yet" precedent Milestone 7's own
`consumeReservation()` established) — it also records an `AuditLog`
entry for itself, satisfying CLAUDE.md's own non-negotiable audit-
logging rule for this milestone's one real mutation-with-a-route. 4 new
tables (`NotificationTemplate`, `SystemEvent`, `DashboardWidget`,
`ScheduledReport`), plus additive changes to the existing `notifications`
table; migration
`20260722120000_add_admin_platform_analytics_notifications`; full RLS
on all 4 new tables (verified live: 4/4 tables, 12/12 policies), with
`system_events`/`scheduled_reports` getting the same database-privilege-
level `UPDATE`/`DELETE` revoke `payments`/`audit_logs`/
`payment_allocations` already have. See
`apps/api/src/modules/admin/README.md`.

Performance Engineering (**Milestone 12**) — no new business module, no
feature/API/schema changes; a full audit-then-optimize pass across every
module named in this milestone's own brief (Auth/Authz/Multi-Tenant/
Catalog/Bespoke/Inventory/Orders/CRM/Billing/Admin). Full audit + every
optimization decision (including findings deliberately left unfixed, and
why): `docs/architecture/performance.md`. Highlights: two genuine N+1s
batched (`ProductRepository.findVariantsByIds()`/`findExistingIds()`, new,
consumed by `InvoiceService.createFromOrder()`/`OrderService.create()`/
`FabricService`); `InventoryRepository`'s own Milestone 11 "Stock
valuation"/"Low stock items" analytics rewritten from `findMany()` +
application-code reduce/filter to single `$queryRaw` aggregate/filtered
queries, backed by one new hand-written partial index (migration
`20260722130000_add_performance_indexes`); a new `CacheService`
(`apps/api/src/cache/`, `@Global()`) fronting `AuthorizationService`'s own
per-request role/permission resolution with a 60s cross-request TTL cache
— the first genuinely new infra module since `TenantModule` (Milestone 4);
response compression (`compression` middleware) and a new opt-in
`@CacheControl()`/`CacheControlInterceptor` pair (the first real content in
the previously-placeholder `common/interceptors/`), applied to Category/
Collection/Product `GET` routes; ETag/conditional-GET confirmed already
present via Express's own default behavior, zero code needed;
`PrismaService` now logs per-query duration (`debug`) and slow queries
(`warn`, >100ms) via Prisma's own `$on('query', ...)` event; 
`HttpLoggingMiddleware` now also logs slow requests (`warn`, >1000ms);
`PerformanceLogger` (built Phase 1.2C.7, zero real call sites until now)
wraps `DashboardService.overview()`. Reproducible `autocannon` benchmarks
(`apps/api/benchmarks/run-benchmarks.js`) covering login/catalog/orders/
dashboard/billing/CRM, run against both a development- and a
production-mode boot — full results in `performance.md` §8. 155 suites/883
tests (up from 153/858 at the end of Milestone 11), zero regressions, zero
API-breaking changes.

Security Hardening (**Milestone 13**) — no new business module, no
feature/API/schema changes; a full security audit across every layer named
in this milestone's own brief (Configuration/HTTP/Authentication/
Authorization/Multi-Tenant/Validation/Database/Logging/Error-Handling/
Dependencies), with every finding — fixed or deliberately deferred —
documented in the new `docs/architecture/security.md`. Real gaps closed:
Helmet security headers (explicit CSP `default-src 'none'`, CORP
`same-origin`, everything else Helmet's own defaults) registered first in
the bootstrap chain; CORS (`app.enableCors()`) wired to the already-
validated-but-previously-unused `CORS_ALLOWED_ORIGINS` env var, explicit
allowlist, `credentials: false`; app-wide rate limiting
(`@nestjs/throttler`, in-memory, no Redis — this milestone's own explicit
constraint) via `ThrottlerModule.forRootAsync()` driven by the already-
validated `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX` env vars, plus a stricter
hardcoded 5-attempts/60s override on `POST /auth/login`; explicit request
body-size limiting (`NestFactory.create(AppModule, { bodyParser: false })` +
manual `json()`/`urlencoded()` with a fixed `'256kb'` string literal,
deliberately never computed/env-driven — the exact shape the `body-parser`
CVE this milestone's own dependency audit found requires to stay
unreachable); JWT signing/verification explicitly pinned to `HS256`
(`TokenService`, defense in depth beyond `jsonwebtoken`'s own already-safe
defaults, proven by a new regression test using a correctly-secreted-but-
wrong-algorithm HS384 token); audit-trail logging for login/failed-login/
token-refresh (`AuthService`) and permission/role denial (`RolesGuard`/
`PermissionsGuard`), wired into the pre-existing, previously-unused
`AUDIT_LOGGER` structured-log mechanism specifically to avoid a backwards
dependency from cross-cutting auth/authz code onto the architecturally-
downstream `AdminModule` (which owns the separate, DB-persisted `AuditLog`
table) — the two audit mechanisms remain intentionally distinct, documented
in `security.md` §9 rather than unified, since unifying them would be a
real architectural change outside this milestone's "no domain-model
redesign" scope. `pnpm audit` (16 findings — 3 high, 9 moderate, 4 low) was
triaged finding-by-finding for actual reachability in this app's runtime
code, not just tree presence — zero were found reachable; two low-risk
findings (`multer`, `lodash`) fixed via `pnpm.overrides`, the rest
deliberately deferred with reasoning (dev-only tooling, build-time-only, or
already independently mitigated) — full table in `security.md` §11. Error-
response safety was verified against the actual installed
`BaseExceptionFilter`/Prisma error-class source rather than assumed. 155
suites/893 tests (up from 155/883 at the end of Milestone 12 — 10 new
tests), zero regressions, zero API-breaking changes, live boot with zero DI
issues, and a 13-check live smoke test covering headers/CORS/JWT
rejection/RBAC/tenant-isolation/request-limits/validation/error-handling/
sensitive-data-leakage, all passing. Full audit report, threat model, OWASP
Top 10 mapping, and remaining accepted risks: `docs/architecture/security.md`.

Production Infrastructure, DevOps & Deployment (**Milestone 14**) — "This
milestone completes the backend" (this milestone's own framing); no new
business module, no business-logic/schema/breaking-API changes. A full
production-readiness audit (Configuration/Deployment/Docker/CI-CD/Logging/
Observability/Health/API-docs/Startup/Shutdown/Runtime-validation/
Background-jobs/Release/Backup/Rollback) found several genuinely
placeholder or drifted pieces and made them real. Configuration:
`env.validation.ts` gained cross-field production-safety checks (a
`.superRefine()` layered on the existing per-field schema) — Swagger can't
be enabled in production without a deliberate second opt-in
(`SWAGGER_ALLOW_IN_PRODUCTION`), `DATABASE_SSL` must be `true` in
production, and the exact `.env.example` placeholder JWT secrets are
rejected in production — plus a duplicate-config-namespace assertion in
`ConfigModule`. OpenAPI/Swagger: `@nestjs/swagger` (v7, the Nest-10-
compatible line) wired into `main.ts`, gated behind
`swaggerCfg.enabled`; DTO/response schemas come from the CLI plugin
(`nest-cli.json`, introspecting class-validator decorators and TS types at
compile time — confirmed live that real constraints like `minLength`
appear in the generated schema) rather than hand-written `@ApiProperty()`
annotations; every protected controller (25 files, one bulk scripted pass)
got `@ApiTags()`/`@ApiBearerAuth('bearer')`; `AuthController`
deliberately did not (its routes are unauthenticated). Health checks:
new `HealthModule` — `GET /health/{live,ready,startup}`, unauthenticated,
`@SkipThrottle()`d, deliberately excluded from both the global `/api`
prefix and URI versioning (`VERSION_NEUTRAL` + `setGlobalPrefix`'s own
`exclude` option) so infrastructure probe configuration never needs
updating on an API version bump — `ready`/`startup` call
`PrismaService.isHealthy()` (built Milestone 12, its first real caller
here, the same "build the capability, wire it up later" pattern this
codebase keeps repeating). Observability: correlation ids were already
fully threaded through every internal log call via `RequestContextService`
(confirmed by reading the actual source, not assumed) — the one real gap
was that `X-Request-Id`/`X-Correlation-Id` were never echoed back to the
caller; now they are, set synchronously in `HttpLoggingMiddleware` before
`next()`. Explicit startup/shutdown log lines added around `main.ts`'s own
bootstrap and `enableShutdownHooks()`. Background job infrastructure: new
`apps/api/src/jobs/` — `Job<T>`/`JobContext`/`JobResult`/`JobStatus`
interfaces, `JobRunner` (in-process, exponential-backoff retry, a
`DEAD_LETTER_STORE` swap-point token with `InMemoryDeadLetterStore` the
one real implementation) — infrastructure only, zero scheduled jobs, zero
Redis/BullMQ/RabbitMQ, per this milestone's own explicit constraint.
Runtime validation: new `GET /runtime` (`AdminModule`, gated by a new
`system:read` permission — Admin/Super Admin only, same tier
`audit_logs:read` already established) surfaces `APP_VERSION`/
`GIT_COMMIT_SHA` (CI/Docker-stamped, never introspected from
`package.json` — a build-layout-independent value), `nodeEnv`,
`uptimeSeconds`, and live database connectivity. Docker: found and fixed a
real, previously-undetected bug in `infrastructure/docker/api.Dockerfile`'s
`runtime` stage (`CMD` pointed at `dist/main.js`, which has never
existed — the same `dist/src/` bug `apps/api/package.json`'s own `start`
script already had fixed during Phase 1's audit, silently reintroduced
here and never caught because nothing had run this image's `runtime` stage
end to end before); added a non-root user and a real `HEALTHCHECK` against
`/health/live`; new root `.dockerignore` (keeps secrets and rebuildable
artifacts out of the build context) and `docker-compose.prod.yml` (a
genuinely production-shaped compose stack, distinct from the existing
dev-oriented root `docker-compose.yml`). CI: extended the existing
`ci.yml` with a build-artifact upload, a new `migration-validation` job
(a real, throwaway Postgres service container — every existing test suite
mocks its repositories, so no prior CI job ever exercised a real
migration), and a new `docker-build` job. Full validation: `pnpm lint`/
`typecheck`/`build`/`test` all clean (162 suites/929 tests, up from
155/893 at the end of Milestone 13 — 7 new suites), zero regressions,
`pnpm audit` grew from 16 to 20 findings (two new `js-yaml`/one new
`@hono/node-server` findings from the new `@nestjs/swagger` dependency,
all confirmed unreachable via the same reachability discipline Milestone
13 established — see `security.md` §14), live boot confirmed clean DI,
and a live smoke test covering health endpoints, Swagger UI/JSON
generation (including real DTO schema introspection), correlation-id
echo, versioned-vs-unversioned routing, and the runtime endpoint's auth
gate, all passing. Full detail: `docs/architecture/deployment.md` (new),
`environment.md` (new), `runbook.md` (new), `release.md` (new).

## 1. Folder structure

```
apps/api/src/
  main.ts              Bootstrap: prefix, versioning, shutdown hooks, listen.
                         Also resolves HttpLoggingMiddleware from the DI
                         container and attaches it via raw app.use()
                         (Phase 1.2C.5) — see "common/" below for why not
                         via NestModule.configure().
  app.module.ts         Root module — imports ConfigModule/LoggingModule;
                         providers: [HttpLoggingMiddleware (DI-resolvable
                         for main.ts's app.get(), not consumed by anything
                         else in this module), { provide: APP_FILTER,
                         useClass: ExceptionLoggingFilter } (Phase 1.2C.6
                         — Nest's own DI-native global-filter mechanism,
                         no main.ts involvement needed)]; future business
                         modules attach here.
  config/                Per-domain configuration architecture — full detail
                          in docs/architecture/configuration.md. 8 domains
                          are real (app, database, security, logging,
                          swagger, health, cache, queue — Phase 1.2B.1/
                          1.2B.3); 10 remain placeholders (auth, storage,
                          email, notifications, payments, ai, search,
                          analytics, feature-flags, monitoring) — all
                          third-party product/vendor integrations that
                          don't exist yet.
  common/                Cross-cutting concerns:
    filters/                exception-logging.filter.ts (Phase 1.2C.6) —
                            ExceptionLoggingFilter extends
                            BaseExceptionFilter, registered via APP_FILTER.
                            Logs every unhandled exception via LOGGER
                            (HttpException/AggregateError/Error/non-Error
                            all handled safely, never throws), then
                            delegates to super.catch() — Nest's default
                            HTTP response is unchanged. NOT the RFC 9457
                            error-shape filter (still separate, unscheduled
                            work — see main.ts's bootstrap comment).
    interceptors/           cache-control.interceptor.ts (Milestone 12) —
                            CacheControlInterceptor, the first real content
                            here. Registered globally via APP_INTERCEPTOR;
                            reads @CacheControl(maxAgeSeconds) metadata
                            (common/decorators/cache-control.decorator.ts)
                            and, only when present, sets
                            Cache-Control: private, max-age=<n> — every
                            unannotated route is untouched. Response
                            shaping / trace_id propagation (CONTRIBUTING.md
                            §15) remains unscheduled.
    guards/                 jwt-auth.guard.ts (Milestone 2) — JwtAuthGuard,
                            a hand-written CanActivate (not Passport):
                            verifies the Authorization: Bearer header
                            exclusively via TokenService.verifyAccessToken()
                            and attaches a frozen, minimal RequestUser
                            ({ email }) to request.user. Applied per-route
                            via @UseGuards(), not globally.
                            roles.guard.ts/permissions.guard.ts (Milestone
                            3) — RolesGuard/PermissionsGuard, reading
                            @Roles()/@Permissions() metadata via Reflector
                            and delegating to AuthorizationService
                            (apps/api/src/authorization/); never verify a
                            JWT, never return 401 (JwtAuthGuard's exclusive
                            job — guard-array ordering,
                            @UseGuards(JwtAuthGuard, RolesGuard), is
                            trusted, not re-checked). Since Milestone 4,
                            both also read request.tenantContext
                            (TenantMiddleware, apps/api/src/tenant/) and
                            pass tenantId to AuthorizationService, which
                            resolves within that specific tenant. See
                            apps/api/src/common/guards/README.md.
    decorators/             current-user.decorator.ts (Milestone 2) —
                            CurrentUser, a createParamDecorator() reading
                            the RequestUser JwtAuthGuard already attached
                            to request.user.
                            roles.decorator.ts/permissions.decorator.ts
                            (Milestone 3) — Roles()/Permissions(),
                            SetMetadata()-based, metadata only, no
                            authorization logic.
                            tenant.decorator.ts/organization.decorator.ts
                            (Milestone 4) — Tenant()/Organization(),
                            reading request.tenantContext/
                            request.organizationContext (TenantMiddleware,
                            apps/api/src/tenant/) — resolve on ANY route,
                            not just JwtAuthGuard-protected ones (e.g. the
                            unguarded POST /auth/login). See
                            apps/api/src/common/decorators/README.md.
    pipes/                  validation-pipe.options.ts (Phase 1.2D.5) —
                            VALIDATION_PIPE_OPTIONS (whitelist: true,
                            transform: true), registered globally via
                            app.useGlobalPipes() in main.ts — not a
                            per-controller/per-route pipe, and not an
                            APP_PIPE provider (ValidationPipe needs no
                            injected dependencies, so the simpler
                            main.ts registration loses nothing).
    dto/                    pagination-query.dto.ts/paginated-response.dto.ts
                            (Milestone 5, the first real content here) —
                            PaginationQueryDto/PaginatedResponseDto<T>,
                            shared because Category/Collection/Product
                            list endpoints all needed the identical shape
                            simultaneously (a genuine 3-way consumer, not
                            anticipation). Only DTOs genuinely shared
                            across more than one business module belong
                            here.
    middleware/             http-logging.middleware.ts (Phase 1.2C.5) — the
                            first real content here. Generates requestId/
                            correlationId (reusing incoming x-request-id/
                            x-correlation-id headers when present),
                            establishes a RequestContext via
                            RequestContextService.run(), logs one
                            structured completion entry via LOGGER per
                            request. Registered in main.ts via app.use(),
                            NOT NestModule.configure() — confirmed by
                            direct testing that MiddlewareConsumer.
                            forRoutes('*') scopes matching to
                            app.setGlobalPrefix()'s prefix, silently
                            missing any unprefixed route (e.g. the future
                            /health endpoint). app.use() runs for every
                            request regardless of prefix. Contrast
                            tenant/middleware/tenant.middleware.ts
                            (Milestone 4), which deliberately DOES use
                            MiddlewareConsumer/NestModule.configure() —
                            that middleware needs its thrown
                            BadRequestException to reach Nest's own
                            exception-filter pipeline (confirmed live), a
                            concern this one never has since it never
                            throws.
  database/              PrismaService/DatabaseModule (Phase 1.2D.2) — the
                          single database access layer. PrismaService
                          extends the generated PrismaClient (Prisma 7
                          driver-adapter pattern, @prisma/adapter-pg's
                          PrismaPg built from the validated `database`
                          config namespace, never process.env directly);
                          connects AND runs a real SELECT 1 in
                          onModuleInit() (fail-fast — $connect() alone
                          doesn't validate anything against a lazy
                          @prisma/adapter-pg pool, found live during the
                          1.2D.2 review), disconnects in
                          onModuleDestroy() (fires on main.ts's existing
                          app.enableShutdownHooks());
                          isHealthy() is a plain SELECT 1 liveness check
                          with no current caller yet. Milestone 12
                          (Performance Engineering) added query-duration
                          instrumentation: constructed with
                          log: [{ emit: 'event', level: 'query' }], then
                          $on('query', ...) logs every query at debug
                          (Prisma's own measured duration, not hand-rolled
                          timing) and anything over 100ms additionally at
                          warn — see performance.md §6. DatabaseModule is
                          @Global() (matches ConfigModule/LoggingModule),
                          exports PrismaService only. base.repository.ts
                          (Phase 1.2D.3) — BaseRepository<TDelegate>, the
                          generic findOne/findMany/create/update/delete
                          abstraction every future domain repository
                          extends (see domain-module-guide.md §16);
                          depends only on the delegate passed to its
                          constructor, never on PrismaService directly.
                          No domain-specific repositories live here — no
                          transactions, no query builders, no caching, no
                          business logic. Distinct from apps/api/prisma/
                          (schema/migrations/seed, untouched by this
                          phase). Full detail:
                          apps/api/src/database/README.md.
  jwt/                    TokenService/TokenModule (Phase 1.2D.6) — the
                          JWT infrastructure layer. config/jwt.config.ts
                          assembles the `jwt` namespace (accessSecret,
                          accessTokenTtl, refreshSecret, refreshTokenTtl)
                          from the newly-validated JWT_ACCESS_SECRET/
                          JWT_ACCESS_TOKEN_TTL/JWT_REFRESH_SECRET/
                          JWT_REFRESH_TOKEN_TTL env vars, registered via
                          ConfigModule.forFeature() inside
                          token.module.ts (not the frozen
                          config.module.ts — same graduation path
                          logging/config/logger-options.config.ts
                          established). Distinct from
                          apps/api/src/config/auth/, which stays an
                          unvalidated placeholder for managed IdP
                          settings. TokenModule is @Global() (matches
                          ConfigModule/LoggingModule/DatabaseModule) and
                          named TokenModule, not JwtModule — @nestjs/jwt's
                          own JwtModule (configured here via
                          registerAsync(), with the access token's
                          secret/expiration as the default signOptions)
                          already has that name; reusing it produced two
                          identical "JwtModule dependencies initialized"
                          boot log lines, caught live and fixed. Same
                          reasoning for TokenService (not JwtService —
                          also already @nestjs/jwt's name), which wraps
                          it with signAccessToken/signRefreshToken/
                          verifyAccessToken/verifyRefreshToken —
                          genuinely functional, round-trip-tested, using
                          different secrets per token type — but not
                          called from any controller or service yet.
                          Full detail:
                          apps/api/src/jwt/README.md.
  password/               PasswordService/PasswordModule (Phase 1.2D.7) —
                          the Argon2id password-hashing infrastructure
                          layer. config/hash.config.ts assembles the
                          `hash` namespace (memoryCost, timeCost,
                          parallelism) from the newly-validated
                          HASH_MEMORY_COST/HASH_TIME_COST/
                          HASH_PARALLELISM env vars, registered via
                          ConfigModule.forFeature() inside
                          password.module.ts (not the frozen
                          config.module.ts — same graduation path
                          jwt/config/jwt.config.ts established). Named
                          `hash`, not `password`: this is Argon2
                          algorithm tuning, not password business policy.
                          PasswordModule is @Global() (matches
                          ConfigModule/LoggingModule/DatabaseModule/
                          TokenModule), exports PasswordService only.
                          Uses @node-rs/argon2 (napi-rs bindings), not
                          the `argon2` npm package — the latter requires
                          a node-gyp/Visual Studio C++ toolchain to
                          compile from source and had no prebuilt binary
                          for this environment, confirmed live when
                          `pnpm add argon2` failed; @node-rs/argon2 ships
                          a prebuilt native binary. PasswordService wraps
                          it with hash(plaintext)/compare(plaintext,
                          hashed) — genuinely functional, round-trip-
                          tested, random salt per call confirmed live —
                          but not called from any controller or service
                          yet. The Argon2 variant is hardcoded to
                          argon2id (not config-driven), the same
                          treatment already applied to the JWT signing
                          algorithm (HS256). Full detail:
                          apps/api/src/password/README.md.
  authorization/          AuthorizationModule/AuthorizationService
                          (Milestone 3) — RBAC infrastructure, @Global(),
                          mirroring jwt/'s and password/'s exact
                          precedent. repositories/role.repository.ts /
                          permission.repository.ts query the
                          already-existing Role/Permission/UserRole/
                          RolePermission schema (Phase 1.1A, unchanged —
                          no migration this milestone). Since Milestone
                          4, tenant-scoped via a plain tenantId method
                          parameter (no longer a constructor-injected
                          config value — see tenant/ below). resolves by
                          email (not a new JWT claim), caches only within
                          the single request that resolved it via
                          request.authorizationCache — never as its own
                          instance state (it's a singleton). Milestone 12
                          added a SECOND, cross-request cache layer
                          underneath the per-request one — CacheService
                          (cache/, above), 60s TTL, keyed by tenant+email —
                          checked only on a per-request-cache miss; the
                          per-request layer itself is unchanged. Exports
                          AuthorizationService only. Full detail:
                          apps/api/src/authorization/README.md.
  cache/                  CacheService/CacheModule (Milestone 12 —
                          Performance Engineering) — application-level
                          caching infrastructure, @Global(), mirroring
                          jwt/'s and password/'s exact precedent. A single
                          process-local, in-memory Map, lazily expired on
                          read (no background sweep timer — no
                          onModuleDestroy cleanup needed). get()/set()/
                          delete()/deleteByPrefix()/clear()/getOrLoad()
                          (the read-through entry point most callers use).
                          Explicitly not a distributed cache (no Redis) —
                          only for read-mostly reference/config data,
                          never mutable transactional state. First real
                          consumer: authorization/ (below), fronting
                          role/permission resolution with a 60s
                          cross-request TTL. Full detail:
                          apps/api/src/cache/README.md.
  tenant/                 TenantModule/TenantResolver (Milestone 4 —
                          Organization & Multi-Tenant Foundation) —
                          multi-tenant resolution infrastructure. NOT
                          @Global() (unlike jwt/password/authorization) —
                          nothing injects TenantResolver/
                          OrganizationRepository directly; every consumer
                          reads request.tenantContext/
                          request.organizationContext instead. Registers
                          TenantMiddleware application-wide via its own
                          NestModule.configure() (not main.ts's app.use()
                          pattern — see common/middleware/ above).
                          repositories/organization.repository.ts wraps
                          the already-existing Tenant model ("Organization"
                          is this milestone's name for it — no new
                          entity). config/default-tenant.config.ts —
                          relocated here from modules/auth/config/, now
                          the development-only fallback source only. Full
                          detail: apps/api/src/tenant/README.md.
  health/                 PLACEHOLDER — liveness/readiness endpoints.
  logging/                A real Logger is bound and producing JSON
                          console output (Phase 1.2C.3): `LoggerService`
                          (LOGGER token) reads `loggerOptions.level` for
                          filtering, writes through `ConsoleLogTransport`,
                          which formats via `JsonLogFormatter` — formatter/
                          transport swappable via their own DI tokens.
                          `RequestContextService` (Phase 1.2C.4) adds
                          AsyncLocalStorage-backed request context that
                          `LoggerService` automatically merges into every
                          LogEntry when active. `common/middleware/
                          http-logging.middleware.ts` (Phase 1.2C.5) is
                          the first real caller of `.run()` — every HTTP
                          request now gets one structured completion log.
                          `common/filters/exception-logging.filter.ts`
                          (Phase 1.2C.6) logs every unhandled exception the
                          same way, automatically getting the same
                          RequestContext with zero extra wiring.
                          `PerformanceLogger` (Phase 1.2C.7) — startTimer/
                          endTimer/measure/measureAsync — times arbitrary
                          operations the same way, with no current call
                          site yet (no instrumentation/decorators —
                          out of scope). `AuditLoggerService` (Phase
                          1.2C.8) is bound to `AUDIT_LOGGER` —
                          foundation only, no persistence, no business-
                          module call sites yet. Full architecture:
                          apps/api/src/logging/README.md. Usage examples
                          and best practices:
                          docs/architecture/logging-guide.md (Phase 1.2C.9).
  modules/                One folder per business module (scaffolded
                          Phase 0) plus the Phase 1.2D.1 reference
                          template:
    auth/                  First real business module (Phase 1.2D.4;
                          real token issuance since Phase 1.2D.8; real
                          refresh verification since Phase 1.2D.9;
                          stateless rotation formalized Phase 1.2D.10;
                          real database-backed authentication since
                          Milestone 1) — `AuthModule` → `AuthController`
                          (`POST /auth/login`, `/refresh`, `/logout`) →
                          `AuthService` (depends on `AuthRepository`,
                          `TokenService`, `PasswordService` — never
                          `PrismaService` directly) → `AuthRepository
                          extends BaseRepository<PrismaService['user']>`.
                          `login(dto, tenant)` (Milestone 1, tenant-
                          parameterized since Milestone 4) is real end to
                          end: `AuthRepository.findActiveByEmail(email,
                          tenantId)` (tenant-scoped by the caller-
                          supplied, request-resolved `tenantId` —
                          `@Tenant()`, `apps/api/src/tenant/` — a fixed
                          `defaultTenant` config stopgap through
                          Milestone 3, real resolution since — case-
                          insensitive, excludes soft-deleted rows) →
                          `PasswordService.compare()` against the found
                          user's `passwordHash` → `401` for no such user,
                          no password set (IdP-only account), or wrong
                          password, all identical → on success, signs a
                          minimal `{ email }` payload
                          (`mappers/auth-token-payload.mapper.ts` →
                          `types/auth-token-payload.type.ts`) built from
                          the verified `user.email`, not the raw request
                          input. `refresh()` (unchanged by this
                          milestone) verifies the submitted refresh token
                          via `TokenService.verifyRefreshToken()` and
                          reissues a fresh pair (rebuilding a clean
                          payload via `reissueAuthTokenPayload()`); any
                          verification failure is caught and rethrown as
                          a single `UnauthorizedException` (`401`),
                          deliberately undifferentiated. `logout()` still
                          returns `{ status: 'not_implemented' }`.
                          `prisma/schema.prisma`'s `User` model gained a
                          nullable `passwordHash` column this milestone
                          (`idpSubject` became nullable too — the
                          original schema was IdP-only); see
                          `docs/implementation/decisions.md` for the
                          full rationale and the hand-written migration
                          note (Prisma's auto-diff proposed re-adding a
                          plain unique index that would have collided
                          with the existing case-insensitive partial
                          one — caught and dropped before applying).
                          dto/, constants/, repositories/, types/,
                          mappers/, config/ have real content; entities/,
                          interfaces/, exceptions/, validators/ are
                          documented placeholders, matching
                          `example-domain/`'s precedent.
                          constants/role.constant.ts /
                          permission.constant.ts (Milestone 3) — ROLE/
                          PERMISSION key constants for real code (e.g.
                          example-domain's @Roles()/@Permissions() calls)
                          to reference instead of a raw string; not an
                          exhaustive mirror of the seeded catalog —
                          lookup stays database-driven. AuthModule no
                          longer imports ConfigModule.forFeature(
                          defaultTenantConfig) (Milestone 4 — relocated,
                          see tenant/ above); AuthService/AuthRepository
                          are otherwise unchanged since Milestone 3 — the
                          real RBAC infrastructure lives in the
                          authorization/ module instead (see above). Full
                          detail: apps/api/src/modules/auth/README.md.
    content/ projects/     PLACEHOLDER, unchanged this phase. (`billing/`
                          and `crm/` are real as of Milestones 9/10 — see
                          below; the `notifications/` scaffold this line
                          used to list was an empty, never-implemented
                          placeholder, removed in Milestone 11 once the
                          real `Notification` feature landed under
                          `admin/` instead.)
    catalog/               Product Catalog Foundation (Milestone 5) —
                          CatalogModule: CategoryController/Service/
                          Repository, CollectionController/Service/
                          Repository, ProductController/Service/
                          Repository (the richer of the three — nested
                          variant/image creation, cross-tenant
                          categoryId/collectionId validation). Full REST
                          CRUD, PermissionsGuard-protected
                          (categories:*/collections:*/products:*),
                          tenant-isolated, paginated, filterable,
                          soft-delete-aware. Full detail:
                          apps/api/src/modules/catalog/README.md.
    bespoke/                Bespoke Customizer Engine (Milestone 6) —
                          BespokeModule: FabricController/Service/
                          Repository, MeasurementProfileController/
                          MeasurementService/MeasurementRepository (targets
                          MeasurementProfile as aggregate root — see the
                          module's own README "Naming note"),
                          StyleOptionController/Service/Repository,
                          ProductCustomizationController/Service/
                          Repository (the richer of the four — nested
                          style-option-group/style-option creation,
                          cross-product style-option validation, no
                          Delete route). Imports CatalogModule for
                          ProductRepository. Full REST CRUD (Product
                          Customization: no delete),
                          PermissionsGuard-protected
                          (fabrics:*/measurement_profiles:*/
                          style_options:*/product_customizations:read+write),
                          tenant-isolated, paginated, filterable,
                          soft-delete-aware. Full detail:
                          apps/api/src/modules/bespoke/README.md.
    inventory/               Inventory & Stock Management (Milestone 7) —
                          InventoryModule: WarehouseController/Service/
                          Repository (full CRUD, "no active inventory"
                          delete guard), InventoryController/Service/
                          Repository (domain-specific stock operations —
                          receive/adjust/reserve/release; no plain
                          create/delete; transactional stock math via
                          $transaction callbacks + atomic increment/
                          decrement), SupplierController/Service/
                          Repository (full CRUD, nested SupplierProduct).
                          Imports NOTHING — the only module in this arc
                          with zero cross-module imports; validates its
                          ProductVariant/Fabric references via direct
                          existence-check methods instead. Full REST CRUD
                          (Inventory: no delete), PermissionsGuard-
                          protected (warehouses:*/inventory:read+write/
                          suppliers:*), tenant-isolated, paginated,
                          filterable, soft-delete-aware. Full detail:
                          apps/api/src/modules/inventory/README.md.
    orders/                  Order Management & Checkout (Milestone 8) —
                          OrdersModule: CustomerController/Service/
                          Repository (full CRUD, nested CustomerAddress —
                          no standalone address controller), OrderController/
                          Service/Repository (create/update/cancel/get/
                          list/change-status; no plain delete —
                          cancellation is the terminal write action).
                          Imports CatalogModule (ProductRepository),
                          BespokeModule (ProductCustomizationRepository),
                          InventoryModule (InventoryService) — the most
                          cross-module-dependent module in this arc, still
                          a clean one-directional DAG. Order creation
                          validates customer/variant/customization/pricing,
                          reserves inventory, and creates Order+OrderItems+
                          initial status history inside ONE transaction
                          (OrderRepository.runInTransaction(), the same tx
                          threaded into every InventoryService call).
                          Status changes/cancellation always write an
                          OrderStatusHistory row in the same transaction as
                          the mutation; cancel() releases every item's
                          inventory reservation first. Full REST CRUD
                          (Customer) + create/update/cancel/get/list/
                          change-status (Order), PermissionsGuard-protected
                          (customers:read+write+delete/orders:read+write+
                          cancel — cancel is its own Admin+-only tier),
                          tenant-isolated, paginated, filterable. Full
                          detail: apps/api/src/modules/orders/README.md.
    crm/                     CRM & Customer Operations (Milestone 9) —
                          CrmModule: LeadController/Service/Repository
                          (Create/Update/Archive/Convert/Get/List — Lead
                          reused wholesale from Phase 1.1A, first real
                          consumer), CustomerNoteController/Service/
                          Repository (full CRUD, soft-delete only, never
                          hard-delete), CustomerActivityController/Service/
                          Repository (read-only — Timeline/List, every
                          row written internally by Lead/FollowUp
                          services), FollowUpController/Service/Repository
                          (CRUD/Complete/Cancel/Reopen; targets EITHER a
                          Lead OR a Customer via the same lead-vs-client
                          XOR pattern Quotation/InventoryItem already
                          established), CustomerTagController/Service/
                          Repository (a 5th triad beyond this milestone's
                          own named list — tag CRUD + assign/unassign,
                          added so the "Tags" filter has real data to
                          filter). Imports OrdersModule (exported
                          CustomerRepository) for "Convert Lead ->
                          Customer" — reuses it directly, does not
                          duplicate customer-creation logic. Lead
                          conversion threads ONE transaction across the
                          OrdersModule boundary (domain-module-guide.md
                          §19's same shape). Full REST CRUD (Notes,
                          Tags) + Create/Update/Archive/Convert/Get/List
                          (Lead) + CRUD/Complete/Cancel/Reopen
                          (Follow-ups) + Timeline/List (Activities),
                          PermissionsGuard-protected (reuses the existing
                          leads:read/write permissions from Phase 1.1B,
                          plus 10 new ones for the four genuinely new
                          entities), tenant-isolated, paginated,
                          filterable, soft-delete-aware (except
                          CustomerActivity — append-only). Full detail:
                          apps/api/src/modules/crm/README.md.
    billing/                 Payments & Billing Foundation (Milestone 10)
                          — BillingModule: InvoiceController/Service/
                          Repository (Create from Order/Update draft/
                          Issue/Void/Get/List), PaymentController/
                          Service/Repository (Record/Allocate/Refund
                          placeholder/Get/List — append-only, no
                          Update/Delete), TaxRateController/TaxService/
                          TaxRepository (full CRUD). Reuses Invoice/
                          InvoiceItem/Payment (Phase 1.1A/1.1B, first
                          real consumer) — Invoice.clientId relaxed to
                          nullable, gaining new customerId/orderId/
                          taxRateId; Payment.invoiceId/provider/
                          providerRef relaxed to nullable, gaining new
                          paymentMethodId/method/reference. New
                          PaymentAllocation table is the invoice-by-
                          invoice ledger (append-only, same DB-privilege
                          revoke as Payment). Imports OrdersModule
                          (CustomerRepository/OrderRepository) +
                          CatalogModule (ProductRepository) — NOT
                          CrmModule ("CRM remains independent"). Every
                          allocation re-verifies "cannot exceed payment
                          amount"/"cannot exceed invoice total" inside
                          one transaction, auto-marking the invoice PAID.
                          Decimal-only monetary arithmetic throughout.
                          PermissionsGuard-protected (reuses existing
                          invoices:read+write/payments:read from Phase
                          1.1B, plus 6 new permissions), tenant-isolated,
                          paginated, filterable. Full detail:
                          apps/api/src/modules/billing/README.md.
    admin/                    Admin Platform, Analytics & Notifications
                          (Milestone 11) — AdminModule:
                          NotificationController/Service/Repository
                          (List/Get/Retry placeholder — Create/Queue/Mark
                          sent/Mark failed stay route-less), AuditController/
                          Service/Repository (List/Search over AuditLog;
                          also owns SystemEvent's data access),
                          DashboardController/Service/Repository (Overview +
                          per-module KPI endpoints, aggregating Orders/
                          Inventory/Billing/CRM/Catalog via each source
                          module's own exported repository/service),
                          ReportController/ReportingService/Repository
                          (Generate/List/Download metadata over
                          ScheduledReport — a 4th triad beyond this
                          milestone's own named list, added so
                          ScheduledReport isn't dead schema). Imports
                          OrdersModule/InventoryModule/BillingModule/
                          CrmModule/CatalogModule — the most cross-module-
                          dependent module in this arc, still a clean
                          one-directional DAG. PermissionsGuard-protected
                          (reuses existing audit_logs:read from Phase
                          1.1B, plus 4 new permissions —
                          notifications:manage/dashboard:read/
                          reports:read+write), tenant-isolated. Full
                          detail: apps/api/src/modules/admin/README.md.
    example-domain/       NOT a real business domain — the module
                          template every real one above will follow.
                          `GET /example/ping` → `JwtAuthGuard` (Milestone
                          2 — `401` without a valid access token) →
                          `RolesGuard` (Milestone 3 — `403` without the
                          `admin`/`super_admin` role) →
                          `ExampleDomainController` (reads `@CurrentUser()`)
                          → `ExampleDomainService` → `PingResponseDto`
                          (`{ status: 'ok', authenticatedAs }`) — the
                          first deliberate change to this
                          previously-always-unchanged reference endpoint,
                          an explicit ask in Milestone 2's own brief, not
                          scope creep (see the module's own README).
                          `GET /example/permission-ping` (Milestone 3) is
                          the matching example for `PermissionsGuard`
                          (`projects:write`), same controller/service/DTO
                          otherwise. `GET /example/organization` (new,
                          Milestone 4) demonstrates `@Tenant()`/
                          `@Organization()` — `JwtAuthGuard` only, no
                          RBAC layered on top; returns `{ tenantId,
                          organization: { id, name, slug } }`.
                          dto/, constants/, repositories/ (Phase 1.2D.3
                          — ExampleRepository extends BaseRepository,
                          targets Setting, NOT wired into
                          ExampleDomainService) have real content;
                          entities/, interfaces/, types/, exceptions/,
                          validators/, mappers/ are documented
                          placeholders (no data, no failure case, no
                          conversion to perform for a ping route). Full
                          standards: docs/architecture/domain-module-guide.md.
  jobs/                   PLACEHOLDER — queue-driven background workers
                          (Phase 0 scaffold, unchanged).
  shared/                 PLACEHOLDER — code shared across apps/api's own
                          modules only. Contrast packages/shared
                          (cross-workspace, frontend+backend).
  types/                  request-user.type.ts (Milestone 2) — RequestUser
                          (`{ email }`) plus the Express Request module
                          augmentation making `request.user` type-check
                          everywhere; unchanged by Milestone 3/4 (tenant
                          resolves separately, never a new field here).
                          authorization-cache.type.ts (Milestone 3) —
                          AuthorizationCache, the per-request cache
                          RolesGuard/PermissionsGuard populate and pass
                          into AuthorizationService, plus the matching
                          request.authorizationCache augmentation.
                          tenant-context.type.ts / organization-context.
                          type.ts (Milestone 4) — TenantContext
                          (`{ tenantId }`, minimal, for query-scoping) /
                          OrganizationContext (`{ id, name, slug }`,
                          richer, for display), both attached by
                          TenantMiddleware from one resolution per
                          request, plus their matching
                          request.tenantContext/
                          request.organizationContext augmentations.
                          Types shared across apps/api's own modules
                          only. Contrast packages/shared /
                          packages/api-contract (public API surface).
  utils/                  prisma-error.util.ts (Milestone 5) —
                          isUniqueConstraintViolation(), the first real
                          file here: a plain type guard for Prisma's
                          P2002 error code, used by catalog/'s three
                          services to turn a slug/sku collision into a
                          clean 409 instead of a raw DB error.
                          isCheckConstraintViolation() (Milestone 7) —
                          the P2004 counterpart, used by inventory/'s
                          InventoryService to turn a concurrent-write
                          CHECK-constraint race (negative stock, over-
                          reservation) into a clean 409.
                          Framework-agnostic pure helpers only (no NestJS
                          DI/decorators — contrast common/).
```

"Placeholder" means exactly what it means everywhere else in this repo
(Phase 0 set the convention for `common/`, `jobs/`, `modules/*/`): a folder
with one README describing its purpose, zero code, "No implementation."
This phase extends that convention to every new folder the brief asked for
without asking for real logic in it.

## 2. Startup flow (`main.ts`, in order)

1. `NestFactory.create(AppModule)` — resolves the DI graph; `ConfigModule`
   loads and parses `.env` (via `@nestjs/config`'s built-in dotenv
   integration) before anything else runs, since it's `@Global()` and every
   other provider may depend on `ConfigService`.
2. `app.get(HttpLoggingMiddleware)` + `app.use(...)` (Phase 1.2C.5) —
   attached immediately, ahead of prefix/versioning, so every request gets
   exactly one structured completion log regardless of route or prefix;
   see §1's `common/` entry for why `app.use()`, not
   `NestModule.configure()`.
3. Read `port`/`nodeEnv` via `app.get<ConfigType<typeof appConfig>>
   (appConfig.KEY)` — the typed-injection access pattern (Phase 1.2B.3,
   see §4/`configuration.md` §4) — not `process.env` directly, and not
   `ConfigService.get('app.port')` (superseded; kept only as a documented
   secondary option for genuinely dynamic lookups).
4. `app.setGlobalPrefix('api')` + `app.enableVersioning({ type:
   VersioningType.URI, defaultVersion: '1' })` — every future controller
   resolves under `/api/v1/...` without each one needing an explicit
   `@Version('1')`.
5. `app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS))`
   (Phase 1.2D.5) — every request body/query/param DTO across every
   controller (no per-route `@UsePipes()` anywhere) is whitelisted
   (unknown fields silently stripped) and transformed (the controller
   receives a real DTO instance) before the handler runs. Options:
   `apps/api/src/common/pipes/validation-pipe.options.ts`.
6. Production-only: `trust proxy` set on the underlying Express instance —
   see §5 "HTTPS-ready bootstrap" for why this, not `httpsOptions`, is the
   correct interpretation for this deploy topology.
7. `app.enableShutdownHooks()` — registers `SIGTERM`/`SIGINT` handlers so a
   rolling deploy on managed containers drains in-flight requests via
   `OnModuleDestroy`/`OnApplicationShutdown` instead of dropping them.
8. `app.listen(port)`, then one `Logger('Bootstrap').log(...)` line
   confirming the port/prefix/env — this one line is startup confirmation
   only; real request-level logging is the structured JSON logging system
   built in Phase 1.2C (`apps/api/src/logging/README.md`).

Exception logging is real (`ExceptionLoggingFilter`, Phase 1.2C.6) and
request validation is real (`ValidationPipe`, Phase 1.2D.5) — the filter
already logs and preserves Nest's default response shape for the
`BadRequestException` the pipe throws on invalid input, same as any
other `HttpException`, with no extra wiring. CORS/RFC-9457-response-
shaping/interceptor-shaped work is still a **comment**, not a call, at
the exact point in this sequence it will attach — see the comment block
in `main.ts` itself.

## 3. Dependency graph

```
AppModule
  ├─ ConfigModule (@Global — every future module gets ConfigService for free)
  ├─ LoggingModule (@Global — Phase 1.2C.1–1.2C.9; exports LOGGER,
  │    AUDIT_LOGGER, RequestContextService, PerformanceLogger)
  ├─ DatabaseModule (@Global — Phase 1.2D.2; exports PrismaService only —
  │    no repositories yet, see apps/api/src/database/README.md)
  ├─ TokenModule (@Global — Phase 1.2D.6; exports TokenService only —
  │    genuinely functional, no call site yet, see apps/api/src/jwt/README.md)
  ├─ PasswordModule (@Global — Phase 1.2D.7; exports PasswordService only —
  │    genuinely functional, no call site yet, see
  │    apps/api/src/password/README.md)
  ├─ AuthorizationModule (@Global — Milestone 3; no config imports since
  │    Milestone 4 — RoleRepository/PermissionRepository take `tenantId`
  │    as a plain method parameter now, not an injected config value;
  │    providers: AuthorizationService, RoleRepository,
  │    PermissionRepository; exports AuthorizationService only —
  │    genuinely functional, database-driven, consumed by
  │    RolesGuard/PermissionsGuard, see
  │    apps/api/src/authorization/README.md)
  ├─ TenantModule (Milestone 4 — NOT @Global, unlike the infra modules
  │    above; imports ConfigModule.forFeature(defaultTenantConfig) (the
  │    namespace relocated here from modules/auth/config/ this
  │    milestone); providers: TenantResolver, TenantMiddleware,
  │    OrganizationRepository; exports nothing — every consumer reads
  │    request.tenantContext/request.organizationContext instead of
  │    injecting anything from this module directly. Implements its own
  │    NestModule.configure(), registering TenantMiddleware
  │    application-wide — see apps/api/src/tenant/README.md)
  ├─ ExampleDomainModule (Phase 1.2D.1 — NOT @Global, scoped like every
  │    real domain module will be; providers: ExampleDomainService,
  │    ExampleRepository (Phase 1.2D.3, not wired to each other — see
  │    domain-module-guide.md §16); exports nothing, nothing depends on
  │    it — see docs/architecture/domain-module-guide.md. `ping()` is
  │    guarded by `JwtAuthGuard` + `RolesGuard` (Milestone 2/3,
  │    `common/guards/`), `permission-ping()` by `JwtAuthGuard` +
  │    `PermissionsGuard`, `organization()` (Milestone 4) by
  │    `JwtAuthGuard` alone, all via `@UseGuards()` — not a module
  │    import/provider, Nest resolves each through its own DI container
  │    by class reference)
  ├─ AuthModule (Phase 1.2D.4 — first real business module, NOT @Global;
  │    no config imports since Milestone 4 (previously imported
  │    ConfigModule.forFeature(defaultTenantConfig), Milestone 1 —
  │    relocated to tenant/, AuthRepository takes `tenantId` as a plain
  │    parameter now); providers: AuthService (depends on AuthRepository,
  │    and — Phase 1.2D.8 — TokenService/PasswordService, both resolved
  │    from their @Global() modules above without AuthModule importing
  │    either), AuthRepository extends
  │    BaseRepository<PrismaService['user']>; exports nothing, nothing
  │    depends on it yet)
  ├─ CatalogModule (Milestone 5 — first real business module with more
  │    than one controller/service/repository triad, NOT @Global;
  │    providers: CategoryService/CategoryRepository,
  │    CollectionService/CollectionRepository, ProductService/
  │    ProductRepository — ProductService additionally depends on
  │    CategoryRepository/CollectionRepository (same-module, no
  │    export/import round-trip needed) for cross-tenant reference
  │    validation; exports: ProductRepository (Milestone 6 — the one
  │    thing BespokeModule needs; Milestone 8 — OrdersModule needs it too,
  │    for "Validate product variants"; Milestone 10 — BillingModule
  │    needs it too, for invoice line-item description resolution);
  │    depended on by BespokeModule, OrdersModule, AND BillingModule)
  ├─ BespokeModule (Milestone 6 — second real multi-triad business
  │    module, NOT @Global; imports CatalogModule (for the exported
  │    ProductRepository); providers: FabricService/FabricRepository,
  │    MeasurementService/MeasurementRepository, StyleOptionService/
  │    StyleOptionRepository, ProductCustomizationService/
  │    ProductCustomizationRepository — ProductCustomizationService/
  │    FabricService additionally depend on ProductRepository
  │    (cross-tenant productId validation) and
  │    ProductCustomizationService/StyleOptionService on
  │    StyleOptionRepository (cross-product style-option validation);
  │    exports: ProductCustomizationRepository (Milestone 8 — OrdersModule
  │    needs it for "Validate bespoke customization"); depended on by
  │    OrdersModule)
  ├─ InventoryModule (Milestone 7 — third real multi-triad business
  │    module, NOT @Global; imports NOTHING — the only module in this
  │    arc with zero cross-module imports (see this module's own README
  │    for why: two narrow existence checks didn't justify importing both
  │    CatalogModule and BespokeModule); providers:
  │    WarehouseService/WarehouseRepository, InventoryService/
  │    InventoryRepository, SupplierService/SupplierRepository —
  │    InventoryService additionally depends on WarehouseRepository
  │    (same-module, validating a receive's warehouseId belongs to the
  │    tenant); exports: InventoryService (Milestone 8 — OrdersModule
  │    needs it for "Reserve inventory through InventoryService");
  │    depended on by OrdersModule)
  ├─ OrdersModule (Milestone 8 — fourth real multi-triad business module,
  │    NOT @Global; the only module in this arc that imports THREE others
  │    — CatalogModule (ProductRepository), BespokeModule
  │    (ProductCustomizationRepository), InventoryModule
  │    (InventoryService); providers: CustomerService/CustomerRepository,
  │    OrderService/OrderRepository — OrderService additionally depends on
  │    CustomerRepository/ProductRepository/ProductCustomizationRepository/
  │    InventoryService (order creation's own validation + reservation
  │    chain, all same-module-injected, no export/import round-trip
  │    needed beyond the three module imports above); exports:
  │    CustomerRepository (Milestone 9 — CrmModule needs it for "Convert
  │    Lead → Customer"; Milestone 10 — BillingModule needs it too),
  │    OrderRepository (deliberately NOT exported at Milestone 9 — no
  │    business rule there read Order data; Milestone 10 IS the real
  │    consumer that scoping note anticipated, for "Create [Invoice] from
  │    Order"); depended on by CrmModule AND BillingModule — still a
  │    clean one-directional DAG, "Zero circular dependencies" holds)
  ├─ CrmModule (Milestone 9 — fifth real multi-triad business module,
  │    NOT @Global; imports OrdersModule (for the exported
  │    CustomerRepository); providers: LeadService/LeadRepository,
  │    CustomerNoteService/CustomerNoteRepository,
  │    CustomerActivityService/CustomerActivityRepository,
  │    FollowUpService/FollowUpRepository, CustomerTagService/
  │    CustomerTagRepository (a 5th triad beyond this milestone's own
  │    named list — see docs/implementation/decisions.md) —
  │    LeadService/CustomerNoteService/FollowUpService/CustomerTagService
  │    additionally depend on CustomerRepository (cross-tenant customerId
  │    validation + "Convert Lead → Customer"), FollowUpService also on
  │    LeadRepository (cross-tenant leadId validation, same-module);
  │    exports nothing, nothing depends on it — still a clean
  │    one-directional DAG, "Zero circular dependencies" holds)
  └─ BillingModule (Milestone 10 — sixth real multi-triad business
       module, NOT @Global; imports OrdersModule (exported
       CustomerRepository/OrderRepository) AND CatalogModule (exported
       ProductRepository) — deliberately NOT CrmModule ("CRM remains
       independent," this milestone's own explicit instruction);
       providers: InvoiceService/InvoiceRepository, PaymentService/
       PaymentRepository, TaxService/TaxRepository — InvoiceService
       additionally depends on TaxRepository/TaxService (same-module),
       OrderRepository/ProductRepository (cross-module, "Create from
       Order"), PaymentService additionally depends on InvoiceRepository
       (same-module, for allocation's own invoice status/amountPaid
       updates); exports nothing, nothing depends on it — still a clean
       one-directional DAG, "Zero circular dependencies" holds)

Registered on AppModule as providers/middleware, NOT module imports —
kept distinct here since they don't appear as `imports: [...]` entries:
  providers: [
    HttpLoggingMiddleware        (attached in main.ts via app.use(),
                                   not NestModule.configure() — see §1's
                                   common/middleware/ entry for why)
    { provide: APP_FILTER, useClass: ExceptionLoggingFilter }
                                  (Nest's own DI-native global-filter
                                   mechanism, registered here directly,
                                   no main.ts involvement needed)
  ]
```

Full business-module shape (not all built yet, documented so the
intended graph is visible before the remaining code exists —
`ConfigModule`/`LoggingModule`/`DatabaseModule`/`AuthModule` above are
already real; `AuthModule` today is placeholder-only, see §1's `auth/`
entry — the other five remain fully anticipated):

```
AppModule
  ├─ ConfigModule (@Global)
  ├─ DatabaseModule (@Global — real as of Phase 1.2D.2, see above)
  ├─ AuthModule        (real as of Phase 1.2D.4, placeholder endpoints
  │                      only — depends on DatabaseModule via
  │                      AuthRepository, no guard exists yet for other
  │                      modules to depend on)
  ├─ ProjectsModule     (depends on DatabaseModule, AuthModule for guards)
  ├─ BillingModule      (depends on DatabaseModule, AuthModule)
  ├─ CrmModule          (depends on DatabaseModule, AuthModule)
  ├─ NotificationsModule(depends on DatabaseModule, AuthModule)
  └─ ContentModule      (depends on DatabaseModule, AuthModule)
```

One-way dependency per CONTRIBUTING.md §3 (UI → services → repositories →
DB): business modules depend on `DatabaseModule`/`AuthModule`, never the
reverse, and business modules don't depend on each other directly — shared
needs go through `shared/`/`common/` or an explicit cross-module provider
export, avoiding the circular-dependency trap DI-heavy Nest apps are prone
to (CONTRIBUTING.md §7 / this phase's brief §7).

## 4. Configuration

See `docs/architecture/configuration.md` — the dedicated companion doc
(Phase 1.2B.1) for the full per-domain folder architecture, conventions,
and lifecycle. Short version: `@nestjs/config`, loaded globally once in
`ConfigModule` (`apps/api/src/config/`), organized into 8 real per-domain
**namespaces** via `registerAs()` (Phase 1.2B.3) — accessed via
`@Inject(xConfig.KEY)`/`ConfigType<typeof xConfig>` (or `app.get(xConfig.KEY)`
outside DI), not `ConfigService.get('app.port')` string keys — see
`configuration.md` §4 for the full rationale. `database`'s namespace is
data only (no Prisma import, no connection, `apps/api/prisma/` untouched).
Environment validation is built — see `docs/architecture/validation.md`
(Phase 1.2B.2, extended 1.2B.3). For usage examples, troubleshooting, and
how to extend any of this, see `docs/architecture/configuration-guide.md`
(Phase 1.2B.4).

## 5. Architecture decisions this phase

- **"HTTPS-ready bootstrap" = trust-proxy-ready, not literal TLS
  termination in-process.** `architecture.md`'s deploy topology terminates
  TLS at the CDN/managed-container load balancer, never in the Node
  process itself. Passing `httpsOptions` into `NestFactory.create` would be
  dead code for every real deploy target this architecture describes —
  instead, production sets `trust proxy` so the app correctly reads
  `X-Forwarded-Proto`/`X-Forwarded-For` from that upstream TLS terminator
  (needed for correct redirect/IP-logging behavior behind a proxy).
- **Placeholder resolution for CORS/Validation/Filters/Interceptors.** The
  brief asks to "configure... placeholder... register placeholders" for
  these while separately forbidding implementing their logic. Resolved as:
  a clearly-labeled comment block in `main.ts` at the exact point each
  would attach, not an actual `app.use*()` call — consistent with how
  Phase 0 already left `common/`, `jobs/`, and `modules/*/` as
  documentation-only placeholders with zero code.
- **Config organization: two namespaces at the time this phase (1.2A) was
  written, more added on demand — since grown to 8 real domains (Phase
  1.2B.3), the remaining 10 still following this same principle.**
  Considered scaffolding all eventual namespaces (`auth`, `payments`,
  `storage`, `email`) immediately for "completeness." Rejected — nothing
  consumed them at the time, and empty speculative config namespaces are
  exactly the kind of premature structure CONTRIBUTING.md's coding
  standards (§13, and this repo's own working conventions) argue against.
  `app` and `database` were added first because `main.ts` and the (future)
  `DatabaseModule` needed them immediately; `security`/`logging`/
  `swagger`/`health`/`cache`/`queue` graduated later, on the same
  need-it-now basis, not upfront — see `configuration.md` §1/§5 for the
  current, authoritative domain count.
- **No path alias (`@/*`) added to `apps/api`, despite `apps/web` having
  one.** `tsconfig-paths` sat as an unused devDependency in
  `apps/api/package.json` for four review passes (flagged, never wired) —
  removed in the Phase 1.2B RC stabilization pass rather than deferred a
  fifth time, since nothing ever consumed it. Wiring a real path alias
  still touches `tsconfig.json`, `ts-node`/`nest start` config, and Jest's
  `moduleNameMapper` simultaneously — real complexity, and still zero
  current payoff with an empty module structure. Revisit (adding the
  dependency back along with the actual wiring, together) once
  `modules/*/` has files importing from `common/`/`shared/` a few
  directories deep.

## Deferred to Phase 1.2B (explicitly out of scope for this doc)
- Domain-specific repositories (`AuthRepository`, `UserRepository`, ...) —
  `DatabaseModule`/`PrismaService` (Phase 1.2D.2) and the generic
  `BaseRepository` abstraction (Phase 1.2D.3, see §1/§3 and
  `domain-module-guide.md` §16) are no longer in this list; only real
  per-domain repositories built on top of them remain deferred.
- Auth: guards, JWT strategy, session handling
- Real CORS/interceptor logic (comments → code). Exception handling is
  real for *logging* (`ExceptionLoggingFilter`, Phase 1.2C.6); request
  *validation* is real (`ValidationPipe`, Phase 1.2D.5, see §1's
  `common/pipes/` entry and §2 step 5) — no longer in this list. RFC
  9457 response-shaping specifically remains deferred.
- Swagger UI, health-check controller, a Redis client, queue workers —
  their *configuration* is real as of Phase 1.2B.3 (`swagger`/`health`/
  `cache`/`queue` namespaces), but nothing consumes it yet. The structured
  logging framework itself is no longer in this list — it's real *and*
  consumed (`apps/api/src/logging/`, Phases 1.2C.1–1.2C.9; see §3's
  dependency graph and `logging/README.md`).
- Any controller, service, DTO, or business logic in `modules/*/`
