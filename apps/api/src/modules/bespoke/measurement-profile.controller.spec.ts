import { Test } from '@nestjs/testing';
import { MeasurementProfileController } from './measurement-profile.controller';
import { MeasurementService } from './measurement.service';
import { MeasurementRepository } from './repositories/measurement.repository';
import { CreateMeasurementProfileDto } from './dto/create-measurement-profile.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

describe('MeasurementProfileController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [MeasurementProfileController],
      providers: [
        MeasurementService,
        {
          provide: MeasurementRepository,
          useValue: {
            findActiveById: jest.fn(),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            createWithRelations: jest.fn(async (args: Record<string, unknown>) => ({
              id: 'mp-1',
              ...args,
              measurements: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            update: jest.fn(),
            userBelongsToTenant: jest.fn(async () => true),
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

    return moduleRef.get(MeasurementProfileController);
  }

  it('resolves MeasurementService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateMeasurementProfileDto(), { name: 'Default Measurements' });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Default Measurements');
  });

  it('resolves MeasurementService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });
});
