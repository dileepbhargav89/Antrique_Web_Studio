import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PORTAL_NAV_ITEMS } from '@/config/navigation';
import { ROUTES } from '@/config/routes';

/** Private authenticated surface — not part of the indexable marketing site. */
export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  Catalog: 'Browse products, categories, and collections.',
  Orders: 'Track and progress customer orders.',
  Inventory: 'Stock levels, transactions, warehouses, and suppliers.',
  CRM: 'Leads, follow-ups, and customer relationships.',
  Billing: 'Invoices and recorded payments.',
  Finance: 'Vendors, expenses, and purchase orders.',
  Admin: 'Cross-module KPIs, notifications, audit logs, and reports.',
};

/**
 * The portal's landing page after login (`safeRedirectPath()` in `(auth)/login/
 * login-form.tsx` defaults here) — a simple hub linking into the seven real business
 * modules, not a duplicate of `/admin`'s KPI dashboard.
 */
export default function DashboardPage() {
  const moduleLinks = PORTAL_NAV_ITEMS.filter((item) => item.href !== ROUTES.portal.dashboard);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-medium">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Jump into a section of the portal.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moduleLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <item.icon aria-hidden="true" className="text-muted-foreground mb-2 size-5" />
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>{MODULE_DESCRIPTIONS[item.label]}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
