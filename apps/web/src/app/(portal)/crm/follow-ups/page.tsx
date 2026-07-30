import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FollowUpsList } from './follow-ups-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Follow-ups',
  robots: { index: false, follow: false },
};

export default function FollowUpsPage() {
  return (
    <Suspense fallback={null}>
      <FollowUpsList />
    </Suspense>
  );
}
