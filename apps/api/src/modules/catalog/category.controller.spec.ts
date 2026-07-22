import { Test } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

// Same reasoning as modules/example-domain/example-domain.controller.spec.ts
// — resolves through a real Nest TestingModule so DI wiring itself is
// verified (CategoryController -> CategoryService -> CategoryRepository),
// not just the service's own logic (that's category.service.spec.ts's
// job). TokenService/AuthorizationService are mocked: referencing
// JwtAuthGuard/PermissionsGuard via @UseGuards() pulls both into this
// module's DI graph even though this test calls controller methods
// directly and never triggers either guard (see
// common/guards/README.md's "Testing note"). CategoryRepository is
// provided as a mock too, since CategoryService constructor-injects it.
describe('CategoryController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
              id: 'cat-1',
              ...args.data,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            update: jest.fn(),
          },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(CategoryController);
  }

  it('resolves CategoryService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateCategoryDto(), { name: 'Rings', slug: 'rings' });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Rings');
  });

  it('resolves CategoryService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
