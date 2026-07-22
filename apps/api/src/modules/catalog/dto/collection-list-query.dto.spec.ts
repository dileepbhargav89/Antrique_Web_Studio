import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CollectionListQueryDto } from './collection-list-query.dto';

describe('CollectionListQueryDto', () => {
  it('passes validation with no query params', async () => {
    expect(await validate(plainToInstance(CollectionListQueryDto, {}))).toHaveLength(0);
  });

  it('fails validation when sortDirection is not asc/desc', async () => {
    const dto = plainToInstance(CollectionListQueryDto, { sortDirection: 'sideways' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortDirection');
  });

  it('fails validation when limit exceeds the maximum', async () => {
    const dto = plainToInstance(CollectionListQueryDto, { limit: '500' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('limit');
  });
});
