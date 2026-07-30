'use client';

import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useWarehouse } from '@/features/inventory/hooks/use-warehouses';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import type { WarehouseStatus } from '@/types/api/inventory';

const STATUS_TONE: Record<WarehouseStatus, StatusTone> = {
  ACTIVE: 'success',
  ARCHIVED: 'muted',
};

interface WarehouseDetailProps {
  id: string;
}

function WarehouseDetail({ id }: WarehouseDetailProps) {
  const { data: warehouse, isLoading, error, refetch } = useWarehouse(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full max-w-md" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!warehouse) return null;

  const addressLines = [
    warehouse.addressLine1,
    [warehouse.city, warehouse.region].filter(Boolean).join(', '),
    [warehouse.postalCode, warehouse.country].filter(Boolean).join(' '),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={warehouse.name}
        subtitle={warehouse.slug}
        status={<StatusBadge label={warehouse.status} tone={STATUS_TONE[warehouse.status]} />}
      />
      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-medium">Address</h2>
        {addressLines.length > 0 ? (
          <address className="text-muted-foreground text-sm not-italic">
            {addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </address>
        ) : (
          <p className="text-muted-foreground text-sm">No address on file.</p>
        )}
      </section>
    </div>
  );
}

export { WarehouseDetail };
