import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VendorsList } from './vendors-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Vendors',
  robots: { index: false, follow: false },
};

export default function VendorsPage() {
  return (
    <Suspense fallback={null}>
      <VendorsList />
    </Suspense>
  );
}
