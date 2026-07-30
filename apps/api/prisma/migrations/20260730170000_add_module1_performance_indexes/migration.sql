-- Phase 10, Module 1 (API Performance) — closes the specific composite-
-- index gaps found while auditing every module built since Milestone 12
-- (Performance Engineering, 20260722130000): each model's list-query DTO
-- was checked against its actual `@@index` coverage. Everything else
-- audited (Lead/Client/Project/Task/Order/Invoice/Product/ContactRequest/
-- NewsletterSubscriber/Quotation/ContentDraft/Vendor's own status filter/
-- PromptTemplate's own category filter) already had the matching
-- composite — only these four were genuinely missing one:
--
-- Vendor: VendorListQueryDto defaults `sortBy: 'createdAt'`, but only
-- `tenant_id` (alone) and `(tenant_id, status)` existed — no composite to
-- back the default sorted list, unlike every sibling model (Lead/Client/
-- Project/Order/Product) that already pairs status+createdAt.
CREATE INDEX "vendors_tenant_id_created_at_idx"
  ON "vendors"("tenant_id", "created_at");

-- InventoryItem: InventoryItemListQueryDto independently filters by
-- warehouseId, productVariantId, AND fabricId (all three are the same
-- filter shape), but the schema only had each indexed alone
-- (`warehouse_id`, `product_variant_id`, `fabric_id` each single-column)
-- with no `tenant_id` prefix — every tenant-scoped query on this table
-- pays a bitmap-AND of two indexes instead of one composite scan.
CREATE INDEX "inventory_items_tenant_id_warehouse_id_idx"
  ON "inventory_items"("tenant_id", "warehouse_id");
CREATE INDEX "inventory_items_tenant_id_product_variant_id_idx"
  ON "inventory_items"("tenant_id", "product_variant_id");
CREATE INDEX "inventory_items_tenant_id_fabric_id_idx"
  ON "inventory_items"("tenant_id", "fabric_id");

-- Notification: NotificationListQueryDto filters by userId AND status
-- together (the "my unread notifications" case) — schema had
-- `(user_id, read_at)` and `(tenant_id, status)` but nothing covering
-- all three at once.
CREATE INDEX "notifications_tenant_id_user_id_status_idx"
  ON "notifications"("tenant_id", "user_id", "status");

-- Deliberately NOT added (documented, not silently skipped — see
-- docs/architecture/performance.md's Module 1 addendum):
-- - Task.priority: 4-value enum, too low-cardinality to be worth an index.
-- - AuditLog.action / free-text `search`: would need trigram/FTS indexing,
--   a bigger, separate decision outside this module's scope.
-- - PromptTemplate: already had `(tenant_id, category)` — no gap.
