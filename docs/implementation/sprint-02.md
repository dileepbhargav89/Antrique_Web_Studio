# Sprint 2 — Marketing Site

**Goal:** Ship the real, public, SEO-indexed marketing site.
**Design refs:** docs/product/06-client-dashboard.md (real IA content,
despite the filename — see decisions.md 2026-07-15), docs/product/05-
admin-dashboard.md (real Feature/Page Design content, despite the
filename).

## Status: ✅ Done

> This sprint's own task list file was lost in the 2026-07-15 filename/
> content mix-up and was never recovered (see blockers.md, now resolved).
> Rather than block on re-authoring it from scratch, the sprint's real
> scope was delivered directly from a session brief that closely matched
> the recovered real IA content — see
> `docs/architecture/marketing-site.md` for the full build and
> `docs/implementation/progress.md`'s Marketing Website log entry for the
> summary. Validation (typecheck/lint/build) could not be completed this
> session due to a tool-execution outage — see that log entry's own note.

## What shipped
- [x] Home, Services, Industries, Work (Portfolio), About + About/Process,
      Pricing, Resources, Blog (listing + detail), FAQ, Contact, Quote,
      Privacy, Terms — 15 real routes under `app/(marketing)/`.
- [x] Content data layer (`src/content/`) — services/industries/process/
      tech-stack/engineering-stats/pricing-tiers/faqs/blog-posts.
- [x] SEO wired for real — `lib/seo/metadata.ts` bridges the
      already-specified `RouteMeta` contract to real `generateMetadata`
      calls; JSON-LD via the existing `schema.ts` builders.
- [x] Reusable marketing component layer (`components/marketing/`) — mega
      menu, fat footer, hero, page-hero, cards, CTA band, pricing tiers,
      process steps, tech stack, engineering stats.
- [x] Contact + Quote forms (RHF+Zod, quote is a real one-question-per-step
      wizard per the real spec).

## What's explicitly NOT done (out of this sprint's real scope)
- [ ] Service Detail ×15 / Industry Detail ×10 templates — hub pages only
      exist; per-service/per-industry pages are a separate future task.
- [ ] Real lead-capture persistence — Contact/Quote submit to a validated,
      logged placeholder Route Handler, not a real CRM/email integration
      (Sprint 3 scope).
- [ ] Real client testimonials/case studies/pricing figures — Antrique is
      pre-launch; see `docs/architecture/marketing-site.md` §2 for the
      confirmed content-honesty approach used instead.

## Exit check
Site structure, content, SEO, animation/3D/media, accessibility, and
performance work are all done — see the completion report delivered this
session. `pnpm typecheck`/`lint`/`build` re-verification is the one
outstanding item, blocked on a tool-execution outage this session; must be
run before this sprint is truly launch-ready.
