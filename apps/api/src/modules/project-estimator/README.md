# Project Estimator (Phase 8, Step 5)

`POST /project-estimator/estimate` — takes a free-text scope of work,
renders the seeded `project-estimation-v1` prompt template (Step 2, asks
for structured JSON), calls `AiService`, and returns: estimated hours,
sprint count, recommended team size, budget range, complexity
(Low/Medium/High), dependencies, and a confidence score (0-100).

Same "writes nothing to the database" design as
`modules/proposal-generator/`/`modules/requirement-analyzer/` — an
estimate is a starting point for a human-owned business decision, not an
authoritative number this codebase auto-applies anywhere (e.g. it never
writes to a `Project`/`Quotation` row).

Gated under `prompt_templates:write` — no lead/client/project link exists
on this endpoint, so there's no existing CRM-workflow permission to
piggyback on.
