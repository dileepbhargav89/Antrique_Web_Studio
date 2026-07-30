import { AlertTriangleIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** Generic fallback UI — the Phase 0 error boundaries (app/error.tsx) stay plain HTML; this is
 * for a smaller in-page failed-fetch/failed-section state, not a route-level crash. */
function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again, or come back later.',
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center',
        className,
      )}
    >
      <AlertTriangleIcon aria-hidden="true" className="text-destructive size-10" />
      <div className="space-y-1">
        <p className="font-heading text-lg font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export { ErrorState };
