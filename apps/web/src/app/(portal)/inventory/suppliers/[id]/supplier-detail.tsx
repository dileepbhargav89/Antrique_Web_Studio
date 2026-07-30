'use client';

import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSupplier } from '@/features/inventory/hooks/use-suppliers';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatCurrency } from '@/utils/currency';
import type { SupplierStatus } from '@/types/api/inventory';

const STATUS_TONE: Record<SupplierStatus, StatusTone> = {
  ACTIVE: 'success',
  ARCHIVED: 'muted',
};

interface SupplierDetailProps {
  id: string;
}

function SupplierDetail({ id }: SupplierDetailProps) {
  const { data: supplier, isLoading, error, refetch } = useSupplier(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!supplier) return null;

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={supplier.name}
        subtitle={supplier.contactEmail ?? supplier.slug}
        status={<StatusBadge label={supplier.status} tone={STATUS_TONE[supplier.status]} />}
      />

      <section className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Contact</p>
          <p className="text-sm font-medium">{supplier.contactName ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Email</p>
          <p className="text-sm font-medium">{supplier.contactEmail ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Phone</p>
          <p className="text-sm font-medium">{supplier.contactPhone ?? '—'}</p>
        </div>
      </section>

      {supplier.notes ? (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{supplier.notes}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Supplied items</h2>
        {supplier.products.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Supplier SKU</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Lead time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplier.products.map((product) => (
                  <TableRow key={product.id}>
                    {/* No reverse "variant/fabric → name" lookup endpoint exists — same
                    gap documented on the Inventory and Orders pages. */}
                    <TableCell className="font-mono text-xs">
                      {product.productVariantId
                        ? `Variant ${product.productVariantId.slice(0, 8)}…`
                        : product.fabricId
                          ? `Fabric ${product.fabricId.slice(0, 8)}…`
                          : '—'}
                    </TableCell>
                    <TableCell>{product.supplierSku ?? '—'}</TableCell>
                    <TableCell>
                      {product.cost ? formatCurrency(Number(product.cost) || 0) : '—'}
                    </TableCell>
                    <TableCell>
                      {product.leadTimeDays !== null ? `${product.leadTimeDays} days` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No supplied items." />
        )}
      </section>
    </div>
  );
}

export { SupplierDetail };
