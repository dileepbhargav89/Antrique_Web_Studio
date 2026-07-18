-- CHECK constraints Prisma's schema DSL cannot express. Full worklist from
-- docs/architecture/database-schema.md §5 "Known Prisma schema-DSL
-- limitations". Grouped by rationale, not by table.

-- ---------------------------------------------------------------------------
-- Non-negative money (every Decimal amount in the schema)
-- ---------------------------------------------------------------------------
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_subtotal_amount_check" CHECK ("subtotal_amount" >= 0);
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tax_amount_check" CHECK ("tax_amount" >= 0);
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_discount_amount_check" CHECK ("discount_amount" >= 0);
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_total_amount_check" CHECK ("total_amount" >= 0);

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subtotal_amount_check" CHECK ("subtotal_amount" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tax_amount_check" CHECK ("tax_amount" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_discount_amount_check" CHECK ("discount_amount" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_total_amount_check" CHECK ("total_amount" >= 0);
-- Also bounds amount_paid by total_amount — the "Consider (lower priority)"
-- item from the Phase 1.1A worklist, confirmed here in 1.1B: a denormalized
-- running total (per schema.prisma's Invoice comment) should never exceed
-- what was actually billed.
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amount_paid_check" CHECK ("amount_paid" >= 0 AND "amount_paid" <= "total_amount");

ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_unit_price_check" CHECK ("unit_price" >= 0);
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_amount_check" CHECK ("amount" >= 0);
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_unit_price_check" CHECK ("unit_price" >= 0);
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_amount_check" CHECK ("amount" >= 0);

ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amount" >= 0);

-- ---------------------------------------------------------------------------
-- Quantities and ordering
-- ---------------------------------------------------------------------------
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_sort_order_check" CHECK ("sort_order" >= 0);
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_sort_order_check" CHECK ("sort_order" >= 0);

-- ---------------------------------------------------------------------------
-- Bounded range
-- ---------------------------------------------------------------------------
-- Nullable column (an unlinked testimonial can omit a star rating) — the
-- constraint must explicitly allow NULL, not just the 1-5 range.
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_rating_check" CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

-- ---------------------------------------------------------------------------
-- File size sanity (not in the original §5 worklist — found during 1.1B
-- implementation: BigInt has no natural floor, but a negative file size is
-- always a bug, never a legitimate value)
-- ---------------------------------------------------------------------------
ALTER TABLE "documents" ADD CONSTRAINT "documents_size_bytes_check" CHECK ("size_bytes" >= 0);
ALTER TABLE "media" ADD CONSTRAINT "media_size_bytes_check" CHECK ("size_bytes" >= 0);

-- ---------------------------------------------------------------------------
-- Cross-column
-- ---------------------------------------------------------------------------
-- schema.prisma's Quotation comment: "lead_id/client_id are both nullable
-- but exactly one should be set (a fresh prospect quote vs. a repeat-
-- business quote for an existing client) — enforced at the application
-- layer" until this migration.
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_xor_client_check" CHECK (
  ("lead_id" IS NOT NULL AND "client_id" IS NULL) OR
  ("lead_id" IS NULL AND "client_id" IS NOT NULL)
);

-- The other "Consider (lower priority)" item from Phase 1.1A: a session
-- cannot expire before it was issued.
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_expires_after_issued_check" CHECK ("expires_at" > "issued_at");
