'use client';

import { useState } from 'react';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Timeline, type TimelineItem } from '@/components/ui/timeline';
import { useCustomer } from '@/features/customers/hooks/use-customer';
import { useCustomerActivityTimeline } from '@/features/crm/hooks/use-customer-activities';
import { useCreateCustomerNote, useCustomerNotes } from '@/features/crm/hooks/use-customer-notes';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDateTime } from '@/utils/date';
import type { CustomerStatus } from '@/types/api/customers';

const STATUS_TONE: Record<CustomerStatus, StatusTone> = {
  ACTIVE: 'success',
  ARCHIVED: 'muted',
};

const ACTIVITY_LABEL: Record<string, string> = {
  LEAD_CREATED: 'Lead created',
  LEAD_CONVERTED: 'Lead converted',
  FOLLOW_UP_COMPLETED: 'Follow-up completed',
};

interface CustomerDetailProps {
  id: string;
}

function CustomerDetail({ id }: CustomerDetailProps) {
  const [noteBody, setNoteBody] = useState('');
  const { data: customer, isLoading, error, refetch } = useCustomer(id);
  const notesQuery = useCustomerNotes(id);
  const activityQuery = useCustomerActivityTimeline(id);
  const createNote = useCreateCustomerNote(id);

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

  if (!customer) return null;

  const label = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email;
  const timelineItems: TimelineItem[] = (activityQuery.data ?? []).map((activity) => ({
    id: activity.id,
    title: ACTIVITY_LABEL[activity.type] ?? activity.type,
    description: activity.summary,
    timestamp: formatDateTime(activity.createdAt),
  }));

  function handleAddNote() {
    if (!noteBody.trim()) return;
    createNote.mutate(noteBody.trim(), { onSuccess: () => setNoteBody('') });
  }

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={label}
        subtitle={customer.email}
        status={<StatusBadge label={customer.status} tone={STATUS_TONE[customer.status]} />}
      />

      {customer.addresses.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-medium">Addresses</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {customer.addresses.map((address) => (
              <address key={address.id} className="rounded-lg border p-3 text-sm not-italic">
                {address.label ? <p className="font-medium">{address.label}</p> : null}
                <p>{address.line1}</p>
                {address.line2 ? <p>{address.line2}</p> : null}
                <p>{[address.city, address.region].filter(Boolean).join(', ')}</p>
                <p>{[address.postalCode, address.country].filter(Boolean).join(' ')}</p>
              </address>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Notes</h2>
        <div className="flex flex-col gap-2">
          <Textarea
            value={noteBody}
            onChange={(event) => setNoteBody(event.target.value)}
            placeholder="Add a note about this customer..."
            rows={3}
          />
          <Button
            type="button"
            className="self-end"
            onClick={handleAddNote}
            disabled={!noteBody.trim() || createNote.isPending}
          >
            Add note
          </Button>
        </div>
        {notesQuery.data && notesQuery.data.items.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {notesQuery.data.items.map((note) => (
              <li key={note.id} className="rounded-lg border p-3 text-sm">
                <p>{note.body}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatDateTime(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No notes yet." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Activity</h2>
        {timelineItems.length > 0 ? (
          <Timeline items={timelineItems} />
        ) : (
          <EmptyState title="No activity yet." />
        )}
      </section>
    </div>
  );
}

export { CustomerDetail };
