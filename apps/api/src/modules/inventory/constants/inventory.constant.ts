// Route segments, matching modules/bespoke/constants/bespoke.constant.ts's
// existing "one string, one place" convention.
export const WAREHOUSE_ROUTE = 'warehouses';
export const INVENTORY_ROUTE = 'inventory';
export const SUPPLIER_ROUTE = 'suppliers';

// Same slug pattern as catalog/bespoke — redeclared here rather than
// imported, keeping this module's file-level dependency surface minimal
// (its only real cross-module coupling is the existence checks
// InventoryRepository/SupplierRepository run directly against
// `product_variants`/`fabrics` — see those files' own comments — not a
// shared constants import).
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_PATTERN_MESSAGE =
  'slug must be lowercase letters, numbers, and single hyphens between words (e.g. "main-warehouse")';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as every other
// module's own *_SORT_FIELDS.
export const WAREHOUSE_SORT_FIELDS = ['name', 'createdAt'] as const;
export const INVENTORY_ITEM_SORT_FIELDS = ['createdAt', 'onHand'] as const;
export const INVENTORY_TRANSACTION_SORT_FIELDS = ['createdAt'] as const;
export const SUPPLIER_SORT_FIELDS = ['name', 'createdAt'] as const;
