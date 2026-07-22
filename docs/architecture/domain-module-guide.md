# Domain Module Guide (Phase 1.2D.1–1.2D.3)

The standard every future business module (Auth, Users, Organizations,
Products, Orders, ...) follows, established once here rather than
re-decided per module. Companion to `backend.md` §1/§3 the same way
`configuration-guide.md` companions `configuration.md` and
`logging-guide.md` companions `logging/README.md` — this doc is the
practical "what goes where and why," not a repeat of either subsystem's
own architecture doc. Reference implementation:
`apps/api/src/modules/example-domain/` (not a real domain — copy its
shape, not its content; see its own README).

## 1. Module template — folder-by-folder

| Folder / file | What belongs here | What must never go here |
|---|---|---|
| `<domain>.module.ts` | The `@Module()` class: `controllers`, `providers`, `imports` of other modules it genuinely depends on. | Business logic, direct `PrismaClient`/`process.env` access. |
| `<domain>.controller.ts` | Route decorators, request/response wiring, delegation to the service. | Business logic, direct database access, validation logic beyond DTO/pipe declarations. |
| `<domain>.service.ts` | The module's actual behavior — one class per domain to start (split into multiple services only once one class is genuinely doing two unrelated jobs). | Route decorators, HTTP-layer concerns (status codes, headers). |
| `dto/` | Wire-shape classes: one file per request/response shape, `class-validator` decorators on request DTOs. | Domain/business logic, persistence concerns, entity classes. |
| `entities/` | Plain classes/interfaces representing a business concept, independent of both the Prisma model and any DTO. | Prisma imports, `class-validator` decorators (that's `dto/`'s job), HTTP concerns. |
| `interfaces/` | Behavioral contracts (methods) for genuine swap points only — mirrors `logging/`'s `Logger`/`AuditLogger` pattern. | Data shapes (that's `types/`), a contract for a class with no second implementation planned. |
| `types/` | Plain TypeScript aliases/utility types not covered by `dto/` or `entities/`. | Classes, decorators, anything with runtime behavior. |
| `constants/` | Real, used values only — route segments, fixed lookup tables, error codes. `SCREAMING_SNAKE_CASE` exports. | Speculative "might need this later" constants; config values (those belong in `apps/api/src/config/`). |
| `exceptions/` | Domain-specific classes extending a built-in Nest `HttpException` subclass, added only once a real failure case needs one. | Anything not extending an `HttpException` subclass — `ExceptionLoggingFilter` assumes that shape. |
| `validators/` | Custom `class-validator` decorators for rules the built-ins can't express, applied on `dto/` fields. | Business-rule enforcement (that belongs in the service). |
| `mappers/` | Pure functions/classes converting between representations (Prisma model → entity → response DTO). | Side effects, database calls, HTTP concerns. |
| `repositories/` | One repository per Prisma model this module owns, each `extends BaseRepository<TDelegate>` (`apps/api/src/database/base.repository.ts`) and injects `PrismaService` — see §16 "Repository layer." | Business logic, HTTP concerns, a second module's repository, direct `PrismaClient` construction. |
| `README.md` | What's real, what's deliberately empty, and why — every module gets one, matching this repo's existing convention (see `modules/auth/README.md` and every `config/*/README.md`). | — |

**A folder with nothing in it yet still gets created, with its own
README** explaining what belongs there and why it's currently empty —
the same "document the gap, don't fill it with placeholders" discipline
`logging/README.md` established in Phase 1.2C.1, applied here from the
start rather than re-decided per module.

## 2. Naming conventions

- Folder name = domain name, lowercase, kebab-case if multi-word
  (`example-domain/`, not `exampleDomain/`) — matches `config/`'s
  established "namespace naming" rule in `configuration.md` §2.
- File name = kebab-case, class name = PascalCase, exact match:
  `example-domain.service.ts` → `ExampleDomainService`.
- Suffix identifies the file's role: `.module.ts`, `.controller.ts`,
  `.service.ts`, `.dto.ts`, `.entity.ts`, `.interface.ts`, `.type.ts`,
  `.constant.ts`, `.exception.ts`, `.validator.ts`, `.mapper.ts`,
  `.spec.ts` — always singular, matching `apps/api/src/logging/constants/
  log-level-severity.constant.ts`'s existing precedent — one role per
  file, never combined.

## 3. DTO organization and request/response separation

- One class per file. Request DTOs: `<action>-request.dto.ts` →
  `<Action>RequestDto`. Response DTOs: `<action>-response.dto.ts` →
  `<Action>ResponseDto`. Never reuse one class for both directions, even
  when the shapes happen to match today — they drift independently the
  moment either side changes.
- A GET with no body/query params (like `ping`) has a response DTO only —
  no empty request DTO exists just to be symmetrical.
- Request DTOs carry `class-validator` decorators directly on their
  fields; a custom decorator (from `validators/`) is applied the same
  way, on the field, not as a separate pipe.
- Response DTOs never expose an entity directly — even when a mapper
  would be a straight passthrough today, the DTO class is what the
  wire contract is pinned to, independent of internal representation.

## 4. Entity organization

