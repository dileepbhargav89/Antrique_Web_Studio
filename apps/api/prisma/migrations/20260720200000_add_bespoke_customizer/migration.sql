-- Milestone 6 (Bespoke Customizer Engine) — adds FabricCategory, Fabric,
-- FabricImage, ProductFabric, MeasurementProfile, Measurement,
-- StyleOptionGroup, StyleOption, StyleOptionIncompatibility,
-- ProductCustomization, PricingAdjustment, MonogramOption. Hand-written
-- from `prisma migrate diff`'s raw output, NOT applied verbatim — same
-- two classes of fix as Milestone 5's own migration:
--
-- 1. The auto-diff again proposed re-adding a plain, non-partial unique
--    index on "users"("tenant_id", "email") — the exact documented
--    landmine `20260717090500_partial_unique_indexes`'s header comment
--    warns every future migration touching a partial-unique-indexed
--    table to check for. Users isn't touched by this migration at all;
--    the statement is dropped outright, not modified.
-- 2. Four of this migration's own new unique indexes
--    (fabric_categories/fabrics/measurements/product_customizations) are
--    on soft-deletable tables and are hand-written as partial indexes
--    below instead of the diff's plain ones. `product_customizations`'
--    index is on `product_id` alone (a true 1:1 relation, required by
--    Prisma's own relation validator — see schema.prisma's own comment
--    on that model) rather than `(tenant_id, product_id)`.
--    `fabric_images`/`measurements`/`style_option_groups`/`style_options`/
--    `pricing_adjustments`/`monogram_options`/`product_fabrics`/
--    `style_option_incompatibilities` have no soft-delete column, so their
--    unique indexes (where they have one at all) are correctly plain.

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "FabricCategoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "FabricStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "MeasurementUnit" AS ENUM ('IN', 'CM');
CREATE TYPE "StyleOptionStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PricingAdjustmentType" AS ENUM ('FLAT', 'PERCENTAGE');

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "fabric_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "FabricCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "fabric_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fabrics" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fabric_category_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "composition" TEXT,
    "color_hex" TEXT,
    "price_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "FabricStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "fabrics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fabric_images" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fabric_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fabric_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_fabrics" (
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "fabric_id" UUID NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID,

    CONSTRAINT "product_fabrics_pkey" PRIMARY KEY ("product_id","fabric_id")
);

CREATE TABLE "measurement_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "measurement_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "measurements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "measurement_profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "value" DECIMAL(8,2) NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "style_option_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_customization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "style_option_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "style_options" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "style_option_group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "StyleOptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "style_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "style_option_incompatibilities" (
    "tenant_id" UUID NOT NULL,
    "style_option_a_id" UUID NOT NULL,
    "style_option_b_id" UUID NOT NULL,
    "reason" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID,

    CONSTRAINT "style_option_incompatibilities_pkey" PRIMARY KEY ("style_option_a_id","style_option_b_id")
);

CREATE TABLE "product_customizations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "product_customizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pricing_adjustments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_customization_id" UUID NOT NULL,
    "style_option_id" UUID,
    "label" TEXT NOT NULL,
    "adjustment_type" "PricingAdjustmentType" NOT NULL DEFAULT 'FLAT',
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monogram_options" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_customization_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "max_characters" INTEGER NOT NULL DEFAULT 3,
    "allowed_characters" TEXT,
    "price_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monogram_options_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "fabric_categories_tenant_id_idx" ON "fabric_categories"("tenant_id");
CREATE INDEX "fabric_categories_tenant_id_status_idx" ON "fabric_categories"("tenant_id", "status");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "fabric_categories_tenant_id_slug_key" ON "fabric_categories"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "fabrics_tenant_id_idx" ON "fabrics"("tenant_id");
CREATE INDEX "fabrics_tenant_id_status_idx" ON "fabrics"("tenant_id", "status");
CREATE INDEX "fabrics_fabric_category_id_idx" ON "fabrics"("fabric_category_id");
CREATE UNIQUE INDEX "fabrics_tenant_id_slug_key" ON "fabrics"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "fabric_images_tenant_id_idx" ON "fabric_images"("tenant_id");
CREATE INDEX "fabric_images_fabric_id_idx" ON "fabric_images"("fabric_id");

CREATE INDEX "product_fabrics_tenant_id_idx" ON "product_fabrics"("tenant_id");
CREATE INDEX "product_fabrics_fabric_id_idx" ON "product_fabrics"("fabric_id");

