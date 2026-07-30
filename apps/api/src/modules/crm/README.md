# CrmModule (Milestone 9 — CRM & Customer Operations)

"The CRM module owns customer engagement and sales activities. It must
not duplicate customer, order, or authentication logic" (this
milestone's own framing). Five controller/service/repository triads —
Lead, CustomerNote, CustomerActivity, FollowUp, and CustomerTag (the
last one added beyond this milestone's own named list — see "Why a 5th
triad" below) — plus a sixth, `Client`, added by Phase 7 (Enterprise
CRM/Project-Management — see "Client" below) — on top of `Lead` (reused, not duplicated — see below),
`LeadSource`, `CustomerNote`, `CustomerActivity`, `FollowUpTask`,
`CustomerTag`, `CustomerTagAssignment`. Tenant-isolated, RBAC-protected,
one Prisma transaction threaded across the `OrdersModule` boundary for
lead conversion and follow-up completion (the same shape Milestone 8's
own `domain-module-guide.md` §19 established).

## Architecture audit (before writing any code)

A repo-wide search for `Lead`/`Inquiry`/`Activity`/`Note`/`FollowUp`/`Tag`
found `Lead` (plus `Client`/`ContactRequest`, its funnel neighbors)
already fully modeled since Phase 1.1A, with **zero application-layer
consumers** — no `LeadRepository`/`LeadService`/`LeadController` existed
anywhere before this milestone, the same "schema exists, this is its
first real consumer" situation Milestone 3 found for `Role`/`Permission`.
`ActivityLog` also already existed, but is project-anchored
(`projectId`), not customer-anchored — reused nothing from it (see
"Why not reuse ActivityLog" below). No `LeadSource`/`CustomerNote`/
`CustomerActivity`/`FollowUpTask`/`CustomerTag`/`CustomerTagAssignment`
entities existed anywhere. Full reasoning for every non-obvious call:
`docs/implementation/decisions.md`.

