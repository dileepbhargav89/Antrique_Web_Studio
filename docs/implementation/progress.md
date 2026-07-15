# Progress Dashboard

The single place to see where the build is. Update at the end of every session.
Tell Claude Code: "update docs/implementation/progress.md".

## Current sprint: **Sprint 1 — Foundation**
## Current milestone: none yet → next is ◆ M1 (end of Sprint 3)

## Sprint status
| Sprint | Theme | Status |
|--------|-------|--------|
| 1 | Foundation | 🟨 In progress |
| 2 | Marketing site | ⬜ Not started (task list needs authoring — see blockers.md) |
| 3 | Conversion + CRM ◆ M1 | ⬜ Not started |
| 4 | Portal core | ⬜ Not started |
| 5 | Billing + collab ◆ M2 | ⬜ Not started |
| 6 | Admin + hardening ◆ M3 | ⬜ Not started |

Legend: ⬜ not started · 🟨 in progress · ✅ done

## In progress right now
- Sprint 1 → remaining tooling verification (pnpm install/lint/typecheck/build)

## Last completed
- Sprint 1 → Monorepo + tooling (pnpm workspaces, Turbo, TS strict, ESLint/Prettier,
  Husky + lint-staged + commitlint) — verified and committed
- Sprint 1 → Shared types + OpenAPI skeleton (packages/shared, packages/api-contract)
- Fixed docs/implementation/ files that had swapped/mismatched content (see decisions.md)

## Next 3 tasks
1. Sprint 1 → Database schema + migrations
2. Sprint 1 → RLS policies
3. Sprint 1 → Auth integration

## Notes for next session
- Confirm the open design decisions before writing the schema (see blockers.md).
- Sprint 2's task list still needs to be authored from docs/product/ — see blockers.md.
