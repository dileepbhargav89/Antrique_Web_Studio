// Idempotent development seed data. Run via `pnpm --filter @antrique/api db:seed`
// (or automatically after `db:migrate:dev` / `db:reset`) — never against a
// production database. Standalone script using @prisma/client directly, not
// a NestJS provider (Phase 1.1B is database infrastructure only).
//
// Scope note: the brief for this seed script asked for "Services" and "Blog
// Categories" alongside the other entities. Neither is a modeled table in
// the approved Phase 1.1A schema — `Lead.serviceInterest` is a free-text
// string array (no `Service` entity to seed rows into), and `Blog` has no
// category field at all. Rather than add tables the approved design doesn't
// have (out of scope for Phase 1.1B — "Do NOT modify the approved database
// design unless required to fix a genuine defect"), this script seeds
// realistic service names into the existing `serviceInterest` field and
// skips blog categories entirely. Flag if first-class Service/BlogCategory
// tables are actually wanted — that's a schema decision for a future phase.
//
// Every upsert keys off either a real unique constraint (tenant slug, role
// tenantId+key, permission key, user tenantId+email, setting tenantId+key)
// or, for the handful of models with no natural unique key (Client, Lead,
// Project), a fixed literal UUID declared below — re-running this script
// updates the same rows instead of duplicating them.
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import type { Algorithm } from '@node-rs/argon2';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  CategoryStatus,
  ClientStatus,
  CollectionStatus,
  CustomerActivityType,
  CustomerStatus,
  DashboardWidgetType,
  FabricCategoryStatus,
  FabricStatus,
  FollowUpStatus,
  InventoryTransactionType,
  InvoiceStatus,
  LeadStatus,
  MeasurementUnit,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  PaymentStatus,
  PricingAdjustmentType,
  ProductStatus,
  ProjectStatus,
  ReportType,
  ReservationStatus,
  StyleOptionStatus,
  SupplierStatus,
  SystemEventSeverity,
  TenantStatus,
  UserStatus,
  WarehouseStatus,
} from '../generated/prisma/enums';

// Dev/seed-only local password for the seeded admin user (Milestone 1 —
// Real Authentication). Never used outside this script, never committed
// as a real credential — this file's own header comment already forbids
// running it against production. Hashed with the same Argon2id algorithm
// `PasswordService` uses (apps/api/src/password/password.service.ts);
// this script can't inject `PasswordService` (standalone script, no
// NestJS DI — see the file header) so it calls `@node-rs/argon2`
// directly with the same OWASP-minimum cost parameters
// `password/config/hash.config.ts` defaults to. Cost parameters don't
// need to match runtime config exactly — Argon2's PHC-encoded hash
// string carries its own parameters, so `PasswordService.compare()`
// verifies this hash correctly regardless of what HASH_MEMORY_COST/
// HASH_TIME_COST/HASH_PARALLELISM currently equal.
const ADMIN_SEED_PASSWORD = 'DevAdmin123!';

// `prisma db seed` spawns this file as a child process after prisma.config.ts
// has already loaded .env, so DATABASE_URL is normally already set — but
// load it again defensively so `ts-node prisma/seed.ts` also works when run
// directly, without going through the Prisma CLI first.
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // No .env file, or already loaded — fine either way.
}

// Prisma 7's `prisma-client` generator uses driver adapters — the runtime
// client no longer reads DATABASE_URL implicitly the way the legacy
// `prisma-client-js` generator did. This mirrors how apps/api/src's eventual
// PrismaModule (Phase 1.2+, NestJS wiring — out of scope here) will need to
// construct the client too.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Fixed IDs (see file header) — the "00000000-0000-7000-8000-..." prefix is
// just a recognizable, obviously-seed-data pattern, not a functional
// requirement (the id column doesn't enforce UUIDv7 formatting).
const TENANT_ID = '00000000-0000-7000-8000-000000000001';

const CLIENT_SAFFRON_ID = '00000000-0000-7000-8000-000000000101';
const CLIENT_KESTREL_ID = '00000000-0000-7000-8000-000000000102';
const CLIENT_MERIDIAN_ID = '00000000-0000-7000-8000-000000000103';
const CLIENT_NORTHWIND_ID = '00000000-0000-7000-8000-000000000104';

const LEAD_NEW_ID = '00000000-0000-7000-8000-000000000201';
const LEAD_QUALIFIED_ID = '00000000-0000-7000-8000-000000000202';
const LEAD_CONVERTED_ID = '00000000-0000-7000-8000-000000000203';
const LEAD_LOST_ID = '00000000-0000-7000-8000-000000000204';

const PROJECT_SAFFRON_ID = '00000000-0000-7000-8000-000000000301';
const PROJECT_KESTREL_ID = '00000000-0000-7000-8000-000000000302';
const PROJECT_MERIDIAN_ID = '00000000-0000-7000-8000-000000000303';

// Milestone 5 (Product Catalog Foundation) — no product-catalog guidance
// exists in docs/product/ (checked; flagged in schema.prisma's own
// comment on this section), so these are deliberately generic example
// items, not a real product line.
const CATEGORY_RINGS_ID = '00000000-0000-7000-8000-000000000401';
const CATEGORY_NECKLACES_ID = '00000000-0000-7000-8000-000000000402';
const CATEGORY_BRACELETS_ID = '00000000-0000-7000-8000-000000000403';

const COLLECTION_SIGNATURE_ID = '00000000-0000-7000-8000-000000000501';
const COLLECTION_LIMITED_ID = '00000000-0000-7000-8000-000000000502';

const PRODUCT_SOLITAIRE_RING_ID = '00000000-0000-7000-8000-000000000601';
const PRODUCT_PEARL_NECKLACE_ID = '00000000-0000-7000-8000-000000000602';
const PRODUCT_CHARM_BRACELET_ID = '00000000-0000-7000-8000-000000000603';

const IMAGE_SOLITAIRE_RING_ID = '00000000-0000-7000-8000-000000000701';
const IMAGE_PEARL_NECKLACE_ID = '00000000-0000-7000-8000-000000000702';

// Milestone 6 (Bespoke Customizer Engine) — same "deliberately generic,
// no product-line guidance exists" situation as Milestone 5 above. The
// existing catalog demo items (rings/necklaces/bracelets) are jewelry,
// which has no meaningful fabric/measurement/style-option story — so this
// milestone seeds one new, distinct garment product ("Made-to-Measure
// Oxford Shirt") specifically to exercise this engine's own features,
// rather than forcing an ill-fitting bespoke config onto a ring.
const CATEGORY_BESPOKE_GARMENTS_ID = '00000000-0000-7000-8000-000000000404';
const PRODUCT_BESPOKE_SHIRT_ID = '00000000-0000-7000-8000-000000000604';

const FABRIC_CATEGORY_WOOL_ID = '00000000-0000-7000-8000-000000000801';
const FABRIC_CATEGORY_COTTON_ID = '00000000-0000-7000-8000-000000000802';

const FABRIC_NAVY_WOOL_ID = '00000000-0000-7000-8000-000000000901';
const FABRIC_OXFORD_COTTON_ID = '00000000-0000-7000-8000-000000000902';

const FABRIC_IMAGE_NAVY_WOOL_ID = '00000000-0000-7000-8000-000000001001';

const MEASUREMENT_PROFILE_DEMO_ID = '00000000-0000-7000-8000-000000001101';

const PRODUCT_CUSTOMIZATION_BESPOKE_SHIRT_ID = '00000000-0000-7000-8000-000000001201';

const STYLE_OPTION_GROUP_COLLAR_ID = '00000000-0000-7000-8000-000000001301';
const STYLE_OPTION_GROUP_CUFF_ID = '00000000-0000-7000-8000-000000001302';

const STYLE_OPTION_SPREAD_COLLAR_ID = '00000000-0000-7000-8000-000000001401';
const STYLE_OPTION_BUTTON_DOWN_COLLAR_ID = '00000000-0000-7000-8000-000000001402';
const STYLE_OPTION_BARREL_CUFF_ID = '00000000-0000-7000-8000-000000001403';
const STYLE_OPTION_FRENCH_CUFF_ID = '00000000-0000-7000-8000-000000001404';

const MONOGRAM_OPTION_CHEST_ID = '00000000-0000-7000-8000-000000001501';

const PRICING_ADJUSTMENT_FRENCH_CUFF_ID = '00000000-0000-7000-8000-000000001601';

// Milestone 7 (Inventory & Stock Management) — same "deliberately
// generic, no domain guidance exists" situation as every prior milestone.
// Warehouses/stock for the fabrics and shirt variant already seeded
// above, one supplier, and enough transaction/reservation history to
// demonstrate the ledger live.
const WAREHOUSE_MAIN_ID = '00000000-0000-7000-8000-000000001701';

const INVENTORY_ITEM_NAVY_WOOL_ID = '00000000-0000-7000-8000-000000001801';
const INVENTORY_ITEM_OXFORD_COTTON_ID = '00000000-0000-7000-8000-000000001802';

const SUPPLIER_MILLBROOK_ID = '00000000-0000-7000-8000-000000001901';

const SUPPLIER_PRODUCT_NAVY_WOOL_ID = '00000000-0000-7000-8000-000000002001';

const INVENTORY_TRANSACTION_NAVY_WOOL_RECEIPT_ID = '00000000-0000-7000-8000-000000002101';
const INVENTORY_TRANSACTION_RING_RECEIPT_ID = '00000000-0000-7000-8000-000000002102';
const INVENTORY_TRANSACTION_RING_RESERVE_ID = '00000000-0000-7000-8000-000000002103';

const INVENTORY_RESERVATION_RING_ID = '00000000-0000-7000-8000-000000002201';

// Milestone 8 (Order Management & Checkout) — one demo customer (linked
// to the seeded customer@antrique.dev portal user, demonstrating the
// optional User link), one address, and one PENDING order for the ring
// variant already seeded above — reserving 2 units against its existing
// InventoryItem (onHand=25, already reserved=3 from Milestone 7's own
// demo hold — 2 more leaves reserved=5, available=20, no over-
// reservation) so the order → inventory reservation → ledger chain is
// real, live, queryable data, not a stub.
const CUSTOMER_JORDAN_ID = '00000000-0000-7000-8000-000000002301';
const CUSTOMER_ADDRESS_JORDAN_ID = '00000000-0000-7000-8000-000000002401';
const INVENTORY_RESERVATION_ORDER_ID = '00000000-0000-7000-8000-000000002501';
const ORDER_JORDAN_RING_ID = '00000000-0000-7000-8000-000000002601';
const ORDER_ITEM_JORDAN_RING_ID = '00000000-0000-7000-8000-000000002701';

// Milestone 9 (CRM & Customer Operations) — LeadSource lookup rows, one
// additional Lead demonstrating the NEW convertedCustomerId path (kept
// entirely separate from LEAD_CONVERTED_ID above, which still
// demonstrates the pre-existing convertedClientId path — see
// docs/implementation/decisions.md), its own resulting Customer, and a
// small set of CustomerNote/CustomerActivity/FollowUpTask/CustomerTag
// rows demonstrating the full engagement surface against both the new
// customer and the already-seeded CUSTOMER_JORDAN_ID (Milestone 8).
const LEAD_SOURCE_WEBSITE_ID = '00000000-0000-7000-8000-000000002801';
const LEAD_SOURCE_REFERRAL_ID = '00000000-0000-7000-8000-000000002802';
const LEAD_SOURCE_COLD_OUTBOUND_ID = '00000000-0000-7000-8000-000000002803';
const LEAD_SOURCE_TRADE_SHOW_ID = '00000000-0000-7000-8000-000000002804';
const LEAD_SOURCE_SOCIAL_MEDIA_ID = '00000000-0000-7000-8000-000000002805';

const LEAD_MORGAN_ID = '00000000-0000-7000-8000-000000002901';
const CUSTOMER_MORGAN_ID = '00000000-0000-7000-8000-000000002902';

const CUSTOMER_NOTE_JORDAN_WELCOME_ID = '00000000-0000-7000-8000-000000003001';
const CUSTOMER_NOTE_JORDAN_PREFERENCE_ID = '00000000-0000-7000-8000-000000003002';

const CUSTOMER_ACTIVITY_MORGAN_CREATED_ID = '00000000-0000-7000-8000-000000003101';
const CUSTOMER_ACTIVITY_MORGAN_CONVERTED_ID = '00000000-0000-7000-8000-000000003102';
const CUSTOMER_ACTIVITY_JORDAN_FOLLOW_UP_ID = '00000000-0000-7000-8000-000000003103';

