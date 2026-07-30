# PdfModule (Phase 7 — Enterprise CRM/Project-Management)

`@Global()` infrastructure, same shape as `email/`/`storage/` — one
`DocumentPdfService.render(input)` that any module can inject.

## Why `pdfkit`, not the plan's original `@react-pdf/renderer` pick

The plan that scoped this phase named `@react-pdf/renderer`. Building it,
that meant introducing React/JSX into a NestJS backend that has **zero**
React anywhere — a real architectural addition (a JSX transform, a `react`
dependency, a new file convention), not just "a PDF library." `pdfkit` is
a pure, imperative Node.js PDF library — no framework dependency, no JSX,
nothing else in this backend needs to change to use it. Chosen instead as
a better fit for this phase's own "Do NOT change backend architecture
unless required" constraint. Flagged here explicitly as a deviation from
the plan, not silently swapped.

## What's real here

`DocumentPdfService.render(input: BusinessDocumentInput): Promise<Buffer>`
— one shared renderer for both Quotation (this phase) and Invoice (Phase
5): both are "line items + totals + a bill-to party" documents with no
real structural difference, parameterized by `documentLabel` ("Quotation"
vs "Invoice") and `validUntilOrDueLabel` ("Valid until" vs "Due date").
Callers build the `Buffer`, then store it via the **existing**
`StorageService.upload({key, body, contentType: 'application/pdf'})` —
`StorageService` needed zero changes; it already accepted an arbitrary
buffer/contentType, not just images.

## What this module explicitly does NOT do

No PDF templating/theming system, no multi-page pagination handling
beyond `pdfkit`'s own defaults, no logo/branding assets (plain text only)
— a real, reasonable follow-up, not silently dropped.
