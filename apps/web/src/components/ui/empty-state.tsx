import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Generic — no business copy baked in. Every string is a required/optional prop. */
function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center',
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="text-muted-foreground size-10" /> : null}
      <div className="space-y-1">
        <p className="font-heading text-lg font-medium">{title}</p>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export { EmptyState };
