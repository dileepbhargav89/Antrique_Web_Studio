-- Phase 8 (AI Workspace), Step 7 — Content Assistant. Adds ContentDraft,
-- the one AI output kind this spec step requires persisting ("Store
-- drafts only. Never publish automatically.") rather than the ephemeral
-- shape Steps 3-5/Step 6's own generate() use. Hand-written from
-- `prisma migrate diff`'s raw output, same discipline as every migration
-- before it (see 20260729100000_add_ai_workspace_prompt_templates's own
-- header comment for the recurring auto-diff quirks this avoids).

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE "ContentDraftType" AS ENUM ('CASE_STUDY', 'SERVICE_DESCRIPTION', 'BLOG_DRAFT', 'FAQ', 'LANDING_PAGE', 'SOCIAL_POST');

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "content_drafts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" "ContentDraftType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "content_drafts_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "content_drafts_tenant_id_idx" ON "content_drafts"("tenant_id");
CREATE INDEX "content_drafts_tenant_id_type_idx" ON "content_drafts"("tenant_id", "type");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "content_drafts" ADD CONSTRAINT "content_drafts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern)
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "content_drafts" TO antrique_app, antrique_service;

ALTER TABLE "content_drafts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "content_drafts"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "content_drafts"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "content_drafts"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
