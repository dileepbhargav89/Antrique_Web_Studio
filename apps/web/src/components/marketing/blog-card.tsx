import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hover } from '@/components/motion/hover';
import { ROUTES } from '@/config/routes';
import type { BlogPost } from '@/content/blog-posts';

export interface BlogCardProps {
  post: BlogPost;
}

function BlogCard({ post }: BlogCardProps) {
  return (
    <Hover lift={4}>
      <Card className="h-full">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <CardTitle>
            <Link href={`${ROUTES.marketing.blog}/${post.slug}`} className="hover:underline">
              {post.title}
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{post.excerpt}</p>
        </CardContent>
        <CardFooter className="text-muted-foreground justify-between bg-transparent text-xs">
          <time dateTime={post.publishedAt}>
            {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
              new Date(post.publishedAt),
            )}
          </time>
          <span>{post.readTimeMinutes} min read</span>
        </CardFooter>
      </Card>
    </Hover>
  );
}

export { BlogCard };