**`Lead` is reused wholesale, not duplicated.** Two new nullable columns
only: `leadSourceId` (→ new `LeadSource` lookup, additive alongside the
existing free-text `source` column) and `convertedCustomerId` (→
`Customer`, this milestone's own "Convert Lead → Customer" target) —
deliberately SEPARATE from the pre-existing `convertedClientId` (→
`Client`, the agency's own B2B service-customer conversion path from
Phase 1.1A's original CRM funnel). The two conversion paths are
independent by design, mirroring `Customer`'s own Milestone 8 schema
comment ("distinct from Client... the two are unrelated on purpose") —
this milestone's `LeadService.convert()` only ever touches
`convertedCustomerId`; `convertedClientId` is untouched, still whatever
the original agency-CRM design anticipated.

## What's real here

- `crm.module.ts` — `CrmModule`, imported into `AppModule`. Not
  `@Global()`. **Imports ONE other module** — `OrdersModule` (now
  `exports: [CustomerRepository]`) — for "Use: CustomerRepository," this
  milestone's own integration requirement. One-directional; `OrdersModule`
  does not import `CrmModule` — "Zero circular dependencies" holds.

### Lead (the module's core)

`lead.controller.ts` — this milestone's own "Lead" Controllers list:
Create, Update, Archive, Convert, Get, List — no Delete (Archive is the
terminal write action; this milestone names no stricter RBAC tier for it
the way Milestone 8 named one for Cancel, so it stays under
`leads:write`).

`lead.service.ts`:
- **"Prevent duplicate active leads"** — `LeadRepository.findActiveByEmail()`
  checks for an existing lead with the same `(tenantId, contactEmail)` in
  a non-terminal status (`NEW`/`QUALIFIED`/`QUOTED`) before create/update;
  service-level only, not a DB constraint — see
  `docs/implementation/decisions.md` for why this is proportionate here
  (the same class of judgment call Milestone 8 made for "default
  addresses").
- **"Archived leads immutable"** — `assertMutable()` rejects any
  `update()`/`archive()`/`convert()` once status is `ARCHIVED` OR
  `CONVERTED` (both treated as terminal for mutation purposes).
- **"Convert Lead → Customer"** — `convert()` finds-or-creates a real
  `Customer` (via `CustomerRepository`, reused directly — an email match
  links to the existing customer instead of duplicating), sets
  `status: CONVERTED`/`convertedCustomerId`, and writes a
  `LEAD_CONVERTED` `CustomerActivity` — all inside ONE transaction
  (`LeadRepository.runInTransaction()`, the same `tx` threaded into
  `CustomerRepository`'s new `findActiveByEmailInTx()`/
  `createWithRelationsInTx()` variants — additive, `OrdersModule`'s own
  `CustomerService` is unaffected).
- **"Automatic activity creation for: lead creation"** — `create()`
  writes a `LEAD_CREATED` `CustomerActivity` in the same transaction as
  the lead itself. Since no `Customer` exists yet at that point, this row
  has `customerId: null`, anchored by `relatedLeadId` alone — see
  `CustomerActivity`'s own schema comment.
- `leadSourceId`/`source` resolution: when `leadSourceId` is given,
  `LeadService` resolves the legacy NOT NULL `source` string from the
  looked-up `LeadSource.name` (kept in sync); when only `source` is
  given, that's used as-is. Rejects when neither is provided.

### Client (Phase 7 — Enterprise CRM/Project-Management)

`client.controller.ts`/`client.service.ts`/`repositories/client.repository.ts`
— the agency's customer-organization profile, found already fully
modeled since Phase 1.1A with **zero application-layer consumers**, the
same situation `Lead` itself was in before Milestone 9. Create/List/Get/
Update only — **no Delete route** (no `clients:delete` permission was
ever seeded); moving `ACTIVE` → `INACTIVE`/`ARCHIVED` happens through
`PATCH /clients/:id`'s own `status` field, not a dedicated action route.
No `@@unique` constraint exists on `Client` (confirmed via schema read),
so unlike Category/Collection/Product's slug-based create there's no
409-on-duplicate case to document — any number of clients can share a
name.

**`LeadService.convertToClient()`** (`POST /leads/:id/convert-to-client`)
— a second, independent conversion path alongside the pre-existing
`convert()` (→ `Customer`, the unrelated e-commerce pipeline). Always
**creates** a new `Client`, never finds-and-links an existing one —
`Client` has no unique constraint to make a race-safe find-or-create
possible the way `Customer`'s email uniqueness does for `convert()`.
`Client.name` resolves from the request body first, falling back to the
lead's own `organization`; a lead with neither set is rejected with a
clear `400` rather than silently defaulting to something like the
contact's own name. Same transactional shape as `convert()`
(`LeadRepository.runInTransaction()`, sets `convertedClientId` +
`status: CONVERTED`, records a `LEAD_CONVERTED` `CustomerActivity`).

### Quotation — "Proposal Management" (Phase 7, Phase 2)

`quotation.controller.ts`/`quotation.service.ts`/
`repositories/quotation.repository.ts` — built on the **existing**
`Quotation`/`QuotationItem` model (schema's own doc comment: "Quote-
wizard output"), the closest match to the brief's "Proposal" concept —
**no separate `Proposal` model exists anywhere in the schema**, confirmed
via a schema-wide search. Create/List/Get/Update (DRAFT only, via
`assertEditable()`) plus 3 terminal action routes: `POST :id/send`
(DRAFT → SENT — generates a PDF via the new `DocumentPdfService`
(`apps/api/src/pdf/`), stores it via the **existing** `StorageService`
(unchanged — already accepted an arbitrary buffer/contentType, not just
images), fire-and-forgets an email via the **existing**
`EmailService`/`JobRunner` to whichever of the lead/client has a
resolvable email address), `POST :id/accept` (SENT → ACCEPTED), `POST
:id/reject` (SENT → REJECTED). `leadId`/`clientId` XOR enforced in
`assertExactlyOneSubject()` (the DB-level `quotations_lead_xor_client_check`
CHECK backs this too). Item `amount`/quotation `subtotalAmount`/
`totalAmount` are always computed server-side (`Prisma.Decimal`
arithmetic, never trusted from the client) — same discipline
`InvoiceService.createFromOrder()` already established.
`quotationNumber` generated via the same bounded retry-on-collision loop
as `InvoiceService.generateInvoiceNumber()`.

One additive schema column this phase needed: `Quotation.pdfUrl String?`
— nothing before this phase generated a PDF, so nothing needed anywhere
to store its URL. Migration: `20260729080000_add_quotation_pdf_url`.

**Descoped, flagged honestly, not built this phase**: proposal
"templates" (would need a new model), "revision history" (no
version-chain field exists on `Quotation` — the existing `version`
column is the optimistic-lock counter, a different concept; reusing it
for revision history would conflate the two), attachments on a
quotation (no join table exists between `Quotation` and any
file/document concept).

### CustomerNote

Full CRUD — `customer-note.controller.ts`/`customer-note.service.ts`/
`repositories/customer-note.repository.ts`. "Rich text supported" — `body`
is a sanitized HTML/markdown string (no dedicated rich-text entity, same
"validated scalar column, not a new relational entity" choice
`OrderItem.selectedOptions` already established). "Notes never
hard-delete" — `remove()` always sets `deletedAt`; there is no hard-delete
path anywhere in this service. `authorUserId` is always left `null` — same
known, accepted gap as `createdBy`/`updatedBy`/`deletedBy` everywhere else
(`RequestUser` is `{ email }` only, no `userId` in the request pipeline).

### CustomerActivity (read-only)

`customer-activity.controller.ts` — this milestone's own "Activities"
Controllers list: "Timeline, List" only — no Create/Update/Delete route.
Every row is written internally by `LeadService`/`FollowUpService`; there
is no public, client-facing way to create a `MANUAL`-style entry (the
enum has only the three named triggers — `LEAD_CREATED`,
`LEAD_CONVERTED`, `FOLLOW_UP_COMPLETED` — no speculative fourth value with
nothing that could ever produce it).

`GET /customer-activities/timeline?customerId=X` — the full, ascending,
customer-scoped feed ("Timeline creation," this milestone's own explicit
responsibility). **`LEAD_CREATED` rows never appear here** — they have
`customerId: null` (no customer exists yet when a lead is created).
`GET /customer-activities` (List, paginated/filterable — status/type/
customerId/**leadId**/date range) is how a `LEAD_CREATED` row is actually
reached: filter by `leadId` (maps to the `relatedLeadId` column) instead
of `customerId`. Confirmed live: `LEAD_CREATED` shows up under
`?leadId=<lead>`, never under `?customerId=<the-resulting-customer>`.

**Why not reuse `ActivityLog` instead of a new `CustomerActivity`
table**: `ActivityLog` (Phase 1.1B) is scoped to `projectId`/
`actorUserId` for "the portal's Timeline (event feed) and the admin
activity dashboard" — delivery work, not customer engagement. Every
prior milestone's own append-only ledger is scoped to its own aggregate
instead (`InventoryTransaction` → `InventoryItem`, `OrderStatusHistory`
→ `Order`) rather than overloading a shared generic table — `CustomerActivity`
follows that same precedent.

### FollowUp

`follow-up.controller.ts` — this milestone's own "Follow-ups" Controllers
list: "CRUD, Complete, Cancel, Reopen." `FollowUpTask` is deliberately
NOT "Customer"-prefixed like the three entities above (a literal reading
of this milestone's own naming) — it targets EITHER a `Lead`
(pre-conversion — "call this prospect back next week," the more common
real-world case) OR a `Customer` (post-conversion), never both, the same
lead-vs-client XOR pattern `Quotation`/`InventoryItem` already
established, extended to a lead-vs-customer choice (hand-written
cross-column `CHECK`, `follow_up_tasks_lead_xor_customer_check`).
"Due-date validation" rejects a `dueAt` in the past, on both `create()`
and any `update()` that changes it. "Completed follow-ups cannot be
edited" — `assertEditable()` rejects `update()` once `status !== PENDING`
(does not gate `complete()`/`cancel()`/`reopen()` themselves — those ARE
the sanctioned ways to change a completed/cancelled task's state).
**"Automatic activity creation for... follow-up completion"** —
`complete()` writes the status change and a `FOLLOW_UP_COMPLETED`
`CustomerActivity` in one transaction (same `runInTransaction()`/
`updateInTx()` shape as `LeadRepository`'s own), anchored by whichever of
`customerId`/`relatedLeadId` matches the task's own target. `reopen()` is
the one path back to `PENDING` from either terminal state (clears
`completedAt`); `cancel()`'s own optional `reason` isn't persisted
anywhere (`FollowUpTask` has no metadata column) — accepted for symmetry
with `CancelOrderDto`'s own shape, with nowhere to store it this
milestone.

### CustomerTag — why a 5th triad

**Not named in this milestone's own "Repository Layer"/"Service
Layer"/"Controllers" lists** (which name exactly four of each: Lead,
CustomerActivity, CustomerNote, FollowUp) — added anyway because
`CustomerTag`/`CustomerTagAssignment` ARE named in "Core entities," and
this milestone's own Filtering list requires "Tags" support. Without
SOME write path, those two tables would be permanently dead schema and
the "Tags" filter permanently unsatisfiable — the same "no half-finished
implementation" discipline (CLAUDE.md) that justified `BaseRepository.count()`
in Milestone 5 (a genuine, simultaneous need, not speculation) applies
here too. Full CRUD for `CustomerTag` (`customer-tag.controller.ts`) plus
`POST`/`DELETE /customer-tags/:id/customers/:customerId` for assignment —
re-assigning an already-assigned tag is a no-op, not an error;
unassigning a not-assigned one is `404`. Unassign issues a real `DELETE`
against `CustomerTagAssignment` (no soft-delete column on that join
table — see schema.prisma's own comment, same "line-item shaped, hard-
delete on unassign" treatment `ProductFabric` already established).

`LeadSource` gets NO controller/service/repository of its own (unlike
`CustomerTag`) — this milestone's own brief provides a built-in fallback
(the legacy free-text `source` column), so a `LeadSource` row's absence
doesn't leave any filter unsatisfiable the way Tags' would have. Rows
exist only via seed data this milestone; `LeadRepository.findActiveLeadSourceById()`
is the one narrow existence-check `LeadService` needs to resolve a
client-supplied `leadSourceId`, reached directly rather than via a whole
separate repository — the same "check directly, don't import a module
for one narrow check" precedent `domain-module-guide.md` §18 established.

## Database

6 new tables (`LeadSource`, `CustomerNote`, `CustomerActivity`,
`FollowUpTask`, `CustomerTag`, `CustomerTagAssignment`), 2 new enums
(`CustomerActivityType`, `FollowUpStatus`), plus 2 additive nullable
columns and 1 new enum value (`ARCHIVED`) on the EXISTING `leads` table.
Migration: `20260722100000_add_crm_customer_operations` — same fix
classes as every migration since Milestone 5's own: `lead_sources`/
`customer_tags` (soft-deletable) get hand-written **partial** unique
indexes on `(tenantId, slug)`; `customer_tag_assignments`' own unique
index is correctly **plain** (no soft-delete column). New `CHECK`
constraint class: `follow_up_tasks_lead_xor_customer_check` (exactly one
of `lead_id`/`customer_id`), mirroring `quotations_lead_xor_client_check`
exactly. `customer_activities.customer_id` is **nullable** — not what a
first-pass diff off "every entity gets full audit columns" would
generate; see `CustomerActivity`'s own schema comment for why. Full RLS
+ all 3 standard policies for every one of the 6 new tables — verified
live (6/6 tables, `rowsecurity = true`, 18/18 policies). Full detail:
`docs/architecture/database-schema.md`.

## RBAC

Same `PermissionsGuard` convention as every prior domain module.
`leads:read`/`leads:write` **already existed** (Phase 1.1B's original
agency-CRM seed) — reused as-is, only their grants extended (`manager`
gains `leads:write`, it already had `leads:read`; `customer` gains
`leads:read`, matching this milestone's own "Customer+" read tier). 10
new permissions: `customer_notes:read`/`write`/`delete`,
`customer_activities:read` (no `:write` — every row is written
internally, never through a client-facing route), `follow_up_tasks:read`/
`write`/`delete`, `customer_tags:read`/`write`/`delete`.

| Tier | Roles | Grants |
|---|---|---|
| Read | `customer`, `manager`, `admin`, `super_admin` | `leads:read`, `customer_notes:read`, `customer_activities:read`, `follow_up_tasks:read`, `customer_tags:read` |
| Write | `manager`, `admin`, `super_admin` | + `leads:write`, `customer_notes:write`, `follow_up_tasks:write`, `customer_tags:write` |
| Delete | `admin`, `super_admin` | + `customer_notes:delete`, `follow_up_tasks:delete`, `customer_tags:delete` |

No `leads:delete` — this milestone's own "Lead" Controllers list has no
delete endpoint. `admin`/`super_admin` get every permission automatically
(`PERMISSIONS.map(p => p.key)`, unchanged by this milestone).

**Phase 7 addition** — `clients:read`/`clients:write` (both already
seeded since Phase 1.1B, dead until now — no new seed row needed, only
new `PERMISSION` constant entries + grants): `manager`/`sales` get both
read+write, `project_manager` keeps its pre-existing read-only grant
(consistent with its own "read-only on CRM and billing" description),
`admin`/`super_admin` get both automatically. `customer` (the
client-portal role) gets **no** `clients:*` grant — a company profile is
an internal view, not something a client-portal user browses. No
`clients:delete` key exists (none was ever seeded).

**Phase 7, Phase 2 addition** — `quotations:read`/`quotations:write`
(both already seeded since Phase 1.1B; `sales` already had both grants,
`project_manager`/`manager`/`customer` already had the read grant —
this phase added `quotations:write` to `manager` too, consistent with
the `clients:write` addition above). No `quotations:delete` key exists.

## Tenant isolation

Same structural discipline as every prior module: every repository
method takes `tenantId` as an explicit, mandatory, separate parameter,
always merged into the query by the repository itself, never trusted
from client input; `tenantId` always comes from `@Tenant()`. Extended to
every cross-entity reference this milestone introduces:
`CreateFollowUpDto.leadId`/`customerId`, `CreateCustomerNoteDto.customerId`,
`CreateLeadDto.leadSourceId` — each validated via a repository/service
existence check (own-tenant scoped) before being allowed to reference it.

## Known gap: no audit-column population

Same accepted gap as every prior module — `createdBy`/`updatedBy`/
`deletedBy`/`authorUserId`/`actorUserId` are left `null` everywhere in
this module too, for the identical reason (`RequestUser` has no
`userId`). `assigneeId` fields are unaffected — they're client-supplied
(the caller picks a specific staff user by id), not derived from the
request. See `docs/implementation/decisions.md`.

## What this module explicitly does NOT do

Email sending, SMS sending, marketing campaigns, WhatsApp integration, AI
recommendations, customer scoring, automation workflows, calendar sync,
external CRM integrations — all explicitly out of this milestone's
scope. Also not built: a standalone `LeadSource` controller (see "Why a
5th triad" above), editing a completed follow-up's own historical record
(cancel/reopen and re-create are the sanctioned paths), and any
notification/reminder for an approaching `dueAt` (this milestone's own
"Do NOT Implement" list excludes it). See
`docs/architecture/domain-module-guide.md` for the general standards this
module follows.
