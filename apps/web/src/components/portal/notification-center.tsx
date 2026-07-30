'use client';

import Link from 'next/link';
import { BellIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ROUTES } from '@/config/routes';
import { useNotifications, useRetryNotification } from '@/features/admin/hooks/use-notifications';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';

/**
 * Real data via the already-built `useNotifications`/`useRetryNotification` hooks (the same
 * ones `/admin/notifications` uses) — replaces the old `store/notification-store.ts`, which
 * was seeded empty and never populated. `GET /notifications` is admin-wide (all recipients,
 * not scoped to "me" — there's no `/me` endpoint in this backend), so this reads as "recent
 * system activity" rather than a personal inbox; every other portal module already assumes a
 * uniformly-privileged logged-in user, so this is consistent, not a new assumption. No
 * mark-read/dismiss actions — the backend has no such endpoints (only list/findById/retry
 * exist), so those are not offered rather than faked as working no-ops. "Unread" (the dot) is
 * a best-effort signal from the 5 most recent items only, not an authoritative count — there's
 * no unread-count endpoint to ask for one.
 */
function NotificationCenter() {
  const { data, isLoading, error, refetch } = useNotifications({
    limit: 5,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const retryNotification = useRetryNotification();

  const items = data?.items ?? [];
  const hasUnread = items.some((item) => !item.readAt);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={hasUnread ? 'Notifications, new activity' : 'Notifications'}
          className="relative"
        >
          <BellIcon aria-hidden="true" className="size-5" />
          {hasUnread ? (
            <span
              aria-hidden="true"
              className="bg-primary absolute top-1 right-1 flex size-2 rounded-full"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Notifications</PopoverTitle>
        </PopoverHeader>

        {isLoading ? (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          (() => {
            const { title, description } = getErrorCopy(normalizeError(error));
            return (
              <ErrorState
                title={title}
                description={description}
                onRetry={() => refetch()}
                className="gap-2 p-4"
              />
            );
          })()
        ) : items.length === 0 ? (
          <EmptyState
            icon={BellIcon}
            title="No notifications yet"
            description="You're all caught up."
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.id} className="hover:bg-accent rounded-md p-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">{item.title}</p>
                    {item.body ? (
                      <p className="text-muted-foreground text-xs">{item.body}</p>
                    ) : null}
                  </div>
                  {item.status === 'FAILED' ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Retry notification"
                      disabled={retryNotification.isPending}
                      onClick={() => retryNotification.mutate(item.id)}
                    >
                      <RotateCcwIcon aria-hidden="true" className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={ROUTES.portal.adminNotifications}
          className="text-accent hover:text-accent/80 mt-1 block px-2 py-1.5 text-center text-sm font-medium"
        >
          View all
        </Link>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationCenter };
