import { validate } from 'class-validator';
import { CreateProductImageDto } from './create-product-image.dto';

describe('CreateProductImageDto', () => {
  it('passes validation with a valid url', async () => {
    const dto = Object.assign(new CreateProductImageDto(), {
      url: 'https://images.example.com/ring.jpg',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('fails validation when url is not a valid URL', async () => {
    const dto = Object.assign(new CreateProductImageDto(), { url: 'not-a-url' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('url');
  });
});