const FOLLOW_UP_JORDAN_ID = '00000000-0000-7000-8000-000000003201';
const FOLLOW_UP_ARJUN_LEAD_ID = '00000000-0000-7000-8000-000000003202';

const CUSTOMER_TAG_VIP_ID = '00000000-0000-7000-8000-000000003301';
const CUSTOMER_TAG_WHOLESALE_ID = '00000000-0000-7000-8000-000000003302';

// Milestone 10 (Payments & Billing Foundation) — 2 TaxRate rows, 3
// PaymentMethod rows, and a real Invoice → Payment → Allocation chain
// against the already-seeded Milestone 8 order (ORDER_JORDAN_RING_ID) —
// created DRAFT, issued, then paid via two payments (one partial, one
// completing it) to demonstrate "Partial payment"/"Multiple payments"
// live in seed data, not just via the smoke test.
const TAX_RATE_GST18_ID = '00000000-0000-7000-8000-000000003401';
const TAX_RATE_NO_TAX_ID = '00000000-0000-7000-8000-000000003402';

const PAYMENT_METHOD_CASH_ID = '00000000-0000-7000-8000-000000003501';
const PAYMENT_METHOD_BANK_TRANSFER_ID = '00000000-0000-7000-8000-000000003502';
const PAYMENT_METHOD_CHEQUE_ID = '00000000-0000-7000-8000-000000003503';

const INVOICE_JORDAN_RING_ID = '00000000-0000-7000-8000-000000003601';
const INVOICE_ITEM_JORDAN_RING_ID = '00000000-0000-7000-8000-000000003602';
const PAYMENT_JORDAN_PARTIAL_ID = '00000000-0000-7000-8000-000000003701';
const PAYMENT_JORDAN_FINAL_ID = '00000000-0000-7000-8000-000000003702';
const PAYMENT_ALLOCATION_JORDAN_PARTIAL_ID = '00000000-0000-7000-8000-000000003801';
const PAYMENT_ALLOCATION_JORDAN_FINAL_ID = '00000000-0000-7000-8000-000000003802';

const NOTIFICATION_TEMPLATE_ORDER_SHIPPED_ID = '00000000-0000-7000-8000-000000003901';
const NOTIFICATION_TEMPLATE_INVOICE_OVERDUE_ID = '00000000-0000-7000-8000-000000003902';
const NOTIFICATION_TEMPLATE_FOLLOW_UP_DUE_ID = '00000000-0000-7000-8000-000000003903';

const DASHBOARD_WIDGET_REVENUE_ID = '00000000-0000-7000-8000-000000004001';
const DASHBOARD_WIDGET_LOW_STOCK_ID = '00000000-0000-7000-8000-000000004002';
const DASHBOARD_WIDGET_LEAD_CONVERSION_ID = '00000000-0000-7000-8000-000000004003';

const NOTIFICATION_JORDAN_ORDER_SHIPPED_ID = '00000000-0000-7000-8000-000000004101';
const NOTIFICATION_JORDAN_PAYMENT_FAILED_ID = '00000000-0000-7000-8000-000000004102';

const AUDIT_LOG_ORDER_CREATED_ID = '00000000-0000-7000-8000-000000004201';
const AUDIT_LOG_LOGIN_FAILED_ID = '00000000-0000-7000-8000-000000004202';

const SYSTEM_EVENT_LOW_STOCK_ID = '00000000-0000-7000-8000-000000004301';
const SYSTEM_EVENT_NOTIFICATION_FAILED_ID = '00000000-0000-7000-8000-000000004302';

const SCHEDULED_REPORT_SALES_SUMMARY_ID = '00000000-0000-7000-8000-000000004401';

const PERMISSIONS: Array<{ key: string; resource: string; action: string; description: string }> = [
  {
    key: 'users:read',
    resource: 'users',
    action: 'read',
    description: 'View team and portal user accounts',
  },
  {
    key: 'users:write',
    resource: 'users',
    action: 'write',
    description: 'Invite, edit, or disable user accounts',
  },
  {
    key: 'roles:read',
    resource: 'roles',
    action: 'read',
    description: 'View roles and their permissions',
  },
  {
    key: 'roles:write',
    resource: 'roles',
    action: 'write',
    description: 'Create or edit roles and permission grants',
  },
  {
    key: 'projects:read',
    resource: 'projects',
    action: 'read',
    description: 'View delivery projects',
  },
  {
    key: 'projects:write',
    resource: 'projects',
    action: 'write',
    description: 'Create or edit delivery projects',
  },
  {
    key: 'projects:delete',
    resource: 'projects',
    action: 'delete',
    description: 'Archive/delete delivery projects',
  },
  {
    key: 'milestones:read',
    resource: 'milestones',
    action: 'read',
    description: 'View project milestones',
  },
  {
    key: 'milestones:write',
    resource: 'milestones',
    action: 'write',
    description: 'Create or edit project milestones',
  },
  {
    key: 'tasks:read',
    resource: 'tasks',
    action: 'read',
    description: 'View internal delivery tasks',
  },
  {
    key: 'tasks:write',
    resource: 'tasks',
    action: 'write',
    description: 'Create or edit internal delivery tasks',
  },
  {
    key: 'documents:read',
    resource: 'documents',
    action: 'read',
    description: 'View project documents',
  },
  {
    key: 'documents:write',
    resource: 'documents',
    action: 'write',
    description: 'Upload or edit project documents',
  },
  { key: 'leads:read', resource: 'leads', action: 'read', description: 'View CRM leads' },
  {
    key: 'leads:write',
    resource: 'leads',
    action: 'write',
    description: 'Create or edit CRM leads',
  },
  {
    key: 'clients:read',
    resource: 'clients',
    action: 'read',
    description: 'View client organizations',
  },
  {
    key: 'clients:write',
    resource: 'clients',
    action: 'write',
    description: 'Create or edit client organizations',
  },
  {
    key: 'contact_requests:read',
    resource: 'contact_requests',
    action: 'read',
    description: 'View inbound contact form submissions',
  },
  {
    key: 'contact_requests:write',
    resource: 'contact_requests',
    action: 'write',
    description: 'Triage or convert contact form submissions',
  },
  {
    key: 'quotations:read',
    resource: 'quotations',
    action: 'read',
    description: 'View quotations',
  },
  {
    key: 'quotations:write',
    resource: 'quotations',
    action: 'write',
    description: 'Create or edit quotations',
  },
  { key: 'invoices:read', resource: 'invoices', action: 'read', description: 'View invoices' },
  {
    key: 'invoices:write',
    resource: 'invoices',
    action: 'write',
    description: 'Create or edit invoices',
  },
  {
    key: 'payments:read',
    resource: 'payments',
    action: 'read',
    description: 'View payment/reconciliation records',
  },
  {
    key: 'blogs:read',
    resource: 'blogs',
    action: 'read',
    description: 'View blog posts (including drafts)',
  },
  {
    key: 'blogs:write',
    resource: 'blogs',
    action: 'write',
    description: 'Create or edit blog posts',
  },
  { key: 'media:read', resource: 'media', action: 'read', description: 'View the media library' },
  {
    key: 'media:write',
    resource: 'media',
    action: 'write',
    description: 'Upload or edit media library assets',
  },
  {
    key: 'testimonials:read',
    resource: 'testimonials',
    action: 'read',
    description: 'View client testimonials',
  },
  {
    key: 'testimonials:write',
    resource: 'testimonials',
    action: 'write',
    description: 'Create or edit client testimonials',
  },
  {
    key: 'notifications:read',
    resource: 'notifications',
    action: 'read',
    description: 'View own notifications',
  },
  {
    key: 'settings:read',
    resource: 'settings',
    action: 'read',
    description: 'View tenant settings',
  },
  {
    key: 'settings:write',
    resource: 'settings',
    action: 'write',
    description: 'Edit tenant settings',
  },
  {
    key: 'audit_logs:read',
    resource: 'audit_logs',
    action: 'read',
    description: 'View the compliance audit trail',
  },
  // Milestone 11 (Admin Platform, Analytics & Notifications) — see
  // permission.constant.ts's own comment for why `notifications:manage`
  // is a new key rather than a reuse of the `notifications:read` row
  // above. `dashboard:read` and `reports:read`/`reports:write` are new;
  // no Phase 1.1B row existed for either resource.
  {
    key: 'notifications:manage',
    resource: 'notifications',
    action: 'manage',
    description: 'View and manage all tenant notifications (admin surface), including retry',
  },
  {
    key: 'dashboard:read',
    resource: 'dashboard',
    action: 'read',
    description: 'View the admin dashboard overview and per-module KPIs',
  },
  {
    key: 'reports:read',
    resource: 'reports',
    action: 'read',
    description: 'List generated reports and view their stored results',
  },
  {
    key: 'reports:write',
    resource: 'reports',
    action: 'write',
    description: 'Generate new reports',
  },
  // Milestone 14 (Production Infrastructure) — see permission.constant.ts's
  // own comment: same "Admin, Super Admin" only tier as audit_logs:read,
  // granted automatically via admin/super_admin's PERMISSIONS.map((p) =>
  // p.key) full-set grant below, deliberately absent from every other
  // role's explicit permissionKeys list.
  {
    key: 'system:read',
    resource: 'system',
    action: 'read',
    description: 'View runtime/system metadata (version, uptime, environment, dependency health)',
  },
  // Milestone 5 (Product Catalog Foundation) — categories/collections/
  // products all follow the same read/write/delete shape the RBAC brief
  // specifies (Customer+ read, Manager+ write, Admin+ delete — see ROLES
  // below), matching the existing resource:action convention exactly.
  {
    key: 'categories:read',
    resource: 'categories',
    action: 'read',
    description: 'View product categories',
  },
  {
    key: 'categories:write',
    resource: 'categories',
    action: 'write',
    description: 'Create or edit product categories',
  },
  {
    key: 'categories:delete',
    resource: 'categories',
    action: 'delete',
    description: 'Delete product categories',
  },
  {
    key: 'collections:read',
    resource: 'collections',
    action: 'read',
    description: 'View product collections',
  },
  {
    key: 'collections:write',
    resource: 'collections',
    action: 'write',
    description: 'Create or edit product collections',
  },
  {
    key: 'collections:delete',
    resource: 'collections',
    action: 'delete',
    description: 'Delete product collections',
  },
  {
    key: 'products:read',
    resource: 'products',
    action: 'read',
    description: 'View catalog products',
  },
  {
    key: 'products:write',
    resource: 'products',
    action: 'write',
    description: 'Create or edit catalog products',
  },
  {
    key: 'products:delete',
    resource: 'products',
    action: 'delete',
    description: 'Delete catalog products',
  },
  // Milestone 6 (Bespoke Customizer Engine) — same read/write/delete
  // shape as Milestone 5's catalog permissions, except
  // product_customizations, which has no delete permission: this
  // milestone's brief lists no Delete endpoint for Product Customization.
  {
    key: 'fabrics:read',
    resource: 'fabrics',
    action: 'read',
    description: 'View the fabric catalog',
  },
  {
    key: 'fabrics:write',
    resource: 'fabrics',
    action: 'write',
    description: 'Create or edit fabrics',
  },
  {
    key: 'fabrics:delete',
    resource: 'fabrics',
    action: 'delete',
    description: 'Delete fabrics',
  },
  {
    key: 'measurement_profiles:read',
    resource: 'measurement_profiles',
    action: 'read',
    description: 'View measurement profiles',
  },
  {
    key: 'measurement_profiles:write',
    resource: 'measurement_profiles',
    action: 'write',
    description: 'Create or edit measurement profiles',
  },
  {
    key: 'measurement_profiles:delete',
    resource: 'measurement_profiles',
    action: 'delete',
    description: 'Delete measurement profiles',
  },
  {
    key: 'style_options:read',
    resource: 'style_options',
    action: 'read',
    description: 'View style options',
  },
  {
    key: 'style_options:write',
    resource: 'style_options',
    action: 'write',
    description: 'Create or edit style options',
  },
  {
    key: 'style_options:delete',
    resource: 'style_options',
    action: 'delete',
    description: 'Delete style options',
  },
  {
    key: 'product_customizations:read',
    resource: 'product_customizations',
    action: 'read',
    description: "View a product's bespoke customization configuration",
  },
  {
    key: 'product_customizations:write',
    resource: 'product_customizations',
    action: 'write',
    description: "Create or edit a product's bespoke customization configuration",
  },
  // Milestone 7 (Inventory & Stock Management) — same read/write/delete
  // shape as Milestones 5/6, except `inventory`, which has no delete
  // permission: this milestone's brief lists no delete operation for
  // InventoryItem.
  {
    key: 'warehouses:read',
    resource: 'warehouses',
    action: 'read',
    description: 'View warehouses',
  },
  {
    key: 'warehouses:write',
    resource: 'warehouses',
    action: 'write',
    description: 'Create or edit warehouses',
  },
  {
    key: 'warehouses:delete',
    resource: 'warehouses',
    action: 'delete',
    description: 'Delete warehouses',
  },
  {
    key: 'inventory:read',
    resource: 'inventory',
    action: 'read',
    description: 'View stock levels and transaction history',
  },
  {
    key: 'inventory:write',
    resource: 'inventory',
    action: 'write',
    description: 'Receive, adjust, reserve, and release stock',
  },
  {
    key: 'suppliers:read',
    resource: 'suppliers',
    action: 'read',
    description: 'View suppliers',
  },
  {
    key: 'suppliers:write',
    resource: 'suppliers',
    action: 'write',
    description: 'Create or edit suppliers',
  },
  {
    key: 'suppliers:delete',
    resource: 'suppliers',
    action: 'delete',
    description: 'Delete suppliers',
  },
  // Milestone 8 (Order Management & Checkout) — customers follow the
  // usual read/write/delete shape. Orders has a genuinely different
  // third tier: `orders:cancel` (Admin+ only), not `orders:delete` —
  // this milestone's brief lists no delete endpoint for Order, only a
  // dedicated Cancel action with its own, stricter RBAC tier.
  {
    key: 'customers:read',
    resource: 'customers',
    action: 'read',
    description: 'View customers',
  },
  {
    key: 'customers:write',
    resource: 'customers',
    action: 'write',
    description: 'Create or edit customers',
  },
  {
    key: 'customers:delete',
    resource: 'customers',
    action: 'delete',
    description: 'Delete customers',
  },
  {
    key: 'orders:read',
    resource: 'orders',
    action: 'read',
    description: 'View orders',
  },
  {
    key: 'orders:write',
    resource: 'orders',
    action: 'write',
    description: 'Create or edit orders, including status changes',
  },
  {
    key: 'orders:cancel',
    resource: 'orders',
    action: 'cancel',
    description: 'Cancel orders',
  },
  // Milestone 9 (CRM & Customer Operations) — `leads:read`/`leads:write`
  // already exist above (Phase 1.1B's original agency-CRM seed); this
  // milestone reuses them as-is (see permission.constant.ts's own
  // comment), only extending their grants below. The four entities this
  // milestone actually adds follow the usual read/write/delete tiers,
  // except `customer_activities`, which has no `:write` key — its own
  // Controllers list is "Timeline, List" only, every row written
  // internally.
  {
    key: 'customer_notes:read',
    resource: 'customer_notes',
    action: 'read',
    description: 'View customer notes',
  },
  {
    key: 'customer_notes:write',
    resource: 'customer_notes',
    action: 'write',
    description: 'Create or edit customer notes',
  },
  {
    key: 'customer_notes:delete',
    resource: 'customer_notes',
    action: 'delete',
    description: 'Delete customer notes',
  },
  {
    key: 'customer_activities:read',
    resource: 'customer_activities',
    action: 'read',
    description: 'View the customer engagement timeline',
  },
  {
    key: 'follow_up_tasks:read',
    resource: 'follow_up_tasks',
    action: 'read',
    description: 'View follow-up tasks',
  },
  {
    key: 'follow_up_tasks:write',
    resource: 'follow_up_tasks',
    action: 'write',
    description: 'Create or edit follow-up tasks, including complete/cancel/reopen',
  },
  {
    key: 'follow_up_tasks:delete',
    resource: 'follow_up_tasks',
    action: 'delete',
    description: 'Delete follow-up tasks',
  },
  {
    key: 'customer_tags:read',
    resource: 'customer_tags',
    action: 'read',
    description: 'View customer tags',
  },
  {
    key: 'customer_tags:write',
    resource: 'customer_tags',
    action: 'write',
    description: 'Create or edit customer tags, including assignment',
  },
  {
    key: 'customer_tags:delete',
    resource: 'customer_tags',
    action: 'delete',
    description: 'Delete customer tags',
  },
  // Milestone 10 (Payments & Billing Foundation) — `invoices:read`/
  // `invoices:write`/`payments:read` already existed above (Phase
  // 1.1B's original billing seed, previously unconsumed — see
  // InvoiceController/PaymentController); reused as-is, only their
  // grants extended below. `invoices:void`/`payments:refund` are new,
  // Admin+-only tiers (this milestone's own explicit "Void / Refund:
  // Admin, Super Admin"), the same shape Milestone 8's own
  // `orders:cancel` established. `payments:write` is new (covers Record
  // + Allocate — no `:delete`, `Payment` is append-only). `tax_rates:*`
  // follows the usual read/write/delete tiers.
  {
    key: 'invoices:void',
    resource: 'invoices',
    action: 'void',
    description: 'Void invoices',
  },
  {
    key: 'payments:write',
    resource: 'payments',
    action: 'write',
    description: 'Record or allocate payments',
  },
  {
    key: 'payments:refund',
    resource: 'payments',
    action: 'refund',
    description: 'Initiate a payment refund',
  },
  {
    key: 'tax_rates:read',
    resource: 'tax_rates',
    action: 'read',
    description: 'View tax rates',
  },
  {
    key: 'tax_rates:write',
    resource: 'tax_rates',
    action: 'write',
    description: 'Create or edit tax rates',
  },
  {
    key: 'tax_rates:delete',
    resource: 'tax_rates',
    action: 'delete',
    description: 'Delete tax rates',
  },
];

