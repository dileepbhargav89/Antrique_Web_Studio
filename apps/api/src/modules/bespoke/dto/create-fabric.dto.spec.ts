import { validate } from 'class-validator';
import { CreateFabricDto } from './create-fabric.dto';

describe('CreateFabricDto', () => {
  function makeDto(overrides: Partial<CreateFabricDto> = {}): CreateFabricDto {
    const dto = new CreateFabricDto();
    Object.assign(dto, { name: 'Navy Wool Twill', slug: 'navy-wool-twill', ...overrides });
    return dto;
  }

  it('passes validation with just the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        description: 'A heavy twill weave',
        fabricCategoryId: '00000000-0000-7000-8000-000000000801',
        composition: '100% Wool',
        colorHex: '#1B2A4A',
        priceAdjustment: '35.00',
        status: 'ACTIVE' as never,
        sortOrder: 2,
        productIds: ['00000000-0000-7000-8000-000000000601'],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when slug has uppercase letters or spaces', async () => {
    const errors = await validate(makeDto({ slug: 'Not A Slug' }));
    expect(errors.map((e) => e.property)).toContain('slug');
  });

  it('fails validation when colorHex is not a valid hex color', async () => {
    const errors = await validate(makeDto({ colorHex: 'navy-blue' }));
    expect(errors.map((e) => e.property)).toContain('colorHex');
  });

  it('fails validation when priceAdjustment is not a numeric string', async () => {
    const errors = await validate(makeDto({ priceAdjustment: 'thirty-five' }));
    expect(errors.map((e) => e.property)).toContain('priceAdjustment');
  });

  it('fails validation when productIds contains a non-UUID', async () => {
    const errors = await validate(makeDto({ productIds: ['not-a-uuid'] }));
    expect(errors.map((e) => e.property)).toContain('productIds');
  });
});
