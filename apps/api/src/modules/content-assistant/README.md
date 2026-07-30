# Content Assistant (Phase 8, Step 7)

Generates marketing/content copy — case studies, service descriptions,
blog drafts, FAQs, landing pages, social posts — from a free-text brief.

Unlike Steps 3-5 (Proposal Generator, Requirement Analyzer, Project
Estimator), which write nothing to the database, and unlike Step 6's own
`generate()` half, this step's own spec explicitly requires persistence:
**"Store drafts only. Never publish automatically."** So `POST
/content-assistant/generate` always creates a real `ContentDraft` row —
even when the model's JSON response doesn't parse cleanly, the raw text
still gets stored as the draft body rather than discarded (a real, paid
AI call's output shouldn't vanish because of a formatting slip).

Routes:

- `POST /content-assistant/generate` — one AI call, renders the seeded
  `content-generation-v1` template (Step 2) with `{{contentType}}` (a
  human-readable label derived from the `type` enum) and `{{brief}}`,
  persists the result. Gated `content_drafts:write`.
- `GET /content-assistant` / `GET /content-assistant/:id` — list/get
  drafts, paginated and filterable by `type`. Gated `content_drafts:read`.
- `PATCH /content-assistant/:id` — a human edits `title`/`body` after
  reviewing the draft. No AI call. Gated `content_drafts:write`.
- `DELETE /content-assistant/:id` — discards a draft (soft delete, same
  "never hard-delete" shape `CustomerNote` already follows). There is no
  publish route — this app has no CMS/content-publish pipeline for a
  draft to graduate into; a human copies an approved draft into wherever
  it's actually needed (a hand-authored marketing page, a real blog CMS if
  one is ever added, etc.). Gated `content_drafts:delete`.

`content_drafts:read`/`write`/`delete` are new permission keys (not a
reuse of `prompt_templates:*`) — unlike every other Phase 8 feature so
far, this one is a real, persisted resource with its own CRUD surface, so
it gets its own permission tier, same "new key when a new resource
appears" discipline Phase 7's `milestones:*`/`tasks:*`/`comments:*`
already followed. Granted to `manager`/`project_manager` (same tier as
`prompt_templates:*`); `admin`/`super_admin` get it automatically via
their full permission-set grant.
