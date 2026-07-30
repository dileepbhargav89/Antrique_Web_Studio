import type { Metadata } from 'next';
import { CustomizeWizard } from './customize-wizard';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Customize Product',
  robots: { index: false, follow: false },
};

interface CustomizePageProps {
  params: Promise<{ productId: string }>;
}

export default async function CustomizePage({ params }: CustomizePageProps) {
  const { productId } = await params;
  return <CustomizeWizard productId={productId} />;
}
