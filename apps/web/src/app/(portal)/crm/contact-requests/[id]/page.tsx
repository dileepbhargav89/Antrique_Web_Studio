import type { Metadata } from 'next';
import { ContactRequestDetail } from './contact-request-detail';

export const metadata: Metadata = {
  title: 'Contact Request',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactRequestDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ContactRequestDetail id={id} />;
}
