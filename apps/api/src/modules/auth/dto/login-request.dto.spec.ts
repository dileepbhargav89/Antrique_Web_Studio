import { validate } from 'class-validator';
import { LoginRequestDto } from './login-request.dto';

// Tests the validation rules directly via class-validator's own
// validate() — independent of the global ValidationPipe (Phase 1.2D.5,
// main.ts), which enforces these same rules at the HTTP boundary; that
// integration is verified live against the running app instead (see
// this phase's validation report), not by a Jest e2e suite this
// codebase doesn't have.
describe('LoginRequestDto', () => {
  function makeDto(overrides: Partial<LoginRequestDto>): LoginRequestDto {
    const dto = new LoginRequestDto();
    Object.assign(dto, { email: 'user@example.com', password: 'secret', ...overrides });
    return dto;
  }

  it('passes validation with a valid email and non-empty password', async () => {
    const errors = await validate(makeDto({}));
    expect(errors).toHaveLength(0);
  });

  it('fails validation when email is not a valid email address', async () => {
    const errors = await validate(makeDto({ email: 'not-an-email' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('email');
  });

  it('fails validation when password is empty', async () => {
    const errors = await validate(makeDto({ password: '' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('password');
  });

  it('fails validation when password is not a string', async () => {
    const errors = await validate(makeDto({ password: 12345 as unknown as string }));
    expect(errors).toHaveLength(1);
    expect(errors[0]!.property).toBe('password');
  });
});
