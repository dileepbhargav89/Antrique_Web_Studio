import { validate } from 'class-validator';
import { CreateProductCustomizationDto } from './create-product-customization.dto';
import { CreateStyleOptionGroupDto } from './create-style-option-group.dto';
import { CreateNestedStyleOptionDto } from './create-nested-style-option.dto';
import { CreatePricingAdjustmentDto } from './create-pricing-adjustment.dto';
import { CreateMonogramOptionDto } from './create-monogram-option.dto';

describe('CreateProductCustomizationDto', () => {
  function makeDto(
    overrides: Partial<CreateProductCustomizationDto> = {},
  ): CreateProductCustomizationDto {
    const dto = new CreateProductCustomizationDto();
    Object.assign(dto, { productId: '00000000-0000-7000-8000-000000000604', ...overrides });
    return dto;
  }

  it('passes validation with just the required productId', async () => {
    const errors = await validate(makeDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation with a full nested structure', async () => {
    const option = Object.assign(new CreateNestedStyleOptionDto(), { name: 'Spread Collar' });
    const group = Object.assign(new CreateStyleOptionGroupDto(), {
      name: 'Collar Style',
      styleOptions: [option],
    });
    const adjustment = Object.assign(new CreatePricingAdjustmentDto(), {
      label: 'Tailoring fee',
      amount: '20.00',
    });
    const monogram = Object.assign(new CreateMonogramOptionDto(), { label: 'Chest Monogram' });

    const errors = await validate(
      makeDto({
        name: 'Oxford Shirt Customization',
        isActive: true,
        styleOptionGroups: [group],
        pricingAdjustments: [adjustment],
        monogramOptions: [monogram],
      }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when productId is not a UUID', async () => {
    const errors = await validate(makeDto({ productId: 'not-a-uuid' }));
    expect(errors.map((e) => e.property)).toContain('productId');
  });

  it('fails validation when a nested pricing adjustment has an invalid amount', async () => {
    const badAdjustment = Object.assign(new CreatePricingAdjustmentDto(), {
      label: 'Bad',
      amount: 'not-a-number',
    });
    const errors = await validate(makeDto({ pricingAdjustments: [badAdjustment] }));
    expect(errors.map((e) => e.property)).toContain('pricingAdjustments');
  });

  it('fails validation when a nested monogram option has maxCharacters out of bounds', async () => {
    const badMonogram = Object.assign(new CreateMonogramOptionDto(), {
      label: 'Chest',
      maxCharacters: 50,
    });
    const errors = await validate(makeDto({ monogramOptions: [badMonogram] }));
    expect(errors.map((e) => e.property)).toContain('monogramOptions');
  });
});
