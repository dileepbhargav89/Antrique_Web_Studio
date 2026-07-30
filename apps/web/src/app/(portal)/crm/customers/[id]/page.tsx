import type { Metadata } from 'next';
import { CustomerDetail } from './customer-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Customer',
  robots: { index: false, follow: false },
};

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
