# Progress Dashboard

The single place to see where the build is. Update at the end of every session.
Tell Claude Code: "update docs/implementation/progress.md".

## Current status: **Backend v1.0 shipped and API-frozen; Frontend Engineering Foundation + Design System + Application Runtime Architecture + Marketing Website (built + reviewed) + Authentication UI (built + reviewed) + Business Portal (all 7 Backend v1.0 modules, built + reviewed) complete; Phase 7 Project/Task/Milestone module (the one greenfield gap Phase 7's own workflow audit found) built end-to-end; Phase 8 (AI Workspace) Steps 1–8 — provider abstraction + prompt library + AI Proposal Generator + Requirement Analyzer + Project Estimator + Task Generator + Content Assistant + Email Assistant — all complete on the backend (no `apps/web` UI yet for Steps 3–8); Phase 9 (Enterprise Operations Suite), Module 1 (Finance) Step 1 (Vendor Management) built + live-verified end-to-end, Steps 2–7 queued, PAUSED (not abandoned) in favor of Phase 10; all Phase 7/8/9-Step-1/apps/web work committed 2026-07-30 (17 logical commits, `git log v1.0.0..HEAD`); Phase 10 (Production Engineering, Scalability & Platform Hardening, 15 modules) opened 2026-07-30, Module 1 (API Performance) complete — see `docs/architecture/performance.md` §10**

**Documentation-lag note (found and fixed 2026-07-30):** Phase 8 Step 8
(Email Assistant) was already fully built, tested, and wired in — module,
controller, service, DTOs, seeded/granted `emails:send` permission, 12
passing tests — but had no log entry here, so this file's own "Next 3
tasks" list still called it undone. Backfilled below after re-verifying
with real commands (full suite: 183 suites/1051 tests passing; live
`/email-assistant/generate` call against the real dev server), not
assumed from the code alone.

Backend v1.0 is complete, tagged (`v1.0.0`, commit `27ae571`), and API-frozen
— confirmed via `git tag`/`git log`, not assumed. **Known documentation gap,
not fixed here:** the detailed log below still only narrates Backend v1.0
Review Phases 1–5; the user's own account (this session) says six review
phases ran before the v1.0.0 tag, but no Phase 6 entry exists in this file
and this session has no visibility into what Phase 6 covered beyond the
release commit's message. A future backend-focused session should backfill a
real Phase 6 entry from source/git history rather than this gap being
silently carried forward indefinitely.

`apps/web`'s Frontend Engineering Foundation phase (tooling, structure, API
typing, providers, state, error/loading architecture), the Design System &
Component Library phase (tokens, responsive system, ~35 components, form/
icon/animation/3D/media foundations, accessibility), the Application Runtime
Architecture phase (real layouts, the portal application shell, navigation
system, authentication architecture wired to the frozen backend, completed
API runtime, query conventions, cross-cutting state, upgraded error/loading
boundaries), AND the real public Marketing Website (15 pages — Home,
Services, Industries, Work, About+Process, Pricing, Resources, Blog
listing+detail, FAQ, Contact, Quote, Privacy, Terms) are all now complete —
see the log below. The Marketing Website *is* Sprint
2's real scope, built directly from this session's page-by-page brief
rather than from a pre-authored `sprint-02.md` task list (that list was
never recovered — see blockers.md; resolved by building directly from the
product docs' real, correctly-content-matched files instead of blocking on
authoring an intermediate task list first).

**Phase 7 update:** the Contact form's lead-capture route is no longer a
logged-only placeholder — `apps/api` gained a real `ContactRequest`
consumer (the model existed since Phase 1.1A, unused) plus a brand-new
`NewsletterSubscriber` model/route, both wired to real transactional
email (Resend) and the marketing site's Contact/Newsletter forms now
persist for real. The Quote form's route is still an unconnected,
logged-only placeholder — out of this phase's scope. `apps/api` also
gained its first real file-upload capability (`POST
/products/:id/images`, S3-compatible storage) — see that log entry
below for both.

**Phase 7 workflow audit + Project/Task/Milestone module:** a full
workflow-matrix audit against the Lead→...→Archive lifecycle
(`docs/implementation/phase-7-workflow-matrix.md`) found most of the CRM/
billing surface already partially built, but confirmed one genuine
greenfield gap — Project/Milestone/Task management didn't exist at all
(schema modeled since Phase 1.1A, zero application-layer consumers, no
migration ever generated). That gap is now closed: a real `ProjectsModule`
(Project/Milestone/Task/Document/Comment — five controller/service/
repository triads, all writing to a shared `ActivityLog`) plus the matching
`apps/web` workspace (list page, and a project detail page with Milestones/
Tasks-List-and-Kanban/Files/Activity tabs) are built, tested (23 new specs,
966 total passing), and verified end-to-end against a live server
(create → milestone → task → status change → comment → file upload →
completion % → archive, plus error-path checks). See the newest log entry
below for the full scope and what's explicitly deferred (Kanban
drag-and-drop, calendar view, task dependencies, project budget, full
document management, and notifications-on-project-events all remain open).

