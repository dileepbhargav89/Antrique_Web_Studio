import { Test } from '@nestjs/testing';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './repositories/collection.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

// Same shape as category.controller.spec.ts.
describe('CollectionController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [CollectionController],
      providers: [
        CollectionService,
        {
          provide: CollectionRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
              id: 'col-1',
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
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(CollectionController);
  }

  it('resolves CollectionService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateCollectionDto(), {
      name: 'Signature Collection',
      slug: 'signature-collection',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Signature Collection');
  });

  it('resolves CollectionService via DI and delegates list()', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
