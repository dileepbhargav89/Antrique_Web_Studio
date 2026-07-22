-- Milestone 10 (Payments & Billing Foundation) — adds TaxRate,
-- PaymentMethod, PaymentAllocation, plus additive changes to the
-- EXISTING "invoices"/"payments" tables. Hand-written from `prisma
-- migrate diff`'s raw output, NOT applied verbatim — same fix classes as
-- every migration since Milestone 5's own:
--
-- 1. The auto-diff again proposed re-adding a plain, non-partial unique
--    index on "users"("tenant_id", "email") — dropped outright, this
--    migration doesn't touch that table.
-- 2. "payment_methods" (soft-deletable) gets a hand-written PARTIAL
--    unique index (WHERE deleted_at IS NULL) instead of the diff's
--    plain one — same landmine as every soft-deletable unique key
--    before it.
-- 3. Two new CHECK-constraint classes beyond every prior migration's
--    own non-negative/positive-value/XOR checks:
--    a. "invoices_client_xor_customer_check" — exactly one of
--       client_id/customer_id, mirroring "quotations_lead_xor_client_check"
--       (20260717091000_check_constraints) exactly, extended from a
--       lead-vs-client choice to a client-vs-customer one.
--    b. "invoices_order_requires_customer_check" — order_id is only
--       ever meaningful alongside customer_id (an order-based invoice
--       always has a paying Customer), never alongside client_id alone.
--    The existing "invoices_amount_paid_check" (amount_paid >= 0 AND
--    amount_paid <= total_amount, added in that same prior migration)
--    ALREADY enforces this milestone's own "Paid amount never exceeds
--    invoice total" rule — nothing new needed for that.
-- 4. "payment_allocations" gets the SAME database-privilege-level
--    UPDATE/DELETE revoke "payments" already has
--    (20260717091500_row_level_security) — both are financial-ledger
--    rows this milestone's own brief asks no "un-allocate"/edit action
--    for; INSERT + SELECT only, enforced at the grant layer, not by
--    trigger, same reasoning that migration's own header comment gives
--    for "payments"/"activity_logs"/"audit_logs".

-- =============================================================================
-- ALTER EXISTING TABLES (invoices, payments) — additive only, see
-- schema.prisma's own updated comments on Invoice/Payment.
-- =============================================================================
ALTER TABLE "invoices" ALTER COLUMN "client_id" DROP NOT NULL;
ALTER TABLE "invoices" ADD COLUMN "customer_id" UUID;
ALTER TABLE "invoices" ADD COLUMN "order_id" UUID;
ALTER TABLE "invoices" ADD COLUMN "tax_rate_id" UUID;

ALTER TABLE "payments" ALTER COLUMN "invoice_id" DROP NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "provider" DROP NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "provider_ref" DROP NOT NULL;
ALTER TABLE "payments" ADD COLUMN "payment_method_id" UUID;
ALTER TABLE "payments" ADD COLUMN "method" TEXT NOT NULL DEFAULT 'unspecified';
ALTER TABLE "payments" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "payments" ADD COLUMN "reference" TEXT;

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "tax_rates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "tax_rates_tenant_id_idx" ON "tax_rates"("tenant_id");
CREATE INDEX "tax_rates_tenant_id_is_active_idx" ON "tax_rates"("tenant_id", "is_active");

CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "payment_methods_tenant_id_slug_key" ON "payment_methods"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "payment_allocations_tenant_id_idx" ON "payment_allocations"("tenant_id");
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");
CREATE INDEX "payment_allocations_invoice_id_idx" ON "payment_allocations"("invoice_id");
CREATE INDEX "payment_allocations_tenant_id_created_at_idx" ON "payment_allocations"("tenant_id", "created_at");

CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");
CREATE INDEX "invoices_order_id_idx" ON "invoices"("order_id");
CREATE INDEX "invoices_tax_rate_id_idx" ON "invoices"("tax_rate_id");

CREATE INDEX "payments_payment_method_id_idx" ON "payments"("payment_method_id");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- CHECK CONSTRAINTS (Prisma's schema DSL cannot express these — see
-- 20260717091000_check_constraints, the established precedent this
-- mirrors: the lead/client XOR on quotations, extended here to a
-- client/customer XOR on invoices)
-- =============================================================================
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_xor_customer_check" CHECK (
  ("client_id" IS NOT NULL AND "customer_id" IS NULL) OR
  ("client_id" IS NULL AND "customer_id" IS NOT NULL)
);
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_requires_customer_check" CHECK (
  "order_id" IS NULL OR "customer_id" IS NOT NULL
);

ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_rate_check" CHECK ("rate" >= 0 AND "rate" <= 100);

ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_amount_check" CHECK ("amount" > 0);

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern for every one of this migration's 3 new tenant-scoped
-- tables — CLAUDE.md "RLS is the backstop, not the only gate")
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "tax_rates", "payment_methods", "payment_allocations" TO antrique_app, antrique_service;

-- "payment_allocations" is a financial-ledger row, same class as
-- "payments" itself (Phase 1.1A/1.1B) — INSERT + SELECT only, enforced
-- at the grant layer, not a trigger. See this file's own header comment.
REVOKE UPDATE, DELETE ON "payment_allocations" FROM antrique_app, antrique_service;

ALTER TABLE "tax_rates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "tax_rates"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "tax_rates"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "tax_rates"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "payment_methods"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "payment_methods"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "payment_methods"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "payment_allocations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "payment_allocations"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "payment_allocations"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "payment_allocations"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
