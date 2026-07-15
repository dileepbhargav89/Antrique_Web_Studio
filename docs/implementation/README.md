# Implementation Tracking

Working memory of the build (separate from the design docs in `docs/product`,
`docs/architecture`, etc). Update these AS YOU BUILD — they keep Claude Code and
you aligned across sessions.

## Files
- `sprint-01.md` … `sprint-06.md` — per-sprint task lists with checkboxes + status
- `decisions.md` — running log of choices made during build (lightweight ADRs)
- `blockers.md` — anything stuck, with owner + what unblocks it
- `progress.md` — the single dashboard: what's done, in progress, next

## How to use with Claude Code
1. Start a session → tell Claude: "read docs/implementation/progress.md and the
   current sprint file, then tell me the next task."
2. Work one task → check it off in the sprint file.
3. End of session → tell Claude to update progress.md and log any decision/blocker.

Rule: these files are the source of truth for STATUS. The design docs are the
source of truth for HOW. Never let them contradict.
