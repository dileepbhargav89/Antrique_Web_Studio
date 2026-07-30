import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TransactionsList } from './transactions-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Inventory Transactions',
  robots: { index: false, follow: false },
};

export default function InventoryTransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsList />
    </Suspense>
  );
}
