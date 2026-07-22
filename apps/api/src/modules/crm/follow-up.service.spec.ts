import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FollowUpService } from './follow-up.service';
import { FollowUpRepository } from './repositories/follow-up.repository';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { CancelFollowUpDto } from './dto/cancel-follow-up.dto';
import { FollowUpStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const FUTURE_DATE = '2099-01-01T00:00:00.000Z';

function createTaskRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'task-1',
    tenantId: TENANT_ID,
    leadId: null,
    customerId: 'cust-1',
    title: 'Call back',
    description: null,
    dueAt: new Date(FUTURE_DATE),
    status: FollowUpStatus.PENDING,
    assigneeId: null,
    completedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeFollowUpRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createTaskRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createTaskRow()),
    update: jest.fn(async () => createTaskRow()),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    updateInTx: jest.fn(async () => createTaskRow({ status: FollowUpStatus.COMPLETED })),
    ...overrides,
  } as unknown as FollowUpRepository;
}

function createFakeActivityRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    createInTx: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as CustomerActivityRepository;
}

function createFakeLeadRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'lead-1' })),
    ...overrides,
  } as unknown as LeadRepository;
}

function createFakeCustomerRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'cust-1' })),
    ...overrides,
  } as unknown as CustomerRepository;
}

describe('FollowUpService', () => {
  function createService(
    overrides: {
      followUpRepository?: FollowUpRepository;
      customerActivityRepository?: CustomerActivityRepository;
      leadRepository?: LeadRepository;
      customerRepository?: CustomerRepository;
    } = {},
  ) {
    return new FollowUpService(
      overrides.followUpRepository ?? createFakeFollowUpRepository(),
      overrides.customerActivityRepository ?? createFakeActivityRepository(),
      overrides.leadRepository ?? createFakeLeadRepository(),
      overrides.customerRepository ?? createFakeCustomerRepository(),
    );
  }

  describe('create()', () => {
    it('creates a follow-up scoped to a customer', async () => {
      const repository = createFakeFollowUpRepository();
      const service = createService({ followUpRepository: repository });
      const dto = Object.assign(new CreateFollowUpDto(), {
        customerId: 'cust-1',
        title: 'Call back',
        dueAt: FUTURE_DATE,
      });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ customerId: 'cust-1', leadId: undefined }),
        }),
      );
    });

    it('rejects when both leadId and customerId are given ("exactly one")', async () => {
      const service = createService();
      const dto = Object.assign(new CreateFollowUpDto(), {
        leadId: 'lead-1',
        customerId: 'cust-1',
        title: 'Call back',
        dueAt: FUTURE_DATE,
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects when neither leadId nor customerId is given', async () => {
      const service = createService();
      const dto = Object.assign(new CreateFollowUpDto(), {
        title: 'Call back',
        dueAt: FUTURE_DATE,
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a dueAt in the past ("Due-date validation")', async () => {
      const service = createService();
      const dto = Object.assign(new CreateFollowUpDto(), {
        customerId: 'cust-1',
        title: 'Call back',
        dueAt: '2020-01-01T00:00:00.000Z',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a leadId that does not resolve within the caller tenant', async () => {
      const leadRepository = createFakeLeadRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ leadRepository });
      const dto = Object.assign(new CreateFollowUpDto(), {
        leadId: 'other-tenant-lead',
        title: 'Call back',
        dueAt: FUTURE_DATE,
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update()', () => {
    it('rejects editing a completed follow-up ("Completed follow-ups cannot be edited")', async () => {
      const repository = createFakeFollowUpRepository({
        findActiveById: jest.fn(async () => createTaskRow({ status: FollowUpStatus.COMPLETED })),
      });
      const service = createService({ followUpRepository: repository });

      await expect(service.update('task-1', new UpdateFollowUpDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the follow-up does not exist', async () => {
      const repository = createFakeFollowUpRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ followUpRepository: repository });

      await expect(service.update('missing', new UpdateFollowUpDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('complete()', () => {
    it('marks the task COMPLETED and records a FOLLOW_UP_COMPLETED activity in the same transaction', async () => {
      const repository = createFakeFollowUpRepository();
      const activityRepository = createFakeActivityRepository();
      const service = createService({
        followUpRepository: repository,
        customerActivityRepository: activityRepository,
      });

      await service.complete('task-1', new CompleteFollowUpDto(), TENANT_ID);

      expect(repository.runInTransaction).toHaveBeenCalledTimes(1);
      expect(repository.updateInTx).toHaveBeenCalledWith(
        expect.anything(),
        'task-1',
        expect.objectContaining({
          status: FollowUpStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      );
      expect(activityRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: 'FOLLOW_UP_COMPLETED', customerId: 'cust-1' }),
      );
    });

    it('rejects completing an already-completed follow-up', async () => {
      const repository = createFakeFollowUpRepository({
        findActiveById: jest.fn(async () => createTaskRow({ status: FollowUpStatus.COMPLETED })),
      });
      const service = createService({ followUpRepository: repository });

      await expect(
        service.complete('task-1', new CompleteFollowUpDto(), TENANT_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel()', () => {
    it('marks the task CANCELLED', async () => {
      const repository = createFakeFollowUpRepository();
      const service = createService({ followUpRepository: repository });

      await service.cancel('task-1', new CancelFollowUpDto(), TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: FollowUpStatus.CANCELLED },
      });
    });

    it('rejects cancelling an already-completed follow-up', async () => {
      const repository = createFakeFollowUpRepository({
        findActiveById: jest.fn(async () => createTaskRow({ status: FollowUpStatus.COMPLETED })),
      });
      const service = createService({ followUpRepository: repository });

      await expect(service.cancel('task-1', new CancelFollowUpDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reopen()', () => {
    it('sets status back to PENDING and clears completedAt', async () => {
      const repository = createFakeFollowUpRepository({
        findActiveById: jest.fn(async () =>
          createTaskRow({ status: FollowUpStatus.COMPLETED, completedAt: new Date() }),
        ),
      });
      const service = createService({ followUpRepository: repository });

      await service.reopen('task-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: FollowUpStatus.PENDING, completedAt: null },
      });
    });

    it('rejects reopening a task that is already pending', async () => {
      const repository = createFakeFollowUpRepository();
      const service = createService({ followUpRepository: repository });

      await expect(service.reopen('task-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeFollowUpRepository();
      const service = createService({ followUpRepository: repository });

      await service.remove('task-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