An entity is the module's internal representation of a business
concept — not the Prisma model (persistence shape, owned by
`apps/api/prisma/schema.prisma`) and not a DTO (wire shape, owned by
`dto/`). A service works with entities internally and only converts to
a DTO at the controller boundary, via a mapper. Until a module has real
persisted data, it has no entities — `entities/` stays a documented
placeholder (see `example-domain/entities/README.md`).

## 5. Interface placement

Add an interface only when a provider has a genuine second
implementation, present or concretely planned — the same bar
`logging/`'s `Logger`/`LogTransport`/`LogFormatter`/`AuditLogger`
interfaces were held to. Bind the concrete class to a `Symbol` token in
`constants/` or a dedicated `tokens/` file once one exists, and inject
the token everywhere outside the module. A domain service with no swap
point (the common case) is injected by concrete class directly —
`ExampleDomainController`'s constructor is the reference for this.

## 6. Mapper placement

One mapper per conversion direction that's actually needed
(`toEntity(prismaModel)`, `toResponseDto(entity)`), as pure functions or
a stateless class — never a service method, so the conversion logic
isn't tangled with database calls or HTTP concerns and stays trivially
unit-testable.

## 7. Validator placement

A custom validator is a `class-validator` `@ValidatorConstraint()` (or a
composed decorator built from existing ones) — added to `validators/`
only when a DTO field needs a rule the built-in decorators can't
express. Applied directly on the DTO field it constrains; a validator
used by only one DTO doesn't need its own file until it's needed by a
second one.

## 8. Exception hierarchy

Every custom exception extends a built-in Nest `HttpException` subclass
(`NotFoundException`, `ConflictException`, ...) — never a bare `Error`
or a hand-rolled base class. This is what makes
`apps/api/src/common/filters/exception-logging.filter.ts` (Phase 1.2C.6)
handle every domain exception correctly with zero per-exception wiring:
it already branches on `HttpException` and logs `message`/`type`/
`statusCode`/`stack` for anything in that hierarchy, and `super.catch()`
already produces the correct client-facing response shape. Add a
custom exception only when Nest's built-ins (`NotFoundException`,
`BadRequestException`, `ConflictException`, `ForbiddenException`, ...)
don't already express the failure precisely enough to be useful in logs
and API responses.

## 9. Constants organization

One `<domain>.constant.ts` file per domain to start (splits into
multiple files only once one file is genuinely doing more than one job).
Every exported constant must have a real, current use site inside the
module — no "might need this later" entries. Values that belong to
`apps/api/src/config/` (anything environment-dependent) never get
duplicated here.

## 10. Module export rules

- Export a provider from a module only when another module genuinely
  needs to inject it — `ExampleDomainModule` exports nothing, since
  nothing outside it needs `ExampleDomainService` yet.
- A module's public surface is its `exports: [...]` array, not "whatever
  happens to be a named export somewhere in the folder" — there is no
  top-level `index.ts` barrel convention for domain modules (unlike
  `config/` and `logging/`, which are cross-cutting infrastructure
  consumed everywhere; a domain module's consumers are limited to
  `AppModule` and, later, other domain modules that declare a real
  dependency on it).
