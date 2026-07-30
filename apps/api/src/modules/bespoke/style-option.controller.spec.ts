import { Test } from '@nestjs/testing';
import { StyleOptionController } from './style-option.controller';
import { StyleOptionService } from './style-option.service';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { CreateStyleOptionDto } from './dto/create-style-option.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('StyleOptionController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [StyleOptionController],
      providers: [
        StyleOptionService,
        {
          provide: StyleOptionRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            findGroupById: jest.fn(async () => ({ id: 'group-1', productCustomizationId: 'pc-1' })),
            setIncompatibilities: jest.fn(),
            findIncompatibilities: jest.fn(async () => []),
            create: jest.fn(async (args: { data: Record<string, unknown> }) => ({
              id: 'so-1',
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

    return moduleRef.get(StyleOptionController);
  }

  it('resolves StyleOptionService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateStyleOptionDto(), {
      styleOptionGroupId: 'group-1',
      name: 'Spread Collar',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Spread Collar');
  });

  it('resolves StyleOptionService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
