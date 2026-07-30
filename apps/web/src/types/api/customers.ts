/**
 * Hand-authored from `apps/api/src/modules/orders/dto/customer-response.dto.ts` /
 * `customer-address-response.dto.ts` — the Customer entity is served from the Orders
 * module's own controller (`customer.controller.ts`), not a separate module.
 */
export type CustomerStatus = 'ACTIVE' | 'ARCHIVED';

export interface CustomerAddress {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface Customer {
  id: string;
  email: string;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  addresses: CustomerAddress[];
}

export type CustomerSortField = 'email' | 'lastName' | 'createdAt';

export interface CustomerListParams {
  page?: number;
  limit?: number;
  status?: CustomerStatus;
  search?: string;
  sortBy?: CustomerSortField;
  sortDirection?: 'asc' | 'desc';
}
