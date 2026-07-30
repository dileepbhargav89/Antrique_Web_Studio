# repositories/

Async accessors that wrap static marketing content (`content/*.ts`) behind
the same interface a future real backend implementation would use — so
when a backend `content`/`projects` module (or an FAQ/testimonial endpoint)
eventually exists, only the function body inside the matching repository
file changes. No page or component that calls a repository needs to change,
since every call site already `await`s the result.

## What's wrapped, and why

- `case-studies.repository.ts` → `getCaseStudies()` — wraps
  `content/case-studies.ts`. Backend's `projects` module is unbuilt
  scaffold (`README.md` only).
- `services.repository.ts` → `getServiceClusters()` — wraps
  `content/services.ts` (Antrique's own agency service offerings). Not the
  same thing as the backend's real `products`/`categories`/`collections`
  endpoints, which back the multi-tenant catalog product this platform is
  — those are already wired for real in `features/catalog/`, unrelated to
  this repository.
- `faqs.repository.ts` → `getFaqs()` — wraps `content/faqs.ts`. No FAQ
  concept exists in the backend.
- `testimonials.repository.ts` → `getTestimonials()` — wraps
  `content/testimonials.ts`. No testimonial concept exists in the backend;
  every entry stays demo/sample content regardless of data source.

## What's deliberately NOT wrapped

`content/industries.ts`, `content/process.ts`, `content/engineering-stats.ts`,
and `content/tech-stack.ts` are still imported directly from `content/` —
no backend module exists for these either, but nothing ever asked for them
to be abstracted (Phase 6's brief named portfolio/services/FAQ/testimonials
specifically). Wrapping content nobody asked to make swappable is scope
creep, not thoroughness — if that changes, follow the same pattern above.

## Pattern

```ts
import { CASE_STUDIES, type CaseStudy } from '@/content/case-studies';

export async function getCaseStudies(): Promise<CaseStudy[]> {
  return CASE_STUDIES;
}
```

Every marketing page that consumes one of these is already a Server
Component, so `const items = await getCaseStudies();` costs nothing extra
— no new Suspense boundary or client-side loading state required.
