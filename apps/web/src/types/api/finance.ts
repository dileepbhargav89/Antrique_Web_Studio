import type { SortDirection } from './common';

/**
 * Hand-authored from `apps/api/src/modules/finance/{dto,constants}` — same convention
 * `types/api/crm.ts`'s own header comment establishes (the generated `types/api/schema.ts`
 * types every field `Record<string, never>` and is not usable here).
 */
export type VendorStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  gstin: string | null;
  paymentTerms: string | null;
  notes: string | null;
  status: VendorStatus;
  createdAt: string;
  updatedAt: string;
}

export type VendorSortField = 'createdAt' | 'name' | 'status';

export interface VendorListParams {
  page?: number;
  limit?: number;
  status?: VendorStatus;
  search?: string;
  sortBy?: VendorSortField;
  sortDirection?: SortDirection;
}

export interface CreateVendorInput {
  name: string;
  slug: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  paymentTerms?: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  slug?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  gstin?: string;
  paymentTerms?: string;
  notes?: string;
  status?: VendorStatus;
}
