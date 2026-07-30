import { Injectable } from '@nestjs/common';
import { LogFormatter } from '../interfaces/log-formatter.interface';
import { LogEntry } from '../types/log-entry.type';

// Phase 10, Module 5 (Observability) — "sensitive-field redaction."
// Nothing in this codebase logs a request body/header today (audited —
// see docs/architecture/logging-guide.md and security.md §17's own
// module writeup), so there is no CURRENT exposure this closes — it's
// defense-in-depth for the day a future `logger.info('X', { password })`
// call site gets added without anyone noticing what it just did.
// Substring match, not exact key equality: `passwordHash`/`newPassword`/
// `refreshToken`/`clientSecret` all correctly match `password`/`token`/
// `secret` without needing every possible field-name variant enumerated
// individually. False positives (rejecting a rare legitimate field whose
// name happens to contain one of these words) are an acceptable
// trade-off against the alternative of a credential silently reaching a
// log line — same asymmetry `describeException()`'s own safe-clone logic
// (exception-logging.filter.ts) already accepts elsewhere in this layer.
const SENSITIVE_KEY_SUBSTRINGS = [
  'password',
  'secret',
  'token',
  'authorization',
  'apikey',
  'privatekey',
  'creditcard',
  'cvv',
] as const;

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_SUBSTRINGS.some((pattern) => normalized.includes(pattern));
}

// The only LogFormatter implementation this phase builds — matches
// loggerOptions.format's 'json' value. 'pretty' has no formatter yet
// (out of scope, see logging.module.ts); this class doesn't branch on
// format at all, it only ever produces JSON.
@Injectable()
export class JsonLogFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify(
      {
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        ...(entry.context !== undefined ? { context: entry.context } : {}),
        ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
      },
      JsonLogFormatter.replacer,
    );
  }

  // Runs for every key JSON.stringify visits, nested included (both the
  // Error-expansion and the redaction checks below rely on that). Key
  // check comes first: a sensitive value that also happens to be an
  // Error instance (unlikely, but not impossible) should still redact,
  // not expand into a name/message/stack object that leaks the message.
  private static replacer(key: string, value: unknown): unknown {
    if (isSensitiveKey(key)) {
      return '[REDACTED]';
    }

    // Error's own properties (message, stack) are non-enumerable, so
    // plain JSON.stringify(someError) silently produces "{}" — a
    // near-certain occurrence the moment any caller does
    // `logger.error('X failed', { error: err })`.
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }

    return value;
  }
}
