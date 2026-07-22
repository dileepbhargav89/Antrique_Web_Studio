import { validate } from 'class-validator';
import { AllocatePaymentDto } from './allocate-payment.dto';

describe('AllocatePaymentDto', () => {
  function makeDto(overrides: Partial<AllocatePaymentDto> = {}): AllocatePaymentDto {
    const dto = new AllocatePaymentDto();
    Object.assign(dto, {
      invoiceId: '00000000-0000-7000-8000-000000003601',
      amount: '50.00',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with both required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('fails validation when invoiceId is not a UUID', async () => {
    const errors = await validate(makeDto({ invoiceId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('invoiceId');
  });

  it('fails validation when amount is not a numeric string', async () => {
    const errors = await validate(makeDto({ amount: 'not-a-number' }));
    expect(errors.map((e) => e.property)).toContain('amount');
  });

  it('fails validation when amount is missing', async () => {
    const dto = new AllocatePaymentDto();
    Object.assign(dto, { invoiceId: '00000000-0000-7000-8000-000000003601' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('amount');
  });
});
