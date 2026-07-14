# Database Design

Multi-tenant PostgreSQL. `tenant_id` is the spine of every table, index, and
access rule (RLS-backed). UUID PKs (no enumeration). UTC timestamps.

## Audit fields (every table)
created_at, updated_at, created_by, updated_by, version (optimistic lock).
Distinct from the immutable audit_log (event history with before/after).

## Soft delete (most tables)
deleted_at, deleted_by. Live = deleted_at IS NULL. Partial unique indexes include
`WHERE deleted_at IS NULL` (email reuse after delete). Exceptions: audit_log and
payment are append-only; join tables hard-delete.

## Status fields (constrained enums, not booleans)
tenant(active/suspended/churned), user(invited/active/disabled),
lead(new/qualified/quoted/converted/lost), project(draft/active/in_review/
launched/maintenance/archived), milestone, invoice, payment, change_request, asset.

## Relationships (deletion behavior)
Content follows its project (cascade soft-delete); money + audit never cascade
(restrict). lead→project set-null. user↔role, role↔permission many-to-many.

## Constraints
Tenant-scoped uniqueness (email unique per tenant), check constraints (amount ≥0,
status in set), NOT NULL on required FKs, FK integrity.

## Indexes (from access patterns)
Every composite leads with tenant_id. FK indexes, (tenant_id,status) filters,
partial unique, time-range (tenant_id,created_at), provider_ref on payment.

## RBAC (relational, not hard-coded)
permission (resource:action) → role_permission → role (per tenant) → user_role →
user. RBAC = action gate; RLS = row gate. Both must pass.

## Audit log
Append-only: actor, action, resource, before/after (jsonb), ip, ua, timestamp.
Write-once. Critical for gov/health compliance.

## Future scalability
Shared-DB→schema/DB-per-tenant path; time-partition audit_log/messages; read
replicas; archival via soft-delete+status; FTS→dedicated engine; jsonb metadata
for custom fields. Model the relational core strictly, leave growth axes loose.
