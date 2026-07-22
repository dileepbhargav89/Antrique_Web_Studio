import { validate } from 'class-validator';
import { ProductCustomizationListQueryDto } from './product-customization-list-query.dto';

describe('ProductCustomizationListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new ProductCustomizationListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new ProductCustomizationListQueryDto(), {
      productId: '00000000-0000-7000-8000-000000000604',
      isActive: 'true',
      search: 'oxford',
      sortBy: 'createdAt',
      sortDirection: 'asc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when isActive is not a boolean string', async () => {
    const dto = Object.assign(new ProductCustomizationListQueryDto(), { isActive: 'yes' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('isActive');
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new ProductCustomizationListQueryDto(), { sortBy: 'name' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });
});
