'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { Timeline, type TimelineItem } from '@/components/ui/timeline';
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
import { useCustomer } from '@/features/customers/hooks/use-customer';
import { useOrder } from '@/features/orders/hooks/use-orders';
import { useCancelOrder, useChangeOrderStatus } from '@/features/orders/hooks/use-order-actions';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatCurrency } from '@/utils/currency';
import { formatDateTime } from '@/utils/date';
import { ROUTES } from '@/config/routes';
import {
  ORDER_CANCELLABLE_STATUSES,
  ORDER_FORWARD_TRANSITIONS,
  type OrderStatus,
} from '@/types/api/orders';

const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  DRAFT: 'muted',
  PENDING: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

function formatAmount(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? formatCurrency(amount) : value;
}

interface OrderDetailProps {
  id: string;
}

function OrderDetail({ id }: OrderDetailProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const { data: order, isLoading, error, refetch } = useOrder(id);
  const customerQuery = useCustomer(order?.customerId);
  const changeStatus = useChangeOrderStatus(id);
  const cancelOrder = useCancelOrder(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!order) return null;

  const nextStatus = ORDER_FORWARD_TRANSITIONS[order.status];
  const isCancellable = ORDER_CANCELLABLE_STATUSES.includes(order.status);
  const customer = customerQuery.data;
  const customerLabel = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email
    : order.customerId;

  const historyItems: TimelineItem[] = (order.statusHistory ?? []).map((entry) => ({
    id: entry.id,
    title: entry.previousStatus ? `${entry.previousStatus} → ${entry.status}` : entry.status,
    description: entry.note ?? undefined,
    timestamp: formatDateTime(entry.createdAt),
  }));

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={`Order #${order.id.slice(0, 8)}`}
        subtitle={customerLabel}
        status={<StatusBadge label={order.status} tone={STATUS_TONE[order.status]} />}
        actions={
          <>
            {nextStatus ? (
              <Button
                type="button"
                onClick={() => changeStatus.mutate({ status: nextStatus })}
                disabled={changeStatus.isPending}
              >
                Advance to {nextStatus}
              </Button>
            ) : null}
            {isCancellable ? (
              <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Cancel order
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This stops the order permanently — it cannot be reopened or advanced
                      afterward.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep order</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={cancelOrder.isPending}
                      onClick={() => {
                        cancelOrder.mutate({});
                        setCancelOpen(false);
                      }}
                    >
                      Cancel order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </>
        }
      />

      <Link
        href={`${ROUTES.portal.crmCustomers}/${order.customerId}`}
        className="text-primary -mt-6 text-sm hover:underline"
      >
        View customer →
      </Link>

      <section className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Subtotal</p>
          <p className="text-lg font-medium">{formatAmount(order.subtotal)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Total</p>
          <p className="text-lg font-medium">{formatAmount(order.total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Placed</p>
          <p className="text-lg font-medium">{formatDateTime(order.createdAt)}</p>
        </div>
      </section>

      {order.notes ? (
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">{order.notes}</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Items</h2>
        {order.items && order.items.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead>Customization</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Adjustments</TableHead>
                  <TableHead>Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    {/* No reverse "variant → product name" lookup endpoint exists in
                    Backend v1.0 (variants are nested-write-only under a product); the raw
                    id is shown rather than fabricating a resolved name. */}
                    <TableCell className="font-mono text-xs" title={item.productVariantId}>
                      {item.productVariantId.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      {item.productCustomizationId ? (
                        <StatusBadge label="Bespoke" tone="info" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatAmount(item.unitPrice)}</TableCell>
                    <TableCell>{formatAmount(item.pricingAdjustmentsTotal)}</TableCell>
                    <TableCell className="font-medium">{formatAmount(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No items." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Status history</h2>
        {historyItems.length > 0 ? (
          <Timeline items={historyItems} />
        ) : (
          <EmptyState title="No history yet." />
        )}
      </section>
    </div>
  );
}

export { OrderDetail };
