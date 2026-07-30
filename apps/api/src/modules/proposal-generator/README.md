# Proposal Generator (Phase 8, Step 3)

`POST /proposal-generator/generate` — one action, no CRUD, no persistence.
Takes a lead or client (exactly one) plus a free-text requirements brief,
renders the seeded `proposal-generation-v1` prompt template (Step 2),
calls `AiService` for a real completion, and returns a structured draft:
scope, deliverables, timeline, pricing assumptions, risks, exclusions,
technology stack.

**Writes nothing to the database.** "Allow human editing before sending"
(this step's own brief) means the draft is meant to be reviewed and
copied into a real `Quotation` through the existing, unchanged
`POST /quotations` flow — this module never creates a `Quotation`/
`QuotationItem` row itself. See `proposal-generator.service.ts`'s own
header comment for why (financial line items are a commitment this
codebase already treats carefully; AI assists the draft, it doesn't
author the bill).

Gated under the existing `quotations:write` permission, not a new
AI-specific one — generating a proposal draft is the same business action
`POST /quotations` already requires that permission for.

## JSON parsing

The template instructs the model to return a single JSON object. Models
don't always comply perfectly (markdown code fences are stripped before
parsing), so the response always includes `rawText` (the model's real
output) and `parsedSuccessfully` — a caller should fall back to `rawText`
for manual editing whenever `parsedSuccessfully` is `false`, not assume
the structured fields are populated.
