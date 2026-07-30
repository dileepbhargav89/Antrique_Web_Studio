import { FAQS, type Faq } from '@/content/faqs';

/**
 * Async on purpose — see `case-studies.repository.ts`'s comment for the full reasoning. No
 * FAQ concept exists anywhere in the backend (confirmed by a full-text search of
 * `apps/api/src` for "faq" — zero matches).
 */
export async function getFaqs(): Promise<Faq[]> {
  return FAQS;
}
