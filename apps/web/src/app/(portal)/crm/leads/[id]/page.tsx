import type { Metadata } from 'next';
import { LeadDetail } from './lead-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Lead',
  robots: { index: false, follow: false },
};

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  return <LeadDetail id={id} />;
}
