import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Every write path in this module (project/milestone/task/document/comment)
// records one row here — the Project workspace's "Activity" tab reads
// straight off this table. Append-only (no update/delete method) — same
// shape as CustomerActivityRepository.
@Injectable()
export class ActivityLogRepository extends BaseRepository<PrismaService['activityLog']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.activityLog);
  }

  record(input: {
    tenantId: string;
    projectId: string;
    actorUserId?: string;
    verb: string;
    summary: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.delegate.create({
      data: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        actorUserId: input.actorUserId,
        verb: input.verb,
        summary: input.summary,
        metadata: input.metadata,
      },
    });
  }

  listByProject(projectId: string, tenantId: string, skip: number, take: number) {
    return this.findManyAndCount(this.prisma, {
      where: { tenantId, projectId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }
}
