import { validate } from 'class-validator';
import { InvoiceListQueryDto } from './invoice-list-query.dto';

describe('InvoiceListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new InvoiceListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new InvoiceListQueryDto(), {
      status: 'SENT',
      customerId: '00000000-0000-7000-8000-000000002301',
      orderId: '00000000-0000-7000-8000-000000002601',
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-12-31T23:59:59.000Z',
      search: 'INV-2026',
      sortBy: 'totalAmount',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new InvoiceListQueryDto(), { sortBy: 'customerId' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a valid InvoiceStatus', async () => {
    const dto = Object.assign(new InvoiceListQueryDto(), { status: 'ARCHIVED' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });

  it('fails validation when customerId is not a UUID', async () => {
    const dto = Object.assign(new InvoiceListQueryDto(), { customerId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('customerId');
  });
});
