import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

// Data-access only — same shape as category.repository.ts.
// `findActiveByEmail()` is what makes the service's find-then-create/
// update safe without a DB-level unique constraint (see schema.prisma's
// own comment on NewsletterSubscriber for why one isn't declared this
// phase) — the same "find-then-act" pattern CategoryRepository's own
// `findActiveById()` already established, keyed on email instead of id
// since that's this model's natural (not schema-enforced) key.
@Injectable()
export class NewsletterSubscriberRepository extends BaseRepository<
  PrismaService['newsletterSubscriber']
> {
  constructor(prisma: PrismaService) {
    super(prisma.newsletterSubscriber);
  }

  findActiveByEmail(
    email: string,
    tenantId: string,
  ): ReturnType<PrismaService['newsletterSubscriber']['findFirst']> {
    return this.delegate.findFirst({ where: { email, tenantId, deletedAt: null } });
  }
}
