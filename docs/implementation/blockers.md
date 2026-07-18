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

## 🟡 Sprint 2 task list needs authoring (opened 2026-07-15)
- **Blocks:** starting Sprint 2 (Marketing Site)
- **Needs:** someone to write Sprint 2's goal/tasks/exit-check in sprint-02.md
  from docs/product/{02-information-architecture,03-feature-design,04-ux}.md —
  the original content was lost in the docs/implementation filename mix-up
  (see decisions.md, 2026-07-15) and could not be recovered.
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
- **docs/implementation files had swapped contents** (opened 2026-07-15, resolved same day)
  — every file in docs/implementation/ contained another file's content
  (progress.md had Sprint 1's list, sprint-01.md had Sprint 6's, etc.). Re-mapped
  all 9 files to the right filename and added the missing sprint-05.md. See
  decisions.md for the full mapping.
