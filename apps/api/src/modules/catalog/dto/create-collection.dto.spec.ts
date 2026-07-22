import { validate } from 'class-validator';
import { CreateCollectionDto } from './create-collection.dto';
import { CollectionStatus } from '../../../../generated/prisma/enums';

// Same shape as create-category.dto.spec.ts.
describe('CreateCollectionDto', () => {
  function makeDto(overrides: Partial<CreateCollectionDto> = {}): CreateCollectionDto {
    const dto = new CreateCollectionDto();
    Object.assign(dto, {
      name: 'Signature Collection',
      slug: 'signature-collection',
      ...overrides,
    });
    return dto;
  }

  it('passes validation with just the required fields', async () => {
    expect(await validate(makeDto())).toHaveLength(0);
  });

  it('passes validation with every optional field set', async () => {
    const errors = await validate(
      makeDto({ description: 'Core range', status: CollectionStatus.ARCHIVED, sortOrder: 1 }),
    );
    expect(errors).toHaveLength(0);
  });

  it('fails validation when slug is missing', async () => {
    const dto = makeDto();
    // @ts-expect-error deliberately violating the required field for this test
    dto.slug = undefined;
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('slug');
  });
});
