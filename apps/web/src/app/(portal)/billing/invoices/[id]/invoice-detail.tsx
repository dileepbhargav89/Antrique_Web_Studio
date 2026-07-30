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
import { useInvoice } from '@/features/billing/hooks/use-invoices';
import { useIssueInvoice, useVoidInvoice } from '@/features/billing/hooks/use-invoice-actions';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/utils/date';
import { ROUTES } from '@/config/routes';
import { INVOICE_VOIDABLE_STATUSES, type InvoiceStatus } from '@/types/api/billing';

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  DRAFT: 'muted',
  SENT: 'info',
  PAID: 'success',
  OVERDUE: 'destructive',
  VOID: 'muted',
};

interface InvoiceDetailProps {
  id: string;
}

function InvoiceDetail({ id }: InvoiceDetailProps) {
  const [voidOpen, setVoidOpen] = useState(false);
  const { data: invoice, isLoading, error, refetch } = useInvoice(id);
  const issueInvoice = useIssueInvoice(id);
  const voidInvoice = useVoidInvoice(id);

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

  if (!invoice) return null;

  const canIssue = invoice.status === 'DRAFT';
  const canVoid = INVOICE_VOIDABLE_STATUSES.includes(invoice.status);

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={invoice.invoiceNumber}
        subtitle={invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : undefined}
        status={<StatusBadge label={invoice.status} tone={STATUS_TONE[invoice.status]} />}
        actions={
          <>
            {canIssue ? (
              <Button
                type="button"
                onClick={() => issueInvoice.mutate()}
                disabled={issueInvoice.isPending}
              >
                Issue
              </Button>
            ) : null}
            {canVoid ? (
              <AlertDialog open={voidOpen} onOpenChange={setVoidOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Void
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Voided invoices no longer accept payments. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep invoice</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={voidInvoice.isPending}
                      onClick={() => {
                        voidInvoice.mutate({});
                        setVoidOpen(false);
                      }}
                    >
                      Void
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </>
        }
      />

      {invoice.customerId ? (
        <Link
          href={`${ROUTES.portal.crmCustomers}/${invoice.customerId}`}
          className="text-primary -mt-6 text-sm hover:underline"
        >
          View customer →
        </Link>
      ) : null}

      <section className="grid gap-6 sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Subtotal</p>
          <p className="text-lg font-medium">
            {formatCurrency(Number(invoice.subtotalAmount) || 0)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tax</p>
          <p className="text-lg font-medium">{formatCurrency(Number(invoice.taxAmount) || 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Total</p>
          <p className="text-lg font-medium">{formatCurrency(Number(invoice.totalAmount) || 0)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Outstanding</p>
          <p className="text-lg font-medium">
            {formatCurrency(Number(invoice.outstandingBalance) || 0)}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Line items</h2>
        {invoice.items && invoice.items.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit price</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatCurrency(Number(item.unitPrice) || 0)}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(Number(item.amount) || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState title="No line items." />
        )}
      </section>
    </div>
  );
}

export { InvoiceDetail };
