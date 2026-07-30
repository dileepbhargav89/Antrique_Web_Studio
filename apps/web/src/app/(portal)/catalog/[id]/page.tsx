import type { Metadata } from 'next';
import { ProductDetail } from './product-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Product',
  robots: { index: false, follow: false },
};

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
