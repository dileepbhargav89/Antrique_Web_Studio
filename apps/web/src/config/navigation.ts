import {
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  WarehouseIcon,
  UsersIcon,
  FolderKanbanIcon,
  ReceiptIcon,
  ShieldCheckIcon,
  BanknoteIcon,
} from 'lucide-react';
import type { NavItem } from '@/types/navigation';
import { ROUTES } from './routes';

/**
 * Real Backend v1.0 business modules (Phase 4) — replaces the Phase 1 mocked nav tree
 * (`Projects`/`Documents`/`Support`/`Settings` had no corresponding backend module and no
 * real page; removed rather than left as dead links). `Projects` returns in Phase 7
 * (Project/Task/Milestone) now that a real module/page exists; `Documents`/`Support`/
 * `Settings` remain removed — still no backend module behind them. No permission gating yet — no `/me`
 * endpoint exists anywhere in the backend, so the frontend can never know the current
 * user's role; every item renders uniformly and a 403 is handled gracefully by the
 * existing `getErrorCopy()` (Phase 3), not hidden. Flat for now (no `children`) since none
 * of these top-level entries need sub-navigation beyond what each module's own in-page nav
 * (`inventory-nav.tsx`/`crm-nav.tsx`/`billing-nav.tsx`/`admin-nav.tsx`) already provides.
 */
export const PORTAL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.portal.dashboard, icon: LayoutDashboardIcon },
  { label: 'Catalog', href: ROUTES.portal.catalog, icon: PackageIcon },
  { label: 'Orders', href: ROUTES.portal.orders, icon: ShoppingCartIcon },
  { label: 'Inventory', href: ROUTES.portal.inventory, icon: WarehouseIcon },
  { label: 'CRM', href: ROUTES.portal.crmLeads, icon: UsersIcon },
  { label: 'Projects', href: ROUTES.portal.projects, icon: FolderKanbanIcon },
  { label: 'Billing', href: ROUTES.portal.billingInvoices, icon: ReceiptIcon },
  { label: 'Finance', href: ROUTES.portal.financeVendors, icon: BanknoteIcon },
  { label: 'Admin', href: ROUTES.portal.admin, icon: ShieldCheckIcon },
];
