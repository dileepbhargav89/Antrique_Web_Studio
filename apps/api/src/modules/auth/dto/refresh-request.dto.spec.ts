import { validate } from 'class-validator';
import { RefreshRequestDto } from './refresh-request.dto';

describe('RefreshRequestDto', () => {
  function makeDto(refreshToken: unknown): RefreshRequestDto {
    const dto = new RefreshRequestDto();
    Object.assign(dto, { refreshToken });
    return dto;
  }

  it('passes validation with a non-empty string refreshToken', async () => {
    const errors = await validate(makeDto('a-real-looking-token'));
    expect(errors).toHaveLength(0);
  });

  it('fails validation when refreshToken is empty', async () => {
    const errors = await validate(makeDto(''));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('refreshToken');
  });

  it('fails validation when refreshToken is not a string', async () => {
    const errors = await validate(makeDto(12345));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('refreshToken');
  });
});
