import type { Metadata } from 'next';
import { Suspense } from 'react';
import { InvoicesList } from './invoices-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Invoices',
  robots: { index: false, follow: false },
};

export default function InvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoicesList />
    </Suspense>
  );
}
