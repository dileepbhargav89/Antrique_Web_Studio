import { validate } from 'class-validator';
import { CreateSupplierDto } from './create-supplier.dto';
import { CreateSupplierProductDto } from './create-supplier-product.dto';

describe('CreateSupplierDto', () => {
  function makeDto(overrides: Partial<CreateSupplierDto> = {}): CreateSupplierDto {
    const dto = new CreateSupplierDto();
    Object.assign(dto, { name: 'Millbrook Textiles', slug: 'millbrook-textiles', ...overrides });
    return dto;
  }

  it('passes validation with just the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with contact fields and nested products set', async () => {
    const product = Object.assign(new CreateSupplierProductDto(), {
      fabricId: '00000000-0000-7000-8000-000000000002',
      supplierSku: 'MB-1',
    });
    const errors = await validate(
      makeDto({
        contactName: 'Dana',
        contactEmail: 'dana@example.com',
        contactPhone: '555-0100',
        products: [product],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when contactEmail is not a valid email', async () => {
    const errors = await validate(makeDto({ contactEmail: 'not-an-email' }));
    expect(errors.map((e) => e.property)).toContain('contactEmail');
  });

  it('fails validation when a nested product has an invalid leadTimeDays', async () => {
    const badProduct = Object.assign(new CreateSupplierProductDto(), {
      fabricId: '00000000-0000-7000-8000-000000000002',
      leadTimeDays: -1,
    });
    const errors = await validate(makeDto({ products: [badProduct] }));
    expect(errors.map((e) => e.property)).toContain('products');
  });
});
