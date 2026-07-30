import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ProjectRepository } from './repositories/project.repository';
import { ProjectMemberRepository } from './repositories/project-member.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { ClientRepository } from '../crm/repositories/client.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectListQueryDto } from './dto/project-list-query.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectDetailResponseDto } from './dto/project-detail-response.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';
import {
  toProjectResponseDto,
  toProjectDetailResponseDto,
  toProjectMemberResponseDto,
  toActivityLogResponseDto,
} from './mappers/project.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma, ProjectMemberRole, ProjectStatus } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping — see
// modules/crm/client.service.ts's own header comment for the shared
// reasoning. `completionPercent` (GET /projects/:id) is computed on read
// from Milestone counts, not a stored/denormalized column — the same
// "compute, don't cache" call Order/Invoice totals make elsewhere in this
// codebase where a stored derived value could drift from its source rows.
@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly projectMemberRepository: ProjectMemberRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly clientRepository: ClientRepository,
    private readonly leadRepository: LeadRepository,
  ) {}

  async create(dto: CreateProjectDto, tenantId: string): Promise<ProjectResponseDto> {
    const client = await this.clientRepository.findActiveById(dto.clientId, tenantId);
    if (!client) {
      throw new BadRequestException(`Client ${dto.clientId} not found`);
    }
    if (dto.leadId) {
      const lead = await this.leadRepository.findActiveById(dto.leadId, tenantId);
      if (!lead) {
        throw new BadRequestException(`Lead ${dto.leadId} not found`);
      }
    }

    const project = await this.projectRepository.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        leadId: dto.leadId,
        name: dto.name,
        summary: dto.summary,
        startDate: dto.startDate,
        status: ProjectStatus.DRAFT,
      },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId: project.id,
      verb: 'project.created',
      summary: `Project "${project.name}" created`,
    });

    return toProjectResponseDto(project);
  }

  async findById(id: string, tenantId: string): Promise<ProjectDetailResponseDto> {
    const project = await this.projectRepository.findActiveById(id, tenantId);
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    const [{ total, approved }, members] = await Promise.all([
      this.milestoneRepository.countCompletion(id, tenantId),
      this.projectMemberRepository.listByProject(id, tenantId),
    ]);
    const completionPercent = total === 0 ? 0 : Math.round((approved / total) * 100);
    return toProjectDetailResponseDto(project, completionPercent, members);
  }

  async list(
    query: ProjectListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ProjectResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.ProjectWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.projectRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toProjectResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateProjectDto, tenantId: string): Promise<ProjectResponseDto> {
    const existing = await this.projectRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    if (existing.status === ProjectStatus.ARCHIVED) {
      throw new ConflictException('An archived project cannot be updated');
    }

    const updated = await this.projectRepository.update({
      where: { id },
      data: {
        name: dto.name,
        summary: dto.summary,
        startDate: dto.startDate,
        status: dto.status,
      },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.activityLogRepository.record({
        tenantId,
        projectId: id,
        verb: 'project.status_changed',
        summary: `Project status changed from ${existing.status} to ${dto.status}`,
      });
    }

    return toProjectResponseDto(updated);
  }

  // Terminal — mirrors LeadService.archive()'s own dedicated-action shape.
  // Gated by `projects:delete` (stricter than `projects:write`) at the
  // controller, not here.
  async archive(id: string, tenantId: string): Promise<ProjectResponseDto> {
    const existing = await this.projectRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    if (existing.status === ProjectStatus.ARCHIVED) {
      throw new ConflictException('Project is already archived');
    }

    const archived = await this.projectRepository.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId: id,
      verb: 'project.archived',
      summary: `Project "${existing.name}" archived`,
    });

    return toProjectResponseDto(archived);
  }

  async addMember(
    id: string,
    dto: AddProjectMemberDto,
    tenantId: string,
  ): Promise<ProjectMemberResponseDto> {
    const project = await this.projectRepository.findActiveById(id, tenantId);
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    const existingMember = await this.projectMemberRepository.findOneMember(
      id,
      dto.userId,
      tenantId,
    );
    if (existingMember) {
      throw new ConflictException(`User ${dto.userId} is already a member of this project`);
    }

    const member = await this.projectMemberRepository.create({
      data: {
        tenantId,
        projectId: id,
        userId: dto.userId,
        role: dto.role ?? ProjectMemberRole.CONTRIBUTOR,
      },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId: id,
      verb: 'project.member_added',
      summary: `Member added to project "${project.name}"`,
    });

    return toProjectMemberResponseDto(member);
  }

  async removeMember(id: string, userId: string, tenantId: string): Promise<void> {
    const project = await this.projectRepository.findActiveById(id, tenantId);
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    const existingMember = await this.projectMemberRepository.findOneMember(id, userId, tenantId);
    if (!existingMember) {
      throw new NotFoundException(`User ${userId} is not a member of this project`);
    }

    await this.projectMemberRepository.removeMember(id, userId);

    await this.activityLogRepository.record({
      tenantId,
      projectId: id,
      verb: 'project.member_removed',
      summary: `Member removed from project "${project.name}"`,
    });
  }

  async listActivity(
    id: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<ActivityLogResponseDto>> {
    const project = await this.projectRepository.findActiveById(id, tenantId);
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }
    const { items, total } = await this.activityLogRepository.listByProject(
      id,
      tenantId,
      (page - 1) * limit,
      limit,
    );
    return new PaginatedResponseDto(items.map(toActivityLogResponseDto), total, page, limit);
  }
}