CREATE INDEX "measurement_profiles_tenant_id_idx" ON "measurement_profiles"("tenant_id");
CREATE INDEX "measurement_profiles_user_id_idx" ON "measurement_profiles"("user_id");

CREATE INDEX "measurements_tenant_id_idx" ON "measurements"("tenant_id");
-- Plain, correctly — measurements has no deleted_at column. This is also
-- this milestone's own explicit business rule ("Measurement names are
-- unique within a profile") enforced at the database level.
CREATE UNIQUE INDEX "measurements_measurement_profile_id_name_key" ON "measurements"("measurement_profile_id", "name");

CREATE INDEX "style_option_groups_tenant_id_idx" ON "style_option_groups"("tenant_id");
CREATE INDEX "style_option_groups_product_customization_id_idx" ON "style_option_groups"("product_customization_id");

CREATE INDEX "style_options_tenant_id_idx" ON "style_options"("tenant_id");
CREATE INDEX "style_options_tenant_id_status_idx" ON "style_options"("tenant_id", "status");
CREATE INDEX "style_options_style_option_group_id_idx" ON "style_options"("style_option_group_id");

CREATE INDEX "style_option_incompatibilities_tenant_id_idx" ON "style_option_incompatibilities"("tenant_id");
CREATE INDEX "style_option_incompatibilities_style_option_b_id_idx" ON "style_option_incompatibilities"("style_option_b_id");

