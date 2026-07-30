import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InventoryList } from './inventory-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Inventory',
  robots: { index: false, follow: false },
};

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryList />
    </Suspense>
  );
}
