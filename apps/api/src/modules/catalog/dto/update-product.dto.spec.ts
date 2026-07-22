import { validate } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';

describe('UpdateProductDto', () => {
  it('passes validation with no fields set', async () => {
    expect(await validate(new UpdateProductDto())).toHaveLength(0);
  });

  it('fails validation when collectionId is not a UUID', async () => {
    const dto = Object.assign(new UpdateProductDto(), { collectionId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('collectionId');
  });

  it('fails validation when status is not a real ProductStatus value', async () => {
    const dto = Object.assign(new UpdateProductDto(), { status: 'PENDING_REVIEW' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('status');
  });
});
