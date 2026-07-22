import { validate } from 'class-validator';
import { CreateStyleOptionDto } from './create-style-option.dto';

describe('CreateStyleOptionDto', () => {
  function makeDto(overrides: Partial<CreateStyleOptionDto> = {}): CreateStyleOptionDto {
    const dto = new CreateStyleOptionDto();
    Object.assign(dto, {
      styleOptionGroupId: '00000000-0000-7000-8000-000000001301',
      name: 'Spread Collar',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with just the required fields', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({
        description: 'A wide, pointed collar',
        priceAdjustment: '15.00',
        status: 'ACTIVE' as never,
        sortOrder: 1,
        incompatibleStyleOptionIds: ['00000000-0000-7000-8000-000000001402'],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when styleOptionGroupId is not a UUID', async () => {
    const errors = await validate(makeDto({ styleOptionGroupId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('styleOptionGroupId');
  });

  it('fails validation when incompatibleStyleOptionIds contains a non-UUID', async () => {
    const errors = await validate(makeDto({ incompatibleStyleOptionIds: ['not-a-uuid'] }));
    expect(errors.map((e) => e.property)).toContain('incompatibleStyleOptionIds');
  });

  it('fails validation when priceAdjustment is not a numeric string', async () => {
    const errors = await validate(makeDto({ priceAdjustment: 'fifteen' }));
    expect(errors.map((e) => e.property)).toContain('priceAdjustment');
  });
});
