import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskRepository } from './repositories/task.repository';
import { ProjectRepository } from './repositories/project.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskListQueryDto } from './dto/task-list-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { toTaskResponseDto } from './mappers/task.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma, TaskPriority, TaskStatus } from '../../../generated/prisma/client';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async create(dto: CreateTaskDto, tenantId: string): Promise<TaskResponseDto> {
    const project = await this.projectRepository.findActiveById(dto.projectId, tenantId);
    if (!project) {
      throw new BadRequestException(`Project ${dto.projectId} not found`);
    }
    if (dto.milestoneId) {
      const milestone = await this.milestoneRepository.findActiveById(dto.milestoneId, tenantId);
      if (!milestone || milestone.projectId !== dto.projectId) {
        throw new BadRequestException(
          `Milestone ${dto.milestoneId} not found on project ${dto.projectId}`,
        );
      }
    }

    const task = await this.taskRepository.create({
      data: {
        tenantId,
        projectId: dto.projectId,
        milestoneId: dto.milestoneId,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate,
        status: TaskStatus.TODO,
      },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId: dto.projectId,
      verb: 'task.created',
      summary: `Task "${task.title}" created`,
    });

    return toTaskResponseDto(task);
  }

  async findById(id: string, tenantId: string): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findActiveById(id, tenantId);
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return toTaskResponseDto(task);
  }

  async list(
    query: TaskListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<TaskResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.TaskWhereInput = {
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.milestoneId ? { milestoneId: query.milestoneId } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
    };

    const { items, total } = await this.taskRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toTaskResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateTaskDto, tenantId: string): Promise<TaskResponseDto> {
    const existing = await this.taskRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    if (dto.milestoneId) {
      const milestone = await this.milestoneRepository.findActiveById(dto.milestoneId, tenantId);
      if (!milestone || milestone.projectId !== existing.projectId) {
        throw new BadRequestException(
          `Milestone ${dto.milestoneId} not found on project ${existing.projectId}`,
        );
      }
    }

    const updated = await this.taskRepository.update({
      where: { id },
      data: {
        milestoneId: dto.milestoneId,
        assigneeId: dto.assigneeId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate,
        // Same "set once, on first arrival" convention MilestoneService's
        // completedAt handling uses.
        completedAt:
          dto.status === TaskStatus.DONE && existing.status !== TaskStatus.DONE
            ? new Date()
            : undefined,
      },
    });

    if (dto.status && dto.status !== existing.status) {
      await this.activityLogRepository.record({
        tenantId,
        projectId: existing.projectId,
        verb: 'task.status_changed',
        summary: `Task "${existing.title}" status changed from ${existing.status} to ${dto.status}`,
      });
    }

    return toTaskResponseDto(updated);
  }
}
