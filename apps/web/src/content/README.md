# src/content

Hand-authored marketing content — services, industries, process, tech
stack, engineering stats, pricing tiers, FAQs, blog posts. Plain TypeScript
data, not a CMS: `docs/product/05-admin-dashboard.md` (real content despite
the filename) reserves a real Content CMS (draft→publish, ISR revalidate)
for Sprint 6. Every file here is shaped so a future CMS-backed fetch can
replace it as a drop-in — same field names, same consumer components — not
so this data is itself dynamic today.

**No fabricated business content.** Antrique is pre-launch
(`docs/product/01-discovery.md`, real content despite the filename) — no
real clients, testimonials, case studies, or pricing figures exist yet.
`engineering-stats.ts` cites real, verifiable facts about this actual
platform instead of invented traction numbers; `pricing-tiers.ts`
deliberately has no price figures (every page's primary CTA is "Get a
Quote," not a published price); there is no `testimonials.ts` — see
`docs/architecture/marketing-site.md` for the full reasoning.
