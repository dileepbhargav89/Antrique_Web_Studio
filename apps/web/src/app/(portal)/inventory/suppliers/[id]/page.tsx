import type { Metadata } from 'next';
import { SupplierDetail } from './supplier-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Supplier',
  robots: { index: false, follow: false },
};

interface SupplierDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const { id } = await params;
  return <SupplierDetail id={id} />;
}
