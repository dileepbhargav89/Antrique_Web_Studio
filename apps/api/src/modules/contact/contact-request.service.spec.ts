import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContactRequestService } from './contact-request.service';
import { ContactRequestRepository } from './repositories/contact-request.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { CustomerActivityRepository } from '../crm/repositories/customer-activity.repository';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ConvertContactRequestDto } from './dto/convert-contact-request.dto';
import { ContactRequestStatus, LeadStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createContactRequestRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'contact-request-1',
    tenantId: TENANT_ID,
    name: 'Jordan Rivera',
    email: 'jordan@example.com',
    phone: null,
    company: null,
    message: 'We need a new website for our furniture business.',
    source: 'website_contact_form',
    status: ContactRequestStatus.NEW,
    convertedLeadId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeContactRequestRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: jest.fn(async () => createContactRequestRow()),
    findActiveById: jest.fn(async () => createContactRequestRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    updateInTx: jest.fn(async () =>
      createContactRequestRow({
        status: ContactRequestStatus.CONVERTED,
        convertedLeadId: 'lead-1',
      }),
    ),
    ...overrides,
  } as unknown as ContactRequestRepository;
}

function createFakeLeadRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveByEmail: jest.fn(async () => null),
    createInTx: jest.fn(async () => ({
      id: 'lead-1',
      contactEmail: 'jordan@example.com',
      status: LeadStatus.NEW,
    })),
    ...overrides,
  } as unknown as LeadRepository;
}

function createFakeActivityRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createInTx: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as CustomerActivityRepository;
}

function createFakeJobRunner() {
  return { run: jest.fn(async () => ({ status: 'succeeded' })) } as never;
}

function createFakeLogger() {
  return { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as never;
}

describe('ContactRequestService', () => {
  function createService(
    overrides: {
      contactRequestRepository?: ContactRequestRepository;
      leadRepository?: LeadRepository;
      customerActivityRepository?: CustomerActivityRepository;
    } = {},
  ) {
    return new ContactRequestService(
      overrides.contactRequestRepository ?? createFakeContactRequestRepository(),
      overrides.leadRepository ?? createFakeLeadRepository(),
      overrides.customerActivityRepository ?? createFakeActivityRepository(),
      createFakeJobRunner(),
      { execute: jest.fn() } as never,
      createFakeLogger(),
    );
  }

  describe('create()', () => {
    it('persists a contact request with the default source when none is given', async () => {
      const contactRequestRepository = createFakeContactRequestRepository();
      const service = createService({ contactRequestRepository });
      const dto: CreateContactRequestDto = {
        name: 'Jordan Rivera',
        email: 'jordan@example.com',
        message: 'We need a new website for our furniture business.',
      };

      await service.create(dto, TENANT_ID);

      expect(contactRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'website_contact_form' }),
        }),
      );
    });

    it('respects an explicit source override (e.g. the quote wizard)', async () => {
      const contactRequestRepository = createFakeContactRequestRepository();
      const service = createService({ contactRequestRepository });
      const dto: CreateContactRequestDto = {
        name: 'Jordan Rivera',
        email: 'jordan@example.com',
        message: 'We need a new website for our furniture business.',
        source: 'website_quote_form',
      };

      await service.create(dto, TENANT_ID);

      expect(contactRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'website_quote_form' }),
        }),
      );
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when no active row matches', async () => {
      const service = createService({
        contactRequestRepository: createFakeContactRequestRepository({
          findActiveById: jest.fn(async () => null),
        }),
      });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('convert()', () => {
    it('creates a Lead, logs a LEAD_CREATED activity, and marks the request CONVERTED', async () => {
      const contactRequestRepository = createFakeContactRequestRepository();
      const leadRepository = createFakeLeadRepository();
      const customerActivityRepository = createFakeActivityRepository();
      const service = createService({
        contactRequestRepository,
        leadRepository,
        customerActivityRepository,
      });
      const dto: ConvertContactRequestDto = { note: 'Ready to buy' };

      const result = await service.convert('contact-request-1', dto, TENANT_ID);

      expect(leadRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ contactEmail: 'jordan@example.com', status: LeadStatus.NEW }),
      );
      expect(customerActivityRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ relatedLeadId: 'lead-1' }),
      );
      expect(contactRequestRepository.updateInTx).toHaveBeenCalledWith(
        expect.anything(),
        'contact-request-1',
        expect.objectContaining({
          status: ContactRequestStatus.CONVERTED,
          convertedLeadId: 'lead-1',
        }),
      );
      expect(result.status).toBe(ContactRequestStatus.CONVERTED);
    });

    it('throws ConflictException when an active lead for the email already exists', async () => {
      const service = createService({
        leadRepository: createFakeLeadRepository({
          findActiveByEmail: jest.fn(async () => ({ id: 'existing-lead' })),
        }),
      });

      await expect(service.convert('contact-request-1', {}, TENANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when the request is already converted', async () => {
      const service = createService({
        contactRequestRepository: createFakeContactRequestRepository({
          findActiveById: jest.fn(async () =>
            createContactRequestRow({ status: ContactRequestStatus.CONVERTED }),
          ),
        }),
      });

      await expect(service.convert('contact-request-1', {}, TENANT_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when no active row matches', async () => {
      const service = createService({
        contactRequestRepository: createFakeContactRequestRepository({
          findActiveById: jest.fn(async () => null),
        }),
      });

      await expect(service.convert('missing', {}, TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
