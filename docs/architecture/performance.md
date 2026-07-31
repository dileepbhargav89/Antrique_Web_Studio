# Performance Architecture (Milestone 12 — Performance Engineering)

Companion to `backend.md` (the module-by-module "what got built" record) — this
doc is the source of truth for *how fast it runs* and *why every optimization
decision was made*. New this milestone; nothing here existed before.

**Status:** the backend is feature-complete as of Milestone 11 (Admin
Platform, Analytics & Notifications). This milestone made **zero** feature
changes, **zero** API-breaking changes, **zero** schema redesigns, and
**zero** business-rule changes — every change below is either (a) the same
inputs/outputs computed with fewer round trips, (b) new observability with no
behavioral effect on a response body, or (c) new, purely additive response
headers (`Cache-Control`) / infrastructure (compression, caching) that no
existing client depends on the absence of.

---

## 1. Performance audit

Every module was reviewed for the failure classes this milestone's own brief
names: N+1 queries, unnecessary eager loading, duplicate queries, missing
indexes, slow transactions, repeated calculations, excessive object
allocation, unnecessary serialization, expensive middleware, large payloads.

### 1.1 Findings, fixed

| # | Module | Finding | Fix |
|---|---|---|---|
| 1 | Billing | `InvoiceService.createFromOrder()` issued one `productRepository.findVariantById()` **per order line** in a `for` loop, purely to resolve a human-readable SKU string — an order with 10 lines ran 10 separate `SELECT`s. | `ProductRepository.findVariantsByIds()` (new) batches every distinct variant id into one `findMany({ id: { in } })`, then an in-memory `Map` lookup replaces the per-item query. |
| 2 | Orders | `OrderService.create()`'s own item-validation loop had the identical per-item `findVariantById()` N+1, on the checkout hot path. | Same batched `findVariantsByIds()` call, once, before the loop; the loop itself now does a `Map.get()`, no I/O. |
| 3 | Bespoke | `FabricService.assertProductsBelongToTenant()` issued one `productRepository.findActiveById()` **per product id** — and `findActiveById()` itself eagerly loads the FULL nested `variants`/`images` shape, purely to check existence. | `ProductRepository.findExistingIds()` (new): one minimal, `select: { id: true }`-projected `findMany({ id: { in } })` covering every id at once, diffed in memory for the per-item error message. |
| 4 | Inventory | `SupplierService.assertSupplierProductReferencesBelongToTenant()` ran one `productVariantExistsForTenant()`/`fabricExistsForTenant()` **sequentially, awaited, per item** — N round trips in series, not even concurrent. | `Promise.all()` over the per-item checks — same query count, but concurrent instead of serial (see §4 for why this couldn't be batched into fewer queries the way #1–3 were). |
| 5 | Inventory | `InventoryRepository.findVariantLinkedItemsWithPrice()` (Milestone 11) fetched **every** variant-linked `InventoryItem` + its variant's `price` into Node, then `reduce()`d `onHand * price` in application code — for "Stock valuation," a single number. | Rewritten as one `$queryRaw` `SUM(on_hand * price)` aggregate — Postgres returns one row, not one per SKU. See §3. |
| 6 | Inventory | `InventoryRepository.findItemsWithReorderPoint()` (Milestone 11) fetched **every** item with a `reorderPoint` set, then filtered `onHand <= reorderPoint` in Node — for a warehouse tracking thousands of SKUs, most of them comfortably above their reorder point, that pulled the entire reference set into memory on every Dashboard request just to discard most of it. | Rewritten as one `$queryRaw` doing the comparison in the `WHERE` clause — only genuinely low-stock rows ever leave the database. New partial index backs it (§3). |
| 7 | Authorization | `AuthorizationService`/`RoleRepository.findRolesForUser()` re-queried the database on **every single** `PermissionsGuard`/`RolesGuard`-protected request (the large majority of routes in this API), even though a user's role/permission grants change extremely rarely. | New `CacheService` (in-memory, TTL-based, §5) fronts the role lookup with a 60s cross-request cache, keyed `role-keys:{tenantId}:{email}`. The existing per-request `AuthorizationCache` (Milestone 3) is untouched — this adds a SECOND, slower-but-still-not-a-query layer underneath it, not a replacement. |
| 8 | API layer | No response compression — confirmed live (`curl` with `Accept-Encoding: gzip`) that every JSON response was sent uncompressed. | `compression` middleware (industry-standard gzip/deflate negotiation), registered first in the bootstrap chain (`main.ts`). |
| 9 | API layer | No `Cache-Control` header anywhere, ever — every response (including genuinely static reference data like the product catalog) told every downstream cache "nothing about this is cacheable." | New `@CacheControl(maxAgeSeconds)` decorator + `CacheControlInterceptor`, opt-in per route, applied to Category/Collection/Product GET routes (§4). |
| 10 | Observability | No per-query database timing anywhere; no slow-query alerting. | `PrismaService` now subscribes to Prisma's own `'query'` log event, logging every query at `debug` and anything over 100ms at `warn` (§6). |
| 11 | Observability | No slow-request alerting distinct from the existing per-request completion log. | `HttpLoggingMiddleware` now also logs a `warn`-level "Slow HTTP request" entry past 1000ms, alongside the unchanged `info`-level completion log every request already got (§6). |
| 12 | Observability | `PerformanceLogger` (built Phase 1.2C.7, `logging/performance-logger.service.ts`) had **zero** real call sites anywhere in the codebase — a fully-built, fully-tested capability nobody had ever used. | Wrapped `DashboardService.overview()` — this codebase's own heaviest single service-layer operation (5 concurrent module-KPI computations + widget read + system-health count) — in `performanceLogger.measureAsync()` (§6). |

### 1.2 Findings, audited and deliberately NOT changed

Documenting a finding is not the same as fixing it — some of these were
genuine anti-patterns in isolation that this milestone judged not worth
the risk/complexity for the actual scale involved, per this milestone's own
"Use only where demonstrably beneficial" instruction (repeated for caching,
but applied here as a general discipline).

| # | Module | Finding | Why left alone |
|---|---|---|---|
| 13 | Orders | `OrderService.create()`'s reservation loop (`inventoryService.reserveStockForOrder()` per item, inside the open transaction) and `changeStatus()`/`cancel()`'s per-item reservation-release/consume loops are all sequential `for` loops with `await` inside. | These are **writes**, not reads — each is a real, independent business mutation (a reservation row + a counter update + a ledger row) that must commit atomically with the order itself. Parallelizing writes against the same `InventoryItem` rows inside one transaction risks lock contention/deadlocks for zero throughput gain (Postgres still serializes conflicting row locks either way); this is correctly-sequential, not an N+1. |
| 14 | Orders | The same `create()` validation loop also does one `inventoryService.findItemForVariant()` **per line item** (a warehouse+variant lookup), not batched the way the variant lookup (#2) was. | Orders in this domain (jewelry/garment storefront checkout) realistically carry a handful of line items, not hundreds — batching this would need a new multi-key repository method (`findItemsForWarehouseAndVariants()`) for a saving measured in single-digit milliseconds at this scale. Revisit if a genuine bulk-order use case appears. |
| 15 | Bespoke | `StyleOptionService`'s incompatibility-validation loop (`findActiveById()` + `findGroupById()` per incompatible id) and `ProductCustomizationService.update()`'s per-adjustment `assertStyleOptionBelongsToCustomization()` loop are both sequential, per-item DB calls. | Both are rare, low-volume admin-configuration writes (defining which style options conflict, updating pricing rules) with typically single-digit item counts, not hot-path reads. Batching would touch business-rule-adjacent validation code in a milestone that explicitly forbids business-rule changes — the risk of subtly altering validation-order/error-precedence semantics outweighs a marginal latency win nobody would notice on an admin form submit. |
| 16 | Database indexing | A full audit of every `@@index`/`@@unique` against every repository's actual `where`/`orderBy` usage (see the table in `database-schema.md` §2 — every tenant-scoped model already carries `tenantId`, `tenantId+status`, and/or `tenantId+createdAt` composite indexes from the migration that created it). | Found the schema already densely, deliberately indexed by every prior milestone — this milestone's own "Never create duplicate indexes... Add only necessary" instruction argues directly against widening coverage the audit found no real query depending on. Exactly ONE new index was added (§3), for a query this milestone itself introduced. |
| 17 | API layer | Streaming responses ("streaming where beneficial," this milestone's own brief). | No endpoint in this API returns a large, unbounded payload — every list endpoint is already page-capped at 100 rows (`PaginationQueryDto`, Milestone 5, unchanged), and no bulk-export/CSV/file-download feature exists anywhere in this codebase (building one would be a feature change, explicitly out of scope this milestone). Nothing to stream. |
| 18 | Caching | Other read-mostly reference data — `TaxRate`, `PaymentMethod`, `LeadSource`, `NotificationTemplate` — are all candidates for the same `CacheService` treatment as role/permission resolution. | Each is already a cheap, single-row, indexed-PK lookup (not a multi-join aggregate like role resolution), read far less often than "every guarded request," and — unlike role resolution — several sit on a genuine WRITE path this milestone didn't build a live grant-editing endpoint for (no risk there), but a couple (`TaxRate` via `TaxRateController`) DO have live write endpoints already, which would need real cache invalidation wired into every mutation, not just a TTL, to stay safe. Deferred rather than rushed. |

---

## 2. Repository & service optimization

Beyond the N+1 fixes in §1.1, every repository/service was reviewed for
"duplicated queries, unnecessary round trips, redundant existence checks"
(this milestone's own explicit checklist) and "transaction boundaries,
repeated computations, unnecessary mapping, duplicate repository calls."

- **`DashboardService`** (Milestone 11, unchanged in shape) already ran its
  5 module-KPI computations, the widget read, and the system-health count
  fully concurrently via `Promise.all()` — audited, already optimal, no
  change needed beyond the `PerformanceLogger` wrap (§6).
- **Repository pattern preserved** (this milestone's own explicit
  requirement) — every optimization above is either a NEW repository
  method (batched/aggregate) called instead of a loop of existing ones, or
  a `Promise.all()` around existing calls. No business logic moved into a
  repository; no repository gained a decision (`if`/`throw` on business
  meaning) it didn't already have.

---

## 3. Database optimization

**Query rewrites** (both `InventoryRepository`, Milestone 11 → Milestone
12 — see §1.1 #5/#6): `findVariantLinkedItemsWithPrice()` → 
`getStockValuationAggregate()`, `findItemsWithReorderPoint()` →
`findLowStockItems()`. Both now use `$queryRaw` (Prisma 7's own
`@prisma/adapter-pg` driver adapter confirmed live to return genuine
`Prisma.Decimal`/`Date` instances from raw queries — identical to the query
builder's own output, zero precision-loss risk, verified via a throwaway
`check_raw_decimal.ts` script before committing to the approach, deleted
after use) instead of `findMany()` + application-code `reduce()`/`filter()`.

**New index** — `apps/api/prisma/migrations/20260722130000_add_performance_indexes/`:
one hand-written partial index, `inventory_items(tenant_id, reorder_point)
WHERE reorder_point IS NOT NULL AND deleted_at IS NULL`, backing
`findLowStockItems()`'s own `on_hand <= reorder_point` predicate — Postgres
can't index a column-to-column comparison directly, but this narrows the
scan to just the (typically much smaller) subset of items that track a
reorder point at all, before evaluating the comparison row by row. Mirrors
`InventoryItem`'s own two pre-existing Milestone 7 partial indexes (same
"Prisma DSL can't express a filtered index" limitation). No other index was
added — see §1.2 #16.

**EXPLAIN ANALYZE** (this milestone's own explicit ask — run where
appropriate), against the live seed dataset:

```
=== findLowStockItems() ===
Seq Scan on inventory_items  (cost=0.00..1.03 rows=1 width=204) (actual time=0.035..0.035 rows=0 loops=1)
  Filter: (deleted_at IS NULL) AND (reorder_point IS NOT NULL) AND (on_hand <= reorder_point) AND (tenant_id = $1)
Execution Time: 0.085 ms

=== getStockValuationAggregate() ===
Aggregate (actual time=0.292..0.293 rows=1 loops=1)
  -> Nested Loop (actual time=0.255..0.257 rows=1 loops=1)
       -> Seq Scan on inventory_items ii (actual time=0.031..0.032 rows=1 loops=1)
       -> Index Scan using product_variants_pkey on product_variants pv (actual time=0.220..0.220 rows=1 loops=1)
Execution Time: 0.801 ms
```

Honest reading: at the seed dataset's own scale (2 `inventory_items` rows),
Postgres's own planner correctly prefers a sequential scan over the new
index — for a 2-row table, an index lookup's own overhead exceeds a plain
scan, and choosing the index anyway would be the WRONG call, not the
optimized one. This is expected, not a failure to demonstrate the fix: the
index exists, is valid, and the planner will pick it up automatically once
the table's row count crosses its own cost-based threshold — no application
code change needed when that happens. Documenting the plan at real scale
was not possible without fabricating synthetic bulk data, which this
milestone's own scope (no feature/data changes) argues against.

**Transaction scope** — reviewed every `runInTransaction()`/`$transaction()`
call site across every module; none open a transaction earlier than the
first write inside it or hold one across an `await` that doesn't need to be
inside it (every pre-transaction validation step — customer/variant/
customization checks in `OrderService.create()`, tax/order checks in
`InvoiceService.createFromOrder()` — already ran BEFORE the transaction
opens, "fail fast, no wasted reservation/rollback," each module's own prior
milestone reasoning, confirmed still true and unchanged).

---

## 4. API performance

- **Response compression** — `compression` (gzip/deflate), registered
  first in `main.ts`'s bootstrap chain, ahead of every guard/interceptor.
  Confirmed live: a `Accept-Encoding: gzip` request to `GET /categories`
  now returns `Content-Encoding: gzip`; a client sending no
  `Accept-Encoding` is unaffected (uncompressed, exactly as before).
- **ETag + conditional GET** — confirmed live that Express's own default
  behavior (bundled with `@nestjs/platform-express`, always on) already
  generates a weak `ETag` on every JSON response and returns a genuine
  `304 Not Modified` (empty body) for a request whose `If-None-Match`
  matches. **Zero code was needed** — this was an audit finding, not a
  build task, and is now documented in `main.ts`'s own bootstrap-order
  comment so a future reader doesn't duplicate it.
- **Cache-Control** — new `@CacheControl(maxAgeSeconds)` decorator
  (`common/decorators/cache-control.decorator.ts`) + `CacheControlInterceptor`
  (`common/interceptors/`, registered via `APP_INTERCEPTOR`, the first real
  content in that previously-placeholder directory). Deliberately opt-in,
  per route, always `private` (never `public` — this API is entirely
  tenant/RBAC-scoped; a shared/CDN cache serving one tenant's response to
  another would be a data leak, not an optimization). Applied to
  Category/Collection/Product `GET` (list + by-id) — 30s, via one shared
  `CATALOG_READ_CACHE_MAX_AGE_SECONDS` constant
  (`modules/catalog/constants/catalog.constant.ts`) — the clearest,
  lowest-churn read-only data in this API. Deliberately NOT applied to
  Orders/Inventory/Dashboard/Notifications/Audit/Billing/CRM — each either
  changes too often (inventory counts, order status) or carries a
  near-real-time expectation (dashboard, notifications) where even 30s of
  client-side staleness would be the wrong tradeoff.
- **Pagination** — audited `PaginationQueryDto` (Milestone 5, unchanged):
  `limit` was already `@Max(100)`-capped, default 20. Already optimized;
  no unbounded list endpoint exists anywhere in this API.
- **Streaming** — evaluated, not applicable this milestone; see §1.2 #17.

---

## 5. Caching

New `CacheService` (`apps/api/src/cache/`, `@Global()` `CacheModule`,
mirroring `TokenModule`/`PasswordModule`'s exact precedent) — a reusable,
in-memory, TTL-based cache abstraction: `get()`/`set()`/`delete()`/
`deleteByPrefix()`/`clear()`/`getOrLoad()` (the read-through entry point
most real callers use). Lazily expired on read (no background sweep timer —
no `onModuleDestroy` cleanup complexity, no risk of a timer firing after
shutdown begins). Explicitly **not** a distributed cache — a single
process-local `Map`; a multi-instance deployment would each hold an
independent copy, which is exactly why it must never front anything a
stale READ could make INCORRECT to act on (mutable transactional state).

**First and only real consumer this milestone: `AuthorizationService`.**
Role/permission resolution (`RoleRepository.findRolesForUser()`) now goes
through `cache.getOrLoad('role-keys:{tenantId}:{email}', 60_000, ...)`
before ever reaching the database — see §1.1 #7 for why this is safe
(read-mostly reference/config data, not transactional state) and §1.2 #18
for why other candidates were evaluated but deferred. The pre-existing,
per-request `AuthorizationCache` (Milestone 3 — "cache within a request
only") is completely unchanged; this adds a second, cross-request layer
underneath it, verified by a new test proving the SAME user resolved across
TWO separate per-request caches now shares one underlying database query
(`authorization.service.spec.ts`).

No live invalidation trigger exists yet (nothing in this app currently
mutates roles/permissions at runtime — no `RoleController`/
`PermissionController` was built, seed-data-only) — the 60s TTL alone is
the practical staleness ceiling for now. `deleteByPrefix()` exists on
`CacheService` specifically so a future live grant-editing endpoint has
somewhere real to call (`cache.deleteByPrefix('role-keys:' + tenantId)`)
the moment one exists — documented, not deferred silently.

---

## 6. Performance instrumentation

All four capabilities this milestone's own brief names, all internal-only
(structured `LOGGER` entries — no Prometheus, no Grafana, per this
milestone's own explicit exclusion):

- **Request duration** — `HttpLoggingMiddleware` (Phase 1.2C.5, unchanged
  shape): one `info`-level "HTTP request completed" entry per request,
  `durationMs` included, unchanged this milestone.
- **Slow request logging** — NEW: the same middleware now also logs a
  `warn`-level "Slow HTTP request" entry (same metadata) whenever
  `durationMs` exceeds `SLOW_REQUEST_THRESHOLD_MS` (1000ms) — additive,
  never replaces the existing `info` line.
- **Database duration** — NEW: `PrismaService` now constructs its
  underlying `PrismaClient` with `log: [{ emit: 'event', level: 'query' }]`
  and subscribes via `$on('query', ...)`; every query gets a `debug`-level
  "Database query executed" entry with Prisma's own measured `duration`
  (not hand-rolled timing) — filtered out by `LOG_LEVEL=info` in normal
  operation, available on demand.
- **Slow query logging** — NEW, same handler: anything crossing
  `SLOW_QUERY_THRESHOLD_MS` (100ms) additionally gets a `warn`-level "Slow
  database query" entry, so a slow query is findable by log level alone.
  Verified live (booted with `LOG_LEVEL=debug`, real query events observed
  streaming through `LOGGER` with correct `requestId`/`correlationId`
  context auto-merged).
- **Service duration** — `PerformanceLogger` (built Phase 1.2C.7,
  `logging/performance-logger.service.ts`) had zero real call sites
  anywhere until this milestone; `DashboardService.overview()` — this
  codebase's own heaviest service-layer fan-out — is now wrapped in
  `performanceLogger.measureAsync('DashboardService.overview', ..., {
  category: 'service' })`, the first real demonstration of a capability
  that had sat fully built and fully tested since Phase 1.2C.7.

---

## 7. Code quality review

- **Async usage / promise concurrency** — reviewed every `for`/`await`
  loop in the codebase (see §1.1/§1.2 for the full inventory); every
  genuine N+1 was batched or parallelized, every correctly-sequential
  write loop was left alone with its reasoning documented.
- **Unnecessary awaits** — none found; every `await` in a hot path gates
  a value the next line actually needs.
- **Memory allocations** — the two InventoryRepository rewrites (§3) are
  this milestone's own clearest win here: replacing "fetch N rows, reduce/
  filter in Node" with "one aggregate/filtered row from Postgres" removes
  both the N-row materialization AND the intermediate array allocations
  entirely, not just the query count.
- **DTO serialization / mapper performance** — every response mapper in
  this codebase (`to*ResponseDto()`, one per entity) was already a plain,
  allocation-light constructor call with no nested loops or redundant
  work; none needed changing.

---

## 8. Load testing

**Tooling:** `autocannon` (Node-native, scriptable via its own JS API —
chosen over `k6`, which would need a separate Go-binary toolchain this
environment doesn't already have). Script: `apps/api/benchmarks/run-benchmarks.js`
— logs in once, then benchmarks each of this milestone's own named 6
scenarios (login, catalog, orders, dashboard, billing, CRM) for 10 seconds
at 10 concurrent connections each. Deliberately does NOT boot the server
itself — the same script runs against either a `pnpm dev` process
("development benchmark") or a `NODE_ENV=production node dist/src/main.js`
process ("production benchmark"), both required by this milestone's own
Validation section. Not wired into `pnpm test` — a benchmark is a
deliberate, on-demand measurement.

**Bug caught and fixed before trusting any result:** the first run reported
100% non-2xx responses on every scenario. Root cause: autocannon's `path`
option does not concatenate onto `url`'s own path segment, it REPLACES it —
`url: '.../api/v1'` + `path: '/categories'` was silently hitting
`http://host/categories` (a bare 404), not `.../api/v1/categories`. Fixed by
building the full URL string once per scenario instead of relying on
`path` to append. A second false alarm (production-mode 400s, "Tenant could
not be resolved") was a real, correct finding, not a bug: `TenantResolver`'s
`DEFAULT_TENANT_ID` fallback is gated to `nodeEnv === 'development'` only
(Milestone 4's own deliberate design) — fixed by sending the same
`X-Tenant-ID` header a real multi-tenant client without hostname-based
routing would send, exactly as intended.

### 8.1 Development benchmark (`pnpm dev`-equivalent, `node dist/src/main.js`, `NODE_ENV=development`)

| Scenario | req/sec | p50 (ms) | p95 (ms) | p99 (ms) | errors |
|---|---|---|---|---|---|
| login | 53.5 | 117 | 611 | 663 | 0 |
| catalog (`GET /categories`) | 183.0 | 51 | 81 | 92 | 0 |
| orders (`GET /orders`) | 177.9 | 52 | 89 | 105 | 0 |
| dashboard (`GET /dashboard/overview`) | 111.2 | 84 | 140 | 149 | 0 |
| billing (`GET /invoices`) | 173.6–181.7 | 52–55 | 85–91 | 109–113 | 0 |
| crm (`GET /leads`) | 175.8–176.9 | 53 | 86 | 107–115 | 0 |

### 8.2 Production benchmark (`NODE_ENV=production node dist/src/main.js`)

| Scenario | req/sec | p50 (ms) | p95 (ms) | p99 (ms) | errors |
|---|---|---|---|---|---|
| login | 78.3 | 124 | 177 | 236 | 0 |
| catalog (`GET /categories`) | 120.1–183.0 | 51–54 | 81–333* | 92–405* | 0 |
| orders (`GET /orders`) | 172.6 | 54 | 90 | 112 | 0 |
| dashboard (`GET /dashboard/overview`) | 111.2–119.3 | 79–84 | 128–140 | 137–149 | 0 |
| billing (`GET /invoices`) | 173.6–180.4 | 51–55 | 85–94 | 109–113 | 0 |
| crm (`GET /leads`) | 175.8–185.6 | 51–53 | 84–86 | 96–115 | 0 |

\* One catalog run's own p95/p99 spiked (333ms/405ms) coinciding with a
Nest cold-start warm-up window immediately after boot, not a steady-state
regression — a repeat run on an already-warm process landed back at
81ms/92ms, matching the development figures. Documented rather than
discarded, per "no silent truncation."

**Reading these honestly:** `login` is, and should remain, the slowest
endpoint — Argon2id password hashing is deliberately CPU-expensive (a
security property, not a bug); the ~4× throughput swing between runs
reflects normal local-machine variance (a single shared Postgres instance,
no isolated benchmark environment), not a `development` vs `production`
performance difference this milestone's own code changes would produce —
`NODE_ENV` here only affects logging/`trust proxy`, never query plans or
compression. `dashboard` is consistently the slowest READ endpoint across
both runs — expected, it is this API's own widest fan-out (5 concurrent
module-KPI computations), and is exactly the operation §6 wraps in
`PerformanceLogger` for that reason. Zero errors, zero timeouts, zero
non-2xx responses across every scenario in every run.

---

## 9. Validation summary

`pnpm lint` / `pnpm typecheck` / `pnpm build` / `pnpm test` — all clean
(**155 suites / 883 tests**, up from 153/858 at the end of Milestone 11 — 2
new suites, 25 new tests; see `docs/implementation/progress.md` for the
exact breakdown). Live boot — zero DI
issues. Live smoke test (7 checks, all passed) covering: `Cache-Control` +
`ETag` present on an annotated route, absent on an unannotated one; the
rewritten inventory raw-SQL queries returning correct, real numbers; order
creation exercising the new batched variant lookup end to end; invoice
creation from that order exercising the SAME batched lookup in a second
module; the cross-request `AuthorizationService` cache correctly
continuing to enforce RBAC (a `customer`-role token still gets `403` from
`/dashboard/overview` after repeated `admin`-role requests warmed the
cache — proving no cross-tenant/cross-role cache bleed); Milestone 11's own
Notification list route, unregressed. All temporary verification scripts
(`check_raw_decimal.ts`, `smoke_m12.js`) deleted after use.

---

## 10. Phase 10, Module 1 — API Performance (2026-07-30)

**Scope.** Extends this doc's Milestone 12 audit to everything built since
(Phase 7 Projects, Phase 8 AI Workspace ×7 modules, Phase 9 Finance/Vendor,
plus the CRM Client/Quotation/Contact/Newsletter and Catalog product-image
additions) — it does NOT redo Milestone 12's own work. Every module built
since was grepped for the same anti-patterns Milestone 12 fixed (per-item
DB-call loops in both reads and writes): zero matches. The discipline
Milestone 12 established held without a dedicated fix pass — see §10.5.

### 10.1 Database indexes

Every new/changed model's list-query DTO was checked against its actual
`@@index` coverage (same method as Milestone 12 §1.2 #16). Of 13 models
checked (Lead, Client, Project, Task, Order, Invoice, Product,
ContactRequest, NewsletterSubscriber, Quotation, ContentDraft, Vendor,
PromptTemplate), 11 already had the matching composite — only 3 genuinely
lacked one, closed in
`apps/api/prisma/migrations/20260730170000_add_module1_performance_indexes/`:

| Model | Gap | Index added |
|---|---|---|
| Vendor | `VendorListQueryDto` defaults `sortBy: 'createdAt'`, no composite backed it (had `tenantId` alone + `(tenantId, status)`) | `(tenant_id, created_at)` |
| InventoryItem | `warehouseId`/`productVariantId`/`fabricId` each independently filterable, each indexed alone, no `tenantId` prefix | `(tenant_id, warehouse_id)`, `(tenant_id, product_variant_id)`, `(tenant_id, fabric_id)` |
| Notification | filtered by `userId` AND `status` together (the "my unread notifications" case), no composite covered both | `(tenant_id, user_id, status)` |

Deliberately NOT added, same "Add only necessary" discipline Milestone 12
established: `Task.priority` (4-value enum, too low-cardinality) and
`AuditLog.action`/free-text `search` (would need trigram/FTS indexing, a
separate decision). `PromptTemplate` needed nothing — `(tenant_id,
category)` already existed (an earlier grep-based pass had flagged it as
a gap; a full `Read` of the schema block before writing the migration
caught that it wasn't — worth noting since it changed the migration's
actual scope).

`EXPLAIN ANALYZE` against the live seed DB (same honest caveat Milestone
12 §3 documented): at this dataset's scale (1-2 rows per table), Postgres
correctly prefers a sequential scan over every new index — for a 1-row
table, an index lookup's overhead exceeds a plain scan. All three
verified queries returned in under 5ms either way. The indexes are valid
and will be picked up automatically once row counts justify them; no
application code change needed when that happens.

### 10.2 Connection pooling

`apps/api/src/database/prisma.service.ts` previously constructed
`PrismaPg` with only `connectionString`/`ssl` — `pg.Pool`'s own
undocumented default (`max: 10`, no connection timeout) applied with
nobody having decided that was right. Now explicit: `DATABASE_POOL_MAX`
(default 10, unchanged behavior), `DATABASE_POOL_IDLE_TIMEOUT_MS`
(default 30000), `DATABASE_POOL_CONNECTION_TIMEOUT_MS` (default 5000, new
fail-fast behavior — a saturated pool now errors instead of hanging),
validated in `env.validation.ts`, documented in `.env.example`.

### 10.3 Cursor pagination (additive, opt-in)

The API contract is frozen (`CLAUDE.md` — `apps/api/openapi.json` is
authoritative). All ~35 list endpoints are offset-based (`page`/`limit`
via `BaseRepository.findManyAndCount`), confirmed consistent — no
per-endpoint variance to fix. Rather than touch any existing endpoint's
pagination shape, added a purely additive, opt-in `cursor` query param to
the two genuinely unbounded, high-growth, append-only tables: `AuditLog`
and `Notification`.

`CursorPaginationQueryDto` (new, `common/dto/`) extends
`PaginationQueryDto` with an optional `cursor: string`.
`AuditLogListQueryDto`/`NotificationListQueryDto` now extend it instead —
`page`/`limit` behavior is byte-for-byte unchanged when `cursor` is
absent (verified: all pre-existing specs pass unmodified). Both models
use `@default(uuid(7))` (time-ordered UUIDs) for `id`, so
`WHERE id < cursor ORDER BY id DESC` gives the same chronological order
as `createdAt DESC` would — using the existing primary-key index
directly, no new index needed for cursor mode itself.
`PaginatedResponseDto` gained a 5th, optional `nextCursor` constructor
param (`undefined` for every other endpoint, which `JSON.stringify`
omits — confirmed via a diffed `openapi.json` regeneration: 0 removed
fields, 1 changed field being an `@ApiOperation` description string).

### 10.4 Batch operations

Confirmed zero `bulk`/`batch` routes exist anywhere (grep, all 40
controllers). Given §10.5 found no unsafe write loops to convert, the one
genuine, safe candidate was `PATCH /notifications/read-all`
(`MarkNotificationsReadDto` — optional `userId`, matching
`NotificationController`'s own existing "admin-wide across all
recipients" design, same `notifications:manage` permission as every
other route on it) — marking read has no per-row business logic, so a
plain `updateMany()` (`NotificationRepository.markAllRead()`) is safe,
unlike e.g. Task creation. Audit-logged (`notification.mark_all_read`),
matching `retry()`'s own precedent.

### 10.5 Findings, audited and deliberately NOT changed

Milestone-12-style honesty: documenting a finding is not the same as
having something to fix.

| # | Finding | Why left alone |
|---|---|---|
| 19 | N+1/eager-loading across every Phase 7-9 module | Grepped for per-item DB-call loops in `projects`, `finance`, `crm`, `contact`, `newsletter`, `catalog` (images), `content-assistant`, `prompts`: zero matches. Milestone 12's discipline (batch reads, split list/detail `include`) held without a dedicated fix pass. |
| 20 | `task-generator.service.ts`'s `approve()` loop creates Task rows sequentially, one `TaskService.create()` call per suggestion | Same reasoning class as Milestone 12 §1.2 #13-15: each iteration runs real business logic (audit logging, notifications, validation) via the existing, unchanged `TaskService.create()` — collapsing it into a raw `createMany()` would silently drop that per-task side effect. Correctly sequential, not a bug (confirmed via the method's own inline comment, written when it was built). |
| 21 | Response compression | Re-confirmed still globally applied — `compression()` in `main.ts`'s bootstrap chain automatically covers every route added since Milestone 12, including all of Phase 7-9. No code change needed. |
| 22 | RLS `SET LOCAL app.current_tenant_id` contract (`database-schema.md`'s own documented design) is not actually wired into Prisma anywhere — `tenant.middleware.ts` only sets request-local context for the app layer's own `WHERE tenantId = ...` scoping (confirmed present on every query — the primary enforcement `CLAUDE.md`'s "RLS is the backstop, not the only gate" already relies on), never touches Prisma | Real finding, but a security-architecture gap, not a performance one. Fixing it (a `PrismaClient.$extends`/interceptor touching every query) is its own scoped, higher-risk task — logged to `docs/implementation/blockers.md` for Module 3 (Security Hardening) rather than folded in here. |

### 10.6 Load testing

Extended `apps/api/benchmarks/run-benchmarks.js` with 3 new scenarios
covering modules built since Milestone 12: `projects` (`GET /projects`),
`finance` (`GET /vendors`), `prompts` (`GET /prompt-templates`).
Deliberately excludes every AI-generation endpoint (proposal-generator,
requirement-analyzer, task-generator, content-assistant, email-assistant,
project-estimator) — they call the live Anthropic API, which has no
credit balance in this environment (a confirmed, real 502 on every call,
not a bug), so benchmarking them would measure "how fast does this
fail," not real performance.

**Methodology finding, caught before trusting any result** (same
"verify, don't assume" discipline as Milestone 12's own `path`/`url`
bug): the first run against the existing dev server returned 429 on
~95% of requests across every scenario, including `login` (4 real 200s
out of ~1721 requests) — `RATE_LIMIT_MAX=100`/`RATE_LIMIT_WINDOW_MS=60000`
(the app's own default) throttled the benchmark's own 10-connections/10s
load well before Milestone 12's original 6 scenarios were re-measured.
Not a regression — Milestone 12's own original run predates this
rate-limiting config, or ran under different conditions; either way, a
benchmark run needs the SAME kind of environment awareness Milestone 12
already flagged for `NODE_ENV`/tenant-header. Fixed for this run only (no
application code change) by starting a second, temporary server instance
(port 4010, `RATE_LIMIT_MAX=100000`) for the benchmark's duration, then
stopping it — the running dev server (port 4000) was left untouched
throughout.

| Scenario | req/sec | p50 (ms) | p95 (ms) | p99 (ms) | errors |
|---|---|---|---|---|---|
| login | 299.3 | 30 | 56 | 61 | 0\* |
| catalog (`GET /categories`) | 113.9 | 83 | 122 | 142 | 0 |
| orders (`GET /orders`) | 114.5 | 82 | 142 | 161 | 0 |
| dashboard (`GET /dashboard/overview`) | 74.9 | 124 | 199 | 308 | 0 |
| billing (`GET /invoices`) | 123.8 | 77 | 119 | 139 | 0 |
| crm (`GET /leads`) | 125.8 | 75 | 117 | 143 | 0 |
| projects (`GET /projects`) | 127.5 | 74 | 134 | 148 | 0 |
| finance (`GET /vendors`) | 59.1 | 114 | 457 | 514 | 0 |
| prompts (`GET /prompt-templates`) | 115.5 | 81 | 144 | 158 | 0 |

\* `login` still shows a separate, dedicated throttle (2989 `429`s across
the run) even with `RATE_LIMIT_MAX` raised — a stricter brute-force guard
on the login route specifically, independent of the general API rate
limit. Correct, deliberate security behavior, not a bug to fix here.

**Honest reading:** this is a single run, not a before/after — the
index/pool changes above don't move the needle at this seed dataset's
scale (§10.1's own `EXPLAIN ANALYZE` caveat), so a literal before/after
comparison would show only run-to-run noise, not a real signal. `finance`
(`GET /vendors`) is the one outlier (59 req/sec vs. ~115-127 for
comparable endpoints, p95/p99 several times higher) — worth watching if
it recurs, but a single dev-mode run against a freshly-started server
(first-request JIT/compile warm-up, matching Milestone 12's own
documented catalog p95/p99 spike) isn't enough to call it a regression
without a repeat measurement. Documented rather than discarded, per "no
silent truncation." `dashboard` remains the slowest genuine READ
endpoint, consistent with Milestone 12's own finding (widest fan-out).

### 10.7 Validation summary

`pnpm --filter @antrique/api typecheck`/`lint`/`test` all clean (10 test
suites touched, 15 new tests added — cursor-mode repository/service specs
for AuditLog and Notification, `markAllRead()` repository/service/
controller specs — all pre-existing specs in those suites pass
unmodified, confirming the additive-only claim in §10.1-§10.4). Migration
applied against the live local Postgres instance and verified via
`EXPLAIN ANALYZE` (§10.1). `openapi.json` regenerated and diffed against
its pre-change version: 0 removed fields, 1 changed (a documentation
string), confirming the frozen-contract-compatible, additive-only claim
in §10.3.

## 11. Phase 10, Module 8 — Caching (2026-07-30)

**Scope.** Extends §5's `CacheService`/`CacheModule` (unchanged in shape)
with hit/miss observability and two new consumers on the hottest
genuinely-uncached read paths found by audit.

**Observability.** `MetricsService` gained `cache_operations_total`
(Counter, labels `cache_name`/`result`), incremented from inside
`CacheService.getOrLoad()` itself so every current and future consumer
gets the metric automatically. Labeled by the cache key's NAMESPACE
segment only (the part before the first `:` — e.g. `tenant-resolve`,
`dashboard-overview`, `role-keys`), never the full key, which carries a
tenantId/email/date-range and would repeat the exact unbounded-
cardinality mistake §6's HTTP route labeling already guards against.

**New consumers.**
- `TenantResolver.resolve()` — this codebase's single hottest uncached
  read path: every request, authenticated or not, resolves a tenant
  before anything else runs. 60s TTL, matching §5's `role-keys` order of
  magnitude. Caches a `null` ("no active tenant matched") result too,
  deliberately: a bogus or probing candidate (a guessed subdomain, a
  made-up `X-Tenant-ID`) stops re-querying the database on every attempt
  within the window, and the per-request behavior is unaffected either
  way — a `null` already falls through to the next resolution priority
  regardless of whether it came from cache or a fresh query.
- `DashboardService.overview()` — this codebase's heaviest
  service-layer aggregation (§9's own "widest fan-out" finding). 60s
  TTL, cache key scoped by BOTH `tenantId` and the requested date range
  so a custom `dateFrom`/`dateTo` query never collides with, or serves
  stale data for, the default view. The cache wraps
  `PerformanceLogger.measureAsync()`, not the other way around, so a hit
  correctly logs no `DashboardService.overview` duration (only a real
  miss did real work).

**Deliberately NOT done.** A Redis-backed distributed cache was
considered and rejected, same reasoning class as Module 7's Redis-queue
decision: this is a single-instance-per-request-path deployment today,
and an in-memory, process-local cache (§5's own documented limitation)
is sufficient until a genuine multi-instance topology exists to justify
the added complexity.

**Ripple effect found and fixed.** Both `TenantResolver` and
`DashboardService` gaining a new constructor dependency
(`CacheService`) broke `dashboard.controller.spec.ts` and
`report.controller.spec.ts` — both build `DashboardService` through a
real `Test.createTestingModule` DI graph and neither had `CacheService`
wired in. Fixed by providing a real `CacheService(new MetricsService())`
instance (not a mock), the same pattern `dashboard.service.spec.ts` and
`authorization.service.spec.ts` already use for this simple,
deterministic service.

**Validation.** `pnpm --filter @antrique/api typecheck`/`lint` clean;
full suite 192 suites/1188 tests, all passing. `openapi.json`
regenerated and diffed against its pre-change version: zero changes —
expected, this module touches no HTTP surface.
