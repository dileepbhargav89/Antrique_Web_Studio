-- Milestone 7 (Inventory & Stock Management) — adds Warehouse,
-- InventoryItem, InventoryTransaction, InventoryReservation, Supplier,
-- SupplierProduct. Hand-written from `prisma migrate diff`'s raw output,
-- NOT applied verbatim — same two classes of fix as every migration
-- since Milestone 5's own:
--
-- 1. The auto-diff again proposed re-adding a plain, non-partial unique
--    index on "users"("tenant_id", "email") — dropped outright, this
--    migration doesn't touch that table.
-- 2. `warehouses`/`suppliers` (soft-deletable) get hand-written PARTIAL
--    unique indexes (WHERE deleted_at IS NULL). `inventory_items` needs
--    TWO partial unique indexes, neither of which the diff proposed at
--    all (Prisma's schema DSL can express neither a filtered index nor
--    one scoped to "the non-null side of an XOR pair") — one for
--    (warehouse_id, product_variant_id) and one for (warehouse_id,
--    fabric_id), each additionally filtered to its own FK column being
--    non-null, so a NULL product_variant_id on a fabric-based row never
--    collides with another NULL. `inventory_transactions`/
--    `inventory_reservations`/`supplier_products` have no soft-delete
--    column and no unique constraint of their own, so nothing partial
--    applies to them.

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "WarehouseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "InventoryTransactionType" AS ENUM ('RECEIPT', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'CONSUMPTION');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address_line1" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "status" "WarehouseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "fabric_id" UUID,
    "on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reserved" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reorder_point" DECIMAL(12,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "type" "InventoryTransactionType" NOT NULL,
    "on_hand_delta" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "reserved_delta" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "on_hand_after" DECIMAL(12,3) NOT NULL,
    "reserved_after" DECIMAL(12,3) NOT NULL,
    "reason" TEXT,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_reservations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reference" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "supplier_products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "product_variant_id" UUID,
    "fabric_id" UUID,
    "supplier_sku" TEXT,
    "cost" DECIMAL(12,2),
    "lead_time_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "warehouses_tenant_id_idx" ON "warehouses"("tenant_id");
CREATE INDEX "warehouses_tenant_id_status_idx" ON "warehouses"("tenant_id", "status");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "warehouses_tenant_id_slug_key" ON "warehouses"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "inventory_items_tenant_id_idx" ON "inventory_items"("tenant_id");
CREATE INDEX "inventory_items_warehouse_id_idx" ON "inventory_items"("warehouse_id");
CREATE INDEX "inventory_items_product_variant_id_idx" ON "inventory_items"("product_variant_id");
CREATE INDEX "inventory_items_fabric_id_idx" ON "inventory_items"("fabric_id");
-- Two partial unique indexes, one per side of the variant/fabric XOR —
-- see this file's header comment. Neither was proposed by the auto-diff.
CREATE UNIQUE INDEX "inventory_items_warehouse_id_product_variant_id_key" ON "inventory_items"("warehouse_id", "product_variant_id") WHERE "product_variant_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE UNIQUE INDEX "inventory_items_warehouse_id_fabric_id_key" ON "inventory_items"("warehouse_id", "fabric_id") WHERE "fabric_id" IS NOT NULL AND "deleted_at" IS NULL;

CREATE INDEX "inventory_transactions_tenant_id_idx" ON "inventory_transactions"("tenant_id");
CREATE INDEX "inventory_transactions_inventory_item_id_idx" ON "inventory_transactions"("inventory_item_id");
CREATE INDEX "inventory_transactions_tenant_id_type_idx" ON "inventory_transactions"("tenant_id", "type");
CREATE INDEX "inventory_transactions_tenant_id_created_at_idx" ON "inventory_transactions"("tenant_id", "created_at");

CREATE INDEX "inventory_reservations_tenant_id_idx" ON "inventory_reservations"("tenant_id");
CREATE INDEX "inventory_reservations_inventory_item_id_idx" ON "inventory_reservations"("inventory_item_id");
CREATE INDEX "inventory_reservations_tenant_id_status_idx" ON "inventory_reservations"("tenant_id", "status");

CREATE INDEX "suppliers_tenant_id_idx" ON "suppliers"("tenant_id");
CREATE INDEX "suppliers_tenant_id_status_idx" ON "suppliers"("tenant_id", "status");
CREATE UNIQUE INDEX "suppliers_tenant_id_slug_key" ON "suppliers"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "supplier_products_tenant_id_idx" ON "supplier_products"("tenant_id");
CREATE INDEX "supplier_products_supplier_id_idx" ON "supplier_products"("supplier_id");
CREATE INDEX "supplier_products_product_variant_id_idx" ON "supplier_products"("product_variant_id");
CREATE INDEX "supplier_products_fabric_id_idx" ON "supplier_products"("fabric_id");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "fabrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "fabrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- CHECK CONSTRAINTS (Prisma's schema DSL cannot express these — see
-- 20260717091000_check_constraints, the established precedent this
-- mirrors: non-negative quantities, and a cross-column XOR exactly like
-- that migration's own "quotations_lead_xor_client_check")
-- =============================================================================
-- "OnHand >= 0" / "Reserved <= OnHand" (which, combined with
-- "Available = OnHand − Reserved", implies Available >= 0 too) — this
-- milestone's own business rules, enforced at the database level as the
-- real backstop behind InventoryService's own pre-checks.
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_on_hand_check" CHECK ("on_hand" >= 0);
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_reserved_check" CHECK ("reserved" >= 0);
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_reserved_le_on_hand_check" CHECK ("reserved" <= "on_hand");

-- Exactly one of product_variant_id/fabric_id must be set — same pattern
-- as quotations_lead_xor_client_check, applied to a variant-vs-fabric
-- choice instead of a lead-vs-client one.
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_variant_xor_fabric_check" CHECK (
  ("product_variant_id" IS NOT NULL AND "fabric_id" IS NULL) OR
  ("product_variant_id" IS NULL AND "fabric_id" IS NOT NULL)
);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_variant_xor_fabric_check" CHECK (
  ("product_variant_id" IS NOT NULL AND "fabric_id" IS NULL) OR
  ("product_variant_id" IS NULL AND "fabric_id" IS NOT NULL)
);

ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_cost_check" CHECK ("cost" IS NULL OR "cost" >= 0);
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_lead_time_days_check" CHECK ("lead_time_days" IS NULL OR "lead_time_days" >= 0);

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern for every one of this migration's 6 new tenant-scoped
-- tables — CLAUDE.md "RLS is the backstop, not the only gate")
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "warehouses", "inventory_items", "inventory_transactions", "inventory_reservations", "suppliers", "supplier_products" TO antrique_app, antrique_service;

ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "warehouses"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "warehouses"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "warehouses"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "inventory_items"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "inventory_items"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "inventory_items"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "inventory_transactions"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "inventory_transactions"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "inventory_transactions"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "inventory_reservations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "inventory_reservations"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "inventory_reservations"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "inventory_reservations"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "suppliers"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "suppliers"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "suppliers"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "supplier_products" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "supplier_products"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "supplier_products"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "supplier_products"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
