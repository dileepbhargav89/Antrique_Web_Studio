'use client';

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
import { useQuotation } from '@/features/crm/hooks/use-quotations';
import {
  useSendQuotation,
  useAcceptQuotation,
  useRejectQuotation,
} from '@/features/crm/hooks/use-quotation-actions';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';
import type { QuotationStatus } from '@/types/api/crm';

const STATUS_TONE: Record<QuotationStatus, StatusTone> = {
  DRAFT: 'muted',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'destructive',
  EXPIRED: 'warning',
  CONVERTED: 'success',
};

interface QuotationDetailProps {
  id: string;
}

function QuotationDetail({ id }: QuotationDetailProps) {
  const [sendOpen, setSendOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const { data: quotation, isLoading, error, refetch } = useQuotation(id);
  const sendQuotation = useSendQuotation(id);
  const acceptQuotation = useAcceptQuotation(id);
  const rejectQuotation = useRejectQuotation(id);

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

  if (!quotation) return null;

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={quotation.quotationNumber}
        subtitle={`${quotation.currency} ${quotation.totalAmount}`}
        status={<StatusBadge label={quotation.status} tone={STATUS_TONE[quotation.status]} />}
        actions={
          <>
            {quotation.pdfUrl ? (
              <Button asChild variant="outline">
                <a href={quotation.pdfUrl} target="_blank" rel="noreferrer">
                  Download PDF
                </a>
              </Button>
            ) : null}
            {quotation.status === 'DRAFT' ? (
              <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button">Send</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Send this quotation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Generates a PDF and emails it to the lead/client. This is terminal — the
                      quotation can no longer be edited afterward.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={sendQuotation.isPending}
                      onClick={() => {
                        sendQuotation.mutate();
                        setSendOpen(false);
                      }}
                    >
                      Send
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {quotation.status === 'SENT' ? (
              <>
                <AlertDialog open={acceptOpen} onOpenChange={setAcceptOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button">Accept</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark this quotation accepted?</AlertDialogTitle>
                      <AlertDialogDescription>Terminal — cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={acceptQuotation.isPending}
                        onClick={() => {
                          acceptQuotation.mutate();
                          setAcceptOpen(false);
                        }}
                      >
                        Accept
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">
                      Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Mark this quotation rejected?</AlertDialogTitle>
                      <AlertDialogDescription>Terminal — cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={rejectQuotation.isPending}
                        onClick={() => {
                          rejectQuotation.mutate({});
                          setRejectOpen(false);
                        }}
                      >
                        Reject
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : null}
          </>
        }
      />

      <section className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Valid until</p>
          <p className="text-sm font-medium">
            {quotation.validUntil ? formatDate(quotation.validUntil) : '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Issued</p>
          <p className="text-sm font-medium">
            {quotation.issuedAt ? formatDate(quotation.issuedAt) : '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm font-medium">{formatDate(quotation.createdAt)}</p>
        </div>
      </section>

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
          {quotation.items?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.description}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                {quotation.currency} {item.unitPrice}
              </TableCell>
              <TableCell>
                {quotation.currency} {item.amount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col items-end gap-1 text-sm">
        <p>
          Subtotal: {quotation.currency} {quotation.subtotalAmount}
        </p>
        {Number(quotation.discountAmount) > 0 ? (
          <p>
            Discount: -{quotation.currency} {quotation.discountAmount}
          </p>
        ) : null}
        <p>
          Tax: {quotation.currency} {quotation.taxAmount}
        </p>
        <p className="font-medium">
          Total: {quotation.currency} {quotation.totalAmount}
        </p>
      </div>

      {quotation.notes ? (
        <div>
          <p className="text-muted-foreground text-xs">Notes</p>
          <p className="text-sm">{quotation.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

export { QuotationDetail };
