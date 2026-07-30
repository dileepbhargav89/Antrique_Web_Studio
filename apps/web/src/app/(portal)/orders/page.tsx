import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrdersList } from './orders-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    // OrdersList's `useListParams()` reads `useSearchParams()` — requires a Suspense
    // boundary in the App Router (same requirement `(auth)/login/page.tsx` documents).
    <Suspense fallback={null}>
      <OrdersList />
    </Suspense>
  );
}
