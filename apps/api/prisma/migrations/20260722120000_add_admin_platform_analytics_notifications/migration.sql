-- Milestone 11 (Admin Platform, Analytics & Notifications) — adds
-- NotificationTemplate, SystemEvent, DashboardWidget, ScheduledReport,
-- plus additive columns on the EXISTING "notifications" table.
-- "audit_logs" needs NO changes at all — reused wholesale (see
-- schema.prisma's own updated comment). Hand-written from `prisma
-- migrate diff`'s raw output, NOT applied verbatim — same fix classes as
-- every migration since Milestone 5's own:
--
-- 1. The auto-diff again proposed re-adding a plain, non-partial unique
--    index on "users"("tenant_id", "email") — dropped outright, this
--    migration doesn't touch that table.
-- 2. "notification_templates"/"dashboard_widgets" (soft-deletable) get
--    hand-written PARTIAL unique indexes (WHERE deleted_at IS NULL)
--    instead of the diff's plain ones — same landmine as every
--    soft-deletable unique key before it.
-- 3. New CHECK constraints beyond every prior migration's own non-
--    negative-value checks: "notifications_retry_count_check" and
--    "dashboard_widgets_sort_order_check" (both >= 0, the same
--    non-negative-counter/sort-order pattern this schema already uses
--    everywhere else).
-- 4. "system_events"/"scheduled_reports" get the SAME database-
--    privilege-level UPDATE/DELETE revoke "payments"/
--    "payment_allocations"/"activity_logs"/"audit_logs" already have —
--    both are append-only event/output ledgers this milestone's own
--    brief asks no edit action for ("Audit records are append-only" /
--    "Reports are immutable after generation"). "notification_templates"/
--    "dashboard_widgets" do NOT get this treatment — both are ordinary,
--    admin-editable configuration rows (soft-deletable, with a real
--    `updated_at`/`version`), not event ledgers.

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'FAILED');
CREATE TYPE "SystemEventSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');
CREATE TYPE "DashboardWidgetType" AS ENUM ('KPI', 'CHART', 'LIST');
CREATE TYPE "ReportType" AS ENUM ('SALES_SUMMARY', 'INVENTORY_SUMMARY', 'CRM_SUMMARY', 'BILLING_SUMMARY');

-- =============================================================================
-- ALTER EXISTING TABLE (notifications) — additive only, see
-- schema.prisma's own updated comment on Notification.
-- =============================================================================
ALTER TABLE "notifications" ADD COLUMN "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "notifications" ADD COLUMN "sent_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "failed_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "retry_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "notifications" ADD COLUMN "last_error" TEXT;

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "SystemEventSeverity" NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "related_resource_type" TEXT,
    "related_resource_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_widgets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DashboardWidgetType" NOT NULL,
    "config" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "scheduled_reports" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "ReportType" NOT NULL,
    "parameters" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "generated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "notification_templates_tenant_id_idx" ON "notification_templates"("tenant_id");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "notification_templates_tenant_id_key_channel_key" ON "notification_templates"("tenant_id", "key", "channel") WHERE "deleted_at" IS NULL;

CREATE INDEX "system_events_tenant_id_created_at_idx" ON "system_events"("tenant_id", "created_at");
CREATE INDEX "system_events_tenant_id_severity_idx" ON "system_events"("tenant_id", "severity");
CREATE INDEX "system_events_related_resource_type_related_resource_id_idx" ON "system_events"("related_resource_type", "related_resource_id");

CREATE INDEX "dashboard_widgets_tenant_id_idx" ON "dashboard_widgets"("tenant_id");
CREATE INDEX "dashboard_widgets_tenant_id_is_active_idx" ON "dashboard_widgets"("tenant_id", "is_active");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "dashboard_widgets_tenant_id_key_key" ON "dashboard_widgets"("tenant_id", "key") WHERE "deleted_at" IS NULL;

CREATE INDEX "scheduled_reports_tenant_id_created_at_idx" ON "scheduled_reports"("tenant_id", "created_at");
CREATE INDEX "scheduled_reports_tenant_id_type_idx" ON "scheduled_reports"("tenant_id", "type");

CREATE INDEX "notifications_tenant_id_status_idx" ON "notifications"("tenant_id", "status");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "system_events" ADD CONSTRAINT "system_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- CHECK CONSTRAINTS (Prisma's schema DSL cannot express these — see
-- 20260717091000_check_constraints, the established precedent this
-- mirrors: non-negative counters/sort orders)
-- =============================================================================
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_retry_count_check" CHECK ("retry_count" >= 0);
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_sort_order_check" CHECK ("sort_order" >= 0);

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern for every one of this migration's 4 new tenant-scoped
-- tables — CLAUDE.md "RLS is the backstop, not the only gate")
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "notification_templates", "system_events", "dashboard_widgets", "scheduled_reports" TO antrique_app, antrique_service;

-- "system_events"/"scheduled_reports" are append-only event/output
-- ledgers, same class as "payments"/"payment_allocations"/
-- "activity_logs"/"audit_logs" — INSERT + SELECT only, enforced at the
-- grant layer, not a trigger. See this file's own header comment.
REVOKE UPDATE, DELETE ON "system_events", "scheduled_reports" FROM antrique_app, antrique_service;

ALTER TABLE "notification_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "notification_templates"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "notification_templates"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "notification_templates"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "system_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "system_events"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "system_events"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "system_events"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "dashboard_widgets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "dashboard_widgets"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "dashboard_widgets"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "dashboard_widgets"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "scheduled_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "scheduled_reports"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "scheduled_reports"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "scheduled_reports"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
