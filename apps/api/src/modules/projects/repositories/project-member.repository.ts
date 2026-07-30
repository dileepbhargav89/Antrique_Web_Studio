import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

// Pure join table, composite PK (project_id, user_id) — no findUnique-by-id
// helper needed; every real lookup here is "by project" or "by project+user".
@Injectable()
export class ProjectMemberRepository extends BaseRepository<PrismaService['projectMember']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.projectMember);
  }

  listByProject(projectId: string, tenantId: string) {
    return this.delegate.findMany({
      where: { projectId, tenantId },
      orderBy: { addedAt: 'asc' },
    });
  }

  findOneMember(projectId: string, userId: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { projectId, userId, tenantId },
    });
  }

  removeMember(projectId: string, userId: string) {
    return this.delegate.delete({ where: { projectId_userId: { projectId, userId } } });
  }
}
