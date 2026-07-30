'use client';

import { ModuleSubNav } from '@/components/data/module-sub-nav';
import { ROUTES } from '@/config/routes';

const TABS = [
  { href: ROUTES.portal.inventory, label: 'Stock' },
  { href: ROUTES.portal.inventoryTransactions, label: 'Transactions' },
  { href: ROUTES.portal.inventoryWarehouses, label: 'Warehouses' },
  { href: ROUTES.portal.inventorySuppliers, label: 'Suppliers' },
] as const;

function InventoryNav() {
  return <ModuleSubNav tabs={TABS} ariaLabel="Inventory sections" />;
}

export { InventoryNav };
