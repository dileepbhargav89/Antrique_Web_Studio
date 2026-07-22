# Backend-internal shared code

Placeholder — describes the purpose of this directory. No implementation.

Code shared *across `apps/api`'s own modules* but not meant for any other
workspace — contrast `packages/shared`, which is cross-workspace
(frontend + backend). If something here turns out to be useful to
`apps/web` too, it belongs in `packages/shared` instead, not here.

**Relationship to `utils/`** (architecture review clarification — no code
in either directory changed): `utils/` is real and already fills the
"plain, framework-agnostic, cross-module helper" role this directory's
own description could otherwise suggest belongs here —
`utils/prisma-error.util.ts` is exactly that, and is already consumed
across multiple modules. Prefer `utils/` for a pure helper *function*.
This directory remains reserved for something broader than a single
function that still doesn't belong in `common/` (Nest-specific DI
artifacts) — e.g. a shared abstract class or a multi-function module
several business modules would extend/compose, not simply call. If a new
need turns out to be "just a function," it goes in `utils/`, not here.
