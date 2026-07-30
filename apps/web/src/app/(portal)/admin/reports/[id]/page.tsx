import type { Metadata } from 'next';
import { ReportDetail } from './report-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Report',
  robots: { index: false, follow: false },
};

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = await params;
  return <ReportDetail id={id} />;
}
