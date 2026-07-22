-- Milestone 12 (Performance Engineering) — a single, hand-written,
-- PARTIAL index, added to back a real query written THIS milestone
-- (InventoryRepository.findLowStockItems(), see that method's own
-- comment): "Inventory: Low stock items" now does the `on_hand <=
-- reorder_point` comparison in the database itself instead of fetching
-- every item with a reorder point set and filtering in Node. Postgres
-- can't index a column-to-column comparison directly, but it CAN quickly
-- narrow to just the (typically much smaller) subset of items that
-- track a reorder point at all before evaluating that comparison row by
-- row — that's what this index gives it. Scoped to `WHERE reorder_point
-- IS NOT NULL AND deleted_at IS NULL`, mirroring this schema's own
-- established "hand-written partial index for a predicate Prisma's
-- `@@index` DSL can't express" pattern (see InventoryItem's own
-- schema.prisma comment for the two PARTIAL UNIQUE indexes Milestone 7
-- already added the same way).
--
-- This is deliberately the ONLY new index in this migration. This
-- milestone's own audit (docs/architecture/performance.md) found the
-- rest of this schema already densely indexed — every tenant-scoped
-- table already carries `tenantId`/`tenantId+status`/`tenantId+createdAt`
-- (or the equivalent for its own domain) from the migrations that
-- created it — and "Never create duplicate indexes... Add only
-- necessary" (this milestone's own explicit instruction) argues against
-- speculatively widening coverage the audit found no real query
-- depending on.
CREATE INDEX "inventory_items_tenant_id_reorder_point_idx"
  ON "inventory_items"("tenant_id", "reorder_point")
  WHERE "reorder_point" IS NOT NULL AND "deleted_at" IS NULL;
