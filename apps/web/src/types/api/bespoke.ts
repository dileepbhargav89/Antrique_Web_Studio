/**
 * Hand-authored from `apps/api/src/modules/bespoke/dto/*.ts` — the generated
 * `types/api/schema.ts` types every field `Record<string, never>` and is not usable here.
 *
 * Load-bearing gap, confirmed by reading `order.service.ts`'s
 * `computeCustomizationPricing()` and `CreateOrderItemDto` directly: the only bespoke
 * inputs that actually flow into `POST /orders` are `productCustomizationId` +
 * `selectedOptions.{styleOptionIds, monogramOptionId, monogramText}`. Fabric and
 * MeasurementProfile are both real, fully-CRUD backend entities, but **neither has any
 * field on `CreateOrderItemDto` or `selectedOptions`** — there is no way for an order to
 * reference a chosen fabric or measurement profile in Backend v1.0. The customizer wizard
 * surfaces Fabric as a read-only reference panel (not a submitted field) and omits
 * Measurement Profiles from order submission entirely, rather than inventing a field the
 * backend contract doesn't have.
 */
export type StyleOptionStatus = 'ACTIVE' | 'ARCHIVED';
export type PricingAdjustmentType = 'FLAT' | 'PERCENTAGE';
export type FabricStatus = 'ACTIVE' | 'ARCHIVED';
export type MeasurementUnit = 'IN' | 'CM';

/** The nested "as seen from the customization" shape — lighter than the standalone
 * `GET /style-options/:id` response, which also carries `incompatibleStyleOptionIds`. That
 * field isn't fetched here (would require one extra request per option) — this wizard
 * enforces "at most one selection per group" instead of cross-group incompatibility. */
export interface NestedStyleOption {
  id: string;
  name: string;
  description: string | null;
  /** `Decimal.toString()` server-side — a numeric string. */
  priceAdjustment: string;
  status: StyleOptionStatus;
  sortOrder: number;
}

export interface StyleOptionGroup {
  id: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  sortOrder: number;
  styleOptions: NestedStyleOption[];
}

export interface PricingAdjustment {
  id: string;
  styleOptionId: string | null;
  label: string;
  adjustmentType: PricingAdjustmentType;
  amount: string;
  isActive: boolean;
}

export interface MonogramOption {
  id: string;
  label: string;
  maxCharacters: number;
  allowedCharacters: string | null;
  /** `Decimal.toString()` server-side. */
  priceAdjustment: string;
  isActive: boolean;
}

export interface ProductCustomization {
  id: string;
  productId: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Always populated — unlike Catalog's Product, list and detail rows are the same shape. */
  styleOptionGroups: StyleOptionGroup[];
  pricingAdjustments: PricingAdjustment[];
  monogramOptions: MonogramOption[];
}

export interface ProductCustomizationListParams {
  page?: number;
  limit?: number;
  productId?: string;
  /** Query-string `"true"|"false"` server-side (`@IsBooleanString`), not a real boolean. */
  isActive?: string;
  search?: string;
}

export interface FabricImage {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
}

export interface Fabric {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fabricCategoryId: string | null;
  composition: string | null;
  colorHex: string | null;
  /** `Decimal.toString()` server-side. */
  priceAdjustment: string;
  status: FabricStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** Populated on `GET /fabrics/:id` only; omitted on list rows. */
  images?: FabricImage[];
}

export interface FabricListParams {
  page?: number;
  limit?: number;
  productId?: string;
  fabricCategoryId?: string;
  status?: FabricStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'sortOrder';
  sortDirection?: 'asc' | 'desc';
}

export interface Measurement {
  id: string;
  name: string;
  /** Decimal-as-string. */
  value: string;
  unit: MeasurementUnit;
  notes: string | null;
}

export interface MeasurementProfile {
  id: string;
  name: string;
  userId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated on `GET /measurement-profiles/:id` only; omitted on list rows. */
  measurements?: Measurement[];
}

export interface MeasurementProfileListParams {
  page?: number;
  limit?: number;
  userId?: string;
  search?: string;
}
