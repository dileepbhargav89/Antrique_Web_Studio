-- Row-Level Security. Enables tenant isolation at the Postgres level for
-- every tenant-owned table, per CLAUDE.md ("Tenant scope on EVERY query; RLS
-- is the backstop, not the only gate") and docs/architecture/database.md
-- ("RBAC = action gate; RLS = row gate. Both must pass.").
--
-- Full design rationale, session-variable contract, and role model are in
-- docs/architecture/database-schema.md "RLS strategy" — read that alongside
-- this file. Summary:
--   - app.current_tenant_id  (uuid, set per-request/per-job)  -> ordinary tenant-scoped access
--   - app.is_platform_admin  ('on'/unset, set only after RBAC-authorizing an
--     admin action)                                            -> cross-tenant read/write via the API's own role
--   - app.is_service_context ('on'/unset, set only by background
--     workers/cron for legitimate cross-tenant maintenance)    -> cross-tenant access via the worker's own role
--
-- current_setting(..., true) (missing_ok=true) returns NULL, not an error,
-- when a variable was never SET. Every tenant-id comparison below also
-- wraps it in NULLIF(..., '') before casting to uuid, so an empty-string
-- session var (a plausible app-layer bug: setting the variable to '' instead
-- of leaving it unset) also casts to NULL instead of throwing "invalid input
-- syntax for type uuid" — either way, tenant_id = NULL is never true, so a
-- connection that never set (or blank-set) app.current_tenant_id sees zero
-- rows: fails closed, not open.

-- =============================================================================
-- ROLES
-- =============================================================================
-- Postgres roles are cluster-wide, not per-database — CREATE ROLE unconditionally
-- would break `prisma migrate dev`'s shadow-database workflow (the shadow DB is
-- a separate database in the same cluster; the role would already exist by the
-- time this migration replays against it). Guard with an existence check instead.
--
-- Deliberately created WITHOUT a password. Set one out-of-band (secrets
-- manager / `ALTER ROLE ... WITH PASSWORD`), never in a committed migration —
-- see "Local development workflow" in docs/architecture/database-schema.md for
-- why local dev can skip this and keep using the docker-compose superuser.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'antrique_app') THEN
    CREATE ROLE antrique_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'antrique_service') THEN
    CREATE ROLE antrique_service LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO antrique_app, antrique_service;

-- Baseline CRUD on every current table, narrowed immediately below for the
-- append-only tables and the global permission catalog. No sequence grants
-- needed — every PK is a client-generated UUID (see schema.prisma's id
-- convention comment), so there are no serial/identity columns in this schema.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO antrique_app, antrique_service;

-- Applies the same baseline to tables created by *future* migrations, as
-- long as they're run by the same role that executes this statement (the
-- migration/owner role) — see "Migration strategy" for the operational note.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO antrique_app, antrique_service;

-- Append-only tables (schema.prisma: "never updated in place" / "write-once")
-- — INSERT + SELECT only. This is enforced here, at the grant layer, not by a
-- trigger: simpler, and a broken/compromised query can't UPDATE or DELETE a
-- compliance record no matter what RLS policy would otherwise have allowed.
REVOKE UPDATE, DELETE ON "payments", "activity_logs", "audit_logs" FROM antrique_app, antrique_service;

-- permissions: global catalog, "seeded via migration, not user-editable, no
-- update path in the API contract" (schema.prisma) — read-only at runtime.
REVOKE INSERT, UPDATE, DELETE ON "permissions" FROM antrique_app, antrique_service;

-- =============================================================================
-- OPTIMISTIC LOCKING: version auto-increment
-- =============================================================================
-- schema.prisma's original convention was "version is application-managed
-- (Prisma does not auto-increment it)" — trusting every call site to
-- remember to bump it is fragile. This trigger makes the increment
-- unconditional and correct regardless of what the caller's UPDATE sets
-- `version` to (or doesn't). The app-layer optimistic-lock CONTRACT is
-- unchanged and still required: `UPDATE <table> SET ... WHERE id = $1 AND
-- version = $2`, then check affected-row-count = 1; the app no longer also
-- needs to `SET version = version + 1` itself, since this trigger does that
-- unconditionally on every successful UPDATE.
CREATE OR REPLACE FUNCTION antrique_bump_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "tenants" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "roles" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "contact_requests" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "leads" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "clients" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "projects" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "milestones" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "tasks" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "documents" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "quotations" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "invoices" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "media" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "blogs" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "testimonials" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "settings" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON "sessions" FOR EACH ROW EXECUTE FUNCTION antrique_bump_version();

-- =============================================================================
-- TENANT ISOLATION
-- =============================================================================

-- ---- tenants: the tenant boundary itself, keyed by id (no tenant_id column) ----
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_self ON "tenants"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "tenants"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "tenants"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

-- ---- permissions: intentionally NOT enabled ----
-- Global, non-tenant-scoped catalog (docs/architecture/database-schema.md
-- §3: "the one global, non tenant-scoped catalog"). No tenant_id column to
-- filter on and no confidentiality boundary — every tenant reads the same
-- shared resource:action list. Already locked to read-only above (grants).

-- ---- the 25 ordinary tenant-scoped tables ----

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "users"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "users"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "users"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "roles"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "roles"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "roles"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "user_roles"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "user_roles"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "user_roles"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "role_permissions"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "role_permissions"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "role_permissions"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "sessions"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "sessions"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "sessions"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "contact_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "contact_requests"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "contact_requests"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "contact_requests"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "leads"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "leads"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "leads"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "clients"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "clients"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "clients"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "projects"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "projects"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "projects"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "project_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "project_members"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "project_members"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "project_members"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "milestones" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "milestones"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "milestones"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "milestones"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "tasks"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "tasks"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "tasks"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "documents"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "documents"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "documents"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "quotations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "quotations"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "quotations"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "quotations"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "quotation_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "quotation_items"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "quotation_items"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "quotation_items"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "invoices"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "invoices"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "invoices"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "invoice_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "invoice_items"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "invoice_items"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "invoice_items"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "payments"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "payments"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "payments"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "media"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "media"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "media"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "blogs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "blogs"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "blogs"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "blogs"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "testimonials"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "testimonials"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "testimonials"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "notifications"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "notifications"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "notifications"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "activity_logs"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "activity_logs"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "activity_logs"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "audit_logs"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "audit_logs"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "audit_logs"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');

ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "settings"
  FOR ALL
  TO antrique_app, antrique_service
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY platform_admin_override ON "settings"
  FOR ALL
  TO antrique_app
  USING (current_setting('app.is_platform_admin', true) = 'on')
  WITH CHECK (current_setting('app.is_platform_admin', true) = 'on');

CREATE POLICY service_maintenance_override ON "settings"
  FOR ALL
  TO antrique_service
  USING (current_setting('app.is_service_context', true) = 'on')
  WITH CHECK (current_setting('app.is_service_context', true) = 'on');
