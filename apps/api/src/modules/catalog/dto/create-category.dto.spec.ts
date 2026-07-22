import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';
import { CategoryStatus } from '../../../../generated/prisma/enums';

// Same reasoning as modules/auth/dto/login-request.dto.spec.ts — tests
// class-validator's own validate() directly, independent of the global
// ValidationPipe (verified live against the running app instead).
describe('CreateCategoryDto', () => {
  function makeDto(overrides: Partial<CreateCategoryDto> = {}): CreateCategoryDto {
    const dto = new CreateCategoryDto();
    Object.assign(dto, { name: 'Rings', slug: 'rings', ...overrides });
    return dto;
  }

  it('passes validation with just the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({ description: 'Ring styles', status: CategoryStatus.ARCHIVED, sortOrder: 3 }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when name is empty', async () => {
    const errors = await validate(makeDto({ name: '' }));
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('fails validation when slug has uppercase letters or spaces', async () => {
    const errors = await validate(makeDto({ slug: 'Not A Slug' }));
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('fails validation when sortOrder is negative', async () => {
    const errors = await validate(makeDto({ sortOrder: -1 }));
    expect(errors.map((e) => e.property)).toContain('sortOrder');
  });
});
