# ADR-0001: Engineering Standards

**Status:** Accepted
**Date:** 2026-07-14

## Context
Before implementation, the team needs an enforceable rulebook so architecture
decisions become daily practice and quality is built in rather than retrofitted.

## Decision
Adopt the standards in `/CONTRIBUTING.md` covering naming, folders, architecture
rules, git workflow, branching, commits, PRs, testing, documentation, security,
performance, accessibility, coding, error handling, and logging.

Each standard operationalizes a prior design decision (tenant isolation, payment-
safety boundary, CWV budget, procurement-grade accessibility). Enforcement is
automated where possible (linter, commit-lint, branch protection, CI gates,
secret-scanning) and by PR review otherwise.

## Consequences
- Consistency across contributors; violations fail the build.
- Cross-cutting quality (test/a11y/security/docs) ships with each feature, not as
  a final phase.
- New joiners have one authoritative reference.
