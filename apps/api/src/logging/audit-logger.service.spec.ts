import { AuditLoggerService } from './audit-logger.service';
import { AuditEvent, RequestContext, RequestContextService } from './index';
import { Logger } from './interfaces/logger.interface';

describe('AuditLoggerService', () => {
  const makeLogger = (): jest.Mocked<Logger> => ({
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  });

  const baseEvent: AuditEvent = {
    event: 'user.password_changed',
    action: 'UPDATE',
    resource: 'user',
    outcome: 'SUCCESS',
  };

  it('logs exactly once via logger.info() with the required fields', () => {
    const logger = makeLogger();
    const audit = new AuditLoggerService(logger);

    audit.log(baseEvent);

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [message, metadata] = logger.info.mock.calls[0]!;
    expect(message).toBe('Audit event');
    expect(metadata).toEqual(
      expect.objectContaining({
        event: 'user.password_changed',
        action: 'UPDATE',
        resource: 'user',
        outcome: 'SUCCESS',
      }),
    );
  });

  it('omits optional fields entirely when absent', () => {
    const logger = makeLogger();
    const audit = new AuditLoggerService(logger);

    audit.log(baseEvent);

    const [, metadata] = logger.info.mock.calls[0]!;
    expect(metadata).not.toHaveProperty('resourceId');
    expect(metadata).not.toHaveProperty('actorType');
    expect(metadata).not.toHaveProperty('actorId');
    expect(metadata).not.toHaveProperty('metadata');
  });

  it('includes optional fields when present, with metadata nested as its own key', () => {
    const logger = makeLogger();
    const audit = new AuditLoggerService(logger);

    audit.log({
      ...baseEvent,
      resourceId: 'user-123',
      actorType: 'user',
      actorId: 'admin-1',
      metadata: { previousEmail: 'old@example.com' },
    });

    const [, metadata] = logger.info.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({
        resourceId: 'user-123',
        actorType: 'user',
        actorId: 'admin-1',
        metadata: { previousEmail: 'old@example.com' },
      }),
    );
    // Nested, not flat-merged — the caller's own key doesn't leak to the
    // top level of the logged metadata.
    expect(metadata).not.toHaveProperty('previousEmail');
  });

  it('logs a FAILURE outcome via the same .info() level as SUCCESS — no branching', () => {
    const logger = makeLogger();
    const audit = new AuditLoggerService(logger);

    audit.log({ ...baseEvent, outcome: 'FAILURE' });

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    const [, metadata] = logger.info.mock.calls[0]!;
    expect(metadata).toEqual(expect.objectContaining({ outcome: 'FAILURE' }));
  });

  it('never duplicates requestId/correlationId/ip/userAgent into its own metadata', () => {
    const logger = makeLogger();
    const audit = new AuditLoggerService(logger);

    audit.log({
      ...baseEvent,
      actorId: 'admin-1',
      metadata: { note: 'unrelated' },
    });

    const [, metadata] = logger.info.mock.calls[0]!;
    expect(metadata).not.toHaveProperty('requestId');
    expect(metadata).not.toHaveProperty('correlationId');
    expect(metadata).not.toHaveProperty('ip');
    expect(metadata).not.toHaveProperty('userAgent');
  });

  it('logs from within whatever RequestContext is active — proving inheritance via the real RequestContextService', () => {
    const logger = makeLogger();
    let observedContext: RequestContext | undefined;
    logger.info.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const requestContext = new RequestContextService();
    const audit = new AuditLoggerService(logger);

    requestContext.run({ requestId: 'req-1', correlationId: 'corr-1' }, () => {
      audit.log(baseEvent);
    });

    expect(observedContext).toEqual({ requestId: 'req-1', correlationId: 'corr-1' });
  });

  it('logs with no context when none is active', () => {
    const logger = makeLogger();
    const requestContext = new RequestContextService();
    let observedContext: RequestContext | undefined = {
      requestId: 'stale',
      correlationId: 'stale',
    };
    logger.info.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const audit = new AuditLoggerService(logger);

    audit.log(baseEvent);

    expect(observedContext).toBeUndefined();
  });

  it('AuditEvent fields are immutable at compile time (typecheck-only, not a runtime test)', () => {
    const logger = makeLogger();
    const audit = new AuditLoggerService(logger);
    audit.log(baseEvent);

    // @ts-expect-error — `event` is readonly; reassigning it must NOT compile.
    baseEvent.event = 'mutated';
  });
});
