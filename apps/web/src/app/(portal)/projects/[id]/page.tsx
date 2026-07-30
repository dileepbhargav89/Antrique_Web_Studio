import type { Metadata } from 'next';
import { ProjectDetail } from './project-detail';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Project',
  robots: { index: false, follow: false },
};

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}
