import { TaskPriority, TaskStatus } from '../../../../generated/prisma/enums';

export class TaskResponseDto {
  constructor(
    readonly id: string,
    readonly projectId: string,
    readonly milestoneId: string | null,
    readonly assigneeId: string | null,
    readonly title: string,
    readonly description: string | null,
    readonly status: TaskStatus,
    readonly priority: TaskPriority,
    readonly dueDate: Date | null,
    readonly completedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
