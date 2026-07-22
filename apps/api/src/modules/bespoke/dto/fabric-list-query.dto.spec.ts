import { validate } from 'class-validator';
import { FabricListQueryDto } from './fabric-list-query.dto';

describe('FabricListQueryDto', () => {
  it('passes validation with no fields set (all optional)', async () => {
    const errors = await validate(new FabricListQueryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = Object.assign(new FabricListQueryDto(), {
      productId: '00000000-0000-7000-8000-000000000601',
      fabricCategoryId: '00000000-0000-7000-8000-000000000801',
      status: 'ACTIVE',
      search: 'wool',
      sortBy: 'name',
      sortDirection: 'desc',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = Object.assign(new FabricListQueryDto(), { sortBy: 'priceAdjustment' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a valid FabricStatus', async () => {
    const dto = Object.assign(new FabricListQueryDto(), { status: 'DISCONTINUED' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });
});