// Milestone 3 (Role & Permission Foundation) added `super_admin`,
// `manager`, and `customer` below, plus renamed `admin`'s display name
// from "Administrator" to "Admin" (same `key`, so this updates the
// existing row rather than creating a new one) — matching the brief's
// exact requested role names: "Super Admin, Admin, Manager, Customer".
// Purely additive otherwise: `project_manager`/`sales`/`client` (already
// seeded, already possibly assigned in a real dev database) are left
// untouched rather than renamed/removed — nothing in this codebase
// referenced their `key` values programmatically before RBAC enforcement
// existed (this milestone is what introduces it), so keeping them
// alongside the four new names costs nothing and avoids orphaning any
// existing `UserRole`/`RolePermission` rows a rename would have required
// reconciling. `manager`/`customer` reuse `project_manager`/`client`'s
// existing permission sets exactly (a sensible, ready-made "manager" and
// "customer" tier), and `super_admin` reuses `admin`'s full permission
// set — this app has no platform-vs-tenant-admin distinction modeled yet
// (no permission exists that only a "super" admin should hold), so
// `super_admin` is a distinct top-level tier in name only for now, not in
// grant scope; see docs/implementation/decisions.md.
const ROLES: Array<{ key: string; name: string; description: string; permissionKeys: string[] }> = [
  {
    key: 'admin',
    name: 'Admin',
    description: 'Full access — internal Antrique staff running the platform.',
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    key: 'super_admin',
    name: 'Super Admin',
    description:
      'Full access — same permission set as Admin today (this app has no platform-vs-tenant-admin ' +
      "distinction modeled yet); a distinct top-level role for Milestone 3's RBAC validation.",
    permissionKeys: PERMISSIONS.map((p) => p.key),
  },
  {
    key: 'project_manager',
    name: 'Project Manager',
    description:
      'Runs delivery: projects, milestones, tasks, documents; read-only on CRM and billing.',
    permissionKeys: [
      'projects:read',
      'projects:write',
      'milestones:read',
      'milestones:write',
      'tasks:read',
      'tasks:write',
      'documents:read',
      'documents:write',
      'leads:read',
      'clients:read',
      'quotations:read',
      'invoices:read',
      'notifications:read',
    ],
  },
  {
    key: 'sales',
    name: 'Sales',
    description: 'Runs the pipeline: leads, clients, contact requests, quotations.',
    permissionKeys: [
      'leads:read',
      'leads:write',
      'clients:read',
      'clients:write',
      'contact_requests:read',
      'contact_requests:write',
      'quotations:read',
      'quotations:write',
      'notifications:read',
    ],
  },
  {
    key: 'client',
    name: 'Client',
    description:
      'Client-portal role — read-only visibility into their own project, billing, and documents.',
    permissionKeys: [
      'projects:read',
      'milestones:read',
      'documents:read',
      'quotations:read',
      'invoices:read',
      'notifications:read',
    ],
  },
  {
    key: 'manager',
    name: 'Manager',
    description:
      'Runs delivery: projects, milestones, tasks, documents; read-only on CRM and billing — ' +
      "same grant set as Project Manager, under Milestone 3's requested role name. Milestone 5 " +
      "added catalog read+write (no delete — Manager sits below Admin in the catalog's " +
      'write/delete split). Milestone 6 added the same read+write shape for the bespoke ' +
      'customizer resources. Milestone 7 added the same shape for the inventory resources. ' +
      'Milestone 9 added leads:write (Manager already had leads:read from Phase 1.1B) plus ' +
      'read+write for the new CRM entities (no delete — same split as every other resource). ' +
      'Milestone 10 added invoices:write (Manager already had invoices:read from Phase 1.1B) ' +
      'plus payments:read+write and tax_rates:read+write — no invoices:void/payments:refund, ' +
      "this milestone's own explicit Admin+-only tier. Milestone 11 added notifications:manage, " +
      'dashboard:read, and reports:read+write (this milestone\'s own explicit "Manager, Admin, ' +
      'Super Admin" tier for all three) — no audit_logs:read, this milestone\'s own explicit ' +
      '"Admin, Super Admin" only tier (Manager was never granted it). Milestone 14 added ' +
      'system:read under the same "Admin, Super Admin" only tier — Manager was never granted ' +
      'that one either.',
    permissionKeys: [
      'projects:read',
      'projects:write',
      'milestones:read',
      'milestones:write',
      'tasks:read',
      'tasks:write',
      'documents:read',
      'documents:write',
      'leads:read',
      'leads:write',
      'clients:read',
      'quotations:read',
      'invoices:read',
      'invoices:write',
      'notifications:read',
      'categories:read',
      'categories:write',
      'collections:read',
      'collections:write',
      'products:read',
      'products:write',
      'fabrics:read',
      'fabrics:write',
      'measurement_profiles:read',
      'measurement_profiles:write',
      'style_options:read',
      'style_options:write',
      'product_customizations:read',
      'product_customizations:write',
      'warehouses:read',
      'warehouses:write',
      'inventory:read',
      'inventory:write',
      'suppliers:read',
      'suppliers:write',
      'customers:read',
      'customers:write',
      'orders:read',
      'orders:write',
      'customer_notes:read',
      'customer_notes:write',
      'customer_activities:read',
      'follow_up_tasks:read',
      'follow_up_tasks:write',
      'customer_tags:read',
      'customer_tags:write',
      'payments:read',
      'payments:write',
      'tax_rates:read',
      'tax_rates:write',
      'notifications:manage',
      'dashboard:read',
      'reports:read',
      'reports:write',
    ],
  },
  {
    key: 'customer',
    name: 'Customer',
    description:
      'Client-portal role — read-only visibility into their own project, billing, and documents — ' +
      "same grant set as Client, under Milestone 3's requested role name. Milestone 5 added " +
      'catalog read-only (the RBAC brief\'s "Customer+" read tier). Milestone 6 added the same ' +
      'read-only shape for the bespoke customizer resources. Milestone 7 added the same read-only ' +
      'shape for the inventory resources. Milestone 8 added the same read-only shape for orders/' +
      'customers. Milestone 9 added leads:read (this milestone\'s own explicit "Customer+" read ' +
      'tier) plus read-only for the new CRM entities. Milestone 10 added payments:read (Phase ' +
      "1.1B's own permission, previously granted to nobody) plus tax_rates:read.",
    permissionKeys: [
      'projects:read',
      'milestones:read',
      'documents:read',
      'quotations:read',
      'invoices:read',
      'notifications:read',
      'categories:read',
      'collections:read',
      'products:read',
      'fabrics:read',
      'measurement_profiles:read',
      'style_options:read',
      'product_customizations:read',
      'warehouses:read',
      'inventory:read',
      'suppliers:read',
      'customers:read',
      'orders:read',
      'leads:read',
      'customer_notes:read',
      'customer_activities:read',
      'follow_up_tasks:read',
      'customer_tags:read',
      'payments:read',
      'tax_rates:read',
    ],
  },
];

