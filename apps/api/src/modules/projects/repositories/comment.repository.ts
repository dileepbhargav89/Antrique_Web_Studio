import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

@Injectable()
export class CommentRepository extends BaseRepository<PrismaService['comment']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.comment);
  }

  listByTask(taskId: string, tenantId: string, skip: number, take: number) {
    return this.findManyAndCount(this.prisma, {
      where: { taskId, tenantId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
  }

  listByMilestone(milestoneId: string, tenantId: string, skip: number, take: number) {
    return this.findManyAndCount(this.prisma, {
      where: { milestoneId, tenantId },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    });
  }
}
