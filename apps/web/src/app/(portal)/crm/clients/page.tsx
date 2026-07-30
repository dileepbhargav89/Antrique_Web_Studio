import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ClientsList } from './clients-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Clients',
  robots: { index: false, follow: false },
};

export default function ClientsPage() {
  return (
    <Suspense fallback={null}>
      <ClientsList />
    </Suspense>
  );
}
