import { validate } from 'class-validator';
import { CreateProductVariantDto } from './create-product-variant.dto';

describe('CreateProductVariantDto', () => {
  function makeDto(overrides: Partial<CreateProductVariantDto> = {}): CreateProductVariantDto {
    const dto = new CreateProductVariantDto();
    Object.assign(dto, { sku: 'RING-SOL-6', price: 249, ...overrides });
    return dto;
  }

  it('passes validation with just sku + price', async () => {
    expect(await validate(makeDto())).toHaveLength(0);
  });

  it('fails validation when price is negative', async () => {
    const errors = await validate(makeDto({ price: -1 }));
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('fails validation when price has more than 2 decimal places', async () => {
    const errors = await validate(makeDto({ price: 1.999 }));
    expect(errors.map((e) => e.property)).toContain('price');
  });

  it('fails validation when sku is empty', async () => {
    const errors = await validate(makeDto({ sku: '' }));
    expect(errors.map((e) => e.property)).toContain('sku');
  });
});
