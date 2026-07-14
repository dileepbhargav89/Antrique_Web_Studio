# Contributing — Engineering Standards

The team's rulebook. Every PR is held to this. Enforced by tooling where possible
(linter, commit-lint, branch protection, CI gates); by review where not.

## 1. Naming
| Context | Convention |
|---|---|
| variables/functions | camelCase |
| types/classes/components | PascalCase |
| true constants | UPPER_SNAKE_CASE |
| component files | PascalCase.tsx |
| non-component files | kebab-case.ts |
| directories | kebab-case |
| DB tables/columns | snake_case |
| API routes | kebab-case plural |
| booleans | is/has/can prefix |
Names describe intent, not type. No unclear abbreviations. Searchable.

## 2. Folders
Feature-grouped where it aids cohesion; colocate tests/styles/stories with
components; barrels only at deliberate boundaries; shared code in `packages/shared`,
never duplicated; marketing/portal never cross-import. Follow existing patterns.

## 3. Architecture rules
One-way dependency: UI → services → repositories → DB. Respect module boundaries.
Tenant scope non-negotiable (RLS backstop). Shared validation schemas are the
source of truth. No business logic in controllers/components. OpenAPI is authoritative.

## 4. Git workflow
Trunk-based, short-lived branches. `main` always deployable and protected — no
direct pushes. Merge triggers CI/CD. Consistent rebase-vs-merge.

## 5. Branches
`feat/{ticket}-desc`, `fix/…`, `chore/…`, `hotfix/…`. Reference the ticket. Delete
after merge. No long-lived environment branches.

## 6. Commits (Conventional Commits)
`type(scope): subject` — feat/fix/chore/docs/test/refactor/perf/style/ci/build.
Imperative, lowercase. Breaking = `!` or footer. Atomic commits.

## 7. PRs
Small + focused. Green CI required. ≥1 approval (2 for security/architecture). PR
template completed. No self-merge unreviewed. Linked to a ticket.

## 8. Testing
Testing pyramid. Every feature ships with tests. E2E on login/quote/payment.
Tenant isolation explicitly tested. No flaky tests. Coverage is a signal; auth/
billing/RBAC held to a high bar. Not a final phase.

## 9. Documentation
ADRs for significant decisions. API self-documents from OpenAPI. READMEs per
module. Runbooks current. Comments explain WHY. Docs updated in the same PR.

## 10. Security
No secrets in code (scanned). Validate all input. Parameterized queries only.
Encode output. Authz server-side every request. Sensitive actions: step-up + audit.
Never handle raw card/credential data. Deps scanned. Least privilege. No PII/
secrets in logs.

## 11. Performance
CI budget gates merges (LCP≤2.5s, CLS≤0.1, INP≤200ms, bundle size). Marketing =
minimal JS. No N+1. Private data never shared-cached. Images optimized. Lists
paginated. Readability before premature optimization.

## 12. Accessibility (WCAG 2.1 AA floor)
Semantic HTML first, ARIA to fill gaps. Keyboard-operable + visible focus. AA
contrast both themes. Alt text required. Labeled forms + linked errors. Respect
reduced-motion. Never color-alone. Checked in CI + review; part of "done".

## 13. Coding
TypeScript strict; no unjustified `any`. Linter/formatter are law. SOLID/DRY/KISS,
readability over cleverness. Small single-purpose functions. No dead/commented
code, no console.log. Prefer immutability. Explicit over implicit. Consistency
outranks preference.

## 14. Error handling
Fail loud in dev, graceful in prod (helpful message, no stack trace to users).
Never swallow errors. RFC 9457 shape + trace_id. 422 per-field vs 400 malformed.
Distinguish expected vs unexpected. No sensitive data in messages. Design-system
error voice.

## 15. Logging
Structured JSON, centralized. Trace/request ID across async. Correct levels. Never
log secrets/tokens/PII. Security events → immutable audit trail. Actionable, not noise.

---
Make the right thing the easy thing; violations fail the build, not depend on memory.
