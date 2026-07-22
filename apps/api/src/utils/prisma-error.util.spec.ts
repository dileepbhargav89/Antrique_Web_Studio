import { isCheckConstraintViolation, isUniqueConstraintViolation } from './prisma-error.util';
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
