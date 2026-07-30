'use client';

import { ErrorState } from '@/components/ui/error-state';
import { ListPagination } from '@/components/data/list-pagination';
import { useListParams } from '@/components/data/use-list-params';
import { useProjectActivity } from '@/features/projects/hooks/use-projects';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';

/** Read-only — backed by ActivityLog rows the Project/Milestone/Task/Document/Comment
 * services write on every mutation (see apps/api's ActivityLogRepository). Lead/Invoice/
 * Order events don't write here yet — full cross-entity Step 10 is a separate phase. */
function ActivityTab({ projectId }: { projectId: string }) {
  const { params, setParams } = useListParams({ defaultLimit: 20 });
  const activityQuery = useProjectActivity(projectId, { page: params.page, limit: params.limit });

  if (activityQuery.error) {
    const { title, description } = getErrorCopy(normalizeError(activityQuery.error));
    return (
      <ErrorState title={title} description={description} onRetry={() => activityQuery.refetch()} />
    );
  }

  const entries = activityQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      {activityQuery.isLoading ? <p className="text-muted-foreground text-sm">Loading…</p> : null}
      {entries.length === 0 && !activityQuery.isLoading ? (
        <p className="text-muted-foreground text-sm">No activity yet.</p>
      ) : null}

      <ol className="flex flex-col gap-3 border-l pl-4">
        {entries.map((entry) => (
          <li key={entry.id}>
            <p className="text-sm">{entry.summary}</p>
            <p className="text-muted-foreground text-xs">{formatDate(entry.createdAt)}</p>
          </li>
        ))}
      </ol>

      {activityQuery.data ? (
        <ListPagination
          page={activityQuery.data.page}
          limit={activityQuery.data.limit}
          total={activityQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { ActivityTab };
