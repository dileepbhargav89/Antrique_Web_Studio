import type { SortDirection } from './common';

/**
 * Hand-authored from `apps/api/src/modules/crm/{dto,constants}` — the generated
 * `types/api/schema.ts` types every field `Record<string, never>` and is not usable here.
 */
export type LeadStatus = 'NEW' | 'QUALIFIED' | 'QUOTED' | 'CONVERTED' | 'LOST' | 'ARCHIVED';

/** `crm.constant.ts`'s `LEAD_TERMINAL_STATUSES` — `update()`/`convert()`/`archive()` all
 * reject once a lead is in one of these. `LOST` is a real enum value with no endpoint that
 * ever sets it (confirmed orphaned — `LeadService` has no path that transitions to it). */
export const LEAD_TERMINAL_STATUSES: readonly LeadStatus[] = ['CONVERTED', 'ARCHIVED'];

export interface Lead {
  id: string;
  contactName: string;
  contactEmail: string;
  organization: string | null;
  source: string;
  leadSourceId: string | null;
  serviceInterest: string[];
  industry: string | null;
  status: LeadStatus;
  assigneeId: string | null;
  convertedClientId: string | null;
  convertedCustomerId: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
}

export type LeadSortField = 'createdAt' | 'contactName' | 'status';

export interface LeadListParams {
  page?: number;
  limit?: number;
  status?: LeadStatus;
  assigneeId?: string;
  leadSourceId?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: LeadSortField;
  sortDirection?: SortDirection;
}

export interface ArchiveLeadInput {
  reason?: string;
}

export interface ConvertLeadInput {
  note?: string;
}

/** `apps/api/prisma/schema.prisma`'s `ContactRequestStatus` enum. */
export type ContactRequestStatus = 'NEW' | 'CONTACTED' | 'CONVERTED' | 'SPAM' | 'CLOSED';

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  source: string | null;
  status: ContactRequestStatus;
  convertedLeadId: string | null;
  createdAt: string;
}

export interface ContactRequestListParams {
  page?: number;
  limit?: number;
  status?: ContactRequestStatus;
  search?: string;
}

export interface ConvertContactRequestInput {
  serviceInterest?: string[];
  note?: string;
}

/** Phase 7 (Enterprise CRM/Project-Management) — the agency-pipeline
 * counterpart to ConvertLeadInput (which converts to a Customer, the
 * unrelated e-commerce pipeline). `name` is required only when the lead
 * has no `organization` set — enforced server-side, not here. */
export interface ConvertLeadToClientInput {
  name?: string;
  website?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  note?: string;
}

export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  status: ClientStatus;
  createdAt: string;
  updatedAt: string;
}

export type ClientSortField = 'createdAt' | 'name' | 'status';

export interface ClientListParams {
  page?: number;
  limit?: number;
  status?: ClientStatus;
  search?: string;
  sortBy?: ClientSortField;
  sortDirection?: SortDirection;
}

export interface CreateClientInput {
  name: string;
  industry?: string;
  website?: string;
  primaryEmail?: string;
  primaryPhone?: string;
}

export interface UpdateClientInput {
  name?: string;
  industry?: string;
  website?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  status?: ClientStatus;
}

/** Phase 7, Phase 2 — "Proposal Management," built on the existing `Quotation` model
 * (no separate Proposal model exists — see apps/api's modules/crm/README.md). */
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export const QUOTATION_EDITABLE_STATUSES: readonly QuotationStatus[] = ['DRAFT'];

export interface QuotationItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId: string | null;
  clientId: string | null;
  currency: string;
  subtotalAmount: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  status: QuotationStatus;
  validUntil: string | null;
  issuedAt: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
  items?: QuotationItem[];
}

export type QuotationSortField = 'createdAt' | 'quotationNumber' | 'status' | 'totalAmount';

export interface QuotationListParams {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  leadId?: string;
  clientId?: string;
  search?: string;
  sortBy?: QuotationSortField;
  sortDirection?: SortDirection;
}

export interface CreateQuotationItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateQuotationInput {
  leadId?: string;
  clientId?: string;
  currency?: string;
  taxAmount?: number;
  discountAmount?: number;
  validUntil?: string;
  notes?: string;
  items: CreateQuotationItemInput[];
}

export interface UpdateQuotationInput {
  currency?: string;
  taxAmount?: number;
  discountAmount?: number;
  validUntil?: string;
  notes?: string;
  items?: CreateQuotationItemInput[];
}

export interface RejectQuotationInput {
  reason?: string;
}

export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface FollowUp {
  id: string;
  leadId: string | null;
  customerId: string | null;
  title: string;
  description: string | null;
  dueAt: string;
  status: FollowUpStatus;
  assigneeId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpListParams {
  page?: number;
  limit?: number;
  status?: FollowUpStatus;
  assigneeId?: string;
  leadId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'dueAt' | 'status';
  sortDirection?: SortDirection;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  authorUserId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNoteListParams {
  page?: number;
  limit?: number;
  customerId?: string;
  search?: string;
  sortDirection?: SortDirection;
}

export interface CreateCustomerNoteInput {
  customerId: string;
  body: string;
}

export type CustomerActivityType = 'LEAD_CREATED' | 'LEAD_CONVERTED' | 'FOLLOW_UP_COMPLETED';

export interface CustomerActivity {
  id: string;
  customerId: string | null;
  type: CustomerActivityType;
  summary: string;
  actorUserId: string | null;
  relatedLeadId: string | null;
  metadata: unknown;
  createdAt: string;
}
