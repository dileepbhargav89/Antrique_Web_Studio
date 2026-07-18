-- Replaces the 6 full-table unique indexes the init migration generated
-- (from schema.prisma's `@@unique` — Prisma's schema DSL cannot express a
-- `WHERE` clause) with partial unique indexes scoped to live rows only, per
-- docs/architecture/database.md "Soft delete": "Live = deleted_at IS NULL.
-- Partial unique indexes include WHERE deleted_at IS NULL (email reuse
-- after delete)."
--
-- Without this, a soft-deleted user's email (or a soft-deleted role's key,
-- quotation/invoice number, blog slug, setting key) would permanently block
-- reuse of that value — the exact bug the design doc calls out by name.
--
-- schema.prisma's `@@unique([...])` declarations are intentionally left
-- as-is (Prisma has no partial-index syntax to change them to) — this is
-- the documented, permanent divergence between the Prisma-declared schema
-- and the actual database. See docs/architecture/database-schema.md
-- "Migration strategy" for the operational consequence: `prisma migrate
-- dev` may propose a diff that tries to "fix" these back to plain unique
-- indexes on some future unrelated schema change touching these tables —
-- expected, review and drop that part of the generated diff before applying.

-- users: also case-insensitive (LOWER(email)) — email uniqueness is a
-- product invariant, and no real product wants "Foo@x.com" and "foo@x.com"
-- to count as two accounts.
DROP INDEX "users_tenant_id_email_key";
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users" ("tenant_id", LOWER("email")) WHERE "deleted_at" IS NULL;

-- roles
DROP INDEX "roles_tenant_id_key_key";
CREATE UNIQUE INDEX "roles_tenant_id_key_key" ON "roles" ("tenant_id", "key") WHERE "deleted_at" IS NULL;

-- quotations
DROP INDEX "quotations_tenant_id_quotation_number_key";
CREATE UNIQUE INDEX "quotations_tenant_id_quotation_number_key" ON "quotations" ("tenant_id", "quotation_number") WHERE "deleted_at" IS NULL;

-- invoices
DROP INDEX "invoices_tenant_id_invoice_number_key";
CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices" ("tenant_id", "invoice_number") WHERE "deleted_at" IS NULL;

-- blogs
DROP INDEX "blogs_tenant_id_slug_key";
CREATE UNIQUE INDEX "blogs_tenant_id_slug_key" ON "blogs" ("tenant_id", "slug") WHERE "deleted_at" IS NULL;

-- settings
DROP INDEX "settings_tenant_id_key_key";
CREATE UNIQUE INDEX "settings_tenant_id_key_key" ON "settings" ("tenant_id", "key") WHERE "deleted_at" IS NULL;
