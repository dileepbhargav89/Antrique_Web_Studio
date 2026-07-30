# Requirement Analyzer (Phase 8, Step 4)

`POST /requirement-analyzer/analyze` — multipart upload (PDF/DOCX/MD/TXT,
field name `file`, max 20MB). Extracts the document's text
(`document-text-extractor.ts` — `pdf-parse` for PDF, `mammoth` for DOCX,
plain UTF-8 read for MD/TXT), stores the original file via the existing
`StorageService` (this step's own "Reuse StorageService" instruction),
renders the seeded `requirement-analysis-v1` prompt template (Step 2) with
the extracted text, calls `AiService`, and returns a structured draft:
features, modules, risks, timeline estimate, and clarifying questions for
the client.

Same "writes no new business-entity row" design as
`modules/proposal-generator/` — the analysis is a draft for human review,
not a persisted `RequirementAnalysis` record. The uploaded document itself
IS persisted (via `StorageService`), as an audit trail of what was
analyzed.

File type is validated by extension, not the browser-supplied
`Content-Type` — MIME sniffing for `.md` in particular is unreliable
across clients. Documents longer than ~40k characters are analyzed on
their first 40k (`truncated: true` on the response), not rejected — real
requirement briefs are nowhere near that size in practice.

Gated under `prompt_templates:write` (same tier as Prompt Library's own
`test` action), not a new AI-specific permission — no lead/client link
exists on this endpoint (unlike Step 3), so there's no existing
CRM-workflow permission to piggyback on the way Step 3 reused
`quotations:write`.
