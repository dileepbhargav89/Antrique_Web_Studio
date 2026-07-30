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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useLead } from '@/features/crm/hooks/use-leads';
import {
  useArchiveLead,
  useConvertLead,
  useConvertLeadToClient,
} from '@/features/crm/hooks/use-lead-actions';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';
import { ROUTES } from '@/config/routes';
import { LEAD_TERMINAL_STATUSES, type LeadStatus } from '@/types/api/crm';

const STATUS_TONE: Record<LeadStatus, StatusTone> = {
  NEW: 'info',
  QUALIFIED: 'info',
  QUOTED: 'warning',
  CONVERTED: 'success',
  LOST: 'destructive',
  ARCHIVED: 'muted',
};

interface LeadDetailProps {
  id: string;
}

function LeadDetail({ id }: LeadDetailProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertToClientOpen, setConvertToClientOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const { data: lead, isLoading, error, refetch } = useLead(id);
  const archiveLead = useArchiveLead(id);
  const convertLead = useConvertLead(id);
  const convertLeadToClient = useConvertLeadToClient(id);

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

  if (!lead) return null;

  const isTerminal = LEAD_TERMINAL_STATUSES.includes(lead.status);

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={lead.contactName}
        subtitle={lead.contactEmail}
        status={<StatusBadge label={lead.status} tone={STATUS_TONE[lead.status]} />}
        actions={
          !isTerminal ? (
            <>
              <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button">Convert to customer</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Convert this lead?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Creates (or links) a Customer record from this lead&rsquo;s contact info. This
                      is terminal — the lead can no longer be updated afterward.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={convertLead.isPending}
                      onClick={() => {
                        convertLead.mutate({});
                        setConvertOpen(false);
                      }}
                    >
                      Convert
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog
                open={convertToClientOpen}
                onOpenChange={(next) => {
                  setConvertToClientOpen(next);
                  if (next) setClientName(lead.organization ?? '');
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Convert to client
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Convert this lead to a client?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Creates a new Client record for the agency-engagement pipeline (distinct from
                      &ldquo;Convert to customer&rdquo; above). This is terminal — the lead can no
                      longer be updated afterward.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="convert-to-client-name">Client name</Label>
                    <Input
                      id="convert-to-client-name"
                      value={clientName}
                      onChange={(event) => setClientName(event.target.value)}
                      placeholder="Company name"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={convertLeadToClient.isPending || !clientName.trim()}
                      onClick={() => {
                        convertLeadToClient.mutate({ name: clientName.trim() });
                        setConvertToClientOpen(false);
                      }}
                    >
                      Convert
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive this lead?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Terminal — an archived lead can no longer be updated or converted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep lead</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={archiveLead.isPending}
                      onClick={() => {
                        archiveLead.mutate({});
                        setArchiveOpen(false);
                      }}
                    >
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null
        }
      />

      <section className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground text-xs">Organization</p>
          <p className="text-sm font-medium">{lead.organization ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Source</p>
          <p className="text-sm font-medium">{lead.source}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Industry</p>
          <p className="text-sm font-medium">{lead.industry ?? '—'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm font-medium">{formatDate(lead.createdAt)}</p>
        </div>
      </section>

      {lead.serviceInterest.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {lead.serviceInterest.map((interest) => (
            <span key={interest} className="bg-muted rounded-full px-3 py-1 text-xs">
              {interest}
            </span>
          ))}
        </div>
      ) : null}

      {lead.convertedCustomerId ? (
        <Link
          href={`${ROUTES.portal.crmCustomers}/${lead.convertedCustomerId}`}
          className="text-primary text-sm hover:underline"
        >
          View converted customer →
        </Link>
      ) : null}

      {lead.convertedClientId ? (
        <Link
          href={`${ROUTES.portal.crmClients}/${lead.convertedClientId}`}
          className="text-primary text-sm hover:underline"
        >
          View converted client →
        </Link>
      ) : null}
    </div>
  );
}

export { LeadDetail };
