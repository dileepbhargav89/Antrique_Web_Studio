import { ArgumentsHost, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { ExceptionLoggingFilter } from './exception-logging.filter';
import { Logger, RequestContext, RequestContextService } from '../../logging';

// Phase 10, Module 8 revisit — the SDK's own network/queueing behavior
// isn't this filter's concern to re-verify (that's Sentry's own job);
// what this filter is responsible for is calling `captureException()` for
// the right exceptions and skipping it for the rest, which a mocked
// module isolates cleanly.
jest.mock('@sentry/node');

describe('ExceptionLoggingFilter', () => {
  const makeLogger = (): jest.Mocked<Logger> => ({
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  });

  const makeHost = (overrides: { method?: string; path?: string } = {}): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: overrides.method ?? 'GET',
          path: overrides.path ?? '/widgets',
        }),
        getResponse: () => ({}),
        getNext: () => undefined,
      }),
    }) as unknown as ArgumentsHost;

  // BaseExceptionFilter.catch() needs a real HttpAdapterHost to actually
  // write a response — not this phase's concern to re-verify (that's
  // Nest's own framework behavior). Stubbing it here isolates what this
  // filter is actually responsible for: logging, then delegating.
  let superCatchSpy: jest.SpyInstance;

  beforeEach(() => {
    superCatchSpy = jest
      .spyOn(BaseExceptionFilter.prototype, 'catch')
      .mockImplementation(() => undefined);
    jest.mocked(Sentry.captureException).mockClear();
  });

  afterEach(() => {
    superCatchSpy.mockRestore();
  });

  describe('Sentry reporting', () => {
    it('reports a non-HttpException (an unexpected thrown value) to Sentry', () => {
      const logger = makeLogger();
      const filter = new ExceptionLoggingFilter(logger);
      const exception = new Error('boom');

      filter.catch(exception, makeHost());

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('reports an HttpException with a 5xx status to Sentry', () => {
      const logger = makeLogger();
      const filter = new ExceptionLoggingFilter(logger);
      const exception = new InternalServerErrorException('db unreachable');

      filter.catch(exception, makeHost());

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('does NOT report an HttpException with a 4xx status to Sentry — expected application behavior, not a bug', () => {
      const logger = makeLogger();
      const filter = new ExceptionLoggingFilter(logger);
      const exception = new BadRequestException('bad input');

      filter.catch(exception, makeHost());

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  it('logs an HttpException with its real status code, message, and stack', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);
    const exception = new BadRequestException('bad input');
    const host = makeHost({ method: 'POST', path: '/widgets' });

    filter.catch(exception, host);

    expect(logger.error).toHaveBeenCalledWith(
      'Unhandled exception',
      expect.objectContaining({
        method: 'POST',
        path: '/widgets',
        exceptionType: 'BadRequestException',
        message: 'bad input',
        statusCode: 400,
        stack: exception.stack,
      }),
    );
  });

  it('logs a plain Error with no statusCode', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);
    const exception = new Error('boom');

    filter.catch(exception, makeHost());

    const [, metadata] = logger.error.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({ exceptionType: 'Error', message: 'boom', stack: exception.stack }),
    );
    expect(metadata).not.toHaveProperty('statusCode');
  });

  it('logs an AggregateError with each nested error safely described, not silently dropped', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const exception = new AggregateError(
      [new Error('first failure'), 'second failure as string', circular],
      'multiple failures',
    );

    filter.catch(exception, makeHost());

    const [, metadata] = logger.error.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({ exceptionType: 'AggregateError', message: 'multiple failures' }),
    );
    const errors = (metadata as { errors: Array<Record<string, unknown>> }).errors;
    expect(errors).toHaveLength(3);
    expect(errors[0]).toEqual(expect.objectContaining({ type: 'Error', message: 'first failure' }));
    expect(errors[1]).toEqual(
      expect.objectContaining({ type: 'string', message: 'second failure as string' }),
    );
    // The circular member must never throw during logging — it degrades
    // to a safe placeholder in `details` instead.
    expect(errors[2]).toEqual(
      expect.objectContaining({
        type: 'object',
        message: 'Non-Error value thrown',
        details: '[Unserializable value]',
      }),
    );
  });

  it('logs a plain string throw safely, with no stack or statusCode', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);

    filter.catch('just a string', makeHost());

    const [, metadata] = logger.error.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({ exceptionType: 'string', message: 'just a string' }),
    );
    expect(metadata).not.toHaveProperty('stack');
    expect(metadata).not.toHaveProperty('statusCode');
  });

  it('logs a plain number throw safely', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);

    filter.catch(42, makeHost());

    const [, metadata] = logger.error.mock.calls[0]!;
    expect(metadata).toEqual(expect.objectContaining({ exceptionType: 'number', message: '42' }));
  });

  it('never throws when the thrown value is a circular-reference object', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);
    const circular: Record<string, unknown> = { name: 'weird' };
    circular.self = circular;

    expect(() => filter.catch(circular, makeHost())).not.toThrow();

    const [, metadata] = logger.error.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({
        exceptionType: 'object',
        message: 'Non-Error value thrown',
        details: '[Unserializable value]',
      }),
    );
  });

  it('preserves a non-circular plain object throw as a structured, queryable `details` field — not a double-encoded JSON string', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);

    filter.catch({ code: 'X', detail: 'Y' }, makeHost());

    const [, metadata] = logger.error.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({
        exceptionType: 'object',
        message: 'Non-Error value thrown',
        details: { code: 'X', detail: 'Y' },
      }),
    );
  });

  it('calls logger.error() exactly once per exception, regardless of type', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);

    filter.catch(new BadRequestException(), makeHost());
    filter.catch(new Error('x'), makeHost());
    filter.catch('y', makeHost());

    expect(logger.error).toHaveBeenCalledTimes(3);
  });

  it('always delegates to BaseExceptionFilter.catch() exactly once, preserving the default response', () => {
    const logger = makeLogger();
    const filter = new ExceptionLoggingFilter(logger);
    const host = makeHost();
    const exception = new BadRequestException('bad input');

    filter.catch(exception, host);

    expect(superCatchSpy).toHaveBeenCalledTimes(1);
    expect(superCatchSpy).toHaveBeenCalledWith(exception, host);
  });

  it('logs while a RequestContext is genuinely active — proving integration with the real RequestContextService, not just a mocked logger call', () => {
    // ExceptionLoggingFilter never touches RequestContextService itself —
    // LoggerService's existing auto-merge (Phase 1.2C.4) is what actually
    // puts context on the LogEntry, already covered by
    // logger.service.spec.ts. What this test proves is narrower and still
    // real: the filter logs from within whatever async context the
    // request was in when the exception was thrown, so a real
    // LoggerService (not exercised here directly) would see it.
    const logger = makeLogger();
    let observedContext: RequestContext | undefined;
    logger.error.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const requestContext = new RequestContextService();
    const filter = new ExceptionLoggingFilter(logger);

    requestContext.run({ requestId: 'req-1', correlationId: 'corr-1' }, () => {
      filter.catch(new BadRequestException('bad input'), makeHost());
    });

    expect(observedContext).toEqual({ requestId: 'req-1', correlationId: 'corr-1' });
  });
});
