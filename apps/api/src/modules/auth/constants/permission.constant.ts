// Not an exhaustive mirror of `prisma/seed.ts`'s 43-row `PERMISSIONS`
// catalog — Role/Permission lookup stays database-driven (this
// milestone's own requirement), so this file only names the permission
// keys real code actually references (`ExampleDomainController`'s
// `@Permissions()`-guarded route; Milestone 5's catalog controllers).
// Real, used values only, the same discipline `role.constant.ts`
// follows — add a key here only when a real caller needs it, never
// speculatively ahead of one.
export const PERMISSION = {
  PROJECTS_WRITE: 'projects:write',
  // Phase 7 (Project/Task/Milestone) — `projects:read`/`projects:delete`
  // already existed in the seed catalog since Phase 1.1B alongside
  // `projects:write` above (dead until now, same "found already seeded"
  // situation `clients:read`/`quotations:read` were in), reused as-is.
  // `milestones:*`/`tasks:*`/`documents:*` (project-scoped, distinct from
  // Catalog's `product_customizations` or the narrow product-image upload
  // path) were also already seeded, unconsumed. `comments:*` is new —
  // no comment/annotation model existed before this phase.
  PROJECTS_READ: 'projects:read',
  PROJECTS_DELETE: 'projects:delete',
  MILESTONES_READ: 'milestones:read',
  MILESTONES_WRITE: 'milestones:write',
  TASKS_READ: 'tasks:read',
  TASKS_WRITE: 'tasks:write',
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',
  // Not granted to `client`/`customer` — Task is explicitly "internal
  // delivery-team tool, not client-facing" per its own schema comment, and
  // Milestone-level client commentary is a known scope gap (see
  // docs/implementation/phase-7-workflow-matrix.md's deferred list), not
  // built this phase. Same tier as `milestones:write`/`tasks:write`
  // (project_manager, manager only).
  COMMENTS_READ: 'comments:read',
  COMMENTS_WRITE: 'comments:write',
  // Phase 8 (AI Workspace, Step 2 — Prompt Library) — new keys, no
  // Phase-1.1B-seeded row to reuse (unlike projects:*/milestones:*/
  // tasks:*/documents:*, which were all pre-seeded). Same "Manager,
  // Project Manager" tier as milestones:write/tasks:write — `test` calls
  // a real, costed AI provider, so both read and write stay restricted
  // to delivery-side roles for this first phase rather than opened to
  // sales/client, a deliberately conservative default for a brand-new
  // capability with real external cost. No `prompt_templates:delete` —
  // deactivation happens through the ordinary update route's `isActive`
  // field, same shape ClientController already follows.
  PROMPT_TEMPLATES_READ: 'prompt_templates:read',
  PROMPT_TEMPLATES_WRITE: 'prompt_templates:write',
  // Phase 8, Step 7 (AI Content Assistant) — a new, real resource
  // (unlike Steps 3-6, which either write nothing or write through an
  // existing resource's own permission). Same "Manager, Project Manager"
  // tier as prompt_templates:*, plus a `:delete` key — content_drafts are
  // one-off generated artifacts a human discards when rejected, closer to
  // customer_notes:delete than prompt_templates (which has no delete,
  // deactivation happens via its own `isActive` field instead).
  CONTENT_DRAFTS_READ: 'content_drafts:read',
  CONTENT_DRAFTS_WRITE: 'content_drafts:write',
  CONTENT_DRAFTS_DELETE: 'content_drafts:delete',
  // Phase 8, Step 8 (AI Email Assistant) — `generate` (a draft, no
  // external effect) reuses `prompt_templates:write` like every other
  // Phase 8 drafting action. `send` is new: a real, external side effect
  // (an actual email delivered through the live `EmailService`/Resend),
  // so it gets its own single-action tier, same shape
  // `orders:cancel`/`invoices:void`/`payments:refund` already established
  // for "an existing capability's one real, consequential action" rather
  // than a full read/write/delete resource (Email Assistant persists
  // nothing — there's no `emails` resource to read/write/delete).
  EMAILS_SEND: 'emails:send',
  // Milestone 5 (Product Catalog Foundation) — read/write/delete for all
  // three catalog resources, matching the RBAC brief's tiers exactly
  // (Customer+ read, Manager+ write, Admin+ delete — see
  // prisma/seed.ts's ROLES grants and
  // docs/implementation/decisions.md).
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_WRITE: 'categories:write',
  CATEGORIES_DELETE: 'categories:delete',
  COLLECTIONS_READ: 'collections:read',
  COLLECTIONS_WRITE: 'collections:write',
  COLLECTIONS_DELETE: 'collections:delete',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  PRODUCTS_DELETE: 'products:delete',
  // Milestone 6 (Bespoke Customizer Engine) — same tiers as Milestone 5
  // (Customer+ read, Manager+ write, Admin+ delete), except
  // PRODUCT_CUSTOMIZATIONS which has no delete permission: this
  // milestone's brief lists no Delete endpoint for Product Customization
  // (Create/Update/Get/List only), so no `product_customizations:delete`
  // key exists to grant.
  FABRICS_READ: 'fabrics:read',
  FABRICS_WRITE: 'fabrics:write',
  FABRICS_DELETE: 'fabrics:delete',
  MEASUREMENT_PROFILES_READ: 'measurement_profiles:read',
  MEASUREMENT_PROFILES_WRITE: 'measurement_profiles:write',
  MEASUREMENT_PROFILES_DELETE: 'measurement_profiles:delete',
  STYLE_OPTIONS_READ: 'style_options:read',
  STYLE_OPTIONS_WRITE: 'style_options:write',
  STYLE_OPTIONS_DELETE: 'style_options:delete',
  PRODUCT_CUSTOMIZATIONS_READ: 'product_customizations:read',
  PRODUCT_CUSTOMIZATIONS_WRITE: 'product_customizations:write',
  // Milestone 7 (Inventory & Stock Management) — same tiers as
  // Milestones 5/6, except INVENTORY which has no delete permission:
  // this milestone's brief lists no delete operation for InventoryItem
  // (Get/Adjust/Receive/Reserve/Release/List transactions only).
  WAREHOUSES_READ: 'warehouses:read',
  WAREHOUSES_WRITE: 'warehouses:write',
  WAREHOUSES_DELETE: 'warehouses:delete',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  SUPPLIERS_READ: 'suppliers:read',
  SUPPLIERS_WRITE: 'suppliers:write',
  SUPPLIERS_DELETE: 'suppliers:delete',
  // Milestone 8 (Order Management & Checkout) — CUSTOMERS follows the
  // usual read/write/delete tiers. ORDERS has a genuinely different
  // third tier: this milestone's own RBAC section names "Cancel: Admin,
  // Super Admin" as its own tier (not "Delete" — Orders have no delete
  // endpoint at all, only Create/Update/Cancel/Get/List/Change status),
  // so `orders:cancel` replaces where a `:delete` key would normally go.
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write',
  CUSTOMERS_DELETE: 'customers:delete',
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_CANCEL: 'orders:cancel',
  // Milestone 9 (CRM & Customer Operations) — `leads:read`/`leads:write`
  // already existed (Phase 1.1B's original agency-CRM seed); this
  // milestone reuses them as-is (see LeadController), extending their
  // grants to `manager`(write)/`customer`(read) rather than defining new
  // keys. No `leads:delete` — this milestone's own "Lead" Controllers
  // list has no delete endpoint (Archive is the terminal write action,
  // gated under `leads:write` — the brief names no stricter tier for it,
  // unlike Milestone 8's own `orders:cancel`). The four entities this
  // milestone actually adds follow the usual per-resource tiers, except
  // `customer_activities`, which has no `:write` key — its own
  // Controllers list is "Timeline, List" only, every row is written
  // internally, never through a client-facing route.
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  // Contact-request inbox/triage (modules/contact) — wired here now that
  // a real authenticated caller exists (GET list + POST convert), per
  // this key's own "add only when a real caller needs it" rule (see
  // modules/contact/README.md's now-resolved "What's not built" note).
  CONTACT_REQUESTS_READ: 'contact_requests:read',
  CONTACT_REQUESTS_WRITE: 'contact_requests:write',
  CUSTOMER_NOTES_READ: 'customer_notes:read',
  CUSTOMER_NOTES_WRITE: 'customer_notes:write',
  CUSTOMER_NOTES_DELETE: 'customer_notes:delete',
  CUSTOMER_ACTIVITIES_READ: 'customer_activities:read',
  FOLLOW_UP_TASKS_READ: 'follow_up_tasks:read',
  FOLLOW_UP_TASKS_WRITE: 'follow_up_tasks:write',
  FOLLOW_UP_TASKS_DELETE: 'follow_up_tasks:delete',
  CUSTOMER_TAGS_READ: 'customer_tags:read',
  CUSTOMER_TAGS_WRITE: 'customer_tags:write',
  CUSTOMER_TAGS_DELETE: 'customer_tags:delete',
  // Milestone 10 (Payments & Billing Foundation) — `invoices:read`/
  // `invoices:write`/`payments:read` already existed (Phase 1.1B's
  // original billing seed, previously unconsumed — see
  // InvoiceController/PaymentController); reused as-is, only their
  // grants extended. `invoices:void`/`payments:refund` are new,
  // Admin+-only tiers (this milestone's own explicit "Void / Refund:
  // Admin, Super Admin" tier, the same shape Milestone 8's own
  // `orders:cancel` established) — `invoices:void` replaces where a
  // `:delete` key would normally go (no Invoice delete endpoint exists;
  // Void is the terminal write action). `payments:write` is new (covers
  // Record + Allocate — no `:delete`, `Payment` is append-only).
  // `tax_rates:*` follows the usual read/write/delete tiers, this
  // milestone's own "Tax — CRUD" Controllers entry.
  INVOICES_READ: 'invoices:read',
  INVOICES_WRITE: 'invoices:write',
  INVOICES_VOID: 'invoices:void',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  PAYMENTS_REFUND: 'payments:refund',
  TAX_RATES_READ: 'tax_rates:read',
  TAX_RATES_WRITE: 'tax_rates:write',
  TAX_RATES_DELETE: 'tax_rates:delete',
  // Milestone 11 (Admin Platform, Analytics & Notifications) — `audit_logs:read`
  // already existed (Phase 1.1B), reused as-is (Admin+Super Admin only —
  // it was never granted to any other role, so the pre-existing grant
  // list already matches this milestone's own "Audit: Admin, Super Admin"
  // tier with zero seed changes). `notifications:read` (Phase 1.1B) is
  // deliberately NOT reused here — its own seed description ("View own
  // notifications") and existing broad grant list (project_manager,
  // sales, client, manager, customer) describe a different, narrower,
  // self-service scope this milestone doesn't build a route for; reusing
  // it for the admin cross-tenant List/Get/Retry surface would silently
  // over-grant that surface to Sales/Client/Customer, contradicting this
  // milestone's own explicit "Notifications: Manager, Admin, Super Admin"
  // tier. `notifications:manage` is a new key, scoped to exactly that
  // admin surface (List/Get/Retry — this milestone gives Notifications
  // one uniform tier, not a finer read/write split). `dashboard:read` and
  // `reports:read`/`reports:write` are new — no Phase 1.1B key existed
  // for either resource.
  AUDIT_LOGS_READ: 'audit_logs:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  DASHBOARD_READ: 'dashboard:read',
  REPORTS_READ: 'reports:read',
  REPORTS_WRITE: 'reports:write',
  // Phase 7 (Enterprise CRM/Project-Management), Phase 1 — `clients:read`/
  // `clients:write` already existed in prisma/seed.ts's PERMISSIONS
  // catalog since Phase 1.1B (dead — no controller ever consumed them
  // until now); reused as-is, no new seed row needed. No `clients:delete`
  // key exists to grant (none was ever seeded) — ClientController has no
  // DELETE route; archiving happens via the ordinary update route's
  // `status` field instead (see client.service.ts's own comment).
  CLIENTS_READ: 'clients:read',
  CLIENTS_WRITE: 'clients:write',
  // Phase 7, Phase 2 — `quotations:read`/`quotations:write` already
  // existed in the seed catalog since Phase 1.1B (dead until now — see
  // quotation.service.ts's own header comment for why Quotation is this
  // phase's "Proposal"). No `quotations:delete` key exists to grant
  // (none was ever seeded) — QuotationController has no DELETE route.
  QUOTATIONS_READ: 'quotations:read',
  QUOTATIONS_WRITE: 'quotations:write',
  // Milestone 14 (Production Infrastructure) — "Expose runtime metadata
  // endpoint (Admin only)." A new key, not a reuse of `dashboard:read`
  // (Manager+, business KPIs) or `audit_logs:read` (Admin+, compliance
  // trail) — runtime/system metadata (version, uptime, environment,
  // dependency health) is neither; it gets the same "Admin, Super Admin
  // only" tier `audit_logs:read` already established (see ROLES in
  // seed.ts — granted only via `PERMISSIONS.map((p) => p.key)`'s full-set
  // admin/super_admin grant, deliberately absent from every other role's
  // explicit list).
  SYSTEM_READ: 'system:read',
  // Phase 9, Module 1, Step 1 (Enterprise Operations Suite — Finance:
  // Vendor Management) — new keys, mirroring `clients:read`/
  // `clients:write`'s own tier exactly (no delete key — Vendor archives
  // via the ordinary update route's `status` field, same reasoning
  // `Client` gives; no `clients:delete`-equivalent was ever seeded for
  // either).
  VENDORS_READ: 'vendors:read',
  VENDORS_WRITE: 'vendors:write',
} as const;

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];
