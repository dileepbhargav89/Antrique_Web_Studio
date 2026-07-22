import { ConsoleLogTransport } from './console-log-transport';
import { LogFormatter } from '../interfaces/log-formatter.interface';
import { LogEntry } from '../types/log-entry.type';
import { LogLevel } from '../types/log-level.type';

describe('ConsoleLogTransport', () => {
  const formatter: LogFormatter = { format: jest.fn(() => 'formatted-line') };
  const transport = new ConsoleLogTransport(formatter);

  const entry = (level: LogLevel): LogEntry => ({
    level,
    message: 'msg',
    timestamp: new Date(),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('always formats the entry via the injected formatter before writing', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const infoEntry = entry('info');
    transport.write(infoEntry);
    expect(formatter.format).toHaveBeenCalledWith(infoEntry);
    expect(spy).toHaveBeenCalledWith('formatted-line');
  });

  it.each<LogLevel>(['fatal', 'error'])('routes %s to console.error', (level) => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    transport.write(entry(level));
    expect(spy).toHaveBeenCalledWith('formatted-line');
  });

  it('routes warn to console.warn', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    transport.write(entry('warn'));
    expect(spy).toHaveBeenCalledWith('formatted-line');
  });

  it.each<LogLevel>(['info', 'debug', 'trace'])('routes %s to console.log', (level) => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    transport.write(entry(level));
    expect(spy).toHaveBeenCalledWith('formatted-line');
  });
});
