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
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useContactRequest } from '@/features/crm/hooks/use-contact-requests';
import { useConvertContactRequest } from '@/features/crm/hooks/use-contact-request-actions';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';
import { ROUTES } from '@/config/routes';
import type { ContactRequestStatus } from '@/types/api/crm';

const STATUS_TONE: Record<ContactRequestStatus, StatusTone> = {
  NEW: 'info',
  CONTACTED: 'warning',
  CONVERTED: 'success',
  SPAM: 'destructive',
  CLOSED: 'muted',
};

// Statuses convert() itself rejects — mirrors the backend's own
// ContactRequestService.convert() terminal-status guard exactly, so the
// button disappears instead of the user hitting a 409.
const NON_CONVERTIBLE_STATUSES: readonly ContactRequestStatus[] = ['CONVERTED', 'CLOSED', 'SPAM'];

interface ContactRequestDetailProps {
  id: string;
}

function ContactRequestDetail({ id }: ContactRequestDetailProps) {
  const [convertOpen, setConvertOpen] = useState(false);
  const { data: contactRequest, isLoading, error, refetch } = useContactRequest(id);
  const convertContactRequest = useConvertContactRequest(id);

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

  if (!contactRequest) return null;

  const canConvert = !NON_CONVERTIBLE_STATUSES.includes(contactRequest.status);

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={contactRequest.name}
        subtitle={contactRequest.email}
        status={
          <StatusBadge label={contactRequest.status} tone={STATUS_TONE[contactRequest.status]} />
        }
        actions={
          canConvert ? (
            <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button">Convert to lead</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Convert this contact request into a lead?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Creates a new Lead from this submission&rsquo;s name/email/company. Fails if an
                    active lead for this email already exists. This is terminal — the request can no
                    longer be converted again afterward.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={convertContactRequest.isPending}
                    onClick={() => {
                      convertContactRequest.mutate({});
                      setConvertOpen(false);
                    }}
                  >
                    Convert
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null
        }
      />

      <section className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Phone</p>
          <p className="text-sm font-medium">{contactRequest.phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Company</p>
          <p className="text-sm font-medium">{contactRequest.company ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Source</p>
          <p className="text-sm font-medium">{contactRequest.source ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Received</p>
          <p className="text-sm font-medium">{formatDate(contactRequest.createdAt)}</p>
        </div>
      </section>

      <div>
        <p className="text-muted-foreground mb-2 text-xs">Message</p>
        <p className="text-sm whitespace-pre-wrap">{contactRequest.message}</p>
      </div>

      {contactRequest.convertedLeadId ? (
        <Link
          href={`${ROUTES.portal.crmLeads}/${contactRequest.convertedLeadId}`}
          className="text-primary text-sm hover:underline"
        >
          View converted lead →
        </Link>
      ) : null}
    </div>
  );
}

export { ContactRequestDetail };
