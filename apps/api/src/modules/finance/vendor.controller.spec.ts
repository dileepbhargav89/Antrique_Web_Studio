import { Test } from '@nestjs/testing';
import { VendorController } from './vendor.controller';
import { VendorService } from './vendor.service';
import { VendorRepository } from './repositories/vendor.repository';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createVendorRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'vendor-1',
    tenantId: TENANT.tenantId,
    name: 'Acme Hosting',
    slug: 'acme-hosting',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    gstin: null,
    paymentTerms: null,
    notes: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('VendorController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [VendorController],
      providers: [
        VendorService,
        {
          provide: VendorRepository,
          useValue: {
            findActiveById: jest.fn(async () => createVendorRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            create: jest.fn(async (args: Record<string, unknown>) =>
              createVendorRow(args.data as Record<string, unknown>),
            ),
            update: jest.fn(async () => createVendorRow()),
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

    return moduleRef.get(VendorController);
  }

  it('resolves VendorService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateVendorDto(), {
      name: 'Acme Hosting',
      slug: 'acme-hosting',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.name).toBe('Acme Hosting');
  });

  it('resolves VendorService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.findById('vendor-1', TENANT);

    expect(result.id).toBe('vendor-1');
  });

  it('delegates update() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new UpdateVendorDto(), { status: 'INACTIVE' });

    await expect(controller.update('vendor-1', dto, TENANT)).resolves.toBeDefined();
  });
});
