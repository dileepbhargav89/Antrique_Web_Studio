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

<!-- Add new decisions above this line as you build. -->
