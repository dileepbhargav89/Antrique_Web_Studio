import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LeadService } from './lead.service';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ArchiveLeadDto } from './dto/archive-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { LeadStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createLeadRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    tenantId: TENANT_ID,
    contactName: 'Jordan Rivera',
    contactEmail: 'jordan@example.com',
    organization: null,
    source: 'website_contact_form',
    leadSourceId: null,
    serviceInterest: [],
    industry: null,
    status: LeadStatus.NEW,
    assigneeId: null,
    convertedClientId: null,
    convertedCustomerId: null,
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeLeadRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createLeadRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    update: jest.fn(async () => createLeadRow()),
    findActiveByEmail: jest.fn(async () => null),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    updateInTx: jest.fn(async () => createLeadRow({ status: LeadStatus.CONVERTED })),
    createInTx: jest.fn(async () => createLeadRow()),
    findActiveLeadSourceById: jest.fn(async () => null),
    ...overrides,
  } as unknown as LeadRepository;
}

function createFakeCustomerRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveByEmailInTx: jest.fn(async () => null),
    createWithRelationsInTx: jest.fn(async () => ({ id: 'cust-1', email: 'jordan@example.com' })),
    ...overrides,
  } as unknown as CustomerRepository;
}

function createFakeActivityRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createInTx: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as CustomerActivityRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('LeadService', () => {
  function createService(
    overrides: {
      leadRepository?: LeadRepository;
      customerRepository?: CustomerRepository;
      customerActivityRepository?: CustomerActivityRepository;
    } = {},
  ) {
    return new LeadService(
      overrides.leadRepository ?? createFakeLeadRepository(),
      overrides.customerRepository ?? createFakeCustomerRepository(),
      overrides.customerActivityRepository ?? createFakeActivityRepository(),
    );
  }

  describe('create()', () => {
    it('creates a lead and an initial LEAD_CREATED activity within one transaction', async () => {
      const leadRepository = createFakeLeadRepository();
      const activityRepository = createFakeActivityRepository();
      const service = createService({
        leadRepository,
        customerActivityRepository: activityRepository,
      });
      const dto = Object.assign(new CreateLeadDto(), {
        contactName: 'Jordan Rivera',
        contactEmail: 'jordan@example.com',
        source: 'website_contact_form',
      });

      await service.create(dto, TENANT_ID);

      expect(leadRepository.runInTransaction).toHaveBeenCalledTimes(1);
      expect(activityRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: TENANT_ID, type: 'LEAD_CREATED' }),
      );
    });

    it('rejects when neither source nor leadSourceId is provided', async () => {
      const service = createService();
      const dto = Object.assign(new CreateLeadDto(), {
        contactName: 'Jordan Rivera',
        contactEmail: 'jordan@example.com',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a duplicate active lead for the same email ("Prevent duplicate active leads")', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveByEmail: jest.fn(async () => createLeadRow()),
      });
      const service = createService({ leadRepository });
      const dto = Object.assign(new CreateLeadDto(), {
        contactName: 'Jordan Rivera',
        contactEmail: 'jordan@example.com',
        source: 'referral',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });

    it('resolves the legacy source string from leadSourceId when given', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveLeadSourceById: jest.fn(async () => ({ id: 'src-1', name: 'Trade Show' })),
      });
      const service = createService({ leadRepository });
      const dto = Object.assign(new CreateLeadDto(), {
        contactName: 'Jordan Rivera',
        contactEmail: 'jordan@example.com',
        leadSourceId: 'src-1',
      });

      await service.create(dto, TENANT_ID);

      expect(leadRepository.findActiveLeadSourceById).toHaveBeenCalledWith('src-1', TENANT_ID);
    });

    it('rejects a leadSourceId that does not resolve within the caller tenant', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveLeadSourceById: jest.fn(async () => null),
      });
      const service = createService({ leadRepository });
      const dto = Object.assign(new CreateLeadDto(), {
        contactName: 'Jordan Rivera',
        contactEmail: 'jordan@example.com',
        leadSourceId: 'bad-source',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ leadRepository });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when the lead does not exist', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ leadRepository });

      await expect(service.update('missing', new UpdateLeadDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects mutation of an archived lead ("Archived leads immutable")', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => createLeadRow({ status: LeadStatus.ARCHIVED })),
      });
      const service = createService({ leadRepository });

      await expect(service.update('lead-1', new UpdateLeadDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(leadRepository.update).not.toHaveBeenCalled();
    });

    it('rejects mutation of a converted lead', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => createLeadRow({ status: LeadStatus.CONVERTED })),
      });
      const service = createService({ leadRepository });

      await expect(service.update('lead-1', new UpdateLeadDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('re-runs the duplicate-active-lead check only when contactEmail actually changes', async () => {
      const leadRepository = createFakeLeadRepository();
      const service = createService({ leadRepository });

      await service.update('lead-1', new UpdateLeadDto(), TENANT_ID);
      expect(leadRepository.findActiveByEmail).not.toHaveBeenCalled();

      await service.update(
        'lead-1',
        Object.assign(new UpdateLeadDto(), { contactEmail: 'new@example.com' }),
        TENANT_ID,
      );
      expect(leadRepository.findActiveByEmail).toHaveBeenCalledWith(
        'new@example.com',
        TENANT_ID,
        'lead-1',
      );
    });
  });

  describe('archive()', () => {
    it('sets status to ARCHIVED', async () => {
      const leadRepository = createFakeLeadRepository();
      const service = createService({ leadRepository });

      await service.archive('lead-1', new ArchiveLeadDto(), TENANT_ID);

      expect(leadRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-1' },
          data: expect.objectContaining({ status: LeadStatus.ARCHIVED }),
        }),
      );
    });

    it('rejects archiving an already-archived lead', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => createLeadRow({ status: LeadStatus.ARCHIVED })),
      });
      const service = createService({ leadRepository });

      await expect(service.archive('lead-1', new ArchiveLeadDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when the lead does not exist', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ leadRepository });

      await expect(service.archive('missing', new ArchiveLeadDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('convert()', () => {
    it('creates a new Customer when none exists for the lead email, links it, and records LEAD_CONVERTED', async () => {
      const leadRepository = createFakeLeadRepository();
      const customerRepository = createFakeCustomerRepository();
      const activityRepository = createFakeActivityRepository();
      const service = createService({
        leadRepository,
        customerRepository,
        customerActivityRepository: activityRepository,
      });

      await service.convert('lead-1', new ConvertLeadDto(), TENANT_ID);

      expect(customerRepository.findActiveByEmailInTx).toHaveBeenCalledWith(
        expect.anything(),
        'jordan@example.com',
        TENANT_ID,
      );
      expect(customerRepository.createWithRelationsInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: TENANT_ID, email: 'jordan@example.com' }),
      );
      expect(leadRepository.updateInTx).toHaveBeenCalledWith(
        expect.anything(),
        'lead-1',
        expect.objectContaining({ status: LeadStatus.CONVERTED, convertedCustomerId: 'cust-1' }),
      );
      expect(activityRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'LEAD_CONVERTED',
          customerId: 'cust-1',
          relatedLeadId: 'lead-1',
        }),
      );
    });

    it('links to an existing Customer with a matching email instead of creating a duplicate', async () => {
      const customerRepository = createFakeCustomerRepository({
        findActiveByEmailInTx: jest.fn(async () => ({
          id: 'existing-cust',
          email: 'jordan@example.com',
        })),
      });
      const leadRepository = createFakeLeadRepository();
      const service = createService({ leadRepository, customerRepository });

      await service.convert('lead-1', new ConvertLeadDto(), TENANT_ID);

      expect(customerRepository.createWithRelationsInTx).not.toHaveBeenCalled();
      expect(leadRepository.updateInTx).toHaveBeenCalledWith(
        expect.anything(),
        'lead-1',
        expect.objectContaining({ convertedCustomerId: 'existing-cust' }),
      );
    });

    it('translates a unique-constraint violation on customer creation into ConflictException', async () => {
      const customerRepository = createFakeCustomerRepository({
        createWithRelationsInTx: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = createService({ customerRepository });

      await expect(service.convert('lead-1', new ConvertLeadDto(), TENANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects converting an already-converted lead', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => createLeadRow({ status: LeadStatus.CONVERTED })),
      });
      const service = createService({ leadRepository });

      await expect(service.convert('lead-1', new ConvertLeadDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when the lead does not exist', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ leadRepository });

      await expect(service.convert('missing', new ConvertLeadDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
