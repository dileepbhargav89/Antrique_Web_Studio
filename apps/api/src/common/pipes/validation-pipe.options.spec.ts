import { ValidationPipe } from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { VALIDATION_PIPE_OPTIONS } from './validation-pipe.options';

// Confirms the options themselves are correct without needing a live
// HTTP request — real end-to-end enforcement (unknown-field stripping,
// 400 on invalid input, real DTO instance reaching the controller) is
// verified live against the running app instead, the same way every
// other cross-cutting bootstrap behavior in this codebase has been
// (HttpLoggingMiddleware, ExceptionLoggingFilter) — see this phase's
// validation report, not a Jest e2e suite this codebase doesn't have.
describe('VALIDATION_PIPE_OPTIONS', () => {
  it('enables whitelist (unknown fields stripped, not rejected) and transform', () => {
    expect(VALIDATION_PIPE_OPTIONS.whitelist).toBe(true);
    expect(VALIDATION_PIPE_OPTIONS.transform).toBe(true);
  });

  it('does not forbid non-whitelisted fields (silent strip, not a 400)', () => {
    expect(VALIDATION_PIPE_OPTIONS.forbidNonWhitelisted).not.toBe(true);
  });

  class FixtureDto {
    @IsEmail()
    email!: string;
  }

  it('constructing a ValidationPipe with these options does not throw', () => {
    expect(() => new ValidationPipe(VALIDATION_PIPE_OPTIONS)).not.toThrow();
  });

  it('a pipe built from these options actually validates a decorated DTO (sanity check, not end-to-end HTTP)', async () => {
    const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

    await expect(
      pipe.transform({ email: 'not-an-email' }, { type: 'body', metatype: FixtureDto }),
    ).rejects.toThrow();

    await expect(
      pipe.transform({ email: 'user@example.com' }, { type: 'body', metatype: FixtureDto }),
    ).resolves.toBeInstanceOf(FixtureDto);
  });
});
