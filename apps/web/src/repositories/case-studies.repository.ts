import { CASE_STUDIES, type CaseStudy } from '@/content/case-studies';

/**
 * Async on purpose, even though today's implementation is synchronous — no backend
 * `projects`/`content` module exists yet (both are unbuilt scaffold in `apps/api/src/modules`,
 * `README.md`-only, never registered in `app.module.ts`). Returns the static demo case
 * studies today; a future real implementation swaps this function's body for a fetch, with
 * zero call-site changes since every caller already awaits it.
 */
export async function getCaseStudies(): Promise<CaseStudy[]> {
  return CASE_STUDIES;
}