- A business module may depend on `DatabaseModule`/`AuthModule` once
  those exist (see `backend.md` §3's "Phase 1.2B+ shape"), but domain
  modules never depend on each other directly — shared needs go through
  `shared/`/`common/` or an explicit, intentional provider export,
  avoiding the circular-dependency trap DI-heavy Nest apps are prone to.

## 11. Dependency injection rules

- **Constructor injection only** — no property injection, no
  `moduleRef.get()` service-locator patterns.
- **Providers are private by default.** A provider is only exported if
  a real external consumer needs it (see §10).
- **No unnecessary providers.** `ExampleDomainModule` registers exactly
  the one service its one controller needs — nothing speculative.
- **Interfaces resolved through tokens only when necessary** — see §5.
  Most domain services are injected by concrete class.
- **No circular dependencies.** Verified for this phase: `example-domain/`
  depends on nothing but `@nestjs/common`; no other module depends on it
  (only `AppModule` imports it, the expected root wiring every domain
  module gets).

## 12. Import rules

- A domain module's files import from its own subfolders, from
  `apps/api/src/config` / `apps/api/src/logging` (the two established
  cross-cutting barrels), and from other domain modules only when a
  real, declared dependency exists (see §10). Never reach into another
  domain module's internal files directly (e.g. `../auth/auth.service`
  instead of importing `AuthModule` and letting Nest's DI resolve it).
- Never import from `apps/api/src/config/<domain>/<domain>.config`
  directly — always through the `apps/api/src/config` barrel, per
  `configuration.md`'s existing "Import convention."

## 13. Extension guidelines — adding a real domain module

1. Copy `apps/api/src/modules/example-domain/`'s folder shape into
   `apps/api/src/modules/<domain>/` (most of these six folders already
   exist as placeholders from Phase 0 — replace their placeholder
   `README.md` as real content lands, don't leave both).
2. Write the real `<domain>.module.ts`/`.controller.ts`/`.service.ts`,
   following §1–§9 above for what goes in each subfolder.
3. Add real DTOs before any controller method that needs one — never
   accept/return a raw entity or Prisma model at the HTTP boundary.
4. If the module needs persistence, add a `repositories/<domain>.repository.ts`
   extending `BaseRepository` (see §16) and inject `PrismaService`
   *there only* — the service injects the repository, never
   `PrismaService` directly (`DatabaseModule` is `@Global()`, so no
   import is needed to reach it).
5. Register the module in `app.module.ts`'s `imports` array, following
   the same comment style already there.
6. Update the module's own `README.md` to describe what's real (mirror
   `example-domain/README.md`'s structure: "What's real here" / "What's
   deliberately empty").
7. Ship tests alongside the implementation — CLAUDE.md's standing rule,
   already applied to every other subsystem in this codebase.

## 14. Why no CommonModule this phase

The brief allowed for a `CommonModule` "if required." Nothing in this
phase needs one: `apps/api/src/common/{filters,middleware}` are already
wired directly into `AppModule` (Phase 1.2C.5/1.2C.6, not via a shared
NestJS module), and `ExampleDomainModule` has no cross-domain
abstraction to share yet. Introducing an empty `@Module({})` now would
be exactly the kind of speculative scaffolding this project's standing
discipline avoids (see `logging/README.md`'s "document the gap, don't
fill it with placeholders," Phase 1.2C.1). Revisit once a second real
domain module needs to share something concrete (a base DTO) that
doesn't belong to any single domain — a common guard turned out not to
be that trigger after all: `JwtAuthGuard` (Milestone 2,
`apps/api/src/common/guards/`) needed no `CommonModule`, since Nest
resolves a guard referenced by class in `@UseGuards()` through its own
DI container automatically, cascading up to whatever global module
provides its dependencies (`TokenService`, `@Global()`).

## 15. Example implementation

`apps/api/src/modules/example-domain/` is this guide made concrete:
`GET /example/ping` → `JwtAuthGuard` (Milestone 2 — `401` without a
valid access token) → `ExampleDomainController.ping()` (reads
`@CurrentUser()`) → `ExampleDomainService.ping(authenticatedAs)` →
`new PingResponseDto(authenticatedAs)` → `{ "status": "ok",
"authenticatedAs": "..." }`. Read its `README.md` first, then the six
real source files (module, controller, service, DTO, constant,
repository) and their three spec files (controller, service, and
repository — the module itself has none, matching every other
`.module.ts` in this codebase), then the six placeholder-folder READMEs
— in that order it demonstrates every rule in this doc with nothing left
implicit.
`repositories/example.repository.ts` is deliberately NOT wired into
`ExampleDomainService` — see §16 and the module's own README for why.
`JwtAuthGuard`/`@CurrentUser()` themselves aren't this module's own
code — see `common/guards/README.md`/`common/decorators/README.md`.

## 16. Repository layer

`BaseRepository<TDelegate>` (`apps/api/src/database/base.repository.ts`,
Phase 1.2D.3) is generic CRUD infrastructure — `findOne`/`findMany`/
`create`/`update`/`delete`/`count` (the last added Milestone 5, once
`CategoryRepository`/`CollectionRepository`/`ProductRepository` all
needed a paginated-list total count simultaneously — a genuine,
multi-repository need, not anticipation) — every repository extends. It
depends only on the Prisma model delegate passed to its constructor
(e.g. `prisma.setting`), never on `PrismaService`/Nest's DI container
directly; a concrete repository is what's `@Injectable()` and
constructor-injects `PrismaService`, then hands `BaseRepository` the one
delegate it owns.

- **One repository per Prisma model, living in its owning domain
  module's `repositories/` folder** — `modules/<domain>/repositories/
  <model>.repository.ts`, never in `apps/api/src/database/` itself
  (that folder holds only the shared `BaseRepository` abstraction and
  `PrismaService`, not any domain's concrete repositories — the same
  "one domain = one folder" boundary `configuration.md` §2 established
  for config namespaces).
- **Services never inject `PrismaService` directly.** A service that
  needs persistence injects its module's repository; the repository is
  the only class allowed to inject `PrismaService`. This is the
  enforced Service ↔ Repository boundary — checked by grep across
  `apps/api/src` during this phase's review (confirmed: no service
  anywhere injects `PrismaService`) and worth re-checking whenever a
  real repository lands.
- **A repository never contains business logic** — validation,
  authorization, cross-entity orchestration, and anything domain-
  specific belong in the service, not the repository. The repository's
  job is exactly the five generic operations `BaseRepository` provides,
  plus (once genuinely needed) thin, model-specific query methods that
  are still just Prisma calls with no business rules inside them.
- **No transactions, no query builders, no caching, no model-specific
  helpers in `BaseRepository` itself.** A genuine need surfacing across
  multiple real repositories (Phase 1.2D.4+) is what justifies adding
  one there — not anticipation now (the same discipline this project
  has applied everywhere else: `logging/`'s `decorators/`/`utils/` were
  never speculatively created either, see `logging/README.md`).
- **Testing:** `BaseRepository` and concrete repositories depend only on
  a plain delegate/service object, so they're unit-tested with a mock —
  no live Postgres connection needed (unlike `PrismaService` itself,
  see `database/README.md`'s "Why `PrismaService` has no `.spec.ts`, but
  `BaseRepository` does"). Real type safety — not just structural
  acceptance of anything satisfying the loose `any`-based constraint —
  is worth a compile-time `@ts-expect-error` check per repository
  (`example.repository.spec.ts` is the reference: confirmed, by actually
  typechecking, that a field not on `Setting` is rejected), the same
  pattern `audit-logger.service.spec.ts` already established for
  `AuditEvent`'s immutability.
- **Tenant-scoped queries take `tenantId` as a plain method parameter,
  never a constructor-injected config value** (Milestone 4 — Organization
  & Multi-Tenant Foundation). `AuthRepository`/`RoleRepository`/
  `PermissionRepository` all originally injected a fixed `defaultTenant`
  config value (Milestones 1/3, a stopgap before real tenant resolution
  existed); Milestone 4 refactored every one of them to accept `tenantId`
  as an explicit argument instead, sourced by the calling service from
  the request's resolved `TenantContext`
  (`apps/api/src/tenant/README.md`, read via `@Tenant()` in a controller
  or `request.tenantContext` directly in a guard). A repository stays a
  plain, request-agnostic class either way — this is about *where the
  tenant boundary's value comes from*, not adding request-awareness to
  the repository layer itself. Any future repository scoping a query by
  tenant should follow this same shape:
  `findSomething(arg, tenantId: string)`, never `@Inject(someConfig.KEY)`
  for a value that varies per request.
- **A method that passes `include`/`select` to a delegate call must NOT
  go through `BaseRepository`'s inherited `create()`/`update()`/
  `findOne()`** (Milestone 5, found while building `ProductRepository`).
  Those inherited methods are typed via `Parameters<TDelegate['create']>`/
  `ReturnType<TDelegate['create']>` at the `BaseRepository` class
  definition — a type-level operation on a still-generic Prisma method
  signature, which TypeScript cannot resolve against a *specific* call's
  `include` argument, so it silently collapses to the relation-less
  default shape (confirmed via `pnpm typecheck`: `product.variants`
  genuinely didn't exist on the inferred type, despite existing at
  runtime). The fix is a plain, explicitly-named custom method on the
  concrete repository (e.g. `ProductRepository.createWithRelations()`)
  that calls `this.delegate.create({ data, include })` directly, inline,
  with a literal args object — an actual call expression, not a
  `ReturnType<>` trick, lets TypeScript's normal generic inference work
  correctly and infer the real, relation-including return type. See
  `modules/catalog/repositories/product.repository.ts`'s own comment.
- **"One repository per Prisma model" applies to models with their own
  independent lifecycle — a nested/join-only model with no standalone
  repository of its own is legitimately queried through a sibling
  model's repository** (Milestone 6, `StyleOptionRepository`/
  `ProductCustomizationRepository`). `StyleOptionGroup` and
  `StyleOptionIncompatibility` have no dedicated repository (neither has
  independent CRUD this milestone), so
  `StyleOptionRepository.findGroupById()`/`setIncompatibilities()`/
  `findIncompatibilities()` reach `this.prisma.styleOptionGroup`/
  `this.prisma.styleOptionIncompatibility` directly — a small, deliberate
  exception, not a violation of the rule above, since there is no "real"
  repository for either model to bypass. The same reasoning covers a
  repository class NAMED after a model it doesn't directly target:
  `MeasurementRepository` targets `MeasurementProfile` as its aggregate
  root (per this milestone's own brief, which names the repository after
  the nested child `Measurement` while the controller is named after the
  parent `MeasurementProfile`) — read this as a naming choice to honor
  literally, not evidence the class is wired to the wrong model.

## 17. Cross-entity tenant-ownership validation beyond one hop

Milestone 5's `ProductService.assertReferencesBelongToTenant()`
established the pattern for a single client-supplied foreign id
(`categoryId`/`collectionId` must resolve to a row owned by the caller's
tenant — a bare Postgres FK only checks existence, not tenant ownership).
Milestone 6 extends this to a **multi-hop** chain:
`StyleOptionService`/`ProductCustomizationService` validate that a
`styleOptionId` belongs not just to the caller's tenant, but to a
SPECIFIC product's customization — `styleOption → styleOptionGroup →
productCustomization → productId`, three joins deep
(`assertIncompatibleOptionsBelongToSameProduct()`/
`assertStyleOptionBelongsToCustomization()`). The shape is the same
either way: resolve the referenced row via its own repository, then
compare the resolved parent id against the expected one, and reject with
a `BadRequestException` (not a silent no-op) when they don't match. A
future domain with its own multi-hop reference should follow this same
pattern rather than inventing a new one.

## 18. Cross-module reference validation: reuse a module export, or check directly? (Milestone 7)

Milestone 6 established "export the referenced repository, import the
module" (`CatalogModule` now `exports: [ProductRepository]`,
`BespokeModule` imports it) as the pattern for validating a single
cross-module foreign reference. Milestone 7 needed to validate TWO —
`ProductVariant` (from catalog, which has no repository of its own at
all — see `catalog/repositories/product.repository.ts`'s own comment)
and `Fabric` (from bespoke, which does). Importing both `CatalogModule`
and `BespokeModule` purely to run two narrow `findFirst({ select: { id:
true } })` existence checks was judged not worth the added cross-module
coupling, especially since one of the two entities (`ProductVariant`)
has no repository to import in the first place. Instead,
`InventoryRepository`/`SupplierRepository` each define their own small
`productVariantExistsForTenant()`/`fabricExistsForTenant()` methods,
reaching `this.prisma.productVariant`/`this.prisma.fabric` directly — the
same "reach into a sibling table with no repository of its own" exception
§16 already documents, just applied to tables in OTHER modules' domains,
not the current one.

**When to reuse a module's export vs. check directly:** reuse an export
when there's a real repository with real behavior worth sharing (Milestone
6's `ProductRepository` — used for more than existence checks elsewhere
too) and the coupling is 1:1 (one importing module, one exported
repository). Check directly, from your own repository, when the
"dependency" is genuinely just "does this id exist for this tenant" and
importing the owning module would add a cross-module edge for a
three-line query. Neither is universally "more correct" — pick based on
how much real behavior is actually being shared, not by pattern-matching
the previous milestone's own choice.

## 19. Threading one transaction across module boundaries (Milestone 8)

Milestone 8's `OrderService.create()`/`changeStatus()`/`cancel()` each
need to write `Order`/`OrderItem`/`OrderStatusHistory` rows AND mutate
`InventoryReservation`/`InventoryItem` counters (via `InventoryService`,
a DIFFERENT module) as one atomic unit — "Execute everything within a
single transaction" (create) and the equivalent atomicity requirement for
cancel/complete. Every prior module's own transactions
(`ProductRepository.findManyPaginated()`'s array-form `$transaction`,
Milestone 7's `InventoryRepository.applyStockChange()`) stayed entirely
inside one repository. This is the first milestone where the transaction
boundary has to cross a module import.

The shape that makes this possible without either module reaching into
the other's internals: `OrderRepository.runInTransaction(work)` is a
thin wrapper around `this.prisma.$transaction(work)` that hands the
`Prisma.TransactionClient` back to the CALLING SERVICE (`OrderService`),
not to `InventoryRepository`. `OrderService` then passes that same `tx`
into every `InventoryService` call it makes inside the callback
(`reserveStockForOrder(..., tx, ...)`, `releaseReservation(..., tx)`,
`consumeReservation(..., tx)`) — all three gained an explicit
`tx: Prisma.TransactionClient` parameter this milestone
(`reserveStockForOrder`'s is required, since it only ever runs inside
`OrderService.create()`'s own transaction; `releaseReservation()`/
`consumeReservation()`'s stay optional, since Milestone 7's own
standalone `POST /inventory/:id/reserve`-adjacent routes still call them
without one). `InventoryService`/`InventoryRepository` never call back
into `OrdersModule`, and `OrderRepository` never reaches into
`this.prisma.inventoryItem` directly — the transaction client is the
only thing that crosses the module boundary, not a repository reference.
Every actual `tx.<model>.<method>()` call still lives in a named
repository method on ITS OWN module's repository
(`OrderRepository.createInTx()`/`InventoryRepository.reserveStock()`
called with `tx`), preserving "repositories must not contain business
logic" / "business rules remain in services" even though the transaction
itself spans two modules' worth of writes.

**Why not have `InventoryService` open its own transaction and have
`OrderService` call it, uncoordinated?** Two separately-opened
transactions can't roll back together — a crash between them would leave
a reservation with no order, or an order with no reservation. Threading
one `tx` through both call sites is what makes the combined operation
genuinely atomic, not just sequential.

## 20. Reusing a previously-unconsumed entity across a milestone boundary (Milestone 9)

Every prior "architecture audit" in this project (Milestones 3, 4, 7,
and now 9) has found schema that already exists but has zero
application-layer consumers, and reused it rather than modeling a
parallel entity. Milestone 9 is the sharpest version of this yet:
`Lead` (Phase 1.1A) was fully modeled — fields, relations, indexes — but
had no repository/service/controller anywhere, and this milestone's own
"Core entities" list names `Lead` as something to check for and reuse.
The discipline this establishes: when a later milestone's OWN business
rules imply a NEW relationship an older, reused entity doesn't have yet
(here: "Convert Lead → Customer," a conversion target that didn't exist
when `Lead` was first modeled), the fix is an ADDITIVE nullable column
on the existing model, never a parallel new model that duplicates the
old one's fields to add the one new relationship. `Lead` gained
`convertedCustomerId` (nullable, new) while `convertedClientId`
(non-null-capable, pre-existing) stayed completely untouched — two
independent conversion targets living on the same row, not a schema
fork. The test for whether this is the right move: does the OLD
relationship still make complete sense unmodified? Here, yes —
`Client`-bound lead conversion (the original agency-CRM flow) has
nothing to do with `Customer`-bound lead conversion (this milestone's
own e-commerce-CRM flow); they're two genuinely different business
processes that happen to share the same funnel entry point (`Lead`),
not one process that needed "fixing."

**Corollary — don't let "reuse the entity" become "reuse the entity's
existing shape uncritically."** Milestone 9 almost shipped
`CustomerActivity.customerId` as required (matching its own
`Customer`-prefixed naming convention) before realizing that violated
its OWN explicit "lead creation" trigger — that entity is genuinely new,
not reused, so its own naming pattern doesn't automatically make its
shape correct; the requirement text is what settles it. See
`docs/implementation/decisions.md` for the full trace of catching and
fixing this before anything downstream depended on the wrong shape.

## 21. Relaxing a required column to nullable — additive when it genuinely is (Milestone 10)

§20 covered ADDING a nullable column to a reused entity. Milestone 10
went one step further, twice: `Invoice.clientId` and `Payment.invoiceId`/
`provider`/`providerRef` all went from required to nullable — an edit to
an EXISTING column's own constraint, not just a new one alongside it.
This is still additive, but the test for whether it's safe is different
and worth naming explicitly: relaxing `NOT NULL` → nullable is
backward-compatible if, and only if, nothing yet depends on the column
always being present. Both cases here passed that test the same way —
the architecture audit's own "zero application-layer consumers" finding
is what made it safe: no `InvoiceService`/`PaymentService` existed to
have ever relied on `clientId`/`invoiceId` being guaranteed non-null, so
there was no existing read path to break. The reverse edit (tightening
nullable → required) is NOT this same kind of safe-by-construction
change even under an identical "zero consumers" finding — a column that
already has real, unconstrained NULL rows in a live database can't be
made required without either backfilling or accepting data loss; that's
a different, harder migration this project hasn't needed yet.

**The same requirement-driven reasoning as every other reuse decision in
this arc applies to the relaxation itself, not just the new columns it
enables:** `Payment.provider`/`providerRef` becoming nullable isn't
"loosening validation for its own sake" — it's what makes "Record
payment" (a manually-logged payment with no gateway involved)
representable at all under a model whose ORIGINAL shape assumed a
gateway was always present. Relaxing a constraint without a concrete,
named business rule driving it would be the kind of unrequested
loosening CLAUDE.md's own "don't add validation/abstractions for
scenarios that can't happen" warns against in the opposite direction —
here it's the same principle applied to REMOVING a constraint no longer
universally true, not adding one.

## 22. Cross-module read-only aggregation, and reusing an aggregator rather than re-deriving it (Milestone 11)

§18/§19 covered a module reaching into ONE other module's export for a
validation check or a transaction-threaded write. Milestone 11's
`DashboardService` is the same "import the module, use its export"
discipline applied at a different scale: FIVE sibling modules
(`OrdersModule`/`InventoryModule`/`BillingModule`/`CrmModule`/
`CatalogModule`) imported into ONE new module purely for READ-only
analytics, each reached through whatever it had ALREADY exported for a
prior milestone's own reason (`OrderRepository`, exported for
Milestone 10's "Create Invoice from Order"; `InventoryService`, exported
for Milestone 8's stock reservation; `InvoiceRepository`, exported for...
this milestone itself — the first genuinely NEW export this arc adds
purely for aggregation, not a prior milestone's write path). The
discipline this establishes: when a new aggregate-query need appears,
extend the artifact a module ALREADY exports (a new method on an
existing exported repository/service) rather than exporting a second,
narrower thing or reaching around the export boundary with a direct
`PrismaService` query from the consuming module. `InvoiceRepository.
getOutstandingSummary()`/`getCollectionSummary()`,
`OrderRepository.getRevenueSummary()`, and
`InventoryService.getStockValuation()`/`getLowStockItems()` all followed
this shape — new methods on already-exported classes, not new exports,
not new modules-within-modules.

**Corollary — a downstream feature that needs the same computation
reuses the aggregator, it doesn't re-derive it.** `ReportingService.
generate()` needed the exact same per-module KPI numbers
`DashboardService.getKpis()` already computes, to snapshot them into a
`ScheduledReport` row. The discipline: `ReportingService` depends on
`DashboardService` directly (both are providers of the SAME module —
`AdminModule` — so this needs no export/import round-trip, unlike the
cross-MODULE reuse above) and calls its public method, rather than
writing a second implementation of "sum orders, compute average" that
would silently drift from the first the next time either one changes.
This is the same "Never duplicate calculations already available
elsewhere" instruction Milestone 11's own brief states explicitly,
generalized: *within* a module, one computation should have exactly one
owner, reached by every caller that needs it — a peer service, not a
copy.

**Corollary — a named-but-unimplemented item in your own constant is the
same "dead capability" mistake as a route-less service method.**
`DASHBOARD_KPI_MODULES` (this module's own allowlist constant) was
written with 5 entries (`orders`/`inventory`/`billing`/`crm`/`catalog`)
even though this milestone's own "Cross-Module Integration" analytics
list names only 4. Leaving `catalog` in the constant but unimplemented
in `DashboardService` would have meant `GET /dashboard/kpis/catalog`
silently 400ing forever — the same class of gap Milestone 9's own
`LEAD_CREATED` reachability audit caught (see §20) and Milestone 7's own
`consumeReservation()` precedent deliberately chose to leave open only
because NO caller existed yet (not because a caller was actively told
the value was valid). Since the constant already told API consumers
`catalog` was a valid module, the fix was to implement it, not to
quietly shrink the constant back down to 4 — the same "implement it
since a real, present-tense signal (the constant itself) already
promised it" reasoning §20's "add a route" branch uses, applied to a
config allowlist instead of a controller route.

## 23. Optimizing without redesigning: batch instead of loop, push a predicate into SQL when the ORM can't express it, cache only what safely tolerates staleness (Milestone 12)

Milestone 12 (Performance Engineering) touched more files than any prior
milestone without adding a single new business rule, route, or schema
change — its own explicit brief: "Optimize the current implementation
only." Three narrow, reusable techniques did almost all of the real work;
naming them here so a future performance pass reaches for the same shapes
first, rather than re-deriving them.

**Batch a per-item existence/lookup loop into one query, keyed by the
caller's own item list.** The recurring anti-pattern this milestone found
repeatedly: `for (const item of items) { await repo.findX(item.id) }` — N
round trips to resolve or validate N items, when every item's own lookup
is independent of every other's. The fix is always the same shape: a new
repository method taking `ids: string[]` and returning `findMany({ where:
{ id: { in: ids } } })` (or, for a pure existence check, a minimal
`select: { id: true }` projection reduced to a `Set<string>`), called ONCE
before the loop, with the loop itself reduced to a `Map.get()`/`Set.has()`
— zero I/O, same per-item error semantics preserved by checking the
batched result against each original item. `ProductRepository.
findVariantsByIds()`/`findExistingIds()` are this milestone's own two
instances (consumed by `InvoiceService`/`OrderService`/`FabricService`).
**Not every loop is this anti-pattern** — a loop of independent WRITES
(each its own business mutation that must commit atomically with a
surrounding transaction, like `OrderService.create()`'s own per-item
inventory-reservation loop) is correctly sequential, not an N+1; batching
READS this way is safe specifically because reads have no ordering/atomicity
requirement between them.

**When a query needs a predicate Prisma's query-builder genuinely can't
express, push it into a raw SQL query — don't fetch everything and filter
in application code.** `InventoryRepository.findLowStockItems()`'s own
`onHand <= reorderPoint` is a column-to-column comparison; Prisma's
`where` API has no operator for it. The WRONG fix (what Milestone 11
originally shipped, corrected this milestone) is `findMany()` over every
candidate row, then `.filter()` in Node — for a reference table where most
rows don't match the predicate, this transfers and materializes far more
data than the query actually needs. The right fix is `$queryRaw` with the
real predicate in the `WHERE` clause. This is safe in this codebase
specifically because Prisma 7's `@prisma/adapter-pg` driver adapter
returns genuine `Prisma.Decimal`/`Date` instances from raw queries —
confirmed live before committing to the approach — identical to what the
query builder itself returns, so no downstream mapper needs to change and
no precision-loss risk exists. Column-alias every raw `SELECT` to the
exact camelCase field names the existing response mapper already expects
(see that method's own comment) — matching the FULL Prisma model shape,
not just the fields the mapper happens to read today, is what lets the
existing, unmodified mapper keep working. This remains the ONLY raw-SQL
query pattern in this codebase — reach for it only when the query-builder
genuinely cannot express the predicate, confirmed by trying, not assumed.

**Cache only what genuinely tolerates staleness, and say so in the same
breath as the TTL.** `CacheService` (new, `apps/api/src/cache/`) is
generic — nothing about the class itself limits what it caches. The
discipline lives entirely in WHERE it gets applied:
`AuthorizationService`'s own role/permission resolution qualifies because
role grants change rarely and nothing in this codebase currently mutates
them at runtime at all (no live `RoleController` exists); a candidate that
already has a live write endpoint (`TaxRate` via `TaxRateController`, for
instance) was deliberately NOT cached this milestone, because a TTL-only
cache in front of a live write path can serve a genuinely stale value for
up to the TTL window after a real edit — a correctness regression, not an
optimization, unless real invalidation is wired into the write path at the
same time. The test before caching anything: does a write endpoint for
this data exist RIGHT NOW, and if so, does this change also wire
`cache.deleteByPrefix(...)` into it? If the answer to the second question
would be "not this milestone," the answer to the first question is "don't
cache it yet" — see `docs/architecture/performance.md` §1.2/§5 for the
full audit trail of which candidates passed and which didn't.

## 24. Security hardening without redesign: prefer the cross-cutting mechanism that already exists, verify security claims against real source, treat "presence in the tree" and "reachable by this app" as different questions (Milestone 13)

Milestone 13 (Security Hardening) touched bootstrap, guards, JWT signing,
and dependency configuration without adding a single new business rule,
route, or schema change — its own explicit brief: "no domain-model
redesign." Three reusable disciplines did most of the real work; naming
them here so a future security pass reaches for the same shapes first.

**When cross-cutting code (guards, auth services) needs a new capability,
prefer an already-existing, already-global mechanism over reaching into a
downstream module — even when the downstream module already does something
that looks like what you need.** This milestone needed audit logging for
login/refresh/permission-denial, all of which live in `AuthModule`/
`common/guards/` — cross-cutting code imported by nearly every other
module. `AdminModule` already owned a DB-persisted `AuditLog` table with
exactly the right shape, but depending on it from `AuthModule`/`guards/`
would invert this codebase's one-directional dependency DAG (business
modules depend on `Auth`/`Database`, never the reverse — §3's own
established rule). The fix was to use the OTHER audit mechanism that had
sat fully built and completely unused since Phase 1.2C.8
(`AUDIT_LOGGER`/`AuditLoggerService`, structured-log-only) — the same
"build the capability, wire it up when the moment is right" pattern
`PerformanceLogger` demonstrated in Milestone 12 (§23). The cost is real
and was documented, not hidden: two audit trails now exist
(structured-log vs. DB-persisted) and are not unified into one queryable
source — see `security.md` §9. That's the honest trade a "no redesign"
constraint buys: a clean dependency graph today, at the cost of a follow-up
unification task if a future milestone decides the two audit trails need
to become one.

**A security claim about "is this safe" is only as good as its verification
against the actual installed source, not the library's documented/assumed
behavior.** This milestone's error-handling review didn't stop at "NestJS
probably doesn't leak stack traces" — it read `BaseExceptionFilter`'s
actual installed `handleUnknownError()` implementation, found the precise
`isHttpError()` duck-type condition that decides what gets returned, then
wrote a throwaway script confirming Prisma's own error classes don't
satisfy that condition. The JWT algorithm-pinning work did the same:
before assuming `jsonwebtoken`'s defaults were unsafe, a live test
confirmed they already rejected `alg: none` — meaning the fix that got
shipped (explicit `algorithms: ['HS256']`) is defense in depth against a
real-but-different gap (accepting a *different legitimate* algorithm like
HS384 signed with the right secret), not a fix for a vulnerability that
never existed. Guessing either answer from documentation or general
JWT/NestJS knowledge would have produced a plausible-sounding but
unverified claim in `security.md` — reading the actual dependency source
(or writing a two-line script against it) is what turns "should be safe"
into "confirmed safe, here's why."

**A dependency-audit finding's presence in the tree and its reachability
by this app's own code are different questions — answer both before
deciding whether to fix, override, or defer.** `pnpm audit` returned 16
findings; naively "fixing" all of them (version-bumping or overriding every
flagged package) would have risked breaking dev tooling (a blanket `glob`
override would have force-upgraded Jest's own deeply-nested `glob@7.2.3`
dependents) for zero runtime benefit, since most of the 16 turned out to be
dev-only tooling (`@nestjs/cli`'s own build chain, `autocannon`'s benchmark
tooling, `prisma`'s dev server) or runtime code paths this app never
exercises (`@nestjs/core`'s SSE stream — zero `@Sse()` routes anywhere;
`qs.stringify()` — confirmed by search that this app never calls it, only
`qs.parse()` via body-parsing). The two overrides that WERE applied
(`multer`, `lodash`) were verified via `pnpm why` to resolve to one
consistent version tree-wide first — an override is only safe once you've
confirmed it won't silently split a package into two conflicting installs.
The general test: for every flagged package, ask "does this app's own code
— not the dependency tree in the abstract — ever execute the vulnerable
code path," and only override/upgrade when the answer is yes or the fix is
free (no compatibility risk). See `security.md` §11 for the full
per-finding table this produced.

## 25. Production-readiness patterns: an unrun code path drifts silently, peer-version mismatches need active resolution, and "infrastructure exists" is only true once something real depends on it (Milestone 14)

Milestone 14 (Production Infrastructure) found a real, previously-
undetected bug: `infrastructure/docker/api.Dockerfile`'s `runtime` stage
`CMD` pointed at `dist/main.js`, which has never existed — `tsconfig.json`'s
own multi-root `include` makes `tsc` emit under `dist/src/`.
`apps/api/package.json`'s own `start` script had this EXACT bug, found and
fixed during the Phase 1 production-readiness audit (`decisions.md`,
"2026-07-17"). The Dockerfile had the same bug, undetected for the entire
time since, for one reason: **nothing had ever actually run the `runtime`
stage end to end.** A code path that compiles, lints, and typechecks
cleanly can still be silently wrong if nothing ever executes it — the fix
that landed in one place (the `start` script) doesn't propagate to another
place expressing the same fact (the Dockerfile's `CMD`) unless something
forces both to be exercised. The lesson: when a milestone's own brief asks
to "validate" an artifact (a Dockerfile, a CI workflow, a health check), the
validation that matters is actually RUNNING it, not just reading it for
plausibility — this milestone's own live Docker-adjacent smoke test (a real
`node dist/src/main.js` boot, hitting the real routes) and the new
`docker-build` CI job exist specifically to make this class of drift
impossible to reintroduce silently a second time.

**A peer-dependency version mismatch needs to be actively resolved, not
silently accepted.** `pnpm add @nestjs/swagger` installed v11 by default —
the current major version on npm — which immediately warned about an unmet
peer (`@nestjs/common@^11.0.1`, this app runs `10.4.22`). The fix wasn't to
ignore the warning (a real risk: a major-version-ahead package can call
internal APIs the installed framework version doesn't have, failing at
runtime rather than install time) but to explicitly install the version
line that actually matches this app's own framework version
(`@nestjs/swagger@^7`, the last major supporting Nest 10) — checked before
writing a single line of code that depended on it. The general rule: a
peer-dependency warning at install time is a correctness signal, not
noise to scroll past — verify which major version actually targets your
framework's own installed major version before building on top of it.

**Infrastructure "existing" and infrastructure being load-bearing are
different claims — this milestone made several existing-since-earlier
capabilities load-bearing for the first time, and that's precisely when
their real behavior gets proven.** `PrismaService.isHealthy()` (Milestone
12) had zero callers until `HealthService` called it this milestone;
`RequestContextService`'s correlation-id propagation (Phase 1.2C.4) had
been "proven" only by its own unit tests until this milestone's live smoke
test showed the SAME `requestId` threading through a real
`Slow database query` warning, an `HTTP request completed` log, and an
`Unhandled exception` log for one real HTTP request end to end. Both were
already correct — but "correct per its own tests" and "confirmed correct
under a real, multi-layer call chain" are different levels of confidence,
and a production-readiness milestone is exactly the point where the gap
between them should be closed with a real exercise, not assumed closed
because the capability was built carefully once.
