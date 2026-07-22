import { validate } from 'class-validator';
import { CreateCustomerTagDto } from './create-customer-tag.dto';

describe('CreateCustomerTagDto', () => {
  function makeDto(overrides: Partial<CreateCustomerTagDto> = {}): CreateCustomerTagDto {
    const dto = new CreateCustomerTagDto();
    Object.assign(dto, { name: 'VIP', slug: 'vip', ...overrides });
    return dto;
  }

  it('passes validation with the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a hex color set', async () => {
    const errors = await validate(makeDto({ color: '#B8860B' }));
    expect(errors).toHaveLength(0);
  });

  it('fails validation when slug does not match the slug pattern', async () => {
    const errors = await validate(makeDto({ slug: 'Not A Slug' }));
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('fails validation when color is not a valid hex color', async () => {
    const errors = await validate(makeDto({ color: 'gold' }));
    expect(errors.map((e) => e.property)).toContain('color');
  });

  it('fails validation when name is empty', async () => {
    const errors = await validate(makeDto({ name: '' }));
    expect(errors.map((e) => e.property)).toContain('name');
  });
});
