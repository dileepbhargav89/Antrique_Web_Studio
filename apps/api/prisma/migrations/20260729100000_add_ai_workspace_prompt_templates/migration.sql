-- Phase 8 (AI Workspace), Step 2 — Prompt Library. Adds PromptTemplate.
-- Hand-written from `prisma migrate diff`'s raw output, NOT applied
-- verbatim — same discipline as every migration before it:
-- 1. The auto-diff again proposed re-adding a plain, non-partial unique
--    index on "users"("tenant_id", "email") — dropped outright, this
--    migration doesn't touch that table.
-- 2. "prompt_templates" (soft-deletable, slug-like `key` column) gets a
--    hand-written PARTIAL unique index (WHERE deleted_at IS NULL) instead
--    of the diff's plain one — same landmine as every soft-deletable
--    unique key before it (lead_sources, customer_tags, ...).

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "PromptCategory" AS ENUM ('PROPOSAL_GENERATION', 'REQUIREMENT_ANALYSIS', 'WEBSITE_AUDIT', 'SEO_RECOMMENDATIONS', 'CLIENT_EMAIL', 'MEETING_SUMMARY', 'SCOPE_GENERATION', 'PROJECT_ESTIMATION', 'RISK_ANALYSIS');

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "prompt_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "category" "PromptCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "variables" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "prompt_templates_tenant_id_idx" ON "prompt_templates"("tenant_id");
CREATE INDEX "prompt_templates_tenant_id_category_idx" ON "prompt_templates"("tenant_id", "category");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "prompt_templates_tenant_id_key_key" ON "prompt_templates"("tenant_id", "key") WHERE "deleted_at" IS NULL;

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "prompt_templates" ADD CONSTRAINT "prompt_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "prompt_templates" TO antrique_app, antrique_service;

ALTER TABLE "prompt_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "prompt_templates"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "prompt_templates"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "prompt_templates"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
