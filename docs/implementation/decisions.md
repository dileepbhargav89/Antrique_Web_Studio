# Decisions Log

Lightweight record of choices made DURING the build (bigger architectural ones go
in docs/architecture/adr/). One entry per decision. Newest at top.

Format:
## YYYY-MM-DD — <short title>
- **Decision:** what you chose
- **Why:** the reason
- **Alternatives:** what you rejected
- **Affects:** files/areas

---

## 2026-07-30 — `FormLabel` crashes outside a real `<FormField>`; fixed in both Vendor and Client edit dialogs
- **Decision:** in `VendorFormDialog`'s (new, Phase 9 Step 1) and
  `ClientFormDialog`'s (Phase 7, already shipped) Status field — plain
  `useState`, not an RHF-registered field — replaced `<FormLabel>Status
  </FormLabel>` with the base `Label` component (`@/components/ui/
  label`, no react-hook-form dependency).
- **Why:** discovered live — clicking "Edit" on the new Vendor detail
  page crashed the whole page via the portal's route error boundary
  (`Error: useFormField must be used within a <FormField>`).
  `components/forms/form.tsx`'s `FormLabel` unconditionally calls
  `useFormField()`, which throws immediately if there's no react-hook-
  form `Controller` context above it — `<FormItem>` alone (which the
  Status block does have) isn't enough. `VendorFormDialog`'s Status
  block was written by copying `ClientFormDialog`'s exact pattern
  (documented as the established convention for this dialog shape) —
  meaning `ClientFormDialog` has carried this exact crash, undiscovered,
  since Phase 7, simply because no prior session clicked "Edit" on a
  Client and hit it live.
- **Alternatives:** wrapping the Status field in a no-op `<FormField
  name="status" control={form.control} render={...} />` just to satisfy
  `useFormField()`'s context requirement (rejected — `status` isn't part
  of the Zod-validated form schema at all, on either dialog; forcing it
  through RHF only to immediately discard the value on submit is more
  complex than the actual fix, not less).
