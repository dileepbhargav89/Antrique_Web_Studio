import { validate } from 'class-validator';
import { RecordPaymentDto } from './record-payment.dto';

describe('RecordPaymentDto', () => {
  function makeDto(overrides: Partial<RecordPaymentDto> = {}): RecordPaymentDto {
    const dto = new RecordPaymentDto();
    Object.assign(dto, { amount: '100.00', method: 'Cash', ...overrides });
    return dto;
  }

  it('passes validation with amount + method', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with amount + paymentMethodId instead of method', async () => {
    const dto = makeDto({
      method: undefined,
      paymentMethodId: '00000000-0000-7000-8000-000000003501',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        invoiceId: '00000000-0000-7000-8000-000000003601',
        reference: 'NEFT-0001',
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when amount is not a numeric string', async () => {
    const errors = await validate(makeDto({ amount: 'not-a-number' }));
    expect(errors.map((e) => e.property)).toContain('amount');
  });

  it('fails validation when invoiceId is not a UUID', async () => {
    const errors = await validate(makeDto({ invoiceId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('invoiceId');
  });

  it('fails validation when paymentMethodId is not a UUID', async () => {
    const errors = await validate(makeDto({ paymentMethodId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('paymentMethodId');
  });
});
