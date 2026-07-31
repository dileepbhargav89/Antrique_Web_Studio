import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

/**
 * Explicit tenant-isolation test (CONTRIBUTING.md §8: "Tenant isolation explicitly
 * tested") for the actual last-line-of-defense: the Postgres RLS policies from
 * migration `20260717091500_row_level_security` / `20260720190000_add_product_catalog`
 * (`database/tenant-rls-context.service.ts`, `PrismaService`'s `$allOperations` hook).
 *
 * This deliberately does NOT go through Prisma/NestJS — every repository already takes
 * a mandatory `tenantId` parameter (see e.g. `category.repository.ts`'s own comment),
 * so an app-layer-only test would just prove the app remembers to pass it, not that the
 * database itself refuses to leak data if that discipline is ever broken. This connects
 * directly as the real `antrique_app` Postgres role the RLS policies are written
 * `TO` — connecting as the `postgres` superuser (this repo's own local dev
 * `DATABASE_URL`) would silently bypass RLS entirely (Postgres never applies RLS to a
 * role with `BYPASSRLS`, which superusers always have), proving nothing.
 *
 * Requires a real, migrated local Postgres (`pnpm --filter @antrique/api db:migrate:dev`
 * already run) — skips itself if `DATABASE_URL` isn't set, matching this suite's other
 * "no live infra available" fallbacks (see docs/implementation/progress.md's Module
 * 6/11 entries).
 */

const SUPERUSER_URL = process.env.DATABASE_URL;
// Dev-only, never used outside this test — provisioned idempotently below so this spec
// is self-contained (no manual `ALTER ROLE` setup step required in a fresh environment).
const APP_ROLE_PASSWORD = 'antrique_app_test_only_password';

function describeOrSkip(condition: boolean) {
  return condition ? describe : describe.skip;
}

describeOrSkip(!!SUPERUSER_URL)('Tenant isolation (Postgres RLS)', () => {
  let superuser: Client;
  let appClient: Client;
  let tenantAId: string;
  let tenantBId: string;
  let categoryAId: string;
  let categoryBId: string;

  beforeAll(async () => {
    superuser = new Client({ connectionString: SUPERUSER_URL });
    await superuser.connect();

    // Idempotent: the RLS migration creates this LOGIN role but never sets a password
    // (production provisions that out-of-band). Safe to reset every run — dev-only.
    await superuser.query(`ALTER ROLE antrique_app WITH PASSWORD '${APP_ROLE_PASSWORD}'`);

    tenantAId = randomUUID();
    tenantBId = randomUUID();
    categoryAId = randomUUID();
    categoryBId = randomUUID();

    await superuser.query(
      `INSERT INTO tenants (id, name, slug, status, updated_at) VALUES ($1, $2, $3, 'ACTIVE', now())`,
      [tenantAId, 'Module 12 RLS Test Tenant A', `rls-test-a-${tenantAId}`],
    );
    await superuser.query(
      `INSERT INTO tenants (id, name, slug, status, updated_at) VALUES ($1, $2, $3, 'ACTIVE', now())`,
      [tenantBId, 'Module 12 RLS Test Tenant B', `rls-test-b-${tenantBId}`],
    );
    await superuser.query(
      `INSERT INTO categories (id, tenant_id, name, slug, status, updated_at)
       VALUES ($1, $2, 'Tenant A Category', $3, 'ACTIVE', now())`,
      [categoryAId, tenantAId, `tenant-a-cat-${categoryAId}`],
    );
    await superuser.query(
      `INSERT INTO categories (id, tenant_id, name, slug, status, updated_at)
       VALUES ($1, $2, 'Tenant B Category', $3, 'ACTIVE', now())`,
      [categoryBId, tenantBId, `tenant-b-cat-${categoryBId}`],
    );

    const url = new URL(SUPERUSER_URL as string);
    url.username = 'antrique_app';
    url.password = APP_ROLE_PASSWORD;
    appClient = new Client({ connectionString: url.toString() });
    await appClient.connect();
  });

  afterAll(async () => {
    await appClient?.end();
    await superuser.query(`DELETE FROM categories WHERE id IN ($1, $2)`, [
      categoryAId,
      categoryBId,
    ]);
    await superuser.query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [tenantAId, tenantBId]);
    await superuser.end();
  });

  /** Runs `fn` inside a transaction with the RLS session variable set for `tenantId`,
   * then rolls back — every test gets a clean slate regardless of what it writes. */
  async function withTenantContext<T>(tenantId: string | null, fn: () => Promise<T>): Promise<T> {
    await appClient.query('BEGIN');
    try {
      if (tenantId) {
        await appClient.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
      }
      return await fn();
    } finally {
      await appClient.query('ROLLBACK');
    }
  }

  test("a query with no tenant filter at all only ever sees the current tenant's rows", async () => {
    const rows = await withTenantContext(tenantAId, async () => {
      const result = await appClient.query('SELECT id, tenant_id FROM categories');
      return result.rows;
    });

    expect(rows.map((r) => r.id)).toContain(categoryAId);
    expect(rows.map((r) => r.id)).not.toContain(categoryBId);
    expect(rows.every((r) => r.tenant_id === tenantAId)).toBe(true);
  });

  test('switching tenant context switches which rows are visible', async () => {
    const rowsB = await withTenantContext(tenantBId, async () => {
      const result = await appClient.query('SELECT id FROM categories');
      return result.rows;
    });

    expect(rowsB.map((r) => r.id)).toContain(categoryBId);
    expect(rowsB.map((r) => r.id)).not.toContain(categoryAId);
  });

  test("fetching another tenant's row directly by primary key returns nothing (blocks ID-guessing)", async () => {
    const rows = await withTenantContext(tenantAId, async () => {
      const result = await appClient.query('SELECT id FROM categories WHERE id = $1', [
        categoryBId,
      ]);
      return result.rows;
    });

    expect(rows).toHaveLength(0);
  });

  test('with no tenant context set at all, no rows are visible (fails closed, not open)', async () => {
    const rows = await withTenantContext(null, async () => {
      const result = await appClient.query('SELECT id FROM categories WHERE id IN ($1, $2)', [
        categoryAId,
        categoryBId,
      ]);
      return result.rows;
    });

    expect(rows).toHaveLength(0);
  });

  test('inserting a row tagged with a different tenant than the session context is rejected', async () => {
    await expect(
      withTenantContext(tenantAId, () =>
        appClient.query(
          `INSERT INTO categories (id, tenant_id, name, slug, status, updated_at)
           VALUES ($1, $2, 'Cross-tenant write attempt', $3, 'ACTIVE', now())`,
          [randomUUID(), tenantBId, `cross-tenant-${randomUUID()}`],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
