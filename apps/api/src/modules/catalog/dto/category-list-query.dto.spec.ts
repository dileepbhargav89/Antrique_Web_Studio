import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CategoryListQueryDto } from './category-list-query.dto';

// Uses plainToInstance() (not `new` + Object.assign) since real query
// params always arrive as strings — this exercises the same
// class-transformer coercion the global ValidationPipe's `transform:
// true` applies (see pagination-query.dto.ts's own comment).
describe('CategoryListQueryDto', () => {
  it('passes validation with no query params (defaults apply)', async () => {
    const dto = plainToInstance(CategoryListQueryDto, {});
    expect(await validate(dto)).toHaveLength(0);
  });

  it('coerces string page/limit query params to numbers', () => {
    const dto = plainToInstance(CategoryListQueryDto, { page: '2', limit: '10' });
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
  });

  it('fails validation when sortBy is not an allowed field', async () => {
    const dto = plainToInstance(CategoryListQueryDto, { sortBy: 'deletedAt' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('sortBy');
  });

  it('fails validation when status is not a real CategoryStatus value', async () => {
    const dto = plainToInstance(CategoryListQueryDto, { status: 'NOT_A_STATUS' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });
});
