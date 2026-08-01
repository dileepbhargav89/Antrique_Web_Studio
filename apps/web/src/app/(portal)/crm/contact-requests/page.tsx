import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ContactRequestsList } from './contact-requests-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Contact Requests',
  robots: { index: false, follow: false },
};

export default function ContactRequestsPage() {
  return (
    <Suspense fallback={null}>
      <ContactRequestsList />
    </Suspense>
  );
}
