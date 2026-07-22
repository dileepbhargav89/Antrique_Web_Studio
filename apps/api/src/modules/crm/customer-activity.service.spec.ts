import { BadRequestException } from '@nestjs/common';
import { CustomerActivityService } from './customer-activity.service';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CustomerActivityTimelineQueryDto } from './dto/customer-activity-timeline-query.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakeActivityRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findTimelineForCustomer: jest.fn(async () => []),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    ...overrides,
  } as unknown as CustomerActivityRepository;
}

function createFakeCustomerRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'cust-1' })),
    ...overrides,
  } as unknown as CustomerRepository;
}

describe('CustomerActivityService', () => {
  describe('timeline()', () => {
    it('validates the customer belongs to the caller tenant before querying the timeline', async () => {
      const activityRepository = createFakeActivityRepository();
      const customerRepository = createFakeCustomerRepository();
      const service = new CustomerActivityService(activityRepository, customerRepository);
      const query = Object.assign(new CustomerActivityTimelineQueryDto(), { customerId: 'cust-1' });

      await service.timeline(query, TENANT_ID);

      expect(customerRepository.findActiveById).toHaveBeenCalledWith('cust-1', TENANT_ID);
      expect(activityRepository.findTimelineForCustomer).toHaveBeenCalledWith('cust-1', TENANT_ID);
    });

    it('rejects a customerId that does not resolve within the caller tenant', async () => {
      const customerRepository = createFakeCustomerRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = new CustomerActivityService(
        createFakeActivityRepository(),
        customerRepository,
      );
      const query = Object.assign(new CustomerActivityTimelineQueryDto(), {
        customerId: 'other-tenant-cust',
      });

      await expect(service.timeline(query, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('list()', () => {
    it('paginates through the repository with the resolved tenantId', async () => {
      const activityRepository = createFakeActivityRepository();
      const service = new CustomerActivityService(
        activityRepository,
        createFakeCustomerRepository(),
      );

      const result = await service.list({ page: 1, limit: 20 } as never, TENANT_ID);

      expect(result.items).toEqual([]);
      expect(activityRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(Object),
        expect.any(Object),
        0,
        20,
      );
    });

    it('filters by relatedLeadId when leadId is given ("LEAD_CREATED" activities have no customerId to filter by instead)', async () => {
      const activityRepository = createFakeActivityRepository();
      const service = new CustomerActivityService(
        activityRepository,
        createFakeCustomerRepository(),
      );

      await service.list({ leadId: 'lead-1', page: 1, limit: 20 } as never, TENANT_ID);

      expect(activityRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ relatedLeadId: 'lead-1' }),
        expect.any(Object),
        0,
        20,
      );
    });
  });
});
