'use client';

import { Button } from '@/components/ui/button';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendor } from '@/features/finance/hooks/use-vendors';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';
import { VendorFormDialog } from '../vendor-form-dialog';
import type { VendorStatus } from '@/types/api/finance';

const STATUS_TONE: Record<VendorStatus, StatusTone> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  ARCHIVED: 'destructive',
};

interface VendorDetailProps {
  id: string;
}

function VendorDetail({ id }: VendorDetailProps) {
  const { data: vendor, isLoading, error, refetch } = useVendor(id);

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

  if (!vendor) return null;

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={vendor.name}
        subtitle={vendor.contactEmail ?? undefined}
        status={<StatusBadge label={vendor.status} tone={STATUS_TONE[vendor.status]} />}
        actions={
          <VendorFormDialog
            mode="edit"
            vendor={vendor}
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
          <p className="text-muted-foreground text-xs">Contact name</p>
          <p className="text-sm font-medium">{vendor.contactName ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Contact phone</p>
          <p className="text-sm font-medium">{vendor.contactPhone ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">GSTIN</p>
          <p className="text-sm font-medium">{vendor.gstin ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Payment terms</p>
          <p className="text-sm font-medium">{vendor.paymentTerms ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm font-medium">{formatDate(vendor.createdAt)}</p>
        </div>
      </section>

      {vendor.notes ? (
        <section>
          <p className="text-muted-foreground text-xs">Notes</p>
          <p className="text-sm">{vendor.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

export { VendorDetail };
