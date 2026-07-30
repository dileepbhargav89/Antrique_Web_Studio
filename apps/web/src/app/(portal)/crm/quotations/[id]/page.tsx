import type { Metadata } from 'next';
import { QuotationDetail } from './quotation-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Quotation',
  robots: { index: false, follow: false },
};

interface QuotationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  return <QuotationDetail id={id} />;
}
