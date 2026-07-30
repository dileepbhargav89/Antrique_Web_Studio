# Business Portal (`apps/web`, `(portal)` route group)

The authenticated business application built on top of Phase 1's shell
(`PortalShell`/auth/query runtime) and Phase 3's login flow. Implements
real, working frontends for all seven Backend v1.0 business modules —
Catalog, Bespoke, Orders, Inventory, CRM, Billing, Admin — driven entirely
by the real, frozen API. No backend changes; no invented workflows.

## Ground truth, not guesswork

The generated `src/types/api/schema.ts` is confirmed useless for
field-level typing — every request/response DTO in it is
`Record<string, never>` and every list endpoint's query params are typed
`never`; only routes/methods/path-params/status-codes are trustworthy
there. Every type in `types/api/{catalog,bespoke,orders,inventory,crm,
billing,admin,customers}.ts` was hand-authored by reading the real
`apps/api/src/modules/*/dto/*.ts` / `*.controller.ts` / `constants/*.ts`
source directly — constructor-parameter class fields, `@Is*()`
validators, route tables, and permission strings, not inferred.

**No `/me` endpoint exists anywhere in the backend.** The frontend can
never know the current user's role/permissions. Every action in this
portal renders uniformly for every authenticated user; a 403 is handled
gracefully via the existing `getErrorCopy()` (Phase 3) — "You don't have
access to this" — rather than pre-emptively hidden.

## Shared foundation (`components/data/`)

Built once, reused by all seven modules — this is the one abstraction
that makes seven list/detail pages tractable:

- **`resource-table.tsx`** — wraps the existing `DataGrid`
  (`components/ui/data-grid.tsx`, sort + `aria-sort` already built in)
  with the loading (`Skeleton` rows) / error (`ErrorState` +
  `getErrorCopy()`) / empty states `DataGrid` itself deliberately doesn't
  handle. Accepts `readonly T[]` — every `PaginatedResponse<T>.items` is
  readonly.
- **`use-list-params.ts`** — URL-search-param-driven `page`/`limit`/
  `search`/`sortBy`/`sortDirection`/module-specific `filters` state.
  Any filter/search/sort change resets to page 1. Every module's list
  page is client-fetched (not per-page routed), so pagination/filter
  Selects call `setParams()` rather than using real `<a href>`s.
- **`list-toolbar.tsx`** — debounced (300ms) search input + a `filters`
  slot for per-module `Select`s + a conditional "Clear filters" button.
- **`list-pagination.tsx`** — thin wrapper around the existing
  `Pagination`/`PaginationContent`/`PaginationItem` structural primitives
  with plain `Button` onClick handlers, not `PaginationLink`'s real
  `<a href>`s (those are for per-page routes, which none of these lists
  are).
- **`status-badge.tsx`** — `<StatusBadge label tone />` over the existing
  `Badge`, with a `default|success|warning|destructive|info|muted` tone
  table. `--color-success`/`--color-warning`/`--color-info` (+
  `-foreground`) are registered in `globals.css`'s `@theme inline` block,
  confirmed real Tailwind utility classes before this was built on.
- **`detail-page-header.tsx`** — title + optional `StatusBadge` + an
  actions slot, reused for both list-page and detail-page headers.
- **`components/ui/alert-dialog.tsx`** (new, hand-authored) — the shadcn
  CLI is still unreachable this session (same tool-execution outage
  documented since the Application Runtime Architecture phase);
  hand-authored from `radix-ui`'s `AlertDialog` primitive (already a
  dependency) mirroring `dialog.tsx`'s structure, matching the Design
  System phase's own precedent (`form.tsx`) for CLI-unavailable
  primitives. Reused for every destructive/terminal confirmation: Cancel
  Order, Archive Lead, Convert Lead, Void Invoice.

**A deliberate, load-bearing design choice**: every column definition in
every module sets `enableSorting: false`. `DataGrid`'s built-in
header-click sort is entirely client-side (its own `useState<SortingState>`
+ `getSortedRowModel()`) and would re-sort only the currently-fetched
page — silently contradicting the URL-driven server sort every list here
actually uses. An explicit "Sort by" `Select` (mapping to real
`sortBy`/`sortDirection` query params) is the one thing that actually
calls the API with a new order.

