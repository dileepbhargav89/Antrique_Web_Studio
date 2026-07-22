import { ProductRepository } from './product.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const product = {
    findUnique: jest.fn(async () => null),
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    delete: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const productVariant = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
  };
  return {
    product,
    productVariant,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new ProductRepository(prisma);
}

describe('ProductRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to the given tenantId, including ordered variants/images', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('prod-1', TENANT_ID);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'prod-1', tenantId: TENANT_ID, deletedAt: null },
        include: {
          variants: { orderBy: { sortOrder: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  });

  describe('createWithRelations()', () => {
    it('delegates to prisma.product.create() with the same data plus the relations include', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const data = { tenantId: TENANT_ID, name: 'Ring', slug: 'ring' } as never;

      await repository.createWithRelations(data);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data,
        include: {
          variants: { orderBy: { sortOrder: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  });

  describe('updateWithRelations()', () => {
    it('delegates to prisma.product.update() scoped by id plus the relations include', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const data = { name: 'Renamed' } as never;

      await repository.updateWithRelations('prod-1', data);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data,
        include: {
          variants: { orderBy: { sortOrder: 'asc' } },
          images: { orderBy: { sortOrder: 'asc' } },
        },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause without including variants/images', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'PUBLISHED' } as never,
        { sortOrder: 'asc' } as never,
        0,
        20,
      );

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        skip: 0,
        take: 20,
      });
    });

    it('returns { items, total } from the transaction results', async () => {
      const prisma = createFakePrisma();
      (prisma.product.findMany as jest.Mock).mockResolvedValue([{ id: 'prod-1' }]);
      (prisma.product.count as jest.Mock).mockResolvedValue(1);
      const repository = createRepository(prisma);

      const result = await repository.findManyPaginated(TENANT_ID, {}, {}, 0, 20);

      expect(result).toEqual({ items: [{ id: 'prod-1' }], total: 1 });
    });
  });

  // Milestone 12 (Performance Engineering) — the batched counterpart to
  // findVariantById(), added so OrderService.create()/InvoiceService.
  // createFromOrder() can resolve every order line's own variant in one
  // query instead of one query per line (see each service's own updated
  // comment).
  describe('findVariantsByIds()', () => {
    it('queries productVariant.findMany() with an { id: { in } } filter scoped to tenantId', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findVariantsByIds(['var-1', 'var-2'], TENANT_ID);

      expect(prisma.productVariant.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['var-1', 'var-2'] }, tenantId: TENANT_ID },
      });
    });

    it('short-circuits to an empty array without querying when ids is empty', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.findVariantsByIds([], TENANT_ID);

      expect(result).toEqual([]);
      expect(prisma.productVariant.findMany).not.toHaveBeenCalled();
    });
  });

  // Milestone 12 (Performance Engineering) — a lightweight, batched
  // existence check for cross-module tenant-ownership validation (e.g.
  // FabricService.assertProductsBelongToTenant()), replacing one
  // full-detail findActiveById() per id with one minimal-projection
  // findMany() covering every id at once.
  describe('findExistingIds()', () => {
    it('queries product.findMany() with a minimal id-only select, scoped to tenant and non-deleted', async () => {
      const prisma = createFakePrisma();
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'prod-1' },
        { id: 'prod-2' },
      ]);
      const repository = createRepository(prisma);

      const result = await repository.findExistingIds(['prod-1', 'prod-2', 'missing'], TENANT_ID);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['prod-1', 'prod-2', 'missing'] },
          tenantId: TENANT_ID,
          deletedAt: null,
        },
        select: { id: true },
      });
      expect(result).toEqual(new Set(['prod-1', 'prod-2']));
    });

    it('short-circuits to an empty Set without querying when ids is empty', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.findExistingIds([], TENANT_ID);

      expect(result).toEqual(new Set());
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });
});
