import { validate } from 'class-validator';
import { CreateWarehouseDto } from './create-warehouse.dto';

describe('CreateWarehouseDto', () => {
  function makeDto(overrides: Partial<CreateWarehouseDto> = {}): CreateWarehouseDto {
    const dto = new CreateWarehouseDto();
    Object.assign(dto, { name: 'Main Warehouse', slug: 'main-warehouse', ...overrides });
    return dto;
  }

  it('passes validation with just the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        addressLine1: '1 Dock Rd',
        city: 'Newark',
        region: 'NJ',
        postalCode: '07102',
        country: 'USA',
        status: 'ACTIVE' as never,
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when slug has uppercase letters or spaces', async () => {
    const errors = await validate(makeDto({ slug: 'Not A Slug' }));
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('fails validation when name is empty', async () => {
    const errors = await validate(makeDto({ name: '' }));
    expect(errors.map((e) => e.property)).toContain('name');
  });
});