## Per-module architecture

### Catalog (`app/(portal)/catalog`)

List: search/category/collection/status filters, sort by name/createdAt/
sortOrder, pagination. Detail: full product fields + `variants[]` +
`images[]` (both populated only on `GET /products/:id`, omitted on list
rows). No create/edit UI — categories/collections are read-only reference
data fetched only to populate filter dropdowns.

### Bespoke (`app/(portal)/bespoke/customize/[productId]`)

Reached from a Catalog product's detail page (a "Customize & order"
button, shown only when `GET /product-customizations?productId=` returns
a match — the relationship is one-to-one, confirmed by the backend's own
409 on a second customization for the same product). A 4-step wizard
(local `useState`, not RHF — the field set is data-driven per product,
unlike the marketing Quote wizard's fixed schema): customer search +
variant + quantity + warehouse → style options (one radio per group,
required groups enforced) → monogram (optional, text validated against
`maxCharacters`/`allowedCharacters`) → review (indicative price, clearly
labeled non-binding) → `POST /orders`.

**Real, load-bearing gap discovered while building this**: Fabric and
MeasurementProfile are both real, fully-CRUD backend entities (`GET
/fabrics`, `GET /measurement-profiles`), but reading `order.service.ts`'s
`computeCustomizationPricing()` and `CreateOrderItemDto` directly confirms
**neither has any field on the order-creation request** — only
`productCustomizationId` + `selectedOptions.{styleOptionIds,
monogramOptionId, monogramText}` flow into an order line item. The wizard
surfaces Fabric as a clearly-labeled **read-only reference panel** in the
review step ("shown for reference during the conversation with the
customer, not submitted with this order") rather than a selectable field
that would falsely imply it affects the order. Measurement Profiles are
omitted from the wizard entirely — there was no honest way to represent
them without inventing a field the backend contract doesn't have.

Style-option cross-group incompatibility checking was also scoped out:
`incompatibleStyleOptionIds` exists only on the standalone
`GET /style-options/:id` response, not the nested view
`ProductCustomizationResponseDto` already provides, and fetching it per
option would be an unjustified N+1 for this phase. The wizard enforces
one-selection-per-`isRequired`-group instead, which is the shape the
nested data actually supports.

### Orders (`app/(portal)/orders`)

List rows omit `items`/`statusHistory`; detail (`GET /orders/:id`)
includes both. Status: `ORDER_FORWARD_TRANSITIONS` is a strict one-step
map (`DRAFT→PENDING→CONFIRMED→PROCESSING→COMPLETED`, both COMPLETED and
CANCELLED terminal) — the detail page's only status action is "Advance
to `<the one legal next status>`", never a free picker. Cancel is a
**separate** action (`POST /orders/:id/cancel`, `orders:cancel`
permission — stricter than the `orders:write` tier that covers
create/update/advance), shown via `AlertDialog` only while
`ORDER_CANCELLABLE_STATUSES` includes the current status. Line items show
the raw `productVariantId` (truncated, full id in a tooltip) rather than
a resolved product/variant name — **no reverse lookup endpoint exists**
(variants are nested-write-only under a product, immutable after
creation, with no standalone `GET /product-variants/:id`).

### Inventory (`app/(portal)/inventory`)

`InventoryItem` has **no status/lifecycle field at all** —
`available` is computed server-side (`onHand - reserved`), but
"in stock / low stock / out of stock" is entirely client-derived
(`features/inventory/stock-level.ts`'s `deriveStockLevel()`:
`available <= 0` → out of stock; `reorderPoint != null && onHand <=
reorderPoint` → low stock; else in stock). Item rows and the
Transactions ledger show the raw variant/fabric id (same no-reverse-lookup
gap as Orders). Warehouses and Suppliers get list **and** detail pages
(Supplier detail shows its `products[]` — the one place a supplied
item's linkage is genuinely useful to see); Items and Transactions are
list-only, matching the brief's own bullets. A link-based sub-nav
(`inventory-nav.tsx`) — not Radix `Tabs` — keeps these four as real,
bookmarkable routes.

### CRM (`app/(portal)/crm`)

Lead: `LEAD_TERMINAL_STATUSES = ['CONVERTED', 'ARCHIVED']` gate the
Archive/Convert `AlertDialog` actions (hidden once terminal).
`LeadStatus.LOST` is a real enum value with **no endpoint that ever sets
it** — confirmed orphaned, not built around. Follow-up: Complete/Cancel/
Reopen wired inline in the list (no confirmation dialog — reversible,
low-risk actions per the shared-UX convention). Customer has no
standalone list page (there's no `customerId`-agnostic browse need this
phase surfaces) — reached via a Lead's `convertedCustomerId` or an
Order's `customerId`, both now real links. Customer detail: Notes (the
one genuinely create-capable CRM entity beyond status actions) and a
read-only Activity timeline (`GET /customer-activities/timeline` — not
paginated, the full chronological feed for one customer, a deliberately
different shape from the paginated `list()`).

### Billing (`app/(portal)/billing`)

Invoice: Issue (`POST /invoices/:id/issue`, DRAFT → SENT only) and Void
(`INVOICE_VOIDABLE_STATUSES = ['DRAFT','SENT','OVERDUE']`, `AlertDialog`
confirmed, Admin-only `invoices:void` permission — a 403 here is
expected for Manager and handled gracefully, not hidden).
`InvoiceStatus.OVERDUE` is real with no confirmed automatic
DRAFT/SENT→OVERDUE transition (no cron/job exists) — same class of gap as
Lead's `LOST`. Payments is read-only (list + detail) — `POST
/payments/:id/refund` always returns 501 (confirmed genuine placeholder,
its own Swagger doc says so explicitly), so no refund UI was built.

### Admin (`app/(portal)/admin`)

Dashboard (`GET /dashboard/overview`) renders each module's KPI cards
**generically** from `Object.entries(metrics)` — the response DTO is
deliberately `{ module: string; metrics: Record<string, string | number>
}`, a loose bag by the backend's own design (each module computes
genuinely different metrics), so the frontend doesn't hardcode field
names the DTO itself doesn't guarantee. Notifications: list + Retry
(`NOTIFICATION_RETRYABLE_STATUSES = ['FAILED']` only). Audit Logs:
read-only, filterable (Admin/Super Admin only — `audit_logs:read`).
Reports: Generate (the 4 real `ReportType`s, synchronous — computes and
stores a snapshot immediately) + list + detail rendering the stored
`result` JSON snapshot as-is (`<pre>`, not a fabricated chart/table shape
the backend doesn't promise — "Download metadata" returns JSON, never a
file). **No user/role management screen** — confirmed no such API exists
at all (no `users`/`roles` module; roles are 100% seed-data-driven).

## Navigation

`config/navigation.ts`'s `PORTAL_NAV_ITEMS` (mocked since Phase 1 —
`Projects`/`Documents`/`Support`/`Settings`, none backed by a real
backend module) was replaced with the seven real modules. While doing
this, found and fixed a real, silent bug: `ROUTES.portal.dashboard` (the
post-login redirect default in `login-form.tsx`'s `safeRedirectPath()`)
pointed at a route with no `page.tsx` — every successful login would have
404'd, invisible until this phase had anything to check it against. Built
a real landing page (`app/(portal)/dashboard/page.tsx`, a simple hub
linking into the seven modules — not a duplicate of `/admin`'s KPI
dashboard) rather than just repointing the redirect elsewhere.

## Known, deliberate scope limits

- No create/edit forms for entities the brief's own bullets don't ask a
  workflow for (Category/Collection, Product variants/images,
  Warehouse/Supplier, Style Option Groups) — several have no standalone
  write endpoint at all (nested-write-only under their parent).
- No Fabric/MeasurementProfile order integration (see Bespoke above) —
  a real backend contract gap, not an oversight.
- No style-option cross-group incompatibility enforcement (see Bespoke
  above) — would require an unjustified N+1.
- No reverse variant/fabric id → name lookup anywhere (Orders line
  items, Inventory item rows, Supplier supplied-items) — no such
  endpoint exists.
- No optimistic updates on Order/Invoice status changes — the server is
  the source of truth for computed fields (totals, status history);
  optimistic updates were reserved for genuinely low-risk, easily-rolled-
  back actions this phase didn't end up needing (Follow-up
  complete/cancel/reopen use a plain invalidate-on-success instead, which
  was judged sufficient).

## Validation

The tool-execution outage (Bash/PowerShell both return exit code 1 with
no output) persisted for this entire phase, unchanged since the
Application Runtime Architecture phase — `pnpm --filter @antrique/web
typecheck`/`lint`/`build` could not be run. Grep intermittently recovered
partway through this phase (broken all session before that) and was used
to confirm no dangling references to the removed mocked routes/nav items
survived the navigation rewrite; Glob remained broken throughout. Every
type, route, and permission fact in this document was verified by reading
the real `apps/api` source directly — dozens of controller/DTO/constant
files across all seven modules — not assumed from an earlier research
pass alone (one such pass was found mid-phase to be incomplete on the
load-bearing `CreateOrderItemDto.selectedOptions` shape, corrected by
reading the real source before the Bespoke wizard was built).

Manual/dev-server verification (real seeded data, filters/sort/pagination
round-tripping, every write action succeeding against a running
`apps/api` and correctly surfacing a 403 for an under-permissioned role)
could not be performed this session — no working shell to start the dev
server. This is the first thing to do once shell access returns, before
this phase can be called fully validated.

## Engineering Review (post-build)

A full review-and-fix pass, modeled on the Backend v1.0 Review phases.
Zero new modules/features/redesigns — see `docs/implementation/
decisions.md`'s 2026-07-26 entries for full reasoning on each. Findings:

- **`use-list-params.ts` used `router.push()` instead of `router.replace()`**
  — every filter/search/sort/page change across all 7 modules added a
  browser-history entry, breaking the Back button. Fixed in the one
  shared file, fixing every module's list page at once.
- **The Bespoke wizard's customer search had no debounce** (every other
  module's search box does, via `list-toolbar.tsx`) — fired one
  `GET /customers` request per keystroke; fixed, and the same fix
  resolved a flash-of-"no results" bug mid-debounce. Also fixed: the
  selected customer displayed as a raw UUID instead of their name.
- **Four sub-nav components** (`inventory-nav`/`crm-nav`/`billing-nav`/
  `admin-nav.tsx`) were near-duplicates with inconsistent active-tab
  logic — consolidated into `components/data/module-sub-nav.tsx`.
- **Nine status/type filter `Select`s** were near-duplicates, several
  with a real, visible mismatch (Title-Cased filter option vs. raw-enum
  `StatusBadge` in the same row) — consolidated into `components/data/
  enum-filter-select.tsx`, normalized to match the badges everywhere.
- **Four raw hand-rolled `<table>` elements** (Catalog variants, Order
  items, Invoice line items, Supplier supplied-items) replaced with the
  existing `Table` component family already used by `DataGrid`.
- **Four `AlertDialogAction` destructive/terminal buttons** (Order
  Cancel, Lead Convert, Lead Archive, Invoice Void) were missing the
  `disabled={mutation.isPending}` double-submit guard every other write
  action in the portal already had — added for consistency.
- **Verified clean, not changed**: no `console.*`/`any`/`TODO`/
  `dangerouslySetInnerHTML`/raw `fetch()` anywhere in `(portal)`; no
  refund UI (still 501-only server-side); `CustomerNote.body` stays
  plain-text-rendered (safe default given the backend's own ambiguous
  "sanitized HTML/markdown" DTO comment); Payments/Notifications/
  Audit-Logs' lack of a sort control reviewed and kept as a deliberate
  ledger-view default, not "fixed" by adding new UI.