-- Partial, not plain — product_customizations is soft-deletable. On
-- "product_id" alone (not "tenant_id, product_id") — a true 1:1 relation,
-- required by Prisma's own relation validator; tenant safety doesn't need
-- tenant_id in the constraint since a Product already belongs to exactly
-- one tenant.
CREATE UNIQUE INDEX "product_customizations_product_id_key" ON "product_customizations"("product_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "product_customizations_tenant_id_idx" ON "product_customizations"("tenant_id");
CREATE INDEX "product_customizations_tenant_id_is_active_idx" ON "product_customizations"("tenant_id", "is_active");

CREATE INDEX "pricing_adjustments_tenant_id_idx" ON "pricing_adjustments"("tenant_id");
CREATE INDEX "pricing_adjustments_product_customization_id_idx" ON "pricing_adjustments"("product_customization_id");
CREATE INDEX "pricing_adjustments_style_option_id_idx" ON "pricing_adjustments"("style_option_id");

CREATE INDEX "monogram_options_tenant_id_idx" ON "monogram_options"("tenant_id");
CREATE INDEX "monogram_options_product_customization_id_idx" ON "monogram_options"("product_customization_id");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "fabric_categories" ADD CONSTRAINT "fabric_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fabrics" ADD CONSTRAINT "fabrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fabrics" ADD CONSTRAINT "fabrics_fabric_category_id_fkey" FOREIGN KEY ("fabric_category_id") REFERENCES "fabric_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fabric_images" ADD CONSTRAINT "fabric_images_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fabric_images" ADD CONSTRAINT "fabric_images_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "fabrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_fabrics" ADD CONSTRAINT "product_fabrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_fabrics" ADD CONSTRAINT "product_fabrics_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_fabrics" ADD CONSTRAINT "product_fabrics_fabric_id_fkey" FOREIGN KEY ("fabric_id") REFERENCES "fabrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "measurement_profiles" ADD CONSTRAINT "measurement_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurement_profiles" ADD CONSTRAINT "measurement_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "measurements" ADD CONSTRAINT "measurements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_measurement_profile_id_fkey" FOREIGN KEY ("measurement_profile_id") REFERENCES "measurement_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "style_option_groups" ADD CONSTRAINT "style_option_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "style_option_groups" ADD CONSTRAINT "style_option_groups_product_customization_id_fkey" FOREIGN KEY ("product_customization_id") REFERENCES "product_customizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "style_options" ADD CONSTRAINT "style_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "style_options" ADD CONSTRAINT "style_options_style_option_group_id_fkey" FOREIGN KEY ("style_option_group_id") REFERENCES "style_option_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "style_option_incompatibilities" ADD CONSTRAINT "style_option_incompatibilities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "style_option_incompatibilities" ADD CONSTRAINT "style_option_incompatibilities_style_option_a_id_fkey" FOREIGN KEY ("style_option_a_id") REFERENCES "style_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "style_option_incompatibilities" ADD CONSTRAINT "style_option_incompatibilities_style_option_b_id_fkey" FOREIGN KEY ("style_option_b_id") REFERENCES "style_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_customizations" ADD CONSTRAINT "product_customizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_customizations" ADD CONSTRAINT "product_customizations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pricing_adjustments" ADD CONSTRAINT "pricing_adjustments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pricing_adjustments" ADD CONSTRAINT "pricing_adjustments_product_customization_id_fkey" FOREIGN KEY ("product_customization_id") REFERENCES "product_customizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_adjustments" ADD CONSTRAINT "pricing_adjustments_style_option_id_fkey" FOREIGN KEY ("style_option_id") REFERENCES "style_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "monogram_options" ADD CONSTRAINT "monogram_options_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "monogram_options" ADD CONSTRAINT "monogram_options_product_customization_id_fkey" FOREIGN KEY ("product_customization_id") REFERENCES "product_customizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- CHECK CONSTRAINTS (Prisma's schema DSL cannot express these — see
-- 20260717091000_check_constraints, the established precedent this
-- mirrors: non-negative ordering, plus two genuinely new rules this
-- milestone's own "Business Rules" section asks for — "Pricing
-- adjustments are valid" (a PERCENTAGE adjustment bounded to a sane
-- range) and "Monogram rules are enforced" (a positive max character
-- count). Note price/priceAdjustment columns on fabrics/style_options/
-- monogram_options/pricing_adjustments.amount are deliberately NOT
-- constrained to >= 0 — unlike ProductVariant.price (an absolute price)
-- in Milestone 5, these are DELTAS and a negative delta is a legitimate
-- discount (see schema.prisma's own comments on each).
-- =============================================================================
ALTER TABLE "fabric_categories" ADD CONSTRAINT "fabric_categories_sort_order_check" CHECK ("sort_order" >= 0);
ALTER TABLE "fabrics" ADD CONSTRAINT "fabrics_sort_order_check" CHECK ("sort_order" >= 0);
ALTER TABLE "fabric_images" ADD CONSTRAINT "fabric_images_sort_order_check" CHECK ("sort_order" >= 0);
ALTER TABLE "style_option_groups" ADD CONSTRAINT "style_option_groups_sort_order_check" CHECK ("sort_order" >= 0);
ALTER TABLE "style_options" ADD CONSTRAINT "style_options_sort_order_check" CHECK ("sort_order" >= 0);

ALTER TABLE "measurements" ADD CONSTRAINT "measurements_value_check" CHECK ("value" > 0);

ALTER TABLE "pricing_adjustments" ADD CONSTRAINT "pricing_adjustments_percentage_bounds_check" CHECK ("adjustment_type" <> 'PERCENTAGE' OR ("amount" >= -100 AND "amount" <= 500));

ALTER TABLE "monogram_options" ADD CONSTRAINT "monogram_options_max_characters_check" CHECK ("max_characters" > 0);

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern for every one of this migration's 12 new tenant-scoped
-- tables, including the join tables — 20260720190000_add_product_catalog's
-- header comment already established that precedent for pure-join tables
-- like user_roles/project_members, extended here to product_fabrics/
-- style_option_incompatibilities — CLAUDE.md "RLS is the backstop, not
-- the only gate": every new tenant table gets it.)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "fabric_categories", "fabrics", "fabric_images", "product_fabrics", "measurement_profiles", "measurements", "style_option_groups", "style_options", "style_option_incompatibilities", "product_customizations", "pricing_adjustments", "monogram_options" TO antrique_app, antrique_service;

ALTER TABLE "fabric_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "fabric_categories"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "fabric_categories"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "fabric_categories"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "fabrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "fabrics"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "fabrics"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "fabrics"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "fabric_images" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "fabric_images"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "fabric_images"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "fabric_images"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "product_fabrics" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "product_fabrics"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "product_fabrics"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "product_fabrics"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "measurement_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "measurement_profiles"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "measurement_profiles"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "measurement_profiles"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "measurements" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "measurements"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "measurements"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "measurements"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "style_option_groups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "style_option_groups"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "style_option_groups"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "style_option_groups"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "style_options" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "style_options"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "style_options"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "style_options"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "style_option_incompatibilities" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "style_option_incompatibilities"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "style_option_incompatibilities"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "style_option_incompatibilities"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "product_customizations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "product_customizations"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "product_customizations"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "product_customizations"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "pricing_adjustments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "pricing_adjustments"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "pricing_adjustments"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "pricing_adjustments"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "monogram_options" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "monogram_options"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "monogram_options"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "monogram_options"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
