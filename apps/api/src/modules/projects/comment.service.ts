import { Injectable, BadRequestException } from '@nestjs/common';
import { CommentRepository } from './repositories/comment.repository';
import { TaskRepository } from './repositories/task.repository';
import { MilestoneRepository } from './repositories/milestone.repository';
import { ActivityLogRepository } from './repositories/activity-log.repository';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentListQueryDto } from './dto/comment-list-query.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { toCommentResponseDto } from './mappers/comment.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly taskRepository: TaskRepository,
    private readonly milestoneRepository: MilestoneRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  async create(dto: CreateCommentDto, tenantId: string): Promise<CommentResponseDto> {
    if (Boolean(dto.taskId) === Boolean(dto.milestoneId)) {
      throw new BadRequestException('Exactly one of taskId or milestoneId must be provided');
    }

    let projectId: string;
    let parentLabel: string;
    if (dto.taskId) {
      const task = await this.taskRepository.findActiveById(dto.taskId, tenantId);
      if (!task) {
        throw new BadRequestException(`Task ${dto.taskId} not found`);
      }
      projectId = task.projectId;
      parentLabel = `task "${task.title}"`;
    } else {
      const milestone = await this.milestoneRepository.findActiveById(dto.milestoneId!, tenantId);
      if (!milestone) {
        throw new BadRequestException(`Milestone ${dto.milestoneId} not found`);
      }
      projectId = milestone.projectId;
      parentLabel = `milestone "${milestone.title}"`;
    }

    const comment = await this.commentRepository.create({
      data: {
        tenantId,
        taskId: dto.taskId,
        milestoneId: dto.milestoneId,
        body: dto.body,
      },
    });

    await this.activityLogRepository.record({
      tenantId,
      projectId,
      verb: 'comment.created',
      summary: `Comment added on ${parentLabel}`,
    });

    return toCommentResponseDto(comment);
  }

  async list(
    query: CommentListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CommentResponseDto>> {
    if (Boolean(query.taskId) === Boolean(query.milestoneId)) {
      throw new BadRequestException('Exactly one of taskId or milestoneId must be provided');
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const { items, total } = query.taskId
      ? await this.commentRepository.listByTask(query.taskId, tenantId, (page - 1) * limit, limit)
      : await this.commentRepository.listByMilestone(
          query.milestoneId!,
          tenantId,
          (page - 1) * limit,
          limit,
        );

    return new PaginatedResponseDto(items.map(toCommentResponseDto), total, page, limit);
  }
}
