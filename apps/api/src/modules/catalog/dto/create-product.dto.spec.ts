import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

// plainToInstance() (not `new` + Object.assign) so `@Type(() =>
// CreateProductVariantDto)`/`@ValidateNested()` actually construct real
// nested DTO instances the way the global ValidationPipe's `transform:
// true` does — Object.assign alone would leave `variants`/`images` as
// plain objects, and @ValidateNested() would validate nothing.
describe('CreateProductDto', () => {
  function makePayload(overrides: Record<string, unknown> = {}) {
    return { name: 'Solitaire Ring', slug: 'solitaire-ring', ...overrides };
  }

  it('passes validation with just the required fields', async () => {
    const dto = plainToInstance(CreateProductDto, makePayload());
    expect(await validate(dto)).toHaveLength(0);
  });

  it('passes validation with nested variants and images', async () => {
    const dto = plainToInstance(
      CreateProductDto,
      makePayload({
        variants: [{ sku: 'RING-SOL-6', price: 249 }],
        images: [{ url: 'https://images.example.com/ring.jpg' }],
      }),
    );
    expect(await validate(dto)).toHaveLength(0);
  });

  it('fails validation when a nested variant has a negative price', async () => {
    const dto = plainToInstance(
      CreateProductDto,
      makePayload({ variants: [{ sku: 'RING-SOL-6', price: -5 }] }),
    );
    const errors = await validate(dto);
    const variantErrors = errors.find((e) => e.property === 'variants');
    expect(variantErrors).toBeDefined();
  });

  it('fails validation when categoryId is not a UUID', async () => {
    const dto = plainToInstance(CreateProductDto, makePayload({ categoryId: 'not-a-uuid' }));
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('categoryId');
  });

  it('fails validation when slug is missing', async () => {
    const dto = plainToInstance(CreateProductDto, { name: 'Solitaire Ring' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('slug');
  });
});
