import type { SortDirection } from './common';

/**
 * Hand-authored from `apps/api/src/modules/admin/{dto,constants}` — the generated
 * `types/api/schema.ts` types every field `Record<string, never>` and is not usable here.
 */
export const DASHBOARD_KPI_MODULES = ['orders', 'inventory', 'billing', 'crm', 'catalog'] as const;
export type DashboardKpiModule = (typeof DASHBOARD_KPI_MODULES)[number];

/** Deliberately a loose metrics bag server-side (`Record<string, string | number>`, not one
 * rigid shape) — each module computes genuinely different metrics (revenue vs. stock
 * valuation vs. conversion rate). Rendered generically, not against hardcoded field names. */
export interface DashboardKpi {
  module: string;
  metrics: Record<string, string | number>;
}

export interface DashboardWidgetSummary {
  key: string;
  title: string;
  type: string;
  config: unknown;
  sortOrder: number;
}

export interface DashboardOverview {
  modules: DashboardKpi[];
  widgets: DashboardWidgetSummary[];
  systemErrorCount24h: number;
}

export interface DashboardKpiParams {
  dateFrom?: string;
  dateTo?: string;
}

export type NotificationChannel = 'IN_APP' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED';

/** `admin.constant.ts`'s `NOTIFICATION_RETRYABLE_STATUSES` — retry only accepts FAILED. */
export const NOTIFICATION_RETRYABLE_STATUSES: readonly NotificationStatus[] = ['FAILED'];

export interface Notification {
  id: string;
  userId: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  body: string | null;
  relatedResourceType: string | null;
  relatedResourceId: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  failedAt: string | null;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  userId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'status';
  sortDirection?: SortDirection;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  actorUserId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Matched against action and resourceType. */
  search?: string;
  sortBy?: 'createdAt' | 'action' | 'resourceType';
  sortDirection?: SortDirection;
}

export type ReportType = 'SALES_SUMMARY' | 'INVENTORY_SUMMARY' | 'CRM_SUMMARY' | 'BILLING_SUMMARY';

export interface Report {
  id: string;
  type: ReportType;
  parameters: unknown;
  /** The stored snapshot — "Download metadata" returns this JSON, never a file. */
  result: unknown;
  generatedByUserId: string | null;
  createdAt: string;
}

export interface ReportListParams {
  page?: number;
  limit?: number;
  type?: ReportType;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'type';
  sortDirection?: SortDirection;
}

export interface GenerateReportInput {
  type: ReportType;
  dateFrom?: string;
  dateTo?: string;
}
