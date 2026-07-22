import { validate } from 'class-validator';
import { OrderListQueryDto } from './order-list-query.dto';

describe('OrderListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new OrderListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new OrderListQueryDto(), {
      customerId: '00000000-0000-7000-8000-000000001001',
      status: 'CONFIRMED',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      search: 'jordan',
      sortBy: 'total',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new OrderListQueryDto(), { sortBy: 'customerId' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a valid OrderStatus', async () => {
    const dto = Object.assign(new OrderListQueryDto(), { status: 'SHIPPED' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it('fails validation when dateFrom is not a valid ISO date string', async () => {
    const dto = Object.assign(new OrderListQueryDto(), { dateFrom: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('dateFrom');
  });

  it('fails validation when customerId is not a UUID', async () => {
    const dto = Object.assign(new OrderListQueryDto(), { customerId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('customerId');
  });
});
