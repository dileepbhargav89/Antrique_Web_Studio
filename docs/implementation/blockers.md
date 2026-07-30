# Blockers

Anything stopping progress. Clear entries when resolved (move to a "Resolved"
section, don't delete — the history is useful).

Format:
## 🔴 <title>  (opened YYYY-MM-DD)
- **Blocks:** which task(s)
- **Needs:** what would unblock it (a decision, an account, an answer)
- **Owner:** who's chasing it

---

## Open

## 🟡 Confirm open design decisions (opened 2026-07-14)
- **Blocks:** nothing yet, but will shape schema + scope
- **Needs:** confirm (1) business model, (2) India/DPDP compliance,
  (3) beachhead vertical. See docs/README.md "open decisions".
- **Owner:** you

## 🟡 docs/product/*.md have the same swapped-content bug as docs/implementation did (opened 2026-07-16)
- **Blocks:** trusting docs/product/ filenames at face value; not currently
  blocking any in-progress task.
- **Needs:** the same remap treatment applied to docs/implementation on
  2026-07-15. Found while researching Sprint 1 schema work: every file in
  docs/product/ contains a *different* doc's content than its filename
  claims, e.g. `06-client-dashboard.md` actually holds "02 — Information
  Architecture." Worse than the implementation/ case: the real "04 — UX" doc
  appears genuinely lost (overwritten by a second copy of "01 — Product
  Discovery," not just misplaced) — 5 of 6 mislabeled files are recoverable
  by remapping, "04 — UX" is not.
- **Owner:** you

## Resolved
- **RLS's SET LOCAL contract was documented but not actually wired into
  Prisma** (opened 2026-07-30, resolved same day) — `database-schema.md`'s
  documented `SET LOCAL app.current_tenant_id` contract is now issued by
  `PrismaService`'s own `$extends` query hook + `$transaction` override
  (`apps/api/src/database/prisma.service.ts`, `tenant-rls-context.service.ts`),
  seeded by `TenantMiddleware`. Verified live (compiled build, real
  Postgres, 30-request stress test, zero errors) after fixing a real
  infinite-recursion regression found along the way (opening the wrapping
  transaction on the already-patched client instance, not a separate raw
  one). `isPlatformAdmin`/`isServiceContext` intentionally not wired — no
  live caller needs them yet. See `docs/architecture/security.md` §16.1
  and decisions.md's 2026-07-30 RLS entry for the full account.
- **Sprint 2 task list needs authoring** (opened 2026-07-15, resolved
  2026-07-26) — never re-authored from docs/product/ as originally
  planned; instead, Sprint 2's real scope was built directly from a
  session brief that closely matched the recovered real IA/Feature-Design
  content (`06-client-dashboard.md`/`05-admin-dashboard.md`, despite their
  filenames). See `docs/implementation/sprint-02.md` and
  `docs/architecture/marketing-site.md`.
- **docs/implementation files had swapped contents** (opened 2026-07-15, resolved same day)
  — every file in docs/implementation/ contained another file's content
  (progress.md had Sprint 1's list, sprint-01.md had Sprint 6's, etc.). Re-mapped
  all 9 files to the right filename and added the missing sprint-05.md. See
  decisions.md for the full mapping.
