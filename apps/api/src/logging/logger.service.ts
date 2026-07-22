import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import loggerOptionsConfig from './config/logger-options.config';
import { Logger } from './interfaces/logger.interface';
import { LogTransport } from './interfaces/log-transport.interface';
import { LogEntry } from './types/log-entry.type';
import { LogLevel } from './types/log-level.type';
import { LogMetadata } from './types/log-metadata.type';
import { LOG_TRANSPORT } from './tokens/logging.tokens';
import { LOG_LEVEL_SEVERITY } from './constants/log-level-severity.constant';
import { RequestContextService } from './request-context.service';

// The concrete Logger bound to the LOGGER token (see logging.module.ts).
// Depends only on LogTransport (interface), RequestContextService, and
// loggerOptions (config) — never on a concrete transport/formatter class,
// and never on `console` directly. Formatting is the injected transport's
// own concern (see transports/console-log-transport.ts); this class
// decides *whether* an entry is enabled and *what* it contains.
//
// No `context` param on any method — LogEntry.context is populated
// automatically from whatever RequestContextService.getContext() returns
// (Phase 1.2C.4), never threaded through call sites manually. When no
// request context is active (getContext() returns undefined — true for
// every call until a future middleware calls .run()), the built LogEntry
// is identical to Phase 1.2C.3's: no `context` key at all.
@Injectable()
export class LoggerService implements Logger {
  constructor(
    @Inject(loggerOptionsConfig.KEY)
    private readonly options: ConfigType<typeof loggerOptionsConfig>,
    @Inject(LOG_TRANSPORT)
    private readonly transport: LogTransport,
    private readonly requestContext: RequestContextService,
  ) {}

  fatal(message: string, metadata?: LogMetadata): void {
    this.write('fatal', message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    this.write('error', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write('warn', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.write('info', message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.write('debug', message, metadata);
  }

  trace(message: string, metadata?: LogMetadata): void {
    this.write('trace', message, metadata);
  }

  private write(level: LogLevel, message: string, metadata?: LogMetadata): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const context = this.requestContext.getContext();

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      // RequestContext is structurally assignable to LogContext directly
      // (see types/request-context.type.ts) — no mapping needed.
      ...(context !== undefined ? { context } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };

    this.transport.write(entry);
  }

  // A configured level enables itself plus everything less verbose (lower
  // severity rank); anything more verbose is suppressed before an entry is
  // even built, so a disabled `.debug()` call never touches the transport.
  private isEnabled(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] <= LOG_LEVEL_SEVERITY[this.options.level];
  }
}
