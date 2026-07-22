import { validate } from 'class-validator';
import { UpdateCategoryDto } from './update-category.dto';

describe('UpdateCategoryDto', () => {
  it('passes validation with no fields set (a no-op patch)', async () => {
    const errors = await validate(new UpdateCategoryDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a single field set', async () => {
    const dto = Object.assign(new UpdateCategoryDto(), { name: 'Renamed' });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('fails validation when slug has invalid characters', async () => {
    const dto = Object.assign(new UpdateCategoryDto(), { slug: '--bad--' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('slug');
  });
});
