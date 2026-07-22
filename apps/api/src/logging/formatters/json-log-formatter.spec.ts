import { JsonLogFormatter } from './json-log-formatter';
import { LogEntry } from '../types/log-entry.type';

describe('JsonLogFormatter', () => {
  const formatter = new JsonLogFormatter();
  const baseEntry: LogEntry = {
    level: 'info',
    message: 'hello',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('produces valid JSON with level, message, and an ISO timestamp', () => {
    const parsed = JSON.parse(formatter.format(baseEntry));
    expect(parsed).toEqual({
      level: 'info',
      message: 'hello',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });

  it('omits metadata entirely when absent (not a null/undefined key)', () => {
    const parsed = JSON.parse(formatter.format(baseEntry));
    expect('metadata' in parsed).toBe(false);
  });

  it('includes metadata when present', () => {
    const parsed = JSON.parse(formatter.format({ ...baseEntry, metadata: { orderId: '123' } }));
    expect(parsed.metadata).toEqual({ orderId: '123' });
  });

  it('omits context entirely when absent', () => {
    const parsed = JSON.parse(formatter.format(baseEntry));
    expect('context' in parsed).toBe(false);
  });

  it('includes context when present', () => {
    const parsed = JSON.parse(
      formatter.format({ ...baseEntry, context: { correlationId: 'abc' } }),
    );
    expect(parsed.context).toEqual({ correlationId: 'abc' });
  });

  it('serializes an Error in metadata to name/message/stack instead of "{}"', () => {
    const error = new Error('db connection failed');
    const parsed = JSON.parse(formatter.format({ ...baseEntry, metadata: { error } }));
    expect(parsed.metadata.error).toEqual({
      name: 'Error',
      message: 'db connection failed',
      stack: error.stack,
    });
  });

  it('serializes a nested Error (not just top-level metadata) the same way', () => {
    const error = new TypeError('bad input');
    const parsed = JSON.parse(formatter.format({ ...baseEntry, metadata: { cause: { error } } }));
    expect(parsed.metadata.cause.error).toEqual({
      name: 'TypeError',
      message: 'bad input',
      stack: error.stack,
    });
  });
});
