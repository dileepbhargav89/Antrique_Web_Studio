# Exceptions

Placeholder — no custom exception exists yet. This phase's endpoints
always return a placeholder success response (see `../auth.service.ts`)
regardless of input validity beyond DTO shape validation — there is no
real failure case to express yet (no credential check, no token
verification). A real implementation adds exceptions here once it has
one, each extending a built-in Nest `HttpException` subclass (e.g.
`InvalidCredentialsException extends UnauthorizedException`) — see
`docs/architecture/domain-module-guide.md` §8 for the full convention
and why `apps/api/src/common/filters/exception-logging.filter.ts`
requires that hierarchy.

Full convention: docs/architecture/domain-module-guide.md.