- **Affects:** `apps/web/src/app/(portal)/finance/vendors/
  vendor-form-dialog.tsx` and `apps/web/src/app/(portal)/crm/clients/
  client-form-dialog.tsx` only — one line + one import each. Verified
  live after the fix: both dialogs' Edit flow opens and submits without
  error (Vendor's `updatedAt` confirmed changed via a follow-up API call).

## 2026-07-30 — Fixed a fresh-database-breaking bug in `20260729090000_add_project_management`
- **Decision:** rewrote that migration's SQL to contain only the `comments`
  table's statements (table, indexes, FKs, CHECK, RLS) — every `CREATE
  TYPE`/`CREATE TABLE`/index/FK/RLS statement for `projects`/
  `project_members`/`milestones`/`tasks`/`documents`/`activity_logs` was
  removed. Recomputed the file's checksum and updated it directly in
  `_prisma_migrations` (a metadata-only `UPDATE`, no schema/data touched —
  confirmed safe first: `applied_steps_count` for this row was already 0,
  meaning the file's SQL was never literally executed against this
  database in the first place).
- **Why:** discovered while generating Phase 9's first migration (Vendor
  Management) — `prisma migrate dev`'s shadow-database replay failed with
  `type "ProjectStatus" already exists`, because this migration's own
  header comment already said those six tables were reconciled via
  `prisma migrate resolve --applied` (real DB never re-ran this SQL) while
  the file itself still contained literal `CREATE TYPE`/`CREATE TABLE` for
  all six, redundant with `20260717090000_init` +
  `20260717091500_row_level_security` (confirmed by grep — every type/
  table/RLS statement for those six tables already exists there). Only
  `comments` was ever genuinely new. Left as-is, this file would fail
  identically for anyone running `prisma migrate deploy` against a truly
  fresh database — a new developer's machine, CI, or a real production
  first deploy — not just this shadow-DB check.
- **Alternatives:** `prisma migrate reset` (rejected — destructive, drops
  the entire dev database/data; not taken without explicit user
  authorization per this session's own safety rules, and unnecessary once
  the real root cause — file content not matching what was actually
  applied — was identified); leaving the file broken and working around
  it per-migration going forward (rejected — the same shadow-DB failure
  would recur on every future migration, and the fresh-database/production
  risk would persist silently).
- **Affects:** `apps/api/prisma/migrations/20260729090000_add_project_management/migration.sql`
  (content rewritten) and the dev database's `_prisma_migrations.checksum`
  row for that migration (metadata-only). No application code, no schema
  change, no data change.

## 2026-07-30 — Enterprise Operations Suite is Phase 9, not Phase 8; Finance is Module 1
- **Decision:** the user's 15-module "Enterprise Operations Suite" brief
  (Finance, Contracts, HR, Resource Planning, Time Tracking, Help Desk,
  Knowledge Base, Calendar, Integrations, Analytics, Search, Automation,
  Audit, Feature Flags, Quality Review) is tracked as **Phase 9** in
  `progress.md`, not Phase 8 — the brief itself called it "Phase 8," but
  that name was already in use for the AI Workspace (Steps 1–8, now
  backend-complete). Confirmed with the user: finish Phase 8 Step 8
  (Email Assistant) first — turned out to already be done, just
  undocumented (see progress.md's backfilled entry) — then start Phase 9.
  Module 1 (Finance) was picked as the starting module over Help Desk or
  HR, since `Invoice`/`InvoiceItem`/`Quotation`/`QuotationItem`/`Payment`/
  `PaymentRecord`/`PaymentAllocation`/`TaxRate` already exist in the
  schema — the least net-new-schema starting point of the three offered.
- **Why:** two names for one phase number would make `progress.md`
  ambiguous for every future session; per CLAUDE.md's own working rule
  ("work ONE task at a time, scoped"), 15 modules — most needing brand-new
  Prisma models, migrations, RLS policies, services, controllers, and
  `apps/web` pages each — cannot responsibly start as one undifferentiated
  effort without repeating exactly the duplicate-services/duplicate-forms
  problem the brief's own Module 15 ("Quality Review") asks to clean up
  later.
- **Alternatives:** pausing/deprioritizing Phase 8 indefinitely to start
  Phase 9 immediately (rejected by the user — Phase 8 Step 8 was finished
  first, even though it turned out already done); starting with Help Desk
  (fully new domain, self-contained, no dependency risk) or HR (foundational
  for Resource Planning/Time Tracking) instead of Finance (rejected —
  Finance reuses the most existing schema/services, lowest risk to start).
- **Affects:** `docs/implementation/progress.md` (Phase 9 status line +
  Next-3-tasks), this entry. No code yet — Module 1 (Finance) scoping/
  implementation is the next session's work, not started here.

## 2026-07-29 — `CORS_ALLOWED_ORIGINS` was missing `:3001`, silently blocking every browser-side API call
- **Decision:** added `http://localhost:3001` alongside the existing
  `http://localhost:3000` in `apps/api/.env`'s `CORS_ALLOWED_ORIGINS`.
- **Why:** the web dev server (`apps/web`) falls back to port 3001
  whenever port 3000 is already occupied (a pre-existing process on this
  machine holds it) — confirmed live in `next dev`'s own startup log. The
  API's CORS allowlist only had `:3000`, so every `fetch()` the frontend
  made to the API from origin `:3001` was silently blocked by the browser
  — the request left the client, the server logged nothing wrong
  (CORS is enforced client-side, on the response), and the symptom looked
  exactly like "the API is unreachable." Spent significant effort earlier
  in this session diagnosing that as a browser-automation-tool/networking
  problem before finding the real, one-line cause while adding the
  Phase 8 AI env vars to the same file.
- **Alternatives:** free up port 3000 instead (rejected — doesn't fix the
  underlying fragility; the next environment/session hitting a occupied
  :3000 would reintroduce the exact same silent failure); listing origins
  more permissively, e.g. a wildcard or regex (rejected — this app's CORS
  config is meant to be an explicit allowlist, not a fnmatch surface, and
  local dev already has cheap explicit ports to enumerate).
- **Affects:** `apps/api/.env` only (local dev config, git-ignored) —
  no code change. `apps/api/.env.example`/`env.validation.ts` already
  documented `CORS_ALLOWED_ORIGINS` as a plain comma-separated list; no
  update needed there.

## 2026-07-26 — Portal Engineering Review: `use-list-params.ts` uses `router.replace`, not `router.push`
- **Decision:** every list-state change (search, filter, sort, page)
  calls `router.replace()` instead of `router.push()`.
- **Why:** `push` was the original implementation — every keystroke in a
  debounced search box, every filter Select change, and every page click
  added its own browser-history entry. Since this hook is shared by all
  seven business modules' list pages, the effect was systemic: clicking
  Back after using any list filter stepped through each incremental
  change one at a time instead of leaving the list page, an experience
  bad enough to undermine trust in the whole portal's navigation. Found
  during the Phase 4 Engineering Review by tracing what `setParams()`
  actually does to browser history, not by a user report.
- **Alternatives:** debounce at the `router.push` call site instead of
  fixing the underlying method (rejected — doesn't address the
  filter/sort/page-click cases, only search-as-you-type); keep `push`
  and rely on users not really using Back after filtering (rejected —
  Back is a fundamental browser affordance, not an edge case).
- **Affects:** `components/data/use-list-params.ts` (fixes all 7
  modules' list pages simultaneously — no per-module changes needed).

## 2026-07-26 — Portal Engineering Review: consolidated 4 sub-navs and 9 status filters into shared components
- **Decision:** `inventory-nav.tsx`/`crm-nav.tsx`/`billing-nav.tsx`/
  `admin-nav.tsx` now each wrap a new shared `components/data/
  module-sub-nav.tsx`; nine per-module status/type filter `Select`s now
  wrap a new shared `components/data/enum-filter-select.tsx`.
- **Why:** both were genuine, mechanical duplication (the explicit target
  of this review's Part 11) discovered by re-reading the four/nine
  call sites side by side, not assumed. The sub-nav consolidation also
  fixed a real correctness gap: each nav had independently reinvented
  "is this tab active" logic, and only `admin-nav.tsx` (the one module
  where a tab's href is a literal parent of its siblings) needed the
  more careful "longest matching prefix" rule the shared component now
  applies uniformly. The filter consolidation surfaced a genuine,
  user-visible inconsistency: several modules (Catalog, Warehouses,
  Suppliers, Follow-ups) Title-Cased their filter labels ("Draft") while
  the `StatusBadge` in the same table row shows the raw enum text
  ("DRAFT") — normalized to match the badges rather than leaving the
  mismatch or arbitrarily picking Title Case everywhere.
  Payments/Notifications/Audit-Logs list pages do not surface a sort
  control; that omission was reviewed and kept (ledger-style views
  defaulting to newest-first is a reasonable, deliberate choice, not
  something this review added UI to "fix").
- **Alternatives:** leave the duplication in place, since each instance
  individually is small (rejected — the review brief explicitly asks to
  check for this class of duplication, and the inconsistent active-tab
  logic was a genuine, if narrow, correctness gap, not just a style
  nit); build one mega-component covering both nav AND filters (rejected
  — they're unrelated concerns with different prop shapes; two small,
  focused components are clearer than one that does both).
- **Affects:** `components/data/{module-sub-nav,enum-filter-select}.tsx`
  (new); every module's `*-nav.tsx` and every list page with a status/
  type filter.

## 2026-07-26 — Bespoke wizard: Fabric shown read-only, MeasurementProfile omitted from order submission
- **Decision:** the Bespoke Customizer wizard's review step shows
  available fabrics as a read-only, non-selectable reference panel
  labeled "not submitted with this order," and doesn't surface
  MeasurementProfile selection anywhere in the order-creation flow at
  all.
- **Why:** reading `apps/api/src/modules/orders/dto/create-order-item.dto.ts`
  and `order.service.ts`'s `computeCustomizationPricing()` directly
  confirmed neither Fabric nor MeasurementProfile — both real,
  fully-CRUD backend entities — has any field on `CreateOrderItemDto` or
  its `selectedOptions` object. Building a "select a fabric" control that
  silently did nothing on submit would be worse than showing nothing;
  building a fake `fabricId`/`measurementProfileId` field on the request
  would violate "do not implement functionality the backend doesn't
  have." The plan's own aspirational wording (both as wizard "steps")
  predated this direct-source verification.
- **Alternatives:** stuff a fabric/measurement reference into the order's
  free-text `notes` field (rejected — a string-parsing hack masquerading
  as a real feature, and not something staff would reliably read/parse
  downstream); build full standalone CRUD pages for Fabric/
  MeasurementProfile management outside the order flow (rejected as
  scope creep beyond what any module's bullets asked for this phase;
  the real endpoints remain available for a future phase to build against
  if that need is confirmed).
- **Affects:** `app/(portal)/bespoke/customize/[productId]/customize-wizard.tsx`,
  `docs/architecture/business-portal.md`.

## 2026-07-26 — Business-module list tables disable `DataGrid`'s built-in column-click sort
- **Decision:** every `ColumnDef` across all seven modules sets
  `enableSorting: false`; an explicit "Sort by" `Select` (bound to the
  real `sortBy`/`sortDirection` query params) is the only sort control.
- **Why:** `components/ui/data-grid.tsx`'s header-click sort is entirely
  client-side (`useState<SortingState>` + `getSortedRowModel()`) — it
  would re-sort only the current page's already-fetched rows, silently
  contradicting the server-driven sort every list here actually needs
  across pages. Discovered while wiring the Catalog list (the first
  module built) before it became a real, confusing bug — not by
  redesigning `DataGrid` itself, which stays a correct, reusable
  primitive for cases that genuinely want client-side sort of
  already-loaded data.
- **Alternatives:** modify `DataGrid` to accept a controlled
  `sorting`/`onSortingChange` pair wired to the URL (rejected — a
  reasonable future improvement, but a larger, riskier change to a
  shared Phase 0.5 primitive than this phase's own scope called for);
  leave the column-click sort enabled and accept the inconsistency
  (rejected — actively misleading, not a neutral omission).
- **Affects:** every `app/(portal)/*/[module]-list.tsx` file;
  `docs/architecture/business-portal.md`.

## 2026-07-26 — Built a real `/dashboard` landing page instead of only repointing the nav
- **Decision:** `app/(portal)/dashboard/page.tsx` (previously nonexistent
  — a Phase 1 mocked nav entry with no page behind it) is now a real,
  simple hub page linking into the seven business modules, and
  `ROUTES.portal.dashboard` / the nav item both keep pointing at it.
- **Why:** `login-form.tsx`'s `safeRedirectPath()` (built in Phase 3)
  defaults to `ROUTES.portal.dashboard` for any login with no `?redirect=`
  — meaning every plain login would have 404'd, invisible until this
  phase gave the business portal something to check that path against.
  Fixing the *symptom* (repoint the default redirect to `/catalog`) would
  have left a nav item and a route constant both named "Dashboard"
  pointing nowhere; fixing the *cause* (build the page the name promises)
  is the smaller, more honest change and doesn't touch Phase 3's
  reviewed auth-redirect logic at all.
- **Alternatives:** repoint the login default redirect to `/catalog` and
  drop the "Dashboard" nav item (rejected — treats a real, dormant bug as
  a naming inconvenience); make `/dashboard` a duplicate of `/admin`'s
  KPI dashboard (rejected — `/admin` already exists and is
  permission-gated narrower than every authenticated user should see on
  first login).
- **Affects:** `app/(portal)/dashboard/page.tsx` (new),
  `config/navigation.ts`, `config/routes.ts`.

## 2026-07-26 — Authentication Review: validate `?redirect=` with the real URL parser, not a string prefix check
- **Decision:** `login-form.tsx`'s `safeRedirectPath()` resolves the
  `redirect` query param against a fixed base URL (`new URL(path,
  'http://localhost')`) and requires the resulting origin to match,
  instead of hand-checking `path.startsWith('//')`.
- **Why:** a hand-rolled prefix check misses a well-known open-redirect
  bypass class — the WHATWG URL spec normalizes a leading backslash the
  same as a forward slash for special schemes (`http`/`https`/etc., a
  legacy IE-compatibility rule retained in the spec), so `/\evil.com` or
  `/\/evil.com` resolve to an external origin exactly like `//evil.com`
  does, silently bypassing a `startsWith('//')`-only check. Letting the
  real URL parser resolve the path inherits the browser-standard
  normalization instead of re-deriving every edge case by hand — found
  during the Authentication Engineering Review, not by an external
  report.
- **Alternatives:** a regex denylist for `//`, `\`, and other known
  bypass characters (rejected — regex denylists for URL-parsing edge
  cases have a long history of missing the next variant; the real parser
  is authoritative by construction, not by enumeration); resolving
  against `window.location.origin` instead of a fixed placeholder
  (rejected — unnecessary, since only the origin-equality check matters,
  not the specific origin value used to perform it).
- **Affects:** `app/(auth)/login/login-form.tsx`.

## 2026-07-26 — Login page: no "remember me," no signup/forgot-password
- **Decision:** the login page implements only email + password. No
  "remember me" checkbox, no signup link, no forgot-password link.
- **Why:** each was checked against the real, frozen backend contract
  before deciding, not assumed. `POST /auth/login` issues the same
  `{ accessToken, refreshToken }` pair unconditionally — there is no
  request field or response variation a "remember me" checkbox could
  actually change, so adding one would control nothing real. The backend
  has no registration or password-reset endpoints at all
  (`apps/api/src/modules/auth/README.md`'s own "No registration, no
  password reset" scope note) — linking to pages for capabilities the API
  can't perform would be a dead end, not a convenience.
- **Alternatives:** build a "remember me" checkbox that only changes
  client-side behavior (e.g. whether to persist something in
  localStorage) — rejected, since the access token is deliberately
  in-memory-only (see the Application Runtime Architecture phase's own
  cookie-strategy decision) and persisting anything client-side to fake
  "remember me" would undermine that; build placeholder signup/forgot-
  password pages that show a "coming soon" message — rejected as
  needless scope for a capability with no confirmed plan to exist.
- **Affects:** `app/(auth)/login/login-form.tsx`, `config/routes.ts`
  (`signup`/`forgotPassword` removed from `ROUTES.auth`).

## 2026-07-26 — Marketing Website Engineering Review: omit broken asset references rather than assert them
- **Decision:** where a review finding was "this metadata/JSON-LD field
  points at an asset or route that doesn't exist" (`/og/default.png`,
  `/logo.png`, a `/search` route), the fix was to omit the field entirely
  (making it optional where the function signature required it, e.g.
  `blogPostingSchema`'s `image`), not to invent a placeholder value to
  keep the field populated.
- **Why:** a schema/meta field that's absent is honestly incomplete; one
  that's present but 404s is actively misleading to crawlers and, for
  Open Graph/Twitter images specifically, produces a broken image in every
  real social share. `lib/seo/schema.ts`'s own header comment already
  states the principle this follows: "misleading schema is penalized."
  Confirmed each asset didn't exist by direct filesystem read
  (`public/og/`, `/logo.png`, `app/` for any `/search` route) before
  changing anything — not assumed from the code alone.
- **Alternatives:** leave the references in place until real assets exist
  (rejected — ships confirmed-broken output in the meantime, for no
  benefit); generate a placeholder raster image (rejected — no image tool
  available in this environment; an SVG favicon was created instead since
  SVG is authorable as text, but OG images need to be raster/reliably
  sized, which this environment can't produce safely).
- **Affects:** `lib/seo/metadata.ts`, `lib/seo/schema.ts`,
  `app/(marketing)/blog/[slug]/page.tsx`, new `app/icon.svg`. Full list:
  `docs/architecture/marketing-site.md` §10.

## 2026-07-26 — Marketing site: honest early-stage framing instead of fabricated social proof
- **Decision:** Portfolio (`/work`), Home's "Featured Work" and
  "Statistics" sections, and Pricing use honest, verifiable content
  instead of fabricated client names/quotes/logos/traction numbers/exact
  prices. Specifically: no `testimonials.ts` exists at all; `/work` frames
  around capabilities/process with a real "case studies coming soon"
  empty state; Home's stats cite real platform facts (test suite count,
  coverage, WCAG baseline — see `content/engineering-stats.ts`); Pricing
  shows scope-differentiated tiers with zero fabricated figures; Contact
  omits `localBusinessSchema` entirely (no real address/phone to fill it
  with truthfully).
- **Why:** confirmed directly with the user before building (Antrique is
  pre-launch per `docs/product/01-discovery.md`'s real Vision content,
  despite the filename — "0–6mo: market presence & pipeline," i.e. no real
  clients yet). Fabricating client social proof, traction numbers, or a
  business address would be actively deceptive to real site visitors, not
  a stylistic placeholder choice — a materially different judgment call
  than an engineering/architecture decision, so it was asked rather than
  decided unilaterally.
- **Alternatives:** clearly-fictional sample content (offered as an
  option; rejected by the user in favor of the honest framing); pausing
  the phase until real client content was supplied (offered; rejected as
  unnecessary given the honest-framing option covers the same ground
  without blocking).
- **Affects:** `app/(marketing)/work/page.tsx`, `app/(marketing)/page.tsx`
  (Home), `app/(marketing)/pricing/page.tsx`, `app/(marketing)/contact/
  page.tsx`, `content/engineering-stats.ts`, `content/pricing-tiers.ts`.
  Full reasoning: `docs/architecture/marketing-site.md` §2.

## 2026-07-26 — Application Runtime Architecture: BFF session cookie + in-memory access token, not a shared cookie the backend reads
- **Decision:** the httpOnly session cookie (`SESSION_COOKIE_NAME`) is a
  Next.js-only concept, written/read exclusively by `app/api/auth/*/route.ts`
  and `lib/auth/session-cookie.ts`. The real backend (`apps/api`) never sees
  it — it only ever receives `Authorization: Bearer <token>`, attached
  client-side from an in-memory-only access token (`store/auth-store.ts`),
  or server-to-server by the BFF routes themselves via `API_INTERNAL_URL`.
- **Why:** verified against `apps/api/src/main.ts` and `common/guards/
  jwt-auth.guard.ts` directly, not assumed: CORS is configured
  `credentials: false` and the JWT guard only ever extracts a Bearer
  header, never reads a cookie. A cookie the backend can't read isn't a
  backend auth mechanism at all — it can only ever be this frontend's own
  BFF session store. Two env vars the Foundation phase had already
  reserved (`API_INTERNAL_URL`, `SESSION_COOKIE_NAME`) confirmed this was
  the intended design, not a new pattern being introduced.
- **Alternatives:** storing the access token in a regular (non-httpOnly)
  cookie or localStorage so client JS could read it directly (rejected —
  either exposes a bearer-usable credential to any XSS on the page, a
  strictly worse security posture than keeping it in memory only);
  proxying every single API call through the Next.js server so the browser
  never talks to `apps/api` directly (rejected — `services/api/client.ts`'s
  direct-to-`NEXT_PUBLIC_API_BASE_URL` design already existed from the
  Foundation phase, and restructuring it into a full proxy layer would be
  redoing already-frozen prior-phase work for no requirement in this
  phase's brief).
- **Affects:** `lib/auth/*`, `app/api/auth/*`, `services/api/interceptors.ts`,
  `services/api/request.ts`, `store/auth-store.ts`,
  `providers/auth-provider.tsx`, `middleware.ts`. Full writeup:
  `docs/architecture/application-runtime.md` §5.

## 2026-07-23 — Phase 5: corrected several docs asserting a superseded contract/status, rather than rewriting them to match reality
- **Decision:** for `packages/api-contract/openapi/openapi.yaml` (a
  941-line Phase-0 design draft describing cursor pagination, RFC 9457
  errors, and endpoints like `/projects`/`/users`/`/auth/step-up` that
  were never built) and the root `README.md`'s "Phase 0 — application
  features have not been built yet" status line, did NOT rewrite either
  to match the real implementation. Instead: added prominent, honest
  "this is a superseded draft, here's where the real answer lives"
  headers, fixed every README/CLAUDE.md reference that called the draft
  "authoritative," and corrected the status line to reflect that
  `apps/api` is complete and API-frozen while `apps/web` genuinely has
  not started.
- **Why:** hand-rewriting a 941-line OpenAPI YAML to match the real API
  would recreate exactly the maintenance burden Milestone 14's
  `generate:openapi` (introspects the real running app, can't drift) was
  built specifically to avoid — a second hand-maintained copy of the
  contract is a liability, not a documentation improvement, and this
  phase's own rules ("do not redesign," "only improve documentation")
  don't ask for a second implementation of the same information.
  Redirecting to the real, self-updating source is more accurate AND
  lower-maintenance than any hand-authored fix would have been.
- **Alternatives:** rewrite the draft to match reality (rejected — wrong
  kind of fix, see above); leave it uncorrected (rejected — both README
  files and CLAUDE.md itself pointed a new engineer at a document that
  actively contradicts the real, frozen API's pagination style, error
  shape, and endpoint list; this is exactly the "broken reference"/
  "inaccurate documentation" this phase exists to catch).
- **Affects:** `packages/api-contract/README.md`, `packages/api-contract/
  openapi/openapi.yaml` (header only), root `README.md`, `apps/api/
  README.md`, `CLAUDE.md` (three factual corrections: build scripts are
  real now, the real module list, which contract is authoritative).

## 2026-07-23 — Phase 4: documented, but deliberately did not fix, that response DTOs produce empty Swagger schemas
- **Decision:** added `@ApiOkResponse`/`@ApiCreatedResponse`/
  `@ApiNoContentResponse`/a new `ApiPaginatedResponse()` helper across all
  ~90 controller methods so every endpoint's success status code and
  returned-DTO-class-name is now documented (121/124 endpoints, up from
  0). Did NOT convert any response DTO from constructor-parameter-
  properties to field declarations, even though doing so would make
  `@nestjs/swagger`'s reflection-based schema generation actually populate
  field-level detail (currently every response schema is `{ type:
  'object', properties: {} }` — confirmed empirically, not assumed).
- **Why:** the field-level fix is JSON-wire-format-identical (parameter
  properties and field declarations compile to the same runtime shape)
  but touches essentially every response DTO file in the codebase —
  dozens of files, a broad structural rewrite. Phase 4's own strict rules
  ("Do not redesign existing endpoints," "Only apply safe, non-breaking
  improvements where absolutely necessary") are about scope discipline,
  not just wire-compatibility — a rewrite of this size, even if provably
  safe, is a decision for its own explicitly-scoped task, not something
  to fold into a read-mostly review phase without the user seeing the
  size of the diff first.
- **Alternatives:** do the full response-DTO conversion now (rejected —
  correct in principle, wrong scope for this phase); leave response
  schemas fully undocumented, i.e. do nothing (rejected — status code +
  DTO name is real, valuable, safe information to add, and leaving it out
  when it's this easy to add would be a worse outcome for the stated
  goal of this phase).
- **Affects:** `src/common/decorators/api-paginated-response.decorator.ts`
  (new), all 26 controllers with business routes, `src/bootstrap/
  swagger-document.ts` (top-level description now explains the
  limitation explicitly so a frontend developer isn't misled by an
  empty-but-present schema).

## 2026-07-22 — Phase 3: verified every `@ApiConflictError` claim against real service source before finalizing, rather than trusting pattern-matched recall
- **Decision:** treated "does this Swagger decorator's claim match the
  actual code" as a hard verification bar for the whole Phase 3 pass, not
  an assumption. Concretely: ran `grep -rln "new ConflictException"
  src/modules --include="*.service.ts"` (13 files) and cross-referenced
  every one against its controller's actual `@ApiConflictError`
  placement and message, method by method.
- **Why:** an earlier pass (working from memory of "which services throw
  ConflictException") had both a fabrication (`tax-rate.controller.ts`
  claimed a conflict `tax.service.ts` never throws — no unique-slug check
  exists on tax rates at all) and several real gaps (`lead.controller.ts`
  create/update never documented the duplicate-active-lead check that
  `assertNoDuplicateActiveLead()` enforces on both paths;
  `inventory.controller.ts`'s `receiveStock()`/`reserveStock()` were
  still undocumented after an earlier fix only covered `adjustStock()`).
  Swagger documentation is user-facing API contract for frontend
  consumers even though it's non-breaking to the wire format — a wrong
  claim there is a real defect, not a cosmetic one, and this phase's own
  brief required "Correct only if completely non-breaking," which cuts
  both ways: an inaccurate addition is exactly the kind of thing that
  needed catching before freeze.
- **Alternatives:** trust the original endpoint-by-endpoint pass as
  complete (rejected — already caught fabricating one claim, which means
  the recall-based method itself is unreliable and needed a systematic,
  not spot-check, re-verification).
- **Affects:** `src/modules/billing/tax-rate.controller.ts` (removed),
  `src/modules/crm/lead.controller.ts` (create/update added),
  `src/modules/bespoke/product-customization.controller.ts` (create
  added), `src/modules/billing/invoice.controller.ts` (create added),
  `src/modules/inventory/inventory.controller.ts` (adjust/reserve/receive
  added).

## 2026-07-21 — Milestone 12: rewrote two InventoryRepository analytics queries to raw SQL after confirming Prisma 7's driver adapter returns real Decimal/Date instances from `$queryRaw`
- **Decision:** `getStockValuationAggregate()`/`findLowStockItems()`
  (Milestone 11's own `findVariantLinkedItemsWithPrice()`/
  `findItemsWithReorderPoint()`) were rewritten from `findMany()` +
  application-code `reduce()`/`filter()` to single `$queryRaw`
  aggregate/filtered queries — the first raw-SQL query in this codebase
  outside health-check `SELECT 1`s and the seed script's own RLS
  `SET LOCAL`. Before committing to the approach, wrote a throwaway
  `check_raw_decimal.ts` script (deleted after use) confirming LIVE that
  `@prisma/adapter-pg` (Prisma 7's driver adapter) returns genuine
  `Prisma.Decimal`/`Date` instances from `$queryRaw` results for
  `numeric`/`timestamptz` columns — `instanceof Prisma.Decimal` true,
  `.toString()`/arithmetic methods present — identical to what the query
  builder itself returns, not plain strings/numbers requiring manual
  reconstruction.
- **Why:** `onHand <= reorderPoint` is a column-to-column comparison
  Prisma's `where` API cannot express at all; the original implementation
  worked around this by fetching EVERY item with a `reorderPoint` set and
  filtering in Node, which for a warehouse tracking many SKUs pulls the
  entire reference set into memory on every Dashboard request just to
  discard most of it. Raw SQL with the real predicate in `WHERE` is the
  correct fix, but introducing the codebase's first raw-SQL query pattern
  carried a real risk (Decimal precision loss, silent type mismatches)
  that needed empirical verification, not assumption, given this
  milestone's own "zero regressions" requirement.
- **Alternatives:** leave the application-code filter as-is (rejected —
  exactly the "excessive object allocation"/"unnecessary eager loading"
  class of finding this milestone's own audit checklist names explicitly,
  and the fix was demonstrably safe once verified); use `Prisma.
  Decimal`'s own `new Prisma.Decimal(String(rawValue))` reconstruction
  defensively even though the adapter already returns real Decimals
  (rejected — dead code with no failure case to guard against, confirmed
  live; CLAUDE.md's own "don't add validation for scenarios that can't
  happen" argues against it).
- **Affects:** `apps/api/src/modules/inventory/repositories/inventory.repository.ts`,
  `apps/api/src/modules/inventory/inventory.service.ts`,
  `docs/architecture/domain-module-guide.md` §23.

## 2026-07-21 — Milestone 12: cached `AuthorizationService` role/permission resolution across requests; deliberately did NOT cache `TaxRate` (a live write path with no invalidation wired in)
- **Decision:** Added a new `CacheService` (in-memory, TTL-based) and
  used it to front `RoleRepository.findRolesForUser()` with a 60s
  cross-request cache, keyed `role-keys:{tenantId}:{email}`. Evaluated
  `TaxRate`/`PaymentMethod`/`LeadSource`/`NotificationTemplate` as
  candidates for the same treatment and declined all four this milestone.
- **Why:** role/permission resolution runs on every
  `PermissionsGuard`/`RolesGuard`-protected request (most routes in this
  API by Milestone 11) and changes only via a seed script today — no live
  `RoleController` exists to mutate it at runtime, so a 60s TTL with no
  explicit invalidation trigger carries no real staleness risk anyone
  could actually hit. `TaxRate` is different in one decisive way: it
  already has a LIVE write endpoint (`TaxRateController`, Milestone 10).
  A TTL-only cache in front of a value with a real write path can serve a
  genuinely stale result for up to the TTL window after a real edit — a
  correctness regression, not an optimization, unless real invalidation
  (`cache.deleteByPrefix(...)` called from the write path itself) ships
  in the SAME change. This milestone's own scope ("no feature changes")
  argues against opening up `TaxRateService.update()` to wire that in
  right now.
- **Alternatives:** cache `TaxRate` anyway with a short enough TTL that
  staleness is "probably fine" (rejected — "probably fine" is not a
  correctness argument, and this milestone's own brief explicitly warns
  "Do not cache mutable transactional data"; a value with a live write
  endpoint is exactly that, regardless of how rarely it's actually
  edited); build a full pub/sub invalidation mechanism now so every
  future cacheable entity gets it for free (rejected — no second
  consumer exists yet to justify the complexity, the same "wait for a
  genuine second need" discipline this codebase's own `domain-module-guide.md`
  §14 already establishes for shared abstractions generally).
- **Affects:** `apps/api/src/cache/` (new), `apps/api/src/authorization/authorization.service.ts`,
  `apps/api/src/app.module.ts`, `docs/architecture/domain-module-guide.md` §23.

## 2026-07-21 — Milestone 12: `Cache-Control` applied only to Category/Collection/Product GET routes, always `private`, never blanket-applied
- **Decision:** Built a generic, opt-in `@CacheControl(maxAgeSeconds)`
  decorator + `CacheControlInterceptor`, then applied it to exactly six
  routes (Category/Collection/Product, list + by-id) at 30 seconds. Every
  other GET route in this API (Orders, Inventory, Dashboard, Notifications,
  Audit, Billing, CRM) was deliberately left unannotated. The header value
  is always `Cache-Control: private, max-age=<n>` — `private` is not a
  parameter the decorator exposes; every annotated route gets it
  unconditionally.
- **Why:** this API is entirely tenant-scoped and RBAC-gated (CLAUDE.md's
  own non-negotiable rules) — nearly every response is permission-
  sensitive. `public` (or no cache-scope directive at all, which some
  shared caches treat as cacheable-by-default for a `200` with no
  `Set-Cookie`) risks a shared/CDN cache serving one tenant's or one
  user's response to a different one — a genuine data leak, not a
  performance win. `private` restricts caching to the requesting client
  itself, where that risk doesn't exist. Category/Collection/Product were
  chosen as the only annotated routes because they're this API's clearest
  read-only, low-churn, catalog-style data — everything else either
  changes too frequently to safely cache for even 30s (inventory counts,
  order status) or carries a near-real-time expectation (dashboard,
  notifications, audit) where cached staleness would be actively
  misleading to the person viewing it.
- **Alternatives:** make `private`/`public` a decorator parameter, for
  future flexibility (rejected — no current route would ever legitimately
  need `public` on a tenant-scoped API; exposing the choice invites a
  future mistake more than it enables a real need); apply a blanket
  short-TTL `Cache-Control` to every GET route by default (rejected —
  the exact opposite of "no feature changes without review": broad
  application without per-route judgment is how the leak risk above
  actually happens).
- **Affects:** `apps/api/src/common/decorators/cache-control.decorator.ts`
  (new), `apps/api/src/common/interceptors/cache-control.interceptor.ts`
  (new), `apps/api/src/modules/catalog/{category,collection,product}.controller.ts`,
  `apps/api/src/modules/catalog/constants/catalog.constant.ts`.

## 2026-07-21 — Milestone 12: autocannon's `path` option replaces (not appends to) `url`'s own path segment — caught before trusting the first benchmark run
- **Decision:** `apps/api/benchmarks/run-benchmarks.js` builds the full
  request URL as one string (`${BASE_URL}${path}`) per scenario, rather
  than passing autocannon's own `url`/`path` options separately.
- **Why:** the first version of this script passed `url: 'http://host/api/v1'`
  and, per scenario, `path: '/categories'`, expecting autocannon to
  concatenate them into `http://host/api/v1/categories`. It does not —
  `path` REPLACES whatever path segment `url` already carries, so every
  request actually hit `http://host/categories` (no `/api/v1` prefix), a
  bare `404` from Nest's own global prefix routing. The first full run
  reported ~100% non-2xx responses across every scenario; rather than
  read past it, the raw `statusCodeStats` field was inspected directly
  (`{"404":{"count":...}}`), confirming the benchmark itself was broken,
  not the API. A production-mode run then surfaced a SECOND, genuine (not
  a bug) finding — `400 Tenant could not be resolved` — fixed by sending
  the same `X-Tenant-ID` header a real client without hostname-based
  tenant resolution configured would send (`TenantResolver`'s
  `DEFAULT_TENANT_ID` fallback is deliberately development-only,
  Milestone 4's own design, confirmed working exactly as intended).
- **Alternatives:** trust the first run's numbers at face value (rejected
  — "no errors" plus "100% non-2xx" is an internally inconsistent result
  that should never be reported as a real benchmark; every result in
  `performance.md` §8 was verified to carry `non2xx: 0` and a real
  `200`-only `statusCodeStats` before being written down).
- **Affects:** `apps/api/benchmarks/run-benchmarks.js`,
  `docs/architecture/performance.md` §8.

## 2026-07-21 — Milestone 11: `notifications:manage` is a NEW permission, not a reuse of the pre-existing `notifications:read`
- **Decision:** `notifications:read` already existed (Phase 1.1B's own
  agency-CRM seed), described as "View own notifications" and granted
  broadly to `project_manager`/`sales`/`client`/`manager`/`customer` —
  a self-service, per-user scope this milestone never builds a route
  for. This milestone's own explicit RBAC tier for the admin
  Notification surface (List all tenant notifications/Get any/Retry) is
  "Manager, Admin, Super Admin" — narrower than `notifications:read`'s
  existing grant list. Rather than reuse-and-extend (the pattern
  Milestones 9/10 used for `leads:read`/`invoices:read` when the
  pre-existing scope genuinely matched), added a new `notifications:manage`
  key, granted only to `manager`/`admin`/`super_admin`, and left
  `notifications:read` completely untouched.
- **Why:** reusing `notifications:read` for this milestone's admin
  surface would have silently granted Sales/Client/Customer (who
  currently hold `notifications:read` for a hypothetical future "my
  notifications" feature) access to List/Get/Retry against EVERY
  tenant notification, not just their own — a real over-grant bug, not
  a cosmetic naming mismatch. `notifications:read`'s own narrower future
  meaning stays available, unclaimed, for whenever a genuine "my
  notifications" self-service route gets built.
- **Alternatives:** reuse `notifications:read` and rely on service-layer
  filtering to narrow it to "own" for lower-privileged roles (rejected —
  this milestone's own brief names no such per-user filtering
  requirement, and inventing one to justify reusing the permission key
  would be exactly the kind of unrequested behavior CLAUDE.md's "don't
  add validation/abstractions for scenarios that can't happen" warns
  against); split into `notifications:manage:read`/`:write`/`:retry`
  (rejected — this milestone's own brief gives Notifications ONE uniform
  tier across List/Get/Retry, unlike Invoices/Payments/Orders, which
  each named a stricter sub-tier for one specific action).
- **Affects:** `apps/api/src/modules/auth/constants/permission.constant.ts`,
  `apps/api/prisma/seed.ts` (new `notifications:manage` permission row,
  granted to `manager`), `apps/api/src/modules/admin/notification.controller.ts`.

## 2026-07-21 — Milestone 11: `catalog` implemented as a 5th `DashboardService` aggregated module, beyond this milestone's own literal 4-module analytics list
- **Decision:** This milestone's own "Cross-Module Integration" analytics
  section names exactly four modules — Orders, Inventory, CRM, Billing.
  `DASHBOARD_KPI_MODULES` (the allowlist constant `GET
  /dashboard/kpis/:module` validates against) was written with a 5th
  entry, `catalog`, alongside them. Rather than trim the constant back to
  the literal 4 named in the brief, implemented `catalog`'s own metric
  (published product count, via `ProductRepository.count()` — already
  exported by `CatalogModule` since Milestone 6, no new repository method
  needed) and imported `CatalogModule` into `AdminModule` as a 5th
  cross-module dependency.
- **Why:** a constant that names `catalog` as a valid module value but
  has no matching `DashboardService` case would make `GET
  /dashboard/kpis/catalog` 400 forever — an API consumer reading the
  constant (or a future frontend generated against it) would reasonably
  expect that value to work. This is the same "named-but-unreachable is
  a defect, not a rounding error" reasoning Milestone 9's own
  `LEAD_CREATED` reachability gap established (`domain-module-guide.md`
  §20), now generalized to a config allowlist rather than a controller
  route in §22.
- **Alternatives:** shrink `DASHBOARD_KPI_MODULES` to the literal 4
  named modules (rejected — the constant already existed with 5 entries
  before this decision point; shrinking it removes information rather
  than completing a gap, and there's no indication the 5th entry was a
  typo rather than an intentional 5th target); leave `catalog` in the
  constant but throw `400` for it explicitly, documented as
  "reserved for future use" (rejected — the constant gives no signal
  that it's speculative, and a working implementation costs one method
  + one `ProductRepository` injection, cheaper than documenting and
  maintaining a deliberately-broken allowlist entry).
- **Affects:** `apps/api/src/modules/admin/dashboard.service.ts`,
  `apps/api/src/modules/admin/admin.module.ts` (added `CatalogModule` to
  imports), `apps/api/src/modules/admin/constants/admin.constant.ts`.

## 2026-07-21 — Milestone 11: removed the stale, empty Phase 0 `modules/notifications/` scaffold; the real feature lives under `modules/admin/`
- **Decision:** Phase 0 had scaffolded an empty
  `apps/api/src/modules/notifications/` folder (a placeholder README +
  empty `controllers/`/`dto/`/`entities/`/`repositories/`/`services/`
  subdirectories, zero real files). This milestone's own brief names the
  module `AdminModule`, covering FOUR areas (Notification, Audit,
  Dashboard, Report), not just Notifications — unlike `CrmModule`/
  `BillingModule`, which each matched and filled in their own
  single-purpose Phase 0 scaffold folder by the same name. Built the
  real `Notification` feature under the new `modules/admin/` instead,
  then deleted the now-superseded, still-empty `modules/notifications/`
  scaffold (confirmed zero source files inside it and zero references to
  it anywhere in `src/` before removing).
- **Why:** an empty, unreferenced scaffold folder sitting right next to
  a sibling module that actually implements its subject matter is
  actively misleading — a future reader (or agent) could reasonably
  conclude Notifications hadn't been built yet, or start building a
  second, competing implementation there. Removing dead scaffolding once
  its subject is genuinely built elsewhere is the same "no half-finished
  implementations" discipline CLAUDE.md already asks for, applied to a
  folder rather than a function.
- **Alternatives:** leave `modules/notifications/` in place, unreferenced
  (rejected — costs nothing to keep, but leaves a permanent trap for the
  next reader); re-export `AdminModule`'s notification pieces through a
  thin `NotificationsModule` wrapper living in the old folder, purely for
  naming symmetry (rejected — adds a real indirection layer with no
  functional purpose, solely to preserve a folder name nothing depends
  on).
- **Affects:** `apps/api/src/modules/notifications/` (deleted, all
  content was empty scaffolding), `apps/api/src/config/notifications/README.md`
  (its one comment referencing the old path updated to point at
  `modules/admin/`), `docs/architecture/backend.md`.

## 2026-07-21 — Milestone 11: `RetryNotificationDto.note` has no `Notification` column to persist into — recorded on an `AuditLog` row instead
- **Decision:** `RetryNotificationDto` (this milestone's own request body
  for `POST /notifications/:id/retry`) carries an optional `note` field,
  but nothing in `Notification`'s own schema — reused wholesale from
  Phase 1.1B, additive-only this milestone (see the schema-changes
  decision above) — has a column meant to hold an ad-hoc, per-action
  comment; `lastError` is cleared on retry, not repurposed to hold it.
  `NotificationService.retry()` now writes an `AuditLog` row (action
  `notification.retry`, `resourceType: 'notification'`) alongside the
  status-transition update, with `note` folded into that row's own
  `after` JSON payload.
- **Why:** CLAUDE.md's own non-negotiable "every feature ships with...
  audit logging" rule applies to this milestone's one real
  mutation-with-a-route; recording the caller-supplied reason on the
  audit trail satisfies both that rule and the DTO field's own evident
  purpose (a human explaining why they're manually retrying), without
  inventing a new `Notification` column for a value that's about the
  ACTION being taken, not a property of the notification itself.
- **Alternatives:** add a `Notification.retryNote` column (rejected — a
  single mutable field would only ever reflect the MOST RECENT retry's
  own note, silently discarding earlier ones on a notification retried
  more than once; `AuditLog` already accumulates one row per action,
  preserving full history for free); silently accept and discard `note`
  (rejected — the DTO field already existed with no consumer, which is
  exactly the "dead capability" class of gap this codebase's own
  established discipline rejects elsewhere).
- **Affects:** `apps/api/src/modules/admin/notification.service.ts`,
  `apps/api/src/modules/admin/notification.controller.ts`,
  `apps/api/src/modules/admin/dto/retry-notification.dto.ts`.

## 2026-07-21 — Milestone 10: `Invoice` gains a NEW `customerId`/`orderId` path, `clientId` relaxed to nullable, kept entirely separate from the pre-existing `Client`-based path
- **Decision:** The architecture audit found `Invoice` already fully
  modeled (Phase 1.1A) with a required `clientId` → `Client` relation
  (the agency's own B2B service-billing path) and zero application-
  layer consumers. This milestone's own brief explicitly says "Invoices
  belong to Orders" and "Use: OrderRepository, CustomerRepository" —
  read literally, as pointing at Milestone 8's `Customer`/`Order`, not
  `Client`. Added NEW, nullable `customerId` (→ `Customer`) and
  `orderId` (→ `Order`) columns, and relaxed the pre-existing `clientId`
  from required to nullable so an order-based invoice can omit it. A
  hand-written `invoices_client_xor_customer_check` CHECK constraint
  (exactly one of `clientId`/`customerId`) plus
  `invoices_order_requires_customer_check` (`orderId` only meaningful
  alongside `customerId`) keep the two paths from being mixed.
  `InvoiceService.createFromOrder()` only ever sets `customerId`/
  `orderId`; `clientId` is untouched by this milestone, still whatever
  the original agency-billing design anticipated for it — exactly the
  same shape Milestone 9 established for `Lead.convertedCustomerId` vs.
  `convertedClientId`.
- **Why:** `Customer`'s own Milestone 8 schema comment already
  establishes the precedent this decision extends a second time: two
  independent billing paths (agency-service invoicing via `Client`,
  storefront-order invoicing via `Customer`/`Order`) can coexist on one
  shared `Invoice` entity without either needing to model the other's
  concerns.
- **Alternatives:** repurpose `clientId` to also accept a `Customer` id
  (rejected — conflates two semantically different foreign keys under
  one column, and breaks the column's own existing, clear meaning);
  build a parallel `OrderInvoice` model instead of extending `Invoice`
  (rejected — direct violation of "If Invoice/Quotation already exist,
  extend instead of replacing," this milestone's own explicit
  instruction, and duplicates every audit/soft-delete/status/line-item
  mechanic `Invoice` already has).
- **Affects:** `apps/api/prisma/schema.prisma` (`Invoice`'s own updated
  comment), `apps/api/prisma/migrations/20260722110000_add_payments_billing_foundation/migration.sql`,
  `apps/api/src/modules/billing/invoice.service.ts`,
  `apps/api/src/modules/billing/README.md`.

## 2026-07-21 — Milestone 10: `Payment` gains a NEW manually-recorded shape (nullable `invoiceId`/`provider`/`providerRef`, required `method`); `PaymentAllocation` is the new invoice-by-invoice breakdown
- **Decision:** The architecture audit found `Payment` already fully
  modeled (Phase 1.1A/1.1B) as "one row per gateway webhook event" —
  required `invoiceId` (a payment always ties to exactly one invoice at
  creation), required `provider`/`providerRef` (gateway identity),
  already append-only at the database-privilege level (`UPDATE`/
  `DELETE` revoked). This milestone's own "Record payment"/"Allocate
  payment" being listed as SEPARATE business responsibilities, plus a
  distinct "PaymentAllocation" core entity, signals a genuinely
  different flow: a manually-recorded payment (no gateway involved) that
  may be allocated across one or more invoices, or left unallocated
  until later. Made `invoiceId`/`provider`/`providerRef` nullable
  (additive relaxations — Postgres tolerates any number of NULL
  `providerRef` values under the existing unique index without
  collision), added `paymentMethodId`/`method`/`reference`, and added
  the new `PaymentAllocation` table (`paymentId`, `invoiceId`, `amount`)
  as the actual invoice-by-invoice ledger — used even for the common
  single-invoice case, not just multi-invoice splits.
- **Why:** a required `invoiceId` would make "record a payment, allocate
  it later" impossible to represent — the exact split this milestone's
  own brief asks for. Keeping `Payment` itself append-only (no new
  update path) while pushing the mutable "how much went where" state
  into a separate table preserves the original append-only guarantee
  entirely, rather than weakening it.
- **Alternatives:** keep `invoiceId` required and have "Allocate
  payment" mean something else, like reassigning which single invoice a
  payment belongs to (rejected — contradicts "Multiple payments"/
  `PaymentAllocation` as its own named entity, which implies genuine
  one-to-many payment-to-invoice splitting); give `PaymentAllocation`
  itself an `UPDATE` path for "unallocate" (rejected — no such action
  was requested, and `payments`'s own established append-only
  discipline argues for treating its allocations the same way).
  `payment_allocations` gets the SAME database-privilege-level
  `UPDATE`/`DELETE` revoke `payments` already has, extending that
  precedent to a second financial-ledger table rather than leaving it
  only conventionally (not structurally) immutable.
- **Affects:** `apps/api/prisma/schema.prisma` (`Payment`'s own updated
  comment, new `PaymentAllocation` model),
  `apps/api/prisma/migrations/20260722110000_add_payments_billing_foundation/migration.sql`,
  `apps/api/src/modules/billing/payment.service.ts`,
  `apps/api/src/modules/billing/repositories/payment.repository.ts`.

## 2026-07-21 — Milestone 10: `PATCH /invoices/:id` (Update draft invoice) built beyond this milestone's own literal "Controllers" list
- **Decision:** This milestone's own "Invoices" Controllers list reads
  "Create, Issue, Void, Get, List" — no Update — while its own "Service
  Layer" business responsibilities explicitly list "Update draft
  invoice." Built `PATCH /invoices/:id` (draft-only, rejects once status
  isn't DRAFT) anyway.
- **Why:** the same "dead capability" pattern already caught twice in
  this arc (Milestone 7's `consumeReservation()`, resolved by keeping
  the service method with no route since a real caller didn't exist
  yet; Milestone 9's `LEAD_CREATED` reachability gap, resolved by adding
  a route since leaving it dead would contradict an explicit business
  rule) — here, "Update draft invoice" is a named, concrete business
  rule with an obvious real caller (correcting a draft invoice's due
  date or tax rate before issuing it) and every other aggregate-root
  entity in this codebase gets a `PATCH` route; leaving it unreachable
  would be an arbitrary, unexplained gap rather than a deliberate scope
  boundary.
- **Alternatives:** leave `update()` as a service-only capability with
  no route, matching Milestone 7's own `consumeReservation()` precedent
  exactly (rejected — that precedent applies when a real caller
  genuinely doesn't exist YET; here, a human editing a draft invoice
  before issuing it is an ordinary, present-tense need, not a
  speculative future one).
- **Affects:** `apps/api/src/modules/billing/invoice.controller.ts`,
  `apps/api/src/modules/billing/dto/update-invoice.dto.ts`.

## 2026-07-21 — Milestone 10: `TaxRateController` built in full; `PaymentMethod` gets none — same asymmetry class as Milestone 9's `CustomerTag`/`LeadSource`
- **Decision:** `TaxRate` gets a full CRUD controller (this milestone's
  own explicit "Tax — CRUD" Controllers entry). `PaymentMethod` — also a
  named "Core entity" — gets none: no controller/service/repository of
  its own, rows exist only via seed data.
- **Why:** `Payment.method` (a required free-text column, same "always
  populated, optionally backed by a formal lookup row" pattern
  `Lead.source`/`LeadSource` established in Milestone 9) already
  satisfies every filter/display need `PaymentMethod` could offer —
  nothing is left unreachable without a `PaymentMethod` write path, the
  same reasoning that kept `LeadSource` controller-less. `TaxRate` has
  no equivalent fallback (`Invoice` has no free-text "tax description"
  column) AND this milestone's own brief explicitly names "Tax — CRUD"
  as a Controllers entry — unlike `PaymentMethod`, which appears only in
  "Core entities."
- **Alternatives:** build both, for symmetry (rejected — `PaymentMethod`
  CRUD would be speculative scope, not requirement-driven, the same
  call made for `LeadSource`); build neither (rejected for `TaxRate` —
  it's explicitly named as its own Controllers entry, and "Tax
  calculated server-side" needs real, queryable rate data to reference).
- **Affects:** `apps/api/src/modules/billing/tax-rate.controller.ts`,
  `apps/api/src/modules/billing/repositories/payment.repository.ts`'s
  own `findActivePaymentMethodById()` (the one narrow PaymentMethod
  touchpoint that DOES exist), `apps/api/src/modules/billing/README.md`.

## 2026-07-21 — Milestone 10: `invoices:read`/`invoices:write`/`payments:read` already existed — reused as-is, only their grants extended
- **Decision:** `invoices:read`/`invoices:write`/`payments:read` were
  already seeded (Phase 1.1B's original billing RBAC) — `invoices:read`
  already granted to `project_manager`/`client`; `invoices:write` and
  `payments:read` granted to NOBODY at all. This milestone's own RBAC
  brief is satisfied purely by EXTENDING existing grants — `manager`
  gains `invoices:write` (it already had `invoices:read`), `manager`/
  `customer` both gain `payments:read` — no new permission keys defined
  for either resource's own read/write tier, only for the genuinely new
  `invoices:void`/`payments:refund`/`payments:write`/`tax_rates:*` tiers.
- **Why:** same reasoning as Milestone 9's identical `leads:read`/
  `leads:write` reuse decision — creating parallel, differently-named
  permission keys purely because a new milestone happens to touch an
  already-permissioned resource would fragment authorization for one
  resource across redundant keys, violating the audit's own "reuse
  existing structures, do not duplicate" instruction extended to the
  RBAC layer.
- **Alternatives:** define new, milestone-scoped permission keys
  (rejected — identical reasoning to the `leads:*` precedent).
- **Affects:** `apps/api/src/modules/auth/constants/permission.constant.ts`
  (`INVOICES_READ`/`INVOICES_WRITE`/`PAYMENTS_READ` — newly named as TS
  constants, pointing at the pre-existing string keys),
  `apps/api/prisma/seed.ts` (`manager`/`customer` role grants extended).

## 2026-07-21 — Milestone 10: invoice numbers use a per-tenant-per-year count + retry-on-collision, not a database sequence
- **Decision:** `InvoiceService.generateInvoiceNumber()` counts existing
  invoices for the tenant/year and formats `INV-{year}-{count+1,
  zero-padded to 5 digits}`; `createFromOrder()` wraps the whole
  create-and-insert attempt in a bounded retry loop (`INVOICE_NUMBER_GENERATION_MAX_ATTEMPTS`
  = 5), catching a unique-constraint violation on the existing partial
  index (`(tenantId, invoiceNumber)` WHERE `deletedAt IS NULL`) and
  re-counting/retrying rather than failing outright.
- **Why:** a real Postgres `SEQUENCE` object (or per-tenant counter
  table) would guarantee gap-free, race-free numbering, but neither
  exists in this schema and adding one is real new infrastructure this
  milestone's own "Foundation" scope doesn't ask for. A plain count +
  retry is proportionate for this milestone's own low-concurrency,
  admin-driven invoicing flow — the SAME class of judgment call
  Milestone 9 made for "Prevent duplicate active leads" (service-level
  check, not a heavier DB mechanism) — with the existing unique index as
  the race-free correctness backstop regardless of how the candidate
  number was produced.
- **Alternatives:** a real Postgres sequence/counter table (rejected —
  meaningfully more infrastructure for a low-concurrency admin flow);
  a random/ULID-based invoice number (rejected — "Invoice numbers
  generated automatically" reads as a human-meaningful, sequential
  scheme, matching real invoicing conventions, not an opaque identifier
  that already has one in `id`).
- **Affects:** `apps/api/src/modules/billing/invoice.service.ts`
  (`generateInvoiceNumber()`, `createFromOrder()`'s own retry loop),
  `apps/api/src/modules/billing/repositories/invoice.repository.ts`
  (`countForTenantAndYear()`), `apps/api/src/modules/billing/constants/billing.constant.ts`.

---

## 2026-07-21 — Milestone 9: `Lead` conversion targets the NEW `Customer` (Milestone 8), kept entirely separate from the pre-existing `Client` conversion path
- **Decision:** The architecture audit found `Lead` already fully
  modeled (Phase 1.1A) with an existing `convertedClientId` → `Client`
  relation (the agency's own B2B service-customer conversion path). This
  milestone's own brief explicitly says "Convert Lead → Customer" and
  "Use: CustomerRepository" (not `ClientRepository`) — read literally,
  not loosely, as pointing at Milestone 8's `Customer` (the e-commerce
  entity that can place Orders), not `Client`. Rather than repurposing
  `convertedClientId` or reinterpreting "Customer" as a synonym for
  `Client`, added a NEW, separate nullable `convertedCustomerId` → `Customer`
  column. `LeadService.convert()` only ever sets `convertedCustomerId`;
  `convertedClientId` is completely untouched by this milestone, still
  whatever the original agency-CRM design anticipated for it.
- **Why:** `Customer`'s own Milestone 8 schema comment already
  establishes the precedent this decision extends: "`Customer` is a
  genuinely new concept, distinct from the existing `Client` model...
  The two are unrelated on purpose." A single tenant in this hybrid
  agency+storefront platform can plausibly have BOTH inbound web-agency-
  service leads (→ `Client`, for quotations/invoicing/projects) and
  inbound storefront-purchase-intent leads (→ `Customer`, who then
  places Orders) — coexistence, not replacement, is the correct model.
- **Alternatives:** repurpose `convertedClientId` to point at `Customer`
  instead (rejected — breaking change to an already-modeled, already-
  named column with a clear existing meaning); treat "Customer" in the
  brief as loose terminology for `Client` and build against
  `ClientRepository` instead (rejected — the brief's own explicit
  "Use: CustomerRepository" is too specific and deliberate a naming
  choice to read as accidental, especially paired with "CRM owns
  customer engagement only. Orders remain responsible for commerce").
- **Affects:** `apps/api/prisma/schema.prisma` (`Lead.convertedCustomerId`,
  `Lead`'s own updated doc comment), `apps/api/src/modules/crm/lead.service.ts`
  (`convert()`), `apps/api/src/modules/orders/repositories/customer.repository.ts`
  (new `findActiveByEmailInTx()`/`createWithRelationsInTx()`),
  `apps/api/src/modules/crm/README.md`.

## 2026-07-21 — Milestone 9: `CustomerActivity.customerId` is nullable — "lead creation" fires before any Customer exists
- **Decision:** Initially modeled `CustomerActivity.customerId` as
  required (NOT NULL), matching the "Customer"-prefixed naming of
  `CustomerNote`/`CustomerTag`. Caught before any code depended on it:
  this milestone's own "Automatic activity creation for" list names
  "lead creation" as a trigger, but a lead has no Customer to reference
  until it converts — a required `customerId` makes that trigger
  impossible to satisfy. Changed to nullable; `LEAD_CREATED` rows write
  `customerId: null`, anchored by `relatedLeadId` alone. `LEAD_CONVERTED`
  writes BOTH (the newly linked Customer AND the originating Lead — a
  genuine dual reference, not an XOR). Also trimmed `CustomerActivityType`
  from an initial 6 speculative values down to exactly the 3 this
  milestone's own trigger list names (`LEAD_CREATED`/`LEAD_CONVERTED`/
  `FOLLOW_UP_COMPLETED`) — the others (`NOTE_ADDED`, `FOLLOW_UP_CREATED`,
  `MANUAL`) had no controller route that could ever produce them, since
  this milestone's own "Activities" Controllers list is "Timeline, List"
  only (no create route).
- **Why:** a required `customerId` would either make "lead creation"
  activities technically impossible to write (contradicting an explicit
  business rule) or force writing them only retroactively at conversion
  time (losing the real creation timestamp and misrepresenting when the
  event actually happened).
- **Alternatives:** skip the "lead creation" activity trigger entirely,
  only implementing "lead conversion" and "follow-up completion"
  (rejected — directly disobeys an explicit, named business rule);
  make `CustomerActivity` a lead-vs-customer XOR like `FollowUpTask`
  (rejected — a conversion event genuinely needs to reference BOTH the
  lead and the resulting customer at once, which an XOR can't express).
  A side effect worth naming: this was caught and fixed by reverting an
  already-applied migration (`20260722100000_add_crm_customer_operations`)
  before any seed data or application code depended on the wrong shape —
  a live DB rollback + corrected re-apply, not a follow-up migration,
  since nothing downstream had used it yet.
- **Affects:** `apps/api/prisma/schema.prisma` (`CustomerActivity`),
  `apps/api/prisma/migrations/20260722100000_add_crm_customer_operations/migration.sql`,
  `apps/api/src/modules/crm/customer-activity.service.ts` (the `leadId`
  list filter added specifically so `LEAD_CREATED` rows remain reachable
  — see the next entry).

## 2026-07-21 — Milestone 9: `GET /customer-activities` (List) gained a `leadId` filter so `LEAD_CREATED` rows stay reachable
- **Decision:** `GET /customer-activities/timeline?customerId=X` is
  strictly customer-scoped by design (see the entry above) — a
  `LEAD_CREATED` row (`customerId: null`) can never appear there. Added
  a `leadId` query param to `CustomerActivityListQueryDto` (maps to the
  `relatedLeadId` column, already indexed) so the general List endpoint
  can surface "everything that happened for lead X," including its own
  creation event.
- **Why:** without this, `LEAD_CREATED` rows would be written but
  practically unreachable through either of this milestone's own two
  named read surfaces ("Timeline, List") in any targeted way — only
  visible via an unfiltered or type-filtered dump of the entire List
  endpoint. Caught live during this milestone's own smoke test (a
  timeline-ordering assertion failed because `LEAD_CREATED` genuinely
  never shows up customer-scoped — not a test bug, a real reachability
  gap), fixed immediately rather than weakening the test to hide it.
- **Alternatives:** have `timeline()` additionally look up the
  customer's originating lead (via `Lead.convertedCustomerId`) and merge
  in that lead's own pre-conversion activities (rejected — meaningfully
  more complex, and blurs "the customer's own timeline" with "the
  originating lead's timeline," two different views this milestone's
  brief doesn't ask to be merged).
- **Affects:** `apps/api/src/modules/crm/dto/customer-activity-list-query.dto.ts`,
  `apps/api/src/modules/crm/customer-activity.service.ts` (`list()`).

## 2026-07-21 — Milestone 9: "Prevent duplicate active leads" is a service-level check, not a DB constraint
- **Decision:** `LeadRepository.findActiveByEmail()` checks for an
  existing lead with the same `(tenantId, contactEmail)` in a
  non-terminal status before `create()`/`update()`, translated to a
  clean `409 ConflictException`. No partial unique index backs this up
  at the database level.
- **Why:** unlike a slug/SKU/email uniqueness constraint (a fixed
  predicate: `WHERE deleted_at IS NULL`), "active" here means "status is
  one of several specific values" — a predicate that would need updating
  every time `LeadStatus`'s own terminal/active split changes, a much
  more fragile index than the "soft-deletable" pattern this codebase
  otherwise uses everywhere. The consequence of a missed race (two
  near-simultaneous requests both passing the pre-check) is a duplicate
  sales-pipeline entry for the same contact — a real but minor sales-ops
  annoyance, not a financial-correctness issue — the same proportionality
  judgment Milestone 8 already made for "default addresses" (also
  service-only, also reasoned as "a minor UX issue, not a financial-
  correctness one").
- **Alternatives:** a hand-written partial unique index with the active-
  status list embedded in its `WHERE` predicate (rejected — brittle
  against future `LeadStatus` changes, and the race window here is
  narrow and low-stakes enough not to warrant it, unlike inventory's own
  counters).
- **Affects:** `apps/api/src/modules/crm/repositories/lead.repository.ts`
  (`findActiveByEmail()`), `apps/api/src/modules/crm/lead.service.ts`
  (`assertNoDuplicateActiveLead()`).

## 2026-07-21 — Milestone 9: `CustomerTagController` built beyond this milestone's own named Controllers list; `LeadSource` deliberately gets none
- **Decision:** This milestone's own "Repository Layer"/"Service
  Layer"/"Controllers" lists name exactly four entities: Lead,
  CustomerActivity, CustomerNote, FollowUp. `CustomerTag`/
  `CustomerTagAssignment` are named only in "Core entities" and the
  "Tags" list-filter requirement — no controller is specified. Built a
  5th, minimal triad anyway (`CustomerTagController`/`CustomerTagService`/
  `CustomerTagRepository`: tag CRUD + assign/unassign). By contrast,
  `LeadSource` — also unnamed in any of those three lists — got NO
  controller/service/repository at all, seed data only.
- **Why the asymmetry:** `CustomerTag`/`CustomerTagAssignment` have no
  fallback — without a write path, they're permanently dead schema and
  the brief's own "Tags" filter is permanently unsatisfiable (zero
  possible data, not just harder to populate). `LeadSource` has a
  built-in fallback the brief itself provides: `Lead.source` (the
  existing free-text column) already satisfies the "Source" filter on
  its own — a `LeadSource` row's absence doesn't leave anything
  unreachable, it just means a lead uses free text instead of a formal
  taxonomy entry. The same "no half-finished implementation" discipline
  (CLAUDE.md) that justified `BaseRepository.count()` in Milestone 5 (a
  genuine, simultaneous need, not speculation) justifies `CustomerTagController`
  here — but doesn't extend to `LeadSource`, which has nothing broken to
  fix.
- **Alternatives:** build neither (rejected for CustomerTag — leaves
  named "Core entities" and an explicit filter requirement dead on
  arrival); build a full `LeadSourceController` too, for symmetry
  (rejected — no requirement is left unsatisfiable without it, so it
  would be speculative scope, not requirement-driven).
- **Affects:** `apps/api/src/modules/crm/customer-tag.controller.ts`,
  `customer-tag.service.ts`, `repositories/customer-tag.repository.ts`;
  `apps/api/src/modules/crm/repositories/lead.repository.ts`'s own
  `findActiveLeadSourceById()` (the one narrow LeadSource touchpoint that
  DOES exist); `apps/api/src/modules/crm/README.md`.

## 2026-07-21 — Milestone 9: `leads:read`/`leads:write` already existed — reused as-is, only their grants extended
- **Decision:** `leads:read`/`leads:write` were already seeded (Phase
  1.1B's original agency-CRM RBAC), already granted to `sales`/
  `project_manager` (read only). This milestone's own RBAC brief
  ("Read: Customer+/Manager+/Admin+/Super Admin. Write: Manager+/Admin/
  Super Admin.") is satisfied purely by EXTENDING existing grants —
  `manager` gains `leads:write` (it already had `leads:read` from Phase
  1.1B), `customer` gains `leads:read` (it had neither before) — no new
  permission keys defined for Lead itself.
- **Why:** creating a second, differently-named permission pair (e.g.
  `crm_leads:read`) purely because a new milestone happens to touch the
  same resource would fragment authorization for one entity across two
  unrelated permission keys, and violates the audit's own "reuse
  existing structures, do not duplicate entities" instruction extended
  to the RBAC layer, not just the schema layer.
- **Alternatives:** define new, milestone-scoped permission keys
  (rejected — `sales`/`project_manager`'s existing `leads:*` grants would
  then coexist meaninglessly alongside a parallel, redundant permission
  pair guarding the exact same resource).
- **Affects:** `apps/api/src/modules/auth/constants/permission.constant.ts`
  (`LEADS_READ`/`LEADS_WRITE` — newly named as TS constants, pointing at
  the pre-existing string keys), `apps/api/prisma/seed.ts` (`manager`/
  `customer` role grants extended).

---

## 2026-07-21 — Milestone 8: the workflow diagram is read as realistic e-commerce semantics, not a literal sixth sequential step for Cancelled
- **Decision:** The brief's own workflow diagram (`Draft → Pending →
  Confirmed → Processing → Completed → Cancelled`) is implemented as
  strictly-forward, one-step-at-a-time progression through
  `DRAFT→PENDING→CONFIRMED→PROCESSING→COMPLETED`, with `CANCELLED`
  reachable from any non-terminal status (`DRAFT`/`PENDING`/`CONFIRMED`/
  `PROCESSING`) via a separate, more-privileged `POST /orders/:id/cancel`
  endpoint — never as a sixth sequential step reachable only via `POST
  /orders/:id/status` after `COMPLETED`. `ORDER_FORWARD_TRANSITIONS`
  (`constants/orders.constant.ts`) encodes only the five forward links;
  `ORDER_CANCELLABLE_STATUSES` is a separate allowlist of the four
  non-terminal statuses.
- **Why:** reading the diagram literally would mean an order can only be
  cancelled AFTER it's already completed — the opposite of how
  cancellation works in any real e-commerce system, and inconsistent
  with the brief's own "During cancellation: Release inventory
  reservations" (releasing a reservation only makes sense before
  fulfillment consumes it — Milestone 7's own `consumeReservation()`,
  called on reaching `COMPLETED`, permanently removes the reservation
  `cancel()` would otherwise release). The brief's own "Cancel" RBAC
  tier (Admin+, stricter than ordinary write) and its own separate
  "Controllers" list entry ("Change status" AND "Cancel" as two distinct
  items) both independently support reading Cancel as a parallel,
  privileged escape hatch rather than a position in the linear chain.
- **Alternatives:** implement the diagram literally, making `CANCELLED`
  only reachable from `COMPLETED` via `changeStatus()` (rejected — would
  make the brief's own "During cancellation: Release inventory
  reservations" nonsensical, since a completed order's reservations are
  already consumed, not releasable); allow `CANCELLED` from `changeStatus()`
  in addition to the forward chain rather than only through the
  dedicated `cancel()` endpoint (rejected — the brief lists Cancel as
  its own controller action with its own, stricter RBAC tier; folding it
  into the general status-change endpoint would make that tier
  unenforceable for cancellation specifically).
- **Affects:** `apps/api/prisma/schema.prisma` (`Order`'s own doc
  comment), `apps/api/src/modules/orders/constants/orders.constant.ts`,
  `apps/api/src/modules/orders/order.service.ts`
  (`changeStatus()`/`cancel()`), `apps/api/src/modules/orders/README.md`.

## 2026-07-21 — Milestone 8: one Prisma transaction threaded across a module boundary via a client handoff, not a shared repository
- **Decision:** `OrderRepository.runInTransaction(work)` opens the
  transaction and hands the resulting `Prisma.TransactionClient` back to
  `OrderService`, which then passes that SAME `tx` into every
  `InventoryService` call it makes inside the callback
  (`reserveStockForOrder()`, `releaseReservation()`,
  `consumeReservation()` — all three gained an explicit `tx` parameter
  this milestone). `InventoryService`/`InventoryRepository` never call
  back into `OrdersModule`, and `OrderRepository` never reaches into
  `this.prisma.inventoryItem`/`inventoryReservation` directly — the
  transaction client is the only thing crossing the module boundary.
- **Why:** "Execute everything within a single transaction" (order
  creation) and the equivalent atomicity requirement for
  cancel/complete require `Order`/`OrderItem`/`OrderStatusHistory` writes
  and `InventoryReservation`/`InventoryItem` counter mutations to commit
  or roll back together, but those two write sets live in two different
  modules' repositories. Two separately-opened transactions (each module
  managing its own) can't roll back together — a crash between them
  would leave a reservation with no order, or an order with no
  reservation.
- **Alternatives:** have `OrderRepository` reach directly into
  `this.prisma.inventoryItem`/`inventoryReservation` inside its own
  transaction, bypassing `InventoryService`/`InventoryRepository`
  entirely (rejected — duplicates Milestone 7's own pre-check/atomic-
  counter-update logic in a second place, exactly the "Do not duplicate
  logic" violation this milestone's own brief explicitly warns against);
  have `InventoryService` open its own nested transaction independently
  and rely on Prisma's implicit transaction nesting (rejected — Prisma's
  interactive `$transaction` callback doesn't support genuine nested
  independent transactions the way this would require; the caller-
  supplied `tx` parameter is the documented, supported pattern for
  "run this inside an already-open transaction").
- **Affects:** `apps/api/src/modules/orders/repositories/order.repository.ts`
  (`runInTransaction()`/`createInTx()`/`addStatusHistoryInTx()`/
  `updateStatusInTx()`), `apps/api/src/modules/orders/order.service.ts`,
  `apps/api/src/modules/inventory/inventory.service.ts`/
  `inventory.repository.ts` (the new optional/required `tx` parameters),
  `docs/architecture/domain-module-guide.md` §19.

## 2026-07-21 — Milestone 8: `OrderItem`/`CustomerAddress` get no repository or controller of their own
- **Decision:** Only `CustomerRepository`/`OrderRepository` exist, per
  this milestone's own "Repository Layer" list. `OrderItem` is created
  only as nested data under `POST /orders` (immutable afterward — no
  edit/remove route); `CustomerAddress` is created/replaced only as
  nested data under `Customer`'s own create/update (`PATCH` performs a
  full replace when `addresses` is provided).
- **Why:** mirrors the established "line-item shaped, no independent
  repository" precedent this codebase already applies consistently —
  `QuotationItem`/`InvoiceItem` (Phase 1.1B), `ProductVariant`/
  `ProductImage` (Milestone 5), `FabricImage`/`StyleOptionGroup`/
  `PricingAdjustment`/`MonogramOption` (Milestone 6),
  `SupplierProduct` (Milestone 7) — none of those got a standalone
  repository/controller either, and this milestone's own brief lists
  exactly two repositories, not four.
- **Alternatives:** give `OrderItem`/`CustomerAddress` their own
  repositories for symmetry with `Order`/`Customer` (rejected — no
  brief requirement, no controller would ever call them directly, and
  every precedent in this codebase treats line-item-shaped entities this
  way).
- **Affects:** `apps/api/prisma/schema.prisma` (`OrderItem`/
  `CustomerAddress` doc comments), `apps/api/src/modules/orders/`
  (no `repositories/order-item.repository.ts` or
  `repositories/customer-address.repository.ts` exist).

## 2026-07-21 — Milestone 7: no inventory/warehouse/supplier design guidance anywhere in the repo — proceeded with a deliberately generic ledger design, flagged not guessed
- **Decision:** Before writing any code, ran a fresh, repo-wide search
  for "inventory", "warehouse", "stock", "supplier", "reservation",
  "reorder", "SKU". Found zero field names/entity relationships/business
  rules anywhere. Notably, BOTH `catalog/README.md` and `bespoke/README.md`
  explicitly name "inventory"/"Inventory reservation" in their own "What
  this module explicitly does NOT do" sections — confirming the concept
  was always anticipated as a future milestone, but neither doc describes
  its shape. Proceeded with a deliberately generic inventory-ledger
  design (plain warehouse/stock-counter/transaction/reservation/supplier
  fields, no brand- or industry-specific vocabulary), flagged explicitly
  here and in `apps/api/src/modules/inventory/README.md`.
- **Why:** same reasoning as Milestones 5/6's own domain-design decisions
  — guessing a specific WMS/ERP's real schema risks building the wrong
  shape; a generic design serves as a genuine foundation regardless.
- **Alternatives:** trust that "no guidance in docs/product/" (Milestones
  5/6's own finding) generalizes to this milestone without re-checking
  (rejected — cheap to verify, and finding the two explicit "inventory"
  disclaimers was only possible by actually searching, not assuming).
- **Affects:** `apps/api/prisma/schema.prisma` (Inventory & Stock
  Management section), `apps/api/prisma/seed.ts` (example warehouse/
  inventory items/supplier), `apps/api/src/modules/inventory/README.md`.

## 2026-07-21 — Milestone 7: `InventoryModule` imports nothing — cross-module references validated directly, not via an imported repository
- **Decision:** Unlike `BespokeModule` (which imports `CatalogModule` to
  reuse its exported `ProductRepository`), `InventoryModule` imports NO
  other module. Its two cross-module references — `ProductVariant.id`
  (catalog) and `Fabric.id` (bespoke) — are validated via
  `productVariantExistsForTenant()`/`fabricExistsForTenant()`, small
  methods on `InventoryRepository`/`SupplierRepository` that query
  `this.prisma.productVariant`/`this.prisma.fabric` directly.
- **Why:** this milestone needs to validate references into TWO other
  modules' domains, not one. Importing both `CatalogModule` and
  `BespokeModule` purely to run two `findFirst({ select: { id: true } })`
  existence checks would add real cross-module coupling for very little
  shared behavior — and `ProductVariant` has no repository of its own to
  import in the first place (see Milestone 5's own decision that no
  `ProductVariantRepository` exists), so the "reuse an export" pattern
  couldn't even apply symmetrically to both references. A direct
  existence check, duplicated once in each of `InventoryRepository`/
  `SupplierRepository` (both need the identical two checks), is the same
  "small, deliberate duplication over premature abstraction" call
  Milestone 6 already made for `StyleOptionRepository`'s
  `productVariantExistsForTenant`-shaped helpers, just applied across a
  module boundary instead of within one file.
- **Alternatives:** import `CatalogModule` + `BespokeModule` and reuse
  `ProductRepository`/`FabricRepository` (rejected — `ProductVariant` has
  no repository to reuse at all, and the coupling cost for two modules
  wasn't justified by the amount of shared behavior — two lookups, not a
  meaningfully large shared surface); export `ProductRepository`'s
  variant-lookup capability newly and add one to `FabricRepository` too,
  then import both modules (rejected — more invasive than the problem
  warranted). See `docs/architecture/domain-module-guide.md` §18 for the
  general "when to reuse vs. check directly" guidance this decision now
  anchors.
- **Affects:** `apps/api/src/modules/inventory/inventory.module.ts`,
  `apps/api/src/modules/inventory/repositories/inventory.repository.ts`,
  `apps/api/src/modules/inventory/repositories/supplier.repository.ts`.

## 2026-07-21 — Milestone 7: stock counters mutate via atomic Prisma `{ increment }`/`{ decrement }`, never a read-then-write
- **Decision:** Every stock mutation
  (`InventoryRepository.applyStockChange()`/`reserveStock()`/
  `releaseReservation()`/`consumeReservation()`) updates
  `InventoryItem.onHand`/`reserved` via Prisma's atomic `{ increment:
  delta }`/`{ decrement: delta }` — never by reading the current value in
  application code, computing a new value, and writing it back.
- **Why:** "Inventory math must remain transactional" (this milestone's
  own requirement) is about more than wrapping writes in
  `$transaction()` — a read-then-write inside a transaction is STILL
  vulnerable to a lost-update race under Postgres's default READ
  COMMITTED isolation (two concurrent transactions can both read the
  same starting value before either commits its write). `{ increment }`
  compiles to a single `UPDATE ... SET on_hand = on_hand + $delta`
  statement evaluated against whatever the row's CURRENT value is at
  write time, which Postgres itself serializes correctly per-row without
  needing explicit `SELECT ... FOR UPDATE` locking. It also composes
  correctly with this migration's own `CHECK` constraints: a concurrent
  double-decrement that would push a counter invalid still correctly
  fails the constraint on whichever transaction's `UPDATE` commits
  second — genuine race-freedom, not just "wrapped in a transaction and
  hoping."
- **Alternatives:** read-then-write inside `$transaction()` (rejected —
  the lost-update race above); explicit `SELECT ... FOR UPDATE` row
  locking via raw SQL before a normal read-then-write (rejected — works,
  but adds real complexity — raw query result typing, manual row-to-model
  mapping — that atomic `{ increment }` avoids entirely for this
  specific "add/subtract a delta" shape of mutation).
- **Affects:** `apps/api/src/modules/inventory/repositories/inventory.repository.ts`.

## 2026-07-21 — Milestone 7: "Consume reservation" is a real, tested service method with no controller route
- **Decision:** `InventoryService.consumeReservation()` exists, is fully
  unit-tested, and is called by nothing in this milestone's own
  controller layer — no `POST` route exposes it.
- **Why:** the brief's own "Service Layer" section lists "Consume
  reservation" as a required business responsibility, but its own
  "Controllers" section, under Inventory, lists only "Release
  reservation" (no "Consume reservation" entry) alongside Get/Adjust/
  Receive/Reserve/List transactions. Read literally rather than treated
  as an oversight to silently "fix": releasing a hold is a genuine admin
  action (cancel a reservation, return stock to availability) that makes
  sense to expose now; consuming one — the reserved stock actually
  leaving inventory for good — is naturally triggered by order
  fulfillment, which doesn't exist yet (Orders are explicitly out of this
  milestone's "Do NOT Implement" list). Building the service capability
  now (so a future Orders module has a ready, tested integration point)
  while NOT inventing a premature REST endpoint for it honors both
  sections of the brief precisely as written.
- **Alternatives:** add a `POST /inventory/reservations/:id/consume`
  route anyway, reasoning the omission was accidental (rejected — the
  brief is explicit and internally consistent enough elsewhere in this
  arc, e.g. Milestone 6's ProductCustomization "no Delete" being read the
  same literal way, that treating a listed asymmetry as a typo isn't
  warranted); omit the service method entirely until an Orders module
  needs it (rejected — the brief lists it as a required Service Layer
  capability for THIS milestone, not a future one).
- **Affects:** `apps/api/src/modules/inventory/inventory.service.ts`,
  `apps/api/src/modules/inventory/inventory.controller.ts`.

## 2026-07-21 — Milestone 6: no bespoke-customizer design guidance anywhere in the repo — proceeded with a deliberately generic garment design, flagged not guessed
- **Decision:** Before writing any code, ran a fresh, repo-wide search
  (not just `docs/product/*.md`) for "bespoke", "customiz", "fabric",
  "monogram", "measurement profile", "style option", "garment", "tailor".
  Found zero field names/entity relationships/business rules anywhere —
  "Bespoke Customizer" appears only as Milestone 5's own forward-
  reference doc comments on `Product`/`ProductVariant`, naming the
  feature without describing its shape. Proceeded with a deliberately
  generic bespoke-garment design (plain fabric/measurement/style-option/
  monogram fields, no brand-specific vocabulary), flagged explicitly here
  and in `apps/api/src/modules/bespoke/README.md`.
- **Why:** same reasoning as Milestone 5's own catalog-design decision
  below — guessing a specific brand's real customization flow risks
  building the wrong shape; a generic design serves as a genuine
  foundation regardless. Re-checking fresh (rather than assuming
  Milestone 5's "no guidance" finding still holds) matters because this
  domain is materially more specific than a generic product catalog, and
  a domain doc could plausibly have been added between milestones.
- **Alternatives:** trust Milestone 5's own "no guidance" finding without
  re-checking (rejected — cheap to verify, and the domain is different
  enough that assuming carries real risk); infer a garment type from
  "Antrique" alone (rejected, same reasoning as Milestone 5's own
  rejection of inferring jewelry from the name).
- **Affects:** `apps/api/prisma/schema.prisma` (Bespoke Customizer
  section), `apps/api/prisma/seed.ts` (example fabrics/measurement
  profile/customization), `apps/api/src/modules/bespoke/README.md`.

## 2026-07-21 — Milestone 6: two structurally-required join tables added beyond the brief's 10 named "core entities"
- **Decision:** Added `ProductFabric` (Product ↔ Fabric many-to-many) and
  `StyleOptionIncompatibility` (self-referential "X incompatible with Y"
  on StyleOption) — neither is named in the brief's "Core entities" list,
  but both are structurally necessary to express relationships the brief
  DOES list: "Product → Fabrics" and "Incompatible style combinations are
  rejected."
- **Why:** `Fabric` is described as a reusable catalog item (grouped by
  `FabricCategory`, referenced by "Filtering: Fabric category") — a
  single scalar `productId` FK on `Fabric` would mean each fabric could
  only ever belong to ONE product, defeating the entire point of a
  reusable fabric catalog; a many-to-many join is the only faithful
  reading of "Product → Fabrics." Similarly, "incompatible style
  combinations are rejected" has no expressible mechanism without SOME
  table recording which pairs are incompatible — there is no existing
  field or relationship that could carry this information. Both are pure
  join tables (hard-delete, `addedAt`/`addedBy`), matching this schema's
  own `UserRole`/`ProjectMember`/`RolePermission` precedent, not a new
  pattern.
- **Alternatives:** a single scalar `productId` on `Fabric` (rejected —
  defeats fabric reusability, contradicts "Filtering: Fabric category"
  implying fabrics exist independently of any one product); no
  mechanism for style-incompatibility at all, treating the business rule
  as aspirational/future-only (rejected — the brief lists it as a
  "Validate" requirement for THIS milestone, not a deferred one).
- **Affects:** `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/migrations/20260720200000_add_bespoke_customizer/`,
  `apps/api/src/modules/bespoke/repositories/fabric.repository.ts`,
  `apps/api/src/modules/bespoke/repositories/style-option.repository.ts`.

## 2026-07-21 — Milestone 6: `MeasurementProfile.userId` added despite not being in the brief's "Relationships" list
- **Decision:** Added an optional, nullable `userId` field to
  `MeasurementProfile`, linking it to the portal `User` it belongs to —
  not named in the brief's own "Relationships" section (which lists only
  "MeasurementProfile → Measurements").
- **Why:** a measurement profile with no owner reference at all would be
  a "floating" resource with no way to meaningfully list/filter/attribute
  it to anyone — `GET /measurement-profiles` would just return every
  profile in the tenant with nothing to group them by. A nullable
  `userId` is the minimal addition needed for the entity to function as a
  real, listable resource, not scope creep beyond what's asked.
- **Alternatives:** no owner field at all (rejected — see above); a
  `clientId` link instead (rejected — measurements are about ONE
  individual's body, and `Client` represents an organization that could
  have many people; `User` — specifically a client-portal user, per
  `User.clientId`'s own existing convention — is the correct-grained
  owner).
- **Affects:** `apps/api/prisma/schema.prisma` (`MeasurementProfile`,
  `User.measurementProfiles`), `apps/api/src/modules/bespoke/dto/
  create-measurement-profile.dto.ts`, `measurement.repository.ts`'s
  `userBelongsToTenant()`.

## 2026-07-21 — Milestone 6: repository/controller naming follows the brief literally even where it's internally inconsistent
- **Decision:** The brief names a `MeasurementRepository` (not
  `MeasurementProfileRepository`) alongside a "Measurement Profiles"
  controller, and a `StyleOptionRepository`/"Style Options" controller
  (not "Style Option Groups"). Read literally: `MeasurementRepository`
  targets `MeasurementProfile` as its aggregate root (nested
  `Measurement` children, no independent Measurement repository/
  controller); `StyleOptionRepository`/`StyleOptionController` target
  `StyleOption` directly, and `StyleOptionGroup` gets no repository/
  controller of its own — created only as nested data under
  `ProductCustomization`.
- **Why:** the brief's own Repository Layer section lists exactly 4
  repositories for 10 entities — this is a deliberate signal about which
  entities get independent CRUD versus which are nested-only, not an
  oversight to "fix" by adding two more repositories. Honoring the exact
  class names the brief specifies, even where the repository-vs-
  controller naming isn't perfectly parallel, keeps the codebase
  traceable back to the brief that specified it.
- **Alternatives:** rename to `MeasurementProfileRepository`/
  `StyleOptionGroupRepository` for internal consistency (rejected —
  contradicts the brief's own explicit naming); add standalone
  `Measurement`/`StyleOptionGroup` repositories+controllers (rejected —
  the brief's 4-repository, 4-controller list is a deliberate scope
  boundary, matching Milestone 5's own "no ProductVariantRepository"
  precedent for a nested-only entity).
- **Affects:** `apps/api/src/modules/bespoke/repositories/
  measurement.repository.ts`, `style-option.repository.ts`,
  `docs/architecture/domain-module-guide.md` §16 (new bullet).

## 2026-07-21 — Milestone 6: a `PricingAdjustment`'s `styleOptionId` can only be set via `PATCH`, never at `POST /product-customizations` creation time
- **Decision:** `CreatePricingAdjustmentDto.styleOptionId` is accepted by
  the DTO, but `ProductCustomizationService.create()` rejects the request
  outright (`BadRequestException`) if any nested `pricingAdjustments[].styleOptionId`
  is set. It can only be set through `PATCH /product-customizations/:id`
  (a full replace of the adjustments array), once the referenced style
  option genuinely exists.
- **Why:** `POST /product-customizations` creates `StyleOptionGroups` and
  their `StyleOptions` as ONE nested Prisma write in the same request —
  their real ids don't exist until that write completes, so a
  `pricingAdjustments` entry in the SAME request body can't possibly
  reference one of them by a real UUID. Rather than inventing an
  index-based forward-reference scheme (e.g. "adjustment targets group 0,
  option 1") purely to support this one case, the simpler, more honest
  rule is: flat/untriggered adjustments (no `styleOptionId`) are fine at
  creation; per-option pricing rules are a follow-up `PATCH` once the
  option exists. This also means the "Style options belong to the
  selected product" validation naturally always succeeds or fails
  correctly without special-casing create vs. update.
- **Alternatives:** an index/position-based reference scheme for
  same-request forward-references (rejected — real complexity for a
  narrow case, and this is explicitly a "deliberately generic," not
  brand-specific, design where the simpler two-step flow is a reasonable
  cost); silently ignoring a `styleOptionId` given at create time
  (rejected — silent data loss is worse than a clear, actionable 400).
- **Affects:** `apps/api/src/modules/bespoke/dto/
  create-pricing-adjustment.dto.ts`,
  `apps/api/src/modules/bespoke/product-customization.service.ts`.

## 2026-07-21 — Milestone 6: `ProductCustomization.update()` excludes `styleOptionGroups` but allows a full replace of `pricingAdjustments`/`monogramOptions`
- **Decision:** `UpdateProductCustomizationDto` has no
  `styleOptionGroups` field (structural, immutable after create — new
  options are added later via the standalone `StyleOption` endpoint
  instead), but DOES accept `pricingAdjustments`/`monogramOptions` —
  when given, these fully replace the existing set (delete-then-create,
  one transaction).
- **Why:** style option GROUPS are structural (the set of configurable
  dimensions — "Collar Style," "Cuff Style" — is set once when a
  product's customization is designed), matching Milestone 5's own
  `Product.update()` not touching `variants`/`images`. Pricing rules and
  monogram configuration are different in kind — genuinely expected to
  be revised over time (a price changes, a monogram option is retired) —
  the same "mutable data, not one-time structure" reasoning this
  milestone's own `MeasurementProfile.measurements` update already needed
  (a person's measurements change, unlike a product's variant list).
- **Alternatives:** immutable-after-create for everything, matching
  Milestone 5's variants/images treatment exactly (rejected — pricing
  rules realistically need to change without recreating the whole
  customization); a diff-based partial update instead of full-replace
  (rejected — full-replace avoids partial-update edge cases and matches
  `MeasurementProfile.measurements`' own precedent, set in the same
  milestone).
- **Affects:** `apps/api/src/modules/bespoke/dto/
  update-product-customization.dto.ts`,
  `apps/api/src/modules/bespoke/repositories/
  product-customization.repository.ts` (`replacePricingAdjustments()`/
  `replaceMonogramOptions()`).

## 2026-07-21 — Milestone 6: `CatalogModule` now exports `ProductRepository` for cross-module reuse
- **Decision:** `CatalogModule.exports` gained `ProductRepository` (was
  empty). `BespokeModule` imports `CatalogModule` and injects
  `ProductRepository` into `FabricService`/`ProductCustomizationService`
  to validate a client-supplied `productId` belongs to the caller's
  tenant before referencing it.
- **Why:** both services need the identical "does this product exist for
  this tenant" check `ProductService` already performs internally — 
  reusing the one real `ProductRepository` instance (via Nest's export/
  import mechanism) avoids a second, redundant DI registration of the
  same repository class and keeps the cross-tenant-ownership check
  consistent with Milestone 5's own precedent
  (`ProductService.assertReferencesBelongToTenant()`). The dependency is
  one-directional (bespoke → catalog); `CatalogModule` has no knowledge
  of `BespokeModule` at all, so zero circular dependencies.
- **Alternatives:** a second, separate `ProductRepository` provider
  registered directly in `BespokeModule` (rejected — works, but is a
  redundant DI instance of a stateless class for no benefit); duplicate
  the validation logic against `this.prisma.product` directly inside
  bespoke's own services (rejected — bypasses the repository layer,
  violates "services never inject `PrismaService` directly").
- **Affects:** `apps/api/src/modules/catalog/catalog.module.ts`,
  `apps/api/src/modules/bespoke/bespoke.module.ts`,
  `apps/api/src/modules/bespoke/fabric.service.ts`,
  `apps/api/src/modules/bespoke/product-customization.service.ts`.

## 2026-07-20 — Milestone 5: no product-catalog design guidance in `docs/product/` — proceeded with a deliberately generic schema, flagged not guessed
- **Decision:** Before writing any code, checked `docs/product/*.md` for
  existing catalog/product design guidance (field names, example
  categories, a described product line). Found none — those docs model
  Antrique purely as a web agency selling services to its own clients
  (quote wizard → portal → billing), with no e-commerce/catalog concept
  anywhere, and no mention of "Bespoke Customizer" at all. Proceeded with
  a deliberately generic `Category`/`Collection`/`Product`/
  `ProductVariant`/`ProductImage` schema (plain `name`/`slug`/
  `description`, an open `Json?` `attributes`/`metadata` escape hatch for
  future customization-specific fields) rather than guessing at a
  specific product line, and flagged the gap explicitly in
  `schema.prisma`'s own comment and `apps/api/src/modules/catalog/README.md`.
- **Why:** guessing a specific product line (e.g. hardcoding jewelry-
  specific columns) risks building the wrong shape and having to migrate
  again once real product requirements land; a generic, open schema with
  an escape-hatch `Json` field for domain-specific attributes serves as a
  genuine foundation either way. This mirrors `prisma/seed.ts`'s own
  established precedent from Phase 1.1B ("Scope gap, flagged rather than
  silently resolved" — Service/BlogCategory entities the seed brief
  asked for but the approved schema didn't have) — the same discipline
  applied to a schema decision instead of a seed-data one.
- **Alternatives:** ask the user to clarify the product line before
  proceeding (considered — but this milestone's own brief is explicit
  about the entities/relationships/fields needed at the *structural*
  level, and the actual field CONTENT is easily revised later without
  another architectural pass; low-stakes enough to proceed and flag,
  matching how Milestone 3's seed-role-naming reconciliation was handled
  without pausing to ask); infer a specific product line from the name
  "Antrique" alone (rejected — "Antrique" phonetically suggesting
  antiques/jewelry is not a documented fact anywhere in this repo, and
  building on an unstated guess is worse than building generically and
  saying so).
- **Affects:** `apps/api/prisma/schema.prisma` (Catalog section),
  `apps/api/prisma/seed.ts` (example categories/collections/products),
  `apps/api/src/modules/catalog/README.md`.

## 2026-07-20 — Milestone 5: catalog RBAC uses `PermissionsGuard` exclusively, not `RolesGuard`
- **Decision:** All 15 catalog endpoints (5 CRUD ops × 3 resources) use
  `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@Permissions(...)` —
  never `RolesGuard`/`@Roles(...)`, despite this milestone's own
  requirement naming both ("Use the existing RolesGuard and
  PermissionsGuard").
- **Why:** the brief's own read/write/delete tiers ("Customer+" read,
  "Manager+" write, "Admin"/"Super Admin" delete) map exactly onto
  `{resource}:read`/`{resource}:write`/`{resource}:delete` permission
  keys — the same `resource:action` convention every other seeded
  permission in this catalog already follows (`projects:read`,
  `leads:write`, etc.), and the one `RolesGuard`/`PermissionsGuard`
  already both existed to support (Milestone 3). Using
  `PermissionsGuard` with 9 new permission keys, granted to the
  appropriate roles once in `prisma/seed.ts`, is materially cleaner than
  hardcoding three different role-name lists
  (`['customer','manager','admin','super_admin']`,
  `['manager','admin','super_admin']`, `['admin','super_admin']`) across
  nine controller methods spread across three controllers — one grant
  table in seed data versus nine repeated literal arrays in code. "Use
  the existing RolesGuard and PermissionsGuard" is read as "these two
  mechanisms already exist, use whichever fits" (as Milestone 3's own
  design already treated the two guards as interchangeable, general-
  purpose tools), not "every route must use exactly one of each."
- **Alternatives:** `RolesGuard` with the three literal role-lists above
  (rejected — see "Why"; also more brittle: adding a fifth RBAC tier
  later means updating nine `@Roles()` call sites instead of one seed
  grant); both guards stacked on every route (rejected — `RolesGuard`
  would have nothing to check the routes for, since no role-specific
  behavior beyond what the permission grants already express exists in
  this milestone; stacking an always-passing guard adds a
  `RoleRepository` query with no informational payoff).
- **Affects:** `apps/api/src/modules/catalog/{category,collection,product}.controller.ts`,
  `apps/api/src/modules/auth/constants/permission.constant.ts` (9 new
  keys), `apps/api/prisma/seed.ts` (9 new permissions, updated
  `manager`/`customer` grants).

## 2026-07-20 — Milestone 5: `ProductVariant`/`ProductImage` get no repository or controller of their own
- **Decision:** Only `CategoryRepository`/`CollectionRepository`/
  `ProductRepository` exist (matching this milestone's own "Repository
  Layer: Implement: CategoryRepository, CollectionRepository,
  ProductRepository" literally). `ProductVariant`/`ProductImage` rows are
  written exclusively as Prisma nested `create`s under `POST /products`
  — no `PUT`/`PATCH`/`DELETE` for an individual variant or image exists,
  and `PATCH /products/:id` cannot add, remove, or edit either.
- **Why:** the brief's own "Controllers: Create REST APIs for:
  Categories... Collections... Products" lists exactly three resources
  with independent REST surfaces; variants/images are listed only under
  "Core entities" and "Relationships" (`Product → Variants`,
  `Product → Images`), the same one-to-many, owned-by-parent framing
  `QuotationItem`/`InvoiceItem` already have relative to
  `Quotation`/`Invoice` in this schema — line items, not independent
  resources. Building standalone variant/image CRUD now would be
  speculative scope this milestone's brief never asked for (and its own
  "Do NOT Implement" list's silence on variant/image management isn't an
  oversight — the brief's own entity/relationship framing already
  answers it).
- **Alternatives:** add `ProductVariantController`/`ProductImageController`
  with their own repositories (rejected — not asked for, and "no
  business logic inside repositories"/thin-controller discipline doesn't
  change the fact that this is unrequested surface area); allow
  `PATCH /products/:id` to replace the variant/image arrays wholesale
  (considered — but reconciling a partial-update array replacement
  correctly, with soft-delete-aware diffing against the existing set,
  is real, non-trivial complexity for a capability nothing in the brief
  asked for; deferred to whichever future milestone actually needs
  variant/image editing).
- **Affects:** `apps/api/prisma/schema.prisma` (`ProductVariant`/
  `ProductImage` — no soft-delete/version columns, matching
  `QuotationItem`/`InvoiceItem`'s existing precedent),
  `apps/api/src/modules/catalog/product.service.ts` (variants/images set
  only at creation).

## 2026-07-20 — Milestone 5: `ProductService` validates `categoryId`/`collectionId` belong to the caller's own tenant before allowing the reference
- **Decision:** `ProductService.create()`/`update()` both call a private
  `assertReferencesBelongToTenant()` — for any client-supplied
  `categoryId`/`collectionId`, verifies
  `CategoryRepository.findActiveById(categoryId, tenantId)`/
  `CollectionRepository.findActiveById(collectionId, tenantId)` returns a
  real row before allowing the Product to reference it, throwing
  `BadRequestException` otherwise.
- **Why:** without this check, a client could pass ANY real category's
  UUID — including one belonging to a completely different tenant — and
  Postgres's own FK constraint would accept it silently: a foreign key
  only requires the referenced row to exist somewhere in the table, not
  that it belongs to the same tenant as the referencing row. This is a
  genuine cross-tenant reference leak, exactly the class of bug this
  milestone's own "Tenant Isolation: Never trust client-supplied tenant
  identifiers" requirement warns against — extended here from the
  obvious case (a literal tenant id) to the less obvious one (a
  client-supplied *foreign* id whose tenant ownership isn't otherwise
  checked anywhere in the write path). Confirmed live: a syntactically
  valid but nonexistent-for-this-tenant `categoryId` is rejected with a
  clean `400`, never reaching the database.
- **Alternatives:** rely on the FK constraint alone (rejected — see
  "Why," this is the actual bug being prevented); validate only on
  `create()`, not `update()` (rejected — `PATCH /products/:id` can also
  change `categoryId`/`collectionId`, so the same leak is reachable
  through the update path if only creation were checked).
- **Affects:** `apps/api/src/modules/catalog/product.service.ts`.

## 2026-07-20 — Milestone 5: `createdBy`/`updatedBy`/`deletedBy` left unpopulated across the entire catalog module — known gap, not an oversight
- **Decision:** Every `create()`/`update()`/soft-delete in
  `CategoryService`/`CollectionService`/`ProductService` leaves the
  nullable `createdBy`/`updatedBy`/`deletedBy` audit columns unset
  (`null`).
- **Why:** `RequestUser` (Milestone 2, unchanged since) is deliberately
  `{ email }` only — there is no `userId` anywhere in the request
  pipeline to populate these columns with. The only way to get one would
  be an extra database query per write (resolve the caller's `User.id`
  from their email, e.g. via `AuthRepository`), purely to fill an
  optional audit column — a real cost for a capability this milestone's
  own brief never asked for. This is the same category of decision as
  Milestone 3/4's "resolve by email, not userId" choices: avoid touching
  already-approved, already-tested identity infrastructure
  (`RequestUser`/`AuthTokenPayload`) for a need that isn't this
  milestone's own scope.
- **Alternatives:** extend `RequestUser` with a `userId` field now
  (rejected — reopens a boundary two prior milestones deliberately left
  alone, for a need — audit-column population — this milestone's own
  brief doesn't list); resolve the user by email on every write
  (rejected — real, avoidable per-write query cost for an optional
  column, and the resolved id still wouldn't be cached/reused across a
  request the way `TenantContext`/`AuthorizationCache` are, since no
  such mechanism exists for this yet).
- **Affects:** `apps/api/src/modules/catalog/{category,collection,product}.service.ts`.
  Flagged as a known gap in `apps/api/src/modules/catalog/README.md` for
  visibility, not silently left undocumented.

## 2026-07-20 — Milestone 5: `BaseRepository` gained `count()`; `include`-passing repository methods must bypass the inherited generic `create()`/`update()`
- **Decision:** Added `count(...args)` to `BaseRepository` (mirroring
  `findMany()`'s exact shape) and to the underlying `CrudDelegate` type
  constraint. Separately, `ProductRepository` does NOT route its
  relation-including create/update through `BaseRepository`'s inherited
  `create()`/`update()` — it defines its own `createWithRelations()`/
  `updateWithRelations()`, each calling `this.delegate.create(...)`/
  `this.delegate.update(...)` directly with a literal, inline args
  object.
- **Why:** `count()` — `CategoryRepository`/`CollectionRepository`/
  `ProductRepository` all needed a paginated-list total count
  simultaneously; a genuine, multi-repository need, the same
  "second/third real consumer" trigger this project's own discipline
  already uses to justify extending shared infrastructure, not
  anticipation. The `include` bypass — `BaseRepository`'s inherited
  methods are typed via `Parameters<TDelegate['create']>`/
  `ReturnType<TDelegate['create']>`, a type-level operation on a
  still-generic Prisma method signature; TypeScript cannot resolve that
  against a *specific* call's `include` argument, so the return type
  silently collapses to the relation-less default shape. Confirmed live,
  not assumed: `pnpm typecheck` showed `product.variants`/
  `product.images` genuinely didn't exist on the type returned by the
  inherited `create()`, despite existing at runtime (the actual Prisma
  call, with `include`, does return them). A plain method that calls
  `this.delegate.create({ data, include })` inline, as an actual call
  expression rather than a `ReturnType<>` trick, lets TypeScript's normal
  generic inference work correctly.
- **Alternatives:** cast the inherited `create()`'s result with `as`
  (rejected — silences the compiler instead of fixing the actual type
  gap, and provides no protection if the `include` shape ever changes);
  give `BaseRepository` a generic `createWithInclude()` abstraction
  (rejected — the number of ways `include` can shape a return type
  varies per model/relation, and `ProductRepository` is the only
  consumer so far; a shared abstraction now would be solving a problem
  with only one real instance, the same anticipation this project's
  discipline avoids elsewhere).
- **Affects:** `apps/api/src/database/base.repository.ts` (+ spec),
  `apps/api/src/modules/catalog/repositories/product.repository.ts`.
  Documented as a standing lesson in
  `docs/architecture/domain-module-guide.md` §16 for any future
  repository needing `include`/`select`.

## 2026-07-20 — Milestone 5: added `reflect-metadata` to Jest's `setupFiles` — a real, latent gap, not new breakage
- **Decision:** Added `"setupFiles": ["reflect-metadata"]` to
  `apps/api/package.json`'s `jest` config.
- **Why:** `class-transformer`'s `@Type()` decorator (used by the new
  `PaginationQueryDto` and `CreateProductDto`'s nested
  `variants`/`images` validation) calls `Reflect.getMetadata` at class-
  decoration time, which only exists once the `reflect-metadata` package
  polyfills it globally — normally implicit in a running NestJS app
  (pulled in transitively at bootstrap), but never loaded when Jest runs
  a single `.spec.ts` file in isolation without going through `main.ts`.
  This gap existed from the very first DTO in this codebase; it simply
  never surfaced because no DTO used `@Type()` before this milestone's
  `PaginationQueryDto`/nested product validation. `setupFiles` is Jest's
  documented mechanism for exactly this — a module to `require()` once
  before the test framework itself initializes, before any decorated
  class is ever imported.
- **Alternatives:** import `'reflect-metadata'` manually at the top of
  every affected `.spec.ts` file (rejected — fragile, easy to forget on
  the next new `@Type()`-using DTO, and duplicates a concern that's
  genuinely global to the whole test run); avoid `@Type()` entirely,
  e.g. hand-rolling number coercion in each query DTO (rejected — reruns
  into the exact problem `@Type()` exists to solve cleanly, for every
  future paginated/nested DTO, not just this milestone's).
- **Affects:** `apps/api/package.json` (`jest.setupFiles`) — a genuine,
  global test-infrastructure fix, not scoped to the catalog module
  alone.

## 2026-07-20 — Milestone 4: `OrganizationRepository` wraps the existing `Tenant` model — no new schema entity
- **Decision:** `apps/api/src/tenant/repositories/organization.repository.ts`'s
  `OrganizationRepository extends BaseRepository<PrismaService['tenant']>`.
  No `Organization` table was added to `schema.prisma`, and no
  `User`-to-`Organization` many-to-many membership table was added either
  — `findActiveByEmail`'s existing tenant-scoped `WHERE tenantId = X`
  filter is treated as satisfying "user organization membership"/"active
  membership validation" in full.
- **Why:** `schema.prisma` (Phase 1.1A) already models exactly what this
  milestone's brief calls "Organization" — the platform's own
  multi-tenancy isolation boundary — as `Tenant`; there is no gap to
  fill. The brief's own "Do NOT Implement: Organization CRUD" and
  "Tenant creation API" both confirm nothing new should be built here,
  only a real *resolver* on top of what exists — the identical situation
  Milestone 3 found with `Role`/`Permission`/`UserRole`/`RolePermission`
  already existing in full. Separately, `User.tenantId` is a direct,
  required foreign key (one tenant per user), not a join table — the
  schema's existing single-tenant-per-user design, unchanged by this
  milestone (multi-tenant *membership*, i.e. one user belonging to
  several organizations, was never asked for and isn't implied by
  "Organization & Multi-Tenant Foundation" — that phrase describes
  *platform* multi-tenancy, the existing `Tenant` concept, not a
  multi-org-per-user feature).
- **Alternatives:** add a first-class `Organization` table distinct from
  `Tenant` (rejected — would create two parallel isolation concepts with
  no clear boundary between them, and directly contradicts "Do NOT
  Implement: Organization CRUD"); add a `UserOrganization` many-to-many
  join table for "membership" (rejected — no product requirement for a
  user to belong to more than one tenant exists anywhere in this
  codebase's docs, and building one speculatively is exactly the
  premature-structure pattern this project's standing discipline argues
  against).
- **Affects:** `apps/api/src/tenant/repositories/organization.repository.ts`
  only. No schema change, no migration.

## 2026-07-20 — Milestone 4: hostname resolution matches subdomain against the existing `Tenant.slug` — no new schema column
- **Decision:** `TenantResolver`'s hostname priority extracts the
  leftmost label of a ≥3-label, non-IP hostname
  (`extractHostnameSlugCandidate()`) and looks it up against `Tenant.slug`
  — the same column `prisma/seed.ts` already uses as each tenant's unique
  identifier. No `domain`/`hostname` column was added to `Tenant`.
- **Why:** the brief's own wording — "Organization domain / hostname (if
  configured)" — reads as "resolve via hostname when the hostname looks
  like one," not "add a dedicated domain-mapping feature." `Tenant.slug`
  already serves as this app's human-readable tenant identifier; treating
  a subdomain label as a slug candidate is the standard, minimal-schema
  way to support hostname-based resolution (`acme.antrique.app` → `acme`)
  without inventing new schema surface for a feature this milestone's own
  "Do NOT Implement" list (`Tenant creation API`) suggests isn't ready for
  real domain management yet. A hostname that doesn't look like a
  subdomain (`localhost`, a bare IP, a 2-label apex domain) simply
  produces no candidate and this priority is skipped — no separate
  feature flag needed to express "not configured."
- **Alternatives:** add a `domain`/`hostname` column to `Tenant` and match
  on it directly (rejected — a real schema change for a feature with no
  current UI/API to manage it, and no seed data or requirement asking for
  literal custom-domain support yet; revisit if a future milestone
  actually needs distinct custom domains per tenant, not slug-derived
  subdomains); skip hostname resolution entirely, header-only (rejected —
  the brief explicitly lists hostname as priority 1, and the subdomain-
  matching approach costs nothing extra to implement against the existing
  `slug` column).
- **Affects:** `apps/api/src/tenant/tenant-resolver.service.ts` only. No
  schema change, no migration.

## 2026-07-20 — Milestone 4: `DEFAULT_TENANT_ID` fallback gated strictly on `nodeEnv === 'development'` (not `!== 'production'`)
- **Decision:** `TenantResolver` only attempts the `DEFAULT_TENANT_ID`
  fallback when the injected `appConfig.nodeEnv` is exactly
  `'development'`. A `test`-environment request that resolves nothing via
  hostname/header gets the same `BadRequestException` a `production`
  request would — no fallback, not even for automated testing.
- **Why:** this milestone's own validation requirement is worded exactly
  this way — "DEFAULT_TENANT_ID fallback works only in development" — and
  the safety property being protected (no silent cross-tenant default,
  ever, outside a developer's own local machine) is stronger under an
  allowlist (`=== 'development'`) than a denylist (`!== 'production'`):
  the denylist form would silently permit the fallback in `test` too,
  which is a real, plausible-to-add-later environment (CI, staging smoke
  tests) that should NOT inherit a convenience meant for a single
  developer's local box. Confirmed live in both directions: development
  mode with no hints resolves via the fallback; production mode with no
  hints returns a clean `400` (`{"message":"Tenant could not be
  resolved",...}`), routed correctly through Nest's exception-filter
  pipeline, not a hang.
- **Alternatives:** gate on `nodeEnv !== 'production'` (rejected — silently
  includes `test`, weakening the safety property for no benefit: nothing
  in this codebase's test suites relies on the fallback, since
  `TenantResolver`'s own spec constructs fake config objects directly
  rather than depending on process-level `NODE_ENV`); make the fallback
  configurable via a separate env flag (rejected — adds configuration
  surface for a behavior the brief already specifies unambiguously by
  environment name, no genuine flexibility need identified).
- **Affects:** `apps/api/src/tenant/tenant-resolver.service.ts` only.

## 2026-07-20 — Milestone 4: `TenantMiddleware` registered via `NestModule.configure()`, not `main.ts`'s raw `app.use()` — the opposite choice from `HttpLoggingMiddleware`
- **Decision:** `TenantModule` implements `NestModule` and registers
  `TenantMiddleware` itself, via `consumer.apply(TenantMiddleware)
  .forRoutes('*')` inside its own `configure()` — not attached in
  `main.ts` via `app.get()` + raw `app.use()`, the pattern
  `HttpLoggingMiddleware` (Phase 1.2C.5) established and this milestone
  could have mechanically copied.
- **Why:** the two middlewares have different needs, and `main.ts`'s own
  comment on `HttpLoggingMiddleware` already documents why THAT one uses
  raw `app.use()`: `MiddlewareConsumer.forRoutes('*')`-registered
  middleware is scoped to `app.setGlobalPrefix()`'s `/api` prefix
  (confirmed by that phase's own direct testing), which would have
  silently skipped a future unprefixed route like `/health` — unacceptable
  for a middleware whose whole point is "log every request, prefix or
  not." `TenantMiddleware` has the opposite profile: it's an inherently
  API-scoped concern (every current and realistically future route lives
  under `/api`) with no unprefixed consumer to miss, AND it needs to
  `throw` a `BadRequestException` that reaches Nest's own
  `ExceptionLoggingFilter`/exception-handling pipeline to produce a clean
  `400` response — a property `MiddlewareConsumer`-registered middleware
  has (it's part of Nest's own request-handling setup) that was not
  independently re-verified for raw `app.use()` middleware attached
  outside that pipeline. Rather than assume either mechanism's error-
  handling behavior, this was checked live: booted with
  `NODE_ENV=production` and no hostname/header hint, confirmed the
  response was clean JSON
  (`{"message":"Tenant could not be resolved","error":"Bad
  Request","statusCode":400}`) and that `ExceptionLoggingFilter` genuinely
  logged it (same `requestId`/`correlationId` as the completion log) —
  not a guess, a captured result.
- **Alternatives:** copy `HttpLoggingMiddleware`'s raw `app.use()` pattern
  for consistency (rejected — would have required separately verifying
  that a thrown `HttpException` from middleware attached outside Nest's
  `MiddlewareConsumer` pipeline still reaches `ExceptionLoggingFilter`;
  untested and not obviously true, and the prefix-scoping downside that
  pattern exists to avoid doesn't apply here); make `TenantMiddleware`
  never throw and instead attach an "unresolved" sentinel to
  `request.tenantContext` for each consumer to check (rejected — pushes
  the same check into every future route/guard individually, the exact
  kind of repeated, easy-to-forget defensive code centralizing resolution
  in one middleware is meant to avoid).
- **Affects:** `apps/api/src/tenant/tenant.module.ts`,
  `apps/api/src/tenant/middleware/tenant.middleware.ts`.

## 2026-07-20 — Milestone 4: relocated `default-tenant.config.ts` again, superseding Milestone 3's "don't relocate" decision
- **Decision:** Moved `default-tenant.config.ts` from
  `modules/auth/config/` to `apps/api/src/tenant/config/`, and changed
  `AuthRepository`/`RoleRepository`/`PermissionRepository` to take
  `tenantId` as a plain method parameter instead of injecting this config
  directly.
- **Why:** Milestone 3's own decision record explicitly declined to
  relocate this file when `RoleRepository`/`PermissionRepository` became
  a second consumer, reasoning that two modules sharing one
  `ConfigModule.forFeature()` factory was normal and relocating for two
  would be premature churn. This milestone removes that reasoning's own
  premise: none of the three repositories inject this config anymore
  (they take `tenantId` as an argument instead), so the file's only
  remaining consumer is `TenantResolver`'s development-only fallback — a
  genuine, single, non-cosmetic owner, which is exactly the trigger
  Milestone 3's own record named ("relocating... was... rejected as
  unnecessary churn... for a purely cosmetic gain" — the gain is no
  longer cosmetic once the sharing arrangement that justified keeping it
  in place is gone). This entry exists specifically so a future reader
  comparing Milestone 3's and Milestone 4's decision records sees the
  supersession explained, not an unexplained reversal.
- **Alternatives:** leave the file in `modules/auth/config/` and have
  `tenant/` import it from there (rejected — `modules/auth/` no longer
  has any real claim to owning this value once its own repository stops
  consuming it; leaving it there would misattribute ownership to a module
  that no longer uses it).
- **Affects:** `apps/api/src/tenant/config/default-tenant.config.ts`
  (new location), `apps/api/src/modules/auth/config/` (removed, now
  empty/deleted), `apps/api/src/modules/auth/auth.module.ts`,
  `apps/api/src/authorization/authorization.module.ts`.

## 2026-07-20 — Milestone 3: AuthorizationService resolves roles/permissions by email, not a new `userId` JWT claim
- **Decision:** `RoleRepository.findRolesForUser(email)` resolves a
  user's roles directly from `request.user.email` via a single Prisma
  query with a nested relation filter (`Role → UserRole → User`), rather
  than adding a `userId`/`sub` claim to `AuthTokenPayload`/`RequestUser`
  and having `JwtAuthGuard` carry it through.
- **Why:** every other option touches already-approved, already-tested
  token infrastructure spanning multiple prior milestones —
  `AuthTokenPayload`, `login()`, `refresh()`, `RequestUser`, and
  `JwtAuthGuard` itself would all need a coordinated change to add and
  thread a new identifier, for a milestone whose brief is scoped to
  roles/permissions, not the token shape. Resolving by email keeps
  `POST /auth/login`/`/refresh`/`/logout` genuinely unchanged (confirmed
  via `find -newer`), which several of this milestone's own requirements
  explicitly call for ("Keep existing authentication endpoints
  unchanged"). The cost is one extra database round trip per
  RBAC-guarded request (resolving email → roles) that a pre-resolved
  `userId` in the token would have skipped — accepted as a one-query cost
  against a real, indexed column, mitigated further by the per-request
  cache (see the next entry), not a correctness or security concern.
- **Alternatives:** add `userId` to `AuthTokenPayload`/`RequestUser` and
  re-sign it into every future token (rejected — reopens Milestone 2's
  explicit "Do not introduce roles, permissions, tenant, or profile
  fields yet" boundary further than this milestone's own scope requires,
  and touches `login()`/`refresh()`, which this milestone's Requirements
  section explicitly says to leave alone); have `AuthorizationService`
  first call `AuthRepository.findActiveByEmail()` (already exists) to
  get a `userId`, then query roles by id (rejected — `AuthRepository` is
  a private, unexported provider of `AuthModule`; making a second,
  unrelated top-level module reach into it would require exporting it
  purely for this, a heavier cross-module coupling the single nested-
  relation query avoids entirely by not needing a `userId` in the first
  place).
- **Affects:** `apps/api/src/authorization/repositories/role.repository.ts`,
  `apps/api/src/authorization/authorization.service.ts`. Does NOT affect
  `apps/api/src/modules/auth/` (genuinely untouched) or
  `apps/api/src/types/request-user.type.ts` (genuinely untouched).

## 2026-07-20 — Milestone 3: request-scoped authorization cache lives on `request.authorizationCache`, not as `AuthorizationService` instance state
- **Decision:** `AuthorizationService` is a stateless singleton (Nest's
  default scope, no `Scope.REQUEST`). "Cache permission resolution within
  a request only, no Redis or external cache" is implemented by every
  method accepting the *caller's* `AuthorizationCache` object
  (`apps/api/src/types/authorization-cache.type.ts`) and mutating it in
  place; `RolesGuard`/`PermissionsGuard` create
  `request.authorizationCache ??= {}` on first use and pass it in.
- **Why:** a singleton service cannot safely hold "per-request" data as
  its own instance field — that field is shared across every concurrent
  request the whole app serves, so caching one caller's resolved
  roles/permissions there would leak them into a different, unrelated
  request racing it. Two ways to get genuine per-request isolation exist
  in Nest: `Scope.REQUEST` providers (a new instance per request, real
  isolation, but cascades — every provider that depends on a
  request-scoped provider becomes request-scoped too, and can't be
  resolved eagerly at bootstrap) or storing the cache on the `request`
  object itself (already proven safe and simple by `RequestUser` on
  `request.user`, Milestone 2). The second option was chosen: it's
  simpler, has no DI-scope cascading cost, and mirrors an already-
  established, already-working pattern in this exact codebase rather than
  introducing a new mechanism.
- **Alternatives:** `Scope.REQUEST` on `AuthorizationService` (rejected —
  real isolation, but adds DI complexity/performance cost with no benefit
  over the simpler request-object approach for this app's scale); no
  caching at all, re-querying on every `resolveRoleKeys()`/
  `resolvePermissionKeys()` call (rejected — a single route stacking both
  `RolesGuard` and `PermissionsGuard` would query the user's roles twice
  in one request for no reason; this milestone's own requirement
  explicitly asks for request-scoped caching).
- **Affects:** `apps/api/src/authorization/authorization.service.ts`,
  `apps/api/src/types/authorization-cache.type.ts`,
  `apps/api/src/common/guards/roles.guard.ts`,
  `apps/api/src/common/guards/permissions.guard.ts`.

## 2026-07-20 — Milestone 3: seed roles reconciled additively — brief's requested names added alongside the existing ones, not renamed/removed
- **Decision:** `prisma/seed.ts` gained `super_admin` (full grant set,
  same as `admin`), `manager` (same grants as `project_manager`), and
  `customer` (same grants as `client`) as new roles; `admin`'s display
  `name` changed from "Administrator" to "Admin" (same `key`, so this
  updates the existing row, not a new one). The pre-existing
  `project_manager`, `sales`, and `client` roles are untouched — not
  renamed, not removed, not merged.
- **Why:** the brief asked to "update seed data with: Super Admin, Admin,
  Manager, Customer," but the already-seeded roles used different key
  names (`project_manager`, `sales`, `client`) reflecting this agency's
  actual business domain, seeded before this milestone's RBAC-naming
  request existed. Renaming an existing `Role.key` (not just its display
  `name`) is a real key change — anyone who already ran the old seed
  script (including this environment's own dev database) would have a
  `project_manager`/`client` row the new seed script would never touch
  again if the `ROLES` array's key changed out from under it, silently
  orphaning it rather than updating it, since the seed script's
  find-then-update logic keys off `Role.key` exactly. Since nothing in
  this codebase referenced those specific key strings programmatically
  before this milestone (RBAC enforcement didn't exist until now), adding
  the four requested names alongside the existing ones costs nothing and
  carries zero risk of orphaning data a developer might already be
  depending on; `sales` (not one of the four requested names) is likewise
  left alone since the brief's own wording reads as "these four must
  exist," not "only these four may exist."
- **Alternatives:** rename `project_manager` → `manager` and `client` →
  `customer` in place (rejected — a real `Role.key` change the seed
  script's own find-then-update logic can't safely reconcile against an
  already-seeded database without either an explicit migration-like
  cleanup step or accepting silent orphaned rows; not worth the risk for
  seed/dev-only data); ask the user to clarify the exact intended mapping
  before proceeding (considered — but this is low-stakes, easily-reversed
  dev seed data with a clearly reasoned, low-risk resolution available,
  unlike Milestone 1's two genuine architectural conflicts, which
  involved non-negotiable rules and an unmodeled schema field and
  genuinely warranted pausing to ask).
- **Affects:** `apps/api/prisma/seed.ts` only. No schema change, no
  migration.

## 2026-07-20 — Milestone 2: JwtAuthGuard applied per-route via `@UseGuards()`, not globally via `APP_GUARD`
- **Decision:** `JwtAuthGuard` protects `GET /example/ping` via
  `@UseGuards(JwtAuthGuard)` on that one method. It is not registered as
  a global guard (`{ provide: APP_GUARD, useClass: JwtAuthGuard }`), and
  no `@Public()`/exemption decorator was built.
- **Why:** a global guard would require every existing route —
  `POST /auth/login`, `/refresh`, `/logout` — to explicitly opt out via
  some exemption mechanism, which doesn't exist and wasn't asked for;
  building one just to immediately exempt 100% of this codebase's
  existing routes would be solving a problem this milestone doesn't have
  yet. Per-route `@UseGuards()` keeps the change surface exactly as large
  as the brief's own ask ("protect one example endpoint"), and matches
  this project's standing discipline against speculative infrastructure
  (see `example-domain/`'s own "registered but unwired" precedent, and
  `domain-module-guide.md`'s rejection of a `CommonModule` "until a
  second real domain module needs to share something concrete").
- **Alternatives:** global `APP_GUARD` registration plus a `@Public()`
  decorator to exempt `auth/`'s own routes (rejected — the brief didn't
  ask for a global default-protected posture, and inventing an exemption
  mechanism to immediately use it on every existing route the moment it's
  built is backwards); global `APP_GUARD` with `auth/` importing
  `JwtAuthGuard`'s module and manually excluding its own routes some
  other way (rejected — Nest has no clean per-route "exclude from a
  global guard" primitive short of `@Public()`-style metadata, which is
  the same rejected option in different clothing).
- **Affects:** `apps/api/src/modules/example-domain/example-domain.controller.ts`
  only — no `app.module.ts` change, no new decorator beyond `CurrentUser`.

## 2026-07-20 — Milestone 2: RequestUser is a separate declaration from AuthTokenPayload, not a shared import
- **Decision:** `apps/api/src/types/request-user.type.ts`'s
  `RequestUser` (`{ email: string }`) and
  `apps/api/src/modules/auth/types/auth-token-payload.type.ts`'s
  `AuthTokenPayload` (also `{ email: string }`) are two independent
  interface declarations, not one type imported into both places.
  `JwtAuthGuard` calls `tokenService.verifyAccessToken<RequestUser>()`
  directly, never importing anything from `modules/auth/`.
- **Why:** the two types describe different contracts that happen to
  match today: `AuthTokenPayload` is what `modules/auth/`'s `login()`/
  `refresh()` sign into a token (owned by the auth domain module);
  `RequestUser` is what a guard in `common/` exposes to any controller in
  any module (owned by the cross-cutting HTTP layer). Importing
  `AuthTokenPayload` into `common/guards/` would create a dependency from
  cross-cutting infrastructure onto one specific business module — the
  wrong direction, since `common/` is supposed to be depended *on*, not
  depend on a domain module itself. The duplication is small (one field)
  and deliberate, not an oversight; if the two shapes diverge later
  (e.g. a JWT claim that shouldn't leak into `RequestUser`), the
  separation already exists to make that easy.
- **Alternatives:** moving `AuthTokenPayload` itself into
  `apps/api/src/types/` so both `modules/auth/` and `common/guards/`
  import the same declaration (rejected — conflates "what a token
  contains" with "what a guard exposes," and would need modules/auth/'s
  own mapper functions to import from a location that isn't really
  "auth's own" anymore, a bigger structural change than this milestone's
  brief asked for).
- **Affects:** `apps/api/src/types/request-user.type.ts`,
  `apps/api/src/common/guards/jwt-auth.guard.ts`.

## 2026-07-20 — Milestone 1: added `User.passwordHash`, establishing local password auth alongside the existing IdP-only design — user-confirmed before implementation
- **Decision:** Added a nullable `passwordHash String?` column to `User`
  and made the existing `idpSubject` nullable too (was required). Both
  are optional, independent credential paths — a `User` may have either,
  neither is validated as "at least one required" at the schema level.
  New migration `20260720095236_add_password_hash_to_users`,
  hand-written rather than applying `prisma migrate dev`'s raw
  auto-generated diff verbatim.
- **Why:** the milestone's brief explicitly asked to "Verify Argon2
  password using PasswordService" against a real `User` lookup, but
  `schema.prisma`'s `User` model had no password field at all, and both
  its own doc comment and `docs/architecture/security.md`'s "Auth" line
  said credential exchange lives entirely with a managed IdP — a genuine
  architectural conflict between the brief and the already-established,
  documented security architecture, not something to resolve by
  guessing. Presented to the user as an explicit choice (add
  `passwordHash` to `User`; add a separate `Credential`/local-auth side
  table instead; or stop and rescope) before writing any code — the user
  chose adding it to `User` directly. `security.md`'s "Auth" line was
  updated to document both paths (managed IdP OR local password) rather
  than silently becoming inaccurate.
- **Alternatives:** a separate `Credential`/`LocalCredential` table
  (considered, not chosen — the user's explicit call, not a technical
  rejection); stubbing password verification against a schema that
  doesn't support it (rejected outright — would mean either faking
  verification or lying about what the code does, both against this
  arc's established discipline).
- **Affects:** `apps/api/prisma/{schema.prisma,
  migrations/20260720095236_add_password_hash_to_users/}`,
  `docs/architecture/{security.md, database-schema.md, backend.md}`,
  `apps/api/src/modules/auth/README.md`.

## 2026-07-20 — Milestone 1: Prisma's auto-diff proposed re-adding a plain unique index that would have collided with the existing partial index — caught and dropped before applying
- **Decision:** The migration SQL actually applied contains only the two
  genuine schema changes (`ADD COLUMN password_hash`,
  `ALTER COLUMN idp_subject DROP NOT NULL`). `prisma migrate diff`'s raw
  output also included `CREATE UNIQUE INDEX "users_tenant_id_email_key"
  ON "users"("tenant_id", "email")` — a plain, non-partial index sharing
  the exact name of the case-insensitive PARTIAL unique index
  (`WHERE deleted_at IS NULL`) the `20260717090500_partial_unique_indexes`
  migration already created. That statement was identified and dropped
  before the migration file was written, not applied and rolled back.
- **Why:** this is the exact, previously-documented landmine —
  `20260717090500_partial_unique_indexes`'s own header comment
  explicitly warns: "`prisma migrate dev` may propose a diff that tries
  to 'fix' these back to plain unique indexes on some future unrelated
  schema change touching these tables — expected, review and drop that
  part of the generated diff before applying." Applying it verbatim
  would have either failed outright (duplicate index name) or, if it
  had somehow succeeded, silently reintroduced the bug the partial index
  exists to prevent (a soft-deleted user's email permanently blocking
  reuse). `prisma migrate dev` itself couldn't run non-interactively in
  this environment, which forced going through `prisma migrate diff`
  manually instead of the normal interactive flow — turned out to be the
  right path anyway, since it made inspecting the raw diff before
  applying anything unavoidable rather than optional.
- **Alternatives:** running `prisma migrate dev` and accepting whatever
  it generated (rejected — not available non-interactively here, and
  the whole point of the prior migration's warning comment is that this
  exact diff needs a human review, not blind trust); `prisma db push`
  (rejected — bypasses the migration history this project maintains
  deliberately).
- **Affects:** `apps/api/prisma/migrations/20260720095236_add_password_hash_to_users/migration.sql`.

## 2026-07-20 — Milestone 1: login() tenant-scoped via a required, seed-matched `DEFAULT_TENANT_ID` stopgap — user-confirmed before implementation
- **Decision:** Added `DEFAULT_TENANT_ID` (required, validated as a
  UUID, no default) and a new `defaultTenant` config namespace
  (`apps/api/src/modules/auth/config/default-tenant.config.ts`,
  graduated via `ConfigModule.forFeature()` the same way `jwt`/`hash`
  were). `AuthRepository.findActiveByEmail()` scopes its query to
  `defaultTenant.id`. Set to `00000000-0000-7000-8000-000000000001` in
  `.env`/`.env.example` — the same fixed ID `prisma/seed.ts` has used
  for the "antrique" tenant since Phase 1.1B.
- **Why:** the milestone's brief excluded "Multi-tenancy," but
  CLAUDE.md's non-negotiable "tenant scope on EVERY query" rule still
  applies to any query against `User` (a multi-tenant table) — the same
  rule Phase 1.2D.4's review already enforced by removing an unscoped
  query rather than let one ship. No subdomain/header-based
  tenant-resolution mechanism exists anywhere in this app, and building
  one would itself be exactly the "Multi-tenancy" feature work the brief
  excludes. Presented to the user as an explicit choice (scope to one
  seeded default tenant; query without tenant scoping — flagged as a
  non-negotiable-rule violation; or stop and rescope) before writing any
  code — the user chose the seeded-default-tenant stopgap. This
  satisfies the rule honestly (the query genuinely is tenant-scoped)
  without pretending real multi-tenant switching exists.
- **Alternatives:** querying without a `tenantId` filter (rejected — a
  direct, acknowledged violation of a non-negotiable project rule, not
  a judgment call); building real subdomain/header-based tenant
  resolution now (rejected — explicitly out of this milestone's scope,
  and a meaningfully larger feature than a login flow needs to unblock
  itself).
- **Affects:** `apps/api/src/config/env.validation.ts`,
  `apps/api/src/modules/auth/{config/default-tenant.config.ts,
  auth.module.ts, repositories/auth.repository.ts, README.md}`,
  `.env`/`.env.example`, `docs/architecture/{configuration.md,
  validation.md, backend.md}`.

## 2026-07-19 — Phase 1.2D.10 review: re-confirmed "document, don't add jti" after seriously weighing the strongest counter-argument
- **Decision:** Re-argued the implementation phase's "document
  same-second determinism, don't add a uniqueness claim" decision from
  scratch during review, rather than treating it as already settled,
  and reached the same conclusion for independently-checked reasons: no
  code or documentation change was needed.
- **Why:** the strongest case against the existing decision is that a
  future revocation/blacklist mechanism, if implemented naively by
  storing/matching raw token strings, could be confused by two
  legitimately-different issuances sharing identical bytes. Weighed
  seriously rather than dismissed — but it doesn't hold up: no
  revocation mechanism exists in this codebase yet to be confused by
  anything, so the risk is entirely hypothetical and belongs to a
  future phase's own design space, not this one's. That future phase
  will need to decide how it identifies "a token" for revocation
  purposes regardless of whether `jti` exists today — adding it now,
  speculatively, ahead of any concrete consumer, is exactly the kind of
  premature abstraction this project's standing discipline has
  consistently avoided (see `example-domain/`'s repositories, built
  with real CRUD methods but no speculative model-specific helpers
  until a genuine need exists). Independently re-verified the two load-
  bearing technical claims live, not on trust: wrote a fresh script
  against the actual built `TokenService` confirming same-instant signs
  are byte-identical, cross-second signs genuinely differ, and signing
  a decoded payload directly throws exactly the error the code comments
  claim.
- **Alternatives:** none new considered beyond what Phase 1.2D.9's
  review and Phase 1.2D.10's implementation already weighed (a `jti`
  claim, a nonce, a timestamp hack) — all remain rejected for the same
  reasons, now re-confirmed rather than assumed still valid.
- **Affects:** none — no files changed as a result of this review.

## 2026-07-19 — Phase 1.2D.10: rotation required zero production-code changes; the phase adds proof, not new behavior
- **Decision:** No change to `auth.service.ts`'s `refresh()` control
  flow, `mappers/auth-token-payload.mapper.ts`, or any DTO. The entire
  phase's deliverable is: comments in `auth.service.ts`/`auth/README.md`
  naming the existing behavior "stateless rotation" explicitly, plus new
  tests that prove properties the Phase 1.2D.9 implementation already
  had but never directly asserted (that `signAccessToken()`/
  `signRefreshToken()` are genuinely invoked rather than the input
  token being reused; that a used refresh token remains valid — no
  reuse detection; that a rotation chain of arbitrary length works; that
  same-second issuances are byte-identical while cross-second issuances
  genuinely differ).
- **Why:** "issue a fresh access + refresh pair on every successful
  refresh, never re-validate and hand back the same tokens" — the
  entire substance of "stateless rotation" as this brief defines it
  (explicitly excluding storage, revocation, blacklists, and reuse
  detection, all of which would require persistence) — is exactly what
  Phase 1.2D.9's `refresh()` already did from the moment it existed.
  Writing new production code to satisfy a requirement already met
  would be pure churn with no behavioral difference, and this project's
  standing discipline (see every prior phase's "registered but unwired"
  precedent, and Phase 1.2D.4's rejection of a query written only "to
  prove the DI chain") has consistently preferred proving an existing
  property directly over adding code whose only purpose is to be
  proved.
- **Alternatives:** renaming `reissueAuthTokenPayload()` to something
  like `rotateAuthTokenPayload()` for terminology alignment (considered,
  rejected — pure cosmetic churn across the function, its call site, and
  its tests, with the existing name and its extensive doc comment
  already describing exactly what it does and why; a rename doesn't
  make the behavior any more or less "rotation"); adding a `jti` claim
  to make same-second issuances distinguishable (explicitly forbidden by
  this phase's own brief, and rejected on the same grounds Phase
  1.2D.9's review already established — no current consumer needs the
  distinction, and it would grow the payload past the required minimal
  `{ email }`).
- **Affects:** `apps/api/src/modules/auth/{auth.service.ts,
  auth.service.spec.ts, mappers/auth-token-payload.mapper.ts,
  README.md}` (the mapper's only change was a comment, not behavior),
  `docs/architecture/backend.md`.

## 2026-07-19 — Phase 1.2D.9 review: same-second reissued tokens are byte-identical (HS256 determinism) — documented, not fixed
- **Decision:** During review, live-confirmed that two token issuances
  for the same email within the same wall-clock second (e.g. a login
  immediately followed by a refresh) produce byte-identical
  access/refresh tokens, then documented this in `auth.service.ts`'s
  `refresh()` comment and `auth/README.md` rather than changing any
  code to address it.
- **Why:** the cause is inherent to HS256 JWT signing (deterministic —
  identical header + payload + secret always yields the identical
  signature) combined with `iat`/`exp`'s second-level precision, not a
  bug in this implementation. It's also not currently harmful: this
  phase explicitly excludes revocation/rotation tracking, so nothing in
  the system currently relies on every issued token being distinct.
  Adding a uniqueness claim (`jti`) to prevent it would grow the JWT
  payload beyond the minimal `{ email }` this phase's brief requires
  verifying — fixing a non-problem at the cost of violating an explicit
  requirement would be the wrong trade. The right time to add `jti` is
  when a future phase actually builds revocation/rotation and needs to
  tell same-second issuances apart, not preemptively.
- **Alternatives:** adding a `jti` (UUID) claim now, "just in case"
  (rejected — speculative, violates the minimal-payload requirement,
  and no current consumer needs it); switching to a signing scheme with
  sub-second precision or a random nonce (rejected — `@nestjs/jwt`'s
  `sign()`/`verify()` API doesn't expose one, and hand-rolling a
  workaround around a well-tested library for a currently-harmless
  property would be over-engineering).
- **Affects:** `apps/api/src/modules/auth/{auth.service.ts, README.md}`
  (documentation only — no behavioral change).

## 2026-07-19 — Phase 1.2D.9: refresh() rejects all verification failures identically (single 401), no differentiated error messages
- **Decision:** `AuthService.refresh()` wraps
  `TokenService.verifyRefreshToken()` in one blanket `try`/`catch` that
  rethrows a plain `UnauthorizedException()` (no custom message) on any
  failure — an invalid signature, an expired token, a malformed token,
  and an access token submitted as a refresh token all produce the
  identical `401 { "message": "Unauthorized" }` response. No branch
  distinguishes *why* verification failed.
- **Why:** telling a caller specifically that a token is "expired" vs.
  "has an invalid signature" vs. "is malformed" hands an attacker
  probing the endpoint more information than a legitimate client needs —
  a legitimate client's own refresh token either verifies or it doesn't,
  and either way the correct client behavior is the same (re-authenticate
  via login). This also means an access token submitted as a refresh
  token needs no special-cased rejection: it fails
  `verifyRefreshToken()`'s signature check for the same reason a forged
  token would (signed with the *access* secret, checked against the
  *refresh* secret), so the existing catch-all already covers it —
  confirmed live, not assumed, with a real access token issued by
  `login()`.
- **Alternatives:** distinguishing `TokenExpiredError` (from
  `@nestjs/jwt`/`jsonwebtoken`) into a more specific response, e.g. a
  distinct error code the client could use to decide whether to retry
  differently (rejected — no current client exists to consume that
  distinction, and it's speculative differentiation this phase's brief
  didn't ask for); a custom exception message repeating the raw
  `jsonwebtoken` error text (rejected — `jsonwebtoken`'s own messages
  can differ subtly by failure mode, which is exactly the kind of detail
  this decision avoids exposing).
- **Affects:** `apps/api/src/modules/auth/auth.service.ts`.

## 2026-07-19 — Phase 1.2D.9: reissued tokens rebuild a clean payload rather than re-signing the decoded token
- **Decision:** `refresh()` never passes the object
  `TokenService.verifyRefreshToken()` returns directly into
  `signAccessToken()`/`signRefreshToken()`. It first calls the mapper's
  new `reissueAuthTokenPayload(decoded)`, which returns a fresh
  `{ email: decoded.email }` object.
- **Why:** `AuthTokenPayload`'s TypeScript type is `{ email: string }`,
  but the object `verifyRefreshToken<AuthTokenPayload>()` actually
  returns at runtime also carries `iat`/`exp` — `jsonwebtoken` merges
  those standard claims into every payload it verifies, and the type
  parameter doesn't strip them, it just doesn't *describe* them.
  `signAccessToken()`/`signRefreshToken()` both pass `expiresIn` as a
  signing option; `jsonwebtoken` throws ("Bad options.expiresIn option
  the payload already has an exp property") if the payload passed to
  `sign()` already has its own `exp`. This was caught by reasoning
  through the runtime shape before writing the code, not by hitting the
  error live and patching around it — the mapper's own tests
  (`auth-token-payload.mapper.spec.ts`) assert the stripping explicitly,
  including one test that passes an object with `iat`/`exp` present
  (cast past the type, since the type alone can't express what a real
  decoded token carries) to prove the function actually filters them,
  not merely that the type looks clean.
- **Alternatives:** deleting `iat`/`exp` off the decoded object in place
  (`delete decoded.iat`) before re-signing (rejected — mutates a value
  the caller doesn't own conceptually, and depends on there being
  exactly two extra fields today; a clean rebuild is correct regardless
  of what `jsonwebtoken` happens to add in the future); passing
  `{ expiresIn: undefined }` to suppress the conflict instead (rejected —
  would leave already-issued tokens' TTLs uncontrolled by config,
  defeating the point of `signAccessToken()`/`signRefreshToken()`'s own
  design).
- **Affects:** `apps/api/src/modules/auth/mappers/{auth-token-payload.mapper.ts,
  auth-token-payload.mapper.spec.ts}`, `auth.service.ts`.

## 2026-07-19 — Phase 1.2D.8 review: re-confirmed registered-but-unwired PasswordService is honest architecture, fixed stale cross-module doc claims
- **Decision:** Re-argued the implementation phase's own design decision
  (inject `PasswordService`, never call it) from scratch instead of
  re-affirming it by default, and reached the same conclusion for
  independently-stated reasons: this is honest temporary architecture,
  not fake verification. Found and fixed two files whose own claims
  became stale the moment Phase 1.2D.8 wired `login()` into
  `TokenService` and constructor-injected `PasswordService` into
  `AuthService` — neither file was touched during the implementation
  phase itself, since that phase's own doc updates were scoped to
  `auth/README.md`/`backend.md`, not the two dependency modules' own
  docs: (1) `apps/api/src/jwt/token.service.ts`'s header comment and
  `apps/api/src/jwt/README.md` claimed `TokenService` was "not called
  anywhere in apps/api/src/modules/auth/ yet" and that
  `AuthController`/`AuthService` were "unchanged from Phase 1.2D.5" —
  both false since `login()` now calls `signAccessToken()`/
  `signRefreshToken()`; corrected to describe sign as having a real
  caller since Phase 1.2D.8 while verify still doesn't. (2)
  `apps/api/src/password/README.md` had the identical "AuthService
  unchanged" claim, plus a more subtle one: its "independence" section
  asserted "`PasswordService` has no dependency on `AuthService`... and
  nothing in `auth/`/`jwt/` depends on it either" — this became false
  the moment `AuthService`'s constructor started injecting
  `PasswordService`; corrected to state the dependency now runs one
  direction only (`AuthService` depends on `PasswordService`, never the
  reverse), which is what was actually true even before this review, just
  no longer what the doc said.
- **Why:** this is exactly the kind of drift a single phase's own review
  doesn't catch, because the phase that changes the dependency
  relationship (1.2D.8) isn't the one that owns the file describing the
  now-stale side of it (`jwt/README.md`, `password/README.md` — owned by
  Phases 1.2D.6/1.2D.7). The same category of gap Phase 1.2C.9's
  whole-subsystem audit found for the logging subsystem's cross-cutting
  docs.
- **Alternatives:** leaving `jwt/`/`password/`'s own READMEs untouched
  since Phase 1.2D.8's brief only asked to review `auth/README.md`/
  `backend.md`/`progress.md`/`decisions.md` (rejected — the review
  brief's own "Ensure documentation matches implementation" isn't
  file-scoped, and a stale claim about `login()`'s current behavior is a
  genuine inaccuracy regardless of which file it lives in).
- **Affects:** `apps/api/src/jwt/{token.service.ts, README.md}`,
  `apps/api/src/password/README.md`.

## 2026-07-19 — Phase 1.2D.8: login() issues real tokens unconditionally; PasswordService stays registered but unwired
- **Decision:** `AuthService.login()` now builds a minimal JWT payload
  (`{ email }`, via the new `mappers/auth-token-payload.mapper.ts`) and
  signs a real access token + refresh token pair through `TokenService`
  — unconditionally, for any well-formed `LoginRequestDto`. It does
  **not** call `PasswordService.compare()` anywhere, even though
  `PasswordService` is constructor-injected (proving DI resolution).
  This was an explicit choice presented to and confirmed by the user
  before implementation, from three options: (a) registered-but-unwired
  (chosen), (b) a self-consistent `hash()`-then-`compare()`-against-
  itself round trip (always succeeds by construction, so no password is
  ever actually rejectable), (c) a fixed hardcoded demo-password hash
  gating login (a real accept/reject path, but a bypass credential
  embedded in source).
- **Why:** without persistence (explicitly out of scope this phase, and
  blocked on the same unresolved tenant-resolution problem Phase
  1.2D.4's review already found for `AuthRepository`), there is no
  persisted password hash for a real user to compare `dto.password`
  against. Option (b) would make "password verification" vacuous — every
  input verifies, so it isn't actually verification, just a code path
  that always returns `true`. Option (c) would embed a fixed credential
  that authenticates in any environment, a genuine security anti-pattern
  in a codebase this deliberate about tenant-scoping and secrets (JWT/
  hash config both forbid hardcoded values). Option (a) mirrors the
  already-approved precedent for `AuthRepository` exactly: build the
  capability, prove it's real and DI-resolvable, defer the call site
  until the thing it needs (a persisted, tenant-scoped credential) also
  exists. `TokenService`, by contrast, needed nothing external to be
  genuinely wired in — a JWT payload can be built from request input
  alone, so token issuance could become real this phase while password
  verification could not.
- **Alternatives:** the two rejected options above; also considered
  gating login on the DTO's `password` being non-empty as a token
  "verification" stand-in (rejected — `class-validator`'s
  `@MinLength(1)` on `LoginRequestDto` already enforces that at the HTTP
  boundary, so it would be redundant, not verification).
- **Affects:** `apps/api/src/modules/auth/{auth.service.ts,
  auth.service.spec.ts, auth.controller.spec.ts, README.md}`,
  `docs/architecture/backend.md`.

## 2026-07-19 — Phase 1.2D.8: `AuthTokenPayload`/`buildAuthTokenPayload` graduate `types/`/`mappers/` from placeholder to real content
- **Decision:** The JWT payload's shape lives in
  `apps/api/src/modules/auth/types/auth-token-payload.type.ts`
  (`AuthTokenPayload = { email: string }`), and the one function that
  builds it from `LoginRequestDto` lives in
  `apps/api/src/modules/auth/mappers/auth-token-payload.mapper.ts`
  (`buildAuthTokenPayload`) — not inlined in `auth.service.ts`. Both
  folders' placeholder `README.md` files were deleted once real content
  landed, matching `repositories/`'s existing precedent (no README once
  a folder has real content) rather than editing the placeholder text
  in place.
- **Why:** `docs/architecture/domain-module-guide.md`'s folder table
  places "plain TypeScript aliases... not covered by dto/ or entities/"
  in `types/` and "pure functions/classes converting between
  representations" in `mappers/` — a JWT payload type and its DTO→payload
  conversion function are exactly those two things, respectively.
  Isolating the conversion in one function means the payload's shape
  can't drift between the access-token and refresh-token signing calls
  in `login()`.
- **Alternatives:** inlining `{ email: dto.email }` directly in
  `login()` twice (rejected — exactly the drift risk a mapper exists to
  prevent, and ignores the brief's explicit "JWT payload builder"
  deliverable).
- **Affects:** `apps/api/src/modules/auth/{types/auth-token-payload.type.ts,
  mappers/auth-token-payload.mapper.ts,
  mappers/auth-token-payload.mapper.spec.ts}` (new), `types/README.md`/
  `mappers/README.md` (deleted).

## 2026-07-19 — Phase 1.2D.7: switched from `argon2` to `@node-rs/argon2` after a live install failure, not a preference
- **Decision:** Built the password-hashing infrastructure
  (`PasswordService`/`PasswordModule`, `apps/api/src/password/`) on
  `@node-rs/argon2` instead of the more commonly-referenced `argon2`
  (node-argon2) npm package. `pnpm add argon2` was attempted first and
  failed live: its install script invokes node-gyp, which requires a
  Visual Studio C++ build toolchain not present on this machine, and no
  prebuilt binary was available for this Node version/platform either
  (confirmed by the actual `gyp ERR! find VS` failure output, not
  assumed). `@node-rs/argon2` (napi-rs bindings around the same
  underlying Rust `argon2` crate) installed cleanly with a prebuilt
  native binary, no compilation step. Its `hash()`/`verify()` functional
  API (no exported class) also carries zero naming-collision risk with
  `PasswordService`/`PasswordModule`, the same check Phase 1.2D.6 already
  applied to `TokenService`/`TokenModule`. Live-verified: hashing the
  same plaintext twice produces different hashes (random salt), `verify()`
  round-trips correctly, and a hash produced under one config still
  verifies after `HASH_MEMORY_COST`/`HASH_TIME_COST`/`HASH_PARALLELISM`
  change (parameters travel inside the PHC-encoded hash string).
- **Why:** the brief asked for real, working Argon2 hashing, not a
  specific npm package; a package that can't install in this environment
  doesn't satisfy that regardless of name recognition. Confirming the
  failure live (not just noting "argon2 usually needs build tools" from
  general knowledge) matched this arc's standing discipline of verifying
  claims by actually running the command.
- **Alternatives:** installing Visual Studio Build Tools ("Desktop
  development with C++" workload) to make the `argon2` package's
  node-gyp build succeed (rejected — a multi-GB toolchain install is a
  disproportionate ask for a single native dependency for infrastructure
  scoped to be "registered but unwired," and the host's disk space has
  been critically low/fluctuating since Phase 1.2D.4); falling back to
  bcrypt (rejected outright — the brief explicitly says "Use Argon2").
- **Affects:** `apps/api/package.json` (`@node-rs/argon2` dependency, not
  `argon2`), `apps/api/src/password/{config/hash.config.ts,
  password.module.ts, password.service.ts, password.service.spec.ts,
  README.md}`, `apps/api/src/config/env.validation.ts` (+
  `HASH_MEMORY_COST`/`HASH_TIME_COST`/`HASH_PARALLELISM`),
  `.env`/`.env.example`, `apps/api/src/app.module.ts`,
  `docs/architecture/{backend.md, configuration.md, validation.md}`.

## 2026-07-19 — Phase 1.2D.7: Argon2 variant hardcoded to argon2id, not config-driven
- **Decision:** `PasswordService` hardcodes the Argon2 variant to
  `argon2id` (`private readonly algorithm: Algorithm = 2`, imported as a
  type only — see the code comment on why the value can't be
  `Algorithm.Argon2id` directly under this project's `isolatedModules`
  setting, TS2748). Only `memoryCost`/`timeCost`/`parallelism` are
  environment-tunable, via the new `hash` config namespace
  (`apps/api/src/password/config/hash.config.ts`, graduated outside the
  frozen `config.module.ts` via `ConfigModule.forFeature()` — the same
  path `jwt.config.ts` established in Phase 1.2D.6).
- **Why:** mirrors the same "not configurable" treatment already applied
  to the JWT signing algorithm (HS256, fixed in `token.service.ts`) —
  argon2id is the universally security-recommended default (OWASP), and
  making the variant itself environment-tunable would let a misconfigured
  environment silently weaken to argon2i/argon2d, a security regression
  rather than a legitimate environment difference. Cost parameters, by
  contrast, are legitimately different per environment (e.g. lower on a
  resource-constrained dev box).
- **Alternatives:** exposing the variant as a 4th `HASH_ALGORITHM` env
  var (rejected — no legitimate environment needs a non-argon2id
  variant, and exposing the knob only invites accidental misuse).
- **Affects:** `apps/api/src/password/password.service.ts`,
  `apps/api/src/config/env.validation.ts`.

## 2026-07-19 — Phase 1.2D.6 review: confirmed working sign/verify is architectural preparation, not scope creep — re-weighed the question honestly rather than re-affirming the prior call by default
- **Decision:** The implementation phase's own report explicitly flagged
  a genuine ambiguity and asked the next review to weigh in: is a fully
  functional (not stubbed) `TokenService` "acceptable architectural
  preparation" given the brief's "Do NOT: Generate tokens... Verify
  tokens," or is it scope creep? This review re-argued both sides fresh
  rather than defaulting to the prior answer, and reached the same
  conclusion for reasons stated independently: **acceptable
  preparation.** The brief's own positive deliverables ("JwtService
  wrapper," "Access token configuration" and "Refresh token
  configuration" as two separate named items, "reusable infrastructure")
  don't have a coherent stubbed interpretation — an inert placeholder
  wouldn't need separate access/refresh *configuration* at all. The
  actual security boundary — reachability from a real HTTP request, not
  whether the underlying code happens to be capable of running — was
  re-verified directly: `AuthController`/`AuthService` are still
  byte-for-byte identical to Phase 1.2D.4. One counter-argument was
  considered and rejected: "a future phase might wire this in carelessly
  without also verifying credentials" is a risk for that future phase's
  own review to catch, not evidence that this phase's working code is
  itself a defect — the same logic would argue against ever building
  `BaseRepository`'s real CRUD methods or `PrismaService`'s real
  connection logic ahead of their first consumer, which this project has
  done consistently and successfully every phase.
- **Why:** re-litigating a flagged ambiguity honestly — arguing it again
  from scratch rather than treating the original author's judgment as
  already-settled — is what makes a review worth doing on a genuinely
  close call, not a formality. Both readings of the brief's wording were
  laid out with their strongest form before deciding, including a
  stronger case for the conservative reading than the implementation
  phase's own report gave credit for (the literal repetition of "do not
  issue or validate tokens yet" in two places in the same brief).
- **Alternatives:** stubbing the four `TokenService` methods retroactively
  on the grounds that "Generate tokens"/"Verify tokens" appear as flatly
  worded prohibitions, styled identically to unambiguous items like
  "Guards"/"Passport"/"RBAC" in the same list (seriously considered, not
  a strawman — ultimately rejected because it would make the module fail
  its own "reusable infrastructure" brief and because the reachability
  boundary, not the code's capability, is what the non-negotiable
  authentication-behavior prohibitions in this arc have consistently
  meant every other time this exact tension came up).
- **Affects:** apps/api/src/jwt/{token.service.ts (no change — reviewed,
  not modified), token.service.spec.ts (+2 tests: alg:none rejection,
  HS256 default), README.md}, docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Phase 1.2D.6: TokenService/TokenModule are genuinely functional, not stubbed — capability exists, but nothing calls it yet
- **Decision:** `TokenService`'s `signAccessToken`/`signRefreshToken`/
  `verifyAccessToken`/`verifyRefreshToken` are real, working
  implementations wrapping `@nestjs/jwt`'s actual `JwtService.sign()`/
  `verify()` — not stubs, not `throw new Error('not implemented')`
  placeholders. Verified via 6 tests including a genuine expired-token
  rejection and confirmation that access/refresh secrets aren't
  interchangeable. Nothing in `AuthController`/`AuthService` calls any of
  these methods — both files are byte-for-byte unchanged from Phase
  1.2D.5. Also renamed the module from `JwtModule` to `TokenModule`
  (file `jwt.module.ts` → `token.module.ts`) after live-testing surfaced
  a real problem: `@nestjs/jwt`'s own `JwtModule` (configured inside this
  module via `registerAsync()`) has the identical class name, producing
  two indistinguishable "JwtModule dependencies initialized" log lines
  at boot.
- **Why:** the brief's "Do NOT: Generate tokens... Verify tokens" reads,
  in context with the explicitly *positive* requirements right above it
  ("JwtService wrapper," "Access token configuration," "Refresh token
  configuration"), as "don't wire this into a real login/refresh flow
  yet" rather than "don't write a working sign/verify method at all" —
  the same distinction every phase in this arc has drawn between
  building genuine capability (`BaseRepository`'s CRUD methods,
  `PrismaService`'s connect/disconnect, the global `ValidationPipe`) and
  wiring it into a live user-facing flow. A stubbed wrapper would satisfy
  neither reading defensibly — it wouldn't be "reusable infrastructure"
  (the brief's own phrase) if it can't actually be exercised and proven
  correct. This is a judgment call on genuinely ambiguous wording, not a
  certainty; flagged prominently in this phase's own report for the next
  review pass to weigh in on. The module rename followed this project's
  established discipline of live-testing claims rather than assuming
  them: the naming collision was caught by actually reading the boot log,
  not by inspecting the code.
- **Alternatives:** stubbing `signAccessToken`/etc. to throw
  `Error('not implemented')` (rejected — see reasoning above: this
  wouldn't be verifiable, working "reusable infrastructure," just an
  inert placeholder with extra steps); keeping the module named
  `JwtModule` on the grounds that the brief asked for "JwtModule
  configuration" verbatim (rejected — the brief's own wording is a
  description of the CAPABILITY (configuring JWT support), not a mandate
  for the literal class name, and the collision is a real, confirmed,
  avoidable problem); graduating JWT config under the existing
  `config/auth/` placeholder instead of a new `jwt` namespace (rejected —
  `config/auth/` is explicitly reserved for managed IdP settings per its
  own README; conflating the two would misrepresent what's actually
  validated).
- **Affects:** apps/api/src/jwt/ (new: config/jwt.config.ts,
  token.module.ts, token.service.ts + specs, README.md),
  apps/api/src/config/env.validation.ts (+spec),
  apps/api/{.env.example, .env}, apps/api/src/app.module.ts,
  apps/api/src/config/auth/README.md, apps/api/package.json
  (`@nestjs/jwt`), docs/architecture/{backend.md, configuration.md,
  validation.md}, docs/implementation/{progress.md, decisions.md}.

---

## 2026-07-19 — Phase 1.2D.5: main.ts registers ValidationPipe directly (not an APP_PIPE provider), matching the plan multiple prior phases already anticipated
- **Decision:** `ValidationPipe` is registered via
  `app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS))` in
  `main.ts`, not via `{ provide: APP_PIPE, useClass: ... }` in
  `app.module.ts` (the mechanism `ExceptionLoggingFilter` uses for the
  same "global, cross-cutting" reason). Options
  (`whitelist: true`, `transform: true`) live in
  `apps/api/src/common/pipes/validation-pipe.options.ts`, replacing that
  folder's Phase 0 placeholder. `class-validator`'s validation shape
  (per-field message arrays under a `400 Bad Request`) was kept as
  Nest's own default — no custom `exceptionFactory` was written.
- **Why:** `main.ts`'s own bootstrap comment has said exactly
  `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform:
  true }))` since Phase 1.2A, and `backend.md`'s "Deferred" list has
  quoted that same line across multiple phases — honoring an
  already-documented, multiply-referenced plan is preferable to silently
  switching mechanisms now for no functional gain. The `APP_PIPE`
  alternative exists specifically for pipes that need Nest's DI
  container to inject their own dependencies; `ValidationPipe` needs
  none, so `useGlobalPipes()` loses nothing while staying simpler and
  matching the plan every previous phase already pointed at. A custom
  `exceptionFactory` would have been scope creep here — validation error
  *shape* wasn't something this phase's brief asked to redesign, and
  `ExceptionLoggingFilter` already logs/handles Nest's default
  `BadRequestException` shape correctly with zero new code, confirmed
  live.
- **Alternatives:** `APP_PIPE` in `app.module.ts` (rejected — no DI
  dependency to justify it, and it would diverge from the specific line
  `main.ts`'s own comment and `backend.md` had both anticipated for
  phases now); a custom `exceptionFactory` shaping errors like
  `env.validation.ts`'s bulleted format (rejected — out of this phase's
  stated scope, and Nest's default shape is already consistent and
  well-understood REST convention, verified live rather than assumed
  broken).
- **Affects:** apps/api/src/common/pipes/{validation-pipe.options.ts,
  validation-pipe.options.spec.ts, README.md}, apps/api/src/main.ts,
  apps/api/src/modules/auth/{dto/login-request.dto.ts,
  dto/refresh-request.dto.ts, dto/login-request.dto.spec.ts, README.md},
  docs/architecture/{backend.md, validation.md},
  docs/implementation/{progress.md, decisions.md}.

---

## 2026-07-19 — Phase 1.2D.4 review: an unscoped query is a defect regardless of whether the result is used — removed AuthService.login()'s tenant-less User lookup entirely
- **Decision:** Found and removed a genuine, serious issue during
  review: `AuthService.login()` called `AuthRepository.findMany({
  where: { email: dto.email } })` — a filter with no `tenantId`,
  against `User`, a table CLAUDE.md's own non-negotiable rules require
  every query to scope by tenant. The Phase 1.2D.4 implementation had
  reasoned that using `findMany` (instead of `findUnique` on the
  partial-unique-indexed `(tenantId, email)` key) sidestepped a
  *different*, already-documented landmine (`.upsert()`'s `ON CONFLICT`
  arbiter resolution) — true, but beside the point: the real defect was
  never having a `tenantId` in the filter at all, a distinct problem
  from the landmine that reasoning was addressing. Verified there is no
  way to fix this correctly today rather than guessing: grepped the
  whole backend for `tenantId` and found it exists only as a reserved,
  explicitly-unpopulated field on `LogContext` — no tenant-resolution
  mechanism exists anywhere yet. Removed the repository call entirely;
  `AuthRepository` remains registered in `AuthModule` and DI-resolvable
  (proven live), matching the exact "registered but unwired" pattern
  already established for `ExampleRepository` in Phase 1.2D.3, for the
  identical underlying reason (no genuine, correct use exists yet).
- **Why:** "the result is unused anyway" was the implementation phase's
  own justification for writing the query — but an unscoped read
  against a multi-tenant table is the violation itself, independent of
  what happens to the result; whether RLS would have caught it in this
  specific dev environment was never the question CLAUDE.md's rule
  asks ("RLS is the backstop, not the only gate" — meaning the
  application-level gate must exist regardless of what the backstop
  does). This is also the first repository call in a module other
  future modules will be built to resemble — leaving it in place would
  have taught nine future domain modules the wrong lesson about what a
  "prove the DI chain" query is allowed to look like.
- **Alternatives:** attempting to add tenant scoping to make the query
  "correct" (rejected — no tenant is available anywhere in this app yet
  to scope by; fabricating one, e.g. a hardcoded or session-derived
  placeholder tenantId, would be worse than not querying at all);
  leaving the query in place with a comment merely acknowledging the
  gap (rejected — a documented violation is still a violation of a
  non-negotiable rule, not a mitigated one).
- **Affects:** apps/api/src/modules/auth/{auth.service.ts,
  auth.service.spec.ts, README.md, repositories/auth.repository.ts},
  docs/architecture/backend.md, docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Phase 1.2D.4: login() reads via findMany(email), never findUnique() on the partial-unique-indexed (tenantId, email) key
- **Decision:** `AuthService.login()` proves the
  `Controller → Service → Repository → PrismaService` chain against a
  real table by calling `AuthRepository.findMany({ where: { email:
  dto.email } })` — deliberately not `findUnique()` on the `User`
  model's `(tenantId, email)` compound unique key, even though that's
  the more natural-looking lookup for a login flow. That key sits behind
  a PARTIAL unique index (`CREATE UNIQUE INDEX ... WHERE deleted_at IS
  NULL`) added via raw SQL in a Phase 1.1B migration —
  `schema.prisma`'s own `@@unique([tenantId, email])` declaration is a
  stand-in the schema DSL can't express as filtered, documented in the
  `User` model's own comment and in `prisma/seed.ts`'s header comment
  (which specifically flags `.upsert()`'s `ON CONFLICT` arbiter
  resolution as the affected operation, error 42P10). A plain
  `findMany` filter never invokes uniqueness-constraint semantics at
  the SQL level at all, so it can't hit that landmine regardless of
  whether it applies to reads too. Also added `class-validator`/
  `class-transformer` as new dependencies for real (not merely
  cosmetic) DTO validation rules, and gave every auth route
  `@HttpCode(HttpStatus.OK)` after live-testing surfaced Nest's default
  `201 Created` on the placeholder responses.
- **Why:** this is the first phase to actually query a table with a
  documented, already-known landmine in its unique-constraint handling
  — the safe move was to avoid the risky operation category entirely
  (any `findUnique`/`upsert` touching that compound key) rather than
  spend this placeholder-only phase's scope verifying exactly how much
  of the landmine does or doesn't apply to reads. A future phase that
  needs a real, tenant-scoped, uniqueness-guaranteed user lookup should
  investigate that question on its own terms, with a real credential
  check to justify the risk. The `@HttpCode` fix follows this session's
  established discipline of live-testing claims rather than trusting
  the framework's default silently: the brief asked for "placeholder
  responses," not "whatever status code Nest picks by default."
- **Alternatives:** using `findUnique()` on `(tenantId, email)` for a
  more realistic-looking login lookup (rejected — risks the exact
  documented landmine for no benefit, since the result is unused in
  this phase anyway); skipping the repository call in `login()`
  entirely, mirroring how `ExampleRepository` was left unwired in Phase
  1.2D.3 (rejected — this phase's brief explicitly asks to verify
  "Service depends only on AuthRepository," and a real, live, working
  call is stronger evidence of that than DI registration alone);
  leaving the default `201` status uncorrected on the grounds that
  "it's just a placeholder" (rejected — semantically wrong status codes
  are exactly the kind of thing worth fixing once noticed, regardless
  of the response body's own placeholder status).
- **Affects:** apps/api/src/modules/auth/ (new module),
  apps/api/package.json (`class-validator`/`class-transformer`),
  docs/architecture/backend.md, docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Phase 1.2D.3 review: prove the generic-typing claim with a real compile error, don't just re-read the code and agree with it
- **Decision:** Rather than reviewing `BaseRepository`'s
  `Parameters<>`/`ReturnType<>` generic design by inspection alone,
  wrote a throwaway file calling `ExampleRepository.findOne({ where: {
  thisFieldDoesNotExistOnSetting: 'x' } })` and `.create({ data: {
  thisFieldAlsoDoesNotExist: 1 } })`, ran `tsc --noEmit`, and confirmed
  both produced real errors referencing Prisma's actual generated types
  (`SettingWhereUniqueInput`, `SettingCreateInput`) — proving the loose
  `any`-based `CrudDelegate` constraint doesn't leak through and let
  wrong shapes silently pass. Converted that one-off verification into a
  permanent regression test in `example.repository.spec.ts` using
  `@ts-expect-error`, matching the exact pattern
  `audit-logger.service.spec.ts` already established for `AuditEvent`'s
  immutability rather than inventing a new verification style. Also
  found and fixed one small documentation drift from the implementation
  phase: `domain-module-guide.md` §15 claimed "four spec files" for
  `modules/example-domain/` when there are three.
- **Why:** "type safety" is exactly the kind of claim that's cheap to
  assert and easy to get subtly wrong (a too-loose generic constraint
  can look correct while silently accepting anything) — this project's
  standing review discipline is to verify runtime/compile-time claims
  with a real command, not just re-read the code and nod along (the
  same discipline the Phase 1.2D.2 review applied to the "fail-fast"
  claim, which turned out to be false until actually tested). Here the
  claim held up, but only actually running `tsc` against a deliberately
  wrong call proves that, and turning it into a permanent test means the
  next change to `BaseRepository` can't silently regress this without a
  test failure.
- **Alternatives:** trusting the generic design's own header-comment
  claim without independent verification (rejected — exactly the
  practice this project's reviews have consistently avoided); writing a
  new ad hoc verification style instead of `@ts-expect-error` (rejected —
  `audit-logger.service.spec.ts` already established the pattern for
  this exact kind of compile-time-only check, no reason to diverge).
- **Affects:** apps/api/src/modules/example-domain/{repositories/
  example.repository.spec.ts, README.md}, docs/architecture/
  domain-module-guide.md (§15, §16), docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Phase 1.2D.3: repositories live inside their owning domain module, never in database/; BaseRepository stays framework- and DI-agnostic
- **Decision:** `BaseRepository<TDelegate>` depends only on the plain
  delegate object passed to its constructor — no `@Injectable()`, no
  knowledge of `PrismaService` or Nest's DI container at all. Only a
  concrete subclass (`ExampleRepository`) is `@Injectable()` and
  constructor-injects `PrismaService`, extracting the one model delegate
  it owns (`prisma.setting`) and handing it to `super()`. Generic typing
  uses `Parameters<TDelegate['findUnique']>`/`ReturnType<...>` against a
  loose `(...args: any[]) => any` constraint, not a hand-written
  structural interface with concrete argument types (`{ where:
  Record<string, unknown> }`) — the latter risks silent incompatibility
  with Prisma's actual, far stricter generated argument types depending
  on TypeScript's method-vs-property bivariance rules; the
  `Parameters<>`/`ReturnType<>` approach instead derives the real types
  directly from whatever concrete delegate a subclass provides, verified
  by actually typechecking `ExampleRepository` against
  `PrismaService['setting']` (a real generated type), not just a
  hand-rolled mock. Repositories live inside their owning domain
  module's own `repositories/` folder (`modules/<domain>/repositories/
  <model>.repository.ts`), never inside `apps/api/src/database/` itself
  — that folder holds only the shared abstraction and `PrismaService`.
  Established as an enforced rule, not just a suggestion: services never
  inject `PrismaService` directly, only a repository does — confirmed
  today by grep across `apps/api/src` (zero services currently do).
- **Why:** `BaseRepository` needs to be trivially unit-testable with a
  plain mock (no live Postgres, matching every other unit test in this
  codebase) — that's only possible if it has zero framework/DI
  dependencies of its own. Keeping repositories inside their domain
  module (not centralized in `database/`) mirrors the same "one domain =
  one folder" boundary `configuration.md` §2 already established for
  config namespaces, and avoids `database/` becoming a dumping ground for
  every future domain's data-access code as Auth/Users/Organizations/...
  each get built. The Service-never-injects-PrismaService rule is what
  actually makes "clean separation between Service ↔ Repository"
  (this phase's own review criterion) enforceable going forward, not
  just true by accident today.
- **Alternatives:** giving `BaseRepository` an `@Injectable()` decorator
  and letting Nest resolve `PrismaService` for it directly (rejected —
  would make every repository require a live Nest DI container to test,
  the exact dependency this codebase has consistently avoided in unit
  tests); a hand-written structural delegate interface with concrete
  argument types (rejected — fragile against Prisma's real generated
  types, confirmed unnecessary once the looser
  `Parameters<>`/`ReturnType<>` version type-checked cleanly against a
  real delegate); centralizing all future repositories inside
  `database/repositories/` (rejected — breaks the one-domain-one-folder
  boundary and couples unrelated domains' data-access code in one
  shared folder for no benefit).
- **Affects:** apps/api/src/database/{base.repository.ts,
  base.repository.spec.ts, README.md},
  apps/api/src/modules/example-domain/{example-domain.module.ts, README.md,
  repositories/ (new)}, apps/api/src/config/database/database.config.ts
  (stale comment fix), docs/architecture/{backend.md,
  domain-module-guide.md §16}, docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Phase 1.2D.2 review: $connect() alone does not fail fast against a lazy driver-adapter pool — a real query is what actually validates the connection
- **Decision:** Found and fixed a genuine, previously-undiscovered bug:
  `PrismaService.onModuleInit()` called only `this.$connect()`, and the
  code comments, `database/README.md`, `backend.md`, and this file's own
  prior Phase 1.2D.2 entry all claimed this was "fail-fast." Live-tested
  during this review with a deliberately invalid `DATABASE_URL` (bad
  credentials, unreachable port) — the app logged
  `"Database connection established"` and served requests normally
  anyway. Root cause: `@prisma/adapter-pg` wraps a `pg.Pool`, which opens
  no real socket until first use — `$connect()` on a driver-adapter
  client resolves successfully regardless of whether the connection
  string is valid, unlike Prisma's older non-adapter client. Fixed by
  adding a real `await this.$queryRaw\`SELECT 1\`` immediately after
  `$connect()` in `onModuleInit()` — re-tested with the same bad
  `DATABASE_URL` and confirmed the app now logs
  `"Database connection failed"` with the real Prisma/pg error and exits
  with code 1 before ever reaching "Nest application successfully
  started," and re-confirmed the real-Postgres happy path, the
  `GET /api/v1/example/ping` smoke test, and graceful shutdown (via
  `app.close()`, per the prior entry below) all still work unchanged.
- **Why:** this is exactly the failure mode "fail-fast" exists to
  prevent — without the fix, a misconfigured `DATABASE_URL` in a real
  deployment would have looked like a fully healthy boot and only
  surfaced as an opaque runtime error on the first real query from some
  future business module, potentially in production, long after startup
  had been declared successful. Every fail-fast claim elsewhere in this
  project (env validation) has been backed by an actual live test of the
  failure path, not just the happy path — this bug existed specifically
  because that discipline wasn't yet applied to `onModuleInit()` when it
  was first written; this review closed that gap the same way Phase
  1.2C.3's review found and fixed logging's own genuine defects.
- **Alternatives:** relying on `$connect()` alone and treating the
  "fail-fast" claim as satisfied by code inspection (rejected — this is
  precisely the assumption that turned out to be false); deferring
  connection validation to `isHealthy()` only, invoked by a future health
  endpoint (rejected — that endpoint doesn't exist yet and wouldn't run
  before the app starts serving other requests, defeating the point of
  fail-fast at startup).
- **Affects:** apps/api/src/database/{prisma.service.ts, README.md},
  docs/architecture/backend.md, docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Phase 1.2D.2: verify graceful shutdown via app.close(), not an unreliable Windows OS-signal simulation
- **Decision:** `PrismaService.onModuleDestroy()`'s disconnect behavior
  needed live verification against a real Postgres connection, the same
  way every other lifecycle-hook claim in this project has been
  verified. Sending a real OS-level graceful-termination signal to the
  running background process didn't work on this Windows environment:
  `taskkill /PID <pid>` (non-forceful) explicitly refused ("This process
  can only be terminated forcefully") since a console-less background
  process has no window to close gracefully, and Node's cross-process
  `process.kill(pid, signal)` on Windows force-kills unconditionally
  regardless of the signal name (a documented Node/Windows limitation,
  not specific to this app). Verified instead by booting the real
  `AppModule` via a throwaway script and calling `app.close()` directly —
  the exact same `OnModuleDestroy` lifecycle
  `app.enableShutdownHooks()`'s real `SIGTERM`/`SIGINT` handlers trigger
  internally (unchanged since Phase 1.2A) — and confirmed
  `"Database connection closed"` logged with a clean process exit.
- **Why:** a false "graceful shutdown works" claim backed only by code
  inspection, with no live evidence, would repeat exactly the mistake
  this project's own working discipline has avoided everywhere else
  (env validation, RLS enforcement, HTTP logging, exception logging all
  got the same "don't assume, verify live" treatment). `app.close()` is
  not a weaker substitute for a real signal — it calls the identical
  internal shutdown sequence Nest's signal handlers call, so it
  genuinely exercises the new `onModuleDestroy()` method against a real
  connection; only the OS-signal-delivery step itself (unchanged,
  pre-existing `main.ts` wiring, not new code from this phase) went
  unverified on this specific platform.
- **Alternatives:** reporting graceful shutdown as verified based on code
  review alone (rejected — this project's standing discipline is live
  verification wherever practical); forcefully killing the process and
  calling that "good enough" (rejected — a force-kill proves nothing
  about `onModuleDestroy()`, which is the actual behavior this phase
  needed to verify); skipping shutdown verification entirely (rejected —
  the phase brief explicitly asked to confirm it).
- **Affects:** apps/api/src/database/{prisma.service.ts, database.module.ts,
  README.md}, apps/api/src/app.module.ts,
  docs/architecture/backend.md (status, folder structure, dependency
  graph, deferred list), docs/implementation/{progress.md, decisions.md}.

---

## 2026-07-19 — Phase 1.2D.1 review: constant-file suffix must match logging/'s existing singular precedent, not a newly-invented plural one
- **Decision:** Fixed two genuine issues found reviewing the module
  template that every future domain module inherits. (1) The new
  `constants/` file was named `example-domain.constants.ts` (plural) and
  `domain-module-guide.md` documented that suffix as `.constants.ts` —
  inconsistent with the one other suffix-naming precedent already in
  production, `logging/constants/log-level-severity.constant.ts`
  (singular), and internally inconsistent with the guide's own other five
  suffixes (`.entity.ts`, `.interface.ts`, `.type.ts`, `.exception.ts`,
  `.validator.ts`, `.mapper.ts` — all singular). Renamed the file to
  `example-domain.constant.ts`, updated the one import site, and
  corrected the guide's suffix list and §9 heading. (2) The only test
  covering the new module exercised `ExampleDomainService` directly via
  `new ExampleDomainService()` — DI wiring itself (whether
  `ExampleDomainController` actually resolves the service through Nest's
  container) was unverified by any automated test, checked only by the
  implementation phase's manual `curl` smoke test. Added
  `example-domain.controller.spec.ts` using `Test.createTestingModule`
  (this backend's first controller-level test — there was no prior
  precedent to follow since this is also its first controller). Also
  corrected two smaller documentation inaccuracies found in the same
  pass: `domain-module-guide.md` §15 said "the four real files" when
  there are five (module/controller/service/dto/constant) plus now two
  spec files; §11 said "nothing depends on it," overclaiming since
  `AppModule` does (the intended meaning — no other domain module depends
  on it — is what got clarified).
- **Why:** this template is what nine future domain modules
  (Auth/Users/Organizations/Products/Orders/Billing/CRM/Content/
  Notifications) will copy verbatim — a naming inconsistency invented
  here would propagate into every one of them before anyone noticed,
  exactly the kind of mistake that's cheap to fix once and expensive to
  fix nine times over. The missing controller test mattered for the same
  multiplied-by-nine reason: every future controller will have more
  request/response wiring worth verifying than this one placeholder
  route, so establishing "controllers get their own spec file" as
  precedent now, rather than only unit-testing services, is the correct
  standard to set before it's copied forward.
- **Alternatives:** leaving `.constants.ts` as its own new convention,
  reasoned as "plural because it can hold multiple constants" (rejected —
  `logging/constants/` already holds an object with six keys under a
  singular filename; the folder is already plural, the *file* suffix
  singular is what the existing precedent actually establishes, and
  inventing a second, different rule for the same concept is exactly the
  inconsistency this review was asked to catch); skipping the controller
  test on the grounds that the live smoke test already proved it works
  (rejected — a manual `curl` during implementation isn't a regression
  check that runs in CI; every future controller needs an automated one,
  so this one should demonstrate the pattern too).
- **Affects:** apps/api/src/modules/example-domain/{constants/
  example-domain.constant.ts (renamed), example-domain.controller.ts
  (import path), example-domain.controller.spec.ts (new), README.md},
  docs/architecture/domain-module-guide.md (§2, §9, §11, §15).

---

## 2026-07-19 — Phase 1.2D.1: a non-domain reference module as the standard, not a written-only convention doc
- **Decision:** Established the domain-module template as a real,
  live-tested module (`apps/api/src/modules/example-domain/`) plus a
  companion doc (`docs/architecture/domain-module-guide.md`), rather than
  documenting conventions in prose alone. `ExampleDomainModule` is
  explicitly not one of the six real future business domains
  (`auth`/`billing`/`content`/`crm`/`notifications`/`projects`) — a
  separate, clearly-labeled folder so nobody mistakes it for a seventh
  domain to build business logic into. Six subfolders
  (`entities/interfaces/types/exceptions/validators/mappers`) exist as
  documented placeholders, each with its own README, following the exact
  "empty folder → README explaining the gap" convention `logging/`
  established in Phase 1.2C.1 and `config/`'s 10 placeholder domains
  already use — applied here from the start rather than re-decided.
  `dto/` and `constants/` have real, minimal content since a ping route
  genuinely needs both. No `CommonModule` created (see
  `domain-module-guide.md` §14) — nothing cross-domain exists yet to put
  in one.
- **Why:** a prose-only standards doc would be unverifiable — nothing
  would prove the conventions actually compose into a working NestJS
  module until the first real domain tried to follow them, at which
  point any mistake in the convention itself becomes expensive to fix
  everywhere at once. A live, DI-wired, route-mapped, test-covered
  reference module means every rule in the guide is demonstrated by code
  that actually boots, not just described — confirmed by live boot
  (`ExampleDomainModule dependencies initialized`, zero DI errors) and a
  real `curl` against the compiled build (`GET /api/v1/example/ping` →
  `200 {"status":"ok"}`, with `HttpLoggingMiddleware`'s completion log
  firing for it with zero extra wiring, proving the template composes
  correctly with the existing cross-cutting logging subsystem).
- **Alternatives:** a documentation-only guide with no code (rejected —
  unverifiable, and this project's own precedent for cross-cutting
  subsystems, config and logging, always paired real code with real
  docs); building the template as one of the six real domain folders,
  e.g. treating `modules/auth/` as this phase's reference (rejected —
  would leave real business-logic scaffolding mixed with genuinely-fake
  placeholder content, exactly the ambiguity a separate, clearly-fake
  folder avoids); a `CommonModule` scaffolded now for "future sharing"
  (rejected — nothing concrete to put in it yet; same "document the gap,
  don't fill it with placeholders" discipline as everywhere else in this
  project).
- **Affects:** apps/api/src/modules/example-domain/ (new, 13 files),
  apps/api/src/app.module.ts (new import), docs/architecture/{backend.md,
  domain-module-guide.md (new)}, docs/implementation/{progress.md,
  decisions.md}.

---

## 2026-07-19 — Pre-Phase 1.2D stabilization: verify duplication/dead-code leads against the decision log before removing anything; ship the env.validation.ts test-coverage fix
- **Decision:** Ran a full stabilization/architecture-freeze pass across
  Phases 1.1–1.2C as one system (not a new feature phase). Two candidate
  "genuine issues" surfaced by initial research turned out, on
  verification against this file and `configuration.md`, to be
  intentional and already-recorded rather than defects — left both
  untouched: (1) the 9 single-line per-domain `config/*/index.ts` /
  `logging/config/index.ts` barrels, none of which anything actually
  imports through (parents reach the concrete `.config.ts` file
  directly) — `configuration.md` §2 documents this as deliberate ("every
  domain is reachable both directly and via its own barrel"), not an
  oversight; (2) `logging/types/environment-mode.type.ts`'s `EnvironmentMode`
  having zero current consumers — this phase's own 2026-07-18 entry
  below records it as one of a deliberate three-type set
  (`LogLevel`/`LogFormat`/`EnvironmentMode`) mirroring config's validated
  enums, reserved for a future logger that branches on it; removing only
  the currently-unused third of a documented trio would contradict a
  decision already made and reviewed, not fix one. Did ship one genuine,
  previously-undiscovered gap: `apps/api/src/config/env.validation.ts`
  (non-trivial Zod schema, custom error messages, a `booleanFromString()`
  helper, module-level caching) had zero automated test coverage despite
  a documented history of real bugs found there via manual testing
  (`PORT=notanumber`, the `z.coerce.boolean()` trap) — added
  `env.validation.spec.ts` (16 tests), taking the suite from 76/8 to
  92/9. Also fixed one confirmed doc/code drift:
  `common/middleware/README.md` said `HttpLoggingMiddleware` is
  registered via `app.module.ts`'s `configure()`; `main.ts`'s own comment
  and the actual code have registered it via raw `app.use()` since Phase
  1.2C.5's prefix-scoping bugfix — the README was never updated to match.
- **Why:** the brief's own rule ("fix only genuine issues... do NOT
  refactor working architecture... do NOT introduce breaking changes")
  only works if "looks like dead code/duplication" claims get checked
  against the project's actual documented rationale before anything gets
  deleted — this project's standing practice (see every prior phase's
  own review passes) is to verify a claim against the code and docs
  before acting on it, not to trust a first read. Both candidate
  deletions would have contradicted an existing, on-the-record decision
  if applied; the test-coverage gap, by contrast, had no such
  documented rationale for its absence — it was a real, unexamined hole,
  directly analogous to the exact gap Phase 1.2C.3's review found and
  fixed for the logging subsystem, and covered by CLAUDE.md's standing
  "every feature ships with tests" rule.
- **Alternatives:** deleting the 9 unused barrel files as "dead code"
  (rejected — contradicts `configuration.md`'s documented convention;
  would also require re-litigating and re-approving a Phase 1.2B
  decision mid-freeze-audit, which the brief explicitly disallows);
  deleting `EnvironmentMode` (rejected — same reasoning, would fragment a
  documented three-type set over one phase's temporarily-zero consumer
  count); leaving `env.validation.ts` untested on the grounds that
  Phase 1.2B.5 already "certified" the config subsystem (rejected — that
  certification was a behavior/documentation review, not a test-coverage
  review, and the gap is real and squarely inside this audit's Testing
  Audit scope).
- **Affects:** apps/api/src/config/env.validation.spec.ts (new),
  apps/api/src/common/middleware/README.md (correction),
  docs/implementation/{progress.md, decisions.md}.

---

## 2026-07-19 — Phase 1.2C.9: whole-subsystem audit over another single-phase review; usage docs split into logging-guide.md, mirroring the configuration-guide.md precedent
- **Decision:** Instead of reviewing this phase's own (nonexistent) new
  code, audited the entire assembled logging subsystem end-to-end:
  every consumer's import paths, the full export surface, and
  `docs/architecture/backend.md` in full. Found and fixed real
  staleness: `backend.md` §3's dependency graph never showed
  `LoggingModule` (only `ConfigModule`) despite it being part of
  `AppModule` since Phase 1.2C.1, and omitted `HttpLoggingMiddleware`/
  `ExceptionLoggingFilter` entirely; the doc's "Deferred to Phase 1.2B"
  list still claimed the structured logging framework had "nothing
  consuming it yet," which stopped being true as of Phase 1.2C.5; the
  doc's title/status summary still described bare Phase 1.2A state.
  `logging/index.ts`'s own header comment never mentioned
  `AuditLoggerService` (added Phase 1.2C.8) among the internal classes.
  Also created `docs/architecture/logging-guide.md` — usage examples and
  best-practice guidelines, split out from the architecture/rationale-
  focused `logging/README.md`.
- **Why:** each of the eight prior phases' review passes correctly caught
  that PHASE's own bugs, but none of them were scoped to catch drift in a
  document like `backend.md` that every phase touches incrementally —
  exactly the kind of gap that only shows up when someone reads the whole
  assembled picture at once instead of one phase's diff at a time. The
  dependency-graph gap is the most concrete example: no single phase's
  review would have flagged "the diagram doesn't show LoggingModule,"
  since no single phase's brief asked the reviewer to re-verify that
  diagram specifically. For the new guide: `configuration-guide.md`
  already solved this exact problem for the config subsystem back in
  Phase 1.2B.4, with an explicit, on-the-record rationale ("usage
  examples... are a different kind of content... from architecture/
  rationale focus") — reusing that precedent instead of inventing a new
  structure, or worse, bolting usage examples onto `logging/README.md`
  and blurring its purpose the same way that would have blurred
  `configuration.md`'s.
- **Alternatives:** treating this phase as "nothing to do, no new code
  means nothing to review" (rejected — the brief explicitly asks for a
  dependency-graph review, barrel cleanup, and new documentation, all of
  which turned out to have genuine findings); adding usage examples
  directly into `logging/README.md` (rejected — same reasoning
  `configuration-guide.md`'s own decision log already recorded, applied
  consistently rather than re-litigated); rewriting `backend.md`'s title/
  status to claim a specific, narrower Phase number (rejected — the doc
  now genuinely spans Phase 1.2A through 1.2C.9, and pinning it to any
  single phase number would immediately be stale again next phase).
- **Affects:** apps/api/src/logging/{index.ts (comment only), README.md
  (cross-link + roadmap entry)}, docs/architecture/{backend.md (title,
  status, §3 dependency graph, Deferred list), logging-guide.md (new)}.
  Zero behavior change anywhere — confirmed via identical
  `lint`/`typecheck`/`build`/`test` results to Phase 1.2C.8 (76 tests, 8
  suites, both before and after) and an unchanged live boot log.

## 2026-07-19 — Phase 1.2C.8: AuditEvent redesigned from Phase 1.2C.1's DB-mirroring guess; record() renamed to log(); AuditLoggerService stays internal behind AUDIT_LOGGER
- **Decision:** `types/audit-event.type.ts`'s `AuditEvent` was rewritten
  wholesale — `event`, `action`, `resource`, `resourceId?`, `actorType?`,
  `actorId?`, `outcome: 'SUCCESS' | 'FAILURE'`, `metadata?`, all
  `readonly` — replacing Phase 1.2C.1's `actorUserId?`/`resourceType`/
  `before?`/`after?`/`ipAddress?`/`userAgent?` shape entirely.
  `AuditLogger.record(event)` renamed to `log(event)`. `AuditLoggerService`
  (bound to `AUDIT_LOGGER`) injects only `LOGGER`, never
  `RequestContextService`, and stays internal — not exported from the
  public barrel, unlike `RequestContextService`/`PerformanceLogger`.
  `event.metadata` nests as its own key in the logged object; one
  consistent `.info()` level regardless of `outcome`; no `logAsync()`.
- **Why:** Phase 1.2C.1's original `AuditEvent` was an architecture-only
  guess at mirroring the `AuditLog` Prisma model's own columns — but this
  phase explicitly excludes database persistence/audit tables, so
  targeting a DB model's shape stopped being the right goal the moment
  real requirements arrived. `ipAddress?`/`userAgent?` are gone because
  keeping them would duplicate exactly what `RequestContext`'s existing
  auto-merge already supplies (the same "do not duplicate" rule every
  1.2C phase since Request Context has followed); `before?`/`after?` are
  gone because that's business-logic diffing this phase explicitly
  excludes; `actorUserId?` became `actorType?`/`actorId?` because this
  phase excludes user lookup/JWT parsing that would justify assuming a
  User entity specifically — an actor might just as easily be a service
  account or the system itself. `record()` → `log()`: the brief asks for
  it explicitly, and Phase 1.2C.1 had no real consumer to validate its own
  placeholder name against — this phase is the first real implementation
  and gets to finalize it. `AuditLoggerService` staying internal (not
  exported) follows directly from `AUDIT_LOGGER` being a genuine
  swap-point token (an interface with a real anticipated alternate
  implementation later — a future persistence-backed `AuditLogger`, for
  instance) — the same category as `LOGGER`/`LOG_FORMATTER`/
  `LOG_TRANSPORT`, and the opposite of `RequestContextService`/
  `PerformanceLogger`, which have no interface to swap behind at all.
  `metadata` nests rather than flat-merges because it's one named field
  of the `AuditEvent` schema itself (not genuinely arbitrary caller data
  the way `PerformanceLogger`'s metadata option is). One consistent log
  level and no `logAsync()` both extend precedents already set by
  `HttpLoggingMiddleware`/`PerformanceLogger`.
- **Alternatives:** keeping Phase 1.2C.1's original `AuditEvent` shape and
  just adding `outcome` on top (rejected — would keep `ipAddress?`/
  `userAgent?` duplicating the context auto-merge, and `before?`/`after?`
  fields with no defined semantics under "no business logic"); keeping
  `record()` as the method name for continuity with Phase 1.2C.1
  (rejected — that phase's own brief called it explicitly speculative,
  and this phase's brief names `log()` directly); exporting
  `AuditLoggerService` from the public barrel like `RequestContextService`
  (rejected — `AUDIT_LOGGER` already exists specifically as an interface
  swap-point; exporting the concrete class too would blur that boundary);
  adding `logAsync()` "for symmetry with `PerformanceLogger`" (rejected —
  no async work exists anywhere in this phase's path to justify it).
- **Affects:** apps/api/src/logging/{types/audit-event.type.ts (rewritten),
  types/audit-outcome.type.ts (new), types/index.ts,
  interfaces/audit-logger.interface.ts, audit-logger.service.ts (new),
  audit-logger.service.spec.ts (new), logging.module.ts, index.ts
  (unchanged — AuditLoggerService not exported)}, logging/README.md,
  docs/architecture/backend.md. No `Logger`/`RequestContextService`/
  `LoggerService`/HTTP logging/exception logging/performance logging
  changes, no business-module wiring, no persistence — confirmed via
  clean `lint`/`typecheck`/`build`/`test` (76 passing), identical live
  boot, and direct resolution of `AUDIT_LOGGER` from a live app instance
  producing correctly-shaped JSON for both a full-fields `SUCCESS` event
  and a minimal-fields `FAILURE` event.

## 2026-07-19 — Phase 1.2C.7: PerformanceLogger never touches RequestContextService; manual timer pair vs. exception-safe wrappers; metadata-collision-safe field ordering
- **Decision:** `PerformanceLogger` (no DI token, plain provider, exported
  from the public barrel — same treatment as `RequestContextService`, not
  `LoggerService`/`LOGGER`) injects only `LOGGER`, never
  `RequestContextService`. `startTimer()`/`endTimer()` are manual,
  unguarded primitives (a `PerformanceTimer` is a plain data value with
  nothing to leak); `measure()`/`measureAsync()` are the only methods that
  guarantee "timer cleanup on failure," via their own internal
  try/catch/finally, which always logs exactly once and always rethrows
  the original error afterward. `endTimer()`'s log call spreads
  caller-supplied `metadata` *before* the fixed fields
  (`operation`/`durationMs`/`success`/`category`).
- **Why:** "automatically inherit RequestContext whenever one exists" and
  "work independently of HTTP middleware" are both true by construction
  the moment `PerformanceLogger` does nothing special with context —
  `logger.info()` already auto-merges whatever's active (Phase 1.2C.4),
  exactly like `ExceptionLoggingFilter` already established; adding a
  `RequestContextService` dependency here would be redundant machinery for
  a guarantee the existing merge already provides, and "zero context
  leakage" holds for free since there's no shared context-related state in
  the class at all. Splitting manual vs. automatic APIs mirrors the
  brief's own framing (`startTimer`/`endTimer` = "Manual timing helpers,"
  `measure`/`measureAsync` = "Automatic duration calculation") rather than
  building one guarantee two different ways. Metadata field ordering:
  without it, a caller's own metadata object could accidentally (or
  maliciously) overwrite `operation`/`durationMs`/`success`/`category`
  with an identically-named key, silently corrupting the one piece of
  data this whole service exists to produce correctly.
- **Alternatives:** injecting `RequestContextService` into
  `PerformanceLogger` "for completeness" (rejected — no method would
  actually need it, since nothing here establishes or reads context
  directly; matches this project's standing discipline against
  unjustified abstraction); making `startTimer`/`endTimer` also
  exception-safe internally via some kind of registered-timer-cleanup
  bookkeeping (rejected — over-engineered for a plain data handle with
  nothing to actually leak; the manual/automatic split already gives
  callers who need the guarantee an explicit, simple way to get it via
  `measure()`); spreading fixed fields before caller metadata (rejected —
  see Why, the opposite order is what actually protects the fixed fields).
- **Affects:** apps/api/src/logging/{performance-logger.service.ts,
  performance-logger.service.spec.ts, types/performance-timer.type.ts,
  types/index.ts, logging.module.ts, index.ts} (new/modified),
  logging/README.md, docs/architecture/backend.md. No `Logger`/
  `RequestContextService`/`LoggerService` changes, no new DI tokens, no
  real call site wired into business code — confirmed via clean
  `lint`/`typecheck`/`build`/`test` (65 passing), identical live boot, and
  direct resolution of `PerformanceLogger` from a live app instance
  proving sync/async timing and exception rethrow-after-logging both work.

## 2026-07-19 — Phase 1.2C.6: ExceptionLoggingFilter via APP_FILTER; AggregateError checked before Error; ExceptionLoggingFilter, not AllExceptionsFilter
- **Decision:** `ExceptionLoggingFilter extends BaseExceptionFilter`
  (`@nestjs/core`), registered via `{ provide: APP_FILTER, useClass:
  ExceptionLoggingFilter }` in `app.module.ts`'s `providers` — not
  `app.useGlobalFilters()` in `main.ts`. `catch()` logs via
  `LOGGER.error()`, then calls `super.catch(exception, host)` unconditionally.
  A `describeException()` helper checks `HttpException`, then
  `AggregateError` **specifically before** the generic `Error` branch
  (since `AggregateError extends Error`), then plain `Error`, then falls
  back to a `safeStringify()`-based description for anything else.
  Renamed from the originally-planned `AllExceptionsFilter` to
  `ExceptionLoggingFilter`.
- **Why:** `APP_FILTER` is Nest's own DI-native mechanism for a global
  filter — Nest instantiates it through the container, injecting `LOGGER`
  via the constructor and `HttpAdapterHost` via `BaseExceptionFilter`'s
  own `@Optional() @Inject()` **property** injection automatically, with
  no manual `app.get()` resolution needed. This is a genuinely different
  situation from Phase 1.2C.5's `HttpLoggingMiddleware` bug — exception
  filters aren't route-matched at all, so `MiddlewareConsumer.forRoutes('*')`'s
  prefix-scoping problem has no equivalent here — confirmed live anyway,
  given that exact prior lesson, rather than assumed. Extending
  `BaseExceptionFilter` and delegating via `super.catch()` is what makes
  "preserve NestJS's default HTTP responses" true by construction, not by
  re-deriving Nest's own response-shaping logic. Checking `AggregateError`
  before `Error` matters because `AggregateError instanceof Error` is
  `true` — without the earlier, more specific branch, every nested error
  an `AggregateError` wraps would silently vanish into the generic `Error`
  case (message/stack only, no `.errors`). The rename avoids confusion
  with a different, broader, still-unbuilt filter: `main.ts`'s original
  Phase 1.2A bootstrap comment named `AllExceptionsFilter` and described
  it as reshaping the HTTP response into RFC 9457 Problem Details — this
  filter deliberately preserves the default shape instead, so reusing that
  name would misrepresent what's built.
- **Alternatives:** `app.useGlobalFilters(new ExceptionLoggingFilter(...))`
  in `main.ts`, resolving `LOGGER` manually via `app.get()` first (rejected
  — `APP_FILTER` is the more idiomatic, less manual mechanism specifically
  because filters, unlike middleware, have a first-class DI-native global
  registration path); checking `Error` before `AggregateError` (rejected —
  see Why, would silently lose nested error detail); building a custom
  circular-safe deep-stringifier with `[Circular]` markers instead of a
  try/catch-and-fall-back (rejected — "must never throw" doesn't require
  preserving structure through a circular reference, and the simpler
  approach is fully sufficient and testable); suppressing Nest's own
  internal console-logging for unknown (non-`HttpException`) errors
  (rejected — that's part of `BaseExceptionFilter`'s own default behavior,
  and selectively skipping part of what `super.catch()` does would violate
  "preserve NestJS's default" just as much as reshaping the response
  would).
- **Affects:** apps/api/src/common/filters/{exception-logging.filter.ts,
  exception-logging.filter.spec.ts, README.md} (new), apps/api/src/
  app.module.ts, apps/api/src/main.ts (stale bootstrap-comment fix — see
  above), docs/architecture/backend.md (matching stale-comment fix),
  apps/api/src/logging/README.md. No `Logger`/`RequestContextService`/HTTP
  logging changes — confirmed via clean `lint`/`typecheck`/`build`/`test`
  (51 passing), identical live boot, and live `curl` verification against
  an unmatched route showing an unchanged default 404 response, exactly
  one exception log plus the existing completion log, and matching
  `requestId`s between them.

## 2026-07-18 — Phase 1.2C.5: HttpLoggingMiddleware registered via app.use(), not MiddlewareConsumer — forRoutes('*') silently scopes to the global prefix
- **Decision:** `HttpLoggingMiddleware` is listed in `app.module.ts`'s
  `providers` (so it's DI-resolvable) but is **not** wired via
  `AppModule implements NestModule { configure(consumer) { consumer.
  apply(HttpLoggingMiddleware).forRoutes('*') } }`, the originally-planned
  approach. Instead, `main.ts` resolves it with `app.get(HttpLoggingMiddleware)`
  and attaches it via raw `app.use(instance.use.bind(instance))`,
  immediately after `NestFactory.create()`, before `setGlobalPrefix()`/
  `enableVersioning()`. Also fixed a real test-mock flaw in
  `http-logging.middleware.spec.ts`: the fake `Response`'s `'finish'`
  callback is scheduled via `setImmediate` at registration time, not
  fired via a later, unrelated synchronous `.emit()` call.
- **Why:** live `curl` testing (not just unit tests, which used mocks and
  couldn't have caught this) showed `MiddlewareConsumer.forRoutes('*')`
  silently scopes matching to `app.setGlobalPrefix()`'s `/api` prefix —
  `GET /health` and `GET /` produced zero log output while `GET /api/v1/*`
  worked. This is a real, meaningful gap: the brief requires logging
  "every completed request," and a foreseeable real consumer (the future
  unprefixed `/health` endpoint, `apps/api/src/health/README.md`'s own
  convention) would have been silently invisible to this middleware
  forever. `app.use()` operates at the Express/HTTP-adapter level, below
  where Nest's prefix-aware routing applies, so it runs for every request
  regardless of prefix. Separately, the test-mock fix was needed because
  `AsyncLocalStorage` only propagates context to continuations genuinely
  tracked by `async_hooks` (promises, timers, real I/O callbacks) — a
  hand-rolled `EventEmitter`-or-plain-object mock whose `.emit()` is called
  later from unrelated, synchronous test code has no causal async_hooks
  relationship to the original `run()` scope, so the previous version of
  these tests would have passed or failed for the wrong reason (they
  initially failed even after switching to a real Node `EventEmitter`,
  which conclusively ruled out "just use a real EventEmitter" as the fix
  and pointed at the actual mechanism: a genuine async boundary has to be
  scheduled from within the synchronous `run()`-scoped registration, not
  triggered synchronously afterward).
- **Alternatives:** keep `MiddlewareConsumer`/`forRoutes('*')` and instead
  exclude the middleware from the global prefix or special-case unprefixed
  routes (rejected — more moving parts than just registering the
  middleware where prefix-awareness doesn't apply in the first place);
  mock `res.emit()` synchronously and accept the context-loss as "good
  enough" for these specific tests (rejected — would validate the wrong
  thing, giving false confidence that concurrent-isolation held when the
  test wasn't actually exercising real `AsyncLocalStorage` propagation).
- **Affects:** apps/api/src/{app.module.ts, main.ts,
  common/middleware/http-logging.middleware.ts (comment only — behavior
  unchanged), common/middleware/http-logging.middleware.spec.ts},
  docs/architecture/backend.md, apps/api/src/logging/README.md. No
  `Logger`/`LogEntry`/`RequestContext` contract changes — confirmed via
  clean `lint`/`typecheck`/`build`/`test` (41 passing), identical live
  boot, and live `curl` verification against both prefixed and unprefixed
  paths, header-reuse vs. generation, and two genuinely concurrent
  requests.

## 2026-07-18 — Phase 1.2C.4: RequestContext structurally assignable to LogContext (no mapper); RequestContextService gets no token and is exported
- **Decision:** `types/request-context.type.ts`'s new `RequestContext`
  (`requestId`/`correlationId` required; `traceId`/`userId`/`sessionId`/
  `ip`/`userAgent` optional) was designed so it is directly structurally
  assignable to `LogContext` (extended with the same four new optional
  fields) — `LoggerService` does `context: requestContext` with no
  transform function. `RequestContextService` (wraps
  `AsyncLocalStorage<RequestContext>`) gets no DI token, unlike `LOGGER`/
  `LOG_FORMATTER`/`LOG_TRANSPORT` — injected by class reference instead.
  It IS exported from both `logging.module.ts` and the public
  `logging/index.ts` barrel, unlike `LoggerService`/`JsonLogFormatter`/
  `ConsoleLogTransport`, which stay internal. No `.clear()`/`.exit()`
  method.
- **Why:** a required field is assignable to the same field made optional,
  so once `LogContext` carried the same five extra fields `RequestContext`
  needed, the two types became compatible by construction — writing a
  mapping function would duplicate a field list that's already guaranteed
  to match by the type checker, and any future drift between the two
  types breaks that one assignment at compile time instead of silently
  losing fields at runtime. No token for `RequestContextService`: `LOGGER`/
  `LOG_FORMATTER`/`LOG_TRANSPORT` exist to abstract over genuinely
  swappable implementations; `RequestContextService` wraps one Node
  built-in with no anticipated second implementation, so a token+interface
  pair would be unjustified abstraction — ordinary NestJS class injection
  is the right amount of ceremony. Exporting it (unlike the Phase 1.2C.3
  classes): a future middleware, living outside `apps/api/src/logging/`,
  genuinely needs to call `.run()` once per request — blocking that with
  no export would just force a follow-up change to this module later. No
  `.clear()`: `AsyncLocalStorage`'s own scoping already makes "cleared"
  (`getContext()` returns `undefined`) the state outside any `run()` —
  adding an explicit method with no demonstrated caller would be
  speculative API surface.
- **Alternatives:** a separate mapping function
  (`toLogContext(requestContext)`) translating field-by-field (rejected —
  see Why, duplicates a list the compiler already enforces); a
  `REQUEST_CONTEXT` Symbol token matching the other three (considered,
  the brief left it as "(if required)" — rejected, no swappable
  implementation to justify it); keeping `RequestContextService` internal
  like `LoggerService` (rejected — it has a real, near-term external
  consumer that `LoggerService` never will); adding `.clear()` "to be
  complete" (rejected — no caller, and this project's discipline is
  against building API surface nothing uses yet).
- **Affects:** apps/api/src/logging/{types/log-context.type.ts (extended),
  types/request-context.type.ts (new), types/index.ts,
  request-context.service.ts (new), request-context.service.spec.ts (new),
  logger.service.ts, logger.service.spec.ts, logging.module.ts, index.ts}
  (new/modified), logging/README.md, docs/architecture/backend.md. No new
  env vars, no `Logger` interface change, no middleware — confirmed via
  clean `lint`/`typecheck`/`build`/`test` (33 passing), identical live
  boot, and a manual script proving no-context calls are byte-identical
  to Phase 1.2C.3, an active context merges in correctly, and two
  staggered concurrent contexts never cross-contaminate.

## 2026-07-18 — Phase 1.2C.3 review: Error objects in metadata silently serialized to "{}"; zero test coverage across the whole logging subsystem
- **Decision:** Fixed `JsonLogFormatter.format()` to pass a `JSON.stringify`
  replacer that special-cases `Error` instances (`{ name, message, stack }`)
  anywhere in the entry, including nested inside `metadata` — plain
  `JSON.stringify` renders any `Error` as `"{}"` since `Error`'s own
  properties (`message`, `stack`) are non-enumerable. Also added the
  logging subsystem's first tests: `logger.service.spec.ts`,
  `json-log-formatter.spec.ts`, `console-log-transport.spec.ts` (22
  tests) — Jest was already fully configured
  (`@nestjs/testing`/`ts-jest` installed, `jest` config present in
  `package.json`) but zero test files existed anywhere in `apps/api`
  across every phase from 1.2A through 1.2C.3.
- **Why:** `logger.error('X failed', { error: err })` — logging a caught
  exception's own error object — is close to the single most common real
  call pattern for `.error()`/`.fatal()` in any app; silently losing all
  diagnostic detail behind `"{}"` would defeat this subsystem's entire
  purpose the first time it mattered. The test gap is CLAUDE.md's own
  non-negotiable rule ("every feature ships with tests"), and `LoggerService`
  by this phase had real branching logic (level filtering, conditional
  entry construction) squarely worth covering — unlike earlier phases'
  pure-config/pure-type deliverables, this was the first genuinely
  unit-testable behavior in the subsystem.
- **Alternatives:** leave `Error` serialization as-is and document the gap
  (rejected — a near-certain occurrence, not a remote edge case, and cheap
  to fix correctly); write tests retroactively for Phase 1.2C.1/1.2C.2 too
  (rejected — those phases are closed/certified with no branching logic to
  test; scope creep past what this review pass covers); guard against
  circular references / `BigInt` in metadata too (considered — rejected as
  more speculative than the Error case, no demonstrated occurrence anywhere
  in this codebase, and this project's own discipline is against handling
  scenarios that can't happen yet).
- **Affects:** apps/api/src/logging/formatters/json-log-formatter.ts
  (modified), logger.service.spec.ts, json-log-formatter.spec.ts,
  console-log-transport.spec.ts (all new). No runtime behavior change
  outside the Error-serialization fix itself — confirmed via clean
  `lint`/`typecheck`/`test` (22 passing) after the fix.

## 2026-07-18 — Phase 1.2C.3: formatter/transport get their own DI tokens; console transport not env-gated; format left unconsumed
- **Decision:** `LoggerService` (bound to `LOGGER`) never injects
  `LogFormatter`/`LogTransport` concrete classes — it injects `LOG_TRANSPORT`
  only (a new token), and `ConsoleLogTransport` itself injects a separate
  new `LOG_FORMATTER` token, since `LogTransport.write(entry): void`'s
  existing signature (fixed in Phase 1.2C.1) makes formatting the
  transport's job, not the logger's. `ConsoleLogTransport` is not
  environment-gated — it writes on every `NODE_ENV`, not just development.
  Only `JsonLogFormatter` was built; `loggerOptions.format === 'pretty'`
  has no formatter to select and is left an honest, documented gap rather
  than a fake conditional with one real branch.
- **Why:** separate DI tokens for formatter/transport are what make "modular
  so transports and formatters can be replaced without changing consumers"
  (this phase's own requirement) literally true — a future
  `PrettyLogFormatter`/`FileLogTransport` is a rebind in
  `logging.module.ts`'s `providers`, zero edits to `LoggerService` or
  anything injecting `LOGGER`. Not env-gating the console transport avoids
  a worse failure mode than an admittedly interim implementation: silently
  dropping every production log line with no replacement transport
  configured. Writing a `format === 'pretty' ? new PrettyLogFormatter() :
  new JsonLogFormatter()` branch with only one real arm would be fake
  completeness — the same anti-pattern this project has avoided everywhere
  else (e.g. never faking placeholder config domains with content).
- **Alternatives:** have `LoggerService` inject `LOG_FORMATTER` directly
  and format before handing a string to the transport (rejected — would
  require changing `LogTransport`'s interface signature from
  `write(entry: LogEntry)` to `write(line: string)`, a Phase 1.2C.1
  contract this phase isn't scoped to revise); gate `ConsoleLogTransport`
  by `NODE_ENV === 'development'` to literally match the brief's
  "(development only)" label (rejected — see Why); build a
  `PrettyLogFormatter` now so `format` has a real consumer (rejected — out
  of this phase's explicit scope, which lists only "JSON log formatting").
- **Affects:** apps/api/src/logging/{logger.service.ts,
  formatters/json-log-formatter.ts, transports/console-log-transport.ts,
  constants/log-level-severity.constant.ts, tokens/logging.tokens.ts,
  logging.module.ts} (new/modified), logging/README.md,
  docs/architecture/backend.md. No env vars added, no runtime behavior
  change to anything outside `logging/` — confirmed via clean
  `lint`/`typecheck`/`build`, identical live boot, and direct invocation of
  the resolved `LOGGER` producing correctly level-filtered, correctly
  console-routed JSON output against the real `.env`.

## 2026-07-18 — Phase 1.2C.2: loggerOptions config lives in logging/, not config/, registered via forFeature()
- **Decision:** New `apps/api/src/logging/config/logger-options.config.ts`
  — a `registerAs('loggerOptions', ...)` factory assembling `LoggerOptions`
  (`{ level, format }`) from the already-validated `LOG_LEVEL`
  (`app.config.ts`) and `LOG_FORMAT` (`config/logging/logging.config.ts`).
  Filed under `apps/api/src/logging/`, not the frozen
  `apps/api/src/config/`, and registered via `LoggingModule`'s new
  `ConfigModule.forFeature(loggerOptionsConfig)` import rather than adding
  it to `config/config.module.ts`'s `load: [...]` array. No new env var,
  no `env.validation.ts` change — both source fields were already
  validated.
- **Why:** Phase 1.2B's RC review froze the Configuration subsystem
  "except for future feature-specific extensions (new domains graduating
  alongside their owning module)" — this is exactly that case: a config
  concern consumed only by the Logging module, not a general-purpose
  domain other subsystems would reuse. `ConfigModule.forFeature()` is
  `@nestjs/config`'s documented mechanism for registering an additional
  namespace from a different module without re-invoking `forRoot()`,
  which keeps `config/config.module.ts` genuinely untouched (zero files
  added or modified there) rather than frozen "in spirit only." Named
  `loggerOptions`, not `logging`, to avoid colliding with the existing
  `config/logging/` namespace (`{ format }`) — two different things
  can't both claim the same `registerAs()` key.
- **Alternatives:** put the new file inside `apps/api/src/config/logging/`
  alongside the existing `logging.config.ts` (rejected — touches the
  frozen folder, and conflates the config subsystem's `logging` namespace
  with the logging subsystem's own config, the exact ambiguity
  `logging/README.md`'s disambiguation note already warns against);
  relocate `LOG_LEVEL`/`LOG_FORMAT` into one new namespace instead of
  reading both existing ones (rejected — moving already-shipped fields
  for this phase's convenience is the same unjustified-churn call already
  rejected twice before, in 1.2B.1's CORS placement and 1.2B.3's domain
  design).
- **Affects:** apps/api/src/logging/{config/logger-options.config.ts,
  config/index.ts, logging.module.ts} (new/modified), logging/README.md,
  docs/architecture/configuration.md (§1 + §5 note on the 9th namespace).
  No env vars added, no runtime behavior change — confirmed via clean
  `lint`/`typecheck`/`build`, identical live boot showing `LoggingModule
  dependencies initialized`, and direct invocation of the new factory
  resolving `{ level: 'info', format: 'json' }` against the real `.env`.

## 2026-07-18 — Phase 1.2C.1 review: Logger's missing context-parameter rationale, roadmap named concretely, logging/logging naming disambiguated
- **Decision:** Three documentation/comment fixes, zero interface or type
  changes: (1) added a comment to `logger.interface.ts` explaining why its
  methods take `metadata` but not `context` — `LogContext` is ambient
  (AsyncLocalStorage-populated by a future concrete implementation), not
  threaded through call sites, which wasn't obvious just from comparing
  `Logger`'s signatures to `LogEntry`'s fields; (2) rewrote
  `logging/README.md`'s "Future roadmap" from a vague "not yet scheduled
  into named sub-phases" into a concrete mapping onto the 7 named
  sub-phases this review's own brief provided (1.2C.2 Logging
  Configuration through 1.2C.8 Audit Logging); (3) added an explicit
  disambiguation note to the top of `logging/README.md` distinguishing
  `apps/api/src/config/logging/` (one config value) from
  `apps/api/src/logging/` (this subsystem) — the same pattern already
  used for `config/database/` vs `apps/api/src/database/`, now stated
  for `logging` too instead of left implicit.
- **Why:** all three are exactly the class of gap this review's own
  checklist asks for — a design decision correct in the code but not
  obvious from reading the interface alone (context vs. metadata); a
  roadmap that could be made concrete now that concrete phase names
  exist, whereas it couldn't when the architecture doc was first written;
  and a naming collision between two "logging" folders that the
  established `database`/`health` precedent had already taught this
  project to disambiguate explicitly, just not yet applied here.
- **Alternatives:** leave the roadmap generic (rejected — this review
  literally supplies the names, making "not yet scheduled" stale the
  moment it was written); add a `context` parameter to `Logger`'s methods
  instead of documenting why there isn't one (rejected — would require
  every future call site to manually thread ambient data that
  `AsyncLocalStorage` is specifically designed to avoid threading
  manually; a real design regression, not a fix).
- **Affects:** apps/api/src/logging/interfaces/logger.interface.ts,
  apps/api/src/logging/README.md. No runtime behavior change — confirmed
  via clean rebuild and identical live boot.

## 2026-07-18 — Phase 1.2C.1: logging architecture — reuse config's enums, split interfaces/types by role, omit 3 suggested folders
- **Decision:** `apps/api/src/logging/`'s `LogLevel`/`LogFormat`/
  `EnvironmentMode` types are exact mirrors of `env.validation.ts`'s
  already-validated `LOG_LEVEL`/`LOG_FORMAT`/`NODE_ENV` enums, not new
  independently-defined ones. `interfaces/` holds only behavioral
  contracts with methods (`Logger`, `LogTransport`, `LogFormatter`,
  `AuditLogger`); `types/` holds plain data shapes (`LogEntry`,
  `LogContext`, `LogMetadata`, `AuditEvent`, `LoggerOptions`) — the
  brief's own examples listed these across both categories loosely
  (e.g. "LogEntry" under Interfaces, "LoggerContext" under Types); this
  is the one consistent rule used to resolve that instead of copying the
  ambiguity into the codebase. `AuditLogger` is a distinct interface from
  `Logger`, not a method on it. Three of the brief's suggested folders
  (`decorators/`, `utils/`, `constants/`) were not created — nothing
  non-speculative belongs in any of them yet.
- **Why:** a second "log level" vocabulary in the same app, subtly
  different from config's validated one, is exactly the kind of avoidable
  cross-subsystem inconsistency this project's own review passes have
  repeatedly caught and fixed elsewhere (Phase 1.2B.1's placeholder-count
  drift, 1.2B.3's stale doc references) — better not to introduce it in
  the first place. `AuditLogger`'s separation mirrors Phase 1's own
  `AuditLog` Prisma model being a distinct, immutable table from
  `ActivityLog`, and CLAUDE.md's explicit audit-logging mandate. The
  three omitted folders would each need either a decorator with no
  interceptor to read its metadata (interceptors are explicitly out of
  scope this phase) or a utility/constant with no current caller —
  exactly the "placeholder files that serve no architectural purpose"
  this phase's own brief says not to create.
- **Alternatives:** define `LogLevel` etc. independently in the logging
  subsystem (rejected — see Why); merge `AuditLogger` into `Logger` as a
  method (rejected — loses the distinct durability/access-boundary the
  brief and CLAUDE.md both call for); scaffold `decorators/`/`utils/`/
  `constants/` as README-only placeholders anyway, matching this
  project's earlier Phase 0 convention for reserved-but-empty folders
  (considered — rejected specifically because this phase's brief is more
  explicit and more recent than that general convention: "do not create
  placeholder files that serve no architectural purpose").
- **Affects:** apps/api/src/logging/** (new), apps/api/src/app.module.ts
  (wires in the empty module), docs/architecture/backend.md (folder-
  structure diagram entry).

## 2026-07-18 — Phase 1.2B RC stabilization: removed tsconfig-paths, recommend one consolidated commit
- **Decision:** Removed the unused `tsconfig-paths` devDependency from
  `apps/api/package.json` (flagged as unused across 4 prior review passes,
  never wired to an actual path alias) rather than deferring it a fifth
  time. Also: reviewed `git log` and found the last real commit predates
  this entire session (DB audit, backend foundation, and all of Phase
  1.2B) — every file `git status` shows uncommitted spans multiple named
  phases, and several files (`main.ts`, `package.json`, `.env.example`)
  were touched cumulatively across phases with no intermediate commits.
  Recommending ONE consolidated commit for everything currently
  uncommitted, with a commit message that honestly describes its full
  scope, rather than a config-only message that would misdescribe what
  `git add .` actually stages.
- **Why:** `tsconfig-paths` — nothing in the repo ever referenced it
  (confirmed by grep); a final RC/stabilization pass is exactly the point
  to resolve a repeatedly-flagged loose end instead of carrying it
  forward again. Commit scope — splitting cleanly into per-phase atomic
  commits now would require interactive hunk-by-hunk staging (`git add
  -p`), which this project's own tooling guidance disallows (`-i` flag
  prohibited) and which is risky to approximate manually across
  cumulatively-edited files without a real risk of mis-splitting a hunk
  into the wrong commit. A single honest commit is safer than a
  dishonest-looking narrow one.
- **Alternatives:** leave `tsconfig-paths` flagged again (rejected — this
  is the designated stabilization checkpoint); attempt manual per-phase
  commit splitting (rejected — unsafe given the interactive-staging
  restriction and the real entanglement in shared files).
- **Affects:** apps/api/package.json, pnpm-lock.yaml,
  docs/architecture/backend.md (stale reference to the now-removed
  dependency also fixed).

## 2026-07-18 — Phase 1.2B.5 final audit: one stale reference survived three prior reviews
- **Decision:** Fixed `backend.md`'s "Config organization: two namespaces
  now, more added on demand" architecture-decision entry — accurate when
  written in Phase 1.2A, never updated as `app`/`database` grew to 8 real
  domains across Phases 1.2B.1–1.2B.3. Reworded to state its original
  Phase-1.2A scope explicitly and point at `configuration.md` §1/§5 for
  the current, authoritative count.
- **Why:** worth calling out specifically — this entry survived the
  1.2B.1, 1.2B.2, and 1.2B.3 review passes undetected, each of which
  checked `backend.md` for staleness and found other real issues each
  time (getOrThrow references, the placeholder-domain list) but missed
  this one. It was found only on this final, dedicated full-file re-read
  of every doc. Confirms the value of a last comprehensive pass rather
  than assuming three prior clean reviews mean nothing is left — nothing
  else has ever come up "clean the first time" in this subsystem's whole
  review history, so a fourth miss would have been the surprising outcome,
  not this one.
- **Affects:** docs/architecture/backend.md only. No source code, no
  runtime behavior.

## 2026-07-18 — Phase 1.2B.4 review: troubleshooting entries needed explicit resolutions
- **Decision:** Restructured all 7 `configuration-guide.md` troubleshooting
  entries into explicit *Likely cause / Debug / Fix* parts (previously
  cause-and-step were merged into prose and the fix was often left
  implied rather than stated). Also fixed a small inaccuracy in
  `app.config.ts`'s comment (referenced a "README" cross-reference for
  `logging/` that no longer exists — `logging/` graduated to a real
  `.config.ts` file in Phase 1.2B.3) and aligned one inline schema comment
  (`// logging`) to the em-dash style every other domain's grouping
  comment already used.
- **Why:** the review brief explicitly asked to verify each troubleshooting
  entry has symptoms/causes/debugging-steps/*resolution* — an implied fix
  a reader has to infer isn't the same as one stated as an action to take,
  and the point of a troubleshooting guide is to end at "do this," not
  "here's context, good luck."
- **Affects:** docs/architecture/configuration-guide.md,
  apps/api/src/config/{app/app.config.ts, env.validation.ts} (comments
  only — confirmed via clean rebuild + identical live boot).

## 2026-07-18 — Phase 1.2B.4: a new practical guide, not more architecture doc
- **Decision:** New `docs/architecture/configuration-guide.md` rather than
  expanding `configuration.md`/`validation.md` further — usage examples,
  troubleshooting, and the extension checklist are a different *kind* of
  content (task-oriented, "how do I...") from those two docs'
  architecture/rationale focus, and mixing the two would violate the
  brief's own "do not duplicate information."
- **Why:** each of the 3 existing architecture docs already had a clear,
  distinct job (backend shell, config structure, validation system) — a
  4th doc for "how a developer actually uses this" fills a real gap
  without overlapping any of them, cross-linked from all three instead of
  copied into any of them.
- **Alternatives:** append examples/troubleshooting to `configuration.md`
  (rejected — that doc is already long and architecture-focused; bolting
  on task-oriented content would blur its purpose); split troubleshooting
  into its own doc separate from the examples/extension-guide (rejected —
  overkill for content this size, and a developer debugging a startup
  failure benefits from the examples being one scroll away).
- **Affects:** docs/architecture/configuration-guide.md (new);
  configuration.md/validation.md/backend.md (one cross-link each, added).

## 2026-07-18 — Phase 1.2B.3 review: docs hadn't caught up to the typed-injection switch
- **Decision:** Found and fixed 3 stale references in `docs/architecture/
  backend.md` left over from adopting the typed-injection pattern: the
  startup-flow step still said `main.ts` reads config via
  `ConfigService.get('app.port')` (it now uses
  `app.get(appConfig.KEY)`); the §4 Configuration summary showed the same
  stale example; the folder-structure table still listed `security`/
  `cache`/`queue`/`logging`/`swagger` as placeholders and omitted `health`
  entirely, both wrong after Phase 1.2B.3 graduated 6 domains. Also
  tightened the "Deferred to Phase 1.2B" list's Swagger/health/logging/
  Redis/queue line, which read as "nothing exists" when actually their
  *configuration* is real now, just not their implementation.
- **Why:** code and docs were edited in the same phase but the docs edits
  missed these three spots — exactly the class of drift this session's
  review passes exist to catch (same pattern as the 1.2B.1 review finding
  a wrong placeholder count, and the 1.2B.2 review finding stale phase
  references). No code changes were needed — the implementation itself
  was already correct and live-verified; only the documentation had
  fallen behind it.
- **Affects:** docs/architecture/backend.md only.

## 2026-07-18 — Phase 1.2B.3: new infra env vars over relocation or empty modules; @Inject(x.KEY) as the standard access pattern
- **Decision:** Asked the user directly rather than guessing how to give
  `security`/`logging`/`swagger`/`health` real content, since none of them
  had existing env vars (unlike `cache`/`queue`, which reuse `REDIS_URL`).
  Chose: add a small number of new, minimal, safe-defaulted infra-level env
  vars per domain (`RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`, `LOG_FORMAT`,
  `SWAGGER_ENABLED`/`SWAGGER_PATH`, `HEALTH_PATH`) rather than relocating
  already-shipped fields (`CORS_ALLOWED_ORIGINS`/`LOG_LEVEL` stay under
  `app`) or leaving the domains as hardcoded-only shells. Also formally
  adopted `@Inject(xConfig.KEY)`/`ConfigType<typeof xConfig>` (or
  `app.get(xConfig.KEY)` outside DI) as the one recommended config-access
  pattern project-wide, demonstrated in `main.ts` in place of the previous
  phase's `ConfigService.getOrThrow()` calls.
- **Why:** the new env vars are platform-internal toggles (rate-limit
  thresholds, log format, doc/health paths), not third-party product/
  vendor integrations, so they don't conflict with "no speculative
  configuration for future products" — that exclusion targets things like
  AI providers and payment gateways, not the app's own operational knobs.
  Relocating `CORS_ALLOWED_ORIGINS`/`LOG_LEVEL` was considered and
  rejected: moving already-shipped, working config for naming-purity alone
  is unjustified churn when the two fields have no logical overlap with
  `security`/`logging`'s actual new content anyway. The typed-injection
  pattern was chosen over always-generic `ConfigService<T>` because it
  composes directly with this project's namespace-per-domain design
  (inject exactly the one namespace a provider needs, full compile-time
  shape checking, no magic strings) — and `database.config.ts`'s Phase
  1.2B.1 precedent (real config, zero live consumption yet) justified
  giving `swagger`/`health` genuine typed shapes now even though no
  Swagger UI or health controller exists yet.
- **Alternatives:** hardcoded-only config for all 4 ambiguous domains
  (considered, offered to the user as an option — not chosen); relocating
  CORS/LOG_LEVEL into the newly-real domains (considered, offered as an
  option — not chosen, see above); keeping `ConfigService.get()` as the
  default pattern (rejected — loses type safety for no benefit once every
  domain is namespaced).
- **Affects:** apps/api/src/config/{security,logging,swagger,health,cache,
  queue}/*, apps/api/src/config/env.validation.ts, apps/api/src/main.ts,
  apps/api/.env.example, docs/architecture/{configuration.md,
  validation.md}.

## 2026-07-18 — Phase 1.2B.2 review: PORT messages, CORS dedup, getOrThrow
- **Decision:** Follow-up review of the just-implemented env validation
  found and fixed three genuine issues: (1) `PORT`'s Zod error messages
  exposed internal coercion mechanics ("Expected number, received nan")
  rather than plain-English guidance — added a custom message per
  constraint (type/int/positive/max); (2) `CORS_ALLOWED_ORIGINS` didn't
  de-duplicate repeated origins — added a `Set` in the transform; (3)
  `main.ts` read `configService.get('app.port') ?? 4000` — a silent
  fallback that would mask a real config-resolution bug behind a
  plausible-looking default — switched to `getOrThrow()`, which fails
  loudly instead, since `env.validation.ts` already guarantees these keys
  are defined by the time `main.ts` reads them.
- **Why:** the review's explicit brief asked to check for "incorrect
  defaults... weak error handling... hidden edge cases" — all three are
  exactly that class of issue, found by reading the code adversarially
  rather than re-trusting the prior implementation pass. Verified with a
  12-case edge-case sweep run against the real compiled `validateEnv()`
  (missing/invalid URL/invalid port ×3/invalid enum/invalid boolean/empty
  string/whitespace/duplicate CORS/trailing comma/empty CORS list) — all
  12 behave as intended; full results in
  `docs/architecture/validation.md` §8.
- **Reviewed and deliberately NOT changed:** the double-printed error
  (clean Nest log + separate raw Node stack trace) on a validation
  failure. Root cause: `ConfigModule.forRoot()`'s `validate` option is
  evaluated inside `@Module()` decorator metadata, which runs at
  `require()`-time — before `main.ts`'s `bootstrap()` function body (and
  therefore its `.catch()`) ever executes. The only real fix is splitting
  `main.ts` into a thin entrypoint that registers a process-level
  `uncaughtException` handler *before* importing anything that transitively
  loads `AppModule`/`ConfigModule` — a structural change to the bootstrap
  file layout, explicitly out of scope for a "review and refine, do not
  expand scope" pass. Documented as a real, understood limitation with a
  concrete fix path, not silently left unexplained.
- **Alternatives:** disabling Nest's internal bootstrap error logging
  (rejected — loses real diagnostic value for other future crash types);
  restructuring the entrypoint now anyway (rejected — scope violation,
  no user ask for it, real risk of breaking `pnpm start`/`pnpm dev` for
  marginal cosmetic benefit).
- **Affects:** apps/api/src/config/env.validation.ts, apps/api/src/main.ts,
  docs/architecture/{validation.md, backend.md}.

## 2026-07-18 — Phase 1.2B.2: Zod for env validation; fail-fast is Nest/Node's default handling, not a custom catch
- **Decision:** Chose Zod over Joi for `env.validation.ts` (TS-first
  inference, no extra `@types` package, structured `safeParse()` errors).
  One schema, one cached `validateEnv()` call consumed by both
  `ConfigModule`'s `validate` option and the `app`/`database` `registerAs()`
  factories — no duplicated parsing rules. Added `main.ts`'s
  `bootstrap().catch()` for genuine async bootstrap errors, but documented
  (not assumed) that it does **not** fire for `ConfigModule` validation
  failures specifically — those throw synchronously at `require()`-time
  inside `@Module()` decorator evaluation, before `bootstrap()`'s function
  body runs at all. Nest's own internal error handling + Node's default
  uncaught-exception handler produce the actual fail-fast behavior for
  that path.
- **Why:** live-tested rather than assumed. Initially wrote a `main.ts`
  comment claiming the `.catch()` would produce a clean, stack-trace-free
  error — capturing real output (removing `DATABASE_URL`, then
  `PORT=notanumber`) showed a stack trace appears regardless (Node's
  default handler), and traced it to the decorator-evaluation timing.
  Corrected the comment and `validation.md` to describe what actually
  happens instead of what was assumed to happen — matches this session's
  standing practice of verifying claims against real runs, not code
  review alone.
- **Alternatives:** trying to suppress the stack trace entirely (rejected
  — would mean either disabling Nest's own internal bootstrap error
  logging, which has real diagnostic value, or restructuring
  `ConfigModule.forRoot()` away from the standard `imports: [...]` static
  pattern for no real benefit); leaving the inaccurate comment as
  "close enough" (rejected — the whole point of this phase is no runtime
  surprises, so documentation describing a mechanism that doesn't actually
  fire is exactly the kind of surprise to avoid).
- **Affects:** apps/api/src/{main.ts, config/env.validation.ts,
  config/config.module.ts, config/app/app.config.ts,
  config/database/database.config.ts}, docs/architecture/validation.md.

## 2026-07-18 — Phase 1.2B.1: config domain boundaries (auth/security, cache/queue) + CORS placement
- **Decision:** Split `auth/` (identity: JWT/session/IdP) from `security/`
  (cross-cutting policy: rate limits, hashing, CSP) as two config domains,
  and `cache/` (Redis-as-cache: TTLs/key-prefixes) from `queue/`
  (Redis-as-queue: job retry/backoff) despite both eventually pointing at
  the same Redis instance. Left `corsAllowedOrigins` under the `app`
  namespace (Phase 1.2A's placement) rather than moving it to the new
  `security/` domain.
- **Why:** config-wise, identity and policy are genuinely different
  reader profiles (a JWT guard needs `auth/`, a rate-limit guard needs
  `security/`; forcing one module to import a shared namespace half of
  whose fields it doesn't use is worse than two small namespaces).
  Same logic for cache vs. queue — one Redis connection, two unrelated
  config shapes. CORS stays put because moving it is a *semantic*
  reclassification (is CORS "app-level" or "security policy"?) with zero
  structural benefit, and this phase's brief was explicit: relocate
  structure, don't re-litigate ownership calls that already work — "improve
  only if required, do NOT introduce breaking changes."
- **Alternatives:** one `redis/` domain covering both cache and queue
  (rejected — see above); one `identity/` domain covering both auth and
  security (rejected — same reason); moving CORS to `security/` now
  (rejected — flagged in configuration.md as a deliberately-deferred item
  instead, revisit only if `security/` grows real content).
- **Affects:** apps/api/src/config/{auth,security,cache,queue}/README.md,
  docs/architecture/configuration.md §4.

## 2026-07-18 — Phase 1.2A: placeholder resolution + a real start-script bug
- **Decision:** Where the brief asked to "configure... placeholders" for
  CORS/ValidationPipe/exception filters/interceptors while separately
  forbidding implementing their logic, resolved as clearly-labeled comments
  in `main.ts` at the exact bootstrap point each attaches — not actual
  `app.use*()` calls. Also fixed `apps/api/package.json`'s `start` script
  (`node dist/main` → `node dist/src/main`), which has never actually
  worked: `tsconfig.json`'s multi-root `include` list makes `tsc` emit
  under `dist/src/`, not `dist/`.
- **Why:** the placeholder interpretation matches the convention Phase 0
  already set for `common/`/`jobs/`/`modules/*/` (folder + README + "No
  implementation"), so this phase doesn't invent a second, inconsistent
  meaning of "placeholder." The `start` script fix is a genuine,
  independently-verifiable bug (confirmed by actually running
  `node dist/main` — file not found — then `node dist/src/main` — boots
  correctly) discovered while validating this phase's own bootstrap work;
  leaving a broken `start` script in a phase whose whole point is "make the
  app boot correctly" would defeat the phase.
- **Alternatives:** actually register no-op filter/interceptor/pipe classes
  (rejected — that's implementing them, just with empty bodies, which the
  brief explicitly forbids); leave `start` broken and flag it instead of
  fixing (rejected — same "fix genuine issues discovered along the way"
  precedent as the Phase 1 database audit's seed.ts fix); change
  `tsconfig.json`'s `include`/`rootDir` instead of the `start` script
  (rejected — bigger, unnecessary structural change for a one-line fix,
  and `tsconfig.json`'s current multi-root include is deliberate — it's
  also how `prisma/seed.ts` gets typechecked).
- **Affects:** apps/api/main.ts, apps/api/package.json,
  docs/architecture/backend.md.

## 2026-07-17 — Phase 1 production-readiness audit: fixed a real upsert/partial-index bug
- **Decision:** Replaced `seed.ts`'s `tx.role.upsert()`, `tx.user.upsert()`,
  and `tx.setting.upsert()` calls with explicit find-then-create/update,
  instead of trying to make Prisma's `.upsert()` work against a partial
  unique index (e.g. via a raw-SQL escape hatch or reverting to a
  full-table unique index).
- **Why:** live-database testing (this audit's whole point) surfaced that
  Prisma's generated `ON CONFLICT (col1, col2)` SQL cannot target a partial
  unique index (`WHERE deleted_at IS NULL`) — Postgres error `42P10` on
  every affected table, 100% reproducible, not an edge case. Reverting to a
  full-table unique index would silently reintroduce the exact bug Phase
  1.1B's partial-index migration exists to prevent (blocking email/key
  reuse after a soft delete). A raw-SQL `ON CONFLICT (...) WHERE
  deleted_at IS NULL DO UPDATE ...` escape hatch was considered and
  rejected — it works but re-implements what Prisma's query builder
  already does correctly for `create`/`update`, for marginal benefit over
  a plain find-then-write.
- **Alternatives:** raw-SQL upsert per call site (rejected — needless
  complexity for 3 call sites); revert partial indexes to full-table
  unique indexes (rejected — reopens the soft-delete-blocks-reuse bug this
  migration fixed); leave `seed.ts` broken and flag it for the user to fix
  (rejected — this is squarely "fix genuine issues discovered during the
  audit," not new business logic).
- **Affects:** apps/api/prisma/seed.ts,
  docs/architecture/database-schema.md §8 (new operational note — flagged
  as required reading for Phase 1.2's repository layer, which will hit the
  same landmine on any table with a partial unique index if it uses
  `.upsert()` naively).

## 2026-07-17 — Phase 1.1B: RLS role/policy model
- **Decision:** Two runtime Postgres roles (`antrique_app`, `antrique_service`),
  no passwords committed. Three named policies per tenant table
  (`tenant_isolation`, `platform_admin_override`, `service_maintenance_override`),
  the latter two scoped `TO` their specific role so a session-variable bug in
  one code path can't borrow the other path's cross-tenant access. Append-only
  tables (payments/activity_logs/audit_logs) get UPDATE/DELETE revoked at the
  grant layer instead of relying on a trigger or RLS to prevent mutation.
- **Why:** the brief asked for "Admin policies" and "Service role policies" as
  distinct deliverables; a single BYPASSRLS admin role would have been a
  standing security risk (any compromised credential on that role = instant
  full cross-tenant breach) — session-variable-gated overrides on the existing
  roles, authorized by the app layer's RBAC check *before* the flag is ever
  set, keep RLS as the backstop CLAUDE.md calls for rather than a second,
  parallel authorization system.
- **Alternatives:** a dedicated `antrique_admin` BYPASSRLS role (rejected —
  see above); a single shared override flag for both admin and service paths
  (rejected — would lose the role-scoping defense-in-depth).
- **Affects:** apps/api/prisma/migrations/20260717091500_row_level_security/,
  docs/architecture/database-schema.md §9.

## 2026-07-17 — Phase 1.1B: seed script gap (Services / Blog Categories)
- **Decision:** Did not add `Service` or `BlogCategory` tables to satisfy the
  seed-data brief. Seeded realistic service names into the existing
  `Lead.serviceInterest` free-text array instead; skipped blog categories
  entirely (no field to put them in).
- **Why:** Phase 1.1B's rules say not to modify the approved database design
  without a genuine defect — adding tables to make a seed script's item list
  complete would be a schema change smuggled in sideways, not a seed-data
  decision.
- **Alternatives:** add the tables (rejected — out of this phase's authority);
  silently drop the requirement without flagging it (rejected — the user
  should get to decide whether first-class Service/BlogCategory tables are
  actually wanted, not have that decided for them by omission).
- **Affects:** apps/api/prisma/seed.ts, docs/architecture/database-schema.md §10.

## 2026-07-17 — Phase 1.1A review, second pass
- **Decision:** Re-ran the Phase 1.1A review programmatically instead of
  re-trusting the first pass's manual read; found and fixed 2 small
  remaining gaps — `Session.updatedAt` missing, and `Payment` missing the
  `(tenant_id, status)` index that §4 of database-schema.md already
  documented as schema-wide (doc said it existed; schema didn't have it).
- **Why:** a script that lists every field per model catches gaps a manual
  read misses, even on a schema that was already reviewed once.
- **Alternatives:** treat the first pass as final and skip re-verification
  (rejected — the doc/schema drift on Payment's index wouldn't have
  surfaced otherwise).
- **Affects:** apps/api/prisma/schema.prisma, docs/architecture/database-schema.md.

## 2026-07-16 — Phase 1.1A final database review
- **Decision:** Approved Phase 1.1A after adding explicit `onDelete`
  referential actions to all 62 relations, audit timestamps to
  `QuotationItem`/`InvoiceItem`, and 4 composite indexes (Task/Milestone/
  Invoice `dueDate`, Task `assigneeId+status`). Full report in
  docs/architecture/database-schema.md §7.
- **Why:** `database.md`'s deletion-behavior policy (cascade/restrict/set-
  null per relation) was documented in prose but never actually written
  into `schema.prisma` — the one place in this phase capable of expressing
  it. Left as-is, every FK would have fallen back to Prisma's implicit
  per-relation default instead of the intended policy.
- **Alternatives:** ship Phase 1.1A as-is and catch this in Phase 1.1B's
  migration review instead (rejected — cheaper to fix in the schema DSL now
  than to discover it as a migration diff later).
- **Affects:** apps/api/prisma/schema.prisma, docs/architecture/database-schema.md.

## 2026-07-16 — DB tooling: Prisma
- **Decision:** Prisma (7.8.0) for schema + migrations + client, over
  node-pg-migrate+Kysely or raw pg. Phase 1.1A shipped schema-only
  (`apps/api/prisma/schema.prisma`, 27 models) — see
  docs/architecture/database-schema.md for the full design rationale.
- **Why:** explicit user direction.
- **Alternatives:** node-pg-migrate+Kysely (lighter, more RLS-native, was the
  standing recommendation before this decision — see blockers.md for the
  now-superseded open question it resolves).
- **Affects:** apps/api/prisma/*, future migrations under apps/api/prisma/migrations/.
  Note: Prisma 7 moved the datasource `url` out of schema.prisma into a
  `prisma.config.ts` not yet created — first thing Phase 1.1B needs.

## 2026-07-15 — docs/implementation file contents were mislabeled
- **Decision:** re-mapped each file in docs/implementation/ to match its filename
  (progress.md, blockers.md, decisions.md, README.md, and sprint-01..06.md each
  had another file's content). Added sprint-05.md (was missing; its content was
  sitting in sprint-04.md).
- **Why:** files were untracked and had never been committed correctly; using them
  as-is would have misdirected status tracking and checkbox updates
- **Alternatives:** leave as-is (rejected — defeats the point of these files)
- **Affects:** docs/implementation/*

## 2026-07-14 — Repo layout: monorepo
- **Decision:** single monorepo (pnpm workspaces), apps/web + apps/api + packages/*
- **Why:** shared types between front and back; two-workloads-one-platform
- **Alternatives:** two separate repos (rejected — type drift, coordination cost)
- **Affects:** whole repo

## 2026-07-14 — Named tech = defaults
- **Decision:** Next.js, Node/TS, PostgreSQL, Redis, managed IdP, hosted payments
- **Why:** lean team, India-first, time-to-market; category is the real requirement
- **Alternatives:** documented in docs/architecture/architecture.md
- **Affects:** whole stack

## 2026-07-21 — Milestone 13: audit logging goes through AUDIT_LOGGER, not the DB-persisted AuditLog table
- **Decision:** Login/refresh/permission-denial events (`AuthService`,
  `RolesGuard`/`PermissionsGuard`) log through the existing, previously-unused
  `AUDIT_LOGGER`/`AuditLoggerService` (structured-log-only, Phase 1.2C.8),
  not `AdminModule`'s DB-persisted `AuditLog` table (Milestone 11). The two
  audit trails remain intentionally separate and unqueried-as-one.
- **Why:** `AuthModule` and `common/guards/` are cross-cutting, imported by
  nearly every other module; depending on `AdminModule` (architecturally
  downstream, itself importing five other business modules) to log a denial
  would invert this codebase's one-directional module dependency DAG,
  maintained without exception since Milestone 1. `AUDIT_LOGGER` was already
  built, already global, and had zero real call sites — the same "build the
  capability, wire it up later" situation `PerformanceLogger` was in before
  Milestone 12.
- **Alternatives:** import `AdminModule`'s `AuditRepository` directly into
  `AuthModule`/guards (rejected — inverts the dependency graph); move
  `AuditLog` persistence into a lower shared module both `AuthModule` and
  `AdminModule` could depend on (rejected — real schema/ownership redesign,
  outside this milestone's explicit "no domain-model redesign" scope; a
  legitimate future unification, not this milestone's call to make); skip
  audit logging for authn/authz events entirely (rejected — CLAUDE.md's
  audit-logging rule and this milestone's own explicit requirement).
- **Affects:** apps/api/src/modules/auth/auth.service.ts,
  apps/api/src/common/guards/roles.guard.ts,
  apps/api/src/common/guards/permissions.guard.ts,
  docs/architecture/security.md §9/§13.

## 2026-07-21 — Milestone 13: pnpm.overrides for multer/lodash, NOT for glob
- **Decision:** Applied `pnpm.overrides` (root `package.json`) for `multer`
  (`^2.2.0`) and `lodash` (`^4.18.1`) — both verified via `pnpm why` to
  resolve to one consistent version tree-wide, no conflicting parallel
  install. Did NOT override `glob`, despite a high-severity CLI
  command-injection finding against `glob@10.4.5` (`@nestjs/cli`'s own dev
  dependency).
- **Why:** a blanket `glob` override would force every `glob` resolution in
  the tree to the patched version, including Jest's own deeply-nested
  `glob@7.2.3` dependents (confirmed via `pnpm list glob --recursive` —
  dozens of occurrences vs. one `glob@10.4.5`) — real risk of breaking
  Jest's own internals, which expect the v7 API, for a dev-only CLI tool
  whose vulnerable `-c/--cmd` flag this project's own scripts never invoke.
  `multer`/`lodash` carried no such conflicting-version risk.
- **Alternatives:** override `glob` anyway and fix any resulting Jest
  breakage (rejected — disproportionate risk/effort for a dev-only,
  unreachable finding); leave `multer`/`lodash` un-overridden too, for
  consistency (rejected — those two had zero downside, no reason to leave a
  free fix on the table).
- **Affects:** package.json (root), docs/architecture/security.md §11.

## 2026-07-21 — Milestone 13: JWT algorithm pinned to HS256 explicitly, not left to library defaults
- **Decision:** `TokenService.signAccessToken()`/`signRefreshToken()`/
  `verifyAccessToken()`/`verifyRefreshToken()` now pass an explicit
  `algorithm: 'HS256'`/`algorithms: ['HS256']` option, sourced from a single
  `JWT_ALGORITHM = 'HS256' as const` module constant. Not made
  env-configurable.
- **Why:** a pre-existing test already confirmed `jsonwebtoken`'s own
  defaults reject a forged `alg: none` token, so this was not a fix for an
  exploitable gap as shipped — it's defense in depth, making the algorithm
  an explicit, reviewable line in this codebase rather than an implicit
  property of a dependency's default, and it closes a *different*,
  previously-unverified gap: a token signed with the correct secret under a
  different HMAC algorithm (HS384) would have been accepted before this
  change (new regression test proves it's rejected after). Not
  env-configurable for the same reason Argon2's variant isn't
  (`password/config/hash.config.ts` precedent) — a configurable signing
  algorithm lets an environment accidentally weaken itself, a security
  regression rather than a legitimate environment difference.
- **Alternatives:** leave it to library defaults, unchanged (rejected — the
  HS384 gap above is real, if narrow); import `Algorithm` from
  `jsonwebtoken`'s own types for stricter typing (rejected —
  `@types/jsonwebtoken` isn't a direct/resolvable dependency here; `as const`
  gives the same structural guarantee `@nestjs/jwt`'s own option types need).
- **Affects:** apps/api/src/jwt/token.service.ts,
  apps/api/src/jwt/token.service.spec.ts.

## 2026-07-21 — Milestone 13: request body-size limit is a fixed literal, never computed or env-driven
- **Decision:** `main.ts` disables Nest's default body-parser wiring
  (`NestFactory.create(AppModule, { bodyParser: false })`) and instead
  applies `app.use(json({ limit: '256kb' }))`/
  `app.use(urlencoded({ extended: true, limit: '256kb' }))`, with `'256kb'`
  as a literal string constant, not read from an env var or computed.
- **Why:** this milestone's own dependency audit found `GHSA-v422-hmwv-36x6`
  — a `body-parser` DoS specifically triggered by an INVALID `limit` value
  (unparseable string, `NaN`) silently disabling size enforcement entirely.
  A fixed, always-valid literal can never be invalid, permanently closing
  that CVE's precondition regardless of the installed `body-parser` version
  or any future misconfiguration of an env var. 256KB was sized against the
  actual largest real DTO body in this API (a multi-line order create,
  comfortably under 10KB) — generous headroom, far below DoS scale.
- **Alternatives:** make the limit env-configurable (rejected — reintroduces
  exactly the invalid-value precondition the CVE requires, defeating the
  point); leave Nest's own default body-parser wiring in place (rejected —
  its limit is undocumented-by-this-app and never deliberately chosen).
- **Affects:** apps/api/src/main.ts, docs/architecture/security.md §5.

## 2026-07-21 — Milestone 13: login gets its own stricter, hardcoded throttle; the app-wide limit stays env-configurable
- **Decision:** `POST /auth/login` carries
  `@Throttle({ default: { limit: 5, ttl: 60_000 } })`, hardcoded in
  `apps/api/src/modules/auth/constants/auth.constant.ts`, layered on top of
  the app-wide `ThrottlerModule.forRootAsync()` default (env-driven via
  `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`, previously validated but unused
  until this milestone).
- **Why:** credential-stuffing/brute-force resistance needs a materially
  tighter budget than ordinary API traffic capacity tuning — "5 attempts per
  minute per client" is a fixed security policy a deployment should not
  legitimately need to loosen, unlike the general rate limit, which is a
  genuine capacity knob that varies by deployment traffic profile and
  correctly stays env-configurable.
- **Alternatives:** make the login throttle env-configurable too, for
  consistency with the general limit (rejected — would let a misconfigured
  or overly permissive env value silently reopen the brute-force gap this
  exists to close).
- **Affects:** apps/api/src/modules/auth/auth.controller.ts,
  apps/api/src/modules/auth/constants/auth.constant.ts.

## 2026-07-21 — Milestone 13: forbidNonWhitelisted left false; CSRF/refresh-token-rotation gaps documented, not built
- **Decision:** Global `ValidationPipe`'s `forbidNonWhitelisted` option
  reviewed and deliberately left `false` (extra fields are silently
  stripped, not rejected with 400). CSRF protection and refresh-token
  rotation-with-reuse-detection were assessed and NOT built this milestone.
- **Why:** flipping `forbidNonWhitelisted` to `true` changes response
  behavior for every existing client sending any extra field today (a 400
  instead of silent stripping) — a real behavior change this milestone's own
  "no breaking API changes" constraint argues against making without a
  product decision, not a security fix (the whitelist strip already prevents
  mass-assignment; the only difference is whether the caller is told).
  CSRF has no current attack surface (Bearer-token-only API, zero
  cookie-based sessions anywhere in the codebase) — building it now would be
  speculative. Refresh-token rotation/reuse detection requires new
  session-state tracking — genuinely new business logic and likely schema,
  outside "no domain-model redesign."
- **Alternatives:** flip `forbidNonWhitelisted` anyway (rejected, see above);
  build CSRF protection preemptively (rejected — nothing to protect yet,
  and it would need revisiting the moment cookie-based auth is ever added
  regardless of building it now); build refresh-token rotation this
  milestone (rejected — scope boundary, flagged instead).
- **Affects:** docs/architecture/security.md §6/§13 (documented as reviewed-
  not-changed and as remaining accepted risks respectively).

## 2026-07-22 — Milestone 14: runtime version stamped by CI/Docker, not introspected from package.json
- **Decision:** New `APP_VERSION`/`GIT_COMMIT_SHA` env vars (optional,
  safe dev defaults), surfaced via `GET /runtime`. Populated by
  `infrastructure/docker/api.Dockerfile`'s `runtime` stage build ARGs and
  `.github/workflows/ci.yml`'s Docker-build step (`${{ github.sha }}`),
  never read from `apps/api/package.json` at runtime.
- **Why:** a build-output-layout-independent value survives `dist/`
  restructuring and matches how every other externally-supplied identity
  value in this schema (`DATABASE_URL`, JWT secrets) already works — the
  app reads what it's told, it doesn't go looking. Reading `package.json`
  at runtime would also need `resolveJsonModule` (not currently enabled in
  the shared tsconfig) and careful relative-path handling across the
  dev/compiled-dist/Docker-runtime layouts, which differ from each other —
  real, avoidable fragility for a value that CI/the build pipeline already
  knows unambiguously.
- **Alternatives:** `import { version } from '../package.json'` with
  `resolveJsonModule` (rejected — the path-resolution fragility above,
  plus enabling `resolveJsonModule` project-wide for one value is a bigger
  tsconfig change than this warrants); `process.env.npm_package_version`
  (rejected — unset when the compiled app is started directly via `node
  dist/src/main.js`, e.g. in the Docker runtime image, since nothing
  invoked it through `npm`/`pnpm run`).
- **Affects:** apps/api/src/config/env.validation.ts, apps/api/src/config/app/app.config.ts,
  infrastructure/docker/api.Dockerfile, .github/workflows/ci.yml,
  apps/api/src/modules/admin/runtime.controller.ts.

## 2026-07-22 — Milestone 14: Swagger requires a second, explicit opt-in to run in production
- **Decision:** `SWAGGER_ENABLED=true` in `NODE_ENV=production` now fails
  startup (a new `env.validation.ts` `.superRefine()` check) unless
  `SWAGGER_ALLOW_IN_PRODUCTION=true` is ALSO set.
- **Why:** `SWAGGER_ENABLED` defaults `true` for local-dev convenience — a
  `.env` copied from local dev to a production environment without
  editing it would otherwise silently publish the full API surface
  (every DTO shape, every route) the moment `NODE_ENV` flips to
  `production`. A second, independently-set flag forces a deliberate
  choice rather than an inherited default.
- **Alternatives:** default `SWAGGER_ENABLED` to `false` and require
  explicitly setting it `true` per environment (rejected — loses the
  local-dev convenience of Swagger being on by default with zero config,
  which is the common case this schema optimizes every other default for);
  make `SWAGGER_ENABLED` itself production-aware via a computed default
  (rejected — Zod schema defaults can't easily branch on a sibling field's
  own value within the same per-field declaration; a `superRefine` cross-
  field check is the correct mechanism for exactly this shape of rule, and
  is the same mechanism used for the other three production-safety checks
  added alongside this one).
- **Affects:** apps/api/src/config/env.validation.ts, apps/api/src/main.ts,
  docs/architecture/environment.md.

## 2026-07-22 — Milestone 14: health checks excluded from the global API prefix and URI versioning
- **Decision:** `HealthController` uses `@Controller({ path: 'health',
  version: VERSION_NEUTRAL })`, and `main.ts`'s `setGlobalPrefix('api', {
  exclude: [...] })` exempts `health/(.*)` — the three health routes
  resolve at `/health/live`, `/health/ready`, `/health/startup`, not
  `/api/v1/health/live`.
- **Why:** infrastructure (load balancers, Kubernetes probes) configures a
  health-check path once, typically outside application-level deploy
  automation — requiring that config to change every time the API's own
  version increments would be a real, easily-forgotten operational
  coupling between two things that should be independent. This also
  matches `HEALTH_PATH`'s own already-validated default (`/health`,
  `env.validation.ts`, unused until this milestone).
- **Alternatives:** leave health checks under `/api/v1/health/*` like every
  other route (rejected — the coupling problem above); make `HEALTH_PATH`
  fully dynamic (route path driven by the env var at runtime) — considered
  and rejected: NestJS's `@Controller()` decorator path is fixed at class-
  definition time, before DI/config is available, so true dynamic routing
  would require abandoning the standard controller pattern for a raw
  Express route registered in `main.ts` — a bigger deviation from this
  codebase's established module/controller/service pattern than the value
  (an already-narrow, rarely-changed path) justifies. `HEALTH_PATH`
  remains validated and matches the compiled-in default; making it truly
  dynamic is flagged, not silently ignored.
- **Affects:** apps/api/src/health/health.controller.ts, apps/api/src/main.ts.

## 2026-07-22 — Milestone 14: audit-logging tier for the new runtime endpoint reuses the audit_logs:read precedent, not dashboard:read
- **Decision:** `GET /runtime` gated behind a new `system:read` permission,
  granted only to `admin`/`super_admin` (via their existing full-
  permission-set seed grant) — not `dashboard:read` (Manager+) or a reuse
  of any existing key.
- **Why:** runtime/system metadata (version, uptime, environment,
  dependency health) is operationally sensitive in a different way than
  business KPIs (`dashboard:read`) — it reveals infrastructure detail
  (exact deployed commit, process uptime) more useful to an attacker
  reconnaissance than to a day-to-day Manager role, so it gets the
  stricter "Admin, Super Admin only" tier `audit_logs:read` already
  established, not the broader Manager-inclusive tier the KPI dashboard
  uses.
- **Alternatives:** reuse `dashboard:read` (rejected — wrong tier, would
  over-grant Manager); reuse `audit_logs:read` itself (rejected — a
  distinct resource/concern from the compliance audit trail; conflating
  them would make a future permission audit harder to reason about, the
  same "don't reuse a differently-scoped key" discipline `notifications:manage`
  vs. `notifications:read` already established in Milestone 11).
- **Affects:** apps/api/src/modules/auth/constants/permission.constant.ts,
  apps/api/prisma/seed.ts, apps/api/src/modules/admin/runtime.controller.ts.

## 2026-07-22 — Milestone 14: background job infrastructure ships with zero real jobs, an in-process runner, and no queue backend
- **Decision:** New `apps/api/src/jobs/` — `Job<T>` interface, `JobRunner`
  (in-process, sequential, retries via a plain `RetryPolicy` value object,
  dead-letters via a `DEAD_LETTER_STORE` swap-point token bound to
  `InMemoryDeadLetterStore`). No scheduler, no cron, no Redis/BullMQ/
  RabbitMQ, no real job registered anywhere.
- **Why:** this milestone's own explicit brief: "Implement infrastructure
  only... No scheduled business jobs. No Redis. No BullMQ. No RabbitMQ."
  The same "build the capability, wire it up when a real need exists"
  pattern this codebase has used repeatedly (`PerformanceLogger`,
  `AUDIT_LOGGER` before Milestone 13, `PrismaService.isHealthy()` before
  this same milestone's own `HealthService`) — building the SHAPES a real
  queue-backed system would need (`Job`/`JobContext`/`RetryPolicy`/
  `DeadLetterStore`, all deliberately backend-agnostic) means a future
  Redis/BullMQ-backed implementation replaces `JobRunner`'s own internals
  only, not everything that would call it.
- **Alternatives:** build a real job (e.g. `NotificationRetryJob` against
  Milestone 11's own `FAILED`-state `Notification` model) as a concrete
  proof-of-concept (rejected — explicitly out of this milestone's own
  scope, "No scheduled business jobs"; named as the likely first real
  consumer in `jobs/README.md` instead, not built); skip a `DeadLetterStore`
  abstraction and just log exhausted retries (rejected — the brief
  explicitly names "Dead-letter abstraction" as a required deliverable,
  and a real interface with a swap-point token costs little now while
  keeping a future persistent implementation a drop-in replacement).
- **Affects:** apps/api/src/jobs/*, apps/api/src/app.module.ts.

## 2026-07-22 — Milestone 14: fixed the Docker runtime CMD path bug, added non-root + HEALTHCHECK, without touching apps/web's Dockerfile
- **Decision:** `infrastructure/docker/api.Dockerfile`'s `runtime` stage:
  `CMD` corrected from `dist/main.js` (never existed) to
  `dist/src/main.js`; added a fixed-uid/gid non-root user; added a
  `HEALTHCHECK` against the real `/health/live` endpoint via a Node
  one-liner (no `curl`/`wget` installed in this minimal Alpine image).
  `infrastructure/docker/web.Dockerfile` left untouched.
- **Why:** this milestone's own brief scope is explicitly "the backend"
  ("This milestone completes the backend") — `apps/web` has no real
  feature code yet (still framework scaffold), so hardening its own
  Dockerfile ahead of any real app to harden would be speculative work
  outside this milestone's own boundary. The `CMD` bug was a genuine,
  independently-verifiable defect (confirmed by actually building and
  booting the `runtime` stage's equivalent binary path locally) discovered
  while validating this milestone's own Docker work — the same "fix
  genuine issues found while doing the actual work" precedent this
  project's Phase 1 audit and Milestone 1.2A's `start`-script fix already
  established.
- **Alternatives:** leave `web.Dockerfile` unaudited but ALSO unmentioned
  (rejected — `docs/architecture/deployment.md`/`infrastructure/docker/
  README.md` both explicitly note it as out of scope rather than silently
  omitting it, so a future reader doesn't assume it received the same
  audit); use the image's default `node` user instead of a dedicated
  `antrique` user (rejected — an explicit, reviewable uid/gid is clearer
  than relying on an implicit base-image default that could change across
  `node:22-alpine` releases).
- **Affects:** infrastructure/docker/api.Dockerfile,
  infrastructure/docker/README.md, docs/architecture/deployment.md.

## 2026-07-22 — Milestone 14: CI gets a real migration-validation job and a Docker-build job, but no deploy step
- **Decision:** `.github/workflows/ci.yml` extended with a build-artifact
  upload, a new `migration-validation` job (real, throwaway Postgres
  service container — `prisma migrate deploy` then `prisma migrate
  status`), and a new `docker-build` job (builds the `runtime` target,
  pushes nowhere). `deploy-staging.yml`/`deploy-production.yml` left
  exactly as they were (manual-trigger-only, stopping short of an actual
  deploy step).
- **Why:** every existing test suite mocks its own repositories — no CI
  job before this milestone had ever exercised a real database migration,
  a real gap `migration-validation` closes (and one this project's own
  history shows is a real risk class — see the Phase 1 upsert/partial-
  index bug this decisions log already recorded). `docker-build` similarly
  closes a gap nothing else in CI could catch (a Dockerfile-only bug, like
  the `CMD` path fix above, invisible to `pnpm build`/`pnpm test`). Adding
  an actual deploy step requires a real hosting target and registry
  credentials, neither of which exist yet (`deploy-production.yml`'s own
  header comment) — building deploy automation against infrastructure
  that doesn't exist would produce untestable, unverifiable pipeline code.
- **Alternatives:** skip migration validation in CI, rely on manual
  `prisma migrate deploy` review only (rejected — exactly the failure mode
  this project already hit once); add a placeholder deploy step that does
  nothing but "succeed" (rejected — a false-green signal about
  infrastructure that doesn't exist, the same reasoning
  `deploy-production.yml`'s own pre-existing header comment already gives
  for why it deliberately fails rather than fakes success).
- **Affects:** .github/workflows/ci.yml.

## 2026-07-22 — Engineering Polish Pass: extracted main.ts's Swagger/routing config into src/bootstrap/ to generate openapi.json without duplication
- **Decision:** `applyApiRouting()` (`src/bootstrap/api-routing.ts`) and
  `buildSwaggerDocument()` (`src/bootstrap/swagger-document.ts`) are now
  the single definitions of, respectively, the global prefix/versioning
  topology and the Swagger `DocumentBuilder` config — `main.ts` and the
  new `scripts/generate-openapi.ts` both call them instead of either
  duplicating the logic or one file importing internals from the other.
- **Why:** the task's own explicit instruction — "Do not duplicate
  Swagger configuration" — and, more fundamentally, "Ensure generated
  specification always matches the backend" is only mechanically
  guaranteed (not just hoped for) if there is one source both the served
  copy and the generated artifact read from. A generator that
  re-implemented `app.setGlobalPrefix()`/`enableVersioning()`/
  `DocumentBuilder` independently would silently drift the moment
  `main.ts`'s own routing changed.
- **Alternatives:** have `generate-openapi.ts` import and call
  `bootstrap()` from `main.ts` directly (rejected — `bootstrap()` also
  calls `app.listen()`, sets up Helmet/CORS/body limits/shutdown hooks,
  none of which a one-shot document-generation script needs or should pay
  the cost of); duplicate the ~15 lines inline in the generator (rejected
  — exactly the drift risk this decision exists to avoid).
- **Affects:** apps/api/src/main.ts, apps/api/src/bootstrap/api-routing.ts,
  apps/api/src/bootstrap/swagger-document.ts,
  apps/api/scripts/generate-openapi.ts.

## 2026-07-22 — Engineering Polish Pass: dependency audit gated by an allowlist file, not a severity threshold
- **Decision:** New `apps/api/audit-allowlist.json` (20 entries, one per
  currently-accepted `pnpm audit` finding, keyed by GHSA id) +
  `apps/api/scripts/check-audit-allowlist.js`, run in CI's new
  `dependency-audit` job. Rejected the simpler `pnpm audit --audit-level
  high` (fail only above a severity threshold) in favor of an explicit
  allowlist diff.
- **Why:** a severity threshold alone can't distinguish "a new HIGH
  finding just appeared, someone needs to look at this" from "the same
  HIGH finding from last week is still here, already reviewed, still
  dev-only and unreachable" — both would either both pass or both fail
  under a threshold-only gate. An allowlist diff makes the ONLY thing
  that fails CI a finding nobody has looked at yet, which is the actual
  goal ("prevent CI noise from documented accepted risks" while still
  catching something genuinely new) — and forces a real, reviewable
  decision (add a reasoned entry, or fix it) rather than a silent
  severity-number tweak whenever a finding becomes inconvenient.
- **Alternatives:** `pnpm audit --audit-level high` alone (rejected, see
  above — doesn't distinguish new from already-accepted); a third-party
  tool like `audit-ci`/`better-npm-audit` (rejected — an unnecessary new
  dependency for a small, fully-specified diff this project can own and
  keep in sync with its own `security.md` documentation directly, the
  same "don't add infrastructure the task doesn't need" discipline this
  project's own prior milestones already apply to Redis/queues).
- **Affects:** apps/api/audit-allowlist.json,
  apps/api/scripts/check-audit-allowlist.js, .github/workflows/ci.yml,
  docs/architecture/security.md §15.

## 2026-07-22 — Engineering Polish Pass: Trivy runs twice per image — one informational pass, one gating pass
- **Decision:** CI's `docker-build` job runs `aquasecurity/trivy-action`
  twice against the same built image: once across every severity
  (`exit-code: 0`, never fails), once restricted to `CRITICAL,HIGH`
  (`exit-code: 1`, fails the job), the latter reading `.trivyignore` for
  accepted risk.
- **Why:** the task's own two requirements — "Report vulnerabilities" and
  "Fail only on HIGH and CRITICAL... Ignore LOW and INFO" — aren't the
  same requirement. A single HIGH/CRITICAL-only invocation would satisfy
  the failure condition but never SHOW a MEDIUM/LOW finding to anyone
  reading the CI log at all, silently narrowing "ignore for failure
  purposes" into "hide entirely." Two passes over one already-built image
  is a cheap, correct way to get both properties without re-building.
- **Alternatives:** single HIGH/CRITICAL-severity-filtered run (rejected,
  see above — loses visibility into MEDIUM/LOW); single all-severity run
  with `exit-code: 1` (rejected — would fail the build on LOW/INFO
  findings, contradicting "ignore LOW and INFO" directly).
- **Affects:** .github/workflows/ci.yml, .trivyignore,
  docs/architecture/container.md §10.

## 2026-07-22 — Engineering Polish Pass: deploy workflow templates use a single workflow_dispatch action input (deploy|rollback), not two separate workflow files
- **Decision:** `deploy-staging.yml`/`deploy-production.yml` each gained a
  `workflow_dispatch.inputs.action` choice (`deploy` or `rollback`) with
  a shared `version` input, driving two `if:`-gated jobs in the same
  file, rather than adding separate `rollback-staging.yml`/
  `rollback-production.yml` files.
- **Why:** a deploy and its rollback are the same operational concern
  (which build is live in this environment) approached from two
  directions, sharing the same target environment, the same secrets, and
  the same concurrency group (`deploy-staging`/`deploy-production` — a
  rollback should never race an in-progress deploy to the same
  environment, which a shared `concurrency.group` already enforces for
  free by keeping both actions under one workflow). Splitting them into
  separate files would need to duplicate that concurrency scoping
  manually to get the same safety property.
- **Alternatives:** separate rollback workflow files (rejected, see
  above — loses the shared concurrency guard without extra work to
  re-add it); a single job handling both via runtime branching instead of
  two `if:`-gated jobs (rejected — two distinct jobs read more clearly in
  the Actions UI than one job with a large conditional body, and GitHub
  Environment-level protections, e.g. required reviewers, apply per-job).
- **Affects:** .github/workflows/deploy-staging.yml,
  .github/workflows/deploy-production.yml, docs/architecture/release.md.

## 2026-07-30 — Committed all Phase 7-9 accumulated work in 17 logical commits; new hardening phase numbered 10, not 9
- **Decision:** the 192 files that had sat uncommitted since the `v1.0.0`
  tag (Phase 7 Projects, Phase 8 AI Workspace Steps 1-8, Phase 9 Step 1
  Vendor Management, and the entire `apps/web` build) were split into 17
  Conventional-Commits-style commits grouped by feature area (storage/
  email/pdf infra → CRM client/quotation → contact/newsletter → catalog
  images → projects module → AI foundation → AI feature modules → finance
  → app.module wiring → web foundation → marketing pages → auth pages →
  portal pages → docs), verified with a clean `pnpm typecheck` afterward.
  Separately, the user handed over a new "Phase 9 — Production
  Engineering, Scalability & Platform Hardening" spec (15 modules:
  API perf, frontend perf, security hardening, auth/session security,
  observability, monitoring, background jobs, caching, DB reliability,
  CI/CD, Docker/infra, testing, docs, tech debt, readiness report). This
  was numbered **Phase 10**, not Phase 9, per the user's own choice when
  asked — Phase 9 stays the Finance module (Vendor Management done, next
  step is Purchase Orders) and is paused, not renumbered.
- **Why:** several sprints of work with zero checkpoint is a real risk
  (a bad edit or accidental revert could have taken out unrelated
  features); the user explicitly asked to commit before starting new
  work. The phase-numbering question was a genuine ambiguity — the
  session's own docs already define Phase 9 as Finance — so it went to
  the user rather than being resolved unilaterally.
- **Alternatives:** one giant commit (rejected — useless history, matches
  none of CONTRIBUTING.md's "atomic commits" rule); renaming this to
  Phase 9 and bumping Finance to Phase 10 (rejected by the user); skipping
  the numbering question entirely (rejected — would leave two things both
  claiming "Phase 9" in the docs going forward).
- **Affects:** entire working tree (see `git log v1.0.0..HEAD` for the 17
  commits); this phase's work will be tracked as Phase 10 in future
  progress.md entries.

## 2026-07-30 — Phase 10, Module 1 (API Performance): extended Milestone 12's audit rather than redoing it, cursor pagination scoped to 2 tables only
- **Decision:** before writing any code, read `docs/architecture/
  performance.md` and discovered a full performance-engineering pass
  ("Milestone 12") already happened on 2026-07-22, covering N+1
  elimination/indexing/compression/caching/instrumentation/benchmarking
  for the 8 modules that existed then. Scoped this module's work to
  extend that audit to everything built since (Phase 7-9), not repeat
  it: 3 real missing composite indexes (Vendor, InventoryItem,
  Notification — see performance.md §10.1), explicit connection-pool
  config (previously an unexamined `pg.Pool` default), additive opt-in
  cursor pagination for AuditLog/Notification only (not all ~35 list
  endpoints), and one new batch endpoint (`PATCH /notifications/read-all`).
  Full writeup: `docs/architecture/performance.md` §10.
- **Why:** the phase's own "Refactor only where it improves..." and
  "Add only necessary" instructions argue directly against redoing
  already-correct work. Cursor pagination was scoped down from "all list
  endpoints" (the spec's literal wording) to just the 2 genuinely
  unbounded/high-growth/append-only tables because (a) the API contract
  is frozen (`CLAUDE.md`) — changing existing endpoints' pagination shape
  isn't an option, and (b) every other list endpoint is already page-capped
  at 100 rows with bounded result sets, so cursor mode would add
  complexity with no real benefit there. Batch operations was scoped down
  from "add bulk endpoints broadly" to one endpoint because auditing every
  module built since Milestone 12 (grep for per-item DB-call loops) found
  zero unsafe write loops to convert — the one write loop that does exist
  (`task-generator.service.ts`'s `approve()`) is deliberately sequential
  for real business-logic-per-item reasons, matching Milestone 12's own
  precedent for correctly-sequential loops.
- **Alternatives:** cursor pagination on all list endpoints (rejected —
  breaks the frozen contract and adds complexity most endpoints don't
  need); a broader sweep of new bulk endpoints (rejected — no real gap
  found beyond notifications; would be feature-creep against "Do NOT
  introduce unnecessary business features"); converting
  `task-generator.service.ts`'s loop to `createMany()` (rejected — would
  silently drop the per-task audit-log/notification side effects
  `TaskService.create()` performs).
- **Affects:** `apps/api/prisma/migrations/20260730170000_add_module1_performance_indexes/`,
  `apps/api/prisma/schema.prisma`, `apps/api/src/config/database/
  database.config.ts`, `apps/api/src/config/env.validation.ts`,
  `apps/api/src/database/prisma.service.ts`, `apps/api/.env.example`,
  `apps/api/src/common/dto/cursor-pagination-query.dto.ts` (new),
  `apps/api/src/common/dto/paginated-response.dto.ts`,
  `apps/api/src/modules/admin/{audit,notification}.{controller,service}.ts`,
  `apps/api/src/modules/admin/repositories/{audit,notification}.repository.ts`,
  `apps/api/src/modules/admin/dto/mark-notifications-read*.dto.ts` (new),
  `apps/api/benchmarks/run-benchmarks.js`, `docs/architecture/
  performance.md` §10, `docs/implementation/blockers.md` (RLS gap, logged
  for Module 3 — see that entry).

## 2026-07-30 — Phase 10, Module 2 (Frontend Performance): scoped down after finding most gaps already closed
- **Decision:** audited `apps/web` against the module's full brief before
  writing any code and found most of it already handled (fonts via
  `next/font`, heavy three.js/GSAP already lazy-loaded and
  viewport-gated, marketing content correctly static with no ISR gap).
  Two findings that looked real on first pass were scoped OUT after
  closer inspection: (1) a 19-file sweep to replace `<Suspense
  fallback={null}>` with a skeleton — dropped because
  `ResourceTable` already renders `<Skeleton>` for its own `isLoading`
  state, so the real data-loading UX was already covered one component
  down; the Suspense boundary only spans a sub-100ms RSC-streaming gap.
  (2) adding `revalidate`/ISR config to marketing pages — dropped because
  marketing repositories read local static data, not a backend fetch, so
  there's no runtime source to invalidate; plain SSG is already correct.
  What shipped instead: `next.config.mjs` `images` config + broad HTTPS
  `remotePatterns` (a specific hostname isn't knowable at this app's
  build time — image hosts are deployment-specific, set via `apps/api`'s
  `STORAGE_PUBLIC_URL_BASE`), `optimizePackageImports`, production-only
  `compiler.removeConsole`, `@next/bundle-analyzer` wiring, and migrating
  the app's one raw `<img>` to `next/image`.
- **Why:** "Refactor only where it improves..." and "Add only necessary"
  (Phase 10's own instructions) argue against churning 19 files or adding
  cache-invalidation machinery for a problem that doesn't exist at either
  site. Verifying claims against the actual component tree before acting
  (checking what `ResourceTable` does internally, checking what the
  marketing repositories actually fetch) caught both false positives
  before any code was written — the same "verify, don't assume"
  discipline `performance.md`'s own Milestone 12 entries model.
- **Alternatives:** the 19-file Suspense sweep and marketing ISR config
  were both drafted as plan items before verification; not implemented
  once verification showed the gap they'd address doesn't exist.
- **Affects:** `apps/web/next.config.mjs`, `apps/web/package.json`,
  `apps/web/src/app/(portal)/catalog/[id]/product-detail.tsx`,
  `docs/architecture/frontend.md` (new Phase 10 Module 2 section).

## 2026-07-30 — Phase 10, Module 3 (Security Hardening): RLS wiring via a second never-patched PrismaClient, CSP script-src needed 'unsafe-inline'
- **Decision (RLS):** implemented the `SET LOCAL app.current_tenant_id`
  wiring `database-schema.md` documents but nothing ever issued (flagged
  in Module 1). Design: `PrismaService`'s constructor monkey-patches its
  own model-delegate properties to route through a `$extends`
  `$allOperations` hook, which opens a wrapping transaction and runs
  `set_config()` first — but that wrapping transaction is opened on a
  SECOND, entirely separate `PrismaClient` instance (`rawTxClient`, own
  adapter/pool), never on `this`. Verified via two throwaway spikes
  before writing the real implementation (`$extends` + array-form
  `$transaction` compose fine; nested nested-transaction concerns don't
  materialize) — but a THIRD, more realistic spike (a login-like sequence
  of calls) caught a real bug the first two missed: opening the wrapping
  transaction via `this.$transaction(...)` (the same, already-patched
  instance) means the `tx` that transaction hands back ALSO carries the
  patched delegates, so any `tx.someModel.method()` call inside
  re-triggers the same hook — infinite recursion, confirmed live as
  every request (including `login`) failing with Prisma's own "Unable to
  start a transaction in the given time." A second, never-patched client
  used only for opening these transactions fixes it cleanly (verified:
  same spike scenario, zero recursion; then confirmed against the real
  compiled app — login + 30 sequential `/leads` requests, zero errors).
- **Why:** the first two spikes tested "does `$extends` compose with
  array-form `$transaction`" in isolation, which is real but not the
  whole picture — they never combined property-patching with calling
  `$transaction` ON the patched instance, which is exactly what the real
  `PrismaService` constructor does. The third spike (deliberately
  modeling a realistic multi-call sequence, not a single isolated call)
  is what surfaced the gap the first two couldn't have shown. This is
  the same "verify with something realistic enough to actually catch the
  bug" lesson the CSP finding below repeats in a different form.
- **Alternatives:** wrapping the ENTIRE request in one interactive
  transaction via a request-scoped provider (rejected — Nest request
  scope bubbles to every consumer, real DI performance cost, and changes
  commit/rollback semantics for the whole request, not just RLS
  session state); accepting `findManyAndCount()`'s snapshot-consistency
  loss as a blocker and not shipping RLS coverage for reads at all
  (rejected — the snapshot property it protects is a display/pagination
  nicety, not a security property, and RLS's actual security value on
  every read outweighs it — documented as an explicit, accepted
  trade-off instead of silently degrading it or blocking the whole fix
  on it).
- **Decision (CSP):** `apps/web`'s new `next.config.mjs` CSP needed
  `'unsafe-inline'` on `script-src`, not just `style-src` — without it,
  the ENTIRE app rendered a permanently blank page on every route, with
  ZERO console errors (no CSP violation message, nothing) and `next
  build`/`tsc`/`curl` all reporting success (the server HTML had real
  content; the break was 100% client-side). Root cause: the App Router's
  own inline `<script>self.__next_f.push(...)</script>` RSC-streaming/
  Suspense-reveal tags get silently blocked, so the root wrapper's
  `hidden=""` attribute never gets removed. Caught only by live browser
  verification (screenshot + console + network tab), diagnosed by
  systematically ruling out other causes (fresh tab, a non-canvas page,
  a known-good external site, an A/B test with headers fully removed)
  before finding the actual directive at fault.
- **Why:** this is the concrete argument for `CLAUDE.md`'s "start the
  dev server and use the feature in a browser" rule — every automated
  check available (typecheck, lint, build, curl) passed against a
  completely broken app. A CSP change is exactly the class of regression
  those checks structurally cannot catch, since none of them execute
  client-side JS.
- **Decision (file upload):** `ProductImageService.upload()` now
  re-sniffs the buffer's real MIME type (`file-type` package, dynamic
  `import()` since it ships ESM-only) for the S3 `Content-Type`, instead
  of trusting the client-supplied multipart header. Verified live against
  real storage: a file uploaded claiming `image/jpeg` with real PNG bytes
  was stored and served back as `Content-Type: image/png`.
- **Why:** `FileTypeValidator` (controller-level) already sniffs bytes to
  ENFORCE the allowed-type allowlist but doesn't expose the detected type
  for reuse, so the STORED object's `Content-Type` was still whatever the
  client claimed — a narrow but real MIME-confusion gap the module's own
  "MIME verification" brief item names directly.
- **Affects:** `apps/api/src/database/{prisma.service.ts,
  tenant-rls-context.service.ts,database.module.ts,base.repository.ts}`,
  `apps/api/src/tenant/middleware/tenant.middleware.ts`,
  `apps/web/next.config.mjs`, `apps/api/src/modules/auth/{auth.controller.ts,
  constants/auth.constant.ts}`, `apps/api/src/modules/catalog/
  product-image.service.ts`, `apps/api/src/utils/malware-scan.util.ts`
  (new), `docs/architecture/security.md` §16, `docs/implementation/
  blockers.md` (RLS entry resolved).

## 2026-07-30 — Phase 10, Module 4 (Authentication & Session Security): real session-backed rotation/reuse-detection/lockout, replacing a stateless refresh flow

- **Decision:** wired up `Session` (existed in `schema.prisma` since
  early on, doc-commented "rotating refresh, reuse detection," never
  actually read or written) via a new `SessionRepository`. `login()`/
  `refresh()` now create a `Session` row keyed by the SHA-256 hash of
  the issued refresh token; `refresh()` looks the presented token up by
  hash rather than only verifying its JWT signature/expiry. Added
  `User.failedLoginAttempts`/`lockedUntil` (migration
  `20260730180000_add_account_lockout`) for account lockout (5 failed
  attempts locks for 15 minutes), a concurrent-session limit (6th login
  evicts the oldest active session), and a random `jti` claim on every
  signed token (closes a token-collision risk the mapper functions'
  own comments had flagged since Phase 1.2D.9). `logout()` and two new
  endpoints (`GET /auth/sessions`, `DELETE /auth/sessions/:id`) went
  from placeholder/nonexistent to real, session-backed operations.
- **Why:** this was the single largest concrete gap `docs/architecture/
  security.md` §13 (Remaining Accepted Risks) had flagged since
  Milestone 13 — a leaked refresh token had no server-side revocation
  path and stayed valid for its full 30-day TTL, with no account-level
  defense against sustained password guessing beyond the existing
  per-IP login throttle (Module 3). The `Session` model already existed
  specifically for this; nothing about this decision required a schema
  redesign, only wiring up what was already there.
- **A real bug caught only by live testing, not by any automated
  check:** `LogoutResponseDto` still returned the original `{ status:
  'not_implemented' }` placeholder shape from when logout genuinely did
  nothing — typecheck/lint/the full rewritten test suite all passed
  with it in place, because nothing in the test suite asserted against
  the literal response shape beyond what the (also-updated) spec
  expected. Only calling the real compiled server end to end
  (`curl .../auth/logout`) surfaced that the response was actively
  lying about what the endpoint now does. Fixed to a plain `{}` success
  acknowledgement. Same class of gap as Module 3's CSP near-miss:
  automated checks verify internal consistency, not whether the
  observable behavior matches reality.
- **Design choice — reuse detection revokes the whole session family,
  not just the replayed token:** when a refresh token that's already
  been rotated away gets replayed, every other active session for that
  user is revoked (`revokeAllActiveForUser()`), not only the one
  matching the replayed token. Live-verified: after a login → refresh →
  replay-the-pre-rotation-token sequence, the POST-rotation token (which
  was never itself replayed, and was still technically unexpired) also
  stopped working — confirming the family-wide revocation, not just a
  per-token rejection.
- **Design choice — reuse detection and the per-IP login throttle
  layer independently, not in place of each other:** the account
  lockout threshold (5 failed attempts) and the existing per-IP login
  throttle (5 requests/minute, Module 3) happen to be numerically equal
  but protect different things — one is per-account (defends a specific
  user even if attempts come from many IPs), the other per-client
  (defends against one IP hammering many accounts). Live-verifying
  lockout in isolation required spacing requests across throttle
  windows since the throttle is stricter in a single-IP test; both
  layers were confirmed independently working, not redundant.
- **Alternatives considered:** a `jti`-based access-token blacklist for
  instant revocation of still-valid access tokens (rejected — the
  access-token TTL is already short, 15 minutes, so the exposure window
  a blacklist would close is small relative to the Redis/cache
  infrastructure it would require; documented as an accepted remaining
  gap in `security.md` §17.4, not silently dropped); MFA implementation
  (rejected — no MFA enrollment flow exists yet to check against; added
  a documented no-op extension point, `mfa-verification.util.ts`,
  instead, so `login()`'s control flow doesn't need to change again once
  a real provider lands); password policy validation (rejected as N/A,
  not deferred — there is still no registration/password-change flow
  anywhere in the codebase for a policy to attach to).
- **Live-verified** end to end against a compiled build + real local
  Postgres + real seeded users: login → refresh (rotation, confirmed via
  `GET /auth/sessions` showing exactly one active session before and
  after) → replay pre-rotation token (401) → replay post-rotation token
  (401, family-wide revocation confirmed) → fresh login → logout → replay
  logged-out token (401) → five wrong-password attempts against a seeded
  account (confirmed via direct DB read: `failedLoginAttempts` reached
  5, `lockedUntil` set ~15 minutes out) → correct password while locked
  still 401s. Full details in `docs/architecture/security.md` §17.
- **Affects:** `apps/api/prisma/{schema.prisma,migrations/
  20260730180000_add_account_lockout/}`, `apps/api/src/modules/auth/
  {auth.service.ts,auth.controller.ts,auth.module.ts,mfa-verification.util.ts
  (new),types/auth-token-payload.type.ts,mappers/auth-token-payload.mapper.ts,
  constants/auth.constant.ts,repositories/{auth.repository.ts,
  session.repository.ts (new)},dto/{logout-request.dto.ts (new),
  logout-response.dto.ts,session-response.dto.ts (new)}}`,
  `apps/api/src/{types/request-meta.type.ts (new),common/decorators/
  request-meta.decorator.ts (new)}`, every `auth/**/*.spec.ts` (rewritten/
  extended), `apps/web/src/app/api/auth/logout/route.ts`,
  `docs/architecture/security.md` §13/§17.

## 2026-07-30 — Phase 10, Module 5 (Observability): mutate the running RequestContext in place rather than nesting a second run(), batch-fixed 37 test suites broken by a guard's new constructor dependency

- **Decision:** added `RequestContextService.updateContext(patch)` —
  mutates the currently-running `AsyncLocalStorage` store's object
  in place (`Object.assign(this.storage.getStore(), patch)`), a no-op
  outside any `run()`. `TenantMiddleware` calls it with `tenantId` once
  tenant resolution completes; `JwtAuthGuard` calls it with `userId` (the
  authenticated user's `email` — the token payload/`RequestUser` carry no
  database id) once a token verifies. Both run LATER than
  `HttpLoggingMiddleware`'s own `RequestContextService.run()` call, which
  is what actually establishes the context every request gets — this
  addition lets code running downstream of that enrich it, rather than
  needing to have known everything up front.
- **Why not a second, nested `run()` call instead?** A nested `run()`
  shadows the outer context only for the duration of ITS OWN callback,
  then the outer context is restored the instant that callback returns
  (see `request-context.service.spec.ts`'s own "a nested run() shadows
  the outer context" test) — the wrong shape for "the rest of THIS
  request, including code that runs after TenantMiddleware/JwtAuthGuard
  return, should see this from now on." Mutating the live store object
  `getStore()` already returns is what every other reader downstream
  (the `res.on('finish', ...)` handler that logs "HTTP request
  completed," `ExceptionLoggingFilter`, `AuditLoggerService`) needs to
  actually observe the enrichment, since they call `getContext()` fresh
  at their own, later point in time rather than holding a snapshot.
  Live-verified: a `GET /auth/sessions` request's "HTTP request
  completed" log line carries both `tenantId` and `userId`; an
  unauthenticated tenant-scoped request carries `tenantId` only; `GET
  /health/live` carries neither (health routes are exempt from
  `TenantMiddleware`) — confirmed against a real compiled server, not
  just the unit tests that exercise `updateContext()` in isolation.
- **`RequestContext` gained a `tenantId` field it didn't have before.**
  `LogContext` (the log-entry-facing type) declared `tenantId?` since
  Phase 1.2C.4, but `RequestContext` (the actual `AsyncLocalStorage`
  store shape) never had a matching field — so `tenantId` could never
  actually reach a log line no matter what middleware tried to do,
  structurally, not just because nothing called the right method yet.
  This was the specific, concrete gap this module's own audit found and
  is what made `updateContext()` worth building at all.
- **A single guard constructor change broke 37 existing test suites —
  found via source search, not by reading truncated CI output.**
  `JwtAuthGuard` gaining a second constructor parameter
  (`RequestContextService`) meant every existing `Test.createTestingModule`
  spec for a `JwtAuthGuard`-protected controller that never mocked the
  guard (Nest auto-instantiates guards referenced via `@UseGuards()`
  using the real class unless overridden) now failed dependency
  resolution. The first full-suite run's own captured output was
  truncated (a rolling buffer, not the complete log) and only showed 2
  of the real ~100+ individual test failures — rather than trust that
  partial view, grepped the SOURCE directly: every `*.controller.ts`
  using `@UseGuards(JwtAuthGuard` cross-referenced against its own
  `*.controller.spec.ts` using `Test.createTestingModule` — 37 files,
  which matched the earlier run's own "37 failed" summary count exactly,
  confirming both the scope and that nothing was missed. All 37 followed
  the byte-identical `{ provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },`
  provider line and `import { AUDIT_LOGGER } from '../../logging';` import
  line (this codebase's own established consistency paid off here) —
  fixed with two `sed` passes across all 37 at once rather than 37
  individual hand-edits, then verified via a full suite run (188/188
  suites, 1143/1143 tests passing) and a spot-check of several files by
  hand.
- **Sensitive-field redaction uses substring matching, not exact key
  names.** `JsonLogFormatter`'s existing `JSON.stringify` replacer
  (previously Error-expansion only) now also checks each key against a
  fixed list (`password`, `secret`, `token`, `authorization`, `apikey`,
  `privatekey`, `creditcard`, `cvv`) via `.includes()`, case-insensitive —
  `passwordHash`/`refreshToken`/`clientSecret` all match without every
  field-name variant needing individual enumeration. Accepted trade-off:
  a rare false positive (redacting a legitimate field whose name happens
  to contain one of these words) is preferable to a credential silently
  reaching a log line.
- **Distributed tracing (OpenTelemetry) and third-party error tracking
  (Sentry) deliberately NOT built**, despite `SENTRY_DSN`/
  `OTEL_EXPORTER_OTLP_ENDPOINT` sitting as blank placeholders in
  `.env.example`. No APM/tracing backend is configured in any
  environment this app currently deploys to, and this is a
  single-service monolith — a trace span's value over the already-real
  `requestId`/`correlationId` propagation is real only once either a
  second service exists to trace across or a backend exists to receive
  spans. Third-party error tracking's dashboard/alerting value overlaps
  with Module 6 (Monitoring)'s scope, tracked there instead.
- **Affects:** `apps/api/src/logging/{types/request-context.type.ts,
  request-context.service.ts,request-context.service.spec.ts,
  formatters/json-log-formatter.ts,formatters/json-log-formatter.spec.ts,
  README.md}`, `apps/api/src/tenant/middleware/{tenant.middleware.ts,
  tenant.middleware.spec.ts}`, `apps/api/src/common/guards/
  {jwt-auth.guard.ts,jwt-auth.guard.spec.ts}`, `apps/api/src/main.ts`, 37
  `*.controller.spec.ts` files across nearly every business module (see
  `docs/implementation/progress.md`'s own log entry for the full list),
  `docs/architecture/operations.md` §6/§10.

## 2026-07-30 — Phase 10, Module 6 (Monitoring): a local prom-client Registry per MetricsService, route-pattern labeling to avoid cardinality blowup, deferred alerting/dashboards with no destination to build against

- **Decision:** added `prom-client` and a new `MetricsModule` (`GET
  /metrics`, Prometheus exposition format). `MetricsService` wraps a
  **local** `prom-client` `Registry` instance — never the package's own
  module-level default `register` singleton. Wired into three existing
  call sites via constructor injection: `HttpLoggingMiddleware` (records
  `http_requests_total`/`http_request_duration_seconds` inside the
  existing `res.on('finish', ...)` handler, reusing the same
  already-computed `durationMs`), `PrismaService` (records
  `db_query_duration_seconds` inside the existing `$on('query', ...)`
  listener, reusing the same `event.duration`), and
  `InMemoryDeadLetterStore` (a new `jobs_dead_letter_queue_size` gauge,
  updated on `record()`/`clear()`).
- **Why a local Registry, not the prom-client default:** the default
  `register` is process-global mutable state shared across every
  `new Counter(...)`/`new Histogram(...)` call anywhere in the process —
  a second `MetricsService` construction (e.g. Jest instantiating this
  class in more than one spec file within the same worker, which is
  exactly what happened once `metrics.service.spec.ts`,
  `http-logging.middleware.spec.ts`, `in-memory-dead-letter.store.spec.ts`,
  and `job-runner.service.spec.ts` all needed a real instance) throws "A
  metric with the name ... has already been registered" against the
  shared singleton. A local registry per instance makes every one of
  those independently constructible with zero cross-test interference —
  verified directly: `metrics.service.spec.ts`'s own "two independent
  instances never share state" test constructs two `MetricsService`s and
  confirms neither sees the other's recorded data.
- **Decision — label HTTP metrics by the matched Express ROUTE PATTERN,
  never the raw request path:** `resolveRouteLabel()`
  (`http-logging.middleware.ts`) reads `req.route?.path`
  (`/api/v1/orders/:id`), falling back to a fixed `'unmatched'` string
  for a request that matched no route at all (a 404), rather than the
  raw path in either case.
- **Why:** labeling by raw path (`/api/v1/orders/a1b2c3...`, one series
  per real order id — or worse, one series per RANDOM PATH an attacker
  probes against a 404) is Prometheus's own documented anti-pattern:
  unbounded label cardinality that grows forever and can exhaust a real
  Prometheus server's memory over time. `req.route` is populated by
  Express's own router once a request matches a registered route; by the
  time `HttpLoggingMiddleware`'s `res.on('finish', ...)` handler fires
  (after the full request/response cycle, including controller
  execution), it's reliably set for every successfully-routed request.
  Live-verified against a real compiled server: a random unmatched path
  produced `http_requests_total{method="GET",route="unmatched",
  status_code="404"} 1` — the probed path itself never appeared as a
  label value anywhere in the scrape output.
- **Decision — `METRICS_TOKEN` production-safety check is the INVERSE
  shape of `SWAGGER_ENABLED`'s own check:** Swagger's rule is "must be
  disabled in production unless explicitly re-enabled" (a full API-shape
  dump is worth disabling by default); metrics' rule is "must be
  protected by a token once enabled in production" (`METRICS_ENABLED`
  stays true by default — that's the whole point of a scrape endpoint —
  but an unprotected one discloses real per-route request-rate/latency/
  error-rate data). `env.validation.ts`'s new `superRefine` check
  enforces this at startup, the same "fail before anything starts
  listening" property every other production-safety check there already
  has.
- **Alerting (PagerDuty/Opsgenie/Slack/webhook dispatch) and Grafana
  dashboards deliberately NOT built, despite being named in Module 6's
  own brief.** Audited first: zero alerting integration exists anywhere
  in this codebase, and — unlike `SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT`
  (Module 5's own deferred items, at least documented as blank
  placeholders) — not even a placeholder env var exists for an alert
  destination. Building real dispatch logic with no configured
  destination to send to, or verify against, would be speculative,
  unverifiable infrastructure — the same "don't build ahead of a real,
  checkable consumer" discipline this codebase already applies elsewhere
  (e.g. `PerformanceLogger`/`AuditLoggerService` were built ahead of
  their first caller, but as reusable, independently-testable utilities,
  not as integrations against an unconfigured third party). Dashboards:
  this dev sandbox has no Docker available at all (confirmed while
  scoping this module), so a Prometheus/Grafana stack can't be stood up
  or verified here — shipping dashboard JSON with no way to render it
  against real scraped data would violate this session's own "verify
  live, don't just trust the theory" discipline. `GET /metrics` is the
  enabling foundation for both; building either without a real target to
  verify against would be padding, not a genuine deliverable.
- **A real doc-drift bug found and fixed along the way, unrelated to
  this module's own new code:** `apps/api/src/logging/README.md` claimed
  `PerformanceLogger` had "no current call site" — false since Milestone
  12 (`DashboardService.overview()` already wraps itself in
  `measureAsync()`), predating Phase 10 entirely. Module 5's own audit of
  this same file repeated the stale claim without re-verifying it against
  the actual codebase. Corrected as part of this module's own audit
  discipline (verify claims against code, not against what a prior
  doc/module already asserted).
- **Affects:** `apps/api/package.json` (new `prom-client` dependency),
  `apps/api/src/metrics/` (new — `metrics.module.ts`, `metrics.service.ts`,
  `metrics.controller.ts`, `metrics.constant.ts`, specs, README.md),
  `apps/api/src/config/monitoring/monitoring.config.ts` (new — the
  folder's placeholder README updated, not replaced), `apps/api/src/config/
  {env.validation.ts,env.validation.spec.ts,index.ts,config.module.ts}`,
  `apps/api/src/bootstrap/api-routing.ts`, `apps/api/src/app.module.ts`,
  `apps/api/src/common/middleware/{http-logging.middleware.ts,
  http-logging.middleware.spec.ts}`, `apps/api/src/database/prisma.service.ts`,
  `apps/api/src/jobs/{in-memory-dead-letter.store.ts,
  in-memory-dead-letter.store.spec.ts,job-runner.service.spec.ts}`,
  `apps/api/src/logging/README.md` (doc-drift fix), `apps/api/.env.example`,
  `docs/architecture/operations.md` §11.

<!-- Add new decisions above this line as you build. -->
