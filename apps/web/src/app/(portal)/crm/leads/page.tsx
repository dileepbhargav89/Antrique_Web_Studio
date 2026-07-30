import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LeadsList } from './leads-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Leads',
  robots: { index: false, follow: false },
};

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsList />
    </Suspense>
  );
}
