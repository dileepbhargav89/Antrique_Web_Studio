import type { Metadata } from 'next';
import { WarehouseDetail } from './warehouse-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Warehouse',
  robots: { index: false, follow: false },
};

interface WarehouseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WarehouseDetailPage({ params }: WarehouseDetailPageProps) {
  const { id } = await params;
  return <WarehouseDetail id={id} />;
}
