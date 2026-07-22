# Pipes

**`validation-pipe.options.ts` (Phase 1.2D.5)** — `VALIDATION_PIPE_OPTIONS`,
the configuration for the one global `ValidationPipe` every request
body/query/param is validated and transformed against. Registered in
`main.ts` via `app.useGlobalPipes(new
ValidationPipe(VALIDATION_PIPE_OPTIONS))` — no per-controller or
per-route pipe decorators anywhere; every DTO with `class-validator`
decorators (e.g. `apps/api/src/modules/auth/dto/`) is enforced
automatically at the HTTP boundary.

- `whitelist: true` — unknown properties are stripped from the payload
  before validation, not rejected (not combined with
  `forbidNonWhitelisted: true`).
- `transform: true` — the controller receives a real DTO class
  instance, not the original plain object.

Full rationale: `validation-pipe.options.ts`'s own header comment and
`docs/architecture/backend.md`'s "Startup flow" section.
