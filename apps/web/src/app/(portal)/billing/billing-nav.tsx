'use client';

import { ModuleSubNav } from '@/components/data/module-sub-nav';
import { ROUTES } from '@/config/routes';

const TABS = [
  { href: ROUTES.portal.billingInvoices, label: 'Invoices' },
  { href: ROUTES.portal.billingPayments, label: 'Payments' },
] as const;

function BillingNav() {
  return <ModuleSubNav tabs={TABS} ariaLabel="Billing sections" />;
}

export { BillingNav };