**Note on the sections below:** `apps/api` backend work stopped being tracked
against the Sprint table directly partway through Sprint 1 and has been
tracked ever since via a separate **Milestone** system (M1–M14, all
implemented, validated, and now formally reviewed) and a **Backend v1.0
Review** phase sequence (Phase 1 Architecture, Phase 2 Code Quality, Phase 3
API Contract/Freeze, Phase 4 Frontend Readiness, Phase 5 Testing &
Documentation — all logged below; see the note above re: Phase 6). The
Sprint table immediately below is the project's ORIGINAL full-platform plan
(marketing site + portal + admin, per CLAUDE.md's scope) and still
accurately tracks the parts of that plan untouched by the backend Milestone
work. Do not read the table below as "nothing has shipped" — the backend
(`apps/api`) is a complete, production-ready, API-frozen modular monolith,
and `apps/web` now has its engineering foundation; see the log below for
what that means concretely.

## Sprint status (original full-platform plan — apps/web scope not yet started; see note above for apps/api)
| Sprint | Theme | Status |
|--------|-------|--------|
| 1 | Foundation | 🟨 In progress (backend scope superseded by the Milestone system below, infra-as-code/Terraform specifically not yet done; `apps/web` Frontend Engineering Foundation + Design System + Application Runtime Architecture all now complete, see log below) |
| 2 | Marketing site | ✅ Done — 15 real pages live, see log below (originally blocked on an unauthored task list, resolved by building directly from the product docs instead; the doc's own "Service template ×15 / Industry template ×10 detail pages" line item remains genuinely not done — only the hub pages exist) |
| 3 | Conversion + CRM ◆ M1 | ✅ Done — real CRM (Leads/Follow-ups/Customer Notes+Activity) built as part of the Business Portal phase below, not as a separate sprint; **Phase 7**: Contact form now persists to a real `ContactRequest` row + sends real email (Resend) — still not linked into the CRM `Lead` pipeline (`convertedLeadId` exists on the schema, unused); Quote form remains an unconnected, logged-only placeholder |
| 4 | Portal core | ✅ Done — Catalog, Bespoke Customizer (→ order creation), Orders, Inventory, CRM, Billing, Admin all built against the real, frozen Backend v1.0 API; see the Business Portal log entry below |
| 5 | Billing + collab ◆ M2 | 🟨 Billing done (Invoices/Payments, see log below); "collab" partially done — Phase 7 added a real Project/Milestone/Task/Document/Comment module (see newest log entry) covering the delivery-workspace half; no messaging module, and Document upload is narrow (no versioning/categories/tags — Step 9 of the Phase 7 spec, still open) |
| 6 | Admin + hardening ◆ M3 | 🟨 Admin dashboard/notifications/audit-logs/reports done (see log below); "hardening" (perf/security pass over the business portal) not yet a separate phase |

Legend: ⬜ not started · 🟨 in progress · ✅ done

## Completed work log (newest first)
- **Phase 10, Module 1 (API Performance) (`apps/api`)** — user handed over
  a 15-module "Phase 10 — Production Engineering, Scalability & Platform
  Hardening" spec; renumbered to Phase 10 per the user's own choice
  (Phase 9/Finance stays Phase 9, paused, not renumbered), Module 1
  chosen as the starting point. Read `docs/architecture/performance.md`
  first and found a full performance-engineering pass ("Milestone 12")
  already happened on 2026-07-22 — this module extends that audit to
  everything built since (Phase 7-9) rather than redoing it. New
  migration `20260730170000_add_module1_performance_indexes` (3 real
  missing composite indexes: Vendor, InventoryItem, Notification — 11 of
  13 models checked already had the right index). Explicit, tunable
  connection-pool config (`DATABASE_POOL_MAX`/`_IDLE_TIMEOUT_MS`/
  `_CONNECTION_TIMEOUT_MS`) replacing an unexamined `pg.Pool` default.
  Additive, opt-in cursor pagination (`CursorPaginationQueryDto`) for
  AuditLog/Notification only — not all ~35 list endpoints, since the API
  contract is frozen and every other endpoint is already page-capped.
  One new batch endpoint, `PATCH /notifications/read-all`
  (`updateMany()`-backed) — the only safe batch-write candidate found;
  every module built since Milestone 12 was grepped for N+1/unbatched-
  write patterns and came back clean. Extended `benchmarks/
  run-benchmarks.js` with 3 new scenarios (projects/finance/prompts),
  caught and worked around a rate-limiting methodology issue before
  trusting the results (see performance.md §10.6). Full writeup:
  `docs/architecture/performance.md` §10; decisions.md has the "why"
  behind each scoping call. Real gap found and deliberately NOT fixed
  here (out of scope, logged to blockers.md for Module 3 instead): RLS's
  documented `SET LOCAL` contract is never actually issued by the app.
  `pnpm --filter @antrique/api typecheck`/`lint`/`test` all clean, 10
  test suites touched, 15 new tests, `openapi.json` diffed
  additive-only (0 removed fields).
- **Phase 9, Module 1, Step 1 (Vendor Management) (`apps/api` + `apps/web`)**
  — first Phase 9 module, scoped and approved with the user before
  starting (full 7-step Module 1 roadmap in the approved plan; only Step
  1 built this pass). New `apps/api/src/modules/finance/` module (not
  crammed into `billing/`, which owns Invoice/Payment/Tax specifically):
  `Vendor` model (name/slug/contact fields/gstin/paymentTerms/status/
  notes + full audit columns) — deliberately a NEW model, not a reuse of
  `Supplier` (Milestone 7 — product/inventory sourcing only, no payment-
  terms/tax-ID concept, a different business relationship). Full CRUD
  (Create/List/Get/Update, no Delete — archives via the ordinary update
  route's `status` field, same shape `Client` establishes), new
  `vendors:read`/`vendors:write` RBAC (mirrors `clients:read/write`'s
  tier: manager+project_manager read, manager+ write), 14 new tests, full
  suite now 186 suites / 1065 tests, all passing. `apps/web`: `features/
  finance/{api,hooks}`, `lib/validation/vendor.ts`, and full `/finance/
  vendors` list/create-dialog/detail/edit-dialog pages mirroring `crm/
  clients/`'s exact pattern (`ResourceTable`/`ListToolbar`/
  `ListPagination`/`DetailPageHeader`, react-hook-form+zod), new
  top-level "Finance" portal nav entry + dashboard card.
  - **Also fixed, found while generating this step's migration**: a
    pre-existing bug in `20260729090000_add_project_management` where
    the file's own SQL redundantly re-declared `CREATE TYPE`/
    `CREATE TABLE`/RLS for six tables already created by earlier
    migrations (confirmed via grep) — broke replay against any genuinely
    fresh database (a new developer's machine, CI, production). Rewritten
    to contain only the genuinely-new `comments` table's SQL; tracking
    checksum corrected via a metadata-only `UPDATE` (no schema/data
    touched — confirmed safe first, since this migration's
    `applied_steps_count` was already 0). See decisions.md.
  - **Also fixed, found live while clicking "Edit" on the new Vendor
    detail page**: `components/forms/form.tsx`'s `FormLabel` unconditionally
    calls `useFormField()`, which throws (`"useFormField must be used
    within a <FormField>"`) outside a real react-hook-form `<FormField>`
    Controller — crashed the whole page via the portal's route error
    boundary. The Status field in the new `VendorFormDialog` uses local
    `useState` (not an RHF-registered field), the same pattern
    `ClientFormDialog` (Phase 7) already established — meaning this
    EXACT crash was a pre-existing, undiscovered bug in the already-
    shipped `ClientFormDialog` too, just never triggered live before now.
    Fixed both: swapped `FormLabel` → plain `Label` (`@/components/ui/
    label`, no RHF dependency) for the Status field in both dialogs.
    Verified live end-to-end after the fix: Edit dialog opens, Save
    changes submits, `updatedAt` timestamp confirmed changed via the API.
  - Live-verified the full lifecycle end-to-end against the real dev
    server (not just tests): logged in as the seeded admin through the
    actual browser UI, created a vendor via curl and via the real "New
    vendor" dialog, listed/filtered, opened the detail page, edited and
    saved, confirmed a duplicate-slug `409 Conflict` and RBAC decorator
    wiring. `pnpm --filter @antrique/api typecheck/lint/test` and
    `pnpm --filter @antrique/web typecheck/lint` all clean; OpenAPI
    regenerated.
  - Steps 2-7 (Purchase Orders, Expenses, Invoice PDF+email, Refund
    Management, GST Tax Configuration, Revenue/P&L/Cash-Flow dashboards)
    remain open, queued in dependency order — see the approved plan / this
    file's own Module 1 roadmap note above.
- **Bug fix — `TextReveal` scroll-reveal headings clipped the tops of
  glyphs (`apps/web`)** — found via live Chrome verification of the
  marketing site (not a report, discovered while checking the running
  app): every heading using the shared `TextReveal` component
  (`HomeHero`'s hero title, and every `PageHero`/`SectionHeading` title
  site-wide) permanently clipped the top of each letter in the Fraunces
  heading font, even after the scroll-reveal animation finished. Root
  cause: `text-reveal.tsx`'s per-word `overflow-hidden` wrapper sized its
  clip box to exactly the heading's line-height (Tailwind's `text-5xl`/
  `text-6xl` utilities set `line-height: 1`, zero headroom), and
  Fraunces' actual glyph metrics exceed that box. Fixed by adding
  `pt-[0.2em] mt-[-0.2em]` to the wrapper (extra clip headroom, the
  negative margin keeps layout position unchanged) — verified live on
  the homepage hero, "Six commitments" section, and the About/Pricing
  page titles after the fix. `apps/web/src/components/motion/
  text-reveal.tsx` only; no other files touched.
- **Phase 8 — AI Workspace, Step 8 (Email Assistant) (`apps/api`)** —
  backfilled 2026-07-30: found already fully built and passing, not
  logged. Two independent actions, not a generate/approve pair like Step
  6's Task Generator:
  - `POST /email-assistant/generate` — drafts a proposal/follow-up/
    meeting-request/project-update/invoice-reminder email from a
    recipient name + purpose + optional key points. Renders the seeded
    `client-email-v1` template (updated this step for its first real
    consumer — renamed `clientName` → `recipientName`, added
    `emailType` so the model knows which of the five kinds it's
    drafting). Real AI call, writes nothing, sends nothing. Gated
    `prompt_templates:write`, same tier as every other Phase 8 drafting
    action.
  - `POST /email-assistant/send` — takes human-reviewed `to`/`subject`/
    `body` and sends it for real through the existing, unchanged
    `EmailService` ("Reuse EmailService" — this step's own brief). No AI
    call, no reference back to a generated draft required. Gated under a
    new `emails:send` permission (not `prompt_templates:write` — a real
    external side effect, the same "the real-effecting action gets its
    own tier" treatment `orders:cancel`/`invoices:void`/`payments:refund`
    already established), seeded and granted to manager/project_manager.
  - Nothing persists — no "store drafts" requirement for this step
    (unlike Step 7's Content Assistant), so `EmailType` is a plain TS
    union, not a database enum, and there's no repository in this
    module. `EmailService.send()` requires `html`; the AI drafts plain
    text, so `send()` does a minimal escape + paragraph-break conversion
    rather than pulling in a markdown renderer.
  - 12 tests (service + controller), full suite now 183 suites / 1051
    tests, all passing (verified 2026-07-30, not assumed). Verified live
    against the real dev server: `generate` hit the same known
    account-credit 502 every Step 3+ call has hit (proving the
    auth/RBAC/prompt-render/AiService chain works end-to-end); `send`
    was deliberately not live-called (it would genuinely deliver an
    email through the configured Resend key) — same caution the
    module's own README documents.
  - Still open: no `apps/web` UI exists for Steps 3–8 of Phase 8 at all
    (not specific to Step 8) — the first real frontend surface for the
    AI Workspace remains unbuilt.
- **Phase 8 — AI Workspace, Step 7 (Content Assistant) (`apps/api`)** — the
  one Phase 8 generation feature whose own spec explicitly requires
  persistence ("Store drafts only. Never publish automatically.") rather
  than the ephemeral shape Steps 3-5 and Step 6's own `generate()` use:
  - New `ContentDraft` model + `ContentDraftType` enum (CASE_STUDY,
    SERVICE_DESCRIPTION, BLOG_DRAFT, FAQ, LANDING_PAGE, SOCIAL_POST) and
    `CONTENT_GENERATION` added to `PromptCategory` (standalone `ALTER
    TYPE` migration first, same precedent as Step 6's `TASK_GENERATION`).
    One shared `content-generation-v1` template handles all six output
    kinds via a `{{contentType}}` variable (a human-readable label, e.g.
    "case study" not "CASE_STUDY") rather than six separate templates.
  - `POST /content-assistant/generate` — one AI call, always persists a
    real `ContentDraft` row, even on a bad JSON parse (falls back to a
    generic title + the model's raw text as the body — Step 7's own spec
    requires storing the draft regardless, unlike every other Phase 8
    parser which fails closed to nothing). `GET /content-assistant` /
    `GET /content-assistant/:id` list/get (paginated, filterable by
    type), `PATCH /content-assistant/:id` (human edits title/body, no AI
    call), `DELETE /content-assistant/:id` (soft delete, no publish route
    exists — this app has no CMS/content-publish pipeline for a draft to
    graduate into).
  - New `content_drafts:read`/`write`/`delete` permissions — unlike every
    prior Phase 8 step, this is a real persisted resource with its own
    CRUD surface, so it gets its own permission tier (granted to
    `manager`/`project_manager`, same tier as `prompt_templates:*`)
    rather than reusing an existing key.
  - 17 new tests (service + controller), full suite now 181 suites / 1039
    tests, all passing. Verified end-to-end against the real, live dev
    server: `generate` hit the same known account-credit `502` every
    Step 3+ call has hit (confirming the render→AI-call chain works; the
    repository `create()` call sits after the AI call, so a failed
    generation correctly leaves no orphaned draft row); the full CRUD
    surface (list/get/patch/delete, including the soft-delete →
    subsequent 404) was verified against a manually-inserted real row
    (via a one-off Prisma script, since a successful AI completion isn't
    available in this environment) — all four calls behaved correctly
    against the live server and real Postgres.
  - Along the way: the dev server hit a stale-port issue after this
    session's file changes (`EADDRINUSE` on a watch-mode restart that
    didn't cleanly release the old process) — killed the orphaned process
    and started fresh; not a code bug, a recurrence of this sandbox's
    documented dev-server flakiness (see "Notes for next session").
- **Phase 8 — AI Workspace, Step 6 (Task Generator) (`apps/api`)** — two
  actions, the one Phase 8 feature so far where "AI enhances the existing
  workflow" means literally creating rows in an existing table rather than
  only ever handing back a draft:
  - `POST /task-generator/generate`: from a milestone and/or free-text
    requirements, renders the new seeded `task-generation-v1` template
    (added this step — `TASK_GENERATION` appended to the `PromptCategory`
    enum via its own standalone `ALTER TYPE ... ADD VALUE` migration, run
    before the value was referenced, same pattern as every prior enum
    addition), calls `AiService`, and returns a **flat** list of
    epic/story/task/subtask suggestions (title/description/
    acceptanceCriteria). No nested Epic/Story/Subtask entities exist in the
    schema and none are added — Phase 7's real model is only
    `Project → Milestone → Task`; `type` is informational metadata a human
    reads, not a new persisted hierarchy. Writes nothing to the database,
    same as Steps 3–5.
  - `POST /task-generator/approve`: the actual "Allow manual approval" step
    this spec step names explicitly — takes a reviewed/edited subset of
    suggestions and creates **real** `Task` rows through Phase 7's own,
    unchanged `TaskService.create()` (newly exported from `ProjectsModule`
    for this). No AI call. Gated under the existing `tasks:write`
    permission (the same one `POST /tasks` already requires), not
    `prompt_templates:write`. Creates tasks sequentially (not
    `Promise.all`) — approving N independent tasks isn't a financial
    operation that needs all-or-nothing atomicity.
  - 13 new tests (service + controller), full suite now 179 suites / 1022
    tests, all passing. Verified end-to-end against the real, live dev
    server: `generate` hit the same known account-credit `502` every
    Step 3+ call has hit (confirming the render→AI-call chain works);
    `approve` is the **first Phase 8 endpoint to genuinely succeed** —
    `201` with two real `Task` rows created against a real seeded project
    and confirmed present via the ordinary `GET /tasks` list.
- **Phase 8 — AI Workspace, Step 5 (Project Estimator) (`apps/api`)** —
  `POST /project-estimator/estimate`: takes a free-text scope of work,
  renders the seeded `project-estimation-v1` template (Step 2, updated
  this step — the original Steps 1–2 seed only covered hours/sprints/
  team/complexity/confidence, missing the spec's own `budgetRange`/
  `dependencies` fields, added now), calls `AiService`, and returns:
  estimated hours, sprint count, team size, budget range, complexity
  (Low/Medium/High), dependencies, and a confidence score (0-100).
  `confidenceScore` is `number | null` — the model isn't guaranteed to
  return a clean number even when everything else parses; a non-numeric
  value falls back to `null` (tested explicitly), not a fabricated 0.
  - Same "writes nothing to the database" design as Steps 3/4 — an
    estimate is a starting point for a human-owned decision, never
    auto-applied to a real `Project`/`Quotation` row.
  - No new dependencies (unlike Step 4's `pdf-parse`/`mammoth`) — same
    shape as Step 3, just a different template/response schema.
  - Gated under `prompt_templates:write`, same reasoning as Step 4 (no
    lead/client/project link on this endpoint).
  - 6 new tests (service + controller), full suite now 177 suites / 1009
    tests, all passing. Verified end-to-end against the real Anthropic
    API — same known account-credit `502` as every Step 3+ call so far,
    confirming the render→AI-call chain works correctly again.
- **Phase 8 — AI Workspace, Step 4 (Requirement Analyzer) (`apps/api`)** —
  `POST /requirement-analyzer/analyze`: multipart upload (PDF/DOCX/MD/TXT,
  max 20MB), extracts the document's text (new `DocumentTextExtractor` —
  `pdf-parse` v2's real API for PDF, `mammoth` for DOCX, plain UTF-8 read
  for MD/TXT), stores the original file via the existing `StorageService`
  (this step's own "Reuse StorageService" instruction — a real, new
  `StorageService` consumer beyond product images), renders the seeded
  `requirement-analysis-v1` template (Step 2, updated this step to
  request structured JSON the same way `proposal-generation-v1` was in
  Step 3), calls `AiService`, and returns: features, modules, risks, a
  timeline estimate, and clarifying questions for the client. Same
  `rawText`/`parsedSuccessfully` fallback shape as Step 3's
  `ProposalDraftResponseDto`, plus a `truncated` flag (documents over
  ~40k extracted characters are analyzed on the first 40k, not rejected —
  real requirement briefs are nowhere near that size in practice).
  - Two new dependencies: `pdf-parse@2.4.5` (its v2 API is a real
    rewrite from v1 — a class + `getText()`/`destroy()`, not the old
    default-export function; confirmed against its own README before
    writing the extractor, not assumed from v1 familiarity) and
    `mammoth@1.12.0`.
  - Same "writes no new business-entity row" design as Step 3 — the
    analysis is a draft for human review; the uploaded document itself
    IS persisted (via `StorageService`), as an audit trail of what was
    analyzed, not a new `RequirementAnalysis` table.
  - File type is validated by extension, not the browser-supplied
    `Content-Type` — MIME sniffing for `.md` is unreliable across clients
    (confirmed live: curl sends `.md` as `application/octet-stream`).
  - Gated under `prompt_templates:write` (no lead/client link exists on
    this endpoint, unlike Step 3, so there's no existing CRM-workflow
    permission to piggyback on).
  - 13 new tests (extractor + service + controller — `pdf-parse`/
    `mammoth` themselves are mocked in the extractor spec, not exercised
    against real binary fixtures), full suite now 175 suites / 1003
    tests, all passing. Verified end-to-end against the real Anthropic
    API with a real uploaded `.txt` file (reached the same known
    account-credit `502` as Steps 1–3, after successfully extracting text
    and uploading to storage — proves the whole pipeline up to the AI
    call), plus real validation checks: an unsupported `.exe` upload
    correctly `400`s, and a real `.md` file correctly extracts and
    reaches the AI call (not rejected).
- **Phase 8 — AI Workspace, Step 3 (Proposal Generator) (`apps/api`)** —
  `POST /proposal-generator/generate`: takes exactly one of clientId/
  leadId plus a free-text requirements brief, resolves the subject's
  display name (`Client.name` or `Lead.organization ?? contactName`),
  renders the seeded `proposal-generation-v1` template (Step 2, updated
  this step to instruct the model to return a single JSON object — no
  markdown fences, exact key names), calls `AiService` for a real
  completion, and parses the response into a structured draft: scope,
  deliverables, timeline, pricing assumptions, risks, exclusions,
  technology stack. `rawText`/`parsedSuccessfully` are always returned
  alongside the structured fields so a caller can fall back to the raw
  model output on a parse failure (markdown-fenced JSON is stripped and
  retried; genuinely unparseable prose falls back cleanly) rather than
  silently misattributing content to the wrong field.
  - **Writes nothing to the database** — a deliberate design decision, not
    a shortcut: "Allow human editing before sending" (this step's own
    brief) means the draft is meant to be reviewed and copied into a real
    `Quotation` through the existing, unchanged `POST /quotations` flow.
    Auto-creating billable `QuotationItem` rows from an LLM's pricing
    guesses would cross from "AI assists" into "AI replaces a financial
    decision" — the Phase 8 brief's own explicit boundary. See
    `modules/proposal-generator/README.md`.
  - Reuses `PromptTemplateService` (new `renderByKey()` method, looks up
    by the template's stable `key` rather than a fragile seeded UUID) —
    no prompt logic duplicated in this module, per Step 14's own
    "avoid duplicated prompt logic" rule. `PromptsModule` now exports
    `PromptTemplateService` for this reuse.
  - Gated under the existing `quotations:write` permission, not a new
    AI-specific one — drafting a proposal is the same business action
    `POST /quotations` already gates, AI is how it's drafted.
  - 9 new tests (service + controller), full suite now 172 suites / 990
    tests, all passing. Verified end-to-end against the real Anthropic
    API again — same real, structured `502` (account credit balance) as
    Steps 1–2, confirming the full chain (auth → RBAC → client resolution
    → template render → AI call → error surfacing) works correctly; also
    verified both validation-error paths (missing / both of clientId+
    leadId → `400`) without needing a live AI call.
- **Phase 8 — AI Workspace, Steps 1–2 (Provider Abstraction + Prompt
  Library) (`apps/api`)** — the first two steps of a new 14-step spec
  ("Phase 8"), scoped deliberately to just the foundation everything else
  depends on (confirmed with the user before starting — the full spec
  spans provider adapters, 6 separate AI features, a knowledge base with
  semantic search, a chat workspace, cost tracking, admin settings, and
  security/governance; none of that is built yet, see the deferred list
  below).
  - **Step 1 (`apps/api/src/ai/`)** — a real strategy/factory provider
    abstraction: `AiProviderAdapter` interface, one adapter per provider
    (Anthropic, OpenAI, Gemini, OpenRouter — all four requested in the
    spec), `AiProviderFactory` (resolves/caches by provider, defaults from
    config), `AiService` (the one entrypoint business logic should ever
    call). **Anthropic is real and tested** — `@anthropic-ai/sdk`, a real
    user-supplied `ANTHROPIC_API_KEY`, verified against the live API (see
    below). OpenAI/Gemini/OpenRouter are structurally complete against
    each provider's real REST API shape (plain `fetch()`, not an SDK) but
    **live-untested** — no key configured for any of the three. Every
    provider's key is optional; `AiService.complete()` throws a clear 503
    for whichever isn't configured, same "reduced capability, not a boot
    failure" treatment `EmailService`/`StorageService` already established.
  - **Step 2 (`apps/api/src/modules/prompts/`)** — a real, tenant-scoped,
    versioned `PromptTemplate` CRUD (Create/List/Get/Update — no Delete,
    deactivate via `isActive` on update, same shape `ClientController`
    already follows) plus two actions: `POST /prompt-templates/:id/render`
    (pure `{{variable}}` string interpolation, no AI call) and
    `POST /prompt-templates/:id/test` (renders, then calls `AiService` for
    a real completion — the one action in this whole phase with real
    external cost). 9 real templates seeded (`prisma/seed.ts`), one per
    category in the spec's own example list (proposal generation,
    requirement analysis, website audit, SEO recommendations, client email,
    meeting summary, scope generation, project estimation, risk analysis).
  - New migration (`20260729100000_add_ai_workspace_prompt_templates`),
    RBAC (`prompt_templates:read/write`, Manager/Project Manager tier only
    — a deliberately conservative default for a brand-new capability with
    real external cost, not opened to sales/client this phase). 11 new
    tests (factory + service + controller), full suite now 170 suites /
    981 tests, all passing. `apps/web` untouched — Steps 1–2 have no
    frontend deliverable; the first UI-facing consumer is Step 3+.
  - **Verified end-to-end against the real Anthropic API, not mocked**:
    logged in, listed the 9 seeded templates, rendered one with real
    variables, then called `/test` — got a real network round-trip and a
    real, structured error back from Anthropic (`400`, insufficient
    account credit balance) — proves the key/auth/request path is
    genuinely live, not just structurally plausible. Along the way, fixed
    `AnthropicAdapter` to translate the SDK's own `APIError` into a real
    `BadGatewayException` (502, with Anthropic's actual message) instead
    of leaking an opaque 500 — verified the fix surfaces correctly.
    Getting an actual successful completion just needs credit added to
    that Anthropic account — outside this session's control.
  - Also fixed, while in `apps/api/.env`: `CORS_ALLOWED_ORIGINS` only listed
    `:3000`, but the web dev server was running on `:3001` (port 3000 was
    occupied) — every browser-side `fetch()` from the frontend to the API
    was being silently CORS-blocked. This was the real cause of the
    "browser can't reach the API" investigation from earlier in this
    session (see decisions.md) — not a code bug, a one-line local `.env`
    config gap. Added `:3001` alongside `:3000`.
  - Explicitly deferred (Steps 3–14, none started): Proposal Generator,
    Requirement Analyzer (PDF/DOCX/MD/TXT upload+extraction), Project
    Estimator, Task Generator, Content Assistant, Email Assistant, a
    Knowledge Base with semantic search (designed for future RAG), an
    AI Chat Workspace scoped to a project's own context, Usage & Cost
    Tracking, AI Settings (admin-configurable providers/keys/quotas), and
    the full Security & Governance step (prompt logging, sensitive-data
    filtering, rate limits beyond the app-wide default, audit-log wiring
    for AI actions specifically). `AiService`/`AiCompletionResult` were
    shaped with token/latency fields already present so Step 11 doesn't
    require touching the provider layer again, but no usage-log
    persistence exists yet — nothing is tracked/stored today.
- **Phase 7 — Business Workflow Audit + Project/Task/Milestone module
  (`apps/api` + `apps/web`)** — Step 1 of the Phase 7 spec first
  (`docs/implementation/phase-7-workflow-matrix.md`): read the actual code
  (not docs) across CRM/Billing/Notifications/Audit/Reporting and found
  most of it already partially built by earlier Phase 7 work, but one
  genuine greenfield gap — `apps/api/src/modules/projects/` and
  `content/` were README-only placeholders, never imported into
  `app.module.ts`, while `Project`/`ProjectMember`/`Milestone`/`Task`/
  `Document`/`ActivityLog` were already fully modeled in `schema.prisma`
  since Phase 1.1A with **no migration ever generated for them** —
  confirmed by diffing `prisma/migrations/` against the schema, and by a
  live `prisma migrate diff` against the dev DB, which also revealed the
  6 tables + RLS policies + grants already existed there directly (no
  `_prisma_migrations` row) — a pre-existing drift from work that predates
  this session, now reconciled into a real migration
  (`20260729090000_add_project_management`) rather than left undocumented.
  - Added one new model, `Comment` (task/milestone XOR via a hand-written
    CHECK constraint, mirroring `quotations_lead_xor_client_check`) — no
    comment/annotation model existed anywhere before.
  - Built `ProjectsModule`: `project`/`milestone`/`task`/`document`/
    `comment` controller+service+repository triads, tenant-scoped,
    RBAC-gated (`projects:*`/`milestones:*`/`tasks:*`/`documents:*` were
    already seeded, unconsumed, since Phase 1.1B — same "found already
    seeded" situation `clients:*` was in; `comments:*` is new). Every
    write path records an `ActivityLog` row — the model already had a
    ready `projectId` FK for exactly this, so the Project workspace's
    Activity tab has real data without taking on the full cross-entity
    Activity Timeline (Step 10) scope. `GET /projects/:id` computes
    `completionPercent` on read (approved/total milestones) rather than a
    stored column. Document upload/list/delete reuses the existing
    `StorageService` (added a public `getPublicUrl()` for reconstructing
    URLs on list) — no versioning/categories/tags (Step 9's job).
  - `apps/web`: `features/projects/{api,hooks}` mirroring `features/crm/`,
    a projects list page, and a project detail page with Milestones/
    Tasks (List + a basic Kanban — status columns, click-to-advance, no
    drag-and-drop)/Files/Activity tabs, all built on the existing generic
    `components/data/*` table/pagination/filter primitives — no new
    primitives needed. `Projects` returns to the portal sidebar nav
    (`config/navigation.ts`) — it was explicitly removed there in an
    earlier phase as a mocked dead link; now backed by a real module.
  - Seed data: `ProjectMember`/`Milestone`/`Task` rows against the
    already-seeded Saffron/Kestrel projects (`prisma/seed.ts`).
  - Tests: `project`/`task` controller+service specs (23 new, mirroring
    `lead.controller.spec.ts`'s DI-wired-TestingModule pattern) — full
    suite now 167 suites / 966 tests, all passing. `apps/web` typecheck +
    lint clean.
  - Verified end-to-end against a live server (not just unit tests):
    login → create client/project/milestone/task → move task to DONE →
    add comment → upload a real file (Supabase-backed `StorageService`,
    got back a real object URL) → approve the milestone → confirmed
    `completionPercent` recalculated 0%→100% → archived the project — plus
    error paths (invalid FK → 400, comment XOR violation → 400, missing
    project → 404). `apps/web`'s own `pnpm build` hits the same
    pre-existing local-Windows `output: standalone` symlink EPERM already
    documented in Sprint 1's own tooling notes (compile + typecheck +
    all 50 static pages succeed first) — not a regression, CI builds on
    Linux.
  - Explicitly deferred (see the workflow matrix's own list): Kanban
    drag-and-drop, calendar view, task dependencies (no schema support),
    project budget (no field — likely derived from `Project.invoices`
    later, a product decision not made here), full document management
    (Step 9), Activity Timeline beyond Project (Step 10), notifications
    firing on project events (Step 11).
- **Enterprise CRM/Project-Management, Phase 2 — Quotation/Proposal
  module (`apps/api` + `apps/web`)** — "Proposal Management," built on
  the **existing** `Quotation`/`QuotationItem` model (schema's own doc
  comment: "Quote-wizard output") — confirmed via a schema-wide search
  that no separate `Proposal` model exists anywhere. Create/List/Get/
  Update (DRAFT only) + 3 terminal actions: `POST :id/send` (DRAFT→SENT
  — generates a PDF, stores it, fire-and-forgets an email to the lead/
  client), `:id/accept` (→ACCEPTED), `:id/reject` (→REJECTED).
  `leadId`/`clientId` XOR enforced app-side (DB CHECK already existed).
  Item amounts/subtotal/total always computed server-side
  (`Prisma.Decimal`), never trusted from the client — same discipline
  `InvoiceService.createFromOrder()` established. `quotationNumber`
  generated via the same bounded-retry pattern as invoice numbers.
  - **New shared infra**: `apps/api/src/pdf/` (`DocumentPdfService`,
    `@Global()`) — one PDF renderer for both Quotation (this phase) and
    Invoice (Phase 5, planned). **Deviated from the approved plan**: the
    plan named `@react-pdf/renderer`; built with `pdfkit` instead once it
    became clear the former would mean introducing React/JSX into a
    backend that has zero React anywhere — a real architectural addition,
    not just "a PDF library." `pdfkit` needed no such change. Flagged
    explicitly in `pdf/README.md`, not silently swapped.
  - Reused, unchanged: `StorageService.upload()` (already accepted an
    arbitrary buffer/contentType), `EmailService`/`JobRunner`/
    `SendEmailJob` (same fire-and-forget pattern as Phase 7's contact
    form email).
  - **One additive schema column**: `Quotation.pdfUrl String?` — nothing
    before this phase generated a PDF, so nothing needed anywhere to
    store its URL. Migration: `20260729080000_add_quotation_pdf_url`
    (hand-written — no shell access this session; a plain `ADD COLUMN`,
    no partial-index landmine involved).
  - `QUOTATIONS_READ`/`QUOTATIONS_WRITE` added to `permission.constant.ts`
    (both keys already seeded since Phase 1.1B, dead until now — `sales`
    already had both grants; `manager` gained `quotations:write` to match
    the `clients:write` precedent from Phase 1).
  - `apps/web`: `/crm/quotations` list, `/crm/quotations/new` (a full
    page, not a dialog — line items need room; `useFieldArray`, this
    portal's first repeating sub-form), `/crm/quotations/:id` detail
    (line-item table, PDF download link, Send/Accept/Reject actions).
  - **Descoped, flagged honestly**: proposal "templates" (would need a
    new model), "revision history" (no version-chain field exists —
    `Quotation.version` is the optimistic-lock counter, a different
    concept), attachments on a quotation (no join table exists).
  - New deps: `pdfkit`/`@types/pdfkit` added to `apps/api/package.json`
    — **`pnpm install` needed**, not run this session (no shell access).
  - Live-verified by the user: `pnpm install` picked up `pdfkit`/
    `@types/pdfkit` clean; `db:migrate:deploy` applied
    `20260729080000_add_quotation_pdf_url` (confirmed via "No pending
    migrations to apply" on the following run); `typecheck`/`lint` clean
    on both `apps/api` and `apps/web`; `apps/api test` — **163/163
    suites, 943/943 tests**. Two real bugs found and fixed during this
    checkpoint, both in `quotation-form.tsx` (the portal's first
    `useFieldArray` form): (1) `useForm<QuotationFormValues>`'s explicit
    generic conflicted with what `zodResolver` infers through a
    `.refine()`-wrapped schema (`ZodEffects`, not a plain `ZodObject`) —
    fixed by dropping the explicit generic and letting `useForm` infer
    from the resolver, the standard fix for this known RHF+Zod friction
    point. (2) `z.coerce.number()` fields lost their `field.value` type
    through that same implicit inference, resolving to `unknown` against
    `<Input>`'s expected `value` type — fixed with an explicit
    `value={field.value as string | number}` cast at each of the 4
    coerced-number inputs (quantity, unitPrice, taxAmount,
    discountAmount).
- **Enterprise CRM/Project-Management, Phase 1 — Client module
  (`apps/api` + `apps/web`)** — first phase of an 11-phase roadmap (full
  plan: agency-lifecycle CRM covering Lead→Proposal→Client→Project→
  Milestone→Task→Invoice→Payment, plus Activity Timeline, Notifications
  expansion, Reporting Dashboard, and a final audit/code-quality/gap-
  report pass — see the session that scoped it for the full phase list).
  Key finding that reshaped the whole roadmap: `Client`/`Project`/
  `ProjectMember`/`Milestone`/`Task`/`Document`/`Quotation`/
  `QuotationItem` are **already fully modeled in `schema.prisma`** (found
  by direct read, not assumed) with FKs already wired (`Invoice` already
  has `projectId`/`clientId`/`quotationId`; `ActivityLog` already has
  `projectId`) and their permission keys already seeded — CLAUDE.md's own
  "projects/content remain unbuilt scaffold" note confirmed literally:
  zero controllers existed for any of them. This phase is therefore
  mostly new controller/service/repository/DTO/frontend layers on an
  already-designed data model, not new domain modeling.
  - **`Client`** (`apps/api/src/modules/crm/client.{controller,service}.ts`,
    `repositories/client.repository.ts`) — Create/List/Get/Update, no
    Delete route (no `clients:delete` permission was ever seeded;
    archiving happens via the ordinary update's `status` field).
    `CLIENTS_READ`/`CLIENTS_WRITE` added to `permission.constant.ts`
    (both keys already existed in `seed.ts`'s catalog, dead until now);
    `manager` role granted `clients:write` (already had `clients:read`).
  - **`LeadService.convertToClient()`** (`POST
    /leads/:id/convert-to-client`) — a second, independent conversion
    path alongside the pre-existing `convert()` (→ `Customer`, confirmed
    via direct read to be an unrelated e-commerce lifecycle, not what
    "Lead → Client" needed). Always creates a new `Client` (never
    finds-and-links — `Client` has no unique constraint to make that
    race-safe, unlike `Customer`'s email uniqueness).
  - **`apps/web`**: `/crm/clients` list + detail pages, and the portal's
    **first real create/edit entity form** (`ClientFormDialog`,
    react-hook-form + Zod) — confirmed no such pattern existed anywhere
    in the portal before this (Lead has read + archive/convert actions
    only, no create/edit form). Lead detail page gained a "Convert to
    client" action alongside the existing "Convert to customer"/
    "Archive".
  - Live-verified by the user: `typecheck`/`lint`/`test` all clean on
    `apps/api` (163/163 suites, 943/943 tests — added real coverage for
    `convertToClient()`, not just a compile fix, in `lead.service.spec.ts`/
    `lead.controller.spec.ts`/new `client.service.spec.ts`);
    `apps/web` `typecheck`/`lint` clean. No migration needed — every
    touched model already existed.
  - Next: Phase 2 (Quotation/Proposal module — PDF generation, email via
    the existing `EmailService`, status transitions), pending the user's
    live functional check of this phase (login, `POST /clients`, convert
    a lead) before starting.
- **Real Email (Contact/Newsletter) & Product Image Upload — Phase 7
  (`apps/api` + `apps/web`)** — the user asked for two previously-
  placeholder capabilities to become real: contact-form/newsletter
  submissions actually sending email, and file uploads working. Full
  research first (confirmed, not assumed): `ContactRequest` was a real
  Prisma model since Phase 1.1A with **zero** application-layer
  consumers, its `contact_requests:*` permissions seeded but never added
  to `permission.constant.ts` (dead); no newsletter/subscriber concept
  existed anywhere; nothing in this codebase sent email (`Notification.
  channel = EMAIL` is a state-machine enum value only — no real sender
  behind it); no file-upload precedent existed anywhere (`ProductImage.url`
  was populated only as a nested write inside `POST /products`, no
  standalone image route/repository). Built, additive only, nothing
  existing changed shape:
  - **`apps/api/src/email/`** (new, `@Global()`) — `EmailService` wraps
    the `resend` package; no-ops with a logged warning (not a thrown
    error) when `RESEND_API_KEY` is unset, so the app keeps working with
    zero real credentials. `SendEmailJob` runs every send through the
    existing `jobs/` `JobRunner` (Job/JobContext/retry/dead-letter
    infrastructure built in Milestone 14, its own README's predicted
    first real consumer), fire-and-forget — never awaited in a request/
    response path, so a slow/down provider can't delay or fail a
    marketing-site form submission.
  - **`apps/api/src/modules/contact/`** (new) — `POST /contact-requests`,
    public/unauthenticated (throttled 5/60s, same tier as `POST
    /auth/login`), `ContactRequest`'s first real controller/service/
    repository. `ContactRequest.company` added (nullable) — the
    frontend form already collected it; the model had no real consumers
    before this phase, so extending it is safe. No `contact_requests:read`
    route/permission added — no admin triage UI is being built this
    phase (a real, reasonable future follow-up, not silently dropped —
    see that module's README).
  - **`apps/api/src/modules/newsletter/`** (new) — `POST
    /newsletter-subscribers`, same public/throttled shape, backed by a
    brand-new `NewsletterSubscriber` model (id/tenantId/email/status/
    subscribedAt/unsubscribedAt + the standard audit block) — not
    force-fit onto `ContactRequest` (a message-based inbox, not a
    subscription state). Upsert-by-email at the application layer
    (`findActiveByEmail()` before create/update) — subscribing an
    already-subscribed email is a no-op success, re-subscribing a
    previously-unsubscribed one flips it back — deliberately not a
    schema-level `@@unique` (would permanently block a legitimate
    re-subscribe after a soft-deleted unsubscribe); a real DB-level
    partial unique index is flagged as a reasonable future hardening
    pass, not built this phase.
  - **`apps/api/src/storage/`** (new, `@Global()`) — `StorageService`
    wraps `@aws-sdk/client-s3` (works against real AWS S3 or any
    S3-compatible endpoint — Cloudflare R2/DigitalOcean Spaces/MinIO —
    via a new optional `STORAGE_ENDPOINT`). Unlike email, throws a clear
    503 when unconfigured — an upload has no honest "silently skip"
    behavior.
  - **`POST /products/:id/images`** (`modules/catalog/`, new
    `product-image.controller.ts`/`.service.ts`/
    `repositories/product-image.repository.ts`) — genuinely new
    sub-resource surface (no per-image CRUD existed at all before this;
    images were only ever nested-created inside `POST /products`, which
    is unchanged and still URL-only). Multipart, `memoryStorage()`,
    5MB/image-mimetype-only validation via Nest's own `ParseFilePipe`.
    Reuses the existing `products:write` permission — no new permission
    key.
  - `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`/`STORAGE_*` (+new
    `STORAGE_ENDPOINT`/`STORAGE_PUBLIC_URL_BASE`) added to
    `env.validation.ts` as **validated-but-optional** — the app must
    boot and serve every existing route with zero real credentials for
    either capability; a missing var is a reduced-capability startup,
    never a boot failure.
  - `apps/web`: `app/api/contact/route.ts`/`app/api/newsletter/route.ts`
    rewired from `console.info` placeholders to real server-to-server
    calls (new `lib/server/backend-client.ts` helper, deliberately a
    separate small helper rather than a refactor of the proven
    `lib/auth/backend-auth-client.ts`) — no change to either form
    component, since the request/response shapes stayed identical.
  - **Not built, flagged rather than silently skipped:** admin list/
    triage views for contact requests or subscribers; an unsubscribe
    route/link; a portal product-image-upload UI (no product create/
    edit page exists yet to attach a file picker to — the new upload
    endpoint is real and directly testable via Swagger UI/curl in the
    meantime); the DB-level partial-unique-index hardening for
    `NewsletterSubscriber` noted above.
  - `pnpm --filter @antrique/api generate:openapi` needs a re-run to
    pick up the 3 new real routes (plus the `@ApiBody` fix below) in the
    authoritative `apps/api/openapi.json` — not run by this session (no
    shell access). `db:migrate:dev`/`db:migrate:deploy` **has** since been
    run by the user (`20260728121426_add_contact_company_and_newsletter`
    — hand-edited to strip the recurring, previously-documented
    `users_tenant_id_email_key` false-positive before applying) — the
    `NewsletterSubscriber` table and `ContactRequest.company` column are
    live in the dev database, not just in `schema.prisma`.
  - **Real-world live verification (user-driven, post-implementation):**
    both capabilities confirmed genuinely working end to end, not just
    typechecking clean — real Resend API key configured, a real contact-
    form submission produced a real delivered email (Resend message id
    captured in the server log); real Supabase Storage (S3-compatible)
    credentials configured, a real `POST /products/:id/images` upload
    produced a real object in the `antrique-assets` bucket, publicly
    reachable at its stored URL (confirmed by opening it in a browser).
    Two real, previously-invisible bugs surfaced and fixed during this
    verification (both pre-dated Phase 7, exposed by it — Swagger UI's
    "Try it out" was the first thing in this codebase to ever call a
    protected route's docs from the browser):
    - `main.ts`'s Helmet CSP (`default-src 'none'`, Milestone 13) had no
      `connectSrc` override; Helmet merges its own defaults for
      `script-src`/`style-src`/`img-src` (so Swagger UI's page/assets
      loaded fine) but has **no** default for `connect-src`, which
      silently fell back to `default-src: 'none'` — blocking every
      fetch Swagger UI's own "Try it out" made, even same-origin. Fixed
      by adding `connectSrc: ["'self'"]` alongside the existing
      overrides — every real JSON API response is still exactly as
      locked-down as before; only same-origin fetches from this app's
      own served pages (i.e. only `/api/docs`) are now permitted.
    - `product-image.controller.ts`'s `POST /products/:id/images` had
      `@ApiConsumes('multipart/form-data')` but no `@ApiBody()` schema —
      Swagger UI had no way to know a file field existed, so it rendered
      no upload widget at all. Fixed with an explicit `@ApiBody()`
      (`{file: {type: 'string', format: 'binary'}}`), the standard
      NestJS/Swagger recipe for multipart file uploads.
    - Also found, mid-verification, that this project's Supabase Storage
      instance serves public object URLs from its dedicated
      `storage.supabase.co` subdomain, not the bare `<project-ref>.
      supabase.co` domain most Supabase docs/examples assume — not a
      code bug (`StorageService.buildPublicUrl()` just concatenates
      whatever `STORAGE_PUBLIC_URL_BASE` is configured to), but worth
      recording since it cost real debugging time and would trip up
      the next person configuring Supabase Storage against this same
      code path.
- **Business Portal Engineering Review (`apps/web`)** — modeled on the
  Backend v1.0 Review phases and the Marketing/Auth reviews: a review-and-
  fix pass over the Business Portal below, zero new modules/features/
  redesigns. Full findings folded into `docs/architecture/business-
  portal.md`. Real, genuine issues found and fixed: **`use-list-params.ts`
  called `router.push()` for every filter/search/sort/page change** — a
  systemic bug affecting all 7 modules' list pages, since every
  incremental filter change (including each debounced search keystroke)
  added its own browser-history entry, making the Back button effectively
  step through filter history one change at a time instead of leaving the
  list page; fixed to `router.replace()` (list state is still fully
  shareable/bookmarkable via the URL either way — only the history-entry
  behavior changes). **The Bespoke wizard's customer search fired one
  `GET /customers` request per keystroke** — unlike every other module's
  search box (which goes through `list-toolbar.tsx`'s existing 300ms
  debounce), the wizard's own customer-search `Input` was wired directly
  to the query with no debounce; fixed with the same debounce pattern
  plus `enabled` gating on the debounced value's length, which also fixed
  a real flash-of-wrong-content bug (a "No customers found" flash while
  still typing, mid-debounce). The wizard also showed the selected
  customer as a raw UUID (`Selected customer id: <uuid>`) instead of
  their name — fixed by resolving it from the already-fetched search
  results. **Four near-identical sub-nav components** (`inventory-nav`/
  `crm-nav`/`billing-nav`/`admin-nav.tsx`) — each hand-rolled the same
  link-strip-with-active-state logic, with inconsistent (and, for
  `inventory-nav`, incidentally-correct-only-by-luck) active-tab matching
  — consolidated into one shared `components/data/module-sub-nav.tsx`
  using a "longest matching href" rule that correctly handles Admin's own
  case (one tab, `/admin`, is a literal parent path of its siblings).
  **Nine near-identical status/type filter `Select`s**, duplicated across
  Catalog/Orders/Leads/Follow-ups/Invoices/Payments/Notifications/
  Warehouses/Suppliers/Inventory-Transactions, consolidated into a new
  `components/data/enum-filter-select.tsx` — while doing this, found a
  real, visible UX inconsistency: Catalog/Warehouses/Suppliers/Follow-ups
  Title-Cased their filter option labels ("Draft," "Active," "Pending")
  while the `StatusBadge` in the very same table row renders the raw enum
  text ("DRAFT," "ACTIVE," "PENDING") — normalized every filter to match
  what its own badges already show, rather than picking one convention
  arbitrarily. **Four raw hand-rolled `<table>` elements** (Catalog
  product variants, Order line items, Invoice line items, Supplier
  supplied-items) replaced with the existing `Table`/`TableHeader`/
  `TableBody`/`TableRow`/`TableHead`/`TableCell` component family
  (`components/ui/table.tsx`) already used by `DataGrid` — a real
  "one-off table" duplication the review brief explicitly asked to check
  for. **Mutation-safety hardening**: four `AlertDialogAction` buttons
  (Order Cancel, Lead Convert, Lead Archive, Invoice Void) were missing
  the `disabled={mutation.isPending}` guard every other write action in
  the portal already had (Order Advance, Invoice Issue, Follow-up
  Complete/Cancel/Reopen, Notification Retry) — added for consistency and
  real double-submit protection. **Verified, not changed** (real findings
  that turned out to be non-issues on inspection): no `console.log`/`any`
  types/`dangerouslySetInnerHTML`/raw `fetch()` calls anywhere in the
  portal; `CustomerNote.body` (a "sanitized HTML/markdown string" per its
  own backend DTO comment) is deliberately rendered as plain text, not
  parsed as HTML, since there is no dependency-free way to verify what
  "sanitized" means without one, and plain-text is the safe default; no
  refund UI exists anywhere (`POST /payments/:id/refund` still always
  501s); Payments/Audit-Logs' lack of a "Sort by" control (unlike every
  other module) was reviewed and kept as a deliberate, reasonable choice
  for ledger-style views where newest-first is the dominant use case, not
  treated as inconsistency to "fix" by adding UI surface. **Validation**:
  the tool-execution outage persisted through this review too —
  `typecheck`/`lint`/`prettier`/`build` still could not be run; Grep
  remained available and was used throughout to sweep the whole `(portal)`
  tree for `console.*`/`any`/`TODO`/`dangerouslySetInnerHTML`/raw
  `fetch()`/raw `<table>` patterns, cross-checking every finding against
  actual file contents before fixing, not from memory of having written
  the code originally.
- **Business Portal — all 7 Backend v1.0 modules (`apps/web`)** — the
  authenticated business application: Catalog, Bespoke Customizer (→ order
  creation), Orders, Inventory, CRM, Billing, Admin, built entirely against
  the real, frozen Backend v1.0 API on top of the existing Phase 1 shell/
  auth/query infrastructure. Full architecture, every file, and the
  backend-contract gaps below live in `docs/architecture/business-
  portal.md`; this entry summarizes. **Ground truth over guesswork**: the
  generated `types/api/schema.ts` is confirmed useless for field typing
  (every DTO is `Record<string, never>`) — every type in `types/api/
  {catalog,bespoke,orders,inventory,crm,billing,admin,customers}.ts` was
  hand-authored by reading the real `apps/api/src/modules/*` DTO/
  controller/constant source directly, not inferred or guessed.
  **Shared foundation** (`components/data/`) built once, reused by all
  seven modules: `resource-table.tsx` (loading/error/empty states around
  the existing `DataGrid`), `use-list-params.ts` (URL-driven page/search/
  sort/filter state), `list-toolbar.tsx`, `list-pagination.tsx`,
  `status-badge.tsx` (tone-mapped over the existing `Badge`),
  `detail-page-header.tsx`; plus a hand-authored `components/ui/
  alert-dialog.tsx` (shadcn CLI still unreachable — same pattern
  `form.tsx` established) reused for every destructive confirmation
  (Cancel Order, Archive Lead, Void Invoice). Every list column disables
  `DataGrid`'s own built-in click-to-sort (`enableSorting: false`) —
  discovered that it re-sorts only the current page client-side, which
  would silently contradict the URL-driven server sort; an explicit "Sort
  by" control replaces it.
  **Real backend gaps found and deliberately NOT worked around** (would
  have violated "do not implement functionality the backend doesn't
  have"): (1) the Bespoke wizard's Fabric and MeasurementProfile browsing
  are both real, fully-CRUD backend entities, but `CreateOrderItemDto`/
  `selectedOptions` has no field for either — confirmed by reading
  `order.service.ts`'s `computeCustomizationPricing()` directly. Fabric is
  shown as a clearly-labeled read-only reference panel in the wizard's
  review step (not a selectable field implying it's submitted);
  Measurement Profiles are omitted from the order flow entirely rather
  than faked. (2) No reverse "productVariantId/fabricId → product/fabric
  name" lookup endpoint exists anywhere — Orders' line items, Inventory's
  item rows, and Supplier's supplied-items table all show the raw id
  (truncated, full id in a `title` tooltip) instead of a fabricated name.
  (3) `LeadStatus.LOST` (CRM) and `InvoiceStatus.OVERDUE` (Billing) are
  real enum values with no endpoint that ever sets them automatically (no
  cron/job exists) — documented in the type files' own comments, not
  silently treated as reachable. (4) Style-option cross-group
  incompatibility checking was scoped out — `incompatibleStyleOptionIds`
  only exists on the standalone `GET /style-options/:id` response, not the
  nested view the wizard already has, and fetching it per-option would be
  an unjustified N+1; the wizard enforces one-selection-per-group instead.
  **Per-module notes**: Catalog — list/detail only (categories/collections
  are read-only reference data for filters, no CRUD UI, matching the
  brief). Bespoke — a 4-step wizard (customer search, variant+quantity+
  warehouse, style options, monogram+review) submitting straight to
  `POST /orders`, reached from a Catalog product's detail page (no
  standalone nav entry — there's no submission entity to list). Orders —
  the one legal forward status transition (`ORDER_FORWARD_TRANSITIONS`)
  as a single "Advance to X" action, Cancel as a separate
  `AlertDialog`-confirmed action only shown while `ORDER_CANCELLABLE_
  STATUSES` includes the current status (a stricter permission
  server-side; a 403 here is expected for non-Admin roles and handled by
  the existing `getErrorCopy()`, not hidden). Inventory — stock level
  (`in stock`/`low stock`/`out of stock`) is entirely client-derived
  (`features/inventory/stock-level.ts`) since `InventoryItem` has no
  status field at all; Warehouses/Suppliers get list+detail, Items/
  Transactions get list only (matches the brief's own bullets). CRM —
  Lead Archive/Convert and Follow-up Complete/Cancel/Reopen all wired;
  Customer has no standalone list page (reached via a Lead's
  `convertedCustomerId` or an Order's `customerId`) but a real detail page
  with Notes (the one genuinely-CRUD CRM entity beyond status actions) and
  a read-only Activity timeline. Billing — Invoice Issue/Void (void only
  from `INVOICE_VOIDABLE_STATUSES`), Payments list is read-only (Refund
  always returns 501 — confirmed, not built). Admin — dashboard renders
  the 5 modules' KPIs generically from the response's own loosely-typed
  `Record<string, string | number>` metrics bag (deliberately not
  hardcoding field names the DTO itself doesn't guarantee), Notification
  retry (FAILED only), read-only Audit Logs, Report generate + JSON
  snapshot detail. **Navigation**: replaced the Phase 1 mocked
  `PORTAL_NAV_ITEMS` (`Projects`/`Documents`/`Support`/`Settings` had no
  backend module and no real page) with the seven real modules; also
  found and fixed a real, silent bug — `ROUTES.portal.dashboard` (the
  post-login redirect default) pointed at a route with no `page.tsx`,
  a 404 waiting for the first real login, invisible until this phase gave
  it something to land on. Built a real landing page there instead of
  just repointing the redirect. **Validation**: the tool-execution outage
  (Bash/PowerShell) persisted for this entire phase, same as every phase
  since Application Runtime Architecture — `typecheck`/`lint`/`build`
  could not be run. Grep intermittently recovered partway through (after
  being broken all session) and was used to confirm no dangling references
  to the removed mocked routes/nav items; Glob remained broken throughout.
  Every type/route/permission fact was verified by reading the real
  `apps/api` source directly (dozens of controller/DTO/constant files),
  not from the earlier phase's own research summary alone, after that
  summary was found to be incomplete on the load-bearing `selectedOptions`
  shape.
- **Authentication Engineering Review (`apps/web`)** — modeled on the
  Backend v1.0 Review phases and the Marketing Website review; zero new
  auth features. Full findings in `docs/architecture/application-
  runtime.md`'s new "Authentication Engineering Review" subsection under
  §5. Real issues found and fixed: `request.ts`'s 401-retry refresh and
  `AuthProvider`'s proactive pre-expiry-timer refresh were two
  independent, undeduplicated calls to `authService.refresh()` — a race
  that could fire two concurrent `POST /api/auth/refresh` requests if
  they landed close together (harmless given the backend's stateless
  refresh, but avoidable); fixed by moving the in-flight-promise dedup
  into `authService.refresh()` itself, the one real shared network
  boundary, and removing `request.ts`'s now-redundant copy of the same
  pattern. **A real, exploitable open-redirect bypass**: the login page's
  `?redirect=` validation (`safeRedirectPath()`) only checked
  `startsWith('//')`, missing that the WHATWG URL spec normalizes a
  leading backslash the same as a forward slash for special schemes (a
  legacy IE-compat rule) — `/\evil.com` bypassed the check exactly like
  `//evil.com` would have. Fixed by resolving the path against a fixed
  base with the real `URL` parser and comparing origins, which inherits
  the browser's own normalization instead of re-deriving it by hand — this
  is a well-known open-redirect bypass class, not a hypothetical.
  **Security hardening**: none of the four auth BFF routes
  (login/session/refresh/logout) set `Cache-Control: no-store`, even
  though three of them return a real access token in the body — added a
  small `noStoreJson()` helper (`lib/auth/no-store-response.ts`) applied
  to all four, defense in depth against any caching layer between the
  browser and the app. Verified, not changed (already correct): no
  localStorage/sessionStorage token usage anywhere (one grep hit was a
  comment documenting the absence, not a real usage); no sensitive data
  logged anywhere in the BFF routes; relaying a `BackendAuthError`'s body
  verbatim to the browser is safe because the real backend's own
  exception filter is independently verified (Security Hardening
  milestone) to never leak internals; `SameSite=lax` unchanged (CSRF
  assumption intact); `PasswordInput`/`Input`'s non-`forwardRef` pattern
  correctly forwards RHF's field ref under this repo's actual React 19
  semantics (checked directly, not assumed from older-React convention).
  Two items flagged as low-severity, deliberately not changed: the login
  form has no double-submit guard beyond its disabled button (identical,
  pre-existing pattern to Contact/Quote — fixing only login would be
  inconsistent, fixing all three is out of scope for an auth-only
  review); `error-copy.ts`'s 401 case is largely theoretical until a real
  business page fetches data during render. **Validation**: the
  tool-execution outage never recovered this session either —
  `typecheck`/`lint`/`prettier`/`build` still could not be run. Every fix
  was verified by direct code reading, including tracing the exact WHATWG
  URL normalization behavior the redirect fix relies on — but this is
  still not the real toolchain.
- **Authentication UI & User Flows (`apps/web`)** — the last real gap in
  the auth infrastructure the Application Runtime Architecture phase
  built: `ROUTES.auth.login` pointed at a 404 (no `app/(auth)/login/`
  page existed). Full writeup in `docs/architecture/application-
  runtime.md` §5. Login page: email + password, RHF + Zod
  (`lib/validation/auth.ts`), reuses `components/ui/password-input.tsx`'s
  already-built accessible show/hide toggle (nothing to build there),
  submits straight to the existing `authService.login()` seam — no new
  API contract. Deliberately no signup/password-reset (the real backend
  has no such endpoints — `apps/api/src/modules/auth/README.md`'s own
  scope note) and no "remember me" (the backend issues the same token
  pair unconditionally, so a checkbox would control nothing real) — both
  documented as confirmed backend-limitation calls, not oversights.
  **Session UX gap closed**: `middleware.ts`'s session check went from a
  boolean to a three-state `'valid' | 'expired' | 'missing'`, so a portal
  redirect to `/login` only carries `reason=expired` when a session
  genuinely lapsed, never on a plain first visit — `AuthProvider`'s own
  mid-session redirect got the same treatment. The login page's
  `?redirect=` is validated (`/`-prefixed, not `//`) before use, closing
  an open-redirect risk a naive read of that param would have had.
  **Error triage**: `authService`'s `parseOrThrow` previously discarded
  the HTTP status of a failed call — added `AuthRequestError` (carries
  `status`) so the login form can show "incorrect email or password"
  for a 401 specifically rather than one generic message for every
  failure kind. New `lib/errors/error-copy.ts` gives `(portal)`/`(auth)`
  `error.tsx` distinct copy per error kind/status (401/403/404/5xx/
  network) instead of one undifferentiated message — 403 has no real
  trigger yet (no permissions exist), this is groundwork a future
  permission-gated module can rely on without this layer changing again.
  **User menu**: now shows a `Skeleton` avatar during the brief
  post-hard-refresh window before session bootstrap resolves, instead of
  flashing "Unknown user". **Cleanup**: removed `signup`/`forgotPassword`
  from `config/routes.ts`'s `ROUTES.auth` — unbacked by any real backend
  capability or planned page, violating that file's own "add an entry
  alongside creating each real page" convention (confirmed unreferenced
  anywhere before removing). **Validation**: the tool-execution outage
  first hit during the Application Runtime Architecture phase, and never
  recovered through the Marketing Website build or its review, also never
  recovered this session — `typecheck`/`lint`/`prettier`/`build` still
  could not be run. Every change was verified by direct code reading
  (including re-confirming, via the actual React 19 ref-forwarding
  semantics installed in this repo, that `PasswordInput`/`Input`'s
  non-`forwardRef` pattern correctly forwards RHF's field ref rather than
  silently dropping it — a real question raised and resolved during
  review, not assumed either way) — but this is still not the real
  toolchain, and remains the top item before this can be called fully
  validated.
- **Marketing Website Engineering Review (`apps/web`)** — modeled on the
  Backend v1.0 Review phases: a review-and-fix pass over the Marketing
  Website below, zero new pages/features/scope. Full findings in
  `docs/architecture/marketing-site.md` §10. Real, genuine issues found and
  fixed (not subjective redesigns): `/work` was trimmed of duplicated
  content (it repeated the full service-cluster grid and process timeline
  already on Home/Services/About-Process); every page's Open Graph/Twitter
  card image was silently broken (`buildPageMetadata` defaulted to a
  `/og/default.png` path confirmed, by direct filesystem check, to not
  exist — fixed to omit the field rather than assert a 404); JSON-LD had
  three more of the same problem (`organizationSchema`'s `logo`/`sameAs`,
  `websiteSchema`'s sitelinks-search `potentialAction` targeting a
  nonexistent `/search` route, `blogPostingSchema`'s `publisher.logo` — all
  fixed to omit rather than assert); the app had no favicon at all (added
  `app/icon.svg`, a simple monogram — the one asset creatable without an
  image tool, since SVG is authorable text); `SectionHeading`'s eyebrow
  label used `text-accent`, a pairing `design-system.md`'s own contrast
  table verifies only at the 3:1 non-text/focus-indicator threshold
  (3.30:1 in light mode), not the 4.5:1 normal-text threshold that label
  actually needs — a real WCAG AA failure, fixed to `text-muted-foreground`;
  the quote wizard's progress bar had no accessible name (added
  `aria-label`); the 3D hero's WebGL render loop kept running after being
  scrolled past (fixed with the same IntersectionObserver lazy-mount
  pattern `components/media/video.tsx` already established); `/resources`'s
  metadata description promised "guides" that don't exist on the page;
  Home's hero CTA `Stagger` had an inconsistent timing override removed.
  Verified-clean, not touched: client/server boundaries, dependency
  weight (no GSAP/Carousel pulled into the marketing bundle), zero
  circular dependencies, no dead links, no `MagneticButton` misuse, no
  fabricated content anywhere (re-verified via full-tree search). One
  finding flagged but NOT changed pending real verification: `SITE.twitter`
  (`@antrique`) is unconfirmed as a real handle (unlike the other broken
  references, this isn't something the codebase can prove false); a
  pre-existing `FormMessage` `text-destructive`-on-background pairing
  wasn't in the verified contrast table either, but changing a
  cross-app-shared component on unverified suspicion was judged riskier
  than flagging it. **Validation**: `typecheck`/`lint`/`prettier`/`build`/
  Lighthouse could not be run — the tool-execution outage first hit during
  the Application Runtime Architecture phase never recovered through this
  entire review. Every fix was verified by direct code/filesystem reading,
  not the toolchain — flagged as the top item before Phase 3.
- **Marketing Website (`apps/web`)** — this session's real Sprint 2 scope
  (see the note above re: the never-recovered `sprint-02.md` task list).
  15 real pages built on top of the Application Runtime Architecture shell
  below: Home, Services, Industries, Work, About(+Process), Pricing,
  Resources, Blog (listing + `[slug]` detail), FAQ, Contact, Quote,
  Privacy, Terms. Full reasoning in `docs/architecture/marketing-site.md`;
  key points: **Content honesty** — Antrique is pre-launch
  (`docs/product/01-discovery.md`'s real Vision content, despite the
  filename mismatch bug — see blockers.md), so Portfolio/Testimonials/
  Stats content uses honest early-stage framing (confirmed with the user)
  instead of fabricated client names/quotes/logos: `/work` frames around
  capabilities+process with a real "case studies coming soon" empty state,
  Home's stats section cites real platform facts (test suite count,
  coverage, WCAG baseline) instead of invented traction numbers, Pricing
  shows scope tiers with zero fabricated figures, and `/contact`
  deliberately skips `localBusinessSchema` (no real address/phone to put
  in it truthfully — a fabricated one would misrepresent a real business
  location). **Lead capture**: Contact/Quote forms submit to new,
  honestly-labeled placeholder Route Handlers (`app/api/{contact,quote}/
  route.ts`) that validate (Zod, schemas shared with the client forms via
  new `lib/validation/`) and log server-side — no real backend CRM
  endpoint exists yet (Sprint 3 scope), matching this codebase's own
  "capability exists, first consumer later" pattern rather than a fake
  integration; submissions are NOT actually persisted anywhere yet,
  flagged as an explicit pre-launch gap. **Quote wizard** implements the
  real spec found (despite the filename) in
  `docs/product/05-admin-dashboard.md`: one question per screen, visible
  progress, per-step validation that never drops already-entered data,
  contact fields captured last, focus moved to each new step's first field
  programmatically (the browser has no default behavior for that). **SEO**:
  new `lib/seo/metadata.ts` finally wires the `RouteMeta` contract
  (`seo.config.ts`, spec-level since the Foundation phase, never
  implemented until now) to real `generateMetadata` calls on every page;
  root `config/metadata.ts` now derives its title template from the same
  `SITE` constant instead of a second, differently-formatted copy that
  existed alongside it. JSON-LD via the existing `schema.ts` builders
  (unchanged) rendered through a new 6-line `<JsonLd>` component.
  **Design-system reuse**: zero new base UI primitives except `<JsonLd>` —
  the "mega menu" (`components/marketing/site-nav.tsx`) is built on the
  already-existing `DropdownMenu` primitive rather than a new
  `NavigationMenu`, and `MagneticButton` was deliberately NOT used
  anywhere (every CTA is a real `<Link>`-based `Button`; wrapping that in
  `MagneticButton`, which renders a native `<button>`, would nest an `<a>`
  inside a `<button>` — invalid HTML) — `Hover` + `Button`'s own built-in
  states cover the same interaction instead. **3D**: `hero-scene.tsx`, the
  first real consumer of the Design System phase's `scene-canvas.tsx`
  (built, zero prior consumers) — a purely decorative rotating wireframe
  icosahedron (primitive geometry only, no GLTF models exist), lazy-loaded
  (`next/dynamic({ssr:false})`, required for WebGL), skipped under reduced
  motion and below `lg`, never load-bearing. **Content**: new `src/content/`
  — services (15/4 clusters) and industries (10) derived reasonably from
  the real cluster names and persona list in the product docs (neither is
  literally enumerated anywhere), since no product doc lists them; flagged
  as needing a real content pass if the actual business list differs.
  Validation: could only get partway — `docs/implementation/progress.md`'s
  own prior Application Runtime Architecture entry already flagged an
  unresolved production-build failure traced into Next's own precompiled
  internals; that investigation was cut short by a tool-execution outage
  (Bash/PowerShell both stopped responding) that persisted for this entire
  phase too, so `typecheck`/`lint`/`build` could not be re-run at all this
  session — every file was written carefully against the actual installed
  package APIs (read directly from `node_modules` and existing working
  call sites) rather than assumed, but this is explicitly NOT verified via
  the toolchain and is flagged as the first thing to do once shell access
  returns.
- **Application Runtime Architecture (`apps/web`)** — NOT a Sprint 2/4 task;
  the direct follow-on to the Design System phase below, explicitly BEFORE
  any business modules/marketing content/login-signup forms. Builds the
  runtime shell every future page/feature sits inside: real layouts for all
  three route groups, the portal application shell, a navigation system, a
  full authentication architecture, a completed API runtime, TanStack Query
  conventions, cross-cutting global state, and upgraded error/loading
  boundaries. Full reasoning, every file, and the risks below all live in
  `docs/architecture/application-runtime.md` — this entry summarizes.
  Auth: the real backend (`apps/api`) is strictly Bearer-token-authenticated
  (`credentials: false` in its CORS config, `JwtAuthGuard` reads only
  `Authorization: Bearer`, never a cookie) — verified against source, not
  assumed — so an httpOnly session cookie is a concept this Next.js server
  owns entirely. Used the two env vars the Foundation phase had already
  reserved for exactly this (`API_INTERNAL_URL`, `SESSION_COOKIE_NAME`)
  rather than inventing a different strategy: new `app/api/auth/{login,
  session,refresh,logout}/route.ts` proxy to the real backend
  server-to-server (no CORS involved), the httpOnly cookie holds both JWTs,
  and the access token lives in memory only client-side
  (`store/auth-store.ts`), recovered via `GET /api/auth/session` on mount
  (`providers/auth-provider.tsx`). `services/api/request.ts` gained a
  401-refresh-and-retry-once path (de-duplicated via a shared in-flight
  promise) and a GET-only network/5xx backoff retry (300ms/900ms, 2
  attempts); `services/api/interceptors.ts` got its first real interceptor
  (Bearer + `X-Tenant-ID` header attachment, a no-op server-side to avoid
  leaking one browser tab's in-memory token into a shared Node module
  during SSR). `middleware.ts` (new, root) does a presence/expiry-only
  redirect for portal/auth paths — explicitly documented as a UX shortcut,
  not a security boundary; real enforcement stays exclusively the
  backend's own `JwtAuthGuard`. Found and worked within two real,
  structural backend constraints rather than routing around them: every
  `apps/api` request (including login) must resolve a tenant or gets a
  400, and there is still no `/me` endpoint (Backend v1.0 Review Phase 4's
  own finding) — so `NEXT_PUBLIC_TENANT_ID` is one configured tenant per
  deployment (real per-visitor resolution is an open product decision, see
  `blockers.md`), and the client can only ever know a session `email`, no
  name/role/permissions. Shell: `components/portal/portal-shell.tsx`
  composes the existing `Sidebar`/`Navbar` shells with new
  `portal-header.tsx` (breadcrumbs, sidebar toggle, a command-palette
  trigger styled as a search box rather than a real non-functional input,
  notification bell, user menu), `command-palette.tsx` (added shadcn's
  `command.tsx` via CLI — `cmdk` was already installed — lazy-loaded via
  `next/dynamic({ssr:false})`), `notification-center.tsx` (mocked),
  `user-menu.tsx` (the one real, fully-wired auth action — logout).
  `components/navigation/` is the new reusable nav system (`NavLink` is the
  one place active-route detection lives; `DesktopNav`/`MobileNav` split
  purely via Tailwind breakpoints, no JS media-query hook). State: three
  new cross-cutting Zustand stores (`auth-store`, `ui-store`,
  `notification-store`) — found a real, narrow type gap in the existing
  shared `store/create-store.ts` factory (its generic doesn't compose with
  the `persist` middleware `ui-store.ts` needs for a remembered sidebar
  state) and worked around it locally in `ui-store.ts` rather than
  generalizing the shared factory's generic signature, to keep this
  phase's diff to Foundation-phase files at zero; documented as a flagged,
  not-fixed gap. Error/loading: root + all three route-group `error.tsx`/
  `loading.tsx` upgraded from the Foundation phase's deliberate plain-HTML
  placeholders to the now-available `ErrorState`/`Skeleton`/`Spinner`
  components — `global-error.tsx` deliberately excluded (it must survive a
  root-layout crash, so it stays dependency-minimal on purpose). Query:
  `config/query.ts` centralizes `QueryClient` defaults (queries retry
  network/5xx twice, skip 4xx; mutations never auto-retry; a
  `MutationCache` toast safety net) and `lib/query/query-keys.ts` adds one
  generic key factory — no business queries yet, per this phase's own
  scope. Accessibility: skip-to-content link + `id="main-content"`
  landmarks in every layout; verified (not rebuilt) that `Drawer`/`Dialog`/
  `DropdownMenu`/`Popover` already provide focus trap, Esc-to-close, and
  return-focus-to-trigger. Validation: `pnpm --filter @antrique/web
  typecheck`/`lint` both clean (fixed several real issues along the way —
  a JSDoc comment whose own `*/`-containing example path prematurely
  closed the comment block and cascaded into five syntax errors,
  `noUncheckedIndexedAccess` hits in `jwt.ts`/`request.ts`, a devtools
  3-arg `set()` signature mismatch against `createStore()`'s actual
  declared type across all three new stores, a deprecated `z.string()
  .email()` call). `pnpm --filter @antrique/web build`: compiles and
  typechecks clean, but production build's "Collecting page data" step hit
  an environment-level failure (`TypeError: d.createContext is not a
  function`) traced into Next.js's own precompiled internals
  (`next/dist/compiled/next-server/app-page.runtime.prod.js`, required via
  a deeply-nested `.pnpm` store path) — not reproducible via any change to
  this phase's own source, and the investigation was cut short by an
  unrelated tool-execution outage before the root cause (suspected Windows
  path-length limits interacting with this machine's deeply-nested OneDrive
  project path + pnpm's long dependency-key folder names, the same
  category as the already-documented Windows EPERM/symlink limitation from
  prior phases) could be fully confirmed. **Not silently claimed as
  passing** — flagged here as an open item for the next session with shell
  access to re-verify, ideally from a shorter filesystem path or with
  Windows long-path support enabled.
- **Design System & Component Library (`apps/web`)** — NOT a Sprint 2/4
  task; the direct follow-on to the Frontend Engineering Foundation phase
  below, explicitly BEFORE any real pages/business modules/auth UI.
  Tokens: no brand guidance existed anywhere in the repo (checked every
  `docs/product/*` file) — resolved a "warm antique" direction (charcoal/
  ink primary, brass/amber accent) with the user rather than inventing one
  silently, then contrast-verified every real text/background pairing
  with a throwaway Node OKLCH→WCAG-luminance script (no dependency added)
  instead of eyeballing hex values — full verified ratio table in
  `docs/architecture/design-system.md` §1. Found and fixed two token
  values that initially failed 4.5:1 (success/destructive foregrounds)
  before finalizing. Discovered, by checking the actual compiled CSS
  output rather than assuming: Tailwind v4's `--shadow-*`/`--blur-*`
  theme-namespace keys DO generate real utility classes when placed in
  `@theme`, but `--duration-*`/`--ease-*` do NOT — removed a dead mapping
  that silently did nothing and switched those call sites to Tailwind's
  arbitrary-value syntax instead. Component library: used the shadcn CLI
  for every primitive with a registry entry (24 components — button
  through carousel, plus label) rather than hand-authoring anything the
  CLI already provides accessibly; found one real CLI/registry gap (`add
  form` resolves with zero files for this project's style/CLI-version
  combination, confirmed via `shadcn view form` that the registry entry
  exists but is empty — `label`, installed the identical way immediately
  around it, worked fine) and hand-authored the standard shadcn RHF+Zod
  Form set to match, rather than leaving forms unsupported. ~12 more
  hand-built components beyond shadcn's registry (multi-select, spinner,
  empty/error state, stats card, timeline, a `@tanstack/react-table`-
  backed data grid, icon wrapper, navbar/sidebar shells). Wired the two
  provider requirements the shadcn CLI itself flagged (`TooltipProvider`,
  sonner's `<Toaster />`) into the already-existing `app-providers.tsx`
  from the prior phase, rather than leaving Tooltip/Toast non-functional.
  Animation: installed GSAP+`@gsap/react`, `motion`, and Lenis exactly as
  named in the brief, but architected so none of them cost anything until
  a future page actually imports them — Lenis's own provider is built,
  exported, and deliberately left unmounted (mounting it globally would
  impose smooth-scroll behavior + bundle cost on every route before any
  page opts in, against `docs/architecture/optimization.md`'s "marketing
  ships minimal JS" budget); every one of the 11 motion primitives checks
  a shared `useReducedMotion()` hook and fully skips its animation (not
  just shortens it) per CONTRIBUTING.md's explicit "Respect
  reduced-motion" rule. 3D: R3F/Drei/Three wrappers only, zero scenes: hit
  and fixed a real composition mistake before it shipped (Drei's `Loader`
  is an HTML overlay and cannot render as an in-`Canvas` Suspense
  fallback — three.js scene children only — caught during implementation,
  not left in). Also hit and fixed a genuine, project-wide TypeScript
  regression the moment `@react-three/fiber` was installed: its global
  `JSX.IntrinsicElements` augmentation breaks any unconstrained `as?:
  React.ElementType` polymorphic prop everywhere in the program, not just
  in files touching R3F (confirmed by watching `Container`/`TextReveal`'s
  typecheck errors appear at that exact install step) — fixed by using
  closed tag unions instead of the open generic in both places, a change
  arguably correct on its own terms regardless of R3F. Accessibility:
  audited every hand-built component against focus-ring/keyboard/
  semantic-HTML/reduced-motion/contrast rather than assuming shadcn's
  Radix base covers everything — found and fixed two real ARIA gaps
  `@tanstack/react-table`'s headless API doesn't set for you (`DataGrid`
  missing `aria-sort`, `MultiSelect`'s options missing `role="option"`/
  `aria-selected`). Full validation: `pnpm typecheck`/`lint` clean
  throughout (multiple real errors found and fixed along the way, not
  just at the end — motion's `MotionStyle`/`Easing`/prop-collision errors,
  the R3F `ElementType` regression above, a `noUncheckedIndexedAccess` hit
  in `Video`'s IntersectionObserver callback); `pnpm build` compiles/
  typechecks/lints/prerenders all 6 routes (same pre-existing Windows
  `EPERM` standalone-symlink limitation as the prior phase, unrelated to
  this work); spot-checked the actual compiled CSS for `shadow-md`,
  `backdrop-blur-glass`, `text-success`, and `font-heading` to confirm the
  token pipeline produces real utilities, not just plausible-looking
  config.

- **Frontend Engineering Foundation (`apps/web`)** — NOT a Sprint 2/4 task
  (those still need authoring, see blockers.md); a cross-cutting tooling/
  structure phase, same category as the backend's own Milestone/Review-Phase
  work, run explicitly BEFORE any marketing/portal pages, components, design
  system, or auth UI. Found a prior, uncommitted session had already done
  part of the dependency work (React 19 upgrade, Tailwind v3→v4 migration
  to `@tailwindcss/postcss` + CSS-first `@theme`, `shadcn init` producing
  `components.json` + `cn()`, TanStack Query/Zustand/RHF+Zod/radix-ui/
  lucide/cva/next-themes added as deps) — verified it typechecked/linted
  clean before building on top of it, nothing undone. Resolved one real
  scope tension up front with the user: the tech stack names shadcn/ui+Radix
  as required tooling, but this phase's own restrictions forbid building
  "Components"/"Design System" — resolved as tooling-only (kept
  `components.json`, zero `components/ui/*` files created; error/loading/
  not-found pages use plain semantic HTML, no shadcn primitives).
  Structure: added `features/`, `store/`, `utils/`, `types/` under
  `apps/web/src/` (kept `lib/utils.ts`'s `cn()` in place rather than moving
  it to the new `utils/`, since shadcn's CLI hardcodes that import path via
  `components.json`'s `aliases.utils` — every future `shadcn add` would
  break otherwise). Tooling: `.lintstagedrc.json` previously only ran
  `prettier --write` on commit, never linted — added `eslint --fix` ahead
  of it for both `apps/web` and `apps/api` patterns, verified it resolves
  each workspace's own nested `.eslintrc.cjs` correctly when invoked from
  the repo root. Environment: `src/config/env.ts`, two Zod schemas
  (`clientEnv`/`serverEnv`) validated eagerly at import time — importing
  server-only vars from a client component now fails loudly instead of
  silently resolving `undefined`. OpenAPI type generation: real, not
  stubbed — ran `pnpm --filter @antrique/api generate:openapi` against the
  actual frozen backend (a real Postgres was already reachable locally) to
  produce `apps/api/openapi.json` (75 paths, 82 schemas), then wired +ran
  `openapi-typescript` into a new `apps/web` `generate:api-types` script
  (root convenience script chains both) producing a real, committed
  `src/types/api/schema.ts` (~7,000 lines) — documented the known,
  inherited backend limitation that response DTOs still serialize with
  empty JSON-schema detail (Phase 4 finding above), so response typing
  uses an explicit type argument rather than schema inference; request
  bodies DO get real generated types. API foundation:
  `services/api/{config,http-error,request,interceptors,client}.ts` — a
  generic typed fetch client, an `ApiError` class matching the backend's
  real `{ statusCode, message, error }` shape (not the RFC 9457 shape
  `packages/api-contract`'s stale draft assumed), and an empty request/
  response interceptor pipeline as the seam a future auth phase attaches a
  token/refresh interceptor to. Providers: `QueryProvider` (one
  `QueryClient` per component instance per TanStack's own SSR guidance),
  `ThemeProvider` (next-themes), `GlobalErrorBoundary` (class component —
  React has no hook equivalent), composed in `AppProviders` and wired into
  `app/layout.tsx` around `{children}` (also added `suppressHydrationWarning`
  to `<html>`, required once next-themes is present). State: `store/
  create-store.ts` wraps Zustand's `create` with dev-only DevTools wiring;
  `store/README.md` documents the Zustand-vs-TanStack-Query decision rule.
  Routing: added the `(auth)` route group (previously only `(marketing)`/
  `(portal)` existed) and documented `app/api/`'s purpose (future Next.js
  Route Handlers / BFF layer, distinct from the real backend) — both
  README-only, zero pages, per restrictions. Assets: added `public/{videos,
  models,animations}/`. Fonts: verified already correctly done by the prior
  session (Geist via `next/font/google`, CSS variable, `display: 'swap'`).
  Utilities: `utils/{date,currency,number,url,storage}.ts` — generic only,
  defaulted to `en-IN`/`INR` matching the backend's own seeded GST tax
  rates. Configuration: `config/{app,api,routes,feature-flags,metadata}.ts`.
  Error/loading: `app/{error,global-error,not-found,loading}.tsx` (plain
  HTML per the resolved scope), `types/errors.ts` (`NormalizedError`
  discriminated union) + `lib/errors/normalize-error.ts`; documented the
  future skeleton convention (colocated `*.skeleton.tsx`, not one generic
  primitive) in docs rather than building it. Documentation: new
  `docs/architecture/frontend.md`, updated `apps/web/README.md`'s structure
  section to match reality. Validation, all run for real: `pnpm install`
  clean; `pnpm --filter @antrique/web typecheck`/`lint` clean throughout
  (fixed one real lint error along the way — an unescaped apostrophe in
  `not-found.tsx`, `react/no-unescaped-entities`); `pnpm --filter @antrique/web
  build` compiles/typechecks/lints/prerenders all 6 routes successfully —
  the standalone-output trace-copy step fails on this Windows dev machine
  with `EPERM` on `symlink` (confirmed by temporarily disabling `output:
  standalone` and rebuilding clean; this is a Windows-needs-Developer-Mode
  symlink limitation, not a code defect — the Docker/Linux target this
  setting exists for is unaffected); root `pnpm format:check` is clean for
  every file this phase touched (2 pre-existing, untouched `apps/api`
  files — `benchmarks/run-benchmarks.js`, `scripts/check-audit-allowlist.js`
  — already failed formatting before this session and are out of scope,
  confirmed via `git status` showing zero changes to either). Dependency
  audit: no missing production deps (everything the tech stack list
  requires was already installed); no genuinely dead deps either — several
  show zero source imports (`class-variance-authority`, `lucide-react`,
  `radix-ui`, `react-hook-form`, `@hookform/resolvers`) but are legitimately
  pre-installed ahead of the Design System/Forms phases per the mandated
  stack (this codebase's own recurring "capability exists, first real
  consumer comes later" pattern), `shadcn` is a CLI tool with no source
  import expected, `tw-animate-css` is consumed via `globals.css`'s
  `@import`, not JS. `@antrique/shared` stays an unconsumed placeholder
  (`export {}`) — pre-existing, not this phase's to populate.
- **Backend v1.0 Review — Phase 5 (Testing & Documentation Review)** — NOT
  a milestone; the fifth of five planned review phases, auditing test
  coverage and every documentation artifact across the now API-frozen,
  frontend-reviewed backend. Zero new endpoints/DTOs/schema/auth/business-
  logic changes. Testing: inventoried all 162 spec files across every
  category (28 controller/38 service/30 repository/46 DTO/3 guard/2
  middleware/5 decorator/1 filter/1 mapper specs, plus jobs/jwt/cache/
  logging/config), confirmed genuinely strong coverage of RBAC denial +
  audit logging (guards), tenant isolation + soft-delete (repositories,
  spot-checked), and every named critical workflow (auth, order create/
  status/cancel, inventory receive/adjust/reserve/release, invoice/
  payment lifecycle, lead lifecycle/conversion, follow-up lifecycle,
  admin reports/dashboard/notifications/audit) via direct inspection of
  each spec file's `describe`/`it` structure, not assumed from file
  presence alone. Found and fixed one genuine coverage gap: `invoice.
  service.spec.ts` had zero tests for the invoice-number collision-retry
  path (`generateInvoiceNumber()`'s bounded retry loop, documented in
  Phase 3 as throwing `ConflictException` after 5 attempts) — added two
  tests (retry-then-succeed, exhaust-then-ConflictException). Measured
  real coverage via `--coverage`: 85.37% statements / 68.1% branches /
  76.73% functions / 85.75% lines; broke it down by top-level directory
  and confirmed the lowest figures are expected/by-design (`main.ts`/
  `app.module.ts`/`bootstrap/` at 0% — bootstrap/wiring code validated by
  live-boot smoke tests across every prior milestone, not unit tests) or
  a deliberate, previously-established architectural choice (`database/`
  at 44.4% branch — `PrismaService` itself has no spec file; its
  `isHealthy()`/slow-query-logging/fail-fast-connect logic is validated
  via live boot + Milestone 14's CI `migration-validation` job against a
  real Postgres container, matching this codebase's own consistent
  "mock at the repository boundary, validate real DB behavior via live
  integration" convention — documented as a deliberate, not-fixed gap
  rather than adding deep Prisma-internals mocking that would contradict
  that convention). Documentation: found the progress dashboard's own
  header ("Current sprint: Sprint 1 — Foundation," "next is Milestone 1")
  flatly contradicted its own body (14 completed Milestones + 4 approved
  review phases) — corrected, and clarified the two coexisting, unrelated
  numbering schemes ("Milestone 1–14" for backend engineering vs. the
  original plan's "◆ M1/M2/M3" business-release markers). Also found the
  "In progress right now" heading was inaccurate (nothing under it was
  actually in progress — all listed milestones/phases are complete) and
  a stray, decade-out-of-place "## Last completed" heading mid-log — both
  fixed by treating the whole milestone/phase history as one continuous,
  clearly-labeled log. Rewrote the long-stale "Next 3 tasks"/"Notes for
  next session" tail (previously still referencing the Phase 1.2C logging
  roadmap as "next," from very early in the project) to reflect real
  current status.

- **Backend v1.0 Review — Phase 4 (Frontend Readiness Review)** — NOT a
  milestone; the fourth of four planned review phases, evaluating the
  already-API-frozen backend (Phases 1–3, below) exclusively from a
  frontend engineering perspective. Zero new endpoints/DTOs/schema/auth/
  business-logic changes — reviewed all 26 business feature areas plus
  Auth/Health/Swagger infrastructure for workflow completeness, screen
  readiness, and API usability. The single most significant finding:
  before this phase, the generated OpenAPI spec had **zero** documented
  success (2xx) responses anywhere — `@nestjs/swagger`'s CLI plugin only
  auto-generates schema from class-validator-decorated properties, and
  every response DTO in this codebase (by original, deliberate design —
  see every `*-response.dto.ts` file) uses undecorated constructor-
  parameter-properties, which the plugin cannot introspect at all;
  verified empirically (`components.schemas` contained 50 request-DTO
  entries and 0 response-DTO entries pre-fix). Fixed with two new,
  reusable Swagger decorators — `ApiPaginatedResponse(model)` (`src/
  common/decorators/api-paginated-response.decorator.ts`, the standard
  `@nestjs/swagger` `ApiExtraModels` + `allOf` generic-wrapper composition
  pattern) and standard `@ApiOkResponse`/`@ApiCreatedResponse`/
  `@ApiNoContentResponse` type references — applied across all ~90
  controller methods in 26 controllers via a verified, hand-mapped
  script (every method's HTTP status/DTO pairing individually confirmed
  against its own source before the script ran, not inferred). Result:
  121 of 124 endpoints now have a documented 2xx response (up from 0);
  the 3 deliberately excluded are `POST /payments/:id/refund` (always
  501, genuinely has no success case) and `/health/{ready,startup}`
  (return a plain TS interface, not a decoratable class — infra
  consumers, not frontend engineers). Field-level detail within each
  response schema remains a known, DELIBERATELY UNFIXED limitation
  (`{ type: 'object', properties: {} }` for every response DTO) — fixing
  it properly requires converting every response DTO from constructor-
  parameter-properties to field declarations, which, despite being
  wire-format-identical, is a broad structural rewrite this phase's own
  "do not redesign" rule puts out of scope; flagged as an explicit,
  separately-scoped follow-up recommendation, not silently attempted.
  Also added a precise validation-error-shape explanation (the exact
  `{ statusCode, message: string[], error }` body, and that `message`
  entries are human-readable sentences, not `{ field, reason }` pairs) to
  the top-level Swagger description (`src/bootstrap/swagger-document.ts`)
  — the previous text only said "ValidationPipe-shaped body" without
  specifics. Two real, structural (not fixable without an API-breaking
  change) frontend-friction findings documented: (1) there is no `/me` /
  profile / permissions endpoint anywhere in the API — `RequestUser` is
  `{ email }` only (a deliberate Milestone 2 constraint) and the JWT
  payload itself carries nothing beyond `email`, so a frontend cannot
  fetch the current user's id/name/role/permissions after login without
  either decoding non-existent claims or hardcoding UI-gating logic
  separately from the backend's real RBAC; (2) product variant stock
  isn't included in any Catalog response (`ProductVariantResponseDto`
  has no stock field — inventory is a fully separate module, correctly,
  per the architecture), so a Product Listing screen showing live stock
  requires one `GET /inventory?productVariantId=X` call per variant (no
  bulk multi-id filter exists) — a genuine N+1-shaped frontend request
  pattern for any storefront screen. Full validation: `pnpm lint`/
  `typecheck`/`build`/`test` all clean (162 suites/931 tests, unchanged —
  confirms zero behavior change), `generate:openapi` re-run and the 2xx-
  coverage improvement verified by direct inspection of the generated
  spec's `components.schemas`/`paths`.

- **Backend v1.0 Review — Phase 3 (API Contract Review & API Freeze)** — NOT
  a milestone; the third of three planned review phases over the
  already-complete Milestone 1–14 backend, following Phase 1
  (Architecture) and Phase 2 (Code Quality), both below. Zero endpoints
  added/removed/renamed, zero DTO/response-field/business-logic/auth
  changes — audited every route across all 16 controllers-with-business-
  routes (Auth, Catalog×3, Bespoke×4, Inventory×3, Orders×2, Billing×3,
  CRM×5, Admin×5, Health) for route consistency, request validation,
  response consistency, HTTP status codes, error handling, pagination/
  filtering/sorting, authorization, and Swagger documentation. Confirmed
  100%-consistent: soft-delete via `deletedAt` on every DELETE route,
  `PaginationQueryDto`/`PaginatedResponseDto<T>` on every list route,
  DELETE→204/action-verbs→200-via-explicit-`@HttpCode`/create→201 status
  codes (one deliberate exception, `inventory/receive`→201 via
  find-or-create reasoning, confirmed accurate against its own service
  code), tenant-scoped `@Tenant()` sourcing on every query. Added
  `@ApiOperation` + a new shared `ApiStandardAuthErrors()`/
  `ApiValidationError()`/`ApiNotFoundError()`/`ApiConflictError()`
  decorator bundle (`src/common/decorators/api-standard-responses.decorator.ts`,
  built via `applyDecorators()`) across all 27 real controllers — pure
  additive Swagger metadata, zero behavior change. Caught and fixed 6
  genuine Swagger-accuracy defects via an exhaustive final cross-check of
  every `grep -rln "new ConflictException" src/modules --include=
  "*.service.ts"` result (13 files) against every controller's
  `@ApiConflictError` placement: 1 fabrication removed
  (`tax-rate.controller.ts` claimed a conflict its service never throws),
  5 real gaps added (`lead.controller.ts` create/update — a duplicate-
  active-lead check neither had documented, convert already did;
  `product-customization.controller.ts` create; `invoice.controller.ts`
  create; `inventory.controller.ts` adjust/reserve/receive — reserve and
  receive were still missing after an earlier pass only covered adjust).
  Full validation: `pnpm lint`/`typecheck`/`build`/`test` all clean (162
  suites/931 tests, unchanged from Phase 2 — confirming zero behavior
  change), `generate:openapi` re-run and spot-checked that all 6 newly-
  added 409 responses serialize correctly with their real messages.

- **Backend v1.0 Review — Phase 2 (Code Quality & Technical Debt Review)**
  — NOT a milestone; safe, non-behavior-changing refinements only, per
  this phase's own explicit no-redesign framing. Reviewed dead code,
  duplicate code, readability, consistency, technical debt, performance
  hygiene, documentation across the whole backend. Removed `export` from
  9 line-item mapper helper functions across 7 files (bespoke/billing/
  catalog/inventory/orders) after verifying zero external/spec-file usage
  each; removed `export` from `API_GLOBAL_PREFIX`
  (`src/bootstrap/api-routing.ts`) for the same reason. Deliberately did
  NOT un-export several candidates judged as legitimate — `PermissionKey`/
  `RoleKey` (companion types), `EnvVars`, `HealthCheckStatus`,
  `RecordAuditEventParams`/`RecordSystemEventParams`/
  `CreateNotificationParams` (documented placeholder methods, "no route
  yet" per their own services' comments), `TenantResolutionSource`/
  `ResolvedTenant` (return types of externally-consumed methods).

- **Backend v1.0 Review — Phase 1 (Architecture Review)** — NOT a
  milestone; module design, dependency structure, repository/service/
  controller layers, project structure, and code organization reviewed
  across the whole backend with the same no-redesign constraint. Added
  `BaseRepository.findManyAndCount()` (`src/database/base.repository.ts`)
  — a transaction-capable client passed as a call-time parameter, not a
  constructor dependency, keeping `BaseRepository` framework-agnostic —
  and consolidated the repeated `$transaction([findMany, count])`
  pagination pattern into it across 22 repository files (21 via a scripted
  literal-string transform, `category.repository.ts` done manually as the
  prototype). One repository (`product-customization.repository.ts`) was
  deliberately reverted to its original explicit form after consolidating
  it broke Prisma's argument-dependent return-type inference for its
  `include`-shaped query. Removed 22 empty scaffold directories (git never
  tracked them, so zero effect on tracked history) across auth/billing/
  crm/content/projects. Fixed stale documentation in `src/common/
  README.md`, `src/shared/README.md`, `src/modules/content/README.md`,
  `src/modules/projects/README.md`. See the ad hoc "Module Dependency
  Diagram" delivered in-conversation (not persisted to a file) for the
  foundational/orchestration/leaf/infrastructure module categorization.

- **Engineering Polish Pass (Pre-Backend v1.0 Review)** — NOT a milestone
  (this task's own explicit framing); a tooling/CI/documentation
  refinement pass over the already-complete, already-approved Milestone
  14 infrastructure, ahead of a formal Backend v1.0 architecture review.
  Zero business logic, schema, API contract, or application behavior
  changed — verified by re-running the full test suite unchanged (162
  suites/929 tests, identical count to the end of Milestone 14) and a
  live-boot smoke test confirming the refactored bootstrap produces
  byte-identical routing/Swagger behavior. Nine tasks: (1) OpenAPI is now
  a generated CI artifact — `main.ts`'s own Swagger/routing config was
  extracted into `src/bootstrap/{api-routing,swagger-document}.ts` so a
  new `scripts/generate-openapi.ts` (boots the real `AppModule`, writes
  `openapi.json`, never hand-maintained) shares the identical
  configuration with the live-served copy, satisfying "never duplicate
  Swagger configuration" while guaranteeing the artifact can't drift from
  the real backend; (2) Trivy container scanning added to CI's
  `docker-build` job — a full-severity informational pass plus a
  HIGH/CRITICAL-only gating pass, `.trivyignore` for accepted risk
  (currently empty — no real scan has run yet, Docker isn't available in
  this dev environment); (3) `apps/api/audit-allowlist.json` +
  `scripts/check-audit-allowlist.js` turn the prose-only dependency audit
  from Milestones 13/14 into a CI-enforced gate — 20 already-triaged
  findings pass silently, anything new fails the build with full detail
  (also caught and fixed a real undercount from Milestone 14's own
  security.md §14: 3 new `js-yaml` findings, not 2); (4)
  `deploy-staging.yml`/`deploy-production.yml` rebuilt as real templates
  — `workflow_dispatch` with a `deploy`/`rollback` action choice, a real
  Docker build step, and clearly-labeled placeholders (never
  fake-success) for the push/rollout/health-verification steps still
  blocked on real hosting infrastructure; (5) a new `release-artifacts`
  CI job bundles the compiled build + generated OpenAPI spec + version/
  commit/timestamp metadata into one 90-day-retention archive; (6)
  `docs/architecture/release.md` gained a Production Verification
  Checklist, a consolidated Operational Limitations list, a Future
  Operational Roadmap, and a Release Tagging Strategy; (7) new
  `docs/architecture/container.md` (Docker build/compose/versioning/
  health/lifecycle/troubleshooting/production recommendations/security
  scanning); (8) new `docs/architecture/cicd.md` (every CI job,
  execution order, quality gates, artifact retention, where frontend
  developers obtain the OpenAPI spec); (9) full validation re-run
  (lint/typecheck/build/test all clean, `generate:openapi` and
  `audit:check` both verified working against the real local database,
  live boot re-confirmed identical Swagger/health/routing behavior post-
  refactor) — Docker build and the Trivy scan itself could not be
  executed locally (no Docker in this development environment); both are
  now CI-gated and will run for real on the next push. See
  `docs/architecture/{deployment,container,cicd,release,security,
  operations}.md` for full detail; `decisions.md` for the specific
  engineering trade-offs made.

- Milestone 14 (Production Infrastructure, DevOps & Deployment)
  implementation is done and fully validated, awaiting its review pass.
  "This milestone completes the backend" (this milestone's own framing) —
  no new business module, zero business-logic/schema/breaking-API changes.
  Full production-readiness audit (Configuration/Deployment/Docker/CI-CD/
  Logging/Observability/Health/API-docs/Startup/Shutdown/Runtime-
  validation/Background-jobs/Release/Backup/Rollback) found and fixed
  several genuinely placeholder or drifted pieces. Configuration:
  `env.validation.ts` gained a `.superRefine()` cross-field layer —
  production boot now fails fast if Swagger is enabled without a
  deliberate second opt-in (`SWAGGER_ALLOW_IN_PRODUCTION`), if
  `DATABASE_SSL` is false, or if either JWT secret still equals
  `.env.example`'s literal placeholder value; `ConfigModule` gained a
  duplicate-config-namespace assertion. OpenAPI/Swagger: `@nestjs/swagger`
  v7 (the Nest-10-compatible line — v11 requires Nest 11, a peer mismatch
  caught and corrected before installing) wired into `main.ts`, gated
  behind config; DTO/response schemas come from the CLI plugin
  (`nest-cli.json`, introspecting class-validator decorators — confirmed
  live that real constraints like `minLength` show up in the generated
  schema) rather than hand-written annotations; 25 controllers bulk-
  tagged (`@ApiTags`/`@ApiBearerAuth`) via one scripted pass, `AuthController`
  deliberately excluded from `@ApiBearerAuth` (its routes are
  unauthenticated). Health checks: new `HealthModule` —
  `GET /health/{live,ready,startup}`, unauthenticated, `@SkipThrottle()`d,
  excluded from both the global `/api` prefix and URI versioning
  (`VERSION_NEUTRAL` + `setGlobalPrefix`'s own `exclude` option) so
  infrastructure probe config never needs updating on an API version
  bump; `ready`/`startup` call `PrismaService.isHealthy()` (built
  Milestone 12, zero callers until now — the same "build the capability,
  wire it up later" pattern this codebase keeps repeating). Observability:
  confirmed by reading the actual source that correlation ids were ALREADY
  fully propagated through Middleware → Controllers → Services →
  Repositories → Prisma → Audit logging (Phase 1.2C.4's own
  `RequestContextService`/`AsyncLocalStorage` design) — the one real gap
  was that `X-Request-Id`/`X-Correlation-Id` were never echoed back to the
  calling client; now set synchronously in `HttpLoggingMiddleware` before
  `next()`. Explicit startup/shutdown log lines added around `main.ts`'s
  bootstrap and `enableShutdownHooks()` (additive `process.on(SIGTERM/
  SIGINT)` listeners that only log, never call `app.close()` themselves —
  exactly one real shutdown sequence, not two racing ones). Background job
  infrastructure: new `apps/api/src/jobs/` — `Job<T>`/`JobContext`/
  `JobResult`/`JobStatus`, `JobRunner` (in-process, exponential-backoff
  retry via a plain `RetryPolicy` value object, `DEAD_LETTER_STORE` swap-
  point token with `InMemoryDeadLetterStore` the one real implementation)
  — infrastructure only, zero scheduled jobs, zero Redis/BullMQ/RabbitMQ,
  per this milestone's own explicit constraint; a likely first real
  consumer (`NotificationRetryJob`, built against Milestone 11's own
  already-`FAILED`-state-tracking `Notification` model) is named in
  `jobs/README.md` but not built. Runtime validation: new `GET /runtime`
  (`AdminModule`, gated by a new `system:read` permission — Admin/Super
  Admin only, the same tier `audit_logs:read` already established, granted
  automatically via those two roles' existing full-permission-set seed
  grant) surfaces `APP_VERSION`/`GIT_COMMIT_SHA` (CI/Docker-stamped, never
  introspected from `package.json` — a build-output-layout-independent
  value, deliberately, matching how `DATABASE_URL`/JWT secrets are already
  supplied rather than derived), `nodeEnv`, `uptimeSeconds`, live database
  connectivity. Docker: found and fixed a real, previously-undetected bug
  in `infrastructure/docker/api.Dockerfile`'s `runtime` stage — `CMD`
  pointed at `dist/main.js`, which has never existed (the exact
  `dist/src/` bug `apps/api/package.json`'s own `start` script already had
  fixed during the Phase 1 production-readiness audit, silently
  reintroduced here and undetected because nothing had ever run this
  image's `runtime` stage end to end before this milestone's own live-
  boot validation); added a non-root user (`addgroup`/`adduser`, fixed
  uid/gid) and a real `HEALTHCHECK` (a Node one-liner against
  `/health/live` — no `curl`/`wget` in this minimal Alpine image, and
  adding either just for this would grow it for no other benefit); new
  root `.dockerignore` (keeps `.env`/secrets and rebuildable artifacts out
  of every Dockerfile's build context) and `docker-compose.prod.yml` (a
  genuinely production-shaped stack — no host-exposed postgres/redis
  ports, `restart: unless-stopped`, `env_file` `required: true` — distinct
  from the existing dev-oriented root `docker-compose.yml`). CI: extended
  the existing `ci.yml` with a build-artifact upload appended to the
  existing job, a new `migration-validation` job (a real, throwaway
  Postgres service container — every existing test suite mocks its own
  repositories, so no prior CI job had ever exercised a real migration;
  applies every committed migration then confirms a clean `migrate
  status`), and a new `docker-build` job (builds the exact `runtime`
  target both compose files reference, catching exactly the `CMD` bug
  above had it still existed). Full validation: `pnpm lint`/`typecheck`/
  `build`/`test` all clean (162 suites/929 tests, up from 155/893 at the
  end of Milestone 13 — 7 new suites: health service/controller, jobs
  retry-policy/dead-letter-store/job-runner, admin runtime service/
  controller), zero regressions. `pnpm audit` grew from 16 to 20 findings
  purely from the new `@nestjs/swagger` dependency (two `js-yaml`
  findings, one more `@hono/node-server` finding) — re-applied the same
  reachability discipline Milestone 13 established: `@nestjs/swagger` only
  ever calls `js-yaml`'s `dump()` (serializing its own generated OpenAPI
  document), never `load()`/`safeLoad()` on any request-supplied input,
  so the vulnerable parse path is unreachable regardless of Swagger being
  gated off by default in production anyway (`security.md` §14). Live
  boot confirmed zero DI issues; a full live smoke test covered health
  endpoints (live/ready/startup all `200`, real database check), Swagger
  UI (`200`) and JSON generation (confirmed real DTO schema introspection
  — `LoginRequestDto`'s `minLength`/`required` constraints present in the
  generated OpenAPI document), correlation-id response headers, versioned
  (`/api/v1/runtime`, `401` unauthenticated) vs. unversioned/unprefixed
  (`/health/*`) routing both resolving correctly, and structured JSON logs
  showing the same `requestId`/`correlationId` threading through a
  `Slow database query` warning, an `HTTP request completed` entry, and an
  `Unhandled exception` entry for the same request — direct, live
  confirmation of the observability chain this milestone's own audit
  found already correct by reading source. New
  `docs/architecture/deployment.md`, `environment.md`, `runbook.md`,
  `release.md` (all new); `operations.md`/`backend.md`/`architecture.md`/
  `security.md` updated; `domain-module-guide.md` §25 (three reusable
  production-readiness patterns: an unrun code path drifts silently, a
  peer-dependency mismatch needs active resolution not silent acceptance,
  "infrastructure exists" and "infrastructure is proven load-bearing" are
  different claims); `apps/api/README.md` brought back in line with
  reality (previously still described every module as an "empty
  scaffold," stale since well before Milestone 5).

- Milestone 13 (Security Hardening) implementation is done and fully
  validated, awaiting its review pass. "Transform the backend from
  feature-complete to production-secure" (this milestone's own framing) —
  no new business module, zero feature/API/schema/domain-model changes.
  Full layered audit (Configuration/HTTP/Authentication/Authorization/
  Multi-Tenant/Validation/Database/Logging/Error-Handling/Dependencies) with
  every finding — fixed or deliberately deferred — documented in the new
  `docs/architecture/security.md` (Threat Model, full audit table, OWASP Top
  10 mapping, Remaining Accepted Risks) plus a new `docs/architecture/
  operations.md` runbook (config knobs, dependency-audit cadence, secret-
  rotation procedure, incident-response signals). Real gaps closed: Helmet
  security headers (`main.ts`, explicit CSP `default-src 'none'`/CORP
  `same-origin` overrides, everything else Helmet's own defaults), registered
  first in the bootstrap chain so every response carries them; CORS
  (`app.enableCors()`) wired to the already-validated-but-previously-unused
  `CORS_ALLOWED_ORIGINS` env var, explicit allowlist, `credentials: false`;
  app-wide rate limiting (`@nestjs/throttler`, in-memory — "do not introduce
  Redis" this milestone's own explicit constraint) via
  `ThrottlerModule.forRootAsync()` driven by the already-validated
  `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX` env vars, registered globally via
  `APP_GUARD`, plus a stricter hardcoded 5-attempts/60s `@Throttle()`
  override on `POST /auth/login`; explicit request body-size limiting
  (`NestFactory.create(AppModule, { bodyParser: false })` + manual
  `json()`/`urlencoded()` middleware with a fixed `'256kb'` string literal,
  deliberately never computed/env-driven — the exact shape needed to keep
  the `body-parser` DoS CVE this milestone's own dependency audit found
  (`GHSA-v422-hmwv-36x6`, triggered only by an invalid/unparseable limit
  value) permanently unreachable regardless of installed version); JWT
  signing/verification explicitly pinned to `HS256`
  (`TokenService`/`token.service.ts`, `JWT_ALGORITHM = 'HS256' as const` on
  every sign/verify call) — defense in depth beyond `jsonwebtoken`'s own
  already-safe defaults (confirmed live pre-existing that `alg: none` was
  already rejected), proven by a new regression test asserting a
  correctly-secreted-but-HS384 token is now rejected too; audit-trail
  logging for `user.login`/`user.token_refresh` (SUCCESS/FAILURE,
  `AuthService`) and `authz.role_denied`/`authz.permission_denied`
  (`RolesGuard`/`PermissionsGuard`), wired into the pre-existing,
  previously-zero-call-sites `AUDIT_LOGGER` structured-log mechanism
  (Phase 1.2C.8) rather than the DB-persisted `AuditLog` table `AdminModule`
  owns — deliberately, to avoid a backwards dependency from cross-cutting
  auth/authz code onto the architecturally-downstream `AdminModule`; the two
  audit mechanisms remain intentionally distinct and NOT unified into one
  queryable source, documented as a real gap in `security.md` §9/§13 rather
  than silently left implicit. Full dependency audit: `pnpm audit` returned
  16 findings (3 high, 9 moderate, 4 low); every one individually traced to
  its dependency path and assessed for REACHABILITY in this app's actual
  runtime code (not just tree presence) — zero were found reachable (all
  either dev-only tooling — `@nestjs/cli`'s own build chain, `autocannon`'s
  benchmark tooling, `prisma`'s dev server — or runtime code paths this app
  never exercises, e.g. `@nestjs/core`'s SSE-stream finding against an app
  with zero `@Sse()` routes, or `qs.stringify()`'s DoS finding against an
  app confirmed to never call `qs.stringify()`). Two low-risk findings
  (`multer`, `lodash`) fixed via `pnpm.overrides` (root `package.json`),
  each verified via `pnpm why` to resolve to one consistent version
  tree-wide first; `glob` was considered for the same treatment and
  explicitly rejected (would force-upgrade Jest's own deeply-nested
  `glob@7.2.3` dependents for a dev-only-tool CVE); full per-finding
  reachability table in `security.md` §11. Error-response safety was
  verified against the actual installed `BaseExceptionFilter`/Prisma
  error-class source (via a throwaway script, deleted after use) rather than
  assumed — confirmed no thrown value anywhere in this codebase can produce
  anything but NestJS's own fixed generic 500 response for an unhandled
  error. Full validation: `pnpm lint`/`typecheck`/`build`/`test` all clean
  (155 suites/893 tests, up from 155/883 at the end of Milestone 12 — 10 new
  tests: JWT algorithm-pinning regression, login/refresh audit-logging
  coverage, denial audit-logging coverage in both `roles.guard.spec.ts`/
  `permissions.guard.spec.ts`), zero regressions. Live boot with zero DI
  issues, and a 13-check live HTTP smoke test, all passed: security headers
  present on every response; CORS allows the configured origin and rejects
  an unlisted one; malformed/tampered/missing JWTs all rejected with 401;
  RBAC correctly forbids/allows the admin-only audit-logs route; a
  client-supplied tenantId-shaped body field is ignored, not trusted; an
  oversized body is rejected with 413; a malformed login email is rejected
  with 400; unknown extra body fields are silently stripped, not smuggled
  through; an unknown route (404) reveals no stack trace; the login response
  never echoes the submitted password. New `docs/architecture/security.md`
  (the full audit — Threat Model, layer-by-layer review, OWASP Top 10
  mapping, Remaining Accepted Risks) and `domain-module-guide.md` §24
  (three reusable hardening patterns: prefer an already-existing
  cross-cutting mechanism over a backwards dependency, verify security
  claims against real installed source rather than assumed library
  behavior, and treat "present in the dependency tree" and "reachable by
  this app's own code" as two different questions when triaging an audit).

- Milestone 12 (Performance Engineering) implementation is done and fully
  validated, awaiting its review pass. "Optimize the current
  implementation only" (this milestone's own framing) — no new business
  module, zero feature/API/schema changes, zero business-rule changes.
  Full audit across every named module (Auth/Authz/Multi-Tenant/Catalog/
  Bespoke/Inventory/Orders/CRM/Billing/Admin) found and fixed: two real
  N+1s (`InvoiceService.createFromOrder()`/`OrderService.create()` each
  ran one `findVariantById()` per order line — new
  `ProductRepository.findVariantsByIds()` batches them into one query;
  `FabricService.assertProductsBelongToTenant()` ran one full-detail
  `findActiveById()` per product id — new `ProductRepository.
  findExistingIds()` batches into one minimal `select: { id: true }`
  query); `SupplierService`'s own per-item existence-check loop
  parallelized via `Promise.all()` (same query count, concurrent not
  serial). `InventoryRepository`'s own Milestone 11 "Stock valuation"/
  "Low stock items" analytics — previously `findMany()` + application-code
  reduce/filter over every candidate row — rewritten to single `$queryRaw`
  aggregate/filtered queries, confirmed live that Prisma 7's
  `@prisma/adapter-pg` driver adapter returns genuine `Prisma.Decimal`/
  `Date` instances from raw queries (zero precision risk, no mapper
  changes needed), backed by one new hand-written partial index
  (`inventory_items(tenant_id, reorder_point) WHERE reorder_point IS NOT
  NULL AND deleted_at IS NULL`, migration
  `20260722130000_add_performance_indexes` — the ONLY new index this
  milestone added; the rest of the schema was found already densely
  indexed by every prior milestone's own discipline, per "never create
  duplicate indexes, add only necessary"). New `CacheService`
  (`apps/api/src/cache/`, `@Global()`, the first genuinely new
  infrastructure module since `TenantModule` in Milestone 4) — in-memory,
  TTL-based, `get`/`set`/`delete`/`deleteByPrefix`/`clear`/`getOrLoad`
  (read-through) — fronting `AuthorizationService`'s own per-request role/
  permission resolution with a 60s cross-request cache, since it ran on
  EVERY `PermissionsGuard`/`RolesGuard`-protected request (most routes in
  this API by now) despite grants changing extremely rarely; the
  pre-existing per-request `AuthorizationCache` (Milestone 3) is
  completely unchanged, this is a second layer underneath it. Evaluated
  and deliberately did NOT cache `TaxRate`/`PaymentMethod`/`LeadSource`/
  `NotificationTemplate` — `TaxRate` specifically already has a live write
  endpoint this milestone didn't wire real invalidation into, and a
  TTL-only cache on a live write path is a correctness risk, not an
  optimization. API layer: response compression (`compression`
  middleware, gzip/deflate, registered first in the bootstrap chain);
  confirmed LIVE that ETag generation + conditional-GET (304) already
  worked via Express's own default behavior with zero code needed (a
  genuine audit finding, not a build task); new opt-in `@CacheControl
  (maxAgeSeconds)` decorator + `CacheControlInterceptor` (the first real
  content in the previously-placeholder `common/interceptors/`),
  registered via `APP_INTERCEPTOR`, applied ONLY to Category/Collection/
  Product `GET` routes (30s, always `private` — never `public`, since
  every response in this API is tenant/RBAC-scoped and a shared cache
  serving one tenant's response to another would be a data leak, not an
  optimization) — deliberately not applied to Orders/Inventory/Dashboard/
  Notifications/Audit/Billing/CRM. Pagination confirmed already capped
  (`@Max(100)`, Milestone 5, unchanged); streaming evaluated, not
  applicable (no bulk-export/large-payload endpoint exists anywhere in
  this API). Instrumentation: `PrismaService` now subscribes to Prisma's
  own `$on('query', ...)` event, logging every query at `debug` (Prisma's
  own measured duration) and anything over 100ms additionally at `warn`;
  `HttpLoggingMiddleware` now also logs a `warn` "Slow HTTP request" past
  1000ms, alongside its existing unchanged `info` completion log;
  `PerformanceLogger` (built Phase 1.2C.7, ZERO real call sites anywhere
  until this milestone) now wraps `DashboardService.overview()` — this
  codebase's own heaviest service-layer fan-out — the first real
  demonstration of a fully-built, fully-tested capability that had sat
  unused for nine milestones. Reproducible `autocannon` load benchmarks
  (`apps/api/benchmarks/run-benchmarks.js`, Node-native — chosen over `k6`,
  which would need a separate Go-binary toolchain this environment
  doesn't have) covering login/catalog/orders/dashboard/billing/CRM, run
  against both a development-mode and a `NODE_ENV=production` boot (the
  latter needed an explicit `X-Tenant-ID` header — confirmed live that
  `TenantResolver`'s own `DEFAULT_TENANT_ID` fallback is gated to
  development only, Milestone 4's own deliberate design, working exactly
  as intended). Caught and fixed a real bug in the benchmark script
  itself before trusting any result: autocannon's own `path` option
  REPLACES a `url`'s existing path segment rather than appending to it —
  the first run silently measured 404-handling latency on every scenario
  (100% non-2xx), not the real endpoints. Zero errors/timeouts/non-2xx
  responses across every scenario once fixed — full results in
  `docs/architecture/performance.md` §8. Full validation: `pnpm lint`/
  `typecheck`/`build`/`test` all clean (155 suites/883 tests, up from
  153/858 — 2 new suites (`cache.service.spec.ts`,
  `cache-control.interceptor.spec.ts`), 25 new tests total, including
  targeted additions to every existing repository/service/middleware spec
  whose underlying method changed). Live boot with zero DI issues, and a
  full live
  HTTP smoke test (7 checks, all passed) covering: real `Cache-Control`+
  `ETag` headers on an annotated route and their absence on an
  unannotated one; the rewritten inventory raw-SQL queries returning
  correct real numbers (0 low-stock items from seed data, matching manual
  verification); order creation exercising the new batched variant lookup
  end to end; invoice creation from that order exercising the SAME
  batched lookup in a second module; the cross-request authorization
  cache continuing to enforce RBAC correctly after repeated requests (no
  cross-role/cross-tenant bleed); Milestone 11's own Notification list
  route, unregressed. New `docs/architecture/performance.md` (the full
  audit — every finding fixed AND every finding deliberately left
  unfixed, with reasoning for each) and `domain-module-guide.md` §23
  (three reusable optimization patterns: batch a per-item loop, push a
  predicate into raw SQL only when the query builder can't express it,
  cache only what tolerates staleness and say so).

- Milestone 11 (Admin Platform, Analytics & Notifications) implementation
  is done and fully validated, awaiting its review pass. "This module
  provides operational visibility. It does not own business
  transactions" (this milestone's own framing) — the seventh real
  business module, and the most cross-module-dependent one in this arc.
  Architecture audit found `Notification`/`AuditLog` already fully
  modeled since Phase 1.1B with ZERO application-layer consumers — the
  same "schema exists, first real consumer" situation Milestones 3, 9,
  and 10 already found. `AuditLog` needed ZERO schema changes at all
  (pure reuse — its own pre-existing `UPDATE`/`DELETE` revoke already
  enforced this milestone's own "Immutable audit history"); `Notification`
  gained an additive DELIVERY-state lifecycle it never had (`status`/
  `sentAt`/`failedAt`/`retryCount`/`lastError` — the pre-existing columns
  only tracked recipient interaction via `readAt`/`dismissedAt`). A new
  `AdminModule` (`apps/api/src/modules/admin/`) provides four
  controller/service/repository triads — Notification, Audit (covering
  BOTH `AuditLog` and the new `SystemEvent` — the same "one repository,
  two line-item-shaped entities" precedent `PaymentRepository`'s own
  handling of `PaymentAllocation` established), Dashboard, Report (a 4th
  repository beyond this milestone's own named 3-repository list, added
  because `ScheduledReport` would otherwise be dead schema — the same
  judgment call `CustomerTagRepository` made in Milestone 9). Tenant-
  isolated, RBAC-protected via `PermissionsGuard`. Reused the
  ALREADY-EXISTING `audit_logs:read` permission (Phase 1.1B, never
  granted beyond `admin`/`super_admin` — zero seed changes needed to
  already match this milestone's own "Audit: Admin, Super Admin" tier)
  but deliberately did NOT reuse the pre-existing, differently-scoped
  `notifications:read` ("view own notifications," broadly granted to
  Sales/Client/Customer/Manager from Phase 1.1B — reusing it for this
  milestone's admin-wide List/Get/Retry surface would have silently
  over-granted it); 4 new permissions instead (`notifications:manage`,
  `dashboard:read`, `reports:read`/`write`, all Manager+). Imports FIVE
  other modules — `OrdersModule` (`OrderRepository`, new
  `getRevenueSummary()`), `InventoryModule` (`InventoryService`, new
  `getStockValuation()`/`getLowStockItems()`), `BillingModule`
  (`InvoiceRepository`, now `exports: [InvoiceRepository]` — new this
  milestone — new `getOutstandingSummary()`/`getCollectionSummary()`),
  `CrmModule` (`LeadRepository`/`FollowUpRepository`, now `exports:
  [LeadRepository, FollowUpRepository]` — new this milestone, both
  consumed via inherited `BaseRepository.count()`, no new method needed
  on either), `CatalogModule` (`ProductRepository`, already exported
  since Milestone 6) — one for each of this milestone's own explicitly
  named analytics targets (Orders/Inventory/Billing/CRM), plus a 5th,
  `catalog` (published product count), added so `DASHBOARD_KPI_MODULES`'s
  own literal 5-entry allowlist constant has no named-but-unimplemented
  module — the same "don't leave a named capability unreachable"
  discipline generalized in `domain-module-guide.md`'s new §22.
  One-directional, zero circular dependencies — still a clean DAG even
  at five imports. `DashboardService` computes one KPI summary per
  aggregated module by reaching ONLY the already-exported artifact of
  each source module, never a second export or a direct cross-module
  `PrismaService` reach-around; `ReportingService.generate()` computes
  its own snapshot via the SAME `DashboardService.getKpis()` call rather
  than re-implementing any aggregate query — "Never duplicate
  calculations already available elsewhere," this milestone's own
  explicit instruction, now `domain-module-guide.md` §22's second
  corollary. `notification.retry()` is the ONE publicly-routed mutation
  this milestone builds (`create()`/`queue()`/`markSent()`/
  `markFailed()` stay real, tested, and route-less — the same "no route
  because no real caller exists yet" precedent Milestone 7's own
  `consumeReservation()` established, since real notifications will be
  triggered by FUTURE business events not yet built); `retry()` also
  records an `AuditLog` entry for itself (action `notification.retry`,
  the request body's own `note` field folded into `after`) — CLAUDE.md's
  own non-negotiable "every feature ships with... audit logging" rule,
  applied concretely to this milestone's one real mutation-with-a-route.
  `DashboardService.overview()` also surfaces a lightweight system-health
  signal (`systemErrorCount24h` — ERROR-severity `SystemEvent` rows in
  the trailing 24 hours, via a new `AuditRepository.
  countSystemEventsBySeverity()`) alongside the per-module KPIs and the
  tenant's own active `DashboardWidget` set. Removed the stale, empty
  Phase 0 `apps/api/src/modules/notifications/` scaffold folder (a
  placeholder README + empty subdirs, zero real files, never referenced
  by any source file) — this milestone's own brief names the module
  `AdminModule`, covering four areas, not just Notifications, so the
  real feature was built under `admin/` instead, leaving that scaffold
  empty and actively misleading; its one referencing comment
  (`apps/api/src/config/notifications/README.md`) updated to point at
  `admin/` instead. 4 new tables (`NotificationTemplate`, `SystemEvent`,
  `DashboardWidget`, `ScheduledReport`), 4 new enums, plus additive
  columns on the existing `notifications` table; migration
  `20260722120000_add_admin_platform_analytics_notifications`. Full RLS
  (enable + all 3 standard policies) added for all 4 new tables —
  verified live via direct `pg_tables`/`pg_policies`/
  `information_schema.role_table_grants` queries (4/4 tables,
  `rowsecurity = true`, 12/12 policies; `system_events`/
  `scheduled_reports` grants confirmed limited to `INSERT`+`SELECT`
  only for `antrique_app`/`antrique_service`, matching `payments`/
  `audit_logs`/`payment_allocations`'s own append-only treatment), not
  assumed from the migration file alone. Seed data: 3
  `NotificationTemplate` rows, 3 `DashboardWidget` rows (one per real
  aggregated-module consumer with a natural KPI story), 2 sample
  `Notification` rows on the Milestone 8 Jordan order/invoice — one
  `SENT`, one `FAILED` (the `FAILED` one is what "Retry placeholder" has
  something real to act on), 2 `AuditLog` rows, 2 `SystemEvent` rows
  (one `WARNING`, one `ERROR` — the same row `systemErrorCount24h` picks
  up live), and 1 `ScheduledReport` (`SALES_SUMMARY`, computed from the
  same live order data) — idempotency re-verified (ran the seed script
  twice, identical resulting row counts both times). Full validation:
  `pnpm lint`/`typecheck`/`build`/`test` all clean (153 suites/858 tests,
  up from 135/778 — 18 new suites, 80 new tests: 6 DTO, 4 repository, 4
  service, 4 controller spec files). Live boot with zero DI issues (all
  Milestone 11 routes correctly mapped), and a full live HTTP smoke test
  (18 checks, all passed) covering RBAC (customer forbidden from
  Notifications/Dashboard/Reports entirely — Manager+ only; manager
  forbidden from Audit — Admin+ only), notification retry resetting
  `FAILED` → `PENDING` with `retryCount` incremented and a matching
  `AuditLog` entry immediately visible via `GET /audit-logs?search=...`,
  a second retry attempt correctly rejected (no longer `FAILED`),
  dashboard overview returning all 5 modules + 3 widgets +
  `systemErrorCount24h` >= 1 (the seeded `ERROR` `SystemEvent`),
  per-module KPI endpoints returning real computed numbers (not seed-data
  literals), an unknown module cleanly rejected with `400`, report
  generation producing a real snapshot from live order data, and report
  list/download-metadata both reflecting it.

- Milestone 10 (Payments & Billing Foundation) implementation is done
  and fully validated, awaiting its review pass. "This module owns
  financial records only. It must not become a payment gateway
  implementation" (this milestone's own framing) — the sixth real
  business module. Architecture audit (run before writing any code, per
  this milestone's own explicit "Before Implementation" requirement)
  found `Invoice`/`InvoiceItem`/`Payment`/`Quotation`/`QuotationItem`
  already fully modeled since Phase 1.1A/1.1B with ZERO application-
  layer consumers — the same "schema exists, first real consumer"
  situation Milestones 3 and 9 already found — and, notably, that the
  existing schema had ALREADY anticipated two of this milestone's own
  business rules at the database level before any application code
  existed: `invoices_amount_paid_check`
  (`20260717091000_check_constraints`, "amount_paid >= 0 AND amount_paid
  <= total_amount") already enforced "Paid amount never exceeds invoice
  total," and `payments` already had `UPDATE`/`DELETE` revoked at the
  database-privilege level (`20260717091500_row_level_security`)
  already enforcing append-only payment records. A new `BillingModule`
  (`apps/api/src/modules/billing/`) provides three controller/service/
  repository triads — Invoice, Payment, Tax — tenant-isolated, RBAC-
  protected via `PermissionsGuard`. Reused the ALREADY-EXISTING
  `invoices:read`/`invoices:write`/`payments:read` permissions (Phase
  1.1B) rather than defining new ones — only extended their grants
  (`manager` gains `invoices:write` [already had `invoices:read`],
  `manager`/`customer` both gain `payments:read` [previously granted to
  nobody at all]); 6 new permissions for the genuinely new tiers
  (`invoices:void`/`payments:refund` [Admin+-only, mirroring Milestone
  8's own `orders:cancel`], `payments:write`, `tax_rates:read`/`write`/
  `delete`). Imports TWO other modules — `OrdersModule` (now `exports:
  [CustomerRepository, OrderRepository]` — `OrderRepository` was
  deliberately NOT exported at Milestone 9, since no CRM business rule
  read Order data; this milestone is the real consumer that scoping
  note anticipated) for "Invoices belong to Orders," and `CatalogModule`
  (exported `ProductRepository`) to resolve invoice line-item
  descriptions from the originating order line's own product variant
  SKU — the SAME repository `OrdersModule` itself already imports for
  an identical reason. Deliberately does NOT import `CrmModule` — "CRM
  remains independent," this milestone's own explicit instruction.
  `Invoice`/`Payment` are reused wholesale but genuinely extended, not
  left untouched: `Invoice.clientId` (the pre-existing, still-unconsumed
  agency-billing path → `Client`) relaxed from required to nullable,
  gaining NEW `customerId`/`orderId` (→ Milestone 8's `Customer`/
  `Order`) and `taxRateId` — kept deliberately SEPARATE from `clientId`,
  the same "two independent paths on one shared entity" pattern
  Milestone 9 established for `Lead.convertedCustomerId` vs.
  `convertedClientId`, now generalized into `domain-module-guide.md`
  §21 ("relaxing a required column to nullable is additive precisely
  when zero consumers ever depended on it being non-null"). Two new
  `CHECK` constraints back this: `invoices_client_xor_customer_check`
  (mirroring `quotations_lead_xor_client_check` exactly) and
  `invoices_order_requires_customer_check`. `Payment.invoiceId`/
  `provider`/`providerRef` (the pre-existing gateway-webhook-event
  shape) similarly relaxed to nullable, gaining NEW `paymentMethodId`/
  `method`/`reference` for this milestone's own manually-RECORDED-
  payment flow — "Record payment" and "Allocate payment" are separate
  business responsibilities specifically so a payment can exist before
  it's tied to any invoice; the new `PaymentAllocation` table is the
  actual invoice-by-invoice ledger, used even for the common
  single-invoice case, and gets the SAME database-privilege-level
  `UPDATE`/`DELETE` revoke `payments` already has (a fresh `REVOKE`
  statement in this migration, not an edit to the earlier one).
  Genuinely new capability beyond every prior milestone's scope:
  `PaymentService.record()`/`allocate()` both re-verify "Payment
  allocations cannot exceed payment amount" (summed inside the
  transaction) and "Paid amount never exceeds invoice total" (the
  pre-existing `invoices_amount_paid_check` is the real backstop)
  inside the SAME transaction as the `PaymentAllocation` write, flipping
  the invoice to `PAID` automatically once `amountPaid` reaches
  `totalAmount`. `InvoiceService.createFromOrder()` generates invoice
  numbers via a per-tenant-per-year count + bounded retry-on-collision
  loop (proportionate for this milestone's own low-concurrency
  admin-driven flow — the existing partial unique index on
  `(tenantId, invoiceNumber)` is the race-free backstop regardless).
  `PATCH /invoices/:id` ("Update draft invoice") was added beyond this
  milestone's own literal "Controllers" list — the same "don't leave a
  named Service capability permanently unreachable" reasoning already
  applied to `LEAD_CREATED`'s own reachability gap in Milestone 9.
  `TaxRateController` is full CRUD (this milestone's own explicit "Tax —
  CRUD" Controllers entry); `PaymentMethod` gets none — the same
  asymmetry class as Milestone 9's `CustomerTag`/`LeadSource`
  (`Payment.method`'s own required free-text fallback already satisfies
  everything a `PaymentMethod` write path would, the way `Lead.source`
  did for `LeadSource`). "Refund placeholder" is a genuine stub —
  validates the payment exists, then throws `NotImplementedException`
  (`501`) explaining real refund processing needs gateway integration,
  rather than silently no-oping or pretending to succeed (there's no row
  it could mutate anyway — `payments` has `UPDATE`/`DELETE` revoked).
  3 new tables, migration
  `20260722110000_add_payments_billing_foundation`. Full RLS (enable +
  all 3 standard policies) added for all 3 new tables — verified live
  via direct `pg_tables`/`pg_policies` queries (3/3 tables, `rowsecurity
  = true`, 9/9 policies), not assumed from the migration file alone.
  Seed data: 2 `TaxRate` rows (GST 18%, No Tax), 3 `PaymentMethod` rows
  (Cash, Bank Transfer, Cheque), and a real `Invoice` → `Payment` →
  `PaymentAllocation` chain against the Milestone 8 Jordan order —
  created `DRAFT`, issued, then paid off via TWO payments (one partial
  via bank transfer, one completing it via cash), demonstrating "Partial
  payment"/"Multiple payments"/"Mark invoice paid" live in seed data —
  idempotency re-verified (ran the seed script twice, identical
  resulting row counts both times). Full validation: `pnpm lint`/
  `typecheck`/`build`/`test` all clean (135 suites/778 tests, up from
  121/696 — 14 new suites, 82 new tests: 5 DTO, 3 repository, 3 service,
  3 controller spec files). Live boot with zero DI issues (all Milestone
  10 routes correctly mapped), and a full live HTTP smoke test (30
  checks, all passed) covering RBAC (customer read-only including the
  reused `invoices:read`/newly-granted `payments:read`, manager
  write-but-not-void/refund), the full invoice lifecycle (create from
  order with server-computed tax → update draft → issue → immutability
  after issuance), two-payment partial-then-full settlement with
  automatic `PAID` marking, explicit unallocated-payment recording +
  later allocation, over-allocation rejection, void-then-reject-payment
  behavior, double-void rejection, the refund placeholder's real `501`,
  tax rate CRUD with Admin+-only delete, tenant-scoped filtering, and a
  missing token (401).

- Milestone 9 (CRM & Customer Operations) implementation is done and
  fully validated, awaiting its review pass. "The CRM module owns
  customer engagement and sales activities. It must not duplicate
  customer, order, or authentication logic" (this milestone's own
  framing) — the fifth real business module. Architecture audit (this
  milestone's own explicit "Before Implementation" requirement, run
  before writing any code) found `Lead` (plus `Client`/`ContactRequest`)
  already fully modeled since Phase 1.1A with ZERO application-layer
  consumers — no `LeadRepository`/`LeadService`/`LeadController` existed
  anywhere, the same "schema exists, this is its first real consumer"
  situation Milestone 3 found for Role/Permission — reused wholesale,
  not duplicated. A new `CrmModule` (`apps/api/src/modules/crm/`)
  provides five controller/service/repository triads — Lead,
  CustomerNote, CustomerActivity (read-only — "Timeline, List" only,
  every row written internally), FollowUp, and CustomerTag (a 5th triad
  beyond this milestone's own named "Repository Layer"/"Service Layer"/
  "Controllers" lists, added because `CustomerTag`/`CustomerTagAssignment`
  are named in "Core entities" and the "Tags" filter requires them —
  without a write path they'd be permanently dead schema; `LeadSource`,
  also unnamed, got NO controller since its own brief provides a
  built-in fallback, the legacy free-text `source` column — see
  `docs/implementation/decisions.md`), tenant-isolated, RBAC-protected
  via `PermissionsGuard`. Reused the ALREADY-EXISTING `leads:read`/
  `leads:write` permissions (Phase 1.1B's original agency-CRM seed)
  rather than defining new ones — only extended their grants (`manager`
  gains `leads:write`, `customer` gains `leads:read`); 10 new
  permissions for the four genuinely new entities
  (`customer_notes:*`/`follow_up_tasks:*`/`customer_tags:*` [3 each] +
  `customer_activities:read` [1, no write]). Imports ONE other module —
  `OrdersModule`, now `exports: [CustomerRepository]` (additive; its own
  `OrderRepository` deliberately NOT exported — unused by any Milestone
  9 business rule) — for "Use: CustomerRepository," reused directly for
  "Convert Lead → Customer" rather than duplicated. `Lead` gained
  exactly two additive nullable columns: `convertedCustomerId` (→ the
  NEW `Customer`, Milestone 8's e-commerce entity — a conversion path
  kept deliberately SEPARATE from the pre-existing `convertedClientId` →
  `Client`, the agency's own B2B path from the original CRM funnel — see
  `docs/implementation/decisions.md` for the full reasoning on why these
  coexist rather than one replacing the other) and `leadSourceId` (→ new
  `LeadSource` lookup, additive alongside the existing free-text
  `source` column), plus `LeadStatus.ARCHIVED`. Genuinely new capability
  beyond every prior milestone's scope: `LeadService.convert()` threads
  ONE transaction across the `OrdersModule` boundary — the same shape
  Milestone 8's own `domain-module-guide.md` §19 established for order
  creation, now documented generalized as §20 for reusing a previously-
  unconsumed entity across a milestone boundary — finds-or-creates a
  `Customer` (via two new `CustomerRepository` tx-taking variants,
  `findActiveByEmailInTx()`/`createWithRelationsInTx()`, purely
  additive — `OrdersModule`'s own `CustomerService` is unaffected),
  updates the Lead's own status, and writes a `LEAD_CONVERTED`
  `CustomerActivity`, all atomically. A real defect was caught and fixed
  BEFORE anything downstream depended on it: `CustomerActivity.customerId`
  was initially modeled required (matching its own "Customer"-prefixed
  naming), which made this milestone's own "automatic activity creation
  for lead creation" trigger impossible to satisfy (no Customer exists
  yet when a lead is first created) — caught during implementation, the
  already-applied migration was rolled back live, the column made
  nullable, `CustomerActivityType` trimmed from 6 speculative values
  down to exactly the 3 this milestone's own trigger list names, and the
  corrected migration re-applied — confirmed via a fresh `pg_tables`/
  `pg_policies` check afterward, not assumed. A second gap was caught
  during the live smoke test itself (not by inspection): a `LEAD_CREATED`
  activity (`customerId: null`) is structurally invisible to the
  customer-scoped `timeline()` endpoint — fixed by adding a `leadId`
  filter to the general `list()` endpoint (mapping to the already-
  indexed `relatedLeadId` column) so it stays reachable through this
  milestone's own second named read surface. `FollowUpTask` references
  EITHER a `Lead` OR a `Customer`, never both — a hand-written
  cross-column `CHECK` constraint (`follow_up_tasks_lead_xor_customer_check`)
  mirroring the existing `Quotation`/`InventoryItem` lead-vs-client XOR
  precedent, extended to a lead-vs-customer choice — "Due-date
  validation" additionally rejects a `dueAt` in the past on
  create/update. "Prevent duplicate active leads" is a service-level
  check only (`LeadRepository.findActiveByEmail()`, scoped to
  non-terminal statuses), not a DB constraint — the same "proportionate,
  not maximal" judgment call Milestone 8 made for "default addresses."
  6 new tables, 2 new enums, migration
  `20260722100000_add_crm_customer_operations`. Full RLS (enable + all 3
  standard policies) added for all 6 new tables — verified live via
  direct `pg_tables`/`pg_policies` queries (6/6 tables, `rowsecurity =
  true`, 18/18 policies), not assumed from the migration file alone.
  Seed data: 5 `LeadSource` rows, 1 additional Lead ("Morgan Ellis")
  demonstrating the new `convertedCustomerId` path end-to-end with its
  own resulting Customer (the pre-existing `LEAD_CONVERTED_ID` lead
  still demonstrates the old `convertedClientId` path, untouched), 2
  `CustomerNote`/3 `CustomerActivity`/2 `FollowUpTask` (one Customer-
  scoped `COMPLETED`, one Lead-scoped `PENDING` — both sides of the XOR)/
  2 `CustomerTag` rows with 1 assignment — idempotency re-verified (ran
  the seed script twice, identical resulting row counts both times).
  Full validation: `pnpm lint`/`typecheck`/`build`/`test` all clean (121
  suites/696 tests, up from 100/576 — 21 new suites, 120 new tests: 6
  DTO, 5 repository, 5 service, 5 controller spec files). Live boot with
  zero DI issues (all Milestone 9 routes correctly mapped, including
  confirming `GET /customer-activities/timeline` is declared ahead of
  the module's own general list route), a fresh `pnpm db seed` run
  confirmed idempotent, and a full live HTTP smoke test (28 checks, all
  passed) covering RBAC (customer read-only including the reused
  `leads:read`, manager write including the reused `leads:write`),
  duplicate-active-lead rejection (409), the full lead create →
  duplicate-rejected → convert → immutability lifecycle, the follow-up
  create → complete → edit-rejected → reopen → cancel lifecycle, tag
  create/assign/unassign/re-unassign-404, lead archive → update-rejected
  immutability, the `leadId`-filtered activity reachability fix itself,
  tenant-scoped filtering, and a missing token (401).

- Milestone 8 (Order Management & Checkout) implementation is done and
  fully validated, awaiting its review pass. The orchestration layer
  that coordinates existing domains rather than reimplementing their
  logic, and the fourth real business module — the most cross-module-
  dependent one in this arc, importing THREE other modules
  (`CatalogModule` for `ProductRepository`, `BespokeModule` for
  `ProductCustomizationRepository`, `InventoryModule` for
  `InventoryService`). A new `OrdersModule`
  (`apps/api/src/modules/orders/`) provides two controller/service/
  repository triads — Customer (full CRUD) and Order (create/update/
  cancel/get/list/change-status) — for `Customer`, `CustomerAddress`,
  `Order`, `OrderItem`, `OrderStatusHistory`, `PaymentRecord`
  (placeholder only — no service/controller/repository of its own,
  purely a schema anchor for the payment-gateway-integration milestone
  this one's own "Do NOT Implement" list explicitly defers), tenant-
  isolated, RBAC-protected via `PermissionsGuard` (6 new permissions —
  `customers:read`/`write`/`delete` + `orders:read`/`write`/`cancel`,
  `cancel` replacing the usual `delete` tier since Order has no delete
  endpoint, its own stricter Admin+-only permission), paginated,
  filterable, sortable. Genuinely new schema (6 tables, 1 enum,
  migration `20260722090000_add_order_management`). Genuinely new
  capability beyond every prior milestone's scope: threading ONE
  transaction across a module boundary — `OrderService.create()`
  validates customer/variant/customization/pricing BEFORE opening a
  transaction (fail fast), then opens `OrderRepository.runInTransaction()`
  and passes that SAME `Prisma.TransactionClient` into every
  `InventoryService` call it makes (`reserveStockForOrder()`,
  `releaseReservation()`, `consumeReservation()` — all three gained an
  explicit `tx` parameter this milestone), so an order's own rows and
  its inventory side-effects commit or roll back together — see
  `docs/architecture/domain-module-guide.md` §19 for the fuller
  reasoning on why this is the first milestone where a transaction
  boundary genuinely crosses a module import, and why threading the
  client through (rather than two separately-opened transactions) is
  what makes the combined operation atomic. "No status mutation without
  history" is enforced structurally, not by convention: `changeStatus()`/
  `cancel()` both write the status update and its `OrderStatusHistory`
  row inside the same transaction as any inventory side-effect (consuming
  reservations on reaching `COMPLETED`, releasing them on `CANCELLED`).
  `changeStatus()` only accepts the single valid forward transition from
  the order's current status (`ORDER_FORWARD_TRANSITIONS`) — `CANCELLED`
  is reachable only through the separate, more-privileged `cancel()`
  endpoint, a deliberate re-reading of the brief's own literal
  Draft→Pending→Confirmed→Processing→Completed→Cancelled diagram as
  realistic e-commerce semantics rather than a strict sixth sequential
  step (see `docs/implementation/decisions.md`). Reaching `COMPLETED`
  calls `InventoryService.consumeReservation()` — the real caller
  Milestone 7's own version of that method was built for but had no
  controller route to reach yet (Milestone 7's own README flagged this
  explicitly as a predicted future caller). Full RLS (enable + all 3
  standard policies) added for all 6 new tables — verified live via
  direct `pg_tables`/`pg_policies` queries (6/6 tables, `rowsecurity =
  true`, 18/18 policies), not assumed from the migration file alone.
  Seed data: 6 new permissions, `manager`/`customer` grants extended
  (`manager` deliberately NOT granted `orders:cancel` — this milestone's
  own explicit Admin+-only tier), plus 1 customer (with 1 default
  shipping+billing address) and 1 order (1 item against the seeded
  solitaire ring variant, with its own inventory reservation feeding
  Milestone 7's own reserved count, and an initial `DRAFT`
  `OrderStatusHistory` row) — idempotency re-verified (ran the seed
  script twice, identical resulting row counts both times). Full
  validation: `pnpm lint`/`typecheck`/`build`/`test` all clean (100
  suites/576 tests, up from 94/527 — 6 new suites, 49 new tests: 3 DTO
  (`create-order`/`create-customer`/`order-list-query`), 1 service
  (`order.service.spec.ts` — the module's most business-logic-dense file,
  previously with zero coverage), 2 controller spec files
  (`order.controller.spec.ts`/`customer.controller.spec.ts`, also
  previously uncovered) — `customer.service.spec.ts`/
  `order.repository.spec.ts`/`customer.repository.spec.ts` already
  existed from this milestone's own implementation phase). Live boot with zero
  DI issues (all Milestone 8 routes correctly mapped), a fresh `pnpm db
  seed` run confirmed idempotent, and a full live HTTP smoke test (17
  checks, all passed) covering RBAC (customer 200 on read/403 on
  customer-write, manager 201 on customer/order create, manager 403 on
  cancel, admin 200 on cancel), the full DRAFT→PENDING→CANCELLED
  lifecycle with correct `OrderStatusHistory` ordering, a rejected skip-
  ahead status transition (400), a rejected double-cancel (400), a real
  inventory reservation created on order create and released back on
  cancel (confirmed via `GET /inventory/:id`'s own `reserved` counter
  before/after), a missing token (401), and status filtering on `GET
  /orders`. `docs/architecture/backend.md`/`database-schema.md`/
  `domain-module-guide.md` (new §19) and
  `apps/api/src/modules/orders/README.md` all updated; Milestone 7's own
  review pass is still separately pending (unrelated to this milestone's
  own scope) — see below.

- Milestone 7 (Inventory & Stock Management) implementation is done,
  awaiting its review pass. The third real business module, and the
  first with zero cross-module imports: a new `InventoryModule`
  (`apps/api/src/modules/inventory/`) provides three controller/service/
  repository triads — Warehouse (full CRUD), Inventory (domain-specific
  stock operations, no plain create/delete), Supplier (full CRUD, nested
  `SupplierProduct`) — for `Warehouse`/`InventoryItem`/
  `InventoryTransaction`/`InventoryReservation`/`Supplier`/
  `SupplierProduct`, tenant-isolated, RBAC-protected via
  `PermissionsGuard` (8 new permissions — `warehouses:*`/`suppliers:*`
  [3 each] + `inventory:read`/`write` [2, no delete — the brief lists no
  delete operation for InventoryItem]), paginated, filterable, sortable,
  soft-delete-aware. Genuinely new schema (6 tables, 4 enums, migration
  `20260721100000_add_inventory_management`). New business-rule surface
  beyond every prior milestone's CRUD-only scope — real transactional
  stock math: `InventoryRepository.applyStockChange()`/`reserveStock()`/
  `releaseReservation()`/`consumeReservation()` each run inside one
  `prisma.$transaction()` callback, using Prisma's atomic `{ increment
  }`/`{ decrement }` (not a read-then-write in application code) so
  concurrent stock mutations are race-free without explicit row locking,
  with the counter mutation and its `InventoryTransaction` ledger row
  always written together ("Stock changes always create transaction
  records"). Every mutating `InventoryService` method pre-checks the
  resulting counters before writing ("Prevent negative stock"/"Prevent
  over-reservation"/"Reservation cannot exceed availability"), with a new
  `isCheckConstraintViolation()` helper (`utils/prisma-error.util.ts`,
  the P2004 counterpart to the existing P2002
  `isUniqueConstraintViolation()`) translating a genuine concurrent-write
  CHECK-constraint race into a clean 409 as the backstop.
  `InventoryItem`/`SupplierProduct` both reference EITHER a
  `ProductVariant` OR a `Fabric` via the same lead-vs-client XOR pattern
  `Quotation` already established in Phase 1.1B — a hand-written
  cross-column `CHECK` constraint, plus (a genuinely new landmine no
  prior migration hit) TWO partial unique indexes on `InventoryItem`, one
  per side of the XOR, since Prisma's auto-diff proposed neither at all.
  Unlike Milestone 6's "export a module's repository, import the module"
  pattern, this module validates its two cross-module references
  (`ProductVariant` from catalog, `Fabric` from bespoke) via direct
  existence-check methods on its own repositories instead — importing
  both `CatalogModule` and `BespokeModule` for two narrow checks was
  judged not worth the coupling, especially since `ProductVariant` has no
  repository of its own to import in the first place (see
  `domain-module-guide.md` §18 for the "when to reuse an export vs.
  check directly" reasoning). "Soft delete only when no active inventory
  exists" is enforced on `Warehouse.remove()` (422 if any
  `InventoryItem` in that warehouse still has on-hand or reserved stock)
  — `InventoryItem` itself has no delete endpoint at all this milestone.
  `InventoryService.consumeReservation()` exists and is unit-tested but
  has no controller route — the brief's own "Controllers" list has no
  "Consume reservation" entry even though "Service Layer" lists it as a
  required capability; read literally as "releasing a hold is an admin
  action exposed now, consuming one is naturally triggered by order
  fulfillment, which doesn't exist yet." No design guidance existed in
  `docs/product/` for inventory/warehouse/supplier either — checked
  fresh, and confirmed both `catalog/README.md`/`bespoke/README.md`
  explicitly disclaim inventory as out of their own prior scope without
  ever describing its shape. Milestones 1–6 (the user's own labels for
  those deliverables — distinct from the roadmap's "◆ M1" sprint
  milestone above) all went straight from implementation to the next
  milestone without an intervening review pass — a consistent user
  workflow choice across this arc, not an oversight; each one's own
  implementation report is the only record of that work's validation so
  far. Next up: Milestone 7's review pass.

  **Environment note:** the host machine's C: drive filled to 0 bytes
  free during Phase 1.2D.4 (unrelated to this project) and has fluctuated
  24MB → 322MB → 3.9GB free across every phase and review since; every
  validation step in each of them was re-verified against current free
  space rather than assumed to succeed. ~1.0GB free as of this milestone
  — noticeably lower than Milestone 6's 3.2GB, re-verified before every
  disk-touching step in this milestone rather than assumed safe from an
  earlier reading.

- Sprint 1 → Auth integration, Milestone 7 implementation (Inventory &
  Stock Management): built a new `InventoryModule` with three
  controller/service/repository triads —
  `WarehouseController`/`WarehouseService`/`WarehouseRepository`,
  `InventoryController`/`InventoryService`/`InventoryRepository`,
  `SupplierController`/`SupplierService`/`SupplierRepository`.
  Investigated first: `schema.prisma` had none of the 6 named entities,
  and a fresh repo-wide search found zero design guidance for inventory/
  warehouse/supplier anywhere — both `catalog/README.md`'s and
  `bespoke/README.md`'s own "What this module explicitly does NOT do"
  sections disclaim inventory by name, but neither describes its shape —
  proceeded with a deliberately generic inventory-ledger design, flagged
  explicitly. `InventoryItem`/`SupplierProduct` reference EITHER a
  `ProductVariant` OR a `Fabric`, mirrored exactly on the existing
  `Quotation.leadId`/`clientId` XOR precedent
  (`20260717091000_check_constraints`'s own "Cross-column" section) — a
  hand-written cross-column `CHECK` constraint, plus two hand-written
  partial unique indexes on `InventoryItem` (one per side of the XOR)
  that NEITHER Prisma's auto-diff NOR any prior migration's own template
  anticipated, since expressing "unique per warehouse+variant, but only
  when variant is the non-null side" needs a filtered index scoped to a
  specific column being non-null, not just `deleted_at IS NULL`.
  Migration `20260721100000_add_inventory_management` — hand-written,
  same fix classes as every migration since Milestone 5's own: the
  auto-diff's spurious `users(tenant_id, email)` re-add dropped outright;
  `warehouses`/`suppliers` (soft-deletable) get partial unique indexes.
  New `CHECK` constraint class beyond every prior migration's non-
  negative/positive-value checks: `reserved <= on_hand`, referencing two
  columns of the SAME row — the database-level backstop behind
  `InventoryService`'s own pre-checks for "Prevent negative stock"/
  "Prevent over-reservation." Full RLS (enable + all 3 standard policies)
  added for all 6 new tables — verified live via direct `pg_tables`/
  `pg_indexes`/`pg_constraint`/`pg_policies` queries (6/6 tables, 18/18
  policies, all 8 CHECK constraints, correct partial-vs-plain unique
  indexes), not assumed from the migration file alone. Genuinely new
  service-layer capability beyond every prior milestone's CRUD-only
  scope: `InventoryRepository.applyStockChange()`/`reserveStock()`/
  `releaseReservation()`/`consumeReservation()` each run inside one
  `prisma.$transaction(async (tx) => ...)` callback, using Prisma's
  atomic `{ increment }`/`{ decrement }` (a single `SET on_hand = on_hand
  + $delta` Postgres statement against the CURRENT row value at write
  time) rather than reading the row then writing a computed value back in
  application code — this is what makes concurrent stock mutations
  race-free without explicit row locking, and it composes correctly with
  the CHECK constraints (a concurrent double-decrement that would push a
  counter invalid still correctly fails on whichever transaction commits
  second). Added `isCheckConstraintViolation()` to
  `utils/prisma-error.util.ts` (the P2004 counterpart to the existing
  P2002 `isUniqueConstraintViolation()`) as the race-free backstop
  translation for `InventoryService`'s own optimistic pre-checks. A
  deliberate departure from Milestone 6's own "export a module's
  repository, import the module" cross-module pattern:
  `InventoryModule` imports NOTHING, validating its two external
  references (`ProductVariant` from catalog — which has no repository of
  its own to import in the first place — and `Fabric` from bespoke) via
  small existence-check methods reaching `this.prisma.productVariant`/
  `this.prisma.fabric` directly from its own repositories, rather than
  importing two whole modules for two narrow checks — documented as a
  new decision in `domain-module-guide.md` §18 rather than silently
  diverging from the established pattern. Seed data: 8 new permissions,
  `manager`/`customer` grants extended, plus 1 warehouse, 2 inventory
  items (one Fabric-based, one ProductVariant-based — demonstrating both
  sides of the XOR against the fabrics/ring variant seeded in Milestones
  5–6), 3 inventory transactions forming a ledger consistent with the
  items' own counters, 1 active reservation, and 1 supplier with 1
  supplier product — idempotency re-verified (ran the seed script twice,
  identical resulting row counts and ledger both times). Full validation:
  `pnpm lint`/`typecheck`/`build`/`test` all clean (91 suites/507 tests,
  up from 76/421 — 15 new suites, 86 new tests: 8 DTO, 3 repository, 3
  service, 3 controller spec files, plus 4 new tests for
  `isCheckConstraintViolation()`), live boot with zero DI issues (all
  Milestone 7 routes correctly mapped, including confirming
  `GET /inventory/transactions` is declared ahead of `GET /inventory/:id`
  so Nest's route matching doesn't swallow the literal path as an id
  param).

- Sprint 1 → Auth integration, Milestone 6 implementation (Bespoke
  Customizer Engine): built on top of Milestone 5's `CatalogModule`, a new
  `BespokeModule` with four controller/service/repository triads —
  `FabricController`/`FabricService`/`FabricRepository`,
  `MeasurementProfileController`/`MeasurementService`/
  `MeasurementRepository` (targets `MeasurementProfile` as its aggregate
  root, per the brief's own naming — see `domain-module-guide.md` §16),
  `StyleOptionController`/`StyleOptionService`/`StyleOptionRepository`,
  `ProductCustomizationController`/`ProductCustomizationService`/
  `ProductCustomizationRepository` (no `DELETE` route — the brief lists
  Create/Update/Get/List only). Investigated first: `schema.prisma` had
  none of the 10 named entities, and a fresh repo-wide search (not just
  `docs/product/`) found zero design guidance for "Bespoke Customizer"
  beyond Milestone 5's own forward-reference doc comments on
  `Product`/`ProductVariant` — proceeded with a deliberately generic
  bespoke-garment design, flagged explicitly. Added, beyond the brief's
  10 named entities, two structurally-required join tables not
  individually named: `ProductFabric` (Product ↔ Fabric many-to-many —
  a fabric like "Navy Wool Twill" is meant to be reusable across many
  products, which a single scalar FK can't express) and
  `StyleOptionIncompatibility` (needed to make "Incompatible style
  combinations are rejected" expressible at all). Migration
  `20260720200000_add_bespoke_customizer` — hand-written from `prisma
  migrate diff`'s raw output, same two classes of fix Milestone 5's own
  migration established: the auto-diff's spurious `users(tenant_id,
  email)` re-add dropped outright; `fabric_categories`/`fabrics`/
  `measurements`/`product_customizations`'s own new unique indexes
  hand-written as **partial** (`WHERE deleted_at IS NULL`) where
  soft-deletable (`product_customizations`' is on `product_id` alone — a
  true 1:1 relation Prisma's own relation validator requires, caught by
  `prisma format` mid-build, not discovered later — `@@unique([tenantId,
  productId])` doesn't satisfy that validator for a 1:1). New `CHECK`
  constraints beyond non-negative `sort_order`:
  `measurements.value > 0`, `monogram_options.max_characters > 0`, and a
  conditional bound on `pricing_adjustments` (`PERCENTAGE` between -100
  and 500) — enforcing "Pricing adjustments are valid"/"Monogram rules
  are enforced" at the database level too. Full RLS (enable + all 3
  standard policies) added for all 12 new tables, including both join
  tables — verified live via direct `pg_tables`/`pg_indexes`/
  `pg_constraint`/`pg_policies` queries (12/12 tables, 36/36 policies, all
  8 CHECK constraints, correct partial-vs-plain unique indexes),
  not assumed from the migration file alone. During schema work, a stray
  auto-inserted `fabric`/`fabricId` relation on `PricingAdjustment` (left
  over from an earlier design iteration where `Fabric` had a
  now-removed back-relation) caused a live `P2022` "column does not
  exist" error on first seed run — traced to `prisma format`'s relation
  auto-completion, fixed by removing both sides of the stray relation,
  re-verified via a fresh `prisma migrate diff` showing zero unexpected
  drift beyond the already-known `users` landmine. Seed data: 11 new
  permissions, `manager`/`customer` grants extended, plus one distinct
  garment product ("Made-to-Measure Oxford Shirt" — the existing jewelry
  catalog has no natural fabric/measurement/style-option story) with 2
  fabric categories, 2 fabrics, 1 fabric image, 1 measurement profile (3
  measurements, linked to the seeded `customer@antrique.dev` user), 1
  product customization (2 style option groups, 4 style options, 1
  incompatibility pair, 1 pricing adjustment, 1 monogram option) —
  idempotency re-verified (ran the seed script twice, identical resulting
  row counts both times). Full validation: `pnpm lint`/`typecheck`/
  `build`/`test` all clean (76 suites/421 tests, up from 57/328 — 19 new
  suites, 93 new tests: 8 DTO, 4 repository, 4 service, 4 controller
  spec files), live boot with zero DI issues (all Milestone 6 routes
  correctly mapped), and a full live HTTP smoke test covering RBAC
  (customer 403/manager 201/manager-delete 403), validation failures
  (bad slug 400, duplicate slug 409, duplicate measurement names 400,
  self-incompatibility rejection, cross-product incompatibility
  rejection 400, styleOptionId-at-create rejection 400, duplicate
  customization 409), soft delete (204 then 404), filtering, pagination,
  and a genuine second-tenant cross-tenant-isolation check (empty lists,
  direct cross-tenant id access 404s, no leak) — all passed; test
  artifacts cleaned up afterward.

- Sprint 1 → Auth integration, Milestone 5 implementation (Product
  Catalog Foundation): built this codebase's first real, full CRUD
  business module (Category/Collection/Product) on top of Milestones
  2–4's authentication/RBAC/tenant-resolution foundation. Investigated
  first: `schema.prisma` had NO product-catalog entities at all — unlike
  Milestones 3/4, which each found their target entities already fully
  modeled, this milestone genuinely needed new schema (`Category`,
  `Collection`, `Product`, `ProductVariant`, `ProductImage`, 3 new
  enums). Also checked `docs/product/*.md` for design guidance before
  choosing field names — found none (those docs model Antrique purely as
  a web agency selling services to its own clients, no e-commerce
  concept anywhere); proceeded with a deliberately generic catalog
  design, flagged explicitly in both `schema.prisma`'s own comment and
  `apps/api/src/modules/catalog/README.md`, mirroring
  `prisma/seed.ts`'s own "Scope gap, flagged rather than silently
  resolved" precedent from Phase 1.1B, rather than guessing at a
  specific product line. Migration `20260720190000_add_product_catalog`
  — hand-written from `prisma migrate diff`'s raw output (not applied
  verbatim): the auto-diff again proposed re-adding a plain unique index
  on `users(tenant_id, email)` (dropped outright — that table isn't
  touched here); `Category`/`Collection`/`Product`'s own new
  `(tenantId, slug)` unique indexes are hand-written as **partial**
  (`WHERE deleted_at IS NULL`), the same landmine/treatment
  `User`/`Role`/`Quotation`/`Invoice`/`Blog`/`Setting` already have;
  `ProductVariant`'s `(tenantId, sku)` index is correctly **plain** —
  that table has no soft-delete column. Non-negative `CHECK` constraints
  (`sort_order` on all 5 tables, `price` on `ProductVariant`) and full
  RLS (enable + all 3 standard policies) added for every one of the 5
  new tables, extending Phase 1.1B's own pattern to schema added after
  it rather than letting RLS coverage silently lag new tables — verified
  live via direct `pg_tables`/`pg_indexes`/`pg_constraint`/`pg_policies`
  queries after applying, not assumed from the migration file alone.
  Repository layer: `CategoryRepository`/`CollectionRepository`/
  `ProductRepository`, each with `findActiveById(id, tenantId)` and
  `findManyPaginated(tenantId, where, orderBy, skip, take)` — the latter
  merges `tenantId`/`deletedAt: null` into the query itself (never
  trusts a caller-assembled `where`) and runs `findMany`+`count` inside
  one `prisma.$transaction([...])` (array form) so a page's `total`
  can't disagree with its `items` under concurrent writes — this
  milestone's own "Transactions where appropriate" requirement, applied
  where genuinely needed. This required adding `count()` to
  `BaseRepository` itself (Phase 1.2D.3 infrastructure, extended for the
  first time since) — a genuine, simultaneous 3-repository need, the
  same "second/third real consumer" trigger this project's discipline
  already uses elsewhere. A real, non-obvious TypeScript limitation was
  found and fixed, not routed around: `BaseRepository`'s inherited
  `create()`/`update()` are typed via `ReturnType<TDelegate['create']>`,
  which cannot preserve Prisma's `include`-conditional return type
  through a still-generic method signature — confirmed live via
  `pnpm typecheck` that `product.variants` didn't exist on the inferred
  type despite existing at runtime. Fixed by adding plain, explicitly
  named methods (`ProductRepository.createWithRelations()`/
  `updateWithRelations()`) that call `this.delegate.create({ data,
  include })` directly with a literal args object, letting TypeScript's
  normal generic inference (which works correctly for an actual call
  expression, unlike a `ReturnType<>` type-level operation) resolve the
  real, relation-including type — documented in
  `docs/architecture/domain-module-guide.md` §16 as a standing lesson
  for any future repository needing `include`/`select`. Service layer:
  unique-constraint violations (`P2002`) translated to a clean `409` via
  a new `isUniqueConstraintViolation()` helper
  (`apps/api/src/utils/prisma-error.util.ts` — the first real file in
  the `utils/` placeholder folder, graduating it) rather than a
  pre-check-then-insert (which would race under concurrent requests);
  `update()`/`remove()` both call `findActiveById(id, tenantId)` first,
  which is what makes the subsequent plain `where: { id }` mutation
  tenant-safe. `ProductService` additionally injects
  `CategoryRepository`/`CollectionRepository` (not just its own
  `ProductRepository`) specifically to validate that a client-supplied
  `categoryId`/`collectionId` genuinely belongs to the caller's own
  tenant before letting a Product reference it — without this check, a
  real category belonging to a *different* tenant would pass Postgres's
  FK constraint (which only requires the referenced row to exist, not
  that it belongs to the same tenant), a genuine cross-tenant reference
  leak this milestone's "never trust client-supplied tenant identifiers"
  requirement extends to any client-supplied *foreign* id, not just an
  explicit tenant id — confirmed live with a fake-but-real-looking
  categoryId, correctly rejected with `400`. `createdBy`/`updatedBy`/
  `deletedBy` deliberately left unset everywhere in this module — a
  known, accepted gap: `RequestUser` (Milestone 2, still unchanged) is
  `{ email }` only, with no `userId` anywhere in the request pipeline to
  populate these nullable audit columns with; resolving it via an extra
  query per write, purely to fill an optional column, was rejected as
  scope this milestone's brief never asked for. RBAC design: used
  `PermissionsGuard` exclusively (not `RolesGuard`, despite the brief
  naming both) — the brief's own read/write/delete tiers map 1:1 onto
  `{resource}:read`/`write`/`delete` permission keys, the existing
  convention every other business domain in this catalog already uses,
  cleaner than hardcoding three role-name lists across nine controller
  methods across three controllers; 9 new permissions granted to
  `manager`(read+write)/`admin`+`super_admin`(read+write+delete)/
  `customer`(read only) in `prisma/seed.ts`, purely additively —
  `admin`/`super_admin` already had every permission automatically via
  `PERMISSIONS.map(p => p.key)`, unchanged. Discovered and fixed a real,
  latent test-infrastructure gap while writing this milestone's DTO
  specs (not introduced by this milestone): `@Type()` (class-transformer,
  used by the new `PaginationQueryDto`/nested `CreateProductDto.variants`)
  requires `reflect-metadata`'s global polyfill, which nothing in this
  codebase's Jest config ever loaded — no prior DTO used `@Type()`, so
  this never surfaced; fixed by adding `"setupFiles": ["reflect-metadata"]`
  to `package.json`'s `jest` config, the standard fix for this exact
  NestJS+Jest+class-transformer combination. Full validation:
  lint/typecheck/build/test all clean (328 tests passing across 57
  suites, up from 244/36 — 84 new, across 21 new spec files: 11 DTO, 3
  repository, 3 service, 3 controller, 1 utility). Live boot confirmed clean
  `CatalogModule dependencies initialized`, zero DI errors, all 15
  catalog routes mapped. Live `fetch` matrix logged in as all 4 seeded
  RBAC tiers, confirmed the complete validation surface: all tiers read
  (200), Customer blocked from write (403), Manager can write but not
  delete (403), Admin can delete (204, soft-deleted row then 404),
  validation failures return clean `400`s with field-level messages,
  duplicate slug returns `409`, product detail includes nested
  variants/images while list omits them, category/status/search
  filtering and page/limit pagination both work correctly, nested
  variant/image creation succeeds atomically (Prisma's own decimal
  `Decimal.toJSON()` confirmed serializing `price` as a string, not a
  float), a nonexistent categoryId is rejected with `400`, and a
  missing token still gets `401`.
- Sprint 1 → Auth integration, Milestone 4 implementation (Organization &
  Multi-Tenant Foundation): replaced the fixed `DEFAULT_TENANT_ID`
  bootstrap with real, request-based tenant resolution, preserving
  everything Milestones 1–3 built on top of it. Investigated first, before
  writing any code: `schema.prisma` has no separate `Organization`
  entity — `Tenant` (Phase 1.1A) already IS the platform's own
  multi-tenancy isolation boundary, so `OrganizationRepository` is a
  thin, purpose-named wrapper over it, not a new table (this milestone's
  own "Do NOT Implement: Organization CRUD" confirms this reading); a
  `User` belongs to exactly one `Tenant` via a direct FK, not a
  many-to-many membership table, so "user organization membership" is
  satisfied by the existing tenant-scoped `WHERE tenantId = X` filter,
  not a new join table. `TenantResolver`
  (`apps/api/src/tenant/tenant-resolver.service.ts`) implements the
  requested 3-priority chain — hostname (a ≥3-label, non-IP hostname's
  leftmost label, matched against `Tenant.slug`; no dedicated
  hostname/domain column exists, so this is subdomain-matching against
  the existing `slug`, not a schema change) → `X-Tenant-ID` header
  (dev/testing) → `DEFAULT_TENANT_ID` — with the critical safety property
  gated explicitly, not just documented: the dev fallback checks
  `nodeEnv === 'development'` before ever querying it, so a
  `production`/`test` request that resolves nothing gets a `400`, never
  a silent cross-tenant default. Every candidate (including the fallback
  itself) is independently validated against the database — a candidate
  that isn't a real active tenant is treated exactly like "no candidate."
  `TenantMiddleware` calls `TenantResolver` exactly once per request and
  attaches two frozen views — `TenantContext` (`{ tenantId }`, minimal,
  for query-scoping) and `OrganizationContext` (`{ id, name, slug }`,
  richer, for display) — satisfying "tenant resolution occurs once per
  request" and "request context is immutable after resolution" as literal
  runtime properties (`Object.freeze()`, not just TypeScript `readonly`),
  the same discipline `JwtAuthGuard`'s `request.user` already established.
  A real, non-obvious integration risk was identified and verified live,
  not assumed: `TenantMiddleware` is registered via `TenantModule`'s own
  `NestModule.configure()` + `MiddlewareConsumer.forRoutes('*')` —
  deliberately NOT `main.ts`'s raw `app.use()` pattern
  `HttpLoggingMiddleware` uses — because a thrown `BadRequestException`
  needs to reach Nest's own exception-filter pipeline
  (`ExceptionLoggingFilter`) to produce a clean `400` JSON response
  instead of a hang (Express 4, this app's platform, does not
  automatically catch a rejected promise from middleware — `use()` uses
  an explicit `try`/`catch` + `next(error)`, not a bare `await`).
  Confirmed by booting with `NODE_ENV=production` and no hostname/header
  hint: the response was exactly
  `{"message":"Tenant could not be resolved","error":"Bad
  Request","statusCode":400}`, and the SAME `requestId`/`correlationId`
  appeared in both `ExceptionLoggingFilter`'s log line and
  `HttpLoggingMiddleware`'s completion log, proving the whole pipeline
  genuinely connects, not just that *a* response came back.
  `AuthRepository`/`RoleRepository`/`PermissionRepository` all stopped
  injecting the fixed `defaultTenant` config directly and now take
  `tenantId` as a plain method parameter instead — `AuthController.login()`
  reads it via a new `@Tenant()` decorator (mirroring `@CurrentUser()`'s
  exact shape); `RolesGuard`/`PermissionsGuard` read
  `request.tenantContext` directly (guards run before a param-decorator
  would resolve). `refresh()`/`logout()` deliberately untouched — neither
  looks up a user by email. The `defaultTenant` config itself relocated
  from `modules/auth/config/` to the new `tenant/config/` — Milestone 3's
  own decision record had explicitly declined to relocate it when a
  second consumer appeared, reasoning that sharing one
  `ConfigModule.forFeature()` factory across two modules was normal and
  relocating for two would be premature; this milestone changes that
  calculus by removing all three of the old direct-injection consumers,
  leaving `TenantResolver` as the one genuine, non-cosmetic owner — this
  supersedes, not overwrites, that earlier reasoning, and is called out
  in this milestone's own decision entry rather than silently reversing
  it. `AuthTokenPayload`/`RequestUser`/`JwtAuthGuard` are genuinely
  untouched (confirmed via `find -newer`) — tenant never becomes a JWT
  claim, this milestone's own explicit requirement; the same "resolve by
  a request-scoped signal, not a token claim" shape Milestone 3 already
  used for RBAC. `GET /example/organization` (new) demonstrates
  `@Tenant()`/`@Organization()`, guarded by `JwtAuthGuard` only — no
  RBAC layered on top, this milestone's own explicit ask. Proactively
  fixed a genuine documentation drift found during the pass, not
  introduced by it: `database-schema.md`'s multi-tenant-strategy section
  claimed tenant_id propagation came "from the same JWT tenant claim
  used for everything else" — never true after this milestone's own
  explicit "no tenant in the JWT" requirement, corrected in place. Full
  validation: lint/typecheck/build/test all clean (244 tests passing
  across 36 suites, up from 218/31 — 26 new; two mechanical relative-
  import-depth mistakes in new files (`../../generated/prisma/enums`
  instead of `../../../generated/prisma/enums`), caught immediately by
  typecheck and fixed before ever reaching test/build; one guard-spec
  authoring bug from Milestone 3 was NOT reintroduced — the fixed
  `createReflector()`-returns-the-instance-passed-to-the-guard pattern
  from that review carried forward correctly into this milestone's
  rewritten guard specs). Live boot confirmed clean
  `TenantModule dependencies initialized` with zero DI errors, all three
  example routes mapped. Live `fetch`/`curl` matrix confirmed: default
  dev fallback, `X-Tenant-ID` header resolution, an unknown header value
  correctly falling through to the dev default, real hostname resolution
  (`Host: antrique.example.app` → resolved via the seeded tenant's own
  `slug`), `GET /example/organization` returning the correct
  `tenantId`/`organization`, RBAC still fully functional under real
  tenant resolution (Admin `200`/`200`, Customer `403` on the
  role-guarded route), refresh unchanged, JWT payload still exactly
  `email`/`iat`/`exp`, wrong-password login still `401` — and, in a
  separate `NODE_ENV=production` boot, the dev-fallback rejection and
  clean-exception-response properties above.
- Sprint 1 → Auth integration, Milestone 3 implementation (Role &
  Permission Foundation): built this codebase's first RBAC layer on top
  of Milestone 2's authentication. Investigated first, before writing any
  code: `Role`/`Permission`/`UserRole`/`RolePermission` already existed in
  `schema.prisma` in full (Phase 1.1A) and were already seeded (34
  permissions, 4 roles) — the brief's "create Role entity/Permission
  entity/UserRole relation/RolePermission relation" items were already
  satisfied, so this milestone added zero schema changes and zero
  migrations, only application-layer consumers. `RoleRepository`/
  `PermissionRepository` (`apps/api/src/authorization/repositories/`, new
  `@Global()` `AuthorizationModule`) are data-access only — one real
  method each: `findRolesForUser(email)` (a single query joining
  `Role → UserRole → User` via a nested Prisma relation filter, tenant-
  scoped on both sides) and `findPermissionsForRoles(roleIds)` (joining
  `Permission → RolePermission`, tenant-scoped through the join since
  `Permission` itself has no `tenantId` — it's a global catalog).
  Resolving by *email* rather than adding a `userId` claim to the JWT
  payload was a deliberate design choice, not an oversight: it keeps
  `AuthTokenPayload`/`RequestUser`/`login()`/`refresh()` genuinely
  byte-for-byte unchanged (confirmed via `find -newer`), avoiding a
  second architectural change to already-approved, already-tested token
  infrastructure in the same milestone that also touches guards. Even
  though the query resolves by email, `AuthorizationService` still
  correctly satisfies CLAUDE.md's tenant-scoping rule — every underlying
  query is tenant-scoped, only the *lookup key into that scope* is email
  instead of a pre-resolved id. `AuthorizationService` is a stateless
  singleton — "cache resolution within a request only, no Redis" is
  achieved by every method taking the *caller's* `AuthorizationCache`
  (`apps/api/src/types/authorization-cache.type.ts`) rather than holding
  a cache as its own instance field, which would have leaked one caller's
  roles/permissions into a concurrent, unrelated request; `RolesGuard`/
  `PermissionsGuard` create `request.authorizationCache ??= {}` on first
  use, the same place `request.user` already lives. `RolesGuard`
  (`common/guards/roles.guard.ts`)/`PermissionsGuard`
  (`permissions.guard.ts`) read `@Roles()`/`@Permissions()` metadata
  (`common/decorators/`, plain `SetMetadata()` wrappers with zero
  authorization logic of their own) via `Reflector`, delegate the actual
  question to `AuthorizationService`, and throw `ForbiddenException`
  (`403`) on failure — neither ever verifies a JWT or returns `401`;
  `JwtAuthGuard` keeps that job exclusively, and both new guards *trust*
  guard-array execution order (`@UseGuards(JwtAuthGuard, RolesGuard)`)
  rather than defensively re-checking it. `@Roles()` uses OR semantics
  (any listed role is sufficient), `@Permissions()` uses AND (every
  listed permission is required) — a deliberate asymmetry, documented in
  both decorators' own comments. Reused
  `modules/auth/config/default-tenant.config.ts` directly (a second
  `ConfigModule.forFeature()` registration, not a relocation) rather than
  moving it out of `modules/auth/` — a plain, stateless config factory
  supporting two consumers doesn't need a new home, and relocating a
  working, already-documented Milestone 1 file for a purely cosmetic gain
  would have been unnecessary churn. Seed data (`prisma/seed.ts`)
  reconciled the brief's requested role names ("Super Admin, Admin,
  Manager, Customer") against the already-seeded, differently-named roles
  ("admin, project_manager, sales, client") purely additively: added
  `super_admin` (same grant set as `admin` — this schema has no
  platform-vs-tenant-admin distinction to differentiate them on yet),
  `manager` (same grants as `project_manager`), `customer` (same grants
  as `client`); renamed `admin`'s *display name* only ("Administrator" →
  "Admin", same `key`, so the existing row updates rather than
  duplicating); left `project_manager`/`sales`/`client` untouched rather
  than renamed, avoiding any risk of orphaning a real dev database's
  existing `UserRole`/`RolePermission` rows for zero benefit (nothing
  programmatic referenced those keys before this milestone introduced
  RBAC enforcement). Generalized the seed's single admin-user block into
  a loop over 4 users (`admin@antrique.dev`, `superadmin@antrique.dev`,
  `manager@antrique.dev`, `customer@antrique.dev`), one per RBAC tier,
  each with a real Argon2id password so every tier could be live-tested
  end to end via actual login. Two example endpoints demonstrate the two
  guards: `GET /example/ping` gained `RolesGuard`
  (`@Roles('admin', 'super_admin')`) on top of its existing
  `JwtAuthGuard`; a new `GET /example/permission-ping` demonstrates
  `PermissionsGuard` (`@Permissions('projects:write')`) — both reuse the
  same `ExampleDomainService.ping()`/`PingResponseDto`, since the guard
  stacked on each route is the entire difference being shown, not the
  response shape. `ROLE`/`PERMISSION` constants
  (`modules/auth/constants/role.constant.ts`/`permission.constant.ts`)
  hold only the keys real code actually references — role/permission
  lookup itself stays database-driven, per this milestone's own
  requirement, not a hardcoded map. Proactively fixed cross-cutting
  documentation drift during implementation (not left for a review pass):
  `common/guards/README.md`/`common/decorators/README.md` (both claimed
  "no RBAC" — false the moment these guards/decorators existed),
  `modules/auth/README.md` (needed precision — RBAC is real now, but
  lives entirely outside this module), `modules/example-domain/README.md`
  and `types/README.md`, `docs/architecture/security.md`'s "Authz"/"RBAC"
  lines (previously described RBAC as aspirational), and
  `docs/architecture/database-schema.md` §10 (seed counts). Full
  validation: lint/typecheck/build/test all clean (218 tests passing
  across 31 suites, up from 188/24 — 30 new; one genuine test-authoring
  bug caught and fixed before it shipped — see `docs/implementation/decisions.md`).
  `pnpm db:seed` re-run against the real dev database confirmed live via
  direct Prisma queries: 7 roles (4 original + 3 new), all 4 test users
  correctly role-assigned. Live boot confirmed clean
  `AuthorizationModule dependencies initialized` with zero DI errors, both
  new routes mapped (`GET /example/ping`, `GET /example/permission-ping`).
  Live `curl`/`fetch` matrix logging in as all 4 seeded tiers against both
  guarded endpoints confirmed the complete validation matrix: Super Admin
  `200`/`200`, Admin `200`/`200`, Manager `403`/`200` (no
  `admin`/`super_admin` role, but does hold `projects:write`), Customer
  `403`/`403` (neither); missing token `401`, invalid token `401`, wrong
  password login `401`, garbage refresh token `401` — `login`/`refresh`
  confirmed unchanged.
- Sprint 1 → Auth integration, Milestone 2 implementation (Authorization
  Foundation): built this codebase's first request-authorization layer
  on top of Milestone 1's authentication. `JwtAuthGuard`
  (`apps/api/src/common/guards/jwt-auth.guard.ts`) — a hand-written
  `CanActivate`, deliberately not `@nestjs/passport` — extracts a Bearer
  token from the `Authorization` header
  (`extractBearerToken()`, exported standalone so the header-parsing
  edge cases — missing header, wrong scheme, empty token, non-string
  duplicated header — are unit-testable without a full `ExecutionContext`
  mock every time) and verifies it exclusively through
  `TokenService.verifyAccessToken()` — never `@nestjs/jwt`'s `JwtService`
  directly, never `verifyRefreshToken()`. A refresh token presented here
  is rejected for the identical structural reason `AuthService.refresh()`
  already rejects an access token in the reverse direction: signed with
  the wrong secret, fails the same signature check, no special-cased
  detection needed — confirmed live, not assumed. On success, attaches a
  genuinely frozen (`Object.freeze()`, not only TypeScript
  `readonly`-typed — confirmed live that a mutation attempt throws
  `TypeError`) minimal `RequestUser` (`{ email }`,
  `apps/api/src/types/request-user.type.ts`, plus the Express `Request`
  module augmentation making `request.user` type-check everywhere) to
  `request.user`, rebuilt from the decoded token rather than the raw
  decoded object passed through — the same "never leak `iat`/`exp` into
  the clean shape" discipline `reissueAuthTokenPayload()` already
  established. `CurrentUser`
  (`apps/api/src/common/decorators/current-user.decorator.ts`) reads it
  back out; its raw extraction logic (`extractCurrentUser()`) is exported
  separately from the `createParamDecorator()`-wrapped version, since
  Nest's param-decorator factories aren't callable directly the way a
  plain function is — `@CurrentUser()` itself is proven through a real
  controller and a live HTTP round trip instead. Applied per-route via
  `@UseGuards()`, not globally (`APP_GUARD`) — `POST /auth/{login,
  refresh,logout}` stay unauthenticated by simply not having the
  decorator, no `@Public()` exemption mechanism needed since nothing
  requires one yet. **`GET /example/ping` is the one route protected**
  (Milestone 2's own explicit ask, not scope creep) — the first
  deliberate change to that previously-always-byte-for-byte-unchanged
  reference endpoint across every phase through Phase 1.2D.10;
  `PingResponseDto` gained an `authenticatedAs` field (demonstrative
  only, not a permanent product field) specifically so the full guard →
  decorator → controller chain is verifiable via a live HTTP response,
  not only via the guard's/decorator's own isolated unit tests. **A real,
  non-obvious NestJS testing behavior was discovered and documented, not
  just worked around:** referencing `JwtAuthGuard` via `@UseGuards()`
  metadata pulls it into a `Test.createTestingModule()`'s DI graph even
  when a test never exercises the guard directly — Nest eagerly
  instantiates every injectable a compiled `TestingModule` can reach —
  so `example-domain.controller.spec.ts` needed a `TokenService` mock
  provider purely for `.compile()` to succeed; noted in
  `common/guards/README.md` as a testing note future protected
  controllers' own specs will need too. Proactively fixed cross-cutting
  documentation drift this arc's last three reviews kept finding
  reactively: `jwt/README.md`/`token.service.ts`'s own comments (claimed
  `verifyAccessToken()` had no caller — false the moment `JwtAuthGuard`
  existed), `modules/auth/README.md` (its "no guards" claim needed
  precision — true for `AuthController`'s own routes, no longer true
  codebase-wide), `modules/example-domain/README.md` and
  `docs/architecture/domain-module-guide.md` §15 (both described `ping()`
  as permanently unauthenticated) — all fixed during implementation this
  time, not left for the review pass to catch. Full validation:
  lint/typecheck/build/test all clean (188 tests passing across 24
  suites, up from 174/22 — 14 new). Live boot confirmed clean
  `AuthModule`/`ExampleDomainModule dependencies initialized` with zero
  DI errors — `JwtAuthGuard` resolved automatically through Nest's own
  DI container with no explicit provider registration anywhere, exactly
  as designed. Live `curl` against the real running server confirmed: a
  valid access token reaches the protected endpoint and the response
  genuinely reflects the authenticated identity
  (`{"authenticatedAs":"admin@antrique.dev","status":"ok"}`); a missing
  token, an invalid/malformed token, a refresh token presented as an
  access token, and a wrong auth scheme (`Basic` instead of `Bearer`)
  all `401`; `login`/`refresh`/`logout` all confirmed unchanged and
  still fully unauthenticated. Confirmed via `find -newer` that
  `auth.service.ts`/`auth.controller.ts`/`AuthRepository` are
  byte-for-byte untouched by this milestone. Expired-token rejection is
  unit-tested (a `-1`-TTL `TokenService`, the same precedent
  `token.service.spec.ts`/`auth.service.spec.ts` already established for
  this exact case) rather than live-waited-for, since the real access
  token TTL is 900 seconds.
- Sprint 1 → Auth integration, Milestone 1 implementation (Real
  Authentication): `POST /auth/login` performs genuine database-backed
  authentication for the first time in this arc. Two architectural
  conflicts were surfaced during investigation, before any code was
  written, and resolved with the user via explicit questions rather than
  guessed: (1) `schema.prisma`'s `User` model had no password field at
  all — its own comment and `docs/architecture/security.md`'s "Auth"
  line both said credential exchange lives entirely with a managed
  IdP — resolved by adding a nullable `passwordHash` column and making
  `idpSubject` nullable too (both credential paths now coexist), a new
  hand-written migration (`20260720095236_add_password_hash_to_users`),
  and updating `security.md`'s "Auth" line to document both paths. Prisma's
  own auto-diff (`prisma migrate diff`) also proposed re-adding a plain,
  non-partial unique index on `(tenant_id, email)` that would have
  collided with the existing case-insensitive partial index from the
  `partial_unique_indexes` migration — exactly the documented landmine
  that migration's own header comment warns every future migration
  touching `users` to check for; caught by inspection before applying,
  not by trial and error. (2) The brief excluded "Multi-tenancy" but
  CLAUDE.md's non-negotiable "tenant scope on EVERY query" rule still
  applies to any `User` query — resolved via a new, required
  `DEFAULT_TENANT_ID` env var and a `defaultTenant` config namespace
  (graduated the same way `jwt`/`hash` were, outside the frozen
  `config.module.ts`), an explicit stopgap until real multi-tenant
  resolution (subdomain/header parsing) exists, not a workaround for
  skipping the rule. `AuthRepository.findActiveByEmail()` (new) is
  tenant-scoped, case-insensitive (matching the database's own
  `LOWER(email)` uniqueness constraint — a user could otherwise be
  locked out by typing their own email in different case than however
  it was stored), and excludes soft-deleted rows. `AuthService.login()`
  now: looks up the user → `401` if none or no `passwordHash` set (an
  IdP-only account) → `PasswordService.compare()` (finally called, no
  longer "registered but unwired" since Phase 1.2D.7) → `401` on
  mismatch → real tokens signed from the verified `user.email` (not the
  raw, possibly differently-cased request input — `buildAuthTokenPayload()`
  changed from taking `LoginRequestDto` to a plain `email: string` for
  exactly this reason). Both failure paths throw the identical
  `UnauthorizedException`, so the response never reveals which was
  wrong; documented, not fixed, one known gap: response *timing* alone
  could theoretically distinguish the two failure paths for a precise
  enough attacker, since the early-return path is faster than a real
  `compare()` call — a real but lower-severity concern than a
  differently-*shaped* response, deliberately not closed with a
  speculative constant-time decoy this milestone didn't ask for.
  `prisma/seed.ts`'s seeded `admin@antrique.dev` user now gets a real
  Argon2id `passwordHash` (dev-only password, hashed directly via
  `@node-rs/argon2` since the seed script has no NestJS DI to inject
  `PasswordService` with), always re-set on every seed run so the
  dev credential reliably works after reseeding. `refresh()`/`logout()`
  are unchanged. Full validation: lint/typecheck/build/test all clean
  (174 tests passing across 22 suites, up from 164/22 — 10 new). Live
  boot confirmed clean `AuthModule dependencies initialized` with zero
  DI errors; live `curl` against the real seeded admin account confirmed
  a valid login succeeds with real, decodable tokens (payload correctly
  shows the canonical `admin@antrique.dev`, not whatever case was typed
  — tested with `ADMIN@ANTRIQUE.DEV`), an unknown email `401`s, and the
  correct email with a wrong password `401`s; `refresh`/`logout`/
  `GET /api/v1/example/ping` all confirmed unchanged; confirmed via
  `find -newer` that `example-domain/` and the JWT module's core files
  have no changes from this milestone. Directly verified at the database
  level (not just through the app) that the migration applied correctly
  and the existing case-insensitive partial index on `users` was left
  intact.
- Sprint 1 → Auth integration, Phase 1.2D.10 review (production-grade
  review of the stateless rotation layer, not new functionality): no
  issues found — the only review in this arc so far with a genuinely
  clean outcome (not manufactured; every checklist item independently
  re-verified). Re-argued the "document, don't add jti" decision from
  scratch rather than re-affirming it, weighing the strongest
  counter-argument seriously (a future revocation mechanism naively
  keyed on token identity could be confused by same-second collisions)
  and concluding the current design still wins: no revocation exists
  yet to be confused, adding `jti` now would violate the phase's own
  explicit prohibition and the minimal-payload property multiple tests
  enforce, and the risk is already pre-empted by documentation pointing
  a future implementer at exactly what they'd need to add. Independently
  re-verified, not re-trusted, both load-bearing claims with a fresh
  script against the real (built) `TokenService`: same-instant signs are
  byte-identical, signs genuinely differ once ≥1.1s elapses, and
  signing a decoded payload directly throws `Bad "options.expiresIn"
  option the payload already has an "exp" property` exactly as claimed.
  Confirmed clean, no fix needed: every successful refresh performs a
  real new signing operation, the flow is fully stateless (reuse of an
  already-used refresh token still succeeds, re-verified live), the
  payload stays exactly `{ email }`, no `jti`/nonce/random field
  anywhere (grepped — only comments discussing why not), no direct
  `JwtService` usage outside `jwt/` (the one match outside it is test
  setup, the same established precedent), no circular dependencies
  (import trace: neither `jwt/` nor `password/` imports from
  `modules/auth/`), `auth/README.md`/`backend.md`/`progress.md`/
  `decisions.md` all accurate, and — checked specifically, since two
  prior reviews in this arc found exactly this class of gap —
  `jwt/README.md`/`password/README.md` still accurate too (Phase
  1.2D.10 changed no caller relationship either file describes, so
  there was nothing for them to drift out of sync with).
  `lint`/`typecheck`/`build`/`test` clean (164 tests, unchanged — a
  code-change-free review); live boot re-confirmed
  `AuthModule dependencies initialized` with zero DI errors; a fresh
  live probe (independent of the implementation phase's own) confirmed
  a real refresh produces a new access token, and reusing an
  already-used refresh token still succeeds with `200`;
  `login`/`logout`/`GET /api/v1/example/ping` all unchanged.
- Sprint 1 → Auth integration, Phase 1.2D.10 implementation (Stateless
  Refresh Token Rotation): formalized `refresh()`'s existing behavior as
  rotation — zero production-code logic changes, since Phase 1.2D.9's
  `refresh()` already always signed a genuinely fresh access + refresh
  pair on every successful call. Confirmed and hardened with new tests
  in `auth.service.spec.ts`: a spy on `TokenService.signAccessToken()`/
  `signRefreshToken()` proving each is called exactly once per
  `refresh()` call with the rebuilt payload (not reused from the
  submitted token); a statelessness test proving the same refresh token
  can be submitted more than once, each time succeeding with a fresh
  pair (no reuse detection exists — a real, accepted gap, not an
  oversight); a multi-hop chain test proving a newly issued refresh
  token is itself usable to refresh again; and a real-wall-clock-delay
  test (≥1.1s, following `performance-logger.service.spec.ts`'s own
  precedent for real-timing assertions) proving genuinely distinct
  tokens once the second boundary crosses — documenting, not "fixing,"
  the same-second-determinism property Phase 1.2D.9's review already
  found, per this phase's explicit instruction not to add `jti`/nonce/
  timestamp/random fields. Confirmed live over real HTTP: a 3-hop
  rotation chain (login → refresh → refresh, ≥1s apart) produced three
  genuinely distinct token pairs; reusing the very first hop's refresh
  token after it had already been used to advance the chain still
  succeeded with a fresh pair, confirming statelessness end-to-end, not
  just at the unit level. `mappers/auth-token-payload.mapper.ts` needed
  no changes — `reissueAuthTokenPayload()` already returned exactly the
  minimal shape rotation requires. Updated `auth.service.ts`'s and
  `auth/README.md`'s comments to name this behavior "stateless rotation"
  explicitly. `login()`/`logout()` unchanged; `AuthRepository`/
  `PasswordService` remain unwired for the same unresolved persistence
  blocker. Full validation: lint/typecheck/build/test all clean (164
  tests passing across 22 suites, up from 160/22 — 4 new, all in
  `auth.service.spec.ts`'s `refresh()` describe block), live boot
  confirmed clean `AuthModule dependencies initialized` with zero DI
  errors; confirmed via `find -newer` that `example-domain/` has no
  files touched by this phase.
- Sprint 1 → Auth integration, Phase 1.2D.9 review (production-grade
  review of the refresh-token verification layer, not new
  functionality): no code defects found. Re-verified live, not assumed,
  that reusing the decoded refresh-token payload directly (rather than
  rebuilding it via `reissueAuthTokenPayload()`) genuinely does throw —
  wrote a throwaway script against the real `@nestjs/jwt` `JwtService`
  confirming `Bad "options.expiresIn" option the payload already has an
  "exp" property` fires exactly as the implementation phase's own
  comment claimed, independent confirmation rather than trusting the
  prior reasoning. **Found one genuine, non-security runtime property
  worth documenting, not fixing:** two token issuances for the same
  email within the same wall-clock second (e.g. a login immediately
  followed by a refresh) produce byte-identical tokens — HS256 signing
  is deterministic and `iat`/`exp` carry only second precision.
  Confirmed live (identical bytes within the same second; genuinely
  different tokens once ≥1s elapsed). Harmless today — no
  revocation/rotation exists yet to be confused by it — but documented
  in `auth.service.ts`'s `refresh()` comment and `auth/README.md` as a
  known property a future revocation/rotation phase will need a `jti`
  claim to address, deliberately not added now since it would grow the
  payload past the required minimal `{ email }`. Confirmed clean, no fix
  needed: refresh-token verification uses `TokenService` exclusively (no
  direct `JwtService` usage outside test setup, the same precedent
  `token.service.spec.ts` already established), access-token-as-refresh
  correctly falls through the same signature-check path with no special
  case, uniform undifferentiated `401` for every failure mode, no
  circular dependencies (import trace: neither `jwt/` nor `password/`
  imports from `modules/auth/`), no persistence introduced, `login()`/
  `logout()` byte-for-byte unchanged. `lint`/`typecheck`/`build`/`test`
  clean (160 tests, unchanged from the implementation phase — the one
  code change this review made was a comment). Live boot re-confirmed
  `AuthModule dependencies initialized` with zero DI errors; a fresh
  adversarial probe (independent of the implementation phase's own)
  confirmed valid refresh → 200 with fresh tokens, access-token-as-
  refresh → 401, a non-JWT garbage string → 401, a signature-tampered
  real token → 401, and a payload-tampered real token → 401; empty
  refresh token still `400`s via existing DTO validation;
  `login`/`logout`/`GET /api/v1/example/ping` all unchanged.
- Sprint 1 → Auth integration, Phase 1.2D.9 implementation (Refresh
  Token Verification): `AuthService.refresh()` now verifies
  `RefreshRequestDto.refreshToken` via `TokenService.verifyRefreshToken()`
  and, on success, reissues a completely fresh access + refresh pair —
  rebuilding a clean `{ email }` payload via the mapper's new
  `reissueAuthTokenPayload()` (the decoded token carries `iat`/`exp` at
  runtime that would make `jsonwebtoken` throw if re-signed unstripped).
  Any verification failure — invalid signature, expired, malformed, or
  an access token submitted as a refresh token (rejected by the same
  signature check, no separate branch needed) — is caught in one
  blanket `catch` and rethrown as `UnauthorizedException`, deliberately
  not distinguished in the response. `RefreshResponseDto` now extends
  `TokenResponseDto` (previously `{ status: 'not_implemented' }`).
  `login()`/`logout()` are unchanged; `AuthRepository`/`PasswordService`
  remain unwired for the same unresolved persistence blocker. Confirmed
  live over real HTTP, not just unit tests: a valid refresh token
  succeeds with fresh tokens; an access token submitted as a refresh
  token, a garbage string, and a single-character-tampered real refresh
  token all `401`; an empty refresh token still `400`s via the existing
  `RefreshRequestDto` validation (unchanged). Full validation:
  lint/typecheck/build/test all clean (160 tests passing across 22
  suites, up from 151/22 — 9 new: 2 in `auth-token-payload.mapper.spec.ts`
  for `reissueAuthTokenPayload()`, 6 added to `auth.service.spec.ts`'s
  new `refresh()` describe block, 1 added to `auth.controller.spec.ts`
  for the 401-propagation path), live boot confirmed clean
  `AuthModule dependencies initialized` with zero DI errors; confirmed
  via `find -newer` that `example-domain/` has no files touched by this
  phase.

- Sprint 1 → Auth integration, Phase 1.2D.8 review (production-grade
  review of the authentication token issuance layer, not new
  functionality): found and fixed cross-cutting documentation drift no
  single phase's own review would have caught. `jwt/token.service.ts`'s
  header comment and `jwt/README.md` still said "not called anywhere in
  apps/api/src/modules/auth/ yet" / "AuthController/AuthService...
  unchanged from Phase 1.2D.5" — both false since Phase 1.2D.8 wired
  `login()` into `signAccessToken()`/`signRefreshToken()`; corrected both
  to describe sign as having a real caller while verify still doesn't.
  `password/README.md` had the identical drift (claimed `AuthService`
  "unchanged... still `{ status: 'not_implemented' }`") plus one more
  subtle inaccuracy: its own "independence" claim — "`PasswordService`
  has no dependency on `AuthService`... and nothing in `auth/`/`jwt/`
  depends on it either" — became false the moment `AuthService`
  constructor-injected `PasswordService` this phase; corrected to state
  the dependency now runs one direction only (`AuthService` → 
  `PasswordService`, never the reverse), not "no dependency at all."
  Re-argued the Phase 1.2D.8 design decision (inject `PasswordService`
  without calling it) from scratch rather than re-affirming it by
  default: confirmed this is honest temporary architecture, not fake
  verification — the alternatives (a self-verifying round trip that
  always succeeds, or a hardcoded demo credential) would both be worse.
  Confirmed clean, no fix needed: `auth/README.md`/`backend.md`
  (accurate and self-consistent), login flow, JWT payload minimality,
  DTO/mapper design, DI (`PasswordService`/`TokenService` both singleton,
  no circular dependencies — confirmed by import trace: neither `jwt/`
  nor `password/` imports anything from `modules/auth/`), no hardcoded
  credentials anywhere (grepped), no direct `JwtService` usage outside
  `jwt/` (the one match in `auth.service.spec.ts` constructs a real
  `TokenService` for testing, the same pattern `token.service.spec.ts`
  already established — not a violation), `refresh()`/`logout()` still
  byte-for-byte placeholders. `lint`/`typecheck`/`build`/`test` clean
  (151 tests, unchanged from the implementation phase — a pure
  documentation-only review); live boot re-confirmed
  `AuthModule dependencies initialized` with zero DI errors; a fresh live
  probe (independent of the implementation phase's own) confirmed the
  access token signed for one login is rejected with "invalid signature"
  when verified as a refresh token and vice versa, invalid login input
  still `400`s, and `refresh`/`logout`/`GET /api/v1/example/ping` are
  all unchanged.
- Sprint 1 → Auth integration, Phase 1.2D.8 implementation (Authentication
  Token Issuance): `AuthService.login()` builds a minimal JWT payload
  (`{ email }` only, never the password —
  `mappers/auth-token-payload.mapper.ts` → `types/auth-token-payload.type.ts`,
  new real content graduating both folders from placeholder, their old
  `README.md`s deleted matching `repositories/`'s precedent) and signs it
  twice via `TokenService` (Phase 1.2D.6), once per token type — genuinely
  real: confirmed live over HTTP that the returned tokens decode to
  exactly `{ email, iat, exp }` (no `sub`/`tenantId`/extra claims) and
  that an access token fails refresh verification and vice versa
  (different secrets). New `dto/token-response.dto.ts` — shared
  `TokenResponseDto` (`accessToken`/`refreshToken`), `LoginResponseDto`
  now extends it instead of the old `{ status: 'not_implemented' }`
  placeholder. **A genuine design ambiguity was resolved with the user
  before writing any code, not guessed:** with persistence explicitly
  out of scope, there's no persisted password hash for a real user to
  compare against, so `PasswordService.compare()` has nothing meaningful
  to verify. Presented three options — (a) constructor-inject
  `PasswordService` but leave it uncalled, mirroring `AuthRepository`'s
  already-approved "registered but unwired" treatment; (b) a
  self-consistent `hash()`-then-`compare()`-against-itself round trip
  that always succeeds by construction; (c) a fixed hardcoded demo
  password gating login, a real accept/reject path but a bypass
  credential embedded in source — user chose (a). `refresh()`/`logout()`
  are untouched placeholders; `AuthRepository` stays registered and
  unwired for the identical reason it already was. Full validation:
  lint/typecheck/build/test all clean (151 tests passing across 22
  suites, up from 145/21 — 6 new: 2 in `auth-token-payload.mapper.spec.ts`,
  4 added to `auth.service.spec.ts`), live boot confirmed clean
  `AuthModule dependencies initialized` with zero DI errors; live `curl`
  against all four routes confirmed: `login` returns real tokens (decoded
  and verified), `refresh`/`logout` unchanged
  `200 {"status":"not_implemented"}`, `GET /api/v1/example/ping`
  unchanged — zero regressions. Confirmed via `find -newer` that
  `example-domain/`, `jwt/`, and `password/` have no files touched by
  this phase.

- Sprint 1 → Auth integration, Phase 1.2D.7 implementation (Password
  Hashing Infrastructure): `PasswordService`/`PasswordModule`
  (`apps/api/src/password/`) wrap `@node-rs/argon2` with `hash(plaintext)`/
  `compare(plaintext, hashed)`, both genuinely functional and tested —
  random salt per call, argon2id-encoded output, config-driven
  memoryCost/timeCost/parallelism (via the new `hash` namespace,
  graduated outside the frozen `config.module.ts` the same way
  `jwt.config.ts` did), and the variant itself hardcoded to argon2id (not
  config-driven), mirroring the JWT signing algorithm's fixed-HS256
  treatment. `PasswordModule` is `@Global()` and imported into
  `AppModule`; confirmed via a live DI-graph resolution (not just the
  unit test) that the real config values (19456/2/1 from `.env`) are
  actually applied. Switched from the `argon2` npm package to
  `@node-rs/argon2` after a live, evidenced install failure (node-gyp
  needs a C++ toolchain this machine doesn't have) — see decisions.md.
  Zero changes to `AuthService`/`AuthController`/`AuthRepository`/
  `TokenService`/`TokenModule` — independence confirmed by diff, not
  assumed. Full validation: lint/typecheck/build/test all clean (145
  tests passing across 21 suites, including 6 new in
  `password.service.spec.ts` and 4 new in `env.validation.spec.ts`), live
  boot confirmed clean `PasswordModule dependencies initialized` with
  zero DI errors and zero regressions to any other module's boot line.
- Sprint 1 → Auth integration, Phase 1.2D.7 implementation (Password
  Hashing Infrastructure): `PasswordService`/`PasswordModule`
  (`apps/api/src/password/`) wrap `@node-rs/argon2` with `hash(plaintext)`/
  `compare(plaintext, hashed)`, both genuinely functional and tested —
  random salt per call, argon2id-encoded output, config-driven
  memoryCost/timeCost/parallelism (via the new `hash` namespace,
  graduated outside the frozen `config.module.ts` the same way
  `jwt.config.ts` did), and the variant itself hardcoded to argon2id (not
  config-driven), mirroring the JWT signing algorithm's fixed-HS256
  treatment. `PasswordModule` is `@Global()` and imported into
  `AppModule`; confirmed via a live DI-graph resolution (not just the
  unit test) that the real config values (19456/2/1 from `.env`) are
  actually applied. Switched from the `argon2` npm package to
  `@node-rs/argon2` after a live, evidenced install failure (node-gyp
  needs a C++ toolchain this machine doesn't have) — see decisions.md.
  Zero changes to `AuthService`/`AuthController`/`AuthRepository`/
  `TokenService`/`TokenModule` — independence confirmed by diff, not
  assumed. Full validation: lint/typecheck/build/test all clean (145
  tests passing across 21 suites, including 6 new in
  `password.service.spec.ts` and 4 new in `env.validation.spec.ts`), live
  boot confirmed clean `PasswordModule dependencies initialized` with
  zero DI errors and zero regressions to any other module's boot line.

- Sprint 1 → Auth integration, Phase 1.2D.6 review (production-grade
  architecture review of the JWT foundation, not new functionality):
  no defects found. Directly resolved the scope-ambiguity this phase's
  own report flagged ("was implementing working sign/verify acceptable
  architectural preparation or scope creep?") — concluded **acceptable
  preparation, not scope creep**: the brief's own positive requirements
  ("JwtService wrapper," named "Access token configuration"/"Refresh
  token configuration" as separate deliverables, "reusable
  infrastructure") are hard to satisfy meaningfully with an inert stub,
  and the actual security boundary that matters — is this reachable by a
  real HTTP request — holds regardless (`AuthController`/`AuthService`
  confirmed still byte-for-byte unchanged). Considered and rejected one
  counter-argument (a future phase might carelessly wire this in without
  also verifying credentials) as a process risk for a *later* phase to
  get right, not a defect in what *this* phase built. **Live-tested a
  security property the implementation phase hadn't**: crafted a
  hand-made `alg: none` token (the classic JWT algorithm-confusion
  forgery) and confirmed `@nestjs/jwt`'s `verify()` correctly rejects it;
  also confirmed signing defaults to `HS256`, not an attacker-selectable
  algorithm. Added both as permanent regression tests
  (`token.service.spec.ts`, 6 → 8 tests) and documented in
  `jwt/README.md`. Re-verified clean: no `process.env` usage, no
  hardcoded secrets, no `Scope.REQUEST`, no circular dependencies,
  `AuthController`/`AuthService` unchanged. `lint`/`typecheck`/`build`/
  `test` clean at both `@antrique/api` (20 suites / 135 tests, up from
  133) and workspace level; live boot re-confirmed `TokenModule
  dependencies initialized` (distinct from `@nestjs/jwt`'s own
  `JwtModule` line) with zero DI errors; live smoke test confirmed
  `POST /auth/login` and `GET /api/v1/example/ping` both unchanged —
  zero regressions.
- Sprint 1 → Auth integration, Phase 1.2D.6 (JWT infrastructure
  foundation only — no token generation/verification wired into any
  controller or service, no refresh logic, no guards, no Passport, no
  RBAC, no sessions, no OAuth, no MFA, no registration, no password
  hashing, no user authentication, explicitly not started per this
  phase's own brief): `apps/api/src/jwt/config/jwt.config.ts` — the
  `jwt` namespace (`accessSecret`/`accessTokenTtl`/`refreshSecret`/
  `refreshTokenTtl`), registered via `ConfigModule.forFeature()` inside
  `token.module.ts`, not the frozen `config.module.ts` — the same
  graduation path `logging/config/logger-options.config.ts` already
  established. Added `JWT_ACCESS_SECRET`/`JWT_ACCESS_TOKEN_TTL`/
  `JWT_REFRESH_SECRET`/`JWT_REFRESH_TOKEN_TTL` to `env.validation.ts`
  (secrets required, minimum 32 characters — a genuine security
  constraint, not speculative; TTLs optional with the defaults
  `.env.example` already scaffolded) and to `.env.example`/`.env`
  (secrets generated via `crypto.randomBytes`, not literal
  placeholders, since these are now enforced). `apps/api/src/jwt/
  token.module.ts` — `TokenModule`, `@Global()` (matching `ConfigModule`/
  `LoggingModule`/`DatabaseModule`), configures `@nestjs/jwt`'s own
  `JwtModule` via `registerAsync()`. `token.service.ts` — `TokenService`,
  constructor-injects `@nestjs/jwt`'s `JwtService` and the validated
  `jwt` config; four genuinely functional methods
  (`signAccessToken`/`signRefreshToken`/`verifyAccessToken`/
  `verifyRefreshToken`), access and refresh tokens using different
  secrets so one can never be verified as the other — confirmed live in
  6 new tests, not just asserted, including an expired-token rejection
  test. **Found and fixed one naming issue during implementation, before
  it reached review:** the module was originally also named `JwtModule`,
  colliding with `@nestjs/jwt`'s own class of the same name — confirmed
  live via two identical "JwtModule dependencies initialized" boot log
  lines — renamed to `TokenModule` (mirroring `TokenService`'s own
  already-avoided collision with `@nestjs/jwt`'s `JwtService`), file
  renamed `jwt.module.ts` → `token.module.ts`, all doc references
  updated, re-verified live that the log now shows one `JwtModule` line
  (the real library module) and one `TokenModule` line (this one).
  Added `@nestjs/jwt` as a new `apps/api` dependency. Neither
  `AuthController` nor `AuthService` were touched — both remain exactly
  as Phase 1.2D.5 left them. `docs/architecture/{backend.md,
  configuration.md, validation.md}` and `apps/api/src/config/auth/README.md`
  updated (the `jwt` namespace is distinct from the still-placeholder
  `auth` config domain, which stays reserved for managed IdP settings).
  `lint`/`typecheck`/`build`/`test` clean at both `@antrique/api` (20
  suites / 133 tests, up from 19/121) and workspace level; live boot
  confirmed `TokenModule dependencies initialized` with zero DI errors,
  and a live smoke test confirmed `POST /auth/login` and
  `GET /api/v1/example/ping` both unchanged — zero regressions.
- Sprint 1 → Auth integration, Phase 1.2D.5 (authentication validation
  layer only — no JWT, password hashing, token generation, guards,
  Passport, RBAC, sessions, OAuth, MFA, registration, password reset,
  email verification, or user profile, explicitly not started per this
  phase's own brief): wired the global `ValidationPipe` every DTO in
  this codebase has been written against since Phase 1.2D.4, finally
  making `main.ts`'s multi-phase-old "comment, not a call" real.
  `apps/api/src/common/pipes/validation-pipe.options.ts` —
  `VALIDATION_PIPE_OPTIONS` (`whitelist: true` — unknown fields silently
  stripped, not rejected; `transform: true` — controllers receive a real
  DTO instance), registered via `app.useGlobalPipes(new
  ValidationPipe(VALIDATION_PIPE_OPTIONS))` in `main.ts`, right after
  prefix/versioning setup. Zero controller/service changes — no
  per-route `@UsePipes()` anywhere, matching this phase's own explicit
  verification criterion. `ExceptionLoggingFilter` (Phase 1.2C.6) needed
  zero changes either: it already logs and preserves Nest's default
  response shape for any `HttpException`, and `ValidationPipe`'s
  `BadRequestException` is exactly that — confirmed live, not assumed.
  4 new tests (`validation-pipe.options.spec.ts`) — 2 asserting the
  options themselves, 2 exercising the pipe's own `.transform()` method
  directly (rejecting invalid input, returning a real DTO instance for
  valid input) without needing a live HTTP server. Updated every DTO/doc
  that previously said "correct but not yet HTTP-enforced"
  (`login-request.dto.ts`, `refresh-request.dto.ts`,
  `login-request.dto.spec.ts`, `auth/README.md`) plus `backend.md`
  (§1's `common/pipes/` entry, §2's startup-flow step list, the
  "Deferred" list) and `validation.md` (resolved its own open question
  about whether DTO validation would reuse Zod — it uses
  `class-validator` instead, the idiomatic NestJS/`ValidationPipe`
  pairing). `lint`/`typecheck`/`build`/`test` clean at both
  `@antrique/api` (19 suites / 121 tests, up from 18/117) and workspace
  level. Live boot clean; live `curl` against all three auth endpoints
  confirmed: invalid input (bad email, empty password, empty
  refreshToken) → real `400` with per-field messages; valid input →
  unchanged `200 {"status":"not_implemented"}`; valid input plus unknown
  extra fields (`isAdmin`, `extraField`) → still `200`, silently
  stripped, not rejected; `GET /api/v1/example/ping` unaffected. Server
  logs confirmed `ExceptionLoggingFilter` correctly logged each `400` as
  a `BadRequestException`, proving the integration end to end with zero
  new wiring in that filter.
- Sprint 1 → Auth integration, Phase 1.2D.4 review (production-grade
  architecture review of the auth foundation, not new functionality):
  found and fixed one genuine, serious issue. `AuthService.login()`
  called `AuthRepository.findMany({ where: { email: dto.email } })`
  with no `tenantId` in the filter — an unscoped query against the
  multi-tenant `User` table, violating CLAUDE.md's non-negotiable
  "tenant scope on EVERY query; RLS is the backstop, not the only gate"
  rule. Confirmed there is genuinely no way to fix this correctly yet:
  grepped the whole backend for `tenantId` and found it exists only as
  a documented, explicitly-unpopulated reserved field on `LogContext`
  ("tenantId/userId still need auth, later still") — no tenant-
  resolution mechanism (subdomain, header, JWT claim) exists anywhere.
  Removed the call entirely rather than attempting to scope it
  incorrectly; `AuthRepository` stays registered in `AuthModule` as a
  proven-resolvable DI dependency (live boot), the same "registered but
  unwired" pattern `example-domain/repositories/example.repository.ts`
  already established for an identical underlying reason. Updated
  `auth.service.spec.ts`'s login test into a regression guard
  (`expect(repository.findMany).not.toHaveBeenCalled()`), and corrected
  every doc that described the old behavior:
  `apps/api/src/modules/auth/{README.md, auth.service.ts,
  repositories/auth.repository.ts}`'s own comments, and
  `docs/architecture/backend.md`. Confirmed clean, no fix needed:
  controller thinness, DTO organization, DI configuration, no direct
  Prisma usage outside repositories elsewhere in the backend, no
  circular dependencies. `lint`/`typecheck`/`build`/`test` clean at
  both `@antrique/api` (18 suites / 117 tests, unchanged) and workspace
  level; live boot re-confirmed `AuthModule dependencies initialized`
  with zero DI errors, all three routes still mapped and returning
  `200 {"status":"not_implemented"}` with no query-related log noise
  for `login`, and `GET /api/v1/example/ping` unchanged — zero
  regressions.
- Sprint 1 → Auth integration, Phase 1.2D.4 (authentication module
  foundation only — no JWT, tokens, password hashing, guards, Passport,
  RBAC, sessions, email verification, OAuth, MFA, registration, password
  reset, or user profile, explicitly not started per this phase's own
  brief): the first real (non-reference) business module, built exactly
  on `modules/example-domain/`'s template.
  `apps/api/src/modules/auth/auth.module.ts` — `AuthModule`, imported
  into `AppModule` after `ExampleDomainModule`. `auth.controller.ts` —
  `AuthController`: `POST /auth/login`, `/refresh`, `/logout`, each
  `@HttpCode(HttpStatus.OK)` (Nest's `@Post()` default is `201`, wrong
  for routes that create nothing — caught live during this phase's own
  validation, not assumed). `auth.service.ts` — `AuthService`, depends
  only on `AuthRepository` (constructor injection), never `PrismaService`
  directly. `login()` calls `AuthRepository.findMany({ where: { email }
  })` to prove the full `Controller → Service → Repository →
  PrismaService` chain end-to-end against a real table — deliberately
  `findMany` on `email` alone, not `findUnique` on the `(tenantId,
  email)` compound key, which sits behind a PARTIAL unique index (`WHERE
  deleted_at IS NULL`) added via raw SQL in Phase 1.1B that
  `schema.prisma`'s own `@@unique([tenantId, email])` declaration
  doesn't accurately represent (see `schema.prisma`'s `User` model
  comment and `prisma/seed.ts`'s header comment for the landmine, which
  specifically affects `.upsert()`'s `ON CONFLICT` arbiter selection, not
  a plain filter read) — sidesteps the landmine entirely rather than
  risking it with no real credential check to justify that risk yet.
  `refresh()`/`logout()` are pure placeholders — nothing to verify or
  invalidate without tokens/sessions. `repositories/auth.repository.ts`
  — `AuthRepository extends BaseRepository<PrismaService['user']>`,
  zero custom query methods. `dto/` — `LoginRequestDto`
  (`@IsEmail()`/`@IsString() @MinLength(1)`), `RefreshRequestDto`
  (`@IsString() @MinLength(1)`), and one response DTO per action
  (`{ status: 'not_implemented' }` each) — no `LogoutRequestDto`, no
  session/token to reference yet. Added `class-validator`/
  `class-transformer` as new `apps/api` dependencies for this — rules
  are correct but not yet HTTP-enforced (no global `ValidationPipe`
  wired in `main.ts`, unchanged "comment, not a call" since Phase 1.2A,
  a cross-cutting decision bigger than this module); verified directly
  via `class-validator`'s own `validate()` in `dto/*.spec.ts` instead.
  `entities/`, `interfaces/`, `types/`, `exceptions/`, `validators/`,
  `mappers/` are documented placeholders, matching `example-domain/`'s
  precedent exactly (no data, no swap point, no failure case yet since
  every endpoint always returns its placeholder response). 22 new tests
  across `auth.service.spec.ts`, `auth.controller.spec.ts` (DI-resolved
  via `Test.createTestingModule`), `repositories/auth.repository.spec.ts`,
  and `dto/login-request.dto.spec.ts`/`dto/refresh-request.dto.spec.ts`.
  `backend.md` updated (status, folder structure, dependency graph —
  `AuthModule` moved from "anticipated" to real-but-placeholder).
  `lint`/`typecheck`/`build`/`test` clean at both `@antrique/api` (18
  suites / 117 tests, up from 13/102) and workspace level; live boot
  confirmed `AuthModule dependencies initialized` with zero DI errors,
  all three routes mapped, and a real Postgres connection; live `curl`
  against all three endpoints confirmed `200 {"status":"not_implemented"}`
  each, plus a regression check that `GET /api/v1/example/ping` still
  works. This phase's implementation was interrupted mid-way by the host
  environment's C: drive filling to 0 bytes free — see "In progress
  right now" above for how that was handled; every validation step was
  re-run after resuming rather than assumed to have carried over.
- Sprint 1 → Auth integration, Phase 1.2D.3 review (production-grade
  architecture review of the repository foundation, not new
  functionality): no defects found in `BaseRepository`'s design or the
  Service ↔ Repository boundary — re-verified by grep that zero services
  inject `PrismaService` directly, and by import trace that `database/`
  has no circular dependencies. **Live-tested the "Type safety" review
  criterion rather than taking the design's own claim on faith:** wrote
  a throwaway file calling `ExampleRepository.findOne()`/`.create()`
  with fields that don't exist on `Setting` and confirmed `tsc` actually
  rejects them with real, model-specific Prisma error messages (not just
  structural acceptance from the generic `any`-based constraint) —
  turned that verification into a permanent regression test
  (`example.repository.spec.ts`, a compile-time-only `@ts-expect-error`
  check, matching `audit-logger.service.spec.ts`'s existing precedent
  for `AuditEvent`'s immutability). Found and fixed one small, genuine
  documentation drift: `domain-module-guide.md` §15 claimed "four spec
  files" for the example module when there are three (controller,
  service, repository — the `.module.ts` itself has none, like every
  other module in this codebase); corrected, and updated both
  `domain-module-guide.md` §16 and the module's own `README.md` to
  describe the new compile-time test. `lint`/`typecheck`/`build`/`test`
  clean at both `@antrique/api` (13 suites / 102 tests, up from 101) and
  workspace level; live boot re-confirmed `ExampleDomainModule
  dependencies initialized` with zero DI errors and
  `GET /api/v1/example/ping` unchanged at `200 {"status":"ok"}` — zero
  regressions.
- Sprint 1 → Auth integration, Phase 1.2D.3 (repository layer foundation
  only — no domain-specific repositories, no transactions, no query
  builders, no caching, no business logic, explicitly not started per
  this phase's own brief): `apps/api/src/database/base.repository.ts` —
  `BaseRepository<TDelegate>`, generic `findOne`/`findMany`/`create`/
  `update`/`delete` CRUD infrastructure every future repository extends.
  Depends only on the delegate object passed to its constructor, never
  on `PrismaService`/Nest's DI directly — a concrete subclass is what's
  `@Injectable()` and injects `PrismaService`. Uses
  `Parameters<>`/`ReturnType<>` against a maximally-permissive
  `(...args: any[]) => any` constraint (one scoped, justified
  `eslint-disable` block) to recover each real model's actual
  argument/return types from whatever concrete delegate a subclass
  provides — verified against a REAL Prisma delegate type
  (`PrismaService['setting']`), not just a mock. 5 new tests
  (`base.repository.spec.ts`) using a plain mock delegate — no real
  Postgres involved, consistent with this codebase's standing "no live
  external dependency in a unit test" discipline.
  `apps/api/src/modules/example-domain/repositories/example.repository.ts`
  — `ExampleRepository extends BaseRepository<PrismaService['setting']>`,
  registered as a provider in `ExampleDomainModule` (proving DI
  resolution at boot) but deliberately **not** wired into
  `ExampleDomainService` — a ping endpoint has nothing to persist, so
  forcing an unused dependency would be speculative; targets `Setting`
  (the least "business-domain" model in the schema) purely to prove the
  pattern against a real delegate type, not a real settings feature.
  2 new tests using a fake `PrismaService` exposing only `.setting`.
  New "Repository layer" section (`domain-module-guide.md` §16) —
  where repositories live (`modules/<domain>/repositories/`, never in
  `database/` itself), the enforced rule that **services never inject
  `PrismaService` directly** (checked by grep across `apps/api/src`:
  confirmed true), what belongs/never belongs in a repository, and why
  `BaseRepository` stays free of transactions/query
  builders/caching/model-specific helpers until a genuine multi-repository
  need justifies one. `backend.md` and both READMEs
  (`database/README.md`, `modules/example-domain/README.md`) updated to
  match. Fixed one incidental stale comment noticed along the way
  (`config/database/database.config.ts` still said "Phase 1.2B" for a
  consumer that became real in Phase 1.2D.2). `lint`/`typecheck`/`build`/
  `test` clean at both `@antrique/api` (13 suites / 101 tests, up from
  11/94) and workspace level; live boot confirmed
  `ExampleDomainModule dependencies initialized` with zero DI errors
  (proving both `ExampleDomainService` and `ExampleRepository` resolve)
  and `GET /api/v1/example/ping` unchanged at `200 {"status":"ok"}`.
- Sprint 1 → Auth integration, Phase 1.2D.2 review (production-grade
  architecture review of the database foundation, not new
  functionality): found and fixed one genuine, serious bug.
  `PrismaService.onModuleInit()` called only `$connect()`, documented
  everywhere as "fail-fast" — live-tested with a deliberately invalid
  `DATABASE_URL` (bad credentials, unreachable port) and the app logged
  `"Database connection established"` and served requests normally
  anyway. Root cause: `@prisma/adapter-pg` wraps a lazy `pg.Pool` that
  opens no real socket until first use, so `$connect()` alone resolves
  regardless of whether the connection string is valid. Fixed by adding
  a real `await this.$queryRaw\`SELECT 1\`` in `onModuleInit()` — the
  same query pattern `isHealthy()` already used correctly, since that
  method was never affected by this bug. Re-tested with the same bad
  `DATABASE_URL`: now logs `"Database connection failed"` with the real
  Prisma/pg error and exits with code 1 before ever reaching "Nest
  application successfully started." Re-confirmed the happy path,
  `GET /api/v1/example/ping`, and graceful shutdown (`app.close()`, same
  method as the implementation phase) all still work unchanged.
  Corrected `database/README.md` and `backend.md`'s `database/` folder
  entry, which both stated the false "fail-fast via `$connect()`" claim.
  Confirmed clean, no fix needed: singleton behavior (one `PrismaService`
  instance, registered once, in a module imported once), DI configuration
  (constructor injection only, config read via the validated
  `databaseConfig.KEY`, zero direct `process.env` access — confirmed by
  grep), module boundaries (`DatabaseModule` exports `PrismaService`
  only, no repositories/business logic/model-specific helpers), no
  circular dependencies (confirmed by import trace). `lint`/`typecheck`/
  `build`/`test` clean at both `@antrique/api` (11 suites / 94 tests,
  unchanged) and workspace level after the fix — zero regressions.
- Sprint 1 → Auth integration, Phase 1.2D.2 (database module foundation
  only — no repositories, no transactions, no additional services, no
  business logic, no caching, no auth, explicitly not started per this
  phase's own brief): `apps/api/src/database/prisma.service.ts` —
  `PrismaService extends PrismaClient`, the single database access layer
  every future repository will inject. Constructs its `@prisma/adapter-pg`
  driver adapter (Prisma 7's required pattern, matching
  `prisma.config.ts`/`prisma/seed.ts`'s own precedent) from the
  already-validated `database` config namespace (`url`, `ssl`) via
  constructor injection — never `process.env` directly. Connects eagerly
  in `onModuleInit()` (fail-fast, matching `env.validation.ts`'s own
  philosophy) and disconnects in `onModuleDestroy()`, which fires
  automatically on `main.ts`'s existing `app.enableShutdownHooks()`
  (Phase 1.2A, unchanged). `isHealthy()` — a plain `SELECT 1` liveness
  check, no model-specific query — has no current caller yet (`health/`
  is still config-only), matching the established "build the capability
  before its first real consumer" pattern (`RequestContextService`,
  `PerformanceLogger`). `database.module.ts` — `DatabaseModule`,
  `@Global()` (matching `ConfigModule`/`LoggingModule`'s precedent),
  exports `PrismaService` only. Registered in `app.module.ts` ahead of
  `ExampleDomainModule`, matching the ordering already anticipated in a
  prior phase's comment. `docs/architecture/backend.md` updated (status
  line, `database/` folder entry, dependency graph — moved from
  "anticipated, not built" to real; "Deferred to Phase 1.2B" list
  corrected). **Deliberately shipped no `.spec.ts` for `PrismaService`**
  (documented in `database/README.md`): `$connect`/`$queryRaw`/
  `$disconnect` only mean something against a real Postgres connection,
  and no other test in this codebase depends on a live external
  resource — verified instead via live boot, the same way Phase 1's
  database work always was. `lint`/`typecheck`/`build`/`test` clean at
  both `@antrique/api` (11 suites / 94 tests, unchanged) and workspace
  level. Live boot against the real local Postgres confirmed
  `DatabaseModule dependencies initialized` with zero DI errors and
  `"Database connection established"` logged; `GET /api/v1/example/ping`
  still returns `200 {"status":"ok"}` with `DatabaseModule` in the graph
  (no regression). **Graceful shutdown verified against the real
  connection**, worked around a genuine Windows environment limitation:
  `taskkill /PID <pid>` (non-forceful) refuses on a console-less
  background process ("can only be terminated forcefully"), and Node's
  cross-process `process.kill()` on Windows force-kills regardless of
  signal name — neither exercises `OnModuleDestroy` the way a real
  POSIX SIGTERM would on Linux/prod. Instead booted the real `AppModule`
  via a throwaway script and called `app.close()` (the same
  `OnModuleDestroy` lifecycle `app.enableShutdownHooks()`'s real
  SIGTERM/SIGINT handlers trigger internally) — confirmed
  `"Database connection closed"` logged and the process exited cleanly
  with no hang or error.
- Sprint 1 → Auth integration, Phase 1.2D.1 review (production-grade
  architecture review of the module template, not new functionality):
  found and fixed two genuine issues. (1) The new `constants/` file was
  named `example-domain.constants.ts` (plural), inconsistent with
  `logging/constants/log-level-severity.constant.ts`'s existing singular
  precedent and with the guide's own other five suffixes — renamed to
  `example-domain.constant.ts`, corrected
  `docs/architecture/domain-module-guide.md`'s suffix list and §9
  heading. (2) DI wiring itself (whether `ExampleDomainController`
  actually resolves `ExampleDomainService` through Nest's container) had
  no automated test — only the service's own logic was unit-tested, and
  only a manual `curl` (not a CI-repeatable check) had verified the
  controller. Added `example-domain.controller.spec.ts` using
  `Test.createTestingModule` — this backend's first controller-level
  test, establishing the pattern for every future one. Also corrected two
  smaller documentation inaccuracies in the same pass (a wrong file count
  in the guide's §15, an overclaiming "nothing depends on it" in §11).
  Confirmed clean, no fix needed: module independence, no hidden
  coupling, no premature abstractions, controller/service boundary
  discipline (thin controller, service owns behavior only), DTO
  request/response separation, all six placeholder folders' rationale,
  every cross-reference in `domain-module-guide.md`/`backend.md`/the
  module's own README. `lint`/`typecheck`/`build`/`test` clean at both
  `@antrique/api` (11 suites / 94 tests, up from 93) and workspace level;
  live boot re-confirmed `ExampleDomainModule dependencies initialized`
  with zero DI errors after the rename; live `curl` against the rebuilt
  app confirmed `GET /api/v1/example/ping` still returns
  `200 {"status":"ok"}` — zero regressions from the fixes. **The domain
  module template is approved as the canonical architecture for all
  future business modules; the project is approved to proceed to Phase
  1.2D.2.**
- Sprint 1 → Auth integration, Phase 1.2D.1 (core domain module
  foundation only — no business logic, no database access, no auth,
  explicitly not started per this phase's own brief): established
  `apps/api/src/modules/example-domain/` as the reference template every
  real future domain module (Auth, Users, Organizations, ...) will copy.
  Real content: `ExampleDomainModule` (scoped, not `@Global()`, imported
  into `AppModule`), `ExampleDomainController` (`GET /example/ping`,
  `/api/v1/example/ping` once the global prefix/versioning apply),
  `ExampleDomainService` (one placeholder method, constructor-injected,
  no DI token — no swap point exists), `PingResponseDto`
  (`{ status: 'ok' }`, `dto/`), `EXAMPLE_DOMAIN_ROUTE` (`constants/`).
  `entities/`, `interfaces/`, `types/`, `exceptions/`, `validators/`,
  `mappers/` are documented placeholders (each with its own README) —
  genuinely empty, since a ping endpoint has no data, no failure case,
  and no conversion to perform. One test
  (`example-domain.service.spec.ts`) per CLAUDE.md's standing
  "every feature ships with tests" rule. New
  `docs/architecture/domain-module-guide.md` — the full folder-by-folder
  standard (what belongs where, DTO request/response separation, entity/
  interface/mapper/validator placement, exception hierarchy, constants
  organization, DI rules, import/export rules, extension steps for a
  real module) — companion to `backend.md` the same way
  `configuration-guide.md`/`logging-guide.md` companion their subsystems.
  `backend.md` updated (title, status, folder structure, dependency
  graph) to include the new module and doc, avoiding the exact kind of
  drift the Pre-1.2D stabilization pass just finished fixing elsewhere.
  **Deliberately did not create a `CommonModule`:** nothing cross-domain
  exists yet to share (see `domain-module-guide.md` §14) — documented as
  a decision, not left silently undone. `lint`/`typecheck`/`build`/`test`
  clean at both `@antrique/api` and workspace level (93 tests / 10 suites,
  up from 92/9); live boot confirmed
  `ExampleDomainModule dependencies initialized` with zero DI errors and
  the route mapped (`RoutesResolver`/`RouterExplorer` logs); live `curl`
  against the compiled build confirmed `GET /api/v1/example/ping` →
  `200 {"status":"ok"}`, with `HttpLoggingMiddleware`'s completion log
  firing for the new route with zero extra wiring, proving the module
  template integrates cleanly with the existing cross-cutting logging
  infrastructure.
- Sprint 1 → Auth integration, Pre-Phase 1.2D stabilization & architecture
  freeze (2026-07-19; audit/hardening pass across Phases 1.1–1.2C treated
  as one integrated system — explicitly not a feature phase, no Phase
  1.2D work started): full architecture/codebase/documentation/
  dependency/security/performance/testing/DX audit. Confirmed clean, no
  fix needed: whole-backend circular-dependency graph (traced every
  relative import across `config/`, `logging/`, `common/`, and the
  placeholder folders — strictly layered, acyclic); DI/provider scope
  (no `Scope.REQUEST`, no duplicate tokens, no orphaned providers);
  per-domain `config/*/index.ts` barrels and `EnvironmentMode`'s
  currently-zero consumers (both looked like dead scaffolding at first
  read, but both are pre-existing, explicitly documented decisions —
  `configuration.md`'s "every domain is reachable both directly and via
  its own barrel" convention, and Phase 1.2C.1's decision log entry
  grouping `LogLevel`/`LogFormat`/`EnvironmentMode` as one deliberate
  three-type mirror — verified against the docs before concluding neither
  needed touching); stack-trace handling in `ExceptionLoggingFilter`
  (confirmed server-side-log-only, never reaches the HTTP response);
  tsconfig/ESLint/Prettier/Husky/commitlint/lint-staged consistency
  across the monorepo; Prisma schema/migrations/seed (no drift, no dead
  code). **Two genuine issues found and fixed:** (1) zero test coverage
  existed for `apps/api/src/config/env.validation.ts` despite non-trivial
  Zod validation logic and a documented history of real bugs found there
  across Phase 1.2B's own review passes (the `PORT=notanumber` crash, the
  `z.coerce.boolean()` string-coercion trap) — added
  `env.validation.spec.ts` (16 tests: required-field enforcement, PORT
  coercion/range errors with the exact historical regressions, the
  `DATABASE_SSL` boolean-trap avoidance, `CORS_ALLOWED_ORIGINS`
  split/trim/dedupe, URL validation, multi-error aggregation, and the
  module-level cache behavior), bringing the suite to **92 tests / 9
  suites** (was 76/8 as of Phase 1.2C.9); (2)
  `common/middleware/README.md` claimed `HttpLoggingMiddleware` is
  "Registered globally in `app.module.ts`'s `configure()`" — false since
  Phase 1.2C.5 deliberately moved registration to raw `app.use()` in
  `main.ts` after discovering `configure()`'s prefix-scoping bug; `main.ts`
  itself already documented the real mechanism correctly, only this one
  README had drifted — corrected. `lint`/`typecheck`/`build`/`test` clean
  at both the `@antrique/api` and workspace (`turbo run`) level; live boot
  clean (all providers resolve, zero DI errors); live end-to-end smoke
  test against the compiled `dist/` build confirmed
  `HttpLoggingMiddleware`/`ExceptionLoggingFilter` both fire correctly on
  a real request and the client-facing 404 response body stays Nest's
  untouched default shape. `apps/web`'s workspace `build` still fails
  locally with the pre-existing Windows-only Next.js standalone-output
  `EPERM`/symlink issue (see Phase 1 production-readiness audit entry
  below) — unrelated to any Phase 1.1–1.2C backend code, unchanged by
  this pass, out of scope. Full report in the session that ran this audit.
- Sprint 1 → Auth integration, Phase 1.2C.9 (logging module integration &
  developer experience — no new logging capability, per this phase's own
  brief): a whole-subsystem audit pass, not another single-phase review.
  Inspected every consumer outside `apps/api/src/logging/`
  (`common/middleware/`, `common/filters/`, `app.module.ts`, `main.ts`)
  and confirmed all of them import exclusively through the public barrel
  — no direct reach-ins anywhere; confirmed the export surface itself
  (`LoggerService`/`JsonLogFormatter`/`ConsoleLogTransport`/
  `AuditLoggerService` internal, `RequestContextService`/`PerformanceLogger`
  exported, `LOG_FORMATTER`/`LOG_TRANSPORT` internal wiring only,
  `LOGGER`/`AUDIT_LOGGER` exported) was already correct with no changes
  needed. **Found real cross-cutting documentation staleness no
  individual phase's own review would have caught:**
  `docs/architecture/backend.md`'s §3 "Dependency graph" showed only
  `AppModule → ConfigModule` — `LoggingModule` (imported into `AppModule`
  since Phase 1.2C.1) was entirely absent from the diagram, and neither
  `HttpLoggingMiddleware` (`main.ts`'s `app.use()`) nor
  `ExceptionLoggingFilter` (`APP_FILTER`) appeared at all; fixed with an
  accurate current-state diagram that also distinguishes module imports
  from provider/middleware registrations. The doc's "Deferred to Phase
  1.2B" list still claimed "a structured logging framework... but nothing
  consumes it yet" — false, since the framework is real and has two real
  consumers; corrected. The doc's title and opening "Status" line still
  described bare Phase 1.2A state with no acknowledgment of the fully-
  built logging subsystem; both updated. `apps/api/src/logging/index.ts`'s
  own header comment omitted `AuditLoggerService` from its internal-
  classes list (added Phase 1.2C.8, never reflected in the barrel's own
  comment) — fixed. **New `docs/architecture/logging-guide.md`** — usage
  examples (injecting `LOGGER`/`AUDIT_LOGGER`/`PerformanceLogger` into a
  provider, worked snippets for each), a best-practice guidelines table,
  and extension pointers — split out from the architecture-focused
  `logging/README.md` the same way `configuration-guide.md` was split from
  `configuration.md` in Phase 1.2B.4 (explicit precedent: "usage
  examples... are a different kind of content... from architecture/
  rationale focus"), not a new pattern invented for this phase.
  Cross-linked from both `logging/README.md` and `backend.md`'s
  `logging/` folder entry. `lint`/`typecheck`/`build`/`test` (76 passing —
  identical count to Phase 1.2C.8, confirming zero behavior change) all
  clean; live boot unchanged.
- Sprint 1 → Auth integration, Phase 1.2C.8 (audit logging foundation
  only — no auth/authorization integration, no user lookup/JWT parsing,
  no current-user resolution, no database persistence/audit tables/
  querying/dashboards, no sensitive-data masking, no external SIEM/
  OpenTelemetry, no business-module integration, no automatic audit
  generation): `apps/api/src/logging/audit-logger.service.ts` —
  `AuditLoggerService implements AuditLogger`, finally bound to the
  `AUDIT_LOGGER` token every prior 1.2C phase has documented as
  "unbound... until Phase 1.2C.8." Internal — never exported from the
  public barrel, unlike `RequestContextService`/`PerformanceLogger`:
  `AUDIT_LOGGER` is a genuine swap-point token (same category as
  `LOGGER`/`LOG_FORMATTER`/`LOG_TRANSPORT`), so consumers inject the token
  and depend on the `AuditLogger` interface, never this concrete class.
  Injects only `LOGGER` — never `RequestContextService` — relying purely
  on `LoggerService`'s existing automatic context merge, identical
  reasoning to `ExceptionLoggingFilter`/`PerformanceLogger`.
  **`AuditEvent` was redesigned, not patched onto Phase 1.2C.1's original
  guess:** that type (`actorUserId?`, `resourceType`, `before?`/`after?`,
  `ipAddress?`/`userAgent?`) was an architecture-only attempt at mirroring
  the `AuditLog` Prisma model's columns, written before this phase's real
  requirements existed — and this phase explicitly excludes database
  persistence, so targeting a DB model's shape no longer made sense. New
  shape: `event`, `action`, `resource`, `resourceId?`, `actorType?`,
  `actorId?`, `outcome: 'SUCCESS' | 'FAILURE'` (new `types/audit-outcome.type.ts`),
  `metadata?` — all `readonly` ("immutable audit event objects").
  `ipAddress?`/`userAgent?` dropped entirely (duplicates what
  `RequestContext`'s auto-merge already supplies); `before?`/`after?`
  dropped (business-logic diffing, out of scope); `actorUserId?` replaced
  by the more generic `actorType?`/`actorId?` (an actor might be a user, a
  service account, or the system itself — no user-entity assumption).
  `AuditLogger.record()` renamed to `log()` — the brief's own explicit
  naming ask, superseding Phase 1.2C.1's placeholder guess from an
  architecture-only phase with no real consumer to validate it against.
  No `logAsync()` — every `Logger` method is synchronous, this phase
  excludes persistence, so there's no actual async work to justify a
  second method with no behavioral difference from `log()` (documented as
  a deliberate, justified omission, not an oversight — same "only if
  justified" judgment `PerformanceLogger`'s `measure`/`measureAsync` split
  already established a precedent for). `event.metadata` nests as its own
  key in the logged object rather than flat-merging — unlike
  `PerformanceLogger`'s genuinely-arbitrary caller metadata, `metadata`
  here is one named field of the `AuditEvent` schema itself. One
  consistent `.info()` level regardless of `outcome`, matching the
  precedent `HttpLoggingMiddleware`/`PerformanceLogger` already set
  against status/success-based level branching. 8 new tests
  (`audit-logger.service.spec.ts`) — schema/optional-field-omission,
  metadata nesting, outcome-level-consistency, no-duplicate-context-fields,
  `RequestContext` inheritance (real `RequestContextService`, mock
  `Logger` capturing `getContext()` at call time), and a compile-time
  (`@ts-expect-error`) immutability check. `lint`/`typecheck`/`build`/`test`
  (76 passing) all clean; live boot unchanged; directly resolved
  `AUDIT_LOGGER` from a live Nest app instance and logged both a
  full-fields `SUCCESS` event and a minimal-fields `FAILURE` event —
  confirmed correct schema, correct optional-field omission, and correct
  `metadata` nesting in the real JSON output.
- Sprint 1 → Auth integration, Phase 1.2C.7 (performance logging only — no
  metrics aggregation/Prometheus/OpenTelemetry/histograms/percentiles/
  distributed tracing, no controller/repository instrumentation, no
  decorators/interceptors, no audit/external-monitoring logging):
  `apps/api/src/logging/performance-logger.service.ts` — `PerformanceLogger`,
  a reusable, DI-injectable timing utility with no current call site (same
  "build the capability before its first real consumer" pattern every
  earlier 1.2C phase followed). No DI token — a single concrete class with
  no interface to swap it behind, injected by class reference and exported
  from the public barrel, same treatment as `RequestContextService`, not
  `LoggerService`/`LOGGER`. Two manual, unguarded primitives —
  `startTimer(operation, { category? })` (captures a plain
  `PerformanceTimer` handle: `{ operation, start: process.hrtime.bigint(),
  category? }`, nothing to leak or clean up on its own) and
  `endTimer(timer, { success?, metadata? })` (computes `durationMs`, logs
  once via `logger.info('Performance measurement', ...)`) — plus two
  exception-safe wrappers, `measure()`/`measureAsync()`, whose own
  try/catch/finally always logs exactly once (flipping `success` to
  `false` on a caught error) and always rethrows the original error
  afterward, never swallowing it — this is what actually provides
  "timer cleanup on failure," not the manual pair. Caller-supplied
  `metadata` spreads *before* the fixed fields
  (`operation`/`durationMs`/`success`/`category`) in the log call, so it
  can never accidentally clobber them even if a key collides. Never
  touches `RequestContextService` — "automatically inherit RequestContext
  whenever one exists" and "work independently of HTTP middleware" are
  both satisfied by doing nothing special: `logger.info()` already
  auto-merges whatever context is active (Phase 1.2C.4), exactly like
  `ExceptionLoggingFilter`; this is also what makes "zero context leakage"
  hold by construction (no shared context-related state in the class at
  all, only a `Logger` reference). One consistent log level (`.info()`)
  regardless of `success`, matching Phase 1.2C.5's own precedent against
  status-based level branching. 13 new tests
  (`performance-logger.service.spec.ts`) — sync/async happy-path and
  exception-rethrow cases, metadata-collision-safety, a real
  (`setTimeout`-based) duration lower-bound check, and two tests proving
  context inheritance/no-leak using the real `RequestContextService`
  (mock `Logger` capturing `getContext()` at call time, same pattern
  established for the HTTP middleware and exception filter tests).
  `lint`/`typecheck`/`build`/`test` (65 passing) all clean; live boot
  unchanged; directly resolved `PerformanceLogger` from a live Nest app
  instance and exercised `measure()`/`measureAsync()` for both success and
  a deliberately-thrown error — confirmed the error was caught, logged
  with `success: false`, and correctly rethrown to the caller (not
  swallowed).
- Sprint 1 → Auth integration, Phase 1.2C.6 (exception logging only — no
  audit/performance logging, no OpenTelemetry, no external monitoring, no
  retry/alerting, no sensitive-data masking, no custom exception
  hierarchy): `apps/api/src/common/filters/exception-logging.filter.ts` —
  `ExceptionLoggingFilter extends BaseExceptionFilter`, the first real
  content in the `common/filters/` placeholder. Registered via
  `{ provide: APP_FILTER, useClass: ExceptionLoggingFilter }` in
  `app.module.ts` — Nest's own DI-native global-filter mechanism, chosen
  over `app.useGlobalFilters()` in `main.ts` because it needs no manual
  `app.get()`/`app.use()` workaround (exception filters aren't
  route-matched at all, so there's no equivalent to Phase 1.2C.5's
  `MiddlewareConsumer` prefix-scoping bug here — confirmed by testing
  anyway, given that exact prior lesson). `catch()` logs via `LOGGER.error()`
  then calls `super.catch(exception, host)`, so Nest's default HTTP
  response (body and status) reaches the client completely unchanged.
  A `describeException()` helper classifies every thrown value safely,
  in a specific branch order (`AggregateError extends Error`, so it's
  checked *before* the generic `Error` branch, or its nested `.errors`
  would silently vanish into the generic case): `HttpException` → real
  `message`/`type`/`statusCode`/`stack`; `AggregateError` → `message`/
  `type`/`stack` plus `errors: exception.errors.map(describeException)`
  (each nested error/value recursively safe, including a nested non-Error
  or circular member); plain `Error` → same minus `statusCode`; anything
  else (string, number, plain object, circular-reference object) →
  `typeof`-based `type`, a safe `String()`/`message: 'Non-Error value
  thrown'` summary, and — post-review-fix, for objects specifically — a
  `details` field holding a JSON round-trip clone (a safe, fully plain
  deep copy when serializable, or `'[Unserializable value]'` when not),
  so a plain thrown object stays queryable as nested structure instead of
  a double-JSON-encoded string; logging itself can never throw, even on a
  deliberately circular thrown object. `requestId`/`correlationId`/`ip`/
  `userAgent` are never re-extracted or duplicated into metadata — they
  reach the log via `LoggerService`'s existing automatic context merge
  (Phase 1.2C.4), exactly like every other `Logger` call site; the filter
  itself never touches `RequestContextService`. Metadata is
  `{ method, path, exceptionType, message, statusCode?, stack?, errors?,
  details? }`. Corrected
  a stale assumption along the way: `main.ts`'s original bootstrap comment
  (from Phase 1.2A) named the eventual filter `AllExceptionsFilter` and
  described it as reshaping responses into RFC 9457 Problem Details —
  this phase's filter deliberately does the opposite (preserves the
  default shape), so it's named `ExceptionLoggingFilter` instead; the RFC
  9457 response-shaping filter remains separate, unscheduled work, and the
  stale comment (plus the matching stale line in `backend.md`) was
  corrected to say so. 9 new tests
  (`exception-logging.filter.spec.ts`), covering every exception category
  including `AggregateError` and circular references, `super.catch()`
  stubbed via `jest.spyOn(BaseExceptionFilter.prototype, 'catch')` (no
  real `HttpAdapterHost` needed — that's Nest's own tested responsibility,
  not this phase's to re-verify), plus one test proving the filter logs
  from within a genuinely active `RequestContextService` context.
  `lint`/`typecheck`/`build`/`test` (51 passing) all clean; live boot
  unchanged; live `curl` against an unmatched route (Nest's own automatic
  `NotFoundException`, a real `HttpException` — no custom controller
  needed) confirmed: the client still receives Nest's byte-identical
  default 404 JSON body; exactly one `"Unhandled exception"` log line
  appears in addition to (not instead of) the existing `"HTTP request
  completed"` line for the same request; both share the same
  `requestId`/`correlationId`.
- Sprint 1 → Auth integration, Phase 1.2C.5 (HTTP logging only — no
  exception filters, no audit/performance logging, no OpenTelemetry, no
  auth integration): `apps/api/src/common/middleware/http-logging.middleware.ts`
  — the first real call site for `LOGGER`/`RequestContextService`, and the
  first real content in the `common/middleware/` placeholder. Per request:
  generates `requestId`/`correlationId` (reusing incoming `x-request-id`/
  `x-correlation-id` headers when present, else `crypto.randomUUID()`),
  establishes a `RequestContext` (`requestId`, `correlationId`, `req.ip`
  — respects the existing production `trust proxy` setting —, `user-agent`)
  via `RequestContextService.run()`, and logs one `"HTTP request completed"`
  entry via `LOGGER` once `res` emits `'finish'` (not `'close'` — correct
  `statusCode`, fires only after the response actually completes). Duration
  measured via `process.hrtime.bigint()` (monotonic, immune to system-clock
  adjustments), converted to fractional `durationMs`. Deliberately does not
  duplicate `requestId`/`correlationId`/`ip`/`userAgent` into the log's
  `metadata` — those already reach the same line via `LoggerService`'s
  existing `context` auto-merge (Phase 1.2C.4); only `method`/`path`
  (query-string-free, per "no query logging")/`statusCode`/`durationMs`
  are passed as `metadata`. **Found and fixed a genuine bug during live
  verification, not just unit testing:** `AppModule implements
  NestModule`/`configure()`/`MiddlewareConsumer.forRoutes('*')` — the
  originally-planned registration mechanism — silently scoped middleware
  matching to `app.setGlobalPrefix()`'s `/api` prefix; `curl` against
  unprefixed paths (`/`, `/health`) produced zero log output while
  `/api/v1/*` paths worked fine. Root-caused via direct `curl` testing
  against a live server, not assumed from docs. Fixed by registering the
  middleware via raw `app.use()` in `main.ts` instead (resolved from the
  DI container via `app.get()`), which runs for every request regardless
  of prefix — verified live afterward against both prefixed and unprefixed
  paths. Also found and fixed a real test-design flaw while writing
  `http-logging.middleware.spec.ts`: a hand-rolled plain-object fake
  `Response` with manual `.on()`/`.emit()` does NOT get Node's
  `async_hooks` instrumentation, so `AsyncLocalStorage` context appeared
  lost by the time a manually-triggered `'finish'` fired — not a bug in
  the middleware, but a test mock that didn't faithfully reproduce how a
  real Express response's `'finish'` event (genuinely async_hooks-tracked
  through Node's real socket/stream internals) propagates context; fixed
  by scheduling the fake `'finish'` callback via `setImmediate` at
  registration time, a real async boundary. 9 new tests, real
  `RequestContextService` + a mocked `Logger` (never the internal
  `LoggerService`, which is deliberately not exported from the public
  barrel). `lint`/`typecheck`/`build`/`test` (41 passing) all clean; live
  boot unchanged; live `curl` verification confirmed: unprefixed and
  prefixed paths both log exactly once; incoming `x-request-id`/
  `x-correlation-id` headers are echoed back verbatim, not regenerated;
  two genuinely concurrent `curl` requests each produced their own,
  uncontaminated `requestId` in their log line.
- Sprint 1 → Auth integration, Phase 1.2C.4 (request context only — no
  middleware, no ID generation, no interceptors): `RequestContextService`
  (`apps/api/src/logging/request-context.service.ts`) wraps Node's
  `AsyncLocalStorage<RequestContext>` with two methods —
  `run<T>(context, callback): T` and `getContext(): RequestContext |
  undefined` — no DI token (a plain provider; unlike `LOGGER`/
  `LOG_FORMATTER`/`LOG_TRANSPORT`, there's no interface to swap it behind)
  and no `.clear()` method (`AsyncLocalStorage`'s own scoping already
  makes "cleared" the natural resting state outside any `run()`). New
  `types/request-context.type.ts` (`requestId`/`correlationId` required,
  `traceId`/`userId`/`sessionId`/`ip`/`userAgent` optional) is structurally
  assignable directly to the existing `LogContext` type (extended this
  phase with the same four new optional fields) — so `LoggerService`
  merges an active context into `LogEntry.context` with zero mapping
  function, just `context: requestContext`. `LoggerService`'s constructor
  now also injects `RequestContextService`; `write()` reads
  `getContext()` and conditionally includes `context`, same "omit the key
  entirely when absent" convention `metadata` already used — when no
  context is active (true for every call today, since nothing calls
  `.run()` yet), output is byte-identical to Phase 1.2C.3.
  `RequestContextService` is exported from both `logging.module.ts`
  (provider + export) and the public `logging/index.ts` barrel — unlike
  `LoggerService`/`JsonLogFormatter`/`ConsoleLogTransport`, which stay
  internal, since a future middleware outside `apps/api/src/logging/`
  will need to inject it. 7 new tests
  (`request-context.service.spec.ts`) cover the two properties that
  actually justify `AsyncLocalStorage` over a plain module variable:
  context survives a real async boundary (`setTimeout` inside the
  callback) and two concurrent `run()` calls never leak into each other
  (proven via staggered `Promise.all`); 2 new tests added to
  `logger.service.spec.ts` for the merge behavior. `lint`/`typecheck`/
  `build`/`test` (33 passing) all clean; live boot unchanged; manual
  verification against the compiled `dist/` confirmed all three required
  behaviors: no-context calls unchanged, an active context merges in
  correctly, and two staggered concurrent contexts never cross-contaminate.
- Sprint 1 → Auth integration, Phase 1.2C.3 review (production-grade
  review, not new functionality): found and fixed two genuine issues past
  the original implementation. (1) `JsonLogFormatter`'s plain
  `JSON.stringify` silently rendered any `Error` in `metadata` as `"{}"`
  (Error's own properties are non-enumerable) — a near-certain occurrence
  the moment any call site does `logger.error('X failed', { error: err })`;
  fixed with a `JSON.stringify` replacer that special-cases `Error`
  instances (name/message/stack), including nested ones. (2) Zero test
  coverage existed anywhere in `apps/api` despite Jest being fully
  configured and CLAUDE.md's standing "every feature ships with tests"
  rule — added `logger.service.spec.ts`, `json-log-formatter.spec.ts`,
  `console-log-transport.spec.ts` (22 tests total, later 31 after Phase
  1.2C.4's additions). `lint`/`typecheck`/`test` all clean after fixes.
- Sprint 1 → Auth integration, Phase 1.2C.3 (structured logger only — no
  middleware, no correlation IDs, no audit logging, no third-party
  library): the logging subsystem's first concrete implementation.
  `LoggerService` (implements `Logger`, bound to `LOGGER`) reads
  `loggerOptions.level` and level-filters against a new
  `constants/log-level-severity.constant.ts` (`LOG_LEVEL_SEVERITY`,
  fatal=0..trace=5, mirroring `env.validation.ts`'s enum order) before
  building a `LogEntry` at all. `JsonLogFormatter`/`ConsoleLogTransport`
  each bound to their own new `LOG_FORMATTER`/`LOG_TRANSPORT` tokens
  (`tokens/logging.tokens.ts`) — `ConsoleLogTransport` injects
  `LOG_FORMATTER` and routes by severity to `console.error`/`.warn`/`.log`;
  `LoggerService` injects only `LOG_TRANSPORT`, never the formatter
  directly, since formatting is the transport's concern per
  `LogTransport.write(entry): void`'s existing signature. Deliberately not
  environment-gated — a transport that silently drops every log line
  outside development, with no replacement configured, would be a worse
  outcome than one that logs everywhere; a production-grade transport is
  later, unscoped work. `loggerOptions.format === 'pretty'` has no
  consumer yet (only `JsonLogFormatter` exists) — documented as an honest
  gap, not silently ignored. `LogEntry.context` stays threaded through the
  pipeline but never populated (needs `AsyncLocalStorage`, Phase 1.2C.4).
  Neither the new formatter/transport classes nor `LoggerService` itself
  are exported from the public `logging/index.ts` barrel — consumers only
  ever get `LOGGER`/`Logger`, never a concrete class. `logging/README.md`
  and `backend.md` updated; one incidental stale-comment fix in
  `types/log-context.type.ts` (said "Phase 1.2C.2+ (correlation IDs)",
  corrected to "Phase 1.2C.4+" since 1.2C.2 turned out to be
  configuration, not correlation IDs). `lint`/`typecheck`/`build` all
  clean; live boot shows `LoggingModule dependencies initialized` with no
  DI resolution errors; direct invocation of the resolved `LOGGER` against
  the real `.env` confirmed: `.debug()`/`.trace()` calls (below the
  configured `info` threshold) produce no output at all; `.info()`
  through `.fatal()` produce clean JSON lines; a call with `metadata`
  includes it, a call without omits the key entirely; `.info()` lands on
  stdout, `.warn()`/`.error()`/`.fatal()` on stderr.
- Sprint 1 → Auth integration, Phase 1.2C.2 (logging configuration only —
  no logger implementation, no middleware, no third-party library):
  `apps/api/src/logging/config/logger-options.config.ts` — a
  `registerAs('loggerOptions', ...)` factory assembling `LoggerOptions`
  (`{ level, format }`) from the already-validated `LOG_LEVEL`
  (`app.config.ts`) and `LOG_FORMAT` (`config/logging/logging.config.ts`)
  — no new env var, no `env.validation.ts` change, no re-validation. Filed
  under `apps/api/src/logging/` rather than the frozen
  `apps/api/src/config/`, since this is a config concern owned by and
  graduating alongside the Logging module, not a general-purpose domain —
  registered via `LoggingModule`'s new `ConfigModule.forFeature(...)`
  import rather than touching the frozen `config.module.ts`'s
  `forRoot()` call. `logging/README.md` and
  `docs/architecture/configuration.md` updated to document the new
  namespace and why it lives outside the usual `config/` folder.
  `lint`/`typecheck`/`build` all clean; live boot still shows
  `LoggingModule dependencies initialized`; direct invocation of the new
  factory against the real `.env` resolves `{ level: 'info', format:
  'json' }`, matching `app.config.ts`'s `logLevel` and
  `config/logging/logging.config.ts`'s `format` exactly.
- Sprint 1 → Auth integration, Phase 1.2C.1 (logging architecture only —
  interfaces/types/tokens/an empty module, zero logging behavior):
  `apps/api/src/logging/` — `Logger`/`LogTransport`/`LogFormatter`/
  `AuditLogger` interfaces; `LogLevel`/`LogFormat`/`EnvironmentMode` types
  that deliberately mirror config's already-validated `LOG_LEVEL`/
  `LOG_FORMAT`/`NODE_ENV` enums rather than inventing a second vocabulary;
  `LogEntry`/`LogContext`/`LogMetadata`/`AuditEvent`/`LoggerOptions` data
  shapes; `LOGGER`/`AUDIT_LOGGER` Symbol-based DI tokens; an empty
  `@Global() LoggingModule` wired into `AppModule` (zero behavior change —
  live-boot-confirmed identical). `AuditLogger` kept distinct from
  `Logger` on purpose, mirroring Phase 1's immutable `AuditLog` Prisma
  model and CLAUDE.md's audit-logging mandate. `decorators/`, `utils/`,
  and `constants/` deliberately not created — nothing non-speculative
  belongs in any of them yet (documented in `logging/README.md`, same
  "document the gap, don't fill it with placeholders" discipline as every
  other subsystem this project has built). `lint`/`typecheck`/`build` all
  clean; live boot shows `LoggingModule dependencies initialized` in the
  DI graph with no circular-dependency errors. **Explicitly not started
  Phase 1.2C.2+** (no logger implementation, no middleware, no correlation
  IDs, no third-party library) per this phase's own instruction —
  architecture awaited review/approval first (now complete, see Phase
  1.2C.2 above).
- Sprint 1 → Auth integration, Phase 1.2B.5 (final configuration audit —
  certification only, no new functionality): comprehensive re-review of
  the entire config subsystem (env.validation.ts, config.module.ts,
  config/index.ts, all 8 real namespaces, .env.example, and all 4
  architecture docs) against every prior phase's own review findings.
  Found one genuine issue that had survived all 3 previous review
  passes: `backend.md`'s Phase-1.2A-era "two namespaces now" decision
  entry was never updated as the domain count grew to 8 across
  1.2B.1–1.2B.3 — fixed, with its original scope made explicit. Verified
  live: full app boot identical to every prior phase; all 8 namespaces
  resolve correctly via direct `registerAs()` invocation (including
  `appConfig.KEY` resolving to a valid DI token, confirming the
  typed-injection pattern is genuinely viable, not just type-checked);
  re-ran the missing-`DATABASE_URL` and malformed-`PORT` fail-fast cases
  from earlier phases with identical results — zero regression across
  environment validation, typed configuration, typed injection,
  documentation, extension workflow, troubleshooting guide, or runtime
  startup. `lint`/`typecheck`/`build` all clean. **Phase 1.2B is
  certified complete and frozen** except for future feature-specific
  extensions.
- Sprint 1 → Auth integration, Phase 1.2B.4 (configuration DX,
  documentation only — zero runtime behavior change): new
  `docs/architecture/configuration-guide.md` — usage examples (new
  module, new validated var, consuming in a service/bootstrap), a
  conventions-with-rationale table, a 7-scenario troubleshooting guide,
  and the 7-step extension process, cross-linked from
  `configuration.md`/`validation.md`/`backend.md`. Found and fixed one
  real inconsistency while reviewing code comments (§7 of the brief):
  every real config domain except `app.config.ts` had an explanatory
  comment — added one, matching the others' style. Also tightened
  `env.validation.ts`'s terse `// security` label to match its siblings'
  level of detail. No new env vars, no new domains, no source-code
  behavior change — confirmed via clean rebuild + identical live-boot log
  before and after. `lint`/`typecheck`/`build` all clean.
- Sprint 1 → Auth integration, Phase 1.2B.3 (typed configuration modules):
  graduated 6 config domains from placeholder to real —
  `security` (rateLimitWindowMs, rateLimitMax), `logging` (format —
  LOG_LEVEL itself stays under `app`), `swagger` (enabled, path — config
  only, no UI wired up), `health` (path — config only, new
  `config/health/`, distinct from the existing `apps/api/src/health/`
  placeholder), `cache`/`queue` (both `redisUrl`, same validated
  `REDIS_URL` source, two namespaces). Added 7 new fields to
  `env.validation.ts` (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`,
  `LOG_FORMAT`, `SWAGGER_ENABLED`, `SWAGGER_PATH`, `HEALTH_PATH`,
  `REDIS_URL` — the last now required, same treatment as `DATABASE_URL`).
  Confirmed with the user first: these are minimal, safe-defaulted
  platform-internal toggles, not speculative third-party product config,
  so they don't conflict with the "no speculative vendor config" rule; 10
  domains remain untouched placeholders (auth, storage, email,
  notifications, payments, ai, search, analytics, feature-flags,
  monitoring). Adopted one project-wide typed access pattern —
  `@Inject(xConfig.KEY)`/`ConfigType<typeof xConfig>` for providers,
  `app.get(xConfig.KEY)` outside DI — and demonstrated it in `main.ts`,
  replacing the previous phase's `ConfigService.getOrThrow()` calls.
  `configuration.md`/`validation.md` updated (folder table, new §4 typed-
  access-pattern section, schema table, several stale cross-references
  from the 1.2B.2 review fixed along the way). `lint`/`typecheck`/`build`
  clean; live boot confirmed identical startup log; spot-checked that the
  new required `REDIS_URL` is genuinely enforced (not just coincidentally
  present in `.env`).
- Sprint 1 → Auth integration, Phase 1.2B.2 (environment validation only):
  one Zod schema (`apps/api/src/config/env.validation.ts`) validates the 6
  env vars the implemented config layer actually reads (`NODE_ENV`, `PORT`,
  `LOG_LEVEL`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`, `DATABASE_SSL`),
  wired into `ConfigModule.forRoot()`'s `validate` option so a malformed
  or missing value aborts startup before any provider (or the HTTP
  listener) exists. `app.config.ts`/`database.config.ts` now read the
  validated result instead of parsing `process.env` themselves — no
  duplicated parsing logic. **Real finding from live testing:** the
  validation failure throws synchronously at `require()`-time (inside
  `ConfigModule`'s `@Module()` decorator), before `main.ts`'s own
  `bootstrap()` function body ever runs — so the `bootstrap().catch()`
  added this phase does NOT catch it (confirmed, not assumed); Nest's own
  internal error handling + Node's default uncaught-exception handler
  produce the fail-fast behavior instead. Documented accurately in
  `docs/architecture/validation.md` §3 rather than left as an inaccurate
  code comment. Live-verified: valid `.env` boots clean; `DATABASE_URL`
  removed → clean `DATABASE_URL: Required` error, exit 1, never reaches
  "Nest application successfully started"; restored `.env` boots clean
  again; `PORT=notanumber` (which crashed with a raw `ERR_SOCKET_BAD_PORT`
  stack trace in Phase 1.2A's own verification) now fails cleanly with
  `PORT: Expected number, received nan` instead — a previously-flagged gap
  actually closed. New `docs/architecture/validation.md`;
  `configuration.md`'s lifecycle diagram updated from "not built yet" to
  point at it. `lint`/`typecheck`/`build` all clean.
- Sprint 1 → Auth integration, Phase 1.2B.1 (configuration architecture
  only, no validation/feature values yet): reorganized `apps/api/src/config/`
  from Phase 1.2A's two flat files into a per-domain folder architecture —
  `app/` and `database/` hold the two real namespaces (relocated,
  byte-identical content — verified via a clean rebuild + live boot
  producing the exact same startup log as before the move), plus 15
  README-only placeholder domains (`auth`, `security`, `cache`, `queue`,
  `storage`, `email`, `notifications`, `payments`, `ai`, `search`,
  `analytics`, `feature-flags`, `monitoring`, `logging`, `swagger`). Added
  a central `config/index.ts` barrel — `app.module.ts` now imports
  `ConfigModule` from `./config`, not the file directly. New
  docs/architecture/configuration.md (folder structure, naming/export/
  ownership conventions, config lifecycle diagram, architecture decisions
  — why CORS stays under `app`, why `cache`/`queue` split despite sharing
  Redis, why `auth`/`security` split); `backend.md` §4 trimmed to a pointer
  at it instead of duplicating. `lint`/`typecheck`/`build` all clean; no
  new env vars, no validation (still Phase 1.2B.2), no breaking changes —
  registered namespace keys and shapes are unchanged from 1.2A.
- Sprint 1 → Auth integration, Phase 1.2A (backend foundation only, no auth
  logic yet): NestJS application shell — `main.ts` (API prefix `/api`,
  URI versioning → `/api/v1/...`, graceful shutdown hooks, production
  `trust proxy`, startup log), `app.module.ts` (imports the new global
  `ConfigModule`), `apps/api/src/config/` (real `@nestjs/config` wiring,
  two namespaces: `app`, `database` — the latter is connection-string data
  only, no Prisma import, no client, `apps/api/prisma/` untouched per this
  phase's "no database files" constraint). Added placeholder folders
  (README-only, matching Phase 0's existing convention) for `database/`,
  `health/`, `shared/`, `types/`, `utils/`, and `common/{filters,
  interceptors,guards,pipes,middleware}/`. New
  docs/architecture/backend.md (folder structure, startup flow, dependency
  graph, architecture decisions). **Found and fixed one real pre-existing
  bug while validating:** `apps/api/package.json`'s `start` script pointed
  at `dist/main`, but `tsconfig.json`'s multi-root `include`
  (`src/`+`tests/`+`prisma/`) makes `tsc` emit under `dist/src/main.js` —
  `node dist/main` has never actually worked. Fixed to `node dist/src/main`;
  verified the built app now boots and listens for real (confirmed via
  `curl` against the running process). `lint`/`typecheck`/`build` all clean.
- Sprint 1 → Database foundation, Phase 1 production-readiness audit
  (2026-07-17): closed the one real gap Phase 1.1B left open — migrations
  had never been run against a live Postgres. Ran the full pipeline for
  real against a native PostgreSQL 18 instance: all 4 migrations applied
  clean, `prisma validate`/`format`/`generate` clean, workspace
  `lint`/`typecheck`/`test`/`build` clean (apps/api; apps/web has a
  pre-existing Windows-only Next.js standalone-output symlink issue,
  unrelated to the database layer — not fixed, out of scope). **Found and
  fixed one genuine bug in the process:** `seed.ts`'s `.upsert()` calls on
  `role`/`user`/`setting` failed with Postgres error 42P10 — Prisma's
  generated `ON CONFLICT` SQL can't target the partial unique indexes
  Phase 1.1B added (`WHERE deleted_at IS NULL`), a defect invisible to
  schema-only review. Fixed by switching those 3 call sites to
  find-then-create/update, and documented the landmine prominently in
  docs/architecture/database-schema.md §8 for Phase 1.2's repository
  layer to avoid repeating it. Also live-verified RLS actually enforces
  tenant isolation (not just "the SQL looks right") — fails closed with no
  tenant set, correct/incorrect tenant visibility, role-scoped admin/
  service overrides, append-only grant revokes, and the optimistic-lock
  version trigger — all connected as `antrique_app`/`antrique_service`,
  not the owner role. Fixed a doc/code drift (seed permissions count: docs
  said 30, `seed.ts` actually seeds 34). Added two documentation sections
  the audit brief required and that were genuinely missing: Production
  Deployment and Recovery Procedures (§14–§15). Full report with scores in
  the session that ran this audit; database-schema.md §13 has the
  before/after validation table.
- Sprint 1 → Database schema + migrations, Phase 1.1B: prisma.config.ts
  (Prisma 7 config + driver-adapter wiring), 4 migrations (baseline +
  partial unique indexes + CHECK constraints + RLS), antrique_app/
  antrique_service roles with tenant/admin/service RLS policies on all 25
  tenant tables, a version-auto-increment trigger, idempotent seed.ts
  (tenant/permissions/roles/admin user/settings/sample clients+leads+
  projects), all `db:*` scripts. Schema itself unchanged except the
  generator block (switched to the `prisma-client` generator + driver
  adapters, which Prisma 7's client generation actually requires — see
  docs/architecture/database-schema.md §13). Flagged one scope gap rather
  than resolving it unilaterally: the seed brief asked for "Services" and
  "Blog Categories," neither of which are modeled entities in the approved
  schema (see seed.ts header + database-schema.md §10).
- Sprint 1 → Database schema + migrations, Phase 1.1A final review (2nd
  pass): re-verified the whole schema programmatically (required-field
  checklist per model, Float/enum/naming/PK-strategy scans) rather than
  re-trusting the first pass. Found 2 more small gaps: `Session.updatedAt`
  was missing (had version + semantic timestamps but no generic
  last-touched field) and `Payment` was missing the `(tenant_id, status)`
  index that the docs already claimed it had (doc/schema drift). Both
  fixed, re-validated + reformatted clean.
- Sprint 1 → Database schema + migrations, Phase 1.1A final review (1st
  pass): added explicit `onDelete` referential actions to all 62 relations
  (previously none — database.md's deletion-behavior policy wasn't actually
  encoded in schema.prisma), added missing createdAt/updatedAt to
  QuotationItem/InvoiceItem, added composite indexes (Task/Milestone/
  Invoice dueDate, Task assignee+status), expanded the Phase 1.1B
  CHECK-constraint worklist. See docs/architecture/database-schema.md §3.1, §7.
- Sprint 1 → Monorepo + tooling (pnpm workspaces, Turbo, TS strict, ESLint/Prettier,
  Husky + lint-staged + commitlint) — verified and committed
- Sprint 1 → Shared types + OpenAPI skeleton (packages/shared, packages/api-contract)
- Fixed docs/implementation/ files that had swapped/mismatched content (see decisions.md)
- Phase 0 audit (monorepo/tooling/infra/CI) — all green, one small nginx.conf
  comment fix
- Phase 1.1A: apps/api/prisma/schema.prisma — see docs/architecture/database-schema.md

## Next 3 tasks
1. **DONE (2026-07-30):** Phase 10, Module 1 (API Performance) — see this
   file's own newest log entry and `docs/architecture/performance.md`
   §10 for the full writeup. **Module 2 (Frontend Performance)** is the
   natural next step in the same Phase 10 initiative (15 modules total:
   API perf ✅, frontend perf, security hardening, auth/session security,
   observability, monitoring, background jobs, caching, DB reliability,
   CI/CD, Docker/infra, testing, docs, tech debt, readiness report — full
   spec from the user, not yet copied into its own doc) — but confirm
   with the user before starting Module 2 vs. resuming Phase 9 (Finance,
   paused) vs. something else; the user hasn't specified sequencing past
   "start with Module 1." One real, out-of-scope finding from Module 1 to
   route into **Module 3 (Security Hardening)** when it starts: RLS's
   documented `SET LOCAL` contract is never actually wired into Prisma —
   see `docs/implementation/blockers.md`'s 2026-07-30 entry.
2. **Phase 9, Module 1 (Finance) Step 1 (Vendor Management) is done** —
   see this file's own newest log entry. Continue with **Step 2
   (Purchase Orders)**: new `PurchaseOrder`/`PurchaseOrderItem` models
   referencing the new `Vendor`, same `apps/api/src/modules/finance/`
   module, same `apps/web` pattern (`features/finance/`, list/create/
   detail pages) — see the approved plan's Module 1 roadmap for the full
   Steps 2-7 sequence and why this dependency order (Vendor → Purchase
   Orders → Expenses first; Invoice PDF+email / Refunds / Tax Config /
   Dashboards are independent and can interleave). Phase 8's `apps/web`
   UI (Steps 3–8 have zero frontend) remains open but deprioritized
   behind Phase 9 per the user's own call.
3. Separately, Phase 7's own remaining steps are still open, in the
   priority order its workflow matrix recommends
   (`docs/implementation/phase-7-workflow-matrix.md`'s "What this means"
   section): Step 8 (wire the already-built `DocumentPdfService`/
   `EmailService` into Billing) or Steps 10–13 (Notifications/Audit/
   Reporting are schema-complete but functionally inert — audit logging
   is only ever called by itself). Kanban drag-and-drop / calendar view /
   task dependencies / project budget remain smaller follow-ups to the
   Project/Task/Milestone module specifically.
4. Backfill a real Backend v1.0 Review Phase 6 entry in this log — the
   `v1.0.0` tag/release commit exist (verified via `git tag`/`git log`) and
   the user's own account says six review phases ran, but this file only
   narrates Phases 1–5. A backend-focused session should reconstruct Phase
   6's actual content from source/git history rather than this gap
   persisting. Candidate follow-up work already surfaced but deferred
   (still open, unrelated to Phase 6 itself): (a) a `/me`/profile/
   permissions endpoint — no API response anywhere returns the logged-in
   user's id/name/role/permissions, a real gap for any frontend login flow
   (also the reason no project/task assignee picker exists in the new
   `apps/web` UI — there's no "list users" endpoint/hook to build one
   against yet); (b) converting response DTOs from constructor-parameter-
   properties to field declarations for real field-level Swagger schema
   detail (see decisions.md's 2026-07-23 entry).

## Notes for next session
- Verify `git status` before assuming anything above is safely persisted —
  see item 1 above.
- The `apps/api` backend needs no further engineering "next session" setup
  for what's already built — every module through Phase 8 Step 7 is
  tested (181 suites/1039 tests) and verified end-to-end against a live
  server, including real Anthropic API round-trips, the first
  genuinely-succeeding Phase 8 write path (`POST /task-generator/approve`,
  201, real `Task` rows), and Step 7's full persisted-resource CRUD
  surface (verified against a manually-inserted row, since a successful
  AI completion needs Anthropic credit this session doesn't have). It
  DOES need its own review-history doc backfilled (Phase 6, see "Next 3
  tasks" above).
- If `pnpm dev` in `apps/api` ever throws `EADDRINUSE` on port 4000 after
  a watch-mode restart, an old child process didn't release the port —
  check `Get-NetTCPConnection -LocalPort 4000` for the owning PID,
  `Stop-Process -Id <pid> -Force`, then restart `pnpm dev`. Happened once
  this session (Step 7); not a code bug, the same class of dev-server
  flakiness already documented below for `apps/web`.
- Live-browser verification of `apps/web`'s existing pages (Phase 7's
  Project/Task/Milestone UI, CRM) is now confirmed genuinely possible —
  caught a real, correct render of `/projects` with live data from the
  API on 2026-07-29 — but intermittent: the same page hung on a stale
  loading shell on a later reload with no console errors and no failed
  network requests either time. Treat this as environment/dev-server
  flakiness (likely resource contention in this sandbox), not a
  reproducible code bug, until proven otherwise — don't re-diagnose it
  as a fresh mystery next session.
- `ANTHROPIC_API_KEY` is set in `apps/api/.env` (git-ignored) with a real,
  working key — but the Anthropic account it belongs to has no credit
  balance, confirmed via a direct API call. Anything that exercises
  `AiService`/`POST /prompt-templates/:id/test` will get a real, clear
  502 until credit is added — not a bug, don't re-diagnose this from
  scratch next session.
- `CORS_ALLOWED_ORIGINS` in `apps/api/.env` now includes both `:3000` and
  `:3001` — the web dev server falls back to `:3001` when `:3000` is
  occupied (a pre-existing process on this machine holds it), and only
  `:3000` was allowed before this session. If browser-side API calls
  start failing again, check this first before assuming a code regression.
- `apps/web`'s engineering foundation, design system, marketing site,
  business portal (all 7 Backend v1.0 modules), and now the Project/Task/
  Milestone workspace are all built — see this file's log entries plus
  `docs/architecture/{frontend,design-system}.md`. Anyone picking up
  `apps/web` next should read those docs before building a new page, not
  re-derive conventions from scratch — `features/projects/` mirrors
  `features/crm/`'s structure exactly, and both mirror `components/data/`'s
  generic table/pagination/filter primitives.
- `docs/product/*.md` still reportedly has the swapped-content bug
  `docs/implementation/` once had (see blockers.md, opened 2026-07-16) —
  not re-verified this session; check before trusting it as a source.
