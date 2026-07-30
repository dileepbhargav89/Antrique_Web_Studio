import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

@Injectable()
export class DocumentRepository extends BaseRepository<PrismaService['document']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.document);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  listByProject(projectId: string, tenantId: string) {
    return this.delegate.findMany({
      where: { projectId, tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
