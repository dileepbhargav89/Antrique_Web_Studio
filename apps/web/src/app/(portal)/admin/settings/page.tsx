import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SettingsPage } from './settings-page';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
