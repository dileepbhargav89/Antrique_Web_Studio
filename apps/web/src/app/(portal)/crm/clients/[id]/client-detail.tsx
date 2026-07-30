'use client';

import { Button } from '@/components/ui/button';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useClient } from '@/features/crm/hooks/use-clients';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';
import { ClientFormDialog } from '../client-form-dialog';
import type { ClientStatus } from '@/types/api/crm';

const STATUS_TONE: Record<ClientStatus, StatusTone> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  ARCHIVED: 'destructive',
};

interface ClientDetailProps {
  id: string;
}

function ClientDetail({ id }: ClientDetailProps) {
  const { data: client, isLoading, error, refetch } = useClient(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!client) return null;

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={client.name}
        subtitle={client.primaryEmail ?? undefined}
        status={<StatusBadge label={client.status} tone={STATUS_TONE[client.status]} />}
        actions={
          <ClientFormDialog
            mode="edit"
            client={client}
            trigger={
              <Button type="button" variant="outline">
                Edit
              </Button>
            }
          />
        }
      />

      <section className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Industry</p>
          <p className="text-sm font-medium">{client.industry ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Website</p>
          <p className="text-sm font-medium">{client.website ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Primary phone</p>
          <p className="text-sm font-medium">{client.primaryPhone ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm font-medium">{formatDate(client.createdAt)}</p>
        </div>
      </section>
    </div>
  );
}

export { ClientDetail };
