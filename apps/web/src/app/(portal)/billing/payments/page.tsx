import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentsList } from './payments-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Payments',
  robots: { index: false, follow: false },
};

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsList />
    </Suspense>
  );
}
