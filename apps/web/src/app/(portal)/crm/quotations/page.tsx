import type { Metadata } from 'next';
import { Suspense } from 'react';
import { QuotationsList } from './quotations-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Quotations',
  robots: { index: false, follow: false },
};

export default function QuotationsPage() {
  return (
    <Suspense fallback={null}>
      <QuotationsList />
    </Suspense>
  );
}
