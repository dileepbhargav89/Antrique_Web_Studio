import type { Metadata } from 'next';
import { AdminDashboard } from './admin-dashboard';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
