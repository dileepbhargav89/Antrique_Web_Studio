import { ArgumentsHost, Catch, HttpException, Inject, Injectable } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request } from 'express';
import { LOGGER, Logger } from '../../logging';

// Logs every unhandled exception through the existing LOGGER, then
// delegates to Nest's own default exception handling — the HTTP response
// sent to the client is untouched. Extending BaseExceptionFilter (not
// reimplementing response logic) is what makes "preserve NestJS's default
// HTTP responses" true by construction: super.catch() produces exactly
// the response shape Nest always has for HttpException vs. unknown
// errors. BaseExceptionFilter gets its HttpAdapterHost via @Optional()
// @Inject() PROPERTY injection (not a constructor param) — Nest populates
// it automatically for any instance it constructs via DI, which is
// exactly what happens registered as APP_FILTER (see app.module.ts); no
// applicationRef needs to be passed to super().
//
// Named ExceptionLoggingFilter, not AllExceptionsFilter — main.ts's
// original bootstrap comment describes a different, broader, still-
// unbuilt filter that reshapes the response into RFC 9457 Problem
// Details. This filter does the opposite of reshaping; reusing that name
// would misrepresent what's built here.
//
// RequestContext (requestId/correlationId/ip/userAgent) is never touched
// directly — it reaches this log the same way it reaches every other
// Logger call, via LoggerService's existing automatic merge (Phase
// 1.2C.4). Duplicating that here would be exactly the duplication Phase
// 1.2C.5 already avoided for the same reason.
@Catch()
@Injectable()
export class ExceptionLoggingFilter extends BaseExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {
    super();
  }

  override catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    const { message, type, statusCode, stack, errors, details } = describeException(exception);

    this.logger.error('Unhandled exception', {
      method: request.method,
      path: request.path,
      exceptionType: type,
      message,
      ...(statusCode !== undefined ? { statusCode } : {}),
      ...(stack !== undefined ? { stack } : {}),
      ...(errors !== undefined ? { errors } : {}),
      ...(details !== undefined ? { details } : {}),
    });

    super.catch(exception, host);
  }
}

interface ExceptionDescription {
  message: string;
  type: string;
  statusCode?: number;
  stack?: string;
  errors?: ExceptionDescription[];
  details?: unknown;
}

// Never passes a raw, untrusted thrown value into log metadata — this is
// where "safe for unknown values and circular references" is actually
// enforced, at the boundary where a thrown value (which can be anything:
// an HttpException, an AggregateError, a plain Error, a string, a number,
// a circular object) enters the logging system. Downstream (LoggerService,
// JsonLogFormatter) keeps assuming reasonably-shaped input, same as every
// other Logger call site — this function is what guarantees that
// assumption holds here.
//
// Branch order matters: AggregateError extends Error, so it must be
// checked before the plain-Error branch, or its nested `.errors` would be
// silently dropped by falling into the generic case.
function describeException(exception: unknown): ExceptionDescription {
  if (exception instanceof HttpException) {
    return {
      message: exception.message,
      type: exception.constructor.name,
      statusCode: exception.getStatus(),
      stack: exception.stack,
    };
  }

  if (exception instanceof AggregateError) {
    return {
      message: exception.message,
      type: exception.constructor.name,
      stack: exception.stack,
      errors: exception.errors.map(describeException),
    };
  }

  if (exception instanceof Error) {
    return {
      message: exception.message,
      type: exception.constructor.name,
      stack: exception.stack,
    };
  }

  // A non-Error object (including a circular one) keeps its structure in
  // `details` — a JSON round-trip clone, either a fully plain, safe deep
  // copy (if the value was JSON-serializable) or a safe placeholder (if
  // not) — rather than being crammed into `message` as a JSON-encoded
  // *string*. Passing that string on to JsonLogFormatter's own outer
  // JSON.stringify would double-encode it (escaped quotes inside a
  // string), which is safe but not queryable the way every other
  // structured field here is; a nested `details` object is.
  if (exception !== null && typeof exception === 'object') {
    return {
      message: 'Non-Error value thrown',
      type: typeof exception,
      details: safeClone(exception),
    };
  }

  // Primitives (string, number, boolean, undefined, function, symbol,
  // bigint) always convert safely via String() — never throws for any of
  // these, unlike JSON.stringify (which throws on bigint/function/symbol
  // and returns undefined for undefined/function/symbol).
  return {
    message: String(exception),
    type: typeof exception,
  };
}

// JSON.stringify throws on circular references (and on BigInt). Never let
// that propagate — a value that fails the round-trip has nothing safe to
// preserve, so it degrades to a placeholder instead of crashing the
// filter that's supposed to be logging the failure. A successful
// round-trip guarantees the result contains only plain JSON-compatible
// values, so nesting it inside a later, larger JSON.stringify call (the
// log entry as a whole) can never fail because of this value.
function safeClone(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return '[Unserializable value]';
  }
}
