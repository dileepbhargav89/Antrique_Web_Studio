import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ProductListQueryDto } from './product-list-query.dto';

describe('ProductListQueryDto', () => {
  it('passes validation with no query params', async () => {
    expect(await validate(plainToInstance(ProductListQueryDto, {}))).toHaveLength(0);
  });

  it('passes validation with every filter set', async () => {
    const dto = plainToInstance(ProductListQueryDto, {
      categoryId: '00000000-0000-7000-8000-000000000401',
      collectionId: '00000000-0000-7000-8000-000000000501',
      status: 'PUBLISHED',
      search: 'ring',
      sortBy: 'name',
      sortDirection: 'desc',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('fails validation when categoryId is not a UUID', async () => {
    const dto = plainToInstance(ProductListQueryDto, { categoryId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('categoryId');
  });
});
