import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ProjectRepository } from './repositories/project.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestoneListQueryDto } from './dto/milestone-list-query.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { toMilestoneResponseDto } from './mappers/milestone.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma, MilestoneStatus } from '../../../generated/prisma/client';

@Injectable()
export class MilestoneService {
  constructor(
    private readonly milestoneRepository: MilestoneRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async create(dto: CreateMilestoneDto, tenantId: string): Promise<MilestoneResponseDto> {
    const project = await this.projectRepository.findActiveById(dto.projectId, tenantId);
    if (!project) {
      throw new BadRequestException(`Project ${dto.projectId} not found`);
    }

    const milestone = await this.milestoneRepository.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        status: MilestoneStatus.PENDING,
      },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId: dto.projectId,
      verb: 'milestone.created',
      summary: `Milestone "${milestone.title}" created`,
    });

    return toMilestoneResponseDto(milestone);
  }

  async findById(id: string, tenantId: string): Promise<MilestoneResponseDto> {
    const milestone = await this.milestoneRepository.findActiveById(id, tenantId);
    if (!milestone) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }
    return toMilestoneResponseDto(milestone);
  }

  async list(
    query: MilestoneListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<MilestoneResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'dueDate';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.MilestoneWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const { items, total } = await this.milestoneRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toMilestoneResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdateMilestoneDto,
    tenantId: string,
  ): Promise<MilestoneResponseDto> {
    const existing = await this.milestoneRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }

    const updated = await this.milestoneRepository.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        status: dto.status,
        // Set once, on the transition into APPROVED — not cleared if the
        // milestone later moves to CHANGES_REQUESTED and back, same
        // "completedAt marks the first completion" convention Task.status
        // will follow too.
        completedAt:
          dto.status === MilestoneStatus.APPROVED && existing.status !== MilestoneStatus.APPROVED
            ? new Date()
            : undefined,
      },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.activityLogRepository.record({
        tenantId,
        projectId: existing.projectId,
        verb: 'milestone.status_changed',
        summary: `Milestone "${existing.title}" status changed from ${existing.status} to ${dto.status}`,
      });
    }

    return toMilestoneResponseDto(updated);
  }
}
