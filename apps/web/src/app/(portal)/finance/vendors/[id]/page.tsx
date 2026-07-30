import type { Metadata } from 'next';
import { VendorDetail } from './vendor-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Vendor',
  robots: { index: false, follow: false },
};

interface VendorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { id } = await params;
  return <VendorDetail id={id} />;
}
