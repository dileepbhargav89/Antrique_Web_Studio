import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SuppliersList } from './suppliers-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Suppliers',
  robots: { index: false, follow: false },
};

export default function SuppliersPage() {
  return (
    <Suspense fallback={null}>
      <SuppliersList />
    </Suspense>
  );
}
