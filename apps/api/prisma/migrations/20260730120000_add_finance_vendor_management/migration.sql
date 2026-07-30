-- Phase 9, Module 1, Step 1 (Vendor Management) — adds Vendor, distinct
-- from Supplier (Milestone 7 — product/inventory sourcing only). Hand-
-- written, not applied verbatim from `prisma migrate diff` — same
-- discipline as every migration before it (the diff tool also proposes an
-- unrelated `users(tenant_id, email)` unique constraint here, a known
-- false positive: that column pair is already enforced by a hand-written
-- PARTIAL unique index from an earlier migration, WHERE deleted_at IS
-- NULL, which Prisma's schema DSL can't express and its diff engine
-- doesn't detect — not applied here, same as every prior migration that's
-- hit this).

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "gstin" TEXT,
    "payment_terms" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
-- Partial unique WHERE deleted_at IS NULL — same convention as
-- suppliers_tenant_id_slug_key (20260721100000_add_inventory_management).
CREATE UNIQUE INDEX "vendors_tenant_id_slug_key" ON "vendors"("tenant_id", "slug") WHERE "deleted_at" IS NULL;
CREATE INDEX "vendors_tenant_id_idx" ON "vendors"("tenant_id");
CREATE INDEX "vendors_tenant_id_status_idx" ON "vendors"("tenant_id", "status");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern — CLAUDE.md "RLS is the backstop, not the only gate")
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "vendors" TO antrique_app, antrique_service;

ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "vendors"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "vendors"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "vendors"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
