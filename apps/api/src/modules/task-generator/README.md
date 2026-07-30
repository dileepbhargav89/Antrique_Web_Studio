# Task Generator (Phase 8, Step 6)

Two actions:

- `POST /task-generator/generate` — from a milestone and/or free-text
  requirements, renders the seeded `task-generation-v1` prompt template
  (Step 2), calls `AiService`, and returns a **flat** list of suggestions
  (`type`: epic/story/task/subtask, `title`, `description`,
  `acceptanceCriteria`). No nested Epic/Story/Subtask entities exist in
  the schema and none are added here — Phase 7's real model is only
  `Project → Milestone → Task`; `type` is informational metadata a human
  reads, not a new persisted hierarchy. Writes nothing to the database.
- `POST /task-generator/approve` — the actual "Allow manual approval"
  step this spec step asks for: takes a reviewed/edited subset of
  suggestions and creates **real** `Task` rows through Phase 7's own,
  unchanged `TaskService.create()` (imported from `ProjectsModule`, not
  re-implemented). No AI call. Gated under the existing `tasks:write`
  permission — the same one `POST /tasks` already requires — not
  `prompt_templates:write`, because this route makes no AI call.

This is the one Phase 8 feature so far where "AI enhances the existing
workflow" means literally creating rows in an existing table, rather than
only ever handing back a draft for a human to copy elsewhere (Steps 3-5).
The AI-generated part (`generate`) and the persistence part (`approve`)
are still two separate calls — a human reviews between them, nothing is
auto-created from a raw model response.
