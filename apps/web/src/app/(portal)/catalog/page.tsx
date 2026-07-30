import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CatalogList } from './catalog-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Catalog',
  robots: { index: false, follow: false },
};

export default function CatalogPage() {
  return (
    // CatalogList's `useListParams()` reads `useSearchParams()` — requires a Suspense
    // boundary in the App Router (same requirement `(auth)/login/page.tsx` documents).
    <Suspense fallback={null}>
      <CatalogList />
    </Suspense>
  );
}
