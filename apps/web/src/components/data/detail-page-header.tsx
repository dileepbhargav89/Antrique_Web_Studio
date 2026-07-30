import type { ReactNode } from 'react';

export interface DetailPageHeaderProps {
  title: string;
  subtitle?: string;
  /** A `StatusBadge`, shown inline next to the title. */
  status?: ReactNode;
  actions?: ReactNode;
}

/**
 * Title + status + action-buttons slot, reused for every module's detail page AND list
 * page (list pages omit `status`) — one page-header implementation rather than a bespoke
 * one per module.
 */
function DetailPageHeader({ title, subtitle, status, actions }: DetailPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-2xl font-medium sm:text-3xl">{title}</h1>
          {status}
        </div>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export { DetailPageHeader };
