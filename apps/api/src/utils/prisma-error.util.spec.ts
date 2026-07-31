import {
  isCheckConstraintViolation,
  isRetryableTransactionError,
  isStatementTimeoutError,
  isUniqueConstraintViolation,
} from './prisma-error.util';
import { Prisma } from '../../generated/prisma/client';

describe('isUniqueConstraintViolation', () => {
  it('returns true for a P2002 PrismaClientKnownRequestError', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(isUniqueConstraintViolation(error)).toBe(true);
  });

  it('returns false for a different Prisma error code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    expect(isUniqueConstraintViolation(error)).toBe(false);
  });

  it('returns false for a plain, non-Prisma error', () => {
    expect(isUniqueConstraintViolation(new Error('boom'))).toBe(false);
  });

  it('returns false for a non-error value', () => {
    expect(isUniqueConstraintViolation(undefined)).toBe(false);
  });
});

describe('isCheckConstraintViolation', () => {
  it('returns true for a P2004 PrismaClientKnownRequestError', () => {
    const error = new Prisma.PrismaClientKnownRequestError('A constraint failed on the database', {
      code: 'P2004',
      clientVersion: 'test',
    });

    expect(isCheckConstraintViolation(error)).toBe(true);
  });

  it('returns false for a different Prisma error code', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(isCheckConstraintViolation(error)).toBe(false);
  });

  it('returns false for a plain, non-Prisma error', () => {
    expect(isCheckConstraintViolation(new Error('boom'))).toBe(false);
  });

  it('returns false for a non-error value', () => {
    expect(isCheckConstraintViolation(undefined)).toBe(false);
  });
});

// Fixture shapes below are copied from a real, live-verified failure of
// each kind (see performance.md §12's writeup) — not guessed from generic
// Prisma documentation, which describes an older architecture's error
// codes (P2034/P1001/P1017) that this Prisma version's client-engine-
// runtime/driver-adapter combo does NOT actually throw.

// Model-delegate operations (e.g. `tx.someModel.update(...)`) — the
// unwrapped shape live-verified for a real deadlock forced via two
// concurrent `role.update()` calls inside `$transaction()`.
function driverAdapterError(cause: { code?: string; kind?: string }) {
  return { name: 'DriverAdapterError', message: 'driver error', cause };
}

// Raw SQL call sites (`$queryRaw`/`$executeRawUnsafe`) — Prisma wraps
// every driver-level failure in the SAME generic P2010 code regardless of
// what actually went wrong; the real signal is nested at
// `meta.driverAdapterError.cause`, live-verified for a raw-SQL deadlock, a
// statement-timeout cancellation, and an admin-terminated connection.
function rawQueryFailedError(cause: { code?: string; kind?: string }) {
  return new Prisma.PrismaClientKnownRequestError('Raw query failed.', {
    code: 'P2010',
    clientVersion: 'test',
    meta: { driverAdapterError: driverAdapterError(cause) },
  });
}

describe('isRetryableTransactionError', () => {
  it('returns true for a deadlock (SQLSTATE 40P01) via an unwrapped DriverAdapterError', () => {
    expect(isRetryableTransactionError(driverAdapterError({ code: '40P01' }))).toBe(true);
  });

  it('returns true for a serialization failure (SQLSTATE 40001) via the P2010-wrapped raw-SQL shape', () => {
    expect(isRetryableTransactionError(rawQueryFailedError({ code: '40001' }))).toBe(true);
  });

  it('returns true for an admin-terminated connection (SQLSTATE 57P01)', () => {
    expect(isRetryableTransactionError(rawQueryFailedError({ code: '57P01' }))).toBe(true);
  });

  it('returns true for a total connection failure (no SQLSTATE, cause.kind DatabaseNotReachable)', () => {
    expect(isRetryableTransactionError(rawQueryFailedError({ kind: 'DatabaseNotReachable' }))).toBe(
      true,
    );
  });

  it('returns true for a raw, unwrapped SQLSTATE 40001/40P01/57P01/ECONNRESET error (defensive fallback)', () => {
    expect(isRetryableTransactionError({ code: '40001' })).toBe(true);
    expect(isRetryableTransactionError({ code: '40P01' })).toBe(true);
    expect(isRetryableTransactionError({ code: '57P01' })).toBe(true);
    expect(isRetryableTransactionError({ code: 'ECONNRESET' })).toBe(true);
  });

  it('returns false for a constraint violation (not transient, kept as its own dedicated P-code)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    expect(isRetryableTransactionError(error)).toBe(false);
  });

  it('returns false for P2028 (the documented RLS recursion-bug code, not transient)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Transaction API error', {
      code: 'P2028',
      clientVersion: 'test',
    });

    expect(isRetryableTransactionError(error)).toBe(false);
  });

  it('returns false for a statement-timeout cause (terminal, never retried — see isStatementTimeoutError)', () => {
    expect(isRetryableTransactionError(rawQueryFailedError({ code: '57014' }))).toBe(false);
  });

  it('returns false for a plain, non-Prisma error', () => {
    expect(isRetryableTransactionError(new Error('boom'))).toBe(false);
  });

  it('returns false for a non-error value', () => {
    expect(isRetryableTransactionError(undefined)).toBe(false);
  });
});

describe('isStatementTimeoutError', () => {
  it('returns true for a statement timeout (SQLSTATE 57014) via the P2010-wrapped raw-SQL shape', () => {
    expect(isStatementTimeoutError(rawQueryFailedError({ code: '57014' }))).toBe(true);
  });

  it('returns true for a raw, unwrapped SQLSTATE 57014 error (defensive fallback)', () => {
    expect(isStatementTimeoutError({ code: '57014' })).toBe(true);
  });

  it('returns false for a retryable (non-timeout) transaction error', () => {
    expect(isStatementTimeoutError(rawQueryFailedError({ code: '40001' }))).toBe(false);
  });

  it('returns false for a plain, non-Prisma error', () => {
    expect(isStatementTimeoutError(new Error('boom'))).toBe(false);
  });

  it('returns false for a non-error value', () => {
    expect(isStatementTimeoutError(undefined)).toBe(false);
  });
});
