import { FollowUpTask } from '../../../../generated/prisma/client';
import { FollowUpResponseDto } from '../dto/follow-up-response.dto';

export function toFollowUpResponseDto(task: FollowUpTask): FollowUpResponseDto {
  return new FollowUpResponseDto(
    task.id,
    task.leadId,
    task.customerId,
    task.title,
    task.description,
    task.dueAt,
    task.status,
    task.assigneeId,
    task.completedAt,
    task.createdAt,
    task.updatedAt,
  );
}
