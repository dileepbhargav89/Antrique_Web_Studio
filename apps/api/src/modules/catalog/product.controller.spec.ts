import { Test } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

// Same shape as category.controller.spec.ts — ProductService additionally
// injects CategoryRepository/CollectionRepository (for cross-tenant
// reference validation, see product.service.ts), both mocked here too.
describe('ProductController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            createWithRelations: jest.fn(async (data: Record<string, unknown>) => ({
              id: 'prod-1',
              ...data,
              variants: [],
              images: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            updateWithRelations: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: CategoryRepository, useValue: { findActiveById: jest.fn() } },
        { provide: CollectionRepository, useValue: { findActiveById: jest.fn() } },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(ProductController);
  }

  it('resolves ProductService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateProductDto(), {
      name: 'Solitaire Ring',
      slug: 'solitaire-ring',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Solitaire Ring');
  });

  it('resolves ProductService via DI and delegates list()', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
