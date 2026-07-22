-- Milestone 9 (CRM & Customer Operations) — adds LeadSource, CustomerNote,
-- CustomerActivity, FollowUpTask, CustomerTag, CustomerTagAssignment, plus
-- two additive nullable columns on the EXISTING "leads" table
-- (lead_source_id, converted_customer_id) and one new LeadStatus enum
-- value (ARCHIVED). Hand-written from `prisma migrate diff`'s raw output,
-- NOT applied verbatim — same fix classes as every migration since
-- Milestone 5's own:
--
-- 1. The auto-diff again proposed re-adding a plain, non-partial unique
--    index on "users"("tenant_id", "email") — dropped outright, this
--    migration doesn't touch that table.
-- 2. "lead_sources"/"customer_tags" (soft-deletable) get hand-written
--    PARTIAL unique indexes (WHERE deleted_at IS NULL) instead of the
--    diff's plain ones — same landmine as every soft-deletable unique
--    key before it. "customer_tag_assignments" own unique index is
--    correctly PLAIN as generated — that table has no soft-delete column
--    (unassign is a real DELETE, see schema.prisma's own comment).
-- 3. A new CHECK-constraint class beyond every prior migration's
--    non-negative/positive-value checks: "exactly one of lead_id/
--    customer_id" on follow_up_tasks — a hand-written cross-column CHECK
--    mirroring quotations_lead_xor_client_check exactly, extended from a
--    lead-vs-client choice to a lead-vs-customer one.
-- 4. ALTER TYPE ... ADD VALUE (LeadStatus.ARCHIVED) is run on its own,
--    before anything else references it, since Postgres requires a new
--    enum value to be committed before it can be used — no INSERT in
--    this migration references ARCHIVED, so this is a non-issue in
--    practice, but the statement is kept first regardless.
-- 5. customer_activities.customer_id is nullable (NOT what a first-pass
--    diff off a required column would generate) — "lead creation" fires
--    before any Customer exists, so that trigger's own activity row has
--    no customer to reference yet. See schema.prisma's own comment on
--    CustomerActivity. No CHECK constraint enforcing "at least one of
--    customer_id/related_lead_id" — this table has no public write
--    endpoint, only two internal callers, both of which always populate
--    at least one.

-- =============================================================================
-- ENUMS
-- =============================================================================
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TYPE "CustomerActivityType" AS ENUM ('LEAD_CREATED', 'LEAD_CONVERTED', 'FOLLOW_UP_COMPLETED');
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- =============================================================================
-- ALTER EXISTING TABLE (leads) — additive only, see this file's header
-- comment and schema.prisma's own updated comment on Lead.
-- =============================================================================
ALTER TABLE "leads" ADD COLUMN "lead_source_id" UUID;
ALTER TABLE "leads" ADD COLUMN "converted_customer_id" UUID;

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "lead_sources" (
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

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_notes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "author_user_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_activities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID,
    "type" "CustomerActivityType" NOT NULL,
    "summary" TEXT NOT NULL,
    "actor_user_id" UUID,
    "related_lead_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "follow_up_tasks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID,
    "customer_id" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "assignee_id" UUID,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_tags" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_tag_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "lead_sources_tenant_id_idx" ON "lead_sources"("tenant_id");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "lead_sources_tenant_id_slug_key" ON "lead_sources"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_notes_tenant_id_idx" ON "customer_notes"("tenant_id");
CREATE INDEX "customer_notes_customer_id_idx" ON "customer_notes"("customer_id");
CREATE INDEX "customer_notes_tenant_id_created_at_idx" ON "customer_notes"("tenant_id", "created_at");

CREATE INDEX "customer_activities_tenant_id_idx" ON "customer_activities"("tenant_id");
CREATE INDEX "customer_activities_customer_id_idx" ON "customer_activities"("customer_id");
CREATE INDEX "customer_activities_tenant_id_created_at_idx" ON "customer_activities"("tenant_id", "created_at");
CREATE INDEX "customer_activities_related_lead_id_idx" ON "customer_activities"("related_lead_id");

CREATE INDEX "follow_up_tasks_tenant_id_idx" ON "follow_up_tasks"("tenant_id");
CREATE INDEX "follow_up_tasks_tenant_id_status_idx" ON "follow_up_tasks"("tenant_id", "status");
CREATE INDEX "follow_up_tasks_tenant_id_due_at_idx" ON "follow_up_tasks"("tenant_id", "due_at");
CREATE INDEX "follow_up_tasks_lead_id_idx" ON "follow_up_tasks"("lead_id");
CREATE INDEX "follow_up_tasks_customer_id_idx" ON "follow_up_tasks"("customer_id");
CREATE INDEX "follow_up_tasks_assignee_id_idx" ON "follow_up_tasks"("assignee_id");

CREATE INDEX "customer_tags_tenant_id_idx" ON "customer_tags"("tenant_id");
-- Partial, not plain — see this file's header comment.
CREATE UNIQUE INDEX "customer_tags_tenant_id_slug_key" ON "customer_tags"("tenant_id", "slug") WHERE "deleted_at" IS NULL;

CREATE INDEX "customer_tag_assignments_tenant_id_idx" ON "customer_tag_assignments"("tenant_id");
CREATE INDEX "customer_tag_assignments_customer_id_idx" ON "customer_tag_assignments"("customer_id");
CREATE INDEX "customer_tag_assignments_customer_tag_id_idx" ON "customer_tag_assignments"("customer_tag_id");
-- Plain, correctly — this join is never soft-deleted (real DELETE on unassign).
CREATE UNIQUE INDEX "customer_tag_assignments_tenant_id_customer_id_customer_tag_key" ON "customer_tag_assignments"("tenant_id", "customer_id", "customer_tag_id");

CREATE INDEX "leads_lead_source_id_idx" ON "leads"("lead_source_id");
CREATE INDEX "leads_converted_customer_id_idx" ON "leads"("converted_customer_id");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "leads" ADD CONSTRAINT "leads_lead_source_id_fkey" FOREIGN KEY ("lead_source_id") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_converted_customer_id_fkey" FOREIGN KEY ("converted_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_related_lead_id_fkey" FOREIGN KEY ("related_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_tag_id_fkey" FOREIGN KEY ("customer_tag_id") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- CHECK CONSTRAINTS (Prisma's schema DSL cannot express these — see
-- 20260717091000_check_constraints, the established precedent this
-- mirrors: the lead/client XOR on quotations, extended here to a
-- lead/customer XOR)
-- =============================================================================
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_lead_xor_customer_check" CHECK (
  ("lead_id" IS NOT NULL AND "customer_id" IS NULL) OR
  ("lead_id" IS NULL AND "customer_id" IS NOT NULL)
);

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern for every one of this migration's 6 new tenant-scoped
-- tables — CLAUDE.md "RLS is the backstop, not the only gate")
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "lead_sources", "customer_notes", "customer_activities", "follow_up_tasks", "customer_tags", "customer_tag_assignments" TO antrique_app, antrique_service;

ALTER TABLE "lead_sources" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "lead_sources"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "lead_sources"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "lead_sources"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "customer_notes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customer_notes"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "customer_notes"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "customer_notes"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "customer_activities" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customer_activities"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "customer_activities"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "customer_activities"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "follow_up_tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "follow_up_tasks"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "follow_up_tasks"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "follow_up_tasks"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "customer_tags" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customer_tags"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "customer_tags"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "customer_tags"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "customer_tag_assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "customer_tag_assignments"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "customer_tag_assignments"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "customer_tag_assignments"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
