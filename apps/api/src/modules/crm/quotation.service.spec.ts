import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuotationService } from './quotation.service';
import { QuotationRepository } from './repositories/quotation.repository';
import { LeadRepository } from './repositories/lead.repository';
import { ClientRepository } from './repositories/client.repository';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { QuotationStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const LEAD_ID = '00000000-0000-7000-8000-000000000101';

function createPaymentStageRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'stage-1',
    tenantId: TENANT_ID,
    quotationId: 'quotation-1',
    label: 'Advance Payment',
    triggerNote: 'Due on acceptance of this proposal',
    percentage: new Prisma.Decimal('40.00'),
    amount: new Prisma.Decimal('400.00'),
    sortOrder: 0,
    ...overrides,
  };
}

function createQuotationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'quotation-1',
    tenantId: TENANT_ID,
    leadId: LEAD_ID,
    clientId: null,
    quotationNumber: 'Q-2026-00001',
    currency: 'INR',
    subtotalAmount: new Prisma.Decimal('1000.00'),
    taxAmount: new Prisma.Decimal('0.00'),
    discountAmount: new Prisma.Decimal('0.00'),
    totalAmount: new Prisma.Decimal('1000.00'),
    status: QuotationStatus.DRAFT,
    validUntil: null,
    issuedAt: null,
    notes: null,
    pdfUrl: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    items: [
      {
        id: 'item-1',
        description: 'Website build',
        quantity: { toString: () => '1' },
        unitPrice: { toString: () => '1000.00' },
        amount: { toString: () => '1000.00' },
        sortOrder: 0,
      },
    ],
    paymentStages: [
      createPaymentStageRow(),
      createPaymentStageRow({
        id: 'stage-2',
        label: 'Final Payment',
        triggerNote: 'Due prior to final delivery & handover',
        percentage: new Prisma.Decimal('60.00'),
        amount: new Prisma.Decimal('600.00'),
        sortOrder: 1,
      }),
    ],
    ...overrides,
  };
}

function createFakeQuotationRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createQuotationRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    countForTenantAndYear: jest.fn(async () => 0),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    createInTx: jest.fn(async () => createQuotationRow()),
    updateInTx: jest.fn(async () => createQuotationRow()),
    deleteItemsInTx: jest.fn(async () => undefined),
    deletePaymentStagesInTx: jest.fn(async () => undefined),
    update: jest.fn(async () => createQuotationRow()),
    ...overrides,
  } as unknown as QuotationRepository;
}

function createFakeLeadRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({
      id: LEAD_ID,
      contactName: 'Jordan Rivera',
      contactEmail: 'jordan@example.com',
    })),
    ...overrides,
  } as unknown as LeadRepository;
}

function createFakeClientRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    ...overrides,
  } as unknown as ClientRepository;
}

function createFakeQuotationPdfService() {
  return { render: jest.fn(async () => Buffer.from('pdf')) } as never;
}

function createFakeStorageService() {
  return { upload: jest.fn(async () => 'https://storage.example.com/q.pdf') } as never;
}

function createFakeJobRunner() {
  return { run: jest.fn(async () => ({ status: 'succeeded' })) } as never;
}

