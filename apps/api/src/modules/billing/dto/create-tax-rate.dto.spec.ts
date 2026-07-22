import { validate } from 'class-validator';
import { CreateTaxRateDto } from './create-tax-rate.dto';

describe('CreateTaxRateDto', () => {
  function makeDto(overrides: Partial<CreateTaxRateDto> = {}): CreateTaxRateDto {
    const dto = new CreateTaxRateDto();
    Object.assign(dto, { name: 'GST 18%', rate: '18.00', ...overrides });
    return dto;
  }

  it('passes validation with the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with isActive set', async () => {
    const errors = await validate(makeDto({ isActive: false }));
    expect(errors).toHaveLength(0);
  });

  it('fails validation when rate is not a numeric string', async () => {
    const errors = await validate(makeDto({ rate: 'not-a-number' }));
    expect(errors.map((e) => e.property)).toContain('rate');
  });

  it('fails validation when name is empty', async () => {
    const errors = await validate(makeDto({ name: '' }));
    expect(errors.map((e) => e.property)).toContain('name');
  });
});
