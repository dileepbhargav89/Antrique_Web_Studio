import type { InventoryItem } from '@/types/api/inventory';

export type StockLevel = 'out-of-stock' | 'low-stock' | 'in-stock';

/**
 * `InventoryItem` has no status/lifecycle field at all (confirmed — see
 * `types/api/inventory.ts`'s own comment) — this is the one place that turns
 * `onHand`/`reserved`/`available`/`reorderPoint` into the three-state badge every list/
 * detail view shows.
 */
export function deriveStockLevel(item: InventoryItem): StockLevel {
  const available = Number(item.available);
  if (available <= 0) return 'out-of-stock';

  const reorderPoint = item.reorderPoint !== null ? Number(item.reorderPoint) : null;
  if (reorderPoint !== null && Number(item.onHand) <= reorderPoint) return 'low-stock';

  return 'in-stock';
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  'out-of-stock': 'Out of stock',
  'low-stock': 'Low stock',
  'in-stock': 'In stock',
};
