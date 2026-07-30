import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WarehousesList } from './warehouses-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Warehouses',
  robots: { index: false, follow: false },
};

export default function WarehousesPage() {
  return (
    <Suspense fallback={null}>
      <WarehousesList />
    </Suspense>
  );
}
