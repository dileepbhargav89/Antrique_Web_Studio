'use client';

import { ModuleSubNav } from '@/components/data/module-sub-nav';
import { ROUTES } from '@/config/routes';

const TABS = [
  { href: ROUTES.portal.crmLeads, label: 'Leads' },
  { href: ROUTES.portal.crmContactRequests, label: 'Contact Requests' },
  { href: ROUTES.portal.crmClients, label: 'Clients' },
  { href: ROUTES.portal.crmQuotations, label: 'Quotations' },
  { href: ROUTES.portal.crmFollowUps, label: 'Follow-ups' },
] as const;

/** Customers have no standalone list page (reached via a Lead's `convertedCustomerId` or
 * an Order's `customerId`) — only Leads/Follow-ups get a tab here. */
function CrmNav() {
  return <ModuleSubNav tabs={TABS} ariaLabel="CRM sections" />;
}

export { CrmNav };
