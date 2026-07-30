import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ProjectsList } from './projects-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Projects',
  robots: { index: false, follow: false },
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsList />
    </Suspense>
  );
}
