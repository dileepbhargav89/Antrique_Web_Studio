# Email Assistant (Phase 8, Step 8)

Two independent actions — not a generate/approve pair like Step 6's Task
Generator:

- `POST /email-assistant/generate` — drafts a proposal, follow-up,
  meeting request, project update, or invoice reminder email from a
  recipient name + purpose + optional key points. Renders the seeded
  `client-email-v1` template (Step 2 — updated this step for its first
  real consumer, see `seed.ts`'s own comment on the rename/JSON-contract
  change). Real AI call. Writes nothing, sends nothing. Gated
  `prompt_templates:write`, same tier as every other Phase 8 drafting
  action.
- `POST /email-assistant/send` — takes human-reviewed `to`/`subject`/
  `body` and sends it for real through the existing, unchanged
  `EmailService` ("Reuse EmailService" — this step's own brief). No AI
  call, no reference back to a generated draft required — a caller can
  send hand-written content it never ran through `generate()` at all.
  Gated under a new `emails:send` permission (not `prompt_templates:write`
  — this is a real, external side effect, the same "the real-effecting
  action gets its own tier" treatment Task Generator's `approve()` gives
  `tasks:write`).

Nothing persists — Step 8's own spec has no "store drafts" instruction
(contrast Step 7's Content Assistant), so `EmailType` is a plain TS union,
not a database enum, and there's no repository in this module at all.

`EmailService.send()` requires `html`; the AI drafts plain text, so
`send()` does a minimal, dependency-free escape + paragraph-break
conversion (`toSimpleHtml()`) rather than pulling in a markdown renderer
for what's still just paragraphs of prose.

**Real send risk:** unlike every other Phase 8 endpoint (which only ever
hits the configured `ANTHROPIC_API_KEY`), `POST /send` calls a live,
configured `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` and will genuinely
deliver an email if those are set — it was deliberately **not**
live-curl-tested during this step's own build/validation for that reason
(see `docs/implementation/progress.md`'s Step 8 entry); only
`generate()` was exercised against the real, live dev server.
