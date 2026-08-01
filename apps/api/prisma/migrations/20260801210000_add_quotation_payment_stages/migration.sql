-- Quotation PDF redesign (professional letterhead + 3-stage payment
-- schedule) — the one genuinely new table this migration adds. Hand-
-- written, not applied verbatim from `prisma migrate diff`, same
-- discipline as every migration since `20260717090000_init` (see e.g.
-- `20260729090000_add_project_management`'s own header comment for why:
-- a fresh replay must only ever contain SQL for tables that don't already
-- exist).

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "quotation_payment_stages" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "trigger_note" TEXT,
    "percentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_payment_stages_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "quotation_payment_stages_tenant_id_idx" ON "quotation_payment_stages"("tenant_id");
CREATE INDEX "quotation_payment_stages_quotation_id_idx" ON "quotation_payment_stages"("quotation_id");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "quotation_payment_stages" ADD CONSTRAINT "quotation_payment_stages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quotation_payment_stages" ADD CONSTRAINT "quotation_payment_stages_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- ROW LEVEL SECURITY (mirrors every post-init table — see
-- 20260717091500_row_level_security's own three-policy shape, replayed
-- verbatim per table since: tenant_isolation / platform_admin_override /
-- service_maintenance_override)
-- =============================================================================
ALTER TABLE "quotation_payment_stages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "quotation_payment_stages"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "quotation_payment_stages"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "quotation_payment_stages"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
