import { ValidationPipeOptions } from '@nestjs/common';

// The one global ValidationPipe configuration every request body/query/
// param DTO is validated and transformed against — see main.ts for where
// it's registered (app.useGlobalPipes(new
// ValidationPipe(VALIDATION_PIPE_OPTIONS))) and
// docs/architecture/domain-module-guide.md §3 for the DTO conventions
// this pipe enforces at the HTTP boundary.
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  // Strips any property not declared on the target DTO class before
  // validation runs — "unknown fields removed," not rejected. Silent
  // stripping (the default; NOT combined with forbidNonWhitelisted:
  // true) rather than a 400 on extra fields: a client sending harmless
  // extra data (e.g. a stale field from an old client version) degrades
  // gracefully instead of hard-failing on something that was never a
  // real validation error.
  whitelist: true,

  // ValidationPipe always constructs a DTO class instance internally to
  // run class-validator's decorators against, regardless of this
  // option — what `transform: true` actually changes is what the
  // *controller* receives back: the real, transformed DTO instance
  // (e.g. a genuine `LoginRequestDto`) instead of the original plain
  // object. Also enables class-transformer's primitive coercion for any
  // future DTO field using `@Type()` (none of the current auth DTOs
  // need one — all fields are already plain strings).
  transform: true,
};
