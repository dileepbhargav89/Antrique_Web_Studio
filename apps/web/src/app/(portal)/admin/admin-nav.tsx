'use client';

import { ModuleSubNav } from '@/components/data/module-sub-nav';
import { ROUTES } from '@/config/routes';

const TABS = [
  { href: ROUTES.portal.admin, label: 'Dashboard' },
  { href: ROUTES.portal.adminNotifications, label: 'Notifications' },
  { href: ROUTES.portal.adminAuditLogs, label: 'Audit Logs' },
  { href: ROUTES.portal.adminReports, label: 'Reports' },
  { href: ROUTES.portal.adminSettings, label: 'Settings' },
] as const;

function AdminNav() {
  return <ModuleSubNav tabs={TABS} ariaLabel="Admin sections" />;
}

export { AdminNav };
