import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { BLOG_POSTS } from '@/content/blog-posts';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { blogPostingSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

/** Fully static — content is code, not a CMS yet (see `content/README.md`); every real
 * slug is known at build time. */
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const path = `${ROUTES.marketing.blog}/${slug}`;

  if (!post) {
    return buildPageMetadata({
      title: 'Post Not Found',
      description: 'This post could not be found.',
      path,
      noindex: true,
    });
  }

  const isoDate = new Date(post.publishedAt).toISOString();

  return buildPageMetadata({
    title: post.title,
    description: post.excerpt,
    path,
    ogType: 'article',
    article: {
      publishedTime: isoDate,
      modifiedTime: isoDate,
      author: post.author,
      section: post.tags[0] ?? 'Blog',
    },
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) {
    notFound();
  }

  const path = `${ROUTES.marketing.blog}/${post.slug}`;
  const url = `${SITE.domain}${path}`;
  const isoDate = new Date(post.publishedAt).toISOString();

  return (
    <>
      <JsonLd
        data={blogPostingSchema({
          title: post.title,
          description: post.excerpt,
          url,
          author: post.author,
          publishedTime: isoDate,
          modifiedTime: isoDate,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Blog', url: `${SITE.domain}${ROUTES.marketing.blog}` },
          { name: post.title, url },
        ])}
      />
      <PageHero
        title={post.title}
        breadcrumbs={[
          { label: 'Blog', href: ROUTES.marketing.blog },
          { label: post.title, href: path },
        ]}
      />
      <Container className="mx-auto max-w-2xl py-16 sm:py-20">
        <div className="text-muted-foreground mb-8 flex flex-wrap items-center gap-3 text-sm">
          <time dateTime={post.publishedAt}>
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(
              new Date(post.publishedAt),
            )}
          </time>
          <span aria-hidden="true">&middot;</span>
          <span>{post.readTimeMinutes} min read</span>
          <span aria-hidden="true">&middot;</span>
          <span>{post.author}</span>
        </div>
        <div className="flex flex-col gap-4">
          {post.body.map((paragraph, index) => (
            <p key={index} className="text-foreground text-base leading-relaxed sm:text-lg">
              {paragraph}
            </p>
          ))}
        </div>
      </Container>
      <CtaBand
        title="Have a project in mind?"
        description="Let's talk about what you're building."
      />
    </>
  );
}
