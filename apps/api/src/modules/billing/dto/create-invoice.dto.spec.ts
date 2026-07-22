import { validate } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';

describe('CreateInvoiceDto', () => {
  function makeDto(overrides: Partial<CreateInvoiceDto> = {}): CreateInvoiceDto {
    const dto = new CreateInvoiceDto();
    Object.assign(dto, { orderId: '00000000-0000-7000-8000-000000002601', ...overrides });
    return dto;
  }

  it('passes validation with just the required orderId', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        taxRateId: '00000000-0000-7000-8000-000000003401',
        dueDate: '2026-08-01T00:00:00.000Z',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when orderId is not a UUID', async () => {
    const errors = await validate(makeDto({ orderId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('orderId');
  });

  it('fails validation when taxRateId is not a UUID', async () => {
    const errors = await validate(makeDto({ taxRateId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('taxRateId');
  });

  it('fails validation when dueDate is not a valid ISO date string', async () => {
    const errors = await validate(makeDto({ dueDate: 'not-a-date' }));
    expect(errors.map((e) => e.property)).toContain('dueDate');
  });
});
