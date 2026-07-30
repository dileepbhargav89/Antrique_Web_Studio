import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { BlogCard } from '@/components/marketing/blog-card';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { BLOG_POSTS } from '@/content/blog-posts';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

export const metadata: Metadata = buildPageMetadata({
  title: 'Blog',
  description: 'Articles on performance, accessibility, and choosing a web development partner.',
  path: ROUTES.marketing.blog,
});

const sortedPosts = [...BLOG_POSTS].sort(
  (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
);

export default function BlogPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: 'Blog', url: `${SITE.domain}${ROUTES.marketing.blog}` }])}
      />
      <PageHero title="Blog" description="Notes on building web software worth trusting." />
      <Container className="py-16 sm:py-20">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </Stagger>
      </Container>
    </>
  );
}
