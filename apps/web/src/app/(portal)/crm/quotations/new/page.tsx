import type { Metadata } from 'next';
import { Suspense } from 'react';
import { QuotationForm } from './quotation-form';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'New Quotation',
  robots: { index: false, follow: false },
};

export default function NewQuotationPage() {
  return (
    <Suspense fallback={null}>
      <QuotationForm />
    </Suspense>
  );
}
