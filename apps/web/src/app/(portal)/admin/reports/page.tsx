import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ReportsList } from './reports-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Reports',
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsList />
    </Suspense>
  );
}
