/**
 * Path constants only — route groups `(marketing)`/`(portal)`/`(auth)`
 * don't add a URL segment, so these are the real resolved paths. Add an
 * entry here alongside creating each real page, never before.
 */
export const ROUTES = {
  marketing: {
    home: '/',
    about: '/about',
    aboutProcess: '/about/process',
    blog: '/blog',
    contact: '/contact',
    faq: '/faq',
    industries: '/industries',
    pricing: '/pricing',
    privacy: '/privacy',
    quote: '/quote',
    resources: '/resources',
    services: '/services',
    terms: '/terms',
    work: '/work',
  },
  portal: {
    /** Portal landing page — a simple welcome + links into the seven real business
     * modules below, not a duplicate of `admin`'s KPI dashboard. */
    dashboard: '/dashboard',
    catalog: '/catalog',
    orders: '/orders',
    inventory: '/inventory',
    inventoryTransactions: '/inventory/transactions',
    inventoryWarehouses: '/inventory/warehouses',
    inventorySuppliers: '/inventory/suppliers',
    crmLeads: '/crm/leads',
    /** The contact-form/quote-wizard inbox — triage a submission into a real Lead via
     * `POST /contact-requests/:id/convert`. */
    crmContactRequests: '/crm/contact-requests',
    crmFollowUps: '/crm/follow-ups',
    /** No standalone list — reached from a Lead's `convertedCustomerId` or an Order's
     * `customerId`. Build as `${crmCustomers}/${id}`. */
    crmCustomers: '/crm/customers',
    /** Phase 7 — the agency's customer-organization profile (distinct from
     * `crmCustomers`'s e-commerce end-buyer entity). Has a real standalone list, unlike
     * Customer. */
    crmClients: '/crm/clients',
    /** Phase 7 (Project/Task/Milestone) — the delivery workspace: milestones, tasks, files,
     * and activity all live on a project's own detail page (`${projects}/${id}`), not as
     * separate top-level nav items. */
    projects: '/projects',
    /** Phase 7, Phase 2 — "Proposal Management," built on the existing Quotation model. */
    crmQuotations: '/crm/quotations',
    crmQuotationsNew: '/crm/quotations/new',
    billingInvoices: '/billing/invoices',
    billingPayments: '/billing/payments',
    /** Phase 9, Module 1, Step 1 (Enterprise Operations Suite — Finance) — who the
     * agency pays for goods/services, distinct from `inventorySuppliers` (product
     * sourcing). Only sub-page so far; Steps 2-7 add siblings under `/finance/*`. */
    financeVendors: '/finance/vendors',
    admin: '/admin',
    adminNotifications: '/admin/notifications',
    adminAuditLogs: '/admin/audit-logs',
    adminReports: '/admin/reports',
    /** Reached from a product's detail page, not its own nav item — Bespoke has no
     * standalone submission entity (see docs/implementation/decisions.md). Build as
     * `${bespokeCustomize}/${productId}`. */
    bespokeCustomize: '/bespoke/customize',
  },
  auth: {
    login: '/login',
    // No signup/forgotPassword — the real backend has no registration or
    // password-reset endpoints (see apps/api/src/modules/auth/README.md's
    // own "No registration, no password reset" scope note, a deliberate,
    // indefinite backend limitation, not a near-term TODO). Add entries
    // here only once a real page AND a real backend capability both exist
    // — matching this file's own convention below.
  },
} as const;
