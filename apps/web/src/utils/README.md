# Generic utilities

Pure, framework-agnostic helpers with no app-specific knowledge: `date.ts`,
`currency.ts`, `number.ts`, `url.ts`, `storage.ts`. Default locale `en-IN`
/ currency `INR`, matching the backend's own seeded tax rates (GST).

Not to be confused with `lib/`, which holds framework-adjacent glue
(`lib/utils.ts`'s `cn()` specifically exists because shadcn/ui's CLI
hardcodes that import path in every component it generates — see
`components.json`'s `aliases.utils`). If it's generic and shadcn/Next
don't care where it lives, it belongs here, not in `lib/`.
