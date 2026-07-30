import type { SortDirection } from './common';

/**
 * Hand-authored from `apps/api/src/modules/billing/{dto,constants}` — the generated
 * `types/api/schema.ts` types every field `Record<string, never>` and is not usable here.
 */
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'VOID';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';

/** `billing.constant.ts`'s `INVOICE_VOIDABLE_STATUSES` — Void is offered only from these. */
export const INVOICE_VOIDABLE_STATUSES: readonly InvoiceStatus[] = ['DRAFT', 'SENT', 'OVERDUE'];
/** No automatic DRAFT → OVERDUE cron/job exists — `OVERDUE` is a real status with no
 * confirmed endpoint that ever sets it automatically (matches the CRM module's `LOST`
 * gap). "Issue" (`POST /invoices/:id/issue`) only ever moves DRAFT → SENT. */

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  customerId: string | null;
  orderId: string | null;
  taxRateId: string | null;
  currency: string;
  subtotalAmount: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  amountPaid: string;
  /** Computed server-side (`totalAmount - amountPaid`), never stored. */
  outstandingBalance: string;
  status: InvoiceStatus;
  issuedDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated on `GET /invoices/:id` only; omitted on list rows. */
  items?: InvoiceItem[];
}

export type InvoiceSortField = 'createdAt' | 'invoiceNumber' | 'totalAmount' | 'status' | 'dueDate';

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  customerId?: string;
  orderId?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Matched against invoice number. */
  search?: string;
  sortBy?: InvoiceSortField;
  sortDirection?: SortDirection;
}

export interface VoidInvoiceInput {
  reason?: string;
}

export interface Payment {
  id: string;
  invoiceId: string | null;
  paymentMethodId: string | null;
  method: string;
  reference: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

export interface PaymentListParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  invoiceId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'amount' | 'status';
  sortDirection?: SortDirection;
}
