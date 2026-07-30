import { Test } from '@nestjs/testing';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { ClientRepository } from './repositories/client.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { ConvertLeadToClientDto } from './dto/convert-lead-to-client.dto';
import { ArchiveLeadDto } from './dto/archive-lead.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { LeadStatus } from '../../../generated/prisma/enums';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createLeadRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    tenantId: TENANT.tenantId,
    contactName: 'Jordan Rivera',
    contactEmail: 'jordan@example.com',
    organization: null,
    source: 'website',
    leadSourceId: null,
    serviceInterest: [],
    industry: null,
    status: LeadStatus.NEW,
    assigneeId: null,
    convertedClientId: null,
    convertedCustomerId: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Same reasoning as modules/orders/order.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified
// (LeadController -> LeadService -> its four repository deps).
describe('LeadController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [LeadController],
      providers: [
        LeadService,
        {
          provide: LeadRepository,
          useValue: {
            findActiveById: jest.fn(async () => createLeadRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            update: jest.fn(async () => createLeadRow()),
            findActiveByEmail: jest.fn(async () => null),
            runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
            createInTx: jest.fn(async () => createLeadRow()),
            updateInTx: jest.fn(async () => createLeadRow({ status: LeadStatus.CONVERTED })),
            findActiveLeadSourceById: jest.fn(async () => null),
          },
        },
        {
          provide: CustomerRepository,
          useValue: {
            findActiveByEmailInTx: jest.fn(async () => null),
            createWithRelationsInTx: jest.fn(async () => ({ id: 'cust-1' })),
          },
        },
        {
          provide: CustomerActivityRepository,
          useValue: { createInTx: jest.fn(async () => ({})) },
        },
        {
          provide: ClientRepository,
          useValue: { createInTx: jest.fn(async () => ({ id: 'client-1', name: 'Acme Inc' })) },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(LeadController);
  }

  it('resolves LeadService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateLeadDto(), {
      contactName: 'Jordan Rivera',
      contactEmail: 'jordan@example.com',
      source: 'website',
    });

    const result = await controller.create(dto, TENANT);

    expect(result.contactEmail).toBe('jordan@example.com');
  });

  it('resolves LeadService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates convert() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.convert('lead-1', new ConvertLeadDto(), TENANT);

    expect(result.status).toBe(LeadStatus.CONVERTED);
  });

  it('delegates archive() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.archive('lead-1', new ArchiveLeadDto(), TENANT);

    expect(result.id).toBe('lead-1');
  });

  it('delegates convertToClient() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new ConvertLeadToClientDto(), { name: 'Acme Inc' });

    const result = await controller.convertToClient('lead-1', dto, TENANT);

    expect(result.status).toBe(LeadStatus.CONVERTED);
  });
});
