import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

// Phase 3 (API Contract Review) — "Ensure every error follows one
// consistent response format" documented consistently in Swagger, not
// just in the actual runtime behavior (already consistent — see
// docs/architecture/security.md's error-handling review). Composable
// building blocks (`applyDecorators`, Nest's own documented pattern for
// bundling several decorators into one) instead of repeating the same
// `@ApiUnauthorizedResponse()`/`@ApiForbiddenResponse()` pair on ~90
// individual endpoints — one definition, applied everywhere, so the
// documented description of "what a 401 means here" can never drift
// per-controller. Pure Swagger metadata — none of these decorators
// affect runtime behavior; the actual 401/403/400/404/409 responses
// they describe are already produced by JwtAuthGuard/PermissionsGuard/
// ValidationPipe/ExceptionLoggingFilter, unchanged by this file.

// Every guarded endpoint in this API returns 401 the same way
// (JwtAuthGuard, missing/invalid/expired Bearer token) and 403 the same
// way (RolesGuard/PermissionsGuard, authenticated but under-privileged)
// — see docs/architecture/security.md's Authorization Review. Applied to
// every `@UseGuards(JwtAuthGuard, ...)` route; never to the handful of
// deliberately-public routes (auth login/refresh/logout, health checks).
export function ApiStandardAuthErrors() {
  return applyDecorators(
    ApiUnauthorizedResponse({
      description: 'Missing, malformed, expired, or otherwise invalid Bearer access token.',
    }),
    ApiForbiddenResponse({
      description:
        "Authenticated, but the caller's role/permissions don't include what this route requires.",
    }),
  );
}

// Every endpoint with a request body or query DTO goes through the same
// global ValidationPipe (`whitelist: true`, `forbidUnknownValues: true`
// — see docs/architecture/security.md §6), which throws the same
// NestJS-shaped 400 body on any violation. Applied to every route that
// declares a `@Body()`/non-empty `@Query()` DTO.
export function ApiValidationError() {
  return applyDecorators(
    ApiBadRequestResponse({
      description:
        'Request failed validation — see the response body for the specific field(s) and reason(s).',
    }),
  );
}

// Every `findActiveById`-style repository lookup in this codebase returns
// null for "doesn't exist OR belongs to a different tenant" (never
// distinguishing the two — see docs/architecture/security.md's tenant-
// isolation review), and every service translates that into the same
// NotFoundException. `resource` is the human-readable name shown in the
// generated description (e.g. "lead", "product") — applied to every
// `:id`-shaped GET/PATCH/DELETE/action route.
export function ApiNotFoundError(resource: string) {
  return applyDecorators(
    ApiNotFoundResponse({
      description: `No ${resource} exists with the given id in the caller's own tenant.`,
    }),
  );
}

// Applied only to the specific create/update routes that can genuinely
// hit a real unique-constraint violation (slug, SKU, email, etc. — see
// each service's own `isUniqueConstraintViolation()` usage,
// docs/architecture/domain-module-guide.md). `description` is call-site-
// specific (which field collided) rather than generic, since "409" alone
// doesn't tell a frontend developer which request field to surface an
// error against.
export function ApiConflictError(description: string) {
  return applyDecorators(ApiConflictResponse({ description }));
}
