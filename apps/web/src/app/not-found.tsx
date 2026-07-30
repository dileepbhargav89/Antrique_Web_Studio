import Link from 'next/link';
import { FileQuestionIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ROUTES } from '@/config/routes';

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-8">
      <EmptyState
        icon={FileQuestionIcon}
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Button asChild>
            <Link href={ROUTES.marketing.home}>Go home</Link>
          </Button>
        }
      />
    </div>
  );
}
