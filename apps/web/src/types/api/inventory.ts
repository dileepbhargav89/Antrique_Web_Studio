/**
 * Hand-authored from `apps/api/src/modules/inventory/dto/*.ts` — the generated
 * `types/api/schema.ts` types every field `Record<string, never>` and is not usable here.
 */
export type WarehouseStatus = 'ACTIVE' | 'ARCHIVED';
export type SupplierStatus = 'ACTIVE' | 'ARCHIVED';
export type InventoryTransactionType =
  'RECEIPT' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE' | 'CONSUMPTION';

export interface Warehouse {
  id: string;
  name: string;
  slug: string;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListParams {
  page?: number;
  limit?: number;
  status?: WarehouseStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}

/**
 * No status/lifecycle field at all — `apps/api/.../dto/inventory-item-response.dto.ts`'s
 * own comment: `available` is computed (`onHand - reserved`) server-side, never stored.
 * "In stock / low stock / out of stock" must be derived client-side; see
 * `deriveStockLevel()` in `features/inventory/stock-level.ts`.
 */
export interface InventoryItem {
  id: string;
  warehouseId: string;
  productVariantId: string | null;
  fabricId: string | null;
  /** Decimal-as-string. */
  onHand: string;
  reserved: string;
  available: string;
  reorderPoint: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemListParams {
  page?: number;
  limit?: number;
  warehouseId?: string;
  productVariantId?: string;
  fabricId?: string;
  supplierId?: string;
  /** Relation filter into the linked variant's sku / fabric's name. */
  search?: string;
  sortBy?: 'createdAt' | 'onHand';
  sortDirection?: 'asc' | 'desc';
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  type: InventoryTransactionType;
  onHandDelta: string;
  reservedDelta: string;
  onHandAfter: string;
  reservedAfter: string;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface InventoryTransactionListParams {
  page?: number;
  limit?: number;
  inventoryItemId?: string;
  warehouseId?: string;
  type?: InventoryTransactionType;
  dateFrom?: string;
  dateTo?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface SupplierProduct {
  id: string;
  productVariantId: string | null;
  fabricId: string | null;
  supplierSku: string | null;
  cost: string | null;
  leadTimeDays: number | null;
}

export interface Supplier {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: SupplierStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  products: SupplierProduct[];
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  status?: SupplierStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortDirection?: 'asc' | 'desc';
}
