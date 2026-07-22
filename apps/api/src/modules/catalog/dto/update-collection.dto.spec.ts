import { validate } from 'class-validator';
import { UpdateCollectionDto } from './update-collection.dto';

describe('UpdateCollectionDto', () => {
  it('passes validation with no fields set', async () => {
    expect(await validate(new UpdateCollectionDto())).toHaveLength(0);
  });

  it('fails validation when name exceeds the max length', async () => {
    const dto = Object.assign(new UpdateCollectionDto(), { name: 'x'.repeat(201) });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('name');
  });
});
