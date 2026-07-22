import { ProductCustomizationRepository } from './product-customization.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

const DEEP_INCLUDE = {
  styleOptionGroups: {
    orderBy: { sortOrder: 'asc' },
    include: { styleOptions: { orderBy: { sortOrder: 'asc' } } },
  },
  pricingAdjustments: true,
  monogramOptions: true,
};

function createFakePrisma() {
  const productCustomization = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const pricingAdjustment = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
  };
  const monogramOption = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
  };
  return {
    productCustomization,
    pricingAdjustment,
    monogramOption,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new ProductCustomizationRepository(prisma);
}

describe('ProductCustomizationRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId with the full nested include', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('pc-1', TENANT_ID);

      expect(prisma.productCustomization.findFirst).toHaveBeenCalledWith({
        where: { id: 'pc-1', tenantId: TENANT_ID, deletedAt: null },
        include: DEEP_INCLUDE,
      });
    });
  });

  describe('findActiveByProductId()', () => {
    it('queries findFirst() by productId, scoped to tenantId', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByProductId('prod-1', TENANT_ID);

      expect(prisma.productCustomization.findFirst).toHaveBeenCalledWith({
        where: { productId: 'prod-1', tenantId: TENANT_ID, deletedAt: null },
        include: DEEP_INCLUDE,
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('includes the full nested shape on list rows too, not a lighter summary', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(TENANT_ID, {}, { createdAt: 'desc' } as never, 0, 20);

      expect(prisma.productCustomization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: DEEP_INCLUDE }),
      );
    });
  });

  describe('replacePricingAdjustments()', () => {
    it('deletes existing adjustments then creates the new set in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.replacePricingAdjustments(TENANT_ID, 'pc-1', [
        { label: 'Fee', adjustmentType: 'FLAT' as never, amount: '5.00', isActive: true },
      ]);

      expect(prisma.pricingAdjustment.deleteMany).toHaveBeenCalledWith({
        where: { productCustomizationId: 'pc-1', tenantId: TENANT_ID },
      });
      expect(prisma.pricingAdjustment.createMany).toHaveBeenCalledWith({
        data: [
          {
            label: 'Fee',
            adjustmentType: 'FLAT',
            amount: '5.00',
            isActive: true,
            tenantId: TENANT_ID,
            productCustomizationId: 'pc-1',
          },
        ],
      });
    });
  });

  describe('replaceMonogramOptions()', () => {
    it('deletes existing options then creates the new set in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.replaceMonogramOptions(TENANT_ID, 'pc-1', [
        { label: 'Chest', maxCharacters: 3, priceAdjustment: '0', isActive: true },
      ]);

      expect(prisma.monogramOption.deleteMany).toHaveBeenCalledWith({
        where: { productCustomizationId: 'pc-1', tenantId: TENANT_ID },
      });
      expect(prisma.monogramOption.createMany).toHaveBeenCalledWith({
        data: [
          {
            label: 'Chest',
            maxCharacters: 3,
            priceAdjustment: '0',
            isActive: true,
            tenantId: TENANT_ID,
            productCustomizationId: 'pc-1',
          },
        ],
      });
    });
  });
});