async function main() {
  await prisma.$transaction(
    async (tx) => {
      // Only takes effect if DATABASE_URL points at antrique_app/antrique_service
      // (RLS-enforced, non-owner roles) — see docs/architecture/database-schema.md
      // "Local development workflow". If it points at the migration/owner role
      // (the default local-dev setup), RLS doesn't apply to the owner at all and
      // this is a harmless no-op. SET LOCAL is scoped to this transaction only,
      // which is why every seed operation below runs through `tx`, not `prisma`.
      await tx.$executeRawUnsafe(`SET LOCAL app.is_service_context = 'on'`);

      const tenant = await tx.tenant.upsert({
        where: { slug: 'antrique' },
        update: {},
        create: {
          id: TENANT_ID,
          name: 'Antrique Web Studio',
          slug: 'antrique',
          status: TenantStatus.ACTIVE,
        },
      });

      for (const p of PERMISSIONS) {
        await tx.permission.upsert({
          where: { key: p.key },
          update: { resource: p.resource, action: p.action, description: p.description },
          create: p,
        });
      }

      const roleIdByKey = new Map<string, string>();
      for (const r of ROLES) {
        // Not tx.role.upsert(): `roles_tenant_id_key_key` is a PARTIAL unique
        // index (WHERE deleted_at IS NULL, see the partial_unique_indexes
        // migration) — Postgres can't use a partial index as an ON CONFLICT
        // arbiter for the plain `ON CONFLICT (tenant_id, key)` Prisma
        // generates from schema.prisma's un-partial-aware `@@unique`, so
        // .upsert() fails with 42P10 on every one of the 6 tables that got a
        // partial index. Find-then-create/update instead. See
        // docs/architecture/database-schema.md "Partial unique indexes vs.
        // Prisma upsert()" — this same landmine applies to any Phase 1.2+
        // repository code touching users/roles/quotations/invoices/blogs/settings.
        const existingRole = await tx.role.findFirst({
          where: { tenantId: tenant.id, key: r.key, deletedAt: null },
        });
        const role = existingRole
          ? await tx.role.update({
              where: { id: existingRole.id },
              data: { name: r.name, description: r.description },
            })
          : await tx.role.create({
              data: {
                tenantId: tenant.id,
                key: r.key,
                name: r.name,
                description: r.description,
                isSystem: true,
              },
            });
        roleIdByKey.set(r.key, role.id);

        for (const permissionKey of r.permissionKeys) {
          const permission = await tx.permission.findUniqueOrThrow({
            where: { key: permissionKey },
          });
          await tx.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
            update: {},
            create: { tenantId: tenant.id, roleId: role.id, permissionId: permission.id },
          });
        }
      }

      // `Algorithm` is declared `const enum` in @node-rs/argon2's own
      // .d.ts, so importing it as a value fails under this project's
      // `isolatedModules` (TS2748 — see password.service.ts's identical,
      // already-documented fix). `2` is that enum's own documented
      // `Argon2id` value, imported only as a type here for a statically
      // checked field.
      const argon2id: Algorithm = 2;

      // One seed user per RBAC tier this milestone validates against —
      // Milestone 3 (Role & Permission Foundation) generalized what was
      // originally a single admin@antrique.dev-only block (Milestone 1)
      // into this loop so super_admin/manager/customer test logins exist
      // too, without repeating the same find-then-create/hash/assign-role
      // sequence three more times. Each password is dev-only, never a
      // real credential — same header-comment disclaimer as
      // ADMIN_SEED_PASSWORD above.
      const TEST_USERS: Array<{
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        roleKey: string;
      }> = [
        {
          email: 'admin@antrique.dev',
          firstName: 'Antrique',
          lastName: 'Admin',
          password: ADMIN_SEED_PASSWORD,
          roleKey: 'admin',
        },
        {
          email: 'superadmin@antrique.dev',
          firstName: 'Antrique',
          lastName: 'SuperAdmin',
          password: 'DevSuperAdmin123!',
          roleKey: 'super_admin',
        },
        {
          email: 'manager@antrique.dev',
          firstName: 'Antrique',
          lastName: 'Manager',
          password: 'DevManager123!',
          roleKey: 'manager',
        },
        {
          email: 'customer@antrique.dev',
          firstName: 'Antrique',
          lastName: 'Customer',
          password: 'DevCustomer123!',
          roleKey: 'customer',
        },
      ];

      for (const u of TEST_USERS) {
        // Not tx.user.upsert() — same partial-unique-index limitation as
        // Role above (`users_tenant_id_email_key` is WHERE deleted_at IS
        // NULL AND keyed on LOWER(email), so this lookup matches it
        // case-insensitively).
        const existingUser = await tx.user.findFirst({
          where: {
            tenantId: tenant.id,
            email: { equals: u.email, mode: 'insensitive' },
            deletedAt: null,
          },
        });
        // Re-hashed (and, for an existing row, re-set) on every seed run —
        // Argon2 salts randomly, so this is never byte-stable, but that's
        // fine: idempotency here only needs "a valid hash of the known dev
        // password exists," not a stable hash value. Always overwriting
        // (not only setting when missing) keeps a developer's answer to
        // "does <email> / <password> still work after reseeding"
        // predictably yes.
        const passwordHash = await hash(u.password, {
          algorithm: argon2id,
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        });
        const user = existingUser
          ? await tx.user.update({
              where: { id: existingUser.id },
              data: { passwordHash },
            })
          : await tx.user.create({
              data: {
                tenantId: tenant.id,
                // Placeholder external-IdP subject — real IdP/SSO
                // integration is still a future task; this is a
                // seed/dev-only stand-in, not a real IdP link.
                // passwordHash is the real credential path Milestone 1
                // (Real Authentication) added — both can coexist on one
                // User (see schema.prisma's User model comment).
                idpSubject: `seed|${u.email}`,
                passwordHash,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                status: UserStatus.ACTIVE,
              },
            });

        const roleId = roleIdByKey.get(u.roleKey)!;
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId } },
          update: {},
          create: { tenantId: tenant.id, userId: user.id, roleId },
        });
      }

      const SETTINGS: Array<{ key: string; value: Prisma.InputJsonValue; description: string }> = [
        {
          key: 'features.client_portal_enabled',
          value: { enabled: true },
          description: 'Whether the client-facing portal is enabled for this tenant.',
        },
        {
          key: 'notifications.digest_frequency',
          value: { frequency: 'daily' },
          description:
            'How often digest emails (vs. immediate) are sent for non-urgent notifications.',
        },
        {
          key: 'branding.primary_color',
          value: { hex: '#0F172A' },
          description:
            'Primary brand color used in client-facing portal chrome and transactional emails.',
        },
      ];
      // Not tx.setting.upsert() — same partial-unique-index limitation as
      // Role/User above (`settings_tenant_id_key_key` is WHERE deleted_at IS NULL).
      for (const s of SETTINGS) {
        const existingSetting = await tx.setting.findFirst({
          where: { tenantId: tenant.id, key: s.key, deletedAt: null },
        });
        if (existingSetting) {
          await tx.setting.update({
            where: { id: existingSetting.id },
            data: { value: s.value, description: s.description },
          });
        } else {
          await tx.setting.create({
            data: { tenantId: tenant.id, key: s.key, value: s.value, description: s.description },
          });
        }
      }

      const CLIENTS = [
        {
          id: CLIENT_SAFFRON_ID,
          name: 'Saffron & Sage Living',
          industry: 'Home & Decor E-commerce',
          website: 'https://saffronandsage.example.com',
          primaryEmail: 'ops@saffronandsage.example.com',
          primaryPhone: '+91 98200 11223',
          status: ClientStatus.ACTIVE,
        },
        {
          id: CLIENT_KESTREL_ID,
          name: 'Kestrel Fintech Labs',
          industry: 'Fintech',
          website: 'https://kestrelfintech.example.com',
          primaryEmail: 'hello@kestrelfintech.example.com',
          primaryPhone: '+91 80471 55678',
          status: ClientStatus.ACTIVE,
        },
        {
          id: CLIENT_MERIDIAN_ID,
          name: 'Meridian Health Diagnostics',
          industry: 'Healthcare',
          website: 'https://meridiandiagnostics.example.com',
          primaryEmail: 'contact@meridiandiagnostics.example.com',
          primaryPhone: '+91 20338 90012',
          status: ClientStatus.ACTIVE,
        },
        {
          id: CLIENT_NORTHWIND_ID,
          name: 'Northwind Outdoor Gear',
          industry: 'Outdoor & Sporting Goods E-commerce',
          website: 'https://northwindoutdoor.example.com',
          primaryEmail: 'partnerships@northwindoutdoor.example.com',
          primaryPhone: '+1 503 555 0199',
          status: ClientStatus.ACTIVE,
        },
      ];
      for (const c of CLIENTS) {
        await tx.client.upsert({
          where: { id: c.id },
          update: { ...c, tenantId: tenant.id },
          create: { ...c, tenantId: tenant.id },
        });
      }

      // "Services" per the seed brief isn't a modeled entity (see file header) —
      // realistic service names go into the existing free-text serviceInterest
      // array on each Lead instead of a new table.
      const LEADS = [
        {
          id: LEAD_NEW_ID,
          contactName: 'Priya Nair',
          contactEmail: 'priya.nair@example.com',
          organization: 'Nair & Co. Interiors',
          source: 'website_contact_form',
          serviceInterest: ['Website Design', 'SEO'],
          industry: 'Interior Design',
          status: LeadStatus.NEW,
        },
        {
          id: LEAD_QUALIFIED_ID,
          contactName: 'Arjun Mehta',
          contactEmail: 'arjun.mehta@example.com',
          organization: 'Mehta Logistics',
          source: 'referral',
          serviceInterest: ['E-commerce Development'],
          industry: 'Logistics',
          status: LeadStatus.QUALIFIED,
        },
        {
          id: LEAD_CONVERTED_ID,
          contactName: 'Rhea Kapoor',
          contactEmail: 'rhea.kapoor@kestrelfintech.example.com',
          organization: 'Kestrel Fintech Labs',
          source: 'outbound',
          serviceInterest: ['Brand Identity', 'Website Design'],
          industry: 'Fintech',
          status: LeadStatus.CONVERTED,
          convertedClientId: CLIENT_KESTREL_ID,
        },
        {
          id: LEAD_LOST_ID,
          contactName: 'Daniel Cho',
          contactEmail: 'daniel.cho@example.com',
          organization: 'Cho Woodworks',
          source: 'outbound',
          serviceInterest: ['Website Redesign'],
          industry: 'Furniture',
          status: LeadStatus.LOST,
        },
      ];
      for (const l of LEADS) {
        await tx.lead.upsert({
          where: { id: l.id },
          update: { ...l, tenantId: tenant.id },
          create: { ...l, tenantId: tenant.id },
        });
      }

      const PROJECTS = [
        {
          id: PROJECT_SAFFRON_ID,
          clientId: CLIENT_SAFFRON_ID,
          leadId: null,
          name: 'Saffron & Sage — Storefront Relaunch',
          summary: 'Full storefront redesign and headless commerce migration.',
          status: ProjectStatus.ACTIVE,
        },
        {
          id: PROJECT_KESTREL_ID,
          clientId: CLIENT_KESTREL_ID,
          leadId: LEAD_CONVERTED_ID,
          name: 'Kestrel — Marketing Site',
          summary: 'SEO-first marketing site and investor-relations microsite.',
          status: ProjectStatus.IN_REVIEW,
        },
        {
          id: PROJECT_MERIDIAN_ID,
          clientId: CLIENT_MERIDIAN_ID,
          leadId: null,
          name: 'Meridian — Patient Portal Landing',
          summary: 'Marketing landing page ahead of the patient-portal beta launch.',
          status: ProjectStatus.DRAFT,
        },
      ];
      for (const p of PROJECTS) {
        await tx.project.upsert({
          where: { id: p.id },
          update: { ...p, tenantId: tenant.id },
          create: { ...p, tenantId: tenant.id },
        });
      }

      // Milestone 5 (Product Catalog Foundation) — Category/Collection
      // both have the same partial-unique-index limitation as Role/User/
      // Quotation/Invoice/Blog/Settings above (`*_tenant_id_slug_key` is
      // WHERE deleted_at IS NULL) — find-then-create/update, not
      // tx.category.upsert()/tx.collection.upsert().
      const CATEGORIES = [
        {
          id: CATEGORY_RINGS_ID,
          name: 'Rings',
          slug: 'rings',
          description: 'Solitaire, statement, and stackable rings.',
          status: CategoryStatus.ACTIVE,
          sortOrder: 0,
        },
        {
          id: CATEGORY_NECKLACES_ID,
          name: 'Necklaces',
          slug: 'necklaces',
          description: 'Pendants, chains, and layered necklaces.',
          status: CategoryStatus.ACTIVE,
          sortOrder: 1,
        },
        {
          id: CATEGORY_BRACELETS_ID,
          name: 'Bracelets',
          slug: 'bracelets',
          description: 'Bangles, cuffs, and charm bracelets.',
          status: CategoryStatus.ACTIVE,
          sortOrder: 2,
        },
      ];
      for (const c of CATEGORIES) {
        const existing = await tx.category.findFirst({
          where: { tenantId: tenant.id, slug: c.slug, deletedAt: null },
        });
        if (existing) {
          await tx.category.update({ where: { id: existing.id }, data: c });
        } else {
          await tx.category.create({ data: { ...c, tenantId: tenant.id } });
        }
      }

      const COLLECTIONS = [
        {
          id: COLLECTION_SIGNATURE_ID,
          name: 'Signature Collection',
          slug: 'signature-collection',
          description: 'The permanent, year-round core range.',
          status: CollectionStatus.ACTIVE,
          sortOrder: 0,
        },
        {
          id: COLLECTION_LIMITED_ID,
          name: 'Limited Edition',
          slug: 'limited-edition',
          description: 'Seasonal drops, produced in small runs.',
          status: CollectionStatus.ACTIVE,
          sortOrder: 1,
        },
      ];
      for (const c of COLLECTIONS) {
        const existing = await tx.collection.findFirst({
          where: { tenantId: tenant.id, slug: c.slug, deletedAt: null },
        });
        if (existing) {
          await tx.collection.update({ where: { id: existing.id }, data: c });
        } else {
          await tx.collection.create({ data: { ...c, tenantId: tenant.id } });
        }
      }

      const PRODUCTS: Array<{
        id: string;
        categoryId: string;
        collectionId: string | null;
        name: string;
        slug: string;
        description: string;
        status: ProductStatus;
        sortOrder: number;
        variants: Array<{ sku: string; name: string; price: string; isActive: boolean }>;
        images: Array<{ id: string; url: string; altText: string }>;
      }> = [
        {
          id: PRODUCT_SOLITAIRE_RING_ID,
          categoryId: CATEGORY_RINGS_ID,
          collectionId: COLLECTION_SIGNATURE_ID,
          name: 'Solitaire Ring',
          slug: 'solitaire-ring',
          description: 'A single-stone ring in a classic four-prong setting.',
          status: ProductStatus.PUBLISHED,
          sortOrder: 0,
          variants: [
            { sku: 'RING-SOL-GLD-6', name: 'Gold / Size 6', price: '249.00', isActive: true },
            { sku: 'RING-SOL-SLV-6', name: 'Silver / Size 6', price: '179.00', isActive: true },
          ],
          images: [
            {
              id: IMAGE_SOLITAIRE_RING_ID,
              url: 'https://images.example.com/catalog/solitaire-ring.jpg',
              altText: 'Solitaire ring in a four-prong setting',
            },
          ],
        },
        {
          id: PRODUCT_PEARL_NECKLACE_ID,
          categoryId: CATEGORY_NECKLACES_ID,
          collectionId: COLLECTION_SIGNATURE_ID,
          name: 'Pearl Necklace',
          slug: 'pearl-necklace',
          description: 'A single strand of cultured pearls on a sterling silver clasp.',
          status: ProductStatus.PUBLISHED,
          sortOrder: 1,
          variants: [
            { sku: 'NECK-PRL-16', name: '16 inch', price: '129.00', isActive: true },
            { sku: 'NECK-PRL-18', name: '18 inch', price: '145.00', isActive: true },
          ],
          images: [
            {
              id: IMAGE_PEARL_NECKLACE_ID,
              url: 'https://images.example.com/catalog/pearl-necklace.jpg',
              altText: 'Single-strand pearl necklace',
            },
          ],
        },
        {
          id: PRODUCT_CHARM_BRACELET_ID,
          categoryId: CATEGORY_BRACELETS_ID,
          collectionId: COLLECTION_LIMITED_ID,
          name: 'Charm Bracelet',
          slug: 'charm-bracelet',
          description: 'A chain bracelet with three interchangeable charms.',
          status: ProductStatus.DRAFT,
          sortOrder: 2,
          variants: [{ sku: 'BRC-CHM-SM', name: 'Small', price: '89.00', isActive: true }],
          images: [],
        },
      ];
      for (const p of PRODUCTS) {
        const { variants, images, ...productData } = p;
        const existing = await tx.product.findFirst({
          where: { tenantId: tenant.id, slug: p.slug, deletedAt: null },
        });
        const product = existing
          ? await tx.product.update({ where: { id: existing.id }, data: productData })
          : await tx.product.create({ data: { ...productData, tenantId: tenant.id } });

        for (const v of variants) {
          await tx.productVariant.upsert({
            where: { tenantId_sku: { tenantId: tenant.id, sku: v.sku } },
            update: { ...v, productId: product.id },
            create: { ...v, tenantId: tenant.id, productId: product.id },
          });
        }
        // ProductImage has no unique constraint of its own — each seeded
        // image gets a fixed, hand-listed id (IMAGE_*_ID above), the same
        // "no natural unique key" treatment Client/Lead/Project already
        // use (see this file's header comment), so reseeding updates the
        // same rows instead of duplicating them.
        for (const [index, img] of images.entries()) {
          const { id: imageId, ...imageData } = img;
          await tx.productImage.upsert({
            where: { id: imageId },
            update: { ...imageData, productId: product.id, sortOrder: index },
            create: {
              id: imageId,
              ...imageData,
              tenantId: tenant.id,
              productId: product.id,
              sortOrder: index,
            },
          });
        }
      }

      // Milestone 6 (Bespoke Customizer Engine) — one distinct garment
      // product ("Made-to-Measure Oxford Shirt") to exercise fabric/
      // measurement/style-option/monogram/pricing-adjustment features the
      // jewelry catalog above has no natural use for (see this file's own
      // comment on the new id constants above).
      const bespokeCategory = await tx.category.findFirst({
        where: { tenantId: tenant.id, slug: 'bespoke-garments', deletedAt: null },
      });
      const bespokeCategoryRow = bespokeCategory
        ? await tx.category.update({
            where: { id: bespokeCategory.id },
            data: {
              name: 'Bespoke Garments',
              description: 'Made-to-measure clothing, configured via the customizer.',
              status: CategoryStatus.ACTIVE,
              sortOrder: 3,
            },
          })
        : await tx.category.create({
            data: {
              id: CATEGORY_BESPOKE_GARMENTS_ID,
              tenantId: tenant.id,
              name: 'Bespoke Garments',
              slug: 'bespoke-garments',
              description: 'Made-to-measure clothing, configured via the customizer.',
              status: CategoryStatus.ACTIVE,
              sortOrder: 3,
            },
          });

      const existingShirt = await tx.product.findFirst({
        where: { tenantId: tenant.id, slug: 'made-to-measure-oxford-shirt', deletedAt: null },
      });
      const shirtData = {
        categoryId: bespokeCategoryRow.id,
        collectionId: null,
        name: 'Made-to-Measure Oxford Shirt',
        slug: 'made-to-measure-oxford-shirt',
        description: 'A fully bespoke Oxford shirt — choose your fabric, fit, and finish.',
        status: ProductStatus.PUBLISHED,
        sortOrder: 0,
      };
      const shirt = existingShirt
        ? await tx.product.update({ where: { id: existingShirt.id }, data: shirtData })
        : await tx.product.create({
            data: { ...shirtData, tenantId: tenant.id, id: PRODUCT_BESPOKE_SHIRT_ID },
          });

      const FABRIC_CATEGORIES = [
        { id: FABRIC_CATEGORY_WOOL_ID, name: 'Wool', slug: 'wool', sortOrder: 0 },
        { id: FABRIC_CATEGORY_COTTON_ID, name: 'Cotton', slug: 'cotton', sortOrder: 1 },
      ];
      for (const fc of FABRIC_CATEGORIES) {
        const existing = await tx.fabricCategory.findFirst({
          where: { tenantId: tenant.id, slug: fc.slug, deletedAt: null },
        });
        const data = {
          name: fc.name,
          slug: fc.slug,
          status: FabricCategoryStatus.ACTIVE,
          sortOrder: fc.sortOrder,
        };
        if (existing) {
          await tx.fabricCategory.update({ where: { id: existing.id }, data });
        } else {
          await tx.fabricCategory.create({ data: { ...data, id: fc.id, tenantId: tenant.id } });
        }
      }

      const FABRICS = [
        {
          id: FABRIC_NAVY_WOOL_ID,
          fabricCategoryId: FABRIC_CATEGORY_WOOL_ID,
          name: 'Navy Wool Twill',
          slug: 'navy-wool-twill',
          composition: '100% Wool',
          colorHex: '#1B2A4A',
          priceAdjustment: '35.00',
          sortOrder: 0,
        },
        {
          id: FABRIC_OXFORD_COTTON_ID,
          fabricCategoryId: FABRIC_CATEGORY_COTTON_ID,
          name: 'Classic Oxford Cotton',
          slug: 'classic-oxford-cotton',
          composition: '100% Cotton',
          colorHex: '#F5F1E8',
          priceAdjustment: '0.00',
          sortOrder: 1,
        },
      ];
      for (const f of FABRICS) {
        const { id, ...fabricData } = f;
        const existing = await tx.fabric.findFirst({
          where: { tenantId: tenant.id, slug: f.slug, deletedAt: null },
        });
        const data = { ...fabricData, status: FabricStatus.ACTIVE };
        const fabricRow = existing
          ? await tx.fabric.update({ where: { id: existing.id }, data })
          : await tx.fabric.create({ data: { ...data, id, tenantId: tenant.id } });

        await tx.productFabric.upsert({
          where: { productId_fabricId: { productId: shirt.id, fabricId: fabricRow.id } },
          update: {},
          create: { tenantId: tenant.id, productId: shirt.id, fabricId: fabricRow.id },
        });
      }

      // FabricImage has no unique constraint of its own — same fixed,
      // hand-listed id treatment as ProductImage above.
      await tx.fabricImage.upsert({
        where: { id: FABRIC_IMAGE_NAVY_WOOL_ID },
        update: {
          fabricId: FABRIC_NAVY_WOOL_ID,
          url: 'https://images.example.com/fabrics/navy-wool-twill.jpg',
          altText: 'Navy wool twill swatch',
          sortOrder: 0,
        },
        create: {
          id: FABRIC_IMAGE_NAVY_WOOL_ID,
          tenantId: tenant.id,
          fabricId: FABRIC_NAVY_WOOL_ID,
          url: 'https://images.example.com/fabrics/navy-wool-twill.jpg',
          altText: 'Navy wool twill swatch',
          sortOrder: 0,
        },
      });

      // MeasurementProfile owned by the seeded customer test user (see
      // TEST_USERS above) — demonstrates the userId link this milestone's
      // own schema comment on MeasurementProfile explains.
      const customerUser = await tx.user.findFirst({
        where: { tenantId: tenant.id, email: 'customer@antrique.dev', deletedAt: null },
      });
      const measurementProfile = await tx.measurementProfile.upsert({
        where: { id: MEASUREMENT_PROFILE_DEMO_ID },
        update: { userId: customerUser?.id, name: 'Default Shirt Measurements' },
        create: {
          id: MEASUREMENT_PROFILE_DEMO_ID,
          tenantId: tenant.id,
          userId: customerUser?.id,
          name: 'Default Shirt Measurements',
        },
      });
      const MEASUREMENTS = [
        { name: 'Chest', value: '40.00', unit: MeasurementUnit.IN },
        { name: 'Waist', value: '34.00', unit: MeasurementUnit.IN },
        { name: 'Sleeve Length', value: '25.50', unit: MeasurementUnit.IN },
      ];
      for (const m of MEASUREMENTS) {
        await tx.measurement.upsert({
          where: {
            measurementProfileId_name: {
              measurementProfileId: measurementProfile.id,
              name: m.name,
            },
          },
          update: { value: m.value, unit: m.unit },
          create: { ...m, tenantId: tenant.id, measurementProfileId: measurementProfile.id },
        });
      }

      // ProductCustomization is the bespoke shirt's 1:1 configuration —
      // StyleOptionGroups/StyleOptions/MonogramOptions/PricingAdjustments
      // all nest under it, matching schema.prisma's own doc comment.
      // Not tx.productCustomization.upsert() — same partial-unique-index
      // limitation as Category/Collection/Product above (`productId` is
      // unique WHERE deleted_at IS NULL) — find-then-create/update.
      const existingCustomization = await tx.productCustomization.findFirst({
        where: { productId: shirt.id, deletedAt: null },
      });
      const customizationData = { name: 'Oxford Shirt Customization', isActive: true };
      const customization = existingCustomization
        ? await tx.productCustomization.update({
            where: { id: existingCustomization.id },
            data: customizationData,
          })
        : await tx.productCustomization.create({
            data: {
              ...customizationData,
              id: PRODUCT_CUSTOMIZATION_BESPOKE_SHIRT_ID,
              tenantId: tenant.id,
              productId: shirt.id,
            },
          });

      const collarGroup = await tx.styleOptionGroup.upsert({
        where: { id: STYLE_OPTION_GROUP_COLLAR_ID },
        update: { name: 'Collar Style', isRequired: true, sortOrder: 0 },
        create: {
          id: STYLE_OPTION_GROUP_COLLAR_ID,
          tenantId: tenant.id,
          productCustomizationId: customization.id,
          name: 'Collar Style',
          isRequired: true,
          sortOrder: 0,
        },
      });
      const cuffGroup = await tx.styleOptionGroup.upsert({
        where: { id: STYLE_OPTION_GROUP_CUFF_ID },
        update: { name: 'Cuff Style', isRequired: true, sortOrder: 1 },
        create: {
          id: STYLE_OPTION_GROUP_CUFF_ID,
          tenantId: tenant.id,
          productCustomizationId: customization.id,
          name: 'Cuff Style',
          isRequired: true,
          sortOrder: 1,
        },
      });

      const STYLE_OPTIONS = [
        {
          id: STYLE_OPTION_SPREAD_COLLAR_ID,
          groupId: collarGroup.id,
          name: 'Spread Collar',
          priceAdjustment: '0.00',
          sortOrder: 0,
        },
        {
          id: STYLE_OPTION_BUTTON_DOWN_COLLAR_ID,
          groupId: collarGroup.id,
          name: 'Button-Down Collar',
          priceAdjustment: '0.00',
          sortOrder: 1,
        },
        {
          id: STYLE_OPTION_BARREL_CUFF_ID,
          groupId: cuffGroup.id,
          name: 'Barrel Cuff',
          priceAdjustment: '0.00',
          sortOrder: 0,
        },
        {
          id: STYLE_OPTION_FRENCH_CUFF_ID,
          groupId: cuffGroup.id,
          name: 'French Cuff',
          priceAdjustment: '15.00',
          sortOrder: 1,
        },
      ];
      for (const so of STYLE_OPTIONS) {
        await tx.styleOption.upsert({
          where: { id: so.id },
          update: {
            name: so.name,
            priceAdjustment: so.priceAdjustment,
            sortOrder: so.sortOrder,
            status: StyleOptionStatus.ACTIVE,
          },
          create: {
            id: so.id,
            tenantId: tenant.id,
            styleOptionGroupId: so.groupId,
            name: so.name,
            priceAdjustment: so.priceAdjustment,
            sortOrder: so.sortOrder,
            status: StyleOptionStatus.ACTIVE,
          },
        });
      }

      // Demonstrates this milestone's own "Incompatible style combinations
      // are rejected" business rule: a button-down collar (a casual style)
      // paired with French cuffs (a formal, dressy style) is a real
      // tailoring mismatch — stored one-directionally (A < B by id),
      // matching schema.prisma's own comment on this table.
      const incompatiblePair: [string, string] =
        STYLE_OPTION_BUTTON_DOWN_COLLAR_ID < STYLE_OPTION_FRENCH_CUFF_ID
          ? [STYLE_OPTION_BUTTON_DOWN_COLLAR_ID, STYLE_OPTION_FRENCH_CUFF_ID]
          : [STYLE_OPTION_FRENCH_CUFF_ID, STYLE_OPTION_BUTTON_DOWN_COLLAR_ID];
      const [a, b] = incompatiblePair;
      await tx.styleOptionIncompatibility.upsert({
        where: { styleOptionAId_styleOptionBId: { styleOptionAId: a, styleOptionBId: b } },
        update: { reason: 'Button-down collars are casual; French cuffs are formal.' },
        create: {
          tenantId: tenant.id,
          styleOptionAId: a,
          styleOptionBId: b,
          reason: 'Button-down collars are casual; French cuffs are formal.',
        },
      });

      await tx.pricingAdjustment.upsert({
        where: { id: PRICING_ADJUSTMENT_FRENCH_CUFF_ID },
        update: { label: 'French Cuff Upgrade', amount: '15.00' },
        create: {
          id: PRICING_ADJUSTMENT_FRENCH_CUFF_ID,
          tenantId: tenant.id,
          productCustomizationId: customization.id,
          styleOptionId: STYLE_OPTION_FRENCH_CUFF_ID,
          label: 'French Cuff Upgrade',
          adjustmentType: PricingAdjustmentType.FLAT,
          amount: '15.00',
        },
      });

      await tx.monogramOption.upsert({
        where: { id: MONOGRAM_OPTION_CHEST_ID },
        update: { label: 'Chest Monogram', maxCharacters: 3 },
        create: {
          id: MONOGRAM_OPTION_CHEST_ID,
          tenantId: tenant.id,
          productCustomizationId: customization.id,
          label: 'Chest Monogram',
          maxCharacters: 3,
          priceAdjustment: '10.00',
        },
      });

      // Milestone 7 (Inventory & Stock Management) — one warehouse, stock
      // for both a Fabric-based item (Navy Wool Twill) and a
      // ProductVariant-based item (the solitaire ring's gold variant,
      // seeded above under PRODUCTS), one supplier, and enough
      // transaction/reservation history to demonstrate the ledger live.
      const existingWarehouse = await tx.warehouse.findFirst({
        where: { tenantId: tenant.id, slug: 'main-warehouse', deletedAt: null },
      });
      const warehouseData = {
        name: 'Main Warehouse',
        slug: 'main-warehouse',
        city: 'Newark',
        region: 'NJ',
        country: 'USA',
        status: WarehouseStatus.ACTIVE,
      };
      const warehouse = existingWarehouse
        ? await tx.warehouse.update({ where: { id: existingWarehouse.id }, data: warehouseData })
        : await tx.warehouse.create({
            data: { ...warehouseData, id: WAREHOUSE_MAIN_ID, tenantId: tenant.id },
          });

      const ringVariant = await tx.productVariant.findFirst({
        where: { tenantId: tenant.id, sku: 'RING-SOL-GLD-6' },
      });

      // Fabric-based InventoryItem — find-then-create/update, not
      // upsert, same partial-unique-index limitation as
      // Category/Fabric/ProductCustomization above.
      const existingNavyWoolItem = await tx.inventoryItem.findFirst({
        where: {
          tenantId: tenant.id,
          warehouseId: warehouse.id,
          fabricId: FABRIC_NAVY_WOOL_ID,
          deletedAt: null,
        },
      });
      const navyWoolItem = existingNavyWoolItem
        ? existingNavyWoolItem
        : await tx.inventoryItem.create({
            data: {
              id: INVENTORY_ITEM_NAVY_WOOL_ID,
              tenantId: tenant.id,
              warehouseId: warehouse.id,
              fabricId: FABRIC_NAVY_WOOL_ID,
              onHand: '0',
              reserved: '0',
              reorderPoint: '20',
            },
          });

      if (!existingNavyWoolItem) {
        await tx.inventoryItem.update({ where: { id: navyWoolItem.id }, data: { onHand: '150' } });
        await tx.inventoryTransaction.upsert({
          where: { id: INVENTORY_TRANSACTION_NAVY_WOOL_RECEIPT_ID },
          update: {},
          create: {
            id: INVENTORY_TRANSACTION_NAVY_WOOL_RECEIPT_ID,
            tenantId: tenant.id,
            inventoryItemId: navyWoolItem.id,
            type: InventoryTransactionType.RECEIPT,
            onHandDelta: '150',
            reservedDelta: '0',
            onHandAfter: '150',
            reservedAfter: '0',
            reason: 'Initial stock receipt',
          },
        });
      }

      // ProductVariant-based InventoryItem (the ring's gold variant) —
      // only seeded if that variant exists (it's created in the PRODUCTS
      // loop above, so it always will on a fresh run).
      let ringItem: { id: string } | null = null;
      if (ringVariant) {
        const existingRingItem = await tx.inventoryItem.findFirst({
          where: {
            tenantId: tenant.id,
            warehouseId: warehouse.id,
            productVariantId: ringVariant.id,
            deletedAt: null,
          },
        });
        ringItem = existingRingItem
          ? existingRingItem
          : await tx.inventoryItem.create({
              data: {
                id: INVENTORY_ITEM_OXFORD_COTTON_ID,
                tenantId: tenant.id,
                warehouseId: warehouse.id,
                productVariantId: ringVariant.id,
                onHand: '0',
                reserved: '0',
                reorderPoint: '5',
              },
            });

        if (!existingRingItem) {
          await tx.inventoryItem.update({ where: { id: ringItem.id }, data: { onHand: '25' } });
          await tx.inventoryTransaction.upsert({
            where: { id: INVENTORY_TRANSACTION_RING_RECEIPT_ID },
            update: {},
            create: {
              id: INVENTORY_TRANSACTION_RING_RECEIPT_ID,
              tenantId: tenant.id,
              inventoryItemId: ringItem.id,
              type: InventoryTransactionType.RECEIPT,
              onHandDelta: '25',
              reservedDelta: '0',
              onHandAfter: '25',
              reservedAfter: '0',
              reason: 'Initial stock receipt',
            },
          });

          // One active reservation, to demonstrate the reservation
          // lifecycle live — holds 3 units against the ring's 25 on
          // hand (Available = 25 − 3 = 22).
          await tx.inventoryReservation.upsert({
            where: { id: INVENTORY_RESERVATION_RING_ID },
            update: {},
            create: {
              id: INVENTORY_RESERVATION_RING_ID,
              tenantId: tenant.id,
              inventoryItemId: ringItem.id,
              quantity: '3',
              status: ReservationStatus.ACTIVE,
              reference: 'Demo hold',
            },
          });
          await tx.inventoryItem.update({ where: { id: ringItem.id }, data: { reserved: '3' } });
          await tx.inventoryTransaction.upsert({
            where: { id: INVENTORY_TRANSACTION_RING_RESERVE_ID },
            update: {},
            create: {
              id: INVENTORY_TRANSACTION_RING_RESERVE_ID,
              tenantId: tenant.id,
              inventoryItemId: ringItem.id,
              type: InventoryTransactionType.RESERVATION,
              onHandDelta: '0',
              reservedDelta: '3',
              onHandAfter: '25',
              reservedAfter: '3',
              reason: 'Demo hold',
            },
          });
        }
      }

      const existingSupplier = await tx.supplier.findFirst({
        where: { tenantId: tenant.id, slug: 'millbrook-textiles', deletedAt: null },
      });
      const supplierData = {
        name: 'Millbrook Textiles',
        slug: 'millbrook-textiles',
        contactName: 'Dana Millbrook',
        contactEmail: 'dana@millbrooktextiles.example.com',
        status: SupplierStatus.ACTIVE,
      };
      const supplier = existingSupplier
        ? await tx.supplier.update({ where: { id: existingSupplier.id }, data: supplierData })
        : await tx.supplier.create({
            data: { ...supplierData, id: SUPPLIER_MILLBROOK_ID, tenantId: tenant.id },
          });

      await tx.supplierProduct.upsert({
        where: { id: SUPPLIER_PRODUCT_NAVY_WOOL_ID },
        update: { supplierSku: 'MB-NW-100', cost: '18.00', leadTimeDays: 14 },
        create: {
          id: SUPPLIER_PRODUCT_NAVY_WOOL_ID,
          tenantId: tenant.id,
          supplierId: supplier.id,
          fabricId: FABRIC_NAVY_WOOL_ID,
          supplierSku: 'MB-NW-100',
          cost: '18.00',
          leadTimeDays: 14,
        },
      });

      // Milestone 8 (Order Management & Checkout) — one demo customer,
      // one address, one PENDING order reserving stock against the ring
      // variant's existing InventoryItem (seeded under Milestone 7
      // above) — a real, live order → reservation → ledger chain.
      const customerUserForOrder = await tx.user.findFirst({
        where: { tenantId: tenant.id, email: 'customer@antrique.dev', deletedAt: null },
      });
      const existingCustomer = await tx.customer.findFirst({
        where: { tenantId: tenant.id, email: 'jordan.rivera@example.com', deletedAt: null },
      });
      const customerData = {
        userId: customerUserForOrder?.id,
        firstName: 'Jordan',
        lastName: 'Rivera',
        phone: '555-0142',
        status: CustomerStatus.ACTIVE,
      };
      const customer = existingCustomer
        ? await tx.customer.update({ where: { id: existingCustomer.id }, data: customerData })
        : await tx.customer.create({
            data: {
              ...customerData,
              id: CUSTOMER_JORDAN_ID,
              tenantId: tenant.id,
              email: 'jordan.rivera@example.com',
            },
          });

      const address = await tx.customerAddress.upsert({
        where: { id: CUSTOMER_ADDRESS_JORDAN_ID },
        update: {},
        create: {
          id: CUSTOMER_ADDRESS_JORDAN_ID,
          tenantId: tenant.id,
          customerId: customer.id,
          label: 'Home',
          line1: '221 Market St',
          city: 'Newark',
          region: 'NJ',
          postalCode: '07102',
          country: 'USA',
          isDefaultShipping: true,
          isDefaultBilling: true,
        },
      });

      const existingOrder = await tx.order.findFirst({ where: { id: ORDER_JORDAN_RING_ID } });
      if (!existingOrder && ringVariant) {
        const orderQuantity = 2;
        const unitPrice = ringVariant.price;
        const lineTotal = unitPrice.mul(orderQuantity);

        // Reserve stock for this order line — same three-write shape
        // (counter increment + InventoryReservation + InventoryTransaction)
        // InventoryRepository.reserveStock() performs transactionally at
        // runtime; done directly here since this script has no NestJS DI
        // to inject that repository through (see this file's own header
        // comment on why it's a standalone script).
        await tx.inventoryItem.update({
          where: { id: ringItem!.id },
          data: { reserved: { increment: orderQuantity } },
        });
        const orderReservation = await tx.inventoryReservation.create({
          data: {
            id: INVENTORY_RESERVATION_ORDER_ID,
            tenantId: tenant.id,
            inventoryItemId: ringItem!.id,
            quantity: orderQuantity,
            status: ReservationStatus.ACTIVE,
            reference: `order:${ORDER_JORDAN_RING_ID}`,
          },
        });
        const itemAfterReservation = await tx.inventoryItem.findFirstOrThrow({
          where: { id: ringItem!.id },
        });
        await tx.inventoryTransaction.create({
          data: {
            tenantId: tenant.id,
            inventoryItemId: ringItem!.id,
            type: InventoryTransactionType.RESERVATION,
            reservedDelta: orderQuantity,
            onHandAfter: itemAfterReservation.onHand,
            reservedAfter: itemAfterReservation.reserved,
            reason: `order:${ORDER_JORDAN_RING_ID}`,
          },
        });

        await tx.order.create({
          data: {
            id: ORDER_JORDAN_RING_ID,
            tenantId: tenant.id,
            customerId: customer.id,
            status: OrderStatus.PENDING,
            shippingAddressId: address.id,
            billingAddressId: address.id,
            subtotal: lineTotal,
            total: lineTotal,
            items: {
              create: [
                {
                  id: ORDER_ITEM_JORDAN_RING_ID,
                  tenantId: tenant.id,
                  productVariantId: ringVariant.id,
                  inventoryReservationId: orderReservation.id,
                  quantity: orderQuantity,
                  unitPrice,
                  lineTotal,
                },
              ],
            },
            statusHistory: {
              create: [
                { tenantId: tenant.id, status: OrderStatus.DRAFT, previousStatus: null },
                {
                  tenantId: tenant.id,
                  status: OrderStatus.PENDING,
                  previousStatus: OrderStatus.DRAFT,
                },
              ],
            },
          },
        });
      }

      // Milestone 9 (CRM & Customer Operations) — 5 LeadSource lookup
      // rows, one additional Lead ("Morgan Ellis") demonstrating the NEW
      // convertedCustomerId path end-to-end (distinct from
      // LEAD_CONVERTED_ID above, which still demonstrates the
      // pre-existing convertedClientId path untouched by this milestone —
      // see docs/implementation/decisions.md), its own resulting
      // Customer, 2 notes + 1 tag assignment on the already-seeded
      // CUSTOMER_JORDAN_ID (Milestone 8), 2 follow-up tasks (one
      // Customer-scoped and COMPLETED, one Lead-scoped and PENDING —
      // demonstrating both sides of FollowUpTask's own lead-vs-customer
      // XOR), and 3 CustomerActivity rows matching what LeadService/
      // FollowUpService would have written for these exact events (this
      // script has no NestJS DI to inject those services through — same
      // reasoning as the Milestone 8 order block above).
      const LEAD_SOURCES = [
        { id: LEAD_SOURCE_WEBSITE_ID, name: 'Website', slug: 'website' },
        { id: LEAD_SOURCE_REFERRAL_ID, name: 'Referral', slug: 'referral' },
        { id: LEAD_SOURCE_COLD_OUTBOUND_ID, name: 'Cold Outbound', slug: 'cold-outbound' },
        { id: LEAD_SOURCE_TRADE_SHOW_ID, name: 'Trade Show', slug: 'trade-show' },
        { id: LEAD_SOURCE_SOCIAL_MEDIA_ID, name: 'Social Media', slug: 'social-media' },
      ];
      for (const s of LEAD_SOURCES) {
        await tx.leadSource.upsert({
          where: { id: s.id },
          update: { ...s, tenantId: tenant.id },
          create: { ...s, tenantId: tenant.id },
        });
      }

      const morganLead = await tx.lead.upsert({
        where: { id: LEAD_MORGAN_ID },
        update: {},
        create: {
          id: LEAD_MORGAN_ID,
          tenantId: tenant.id,
          contactName: 'Morgan Ellis',
          contactEmail: 'morgan.ellis@example.com',
          source: 'Referral',
          leadSourceId: LEAD_SOURCE_REFERRAL_ID,
          serviceInterest: ['Bespoke Garments'],
          status: LeadStatus.NEW,
        },
      });

      const morganCustomer = await tx.customer.upsert({
        where: { id: CUSTOMER_MORGAN_ID },
        update: {},
        create: {
          id: CUSTOMER_MORGAN_ID,
          tenantId: tenant.id,
          email: morganLead.contactEmail,
          firstName: 'Morgan',
          lastName: 'Ellis',
          status: CustomerStatus.ACTIVE,
        },
      });

      await tx.lead.update({
        where: { id: LEAD_MORGAN_ID },
        data: { status: LeadStatus.CONVERTED, convertedCustomerId: morganCustomer.id },
      });

      await tx.customerActivity.upsert({
        where: { id: CUSTOMER_ACTIVITY_MORGAN_CREATED_ID },
        update: {},
        create: {
          id: CUSTOMER_ACTIVITY_MORGAN_CREATED_ID,
          tenantId: tenant.id,
          type: CustomerActivityType.LEAD_CREATED,
          summary: `Lead created for ${morganLead.contactEmail}`,
          relatedLeadId: morganLead.id,
        },
      });
      await tx.customerActivity.upsert({
        where: { id: CUSTOMER_ACTIVITY_MORGAN_CONVERTED_ID },
        update: {},
        create: {
          id: CUSTOMER_ACTIVITY_MORGAN_CONVERTED_ID,
          tenantId: tenant.id,
          type: CustomerActivityType.LEAD_CONVERTED,
          summary: `Lead ${morganLead.contactEmail} converted to customer`,
          customerId: morganCustomer.id,
          relatedLeadId: morganLead.id,
        },
      });

      const CUSTOMER_NOTES = [
        {
          id: CUSTOMER_NOTE_JORDAN_WELCOME_ID,
          customerId: customer.id,
          body: 'Welcomed Jordan after their first order — interested in future limited-collection drops.',
        },
        {
          id: CUSTOMER_NOTE_JORDAN_PREFERENCE_ID,
          customerId: customer.id,
          body: 'Prefers email over phone for order updates. <strong>Ring size confirmed at 7.</strong>',
        },
      ];
      for (const n of CUSTOMER_NOTES) {
        await tx.customerNote.upsert({
          where: { id: n.id },
          update: {},
          create: { ...n, tenantId: tenant.id },
        });
      }

      const followUpJordan = await tx.followUpTask.upsert({
        where: { id: FOLLOW_UP_JORDAN_ID },
        update: {},
        create: {
          id: FOLLOW_UP_JORDAN_ID,
          tenantId: tenant.id,
          customerId: customer.id,
          title: 'Check in after ring delivery',
          description: 'Confirm fit and ask for a review.',
          dueAt: new Date('2026-07-15T00:00:00.000Z'),
          status: FollowUpStatus.COMPLETED,
          completedAt: new Date('2026-07-16T00:00:00.000Z'),
        },
      });
      await tx.followUpTask.upsert({
        where: { id: FOLLOW_UP_ARJUN_LEAD_ID },
        update: {},
        create: {
          id: FOLLOW_UP_ARJUN_LEAD_ID,
          tenantId: tenant.id,
          leadId: LEAD_QUALIFIED_ID,
          title: 'Send Mehta Logistics the e-commerce proposal',
          dueAt: new Date('2026-08-01T00:00:00.000Z'),
          status: FollowUpStatus.PENDING,
        },
      });

      await tx.customerActivity.upsert({
        where: { id: CUSTOMER_ACTIVITY_JORDAN_FOLLOW_UP_ID },
        update: {},
        create: {
          id: CUSTOMER_ACTIVITY_JORDAN_FOLLOW_UP_ID,
          tenantId: tenant.id,
          type: CustomerActivityType.FOLLOW_UP_COMPLETED,
          summary: `Follow-up "${followUpJordan.title}" completed`,
          customerId: customer.id,
        },
      });

      const CUSTOMER_TAGS = [
        { id: CUSTOMER_TAG_VIP_ID, name: 'VIP', slug: 'vip', color: '#B8860B' },
        { id: CUSTOMER_TAG_WHOLESALE_ID, name: 'Wholesale', slug: 'wholesale', color: '#4B5563' },
      ];
      for (const t of CUSTOMER_TAGS) {
        await tx.customerTag.upsert({
          where: { id: t.id },
          update: {},
          create: { ...t, tenantId: tenant.id },
        });
      }
      await tx.customerTagAssignment.upsert({
        where: {
          tenantId_customerId_customerTagId: {
            tenantId: tenant.id,
            customerId: customer.id,
            customerTagId: CUSTOMER_TAG_VIP_ID,
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          customerId: customer.id,
          customerTagId: CUSTOMER_TAG_VIP_ID,
        },
      });

      // Milestone 10 (Payments & Billing Foundation) — 2 TaxRate rows, 3
      // PaymentMethod rows, and a real Invoice -> Payment -> Allocation
      // chain against the already-seeded Milestone 8 order
      // (ORDER_JORDAN_RING_ID) — created DRAFT, issued, then paid via
      // two payments (one partial, one completing it), demonstrating
      // "Partial payment"/"Multiple payments"/"Mark invoice paid" live
      // in seed data, not just via the smoke test. Done directly via
      // `tx.*` calls, not through InvoiceService/PaymentService — same
      // "no NestJS DI in this standalone script" reasoning the
      // Milestone 8 order block above already gives.
      const TAX_RATES = [
        { id: TAX_RATE_GST18_ID, name: 'GST 18%', rate: '18.00' },
        { id: TAX_RATE_NO_TAX_ID, name: 'No Tax', rate: '0.00' },
      ];
      for (const t of TAX_RATES) {
        await tx.taxRate.upsert({
          where: { id: t.id },
          update: {},
          create: { ...t, tenantId: tenant.id },
        });
      }

      const PAYMENT_METHODS = [
        { id: PAYMENT_METHOD_CASH_ID, name: 'Cash', slug: 'cash' },
        { id: PAYMENT_METHOD_BANK_TRANSFER_ID, name: 'Bank Transfer', slug: 'bank-transfer' },
        { id: PAYMENT_METHOD_CHEQUE_ID, name: 'Cheque', slug: 'cheque' },
      ];
      for (const m of PAYMENT_METHODS) {
        await tx.paymentMethod.upsert({
          where: { id: m.id },
          update: {},
          create: { ...m, tenantId: tenant.id },
        });
      }

      const jordanOrder = await tx.order.findFirst({ where: { id: ORDER_JORDAN_RING_ID } });
      if (jordanOrder) {
        const gst18 = await tx.taxRate.findFirstOrThrow({ where: { id: TAX_RATE_GST18_ID } });
        const invoiceSubtotal = jordanOrder.subtotal;
        const invoiceTax = invoiceSubtotal.mul(gst18.rate).div(100).toDecimalPlaces(2);
        const invoiceTotal = invoiceSubtotal.add(invoiceTax);

        const invoice = await tx.invoice.upsert({
          where: { id: INVOICE_JORDAN_RING_ID },
          update: {},
          create: {
            id: INVOICE_JORDAN_RING_ID,
            tenantId: tenant.id,
            customerId: jordanOrder.customerId,
            orderId: jordanOrder.id,
            taxRateId: gst18.id,
            invoiceNumber: 'INV-2026-00001',
            subtotalAmount: invoiceSubtotal,
            taxAmount: invoiceTax,
            totalAmount: invoiceTotal,
            amountPaid: 0,
            status: InvoiceStatus.DRAFT,
            items: {
              create: [
                {
                  id: INVOICE_ITEM_JORDAN_RING_ID,
                  tenantId: tenant.id,
                  description: 'Solitaire Ring (18k Gold, Size 7) x 2',
                  quantity: 2,
                  unitPrice: invoiceSubtotal.div(2),
                  amount: invoiceSubtotal,
                },
              ],
            },
          },
        });

        // Issue it, then pay it off across two payments (partial, then
        // final) — "Partial payment"/"Multiple payments" both real, live
        // data, not just asserted in a test.
        const issuedInvoice = await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.SENT, issuedDate: new Date('2026-07-18T00:00:00.000Z') },
        });

        const partialAmount = issuedInvoice.totalAmount.mul(0.6).toDecimalPlaces(2);
        const finalAmount = issuedInvoice.totalAmount.sub(partialAmount);

        const existingPartialPayment = await tx.payment.findFirst({
          where: { id: PAYMENT_JORDAN_PARTIAL_ID },
        });
        if (!existingPartialPayment) {
          await tx.payment.create({
            data: {
              id: PAYMENT_JORDAN_PARTIAL_ID,
              tenantId: tenant.id,
              invoiceId: issuedInvoice.id,
              paymentMethodId: PAYMENT_METHOD_BANK_TRANSFER_ID,
              method: 'Bank Transfer',
              reference: 'NEFT-DEMO-0001',
              amount: partialAmount,
              status: PaymentStatus.SUCCEEDED,
            },
          });
          await tx.paymentAllocation.create({
            data: {
              id: PAYMENT_ALLOCATION_JORDAN_PARTIAL_ID,
              tenantId: tenant.id,
              paymentId: PAYMENT_JORDAN_PARTIAL_ID,
              invoiceId: issuedInvoice.id,
              amount: partialAmount,
            },
          });
          await tx.invoice.update({
            where: { id: issuedInvoice.id },
            data: { amountPaid: partialAmount },
          });
        }

        const existingFinalPayment = await tx.payment.findFirst({
          where: { id: PAYMENT_JORDAN_FINAL_ID },
        });
        if (!existingFinalPayment) {
          await tx.payment.create({
            data: {
              id: PAYMENT_JORDAN_FINAL_ID,
              tenantId: tenant.id,
              invoiceId: issuedInvoice.id,
              paymentMethodId: PAYMENT_METHOD_CASH_ID,
              method: 'Cash',
              amount: finalAmount,
              status: PaymentStatus.SUCCEEDED,
            },
          });
          await tx.paymentAllocation.create({
            data: {
              id: PAYMENT_ALLOCATION_JORDAN_FINAL_ID,
              tenantId: tenant.id,
              paymentId: PAYMENT_JORDAN_FINAL_ID,
              invoiceId: issuedInvoice.id,
              amount: finalAmount,
            },
          });
          await tx.invoice.update({
            where: { id: issuedInvoice.id },
            data: { amountPaid: issuedInvoice.totalAmount, status: InvoiceStatus.PAID },
          });
        }
      }

      // Milestone 11 (Admin Platform, Analytics & Notifications) — 3
      // NotificationTemplate rows, 3 DashboardWidget rows (one per real
      // consumer: Orders/Inventory/CRM — matching what
      // `DashboardService.overview()` actually aggregates, not all 5),
      // one SENT and one FAILED sample Notification (the FAILED one is
      // what "Retry placeholder" — `POST /notifications/:id/retry` — has
      // something real to act on), 2 AuditLog entries (one business
      // event, one security event — "Record business events"/"Record
      // security events"), 2 SystemEvent rows (WARNING + ERROR — the
      // ERROR one is what `DashboardService.overview()`'s own
      // `systemErrorCount24h` picks up live, not just in a unit test),
      // and one sample ScheduledReport (demonstrating "Download
      // metadata" against real, generated data). All upserted by literal
      // `id` — safe against `notification_templates`'/`dashboard_widgets`'
      // own partial unique indexes (`WHERE deleted_at IS NULL`), the same
      // "key off the real primary key, not the partial constraint"
      // reasoning `TAX_RATES`/`PAYMENT_METHODS`/`CUSTOMER_TAGS` above
      // already rely on.
      const NOTIFICATION_TEMPLATES = [
        {
          id: NOTIFICATION_TEMPLATE_ORDER_SHIPPED_ID,
          key: 'order.shipped',
          channel: NotificationChannel.EMAIL,
          subject: 'Your order has shipped',
          body: 'Hi {{firstName}}, your Antrique order is on its way.',
        },
        {
          id: NOTIFICATION_TEMPLATE_INVOICE_OVERDUE_ID,
          key: 'invoice.overdue',
          channel: NotificationChannel.EMAIL,
          subject: 'Invoice overdue',
          body: 'Invoice {{invoiceNumber}} is now overdue — please arrange payment.',
        },
        {
          id: NOTIFICATION_TEMPLATE_FOLLOW_UP_DUE_ID,
          key: 'follow_up.due',
          channel: NotificationChannel.IN_APP,
          subject: 'Follow-up due today',
          body: 'You have a follow-up task due today: {{title}}.',
        },
      ];
      for (const t of NOTIFICATION_TEMPLATES) {
        await tx.notificationTemplate.upsert({
          where: { id: t.id },
          update: {},
          create: { ...t, tenantId: tenant.id },
        });
      }

      const DASHBOARD_WIDGETS = [
        {
          id: DASHBOARD_WIDGET_REVENUE_ID,
          key: 'orders.revenue',
          title: 'Revenue',
          type: DashboardWidgetType.KPI,
          sortOrder: 0,
        },
        {
          id: DASHBOARD_WIDGET_LOW_STOCK_ID,
          key: 'inventory.low_stock',
          title: 'Low Stock Items',
          type: DashboardWidgetType.LIST,
          sortOrder: 1,
        },
        {
          id: DASHBOARD_WIDGET_LEAD_CONVERSION_ID,
          key: 'crm.lead_conversion',
          title: 'Lead Conversion Rate',
          type: DashboardWidgetType.KPI,
          sortOrder: 2,
        },
      ];
      for (const w of DASHBOARD_WIDGETS) {
        await tx.dashboardWidget.upsert({
          where: { id: w.id },
          update: {},
          create: { ...w, tenantId: tenant.id },
        });
      }

      if (customerUserForOrder) {
        await tx.notification.upsert({
          where: { id: NOTIFICATION_JORDAN_ORDER_SHIPPED_ID },
          update: {},
          create: {
            id: NOTIFICATION_JORDAN_ORDER_SHIPPED_ID,
            tenantId: tenant.id,
            userId: customerUserForOrder.id,
            type: 'order.shipped',
            channel: NotificationChannel.EMAIL,
            title: 'Your order has shipped',
            body: 'Your Antrique order is on its way.',
            relatedResourceType: 'order',
            relatedResourceId: ORDER_JORDAN_RING_ID,
            status: NotificationStatus.SENT,
            sentAt: new Date('2026-07-19T00:00:00.000Z'),
          },
        });
        await tx.notification.upsert({
          where: { id: NOTIFICATION_JORDAN_PAYMENT_FAILED_ID },
          update: {},
          create: {
            id: NOTIFICATION_JORDAN_PAYMENT_FAILED_ID,
            tenantId: tenant.id,
            userId: customerUserForOrder.id,
            type: 'invoice.paid',
            channel: NotificationChannel.EMAIL,
            title: 'Payment received',
            body: 'We have received your payment — thank you!',
            relatedResourceType: 'invoice',
            relatedResourceId: INVOICE_JORDAN_RING_ID,
            status: NotificationStatus.FAILED,
            failedAt: new Date('2026-07-20T00:00:00.000Z'),
            lastError: 'SMTP timeout after 3 delivery attempts',
            retryCount: 1,
          },
        });
      }

      const adminUserForAudit = await tx.user.findFirst({
        where: { tenantId: tenant.id, email: 'admin@antrique.dev', deletedAt: null },
      });

      await tx.auditLog.upsert({
        where: { id: AUDIT_LOG_ORDER_CREATED_ID },
        update: {},
        create: {
          id: AUDIT_LOG_ORDER_CREATED_ID,
          tenantId: tenant.id,
          actorUserId: customerUserForOrder?.id,
          action: 'order.created',
          resourceType: 'order',
          resourceId: ORDER_JORDAN_RING_ID,
          after: { status: OrderStatus.PENDING },
        },
      });
      await tx.auditLog.upsert({
        where: { id: AUDIT_LOG_LOGIN_FAILED_ID },
        update: {},
        create: {
          id: AUDIT_LOG_LOGIN_FAILED_ID,
          tenantId: tenant.id,
          action: 'auth.login_failed',
          resourceType: 'user',
          resourceId: adminUserForAudit?.id,
          ipAddress: '203.0.113.42',
          userAgent: 'Mozilla/5.0 (seed data)',
        },
      });

      await tx.systemEvent.upsert({
        where: { id: SYSTEM_EVENT_LOW_STOCK_ID },
        update: {},
        create: {
          id: SYSTEM_EVENT_LOW_STOCK_ID,
          tenantId: tenant.id,
          type: 'inventory.low_stock',
          severity: SystemEventSeverity.WARNING,
          source: 'inventory',
          summary: 'Navy Wool fabric fell below its reorder point',
          relatedResourceType: 'inventory_item',
          relatedResourceId: INVENTORY_ITEM_NAVY_WOOL_ID,
        },
      });
      await tx.systemEvent.upsert({
        where: { id: SYSTEM_EVENT_NOTIFICATION_FAILED_ID },
        update: {},
        create: {
          id: SYSTEM_EVENT_NOTIFICATION_FAILED_ID,
          tenantId: tenant.id,
          type: 'notifications.delivery_failed',
          severity: SystemEventSeverity.ERROR,
          source: 'notifications',
          summary: 'Email delivery failed for a payment-confirmation notification',
          relatedResourceType: 'notification',
          relatedResourceId: NOTIFICATION_JORDAN_PAYMENT_FAILED_ID,
        },
      });

      if (jordanOrder) {
        await tx.scheduledReport.upsert({
          where: { id: SCHEDULED_REPORT_SALES_SUMMARY_ID },
          update: {},
          create: {
            id: SCHEDULED_REPORT_SALES_SUMMARY_ID,
            tenantId: tenant.id,
            type: ReportType.SALES_SUMMARY,
            parameters: { dateFrom: null, dateTo: null },
            result: {
              module: 'orders',
              metrics: {
                orderCount: 1,
                revenue: jordanOrder.total.toString(),
                averageOrderValue: jordanOrder.total.toString(),
              },
            },
            generatedByUserId: adminUserForAudit?.id,
          },
        });
      }

      // CLI-script completion summary, not application logging — CONTRIBUTING.md's
      // structured-JSON-logging rule (§15) governs the NestJS app, not one-off
      // scripts a developer runs and reads directly in their own terminal.
      // eslint-disable-next-line no-console
      console.log(
        `Seeded tenant "${tenant.slug}": ${PERMISSIONS.length} permissions, ${ROLES.length} roles, ${TEST_USERS.length} users, ${SETTINGS.length} settings, ${CLIENTS.length} clients, ${LEADS.length + 1} leads, ${PROJECTS.length} projects, ${CATEGORIES.length} categories, ${COLLECTIONS.length} collections, ${PRODUCTS.length} products, ${FABRIC_CATEGORIES.length} fabric categories, ${FABRICS.length} fabrics, 1 measurement profile, 1 product customization, ${STYLE_OPTIONS.length} style options, 1 warehouse, 2 inventory items, 1 supplier, 2 customers, 1 order, ${LEAD_SOURCES.length} lead sources, ${CUSTOMER_NOTES.length} customer notes, 3 customer activities, 2 follow-up tasks, ${CUSTOMER_TAGS.length} customer tags, ${TAX_RATES.length} tax rates, ${PAYMENT_METHODS.length} payment methods, 1 invoice, 2 payments, 2 payment allocations, ${NOTIFICATION_TEMPLATES.length} notification templates, ${DASHBOARD_WIDGETS.length} dashboard widgets, 2 notifications, 2 audit logs, 2 system events, 1 scheduled report.`,
      );
    },
    { timeout: 30_000 },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
