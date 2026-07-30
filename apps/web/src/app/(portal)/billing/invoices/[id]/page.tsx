import type { Metadata } from 'next';
import { InvoiceDetail } from './invoice-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
