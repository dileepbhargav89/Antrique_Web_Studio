import type { Metadata } from 'next';
import { ClientDetail } from './client-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Client',
  robots: { index: false, follow: false },
};

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  return <ClientDetail id={id} />;
}
