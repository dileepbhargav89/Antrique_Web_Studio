import { SupplierRepository } from './supplier.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const supplier = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const supplierProduct = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
  };
  const productVariant = { findFirst: jest.fn(async () => null) };
  const fabric = { findFirst: jest.fn(async () => null) };
  return {
    supplier,
    supplierProduct,
    productVariant,
    fabric,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new SupplierRepository(prisma);
}

describe('SupplierRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows, with supplierProducts included', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('sup-1', TENANT_ID);

      expect(prisma.supplier.findFirst).toHaveBeenCalledWith({
        where: { id: 'sup-1', tenantId: TENANT_ID, deletedAt: null },
        include: { supplierProducts: true },
      });
    });
  });

  describe('replaceSupplierProducts()', () => {
    it('deletes existing products then creates the new set in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.replaceSupplierProducts(TENANT_ID, 'sup-1', [
        { fabricId: 'fab-1', supplierSku: 'SKU-1' },
      ]);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.supplierProduct.deleteMany).toHaveBeenCalledWith({
        where: { supplierId: 'sup-1', tenantId: TENANT_ID },
      });
      expect(prisma.supplierProduct.createMany).toHaveBeenCalledWith({
        data: [
          { fabricId: 'fab-1', supplierSku: 'SKU-1', tenantId: TENANT_ID, supplierId: 'sup-1' },
        ],
      });
    });
  });

  describe('productVariantExistsForTenant() / fabricExistsForTenant()', () => {
    it('return true when a matching row is found, false otherwise', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      expect(await repository.productVariantExistsForTenant('var-1', TENANT_ID)).toBe(false);
      (prisma.productVariant.findFirst as jest.Mock).mockResolvedValue({ id: 'var-1' });
      expect(await repository.productVariantExistsForTenant('var-1', TENANT_ID)).toBe(true);
    });
  });
});
