import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Phase 10, Module 4 (Authentication & Session Security) — `Session`'s
// first real repository; the model existed in schema.prisma (see its
// own doc comment: "rotating refresh, reuse detection") but nothing
// ever read or wrote it. A separate repository from `AuthRepository`
// (which owns `User`), not methods bolted onto it — `Session` is its
// own aggregate root, same "one repository per real aggregate"
// precedent `AuditRepository`/`OrderRepository` already establish.
@Injectable()
export class SessionRepository extends BaseRepository<PrismaService['session']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.session);
  }

  createSession(data: Prisma.SessionUncheckedCreateInput) {
    return this.delegate.create({ data });
  }

  // Deliberately NOT scoped to `revokedAt: null` — refresh() needs to
  // find a session REGARDLESS of revocation state, to distinguish
  // "never issued/unknown token" (404-equivalent, plain 401) from
  // "token was already rotated away and is being replayed" (reuse/
  // theft signal, triggers revoking the whole family) from "still
  // valid." See auth.service.ts's refresh().
  findByRefreshTokenHash(refreshTokenHash: string, tenantId: string) {
    return this.delegate.findFirst({ where: { refreshTokenHash, tenantId } });
  }

  markRotated(id: string, replacedBySessionId: string) {
    return this.delegate.update({
      where: { id },
      data: { revokedAt: new Date(), replacedBySessionId, lastUsedAt: new Date() },
    });
  }

  revoke(id: string) {
    return this.delegate.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  // The theft-response for detected refresh-token reuse: a blunt "kill
  // every active session for this user" rather than trying to walk just
  // the specific rotation chain — simpler, and correct: if one token in
  // a user's history was stolen, treating every currently-active session
  // as suspect is the safe default, not an overreaction.
  revokeAllActiveForUser(userId: string) {
    return this.delegate.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  findActiveForUser(userId: string, tenantId: string) {
    return this.delegate.findMany({
      where: { userId, tenantId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'desc' },
    });
  }

  countActiveForUser(userId: string): Promise<number> {
    return this.delegate.count({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  // Used by the concurrent-session-limit eviction (MAX_CONCURRENT_SESSIONS,
  // auth.constant.ts) — the single oldest still-active session, to revoke
  // before a new login creates one more.
  findOldestActiveForUser(userId: string) {
    return this.delegate.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { issuedAt: 'asc' },
    });
  }

  findActiveByIdForUser(id: string, userId: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, userId, tenantId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
  }
}
