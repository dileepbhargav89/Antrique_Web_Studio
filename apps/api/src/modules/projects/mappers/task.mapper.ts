import { Task } from '../../../../generated/prisma/client';
import { TaskResponseDto } from '../dto/task-response.dto';

export function toTaskResponseDto(task: Task): TaskResponseDto {
  return new TaskResponseDto(
    task.id,
    task.projectId,
    task.milestoneId,
    task.assigneeId,
    task.title,
    task.description,
    task.status,
    task.priority,
    task.dueDate,
    task.completedAt,
    task.createdAt,
    task.updatedAt,
  );
}
