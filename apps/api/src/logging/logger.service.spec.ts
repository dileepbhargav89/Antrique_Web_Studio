import { LoggerService } from './logger.service';
import { LogTransport } from './interfaces/log-transport.interface';
import { LogLevel } from './types/log-level.type';
import { RequestContextService } from './request-context.service';

describe('LoggerService', () => {
  const makeTransport = (): jest.Mocked<LogTransport> => ({ write: jest.fn() });

  const makeService = (
    level: LogLevel,
    transport: LogTransport,
    requestContext: RequestContextService = new RequestContextService(),
  ) => new LoggerService({ level, format: 'json' } as never, transport, requestContext);

  describe('level filtering', () => {
    it('enables every level at or above configured verbosity, suppresses the rest — configured "info"', () => {
      const transport = makeTransport();
      const logger = makeService('info', transport);

      logger.fatal('a');
      logger.error('b');
      logger.warn('c');
      logger.info('d');
      logger.debug('e');
      logger.trace('f');

      expect(transport.write).toHaveBeenCalledTimes(4);
      const loggedMessages = transport.write.mock.calls.map(([entry]) => entry.message);
      expect(loggedMessages).toEqual(['a', 'b', 'c', 'd']);
    });

    it('configured "trace" enables everything', () => {
      const transport = makeTransport();
      const logger = makeService('trace', transport);

      logger.fatal('a');
      logger.trace('f');

      expect(transport.write).toHaveBeenCalledTimes(2);
    });

    it('configured "fatal" enables only fatal', () => {
      const transport = makeTransport();
      const logger = makeService('fatal', transport);

      logger.fatal('a');
      logger.error('b');

      expect(transport.write).toHaveBeenCalledTimes(1);
      expect(transport.write).toHaveBeenCalledWith(expect.objectContaining({ level: 'fatal' }));
    });

    it('a suppressed call never reaches the transport at all', () => {
      const transport = makeTransport();
      const logger = makeService('error', transport);

      logger.debug('should not be built or written');

      expect(transport.write).not.toHaveBeenCalled();
    });
  });

  describe('entry construction', () => {
    it('includes metadata when passed', () => {
      const transport = makeTransport();
      const logger = makeService('info', transport);

      logger.info('msg', { orderId: '123' });

      expect(transport.write).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'info', message: 'msg', metadata: { orderId: '123' } }),
      );
    });

    it('omits the metadata key entirely when not passed (not metadata: undefined)', () => {
      const transport = makeTransport();
      const logger = makeService('info', transport);

      logger.info('msg');

      const [entry] = transport.write.mock.calls[0]!;
      expect('metadata' in entry).toBe(false);
    });

    it('omits the context key entirely when no request context is active', () => {
      const transport = makeTransport();
      const logger = makeService('info', transport);

      logger.info('msg');

      const [entry] = transport.write.mock.calls[0]!;
      expect('context' in entry).toBe(false);
    });

    it('merges the active request context into LogEntry.context when one exists', () => {
      const transport = makeTransport();
      const requestContext = new RequestContextService();
      const logger = makeService('info', transport, requestContext);

      requestContext.run({ requestId: 'req-1', correlationId: 'corr-1' }, () => {
        logger.info('msg');
      });

      expect(transport.write).toHaveBeenCalledWith(
        expect.objectContaining({
          context: { requestId: 'req-1', correlationId: 'corr-1' },
        }),
      );
    });

    it('does not leak a request context into a call made after run() returns', () => {
      const transport = makeTransport();
      const requestContext = new RequestContextService();
      const logger = makeService('info', transport, requestContext);

      requestContext.run({ requestId: 'req-1', correlationId: 'corr-1' }, () => {
        logger.info('inside');
      });
      logger.info('outside');

      const [, outsideEntry] = transport.write.mock.calls.map(([entry]) => entry);
      expect('context' in outsideEntry!).toBe(false);
    });

    it('stamps a real Date timestamp', () => {
      const transport = makeTransport();
      const logger = makeService('info', transport);

      logger.info('msg');

      const [entry] = transport.write.mock.calls[0]!;
      expect(entry.timestamp).toBeInstanceOf(Date);
    });
  });
});
