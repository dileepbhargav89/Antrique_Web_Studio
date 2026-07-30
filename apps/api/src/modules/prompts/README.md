# Prompt Library (Phase 8, Step 2)

Versioned, tenant-scoped `PromptTemplate` CRUD, plus two actions:

- `POST /prompt-templates/:id/render` — pure `{{variable}}` string
  interpolation, no AI call.
- `POST /prompt-templates/:id/test` — renders, then calls `AiService`
  (`apps/api/src/ai/`) for a real completion. The one place in this module
  with a real external side effect (cost + latency).

9 real templates (one per category — proposal generation, requirement
analysis, website audit, SEO recommendations, client email, meeting
summary, scope generation, project estimation, risk analysis) are seeded
in `prisma/seed.ts`, matching every other reference-data pattern in this
codebase (LeadSource, NotificationTemplate, ...).

`version` is the same optimistic-lock counter every other model uses, not
a version-history chain — see the model's own schema.prisma comment for
why that's this codebase's deliberate reading of "versioned", not a
corner cut.

Consumed by Steps 3+ (proposal generator, requirement analyzer, ...) —
none of those should render/call AI directly; they look up the relevant
template by `key` and go through this module's own render/test path (or,
once built, their own feature-specific service that does the same thing).
