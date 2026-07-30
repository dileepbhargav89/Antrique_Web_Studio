import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuditLogsList } from './audit-logs-list';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Audit Logs',
  robots: { index: false, follow: false },
};

export default function AuditLogsPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogsList />
    </Suspense>
  );
}