function createFakeLogger() {
  return { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as never;
}

function createFakeSettingsService() {
  return {
    loadBranding: jest.fn(async () => ({
      companyName: 'Antrique Web Studio',
      tagline: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      phone: null,
      email: null,
      website: null,
      taxId: null,
      bankDetails: null,
      logoUrl: null,
      logoStorageKey: null,
    })),
  } as never;
}

describe('QuotationService', () => {
  function createService(
    overrides: {
      quotationRepository?: QuotationRepository;
      leadRepository?: LeadRepository;
      clientRepository?: ClientRepository;
    } = {},
  ) {
    return new QuotationService(
      overrides.quotationRepository ?? createFakeQuotationRepository(),
      overrides.leadRepository ?? createFakeLeadRepository(),
      overrides.clientRepository ?? createFakeClientRepository(),
      createFakeQuotationPdfService(),
      createFakeSettingsService(),
      createFakeStorageService(),
      createFakeJobRunner(),
      { execute: jest.fn() } as never,
      createFakeLogger(),
    );
  }

  describe('create()', () => {
    it('defaults to the 40/40/20 payment-stage template when none is given', async () => {
      const quotationRepository = createFakeQuotationRepository();
      const service = createService({ quotationRepository });
      const dto: CreateQuotationDto = {
        leadId: LEAD_ID,
        items: [{ description: 'Website build', quantity: 1, unitPrice: 1000 }],
      };

      await service.create(dto, TENANT_ID);

      expect(quotationRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          paymentStages: {
            create: expect.arrayContaining([
              expect.objectContaining({ label: 'Advance Payment', amount: expect.anything() }),
              expect.objectContaining({ label: 'Milestone Payment' }),
              expect.objectContaining({ label: 'Final Payment' }),
            ]),
          },
        }),
      );
    });

    it('computes each stage amount as totalAmount * percentage / 100', async () => {
      const quotationRepository = createFakeQuotationRepository();
      const service = createService({ quotationRepository });
      const dto: CreateQuotationDto = {
        leadId: LEAD_ID,
        items: [{ description: 'Website build', quantity: 1, unitPrice: 1000 }],
        paymentStages: [{ label: 'Full payment', percentage: 100 }],
      };

      await service.create(dto, TENANT_ID);

      const call = (quotationRepository.createInTx as jest.Mock).mock.calls[0][1];
      expect(call.paymentStages.create[0].amount.toString()).toBe('1000');
    });

    it('rejects when payment-stage percentages do not sum to 100', async () => {
      const service = createService();
      const dto: CreateQuotationDto = {
        leadId: LEAD_ID,
        items: [{ description: 'Website build', quantity: 1, unitPrice: 1000 }],
        paymentStages: [
          { label: 'A', percentage: 40 },
          { label: 'B', percentage: 40 },
        ],
      };

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update()', () => {
    it('re-derives existing stage amounts against a new totalAmount when items change', async () => {
      const quotationRepository = createFakeQuotationRepository();
      const service = createService({ quotationRepository });
      const dto: UpdateQuotationDto = {
        items: [{ description: 'Website build v2', quantity: 1, unitPrice: 2000 }],
      };

      await service.update('quotation-1', dto, TENANT_ID);

      const call = (quotationRepository.updateInTx as jest.Mock).mock.calls[0][2];
      expect(call.paymentStages.create[0].amount.toString()).toBe('800');
    });

    it('replaces the stage schedule entirely when paymentStages is given', async () => {
      const quotationRepository = createFakeQuotationRepository();
      const service = createService({ quotationRepository });
      const dto: UpdateQuotationDto = {
        paymentStages: [{ label: 'Full payment', percentage: 100 }],
      };

      await service.update('quotation-1', dto, TENANT_ID);

      expect(quotationRepository.deletePaymentStagesInTx).toHaveBeenCalledWith(
        expect.anything(),
        'quotation-1',
      );
      const call = (quotationRepository.updateInTx as jest.Mock).mock.calls[0][2];
      expect(call.paymentStages.create).toHaveLength(1);
      expect(call.paymentStages.create[0].label).toBe('Full payment');
    });

    it('throws NotFoundException when the quotation does not exist', async () => {
      const quotationRepository = createFakeQuotationRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ quotationRepository });

      await expect(service.update('missing', {}, TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the quotation is not DRAFT', async () => {
      const quotationRepository = createFakeQuotationRepository({
        findActiveById: jest.fn(async () => createQuotationRow({ status: QuotationStatus.SENT })),
      });
      const service = createService({ quotationRepository });

      await expect(service.update('quotation-1', {}, TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
