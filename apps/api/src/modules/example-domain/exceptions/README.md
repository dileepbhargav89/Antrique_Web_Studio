# Exceptions

Placeholder — no custom exception exists yet in this reference module (a
ping endpoint has no failure case beyond what Nest's built-ins already
cover). A real domain module adds domain-specific exception classes here
once it has a genuine failure case Nest's built-in `HttpException`
subclasses don't already express precisely — e.g.
`ClientNotFoundException extends NotFoundException`. Every custom
exception still extends a built-in Nest `HttpException` subclass;
`apps/api/src/common/filters/exception-logging.filter.ts` already logs
and preserves the correct response shape for anything that does, with
no per-exception wiring needed.

Full convention: docs/architecture/domain-module-guide.md.
