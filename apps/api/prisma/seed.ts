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
import { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  ClientStatus,
  LeadStatus,
  ProjectStatus,
  TenantStatus,
  UserStatus,
} from '../generated/prisma/enums';

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
];

const ROLES: Array<{ key: string; name: string; description: string; permissionKeys: string[] }> = [
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Full access — internal Antrique staff running the platform.',
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

      // Not tx.user.upsert() — same partial-unique-index limitation as Role
      // above (`users_tenant_id_email_key` is WHERE deleted_at IS NULL AND
      // keyed on LOWER(email), so the lookup below matches it case-insensitively).
      const existingAdminUser = await tx.user.findFirst({
        where: {
          tenantId: tenant.id,
          email: { equals: 'admin@antrique.dev', mode: 'insensitive' },
          deletedAt: null,
        },
      });
      const adminUser =
        existingAdminUser ??
        (await tx.user.create({
          data: {
            tenantId: tenant.id,
            // Placeholder external-IdP subject — real auth integration is a
            // separate, later Sprint 1 task (see docs/implementation/progress.md
            // "Next 3 tasks"); this is a seed/dev-only stand-in, not a real IdP link.
            idpSubject: 'seed|admin@antrique.dev',
            email: 'admin@antrique.dev',
            firstName: 'Antrique',
            lastName: 'Admin',
            status: UserStatus.ACTIVE,
          },
        }));

      const adminRoleId = roleIdByKey.get('admin')!;
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: adminUser.id, roleId: adminRoleId } },
        update: {},
        create: { tenantId: tenant.id, userId: adminUser.id, roleId: adminRoleId },
      });

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

      // CLI-script completion summary, not application logging — CONTRIBUTING.md's
      // structured-JSON-logging rule (§15) governs the NestJS app, not one-off
      // scripts a developer runs and reads directly in their own terminal.
      // eslint-disable-next-line no-console
      console.log(
        `Seeded tenant "${tenant.slug}": ${PERMISSIONS.length} permissions, ${ROLES.length} roles, 1 admin user, ${SETTINGS.length} settings, ${CLIENTS.length} clients, ${LEADS.length} leads, ${PROJECTS.length} projects.`,
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
