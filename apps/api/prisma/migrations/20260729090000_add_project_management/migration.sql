-- Phase 7 (Project/Task/Milestone) — adds Project, ProjectMember, Milestone,
-- Task, Document, ActivityLog, and Comment. The first six were already fully
-- modeled in schema.prisma since Phase 1.1A (see Project's own doc comment)
-- but had never been migrated — confirmed by diffing this migrations folder
-- against the schema before this file existed. Comment is new this phase
-- (no comment/annotation model existed anywhere before).
--
-- Reconciling a pre-existing DB/migration-history drift: this dev database
-- already had tables/RLS/grants for projects, project_members, milestones,
-- tasks, documents, and activity_logs applied directly (no migration file,
-- no _prisma_migrations row) from work that predates this file. This
-- migration is the missing record of that work, written to match the live
-- schema exactly, plus the genuinely new comments table. Applied to the
-- real dev database via `prisma migrate resolve --applied` (six tables) +
-- a targeted `db execute` for the comments table only (the one actually
-- missing) — see docs/implementation/decisions.md for why.
--
-- Fixed 2026-07-30 (Phase 9, Module 1 prep): this file's SQL originally
-- re-declared `CREATE TYPE`/`CREATE TABLE`/indexes/FKs/RLS for all six
-- pre-existing tables verbatim from `prisma migrate diff`, even though the
-- comment above already says those six were reconciled via
-- `migrate resolve --applied`, never literally re-run. That mismatch
-- between "what this file's SQL does" and "what actually happened" meant
-- replaying this migration file against any genuinely fresh database (the
-- shadow database `prisma migrate dev` creates per run, CI, a new
-- developer's machine, or a real production first deploy) failed outright
-- with `type "ProjectStatus" already exists` — confirmed live while
-- generating this phase's first new migration. Every type/table/index/FK/
-- RLS statement for `projects`/`project_members`/`milestones`/`tasks`/
-- `documents`/`activity_logs` (all six already created by
-- `20260717090000_init` + `20260717091500_row_level_security`, confirmed
-- by grep across every prior migration file) has been removed below,
-- leaving only the `comments` table's own SQL — the one genuinely new
-- table this migration ever added, matching this file's own header
-- comment and what a fresh-database replay now needs.
--
-- Hand-written, not applied verbatim from `prisma migrate diff` — same
-- discipline as every migration before it: Comment gets a hand-written
-- "exactly one of task_id/milestone_id" CHECK, mirroring
-- quotations_lead_xor_client_check / follow_up_tasks_lead_xor_customer_check
-- exactly.

-- =============================================================================
-- TABLES
-- =============================================================================
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "task_id" UUID,
    "milestone_id" UUID,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX "comments_tenant_id_idx" ON "comments"("tenant_id");
CREATE INDEX "comments_task_id_idx" ON "comments"("task_id");
CREATE INDEX "comments_milestone_id_idx" ON "comments"("milestone_id");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================
ALTER TABLE "comments" ADD CONSTRAINT "comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- CHECK CONSTRAINTS (Prisma's schema DSL cannot express these — see
-- 20260717091000_check_constraints, the established precedent this mirrors:
-- the lead/client XOR on quotations, extended here to a task/milestone XOR)
-- =============================================================================
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_xor_milestone_check" CHECK (
  ("task_id" IS NOT NULL AND "milestone_id" IS NULL) OR
  ("task_id" IS NULL AND "milestone_id" IS NOT NULL)
);

-- =============================================================================
-- ROW-LEVEL SECURITY (mirrors 20260717091500_row_level_security's exact
-- per-table pattern — CLAUDE.md "RLS is the backstop, not the only gate")
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON "comments" TO antrique_app, antrique_service;

ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "comments"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "comments"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "comments"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
